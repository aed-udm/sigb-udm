/**
 * API Route: /api/reservations/[id]/fulfill
 * Satisfaire une réservation - Transformer automatiquement en emprunt
 * Université des Montagnes - SIGB UdM
 */

import { NextRequest, NextResponse } from 'next/server';
import { executeQuery } from '@/lib/mysql';
import { v4 as uuidv4 } from 'uuid';
import { logLibraryOperation, logError } from '@/lib/system-logger';
import { EmailNotificationService, LoanNotificationData } from '@/lib/services/email-notification-service';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: reservationId } = await params;

    // 🚨 APPROCHE SIMPLIFIÉE : Récupérer d'abord la réservation, puis calculer la disponibilité
    const reservations = await executeQuery(
      `SELECT
        r.*,
        u.full_name as user_name,
        u.email as user_email,
        u.barcode as user_barcode,
        u.is_active,
        u.max_loans,
        CASE WHEN r.document_type = 'book' THEN b.title ELSE ad.title END as document_title,
        CASE WHEN r.document_type = 'book' THEN b.main_author ELSE ad.main_author END as document_author
      FROM reservations r
      INNER JOIN users u ON r.user_id = u.id
      LEFT JOIN books b ON r.book_id = b.id
      LEFT JOIN (
        SELECT CAST(id AS CHAR CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci) as id,
               CAST(title AS CHAR CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci) as title,
               CAST(main_author AS CHAR CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci) as main_author
        FROM theses
        UNION ALL
        SELECT CAST(id AS CHAR CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci) as id,
               CAST(title AS CHAR CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci) as title,
               CAST(main_author AS CHAR CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci) as main_author
        FROM memoires
        UNION ALL
        SELECT CAST(id AS CHAR CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci) as id,
               CAST(title AS CHAR CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci) as title,
               CAST(student_name AS CHAR CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci) as main_author
        FROM stage_reports
      ) ad ON r.academic_document_id = ad.id
      WHERE r.id = ? AND r.status = 'active'`,
      [reservationId]
    ) as Array<any>;

    if (reservations.length === 0) {
      return NextResponse.json(
        { error: { code: 'RESERVATION_NOT_FOUND', message: 'Réservation non trouvée ou déjà satisfaite' } },
        { status: 404 }
      );
    }

    const reservation = reservations[0];

    // 🚨 CALCUL DE DISPONIBILITÉ EN TEMPS RÉEL (en excluant la réservation courante)
    let calculatedAvailableCopies = 0;

    if (reservation.document_type === 'book') {
      // Pour les livres
      const availabilityQuery = await executeQuery(`
        SELECT
          b.total_copies,
          COALESCE(loans.loan_count, 0) as active_loans,
          COALESCE(reservations.reservation_count, 0) as active_reservations,
          GREATEST(0, b.total_copies - COALESCE(loans.loan_count, 0) - COALESCE(reservations.reservation_count, 0)) as available_copies
        FROM books b
        LEFT JOIN (
          SELECT book_id, COUNT(*) as loan_count
          FROM loans
          WHERE status IN ('active', 'overdue')
          GROUP BY book_id
        ) loans ON b.id = loans.book_id
        LEFT JOIN (
          SELECT book_id, COUNT(*) as reservation_count
          FROM reservations
          WHERE status = 'active' AND id != ?
          GROUP BY book_id
        ) reservations ON b.id = reservations.book_id
        WHERE b.id = ?
      `, [reservationId, reservation.book_id]) as Array<any>;

      if (availabilityQuery.length > 0) {
        calculatedAvailableCopies = availabilityQuery[0].available_copies;
        console.log(`📊 LIVRE ${reservation.book_id}: ${availabilityQuery[0].total_copies} total, ${availabilityQuery[0].active_loans} emprunts, ${availabilityQuery[0].active_reservations} réservations (excluant courante), ${calculatedAvailableCopies} disponibles`);
      }
    } else {
      // Pour les documents académiques
      const availabilityQuery = await executeQuery(`
        SELECT
          COALESCE(loans.loan_count, 0) as active_loans,
          COALESCE(reservations.reservation_count, 0) as active_reservations,
          GREATEST(0, 1 - COALESCE(loans.loan_count, 0) - COALESCE(reservations.reservation_count, 0)) as available_copies
        FROM (SELECT 1 as dummy) dummy
        LEFT JOIN (
          SELECT academic_document_id, COUNT(*) as loan_count
          FROM loans
          WHERE status IN ('active', 'overdue') AND document_type = ? AND academic_document_id = ?
          GROUP BY academic_document_id
        ) loans ON 1=1
        LEFT JOIN (
          SELECT academic_document_id, COUNT(*) as reservation_count
          FROM reservations
          WHERE status = 'active' AND document_type = ? AND academic_document_id = ? AND id != ?
          GROUP BY academic_document_id
        ) reservations ON 1=1
      `, [reservation.document_type, reservation.academic_document_id, reservation.document_type, reservation.academic_document_id, reservationId]) as Array<any>;

      if (availabilityQuery.length > 0) {
        calculatedAvailableCopies = availabilityQuery[0].available_copies;
        console.log(`📊 DOCUMENT ACADÉMIQUE ${reservation.academic_document_id}: ${availabilityQuery[0].active_loans} emprunts, ${availabilityQuery[0].active_reservations} réservations (excluant courante), ${calculatedAvailableCopies} disponibles`);
      }
    }

    // Ajouter la disponibilité calculée à l'objet réservation
    reservation.calculated_available_copies = calculatedAvailableCopies;

    // Vérifier que l'utilisateur est actif
    if (!reservation.is_active) {
      return NextResponse.json(
        { error: { code: 'USER_INACTIVE', message: 'Utilisateur inactif' } },
        { status: 400 }
      );
    }

    // Vérifier le nombre d'emprunts actifs de l'utilisateur
    const activeLoans = await executeQuery(
      'SELECT COUNT(*) as count FROM loans WHERE user_id = ? AND status IN ("active", "overdue")',
      [reservation.user_id]
    ) as Array<{ count: number }>;

    if (activeLoans[0].count >= reservation.max_loans) {
      return NextResponse.json(
        { error: { code: 'LOAN_LIMIT_EXCEEDED', message: `Limite d'emprunts atteinte (${reservation.max_loans})` } },
        { status: 400 }
      );
    }

    // 🚨 VÉRIFICATION CRITIQUE RENFORCÉE : Disponibilité du document
    console.log(`🔍 VÉRIFICATION DISPONIBILITÉ - Réservation ${reservationId}:`, {
      document_type: reservation.document_type,
      document_id: reservation.book_id || reservation.academic_document_id,
      calculated_available_copies: reservation.calculated_available_copies,
      user_id: reservation.user_id
    });

    // Pour les livres : vérifier calculated_available_copies
    if (reservation.document_type === 'book' && reservation.calculated_available_copies <= 0) {
      console.log(`❌ LIVRE NON DISPONIBLE - ${reservation.book_id}: ${reservation.calculated_available_copies} exemplaires`);
      return NextResponse.json(
        { error: { code: 'DOCUMENT_UNAVAILABLE', message: 'Livre non disponible - Aucun exemplaire disponible' } },
        { status: 400 }
      );
    }

    // Pour les documents académiques : vérifier calculated_available_copies
    if (reservation.document_type !== 'book' && reservation.calculated_available_copies <= 0) {
      console.log(`❌ DOCUMENT ACADÉMIQUE NON DISPONIBLE - ${reservation.academic_document_id}: ${reservation.calculated_available_copies} exemplaires`);
      return NextResponse.json(
        { error: { code: 'DOCUMENT_UNAVAILABLE', message: 'Document académique non disponible - Aucun exemplaire disponible' } },
        { status: 400 }
      );
    }

    // Calculer la date d'échéance (21 jours par défaut)
    const loanDate = new Date().toISOString().split('T')[0];
    const dueDate = new Date(Date.now() + 21 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    // Générer un UUID pour le nouvel emprunt
    const loanId = uuidv4();

    // Commencer une transaction avec connexion directe
    const mysql = require('mysql2/promise');
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '3306'),
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'bibliotheque_cameroun',
      charset: 'utf8mb4',
      collation: 'utf8mb4_general_ci'
    });

    await connection.beginTransaction();

    try {
      // 1. Créer l'emprunt
      await connection.execute(
        `INSERT INTO loans (id, user_id, book_id, academic_document_id, document_type, loan_date, due_date, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          loanId,
          reservation.user_id,
          reservation.book_id || null,
          reservation.academic_document_id || null,
          reservation.document_type,
          loanDate,
          dueDate,
          'active'
        ]
      );

      // 2. Marquer la réservation comme satisfaite
      await connection.execute(
        'UPDATE reservations SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        ['fulfilled', reservationId]
      );

      // 3. Mettre à jour le nombre d'exemplaires disponibles
      if (reservation.document_type === 'book') {
        await connection.execute(
          'UPDATE books SET available_copies = available_copies - 1 WHERE id = ?',
          [reservation.book_id]
        );
      }

      // 4. Réorganiser les priorités pour les autres réservations
      const documentField = reservation.document_type === 'book' ? 'book_id' : 'academic_document_id';
      const documentId = reservation.book_id || reservation.academic_document_id;

      await connection.execute(
        `UPDATE reservations
         SET priority_order = priority_order - 1
         WHERE ${documentField} = ?
         AND status = 'active'
         AND priority_order > ?`,
        [documentId, reservation.priority_order]
      );

      // Valider la transaction
      await connection.commit();

      // Récupérer l'emprunt créé avec tous les détails
      const newLoans = await executeQuery(
        `SELECT
          l.*,
          u.full_name as user_name,
          u.email as user_email,
          u.barcode as user_barcode,
          CASE WHEN l.document_type = 'book' THEN b.title ELSE ad.title END as document_title,
          CASE WHEN l.document_type = 'book' THEN b.main_author ELSE ad.main_author END as document_author
        FROM loans l
        INNER JOIN users u ON l.user_id = u.id
        LEFT JOIN books b ON l.book_id = b.id
        LEFT JOIN (
          SELECT CAST(id AS CHAR CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci) as id,
                 CAST(title AS CHAR CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci) as title,
                 CAST(main_author AS CHAR CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci) as main_author
          FROM theses
          UNION ALL
          SELECT CAST(id AS CHAR CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci) as id,
                 CAST(title AS CHAR CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci) as title,
                 CAST(main_author AS CHAR CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci) as main_author
          FROM memoires
          UNION ALL
          SELECT CAST(id AS CHAR CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci) as id,
                 CAST(title AS CHAR CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci) as title,
                 CAST(student_name AS CHAR CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci) as main_author
          FROM stage_reports
        ) ad ON l.academic_document_id = ad.id
        WHERE l.id = ?`,
        [loanId]
      ) as Array<any>;

      const newLoan = newLoans[0];

      // Logger l'opération
      await logLibraryOperation(
        'reservation_fulfilled',
        reservation.user_id,
        documentId,
        {
          reservationId: reservationId,
          loanId: loanId,
          document_type: reservation.document_type,
          document_title: reservation.document_title
        }
      );

      // 📧 ENVOYER NOTIFICATION EMAIL D'EMPRUNT
      try {
        const emailData: LoanNotificationData = {
          user_name: newLoan.user_name,
          user_email: newLoan.user_email,
          document_title: newLoan.document_title || 'Document',
          document_author: newLoan.document_author || 'Auteur non spécifié',
          document_type: reservation.document_type as 'book' | 'these' | 'memoire' | 'rapport_stage',
          loan_date: newLoan.loan_date,
          due_date: newLoan.due_date,
          loan_id: newLoan.id,
          barcode: newLoan.user_barcode
        };

        const emailSent = await EmailNotificationService.sendLoanConfirmation(emailData);
        if (emailSent) {
          console.log(`✅ Email d'emprunt (réservation satisfaite) envoyé à ${newLoan.user_email}`);
        } else {
          console.log(`⚠️ Échec envoi email d'emprunt (réservation satisfaite) à ${newLoan.user_email}`);
        }
      } catch (emailError) {
        console.error('❌ Erreur envoi email emprunt (réservation satisfaite):', emailError);
        // Ne pas faire échouer l'opération si l'email échoue
      }

      return NextResponse.json(
        {
          data: {
            loan: newLoan,
            reservation: { ...reservation, status: 'fulfilled' }
          },
          message: 'Réservation satisfaite avec succès - Emprunt créé'
        },
        { status: 201 }
      );

    } catch (transactionError) {
      // Annuler la transaction en cas d'erreur
      await connection.rollback();
      throw transactionError;
    } finally {
      // Fermer la connexion
      await connection.end();
    }

  } catch (error: unknown) {
    console.error('Error fulfilling reservation:', error);
    const { id: errorReservationId } = await params;
    await logError(error as Error, {
      action: 'fulfill_reservation',
      reservationId: errorReservationId,
      requestUrl: `/api/reservations/${errorReservationId}/fulfill`
    });

    return NextResponse.json(
      { error: { code: 'FULFILL_ERROR', message: 'Erreur lors de la satisfaction de la réservation' } },
      { status: 500 }
    );
  }
}
