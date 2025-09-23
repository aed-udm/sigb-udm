import { NextRequest, NextResponse } from 'next/server';
import { executeQuery } from '@/lib/mysql';

/**
 * GET /api/loans/[id]
 * Récupère les détails d'un emprunt spécifique
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: loanId } = await params;

    // Récupérer les détails de l'emprunt avec les informations du livre et de l'utilisateur
    const rows = await executeQuery(`
      SELECT 
        l.*,
        b.title as book_title,
        b.main_author as book_author,
        b.isbn as book_isbn,
        u.full_name as user_name,
        u.email as user_email,
        u.phone as user_phone,
        CASE 
          WHEN l.return_date IS NULL AND l.due_date < NOW() THEN 'overdue'
          WHEN l.return_date IS NULL THEN 'active'
          ELSE 'returned'
        END as status,
        CASE 
          WHEN l.return_date IS NULL AND l.due_date < NOW() 
          THEN DATEDIFF(NOW(), l.due_date)
          ELSE 0
        END as days_overdue
      FROM loans l
      LEFT JOIN books b ON l.book_id = b.id
      LEFT JOIN users u ON l.user_id COLLATE utf8mb4_unicode_ci = u.id COLLATE utf8mb4_unicode_ci
      WHERE l.id = ?
    `, [loanId]);

    if (!Array.isArray(rows) || rows.length === 0) {
      return NextResponse.json(
        { error: 'Emprunt non trouvé' },
        { status: 404 }
      );
    }

    const loan = rows[0];

    // Calculer l'amende si nécessaire
    if (loan && loan.status === 'overdue' && loan.days_overdue > 0) {
      const finePerDay = 100; // 100 FCFA par jour de retard
      const calculatedFine = loan.days_overdue * finePerDay;
      
      // Mettre à jour l'amende si elle a changé
      if (loan.fine_amount !== calculatedFine) {
        await executeQuery(`
          UPDATE loans 
          SET fine_amount = ? 
          WHERE id = ?
        `, [calculatedFine, loanId]);
        
        loan.fine_amount = calculatedFine;
      }
    }

    // Formater la réponse
    const response = {
      id: loan.id,
      book: {
        id: loan.book_id,
        title: loan.book_title,
        author: loan.book_author,
        isbn: loan.book_isbn
      },
      user: {
        id: loan.user_id,
        name: loan.user_name,
        email: loan.user_email,
        phone: loan.user_phone
      },
      loan_date: loan.loan_date,
      due_date: loan.due_date,
      return_date: loan.return_date,
      status: loan.status,
      fine_amount: loan.fine_amount || 0,
      days_overdue: loan.days_overdue,
      notes: loan.notes,
      created_at: loan.created_at,
      updated_at: loan.updated_at
    };

    return NextResponse.json({
      success: true,
      data: response,
      message: 'Détails de l\'emprunt récupérés avec succès'
    });

  } catch (error) {
    console.error('Erreur récupération emprunt:', error);
    return NextResponse.json(
      { 
        error: 'Erreur lors de la récupération de l\'emprunt',
        details: error instanceof Error ? error.message : 'Erreur inconnue'
      },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/loans/[id]
 * Met à jour un emprunt (retour, prolongation, etc.)
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: loanId } = await params;
    const body = await request.json();
    const { action, return_date, new_due_date, notes } = body;

    // Vérifier que l'emprunt existe
    const existingLoan = await executeQuery(`
      SELECT * FROM loans WHERE id = ?
    `, [loanId]);

    if (!Array.isArray(existingLoan) || existingLoan.length === 0) {
      return NextResponse.json(
        { error: 'Emprunt non trouvé' },
        { status: 404 }
      );
    }

    const loan = existingLoan[0];

    switch (action) {
      case 'return':
        // Retour du livre
        const returnDate = return_date || new Date().toISOString().split('T')[0];

        // Calculer si le retour est en retard
        const dueDate = new Date(loan.due_date);
        const actualReturnDate = new Date(returnDate);
        const wasOverdue = actualReturnDate > dueDate;

        await executeQuery(`
          UPDATE loans
          SET return_date = ?, notes = ?, updated_at = NOW()
          WHERE id = ?
        `, [returnDate, notes || loan.notes, loanId]);

        // Mettre à jour le nombre d'exemplaires disponibles
        if (loan.document_type === 'book') {
          await executeQuery(`
            UPDATE books
            SET available_copies = available_copies + 1
            WHERE id = ?
          `, [loan.book_id]);
        }

        // 📧 ENVOYER EMAIL DE CONFIRMATION DE RETOUR
        try {
          const { EmailNotificationService } = await import('@/lib/services/email-notification-service');

          const returnEmailData = {
            user_name: loan.user_name,
            user_email: loan.user_email,
            document_title: loan.document_title || 'Document',
            document_author: loan.document_author || 'Auteur non spécifié',
            document_type: loan.document_type as 'book' | 'these' | 'memoire' | 'rapport_stage',
            loan_date: loan.loan_date,
            return_date: returnDate,
            was_overdue: wasOverdue,
            penalty_amount: wasOverdue ? 500 : undefined // Exemple de pénalité
          };

          const emailSent = await EmailNotificationService.sendReturnConfirmation(returnEmailData);
          if (emailSent) {
            console.log(`✅ Email de confirmation de retour envoyé à ${loan.user_email}`);
          } else {
            console.log(`⚠️ Échec envoi email de confirmation de retour à ${loan.user_email}`);
          }
        } catch (emailError) {
          console.error('❌ Erreur envoi email confirmation retour:', emailError);
        }

        // 🚨 NOTIFICATION CRITIQUE : Notifier les utilisateurs en attente de réservation
        try {
          console.log(`🔍 Vérification des réservations en attente pour le document retourné...`);

          // Récupérer les réservations actives pour ce document (par ordre de priorité)
          let reservationsQuery = '';
          let documentId = '';

          if (loan.document_type === 'book') {
            documentId = loan.book_id;
            reservationsQuery = `
              SELECT
                r.id as reservation_id,
                r.user_id,
                r.reservation_date,
                r.priority,
                u.full_name as user_name,
                u.email as user_email,
                b.title as document_title,
                b.main_author as document_author
              FROM reservations r
              INNER JOIN users u ON r.user_id = u.id
              INNER JOIN books b ON r.book_id = b.id
              WHERE r.book_id = ? AND r.status = 'active'
              ORDER BY r.priority ASC, r.reservation_date ASC
              LIMIT 5
            `;
          } else {
            documentId = loan.academic_document_id;
            reservationsQuery = `
              SELECT
                r.id as reservation_id,
                r.user_id,
                r.reservation_date,
                r.priority,
                u.full_name as user_name,
                u.email as user_email,
                CASE
                  WHEN r.document_type = 'these' THEN t.title
                  WHEN r.document_type = 'memoire' THEN m.title
                  WHEN r.document_type = 'rapport_stage' THEN s.title
                END as document_title,
                CASE
                  WHEN r.document_type = 'these' THEN t.main_author
                  WHEN r.document_type = 'memoire' THEN m.main_author
                  WHEN r.document_type = 'rapport_stage' THEN s.student_name
                END as document_author
              FROM reservations r
              INNER JOIN users u ON r.user_id = u.id
              LEFT JOIN theses t ON r.academic_document_id = t.id AND r.document_type = 'these'
              LEFT JOIN memoires m ON r.academic_document_id = m.id AND r.document_type = 'memoire'
              LEFT JOIN stage_reports s ON r.academic_document_id = s.id AND r.document_type = 'rapport_stage'
              WHERE r.academic_document_id = ? AND r.document_type = ? AND r.status = 'active'
              ORDER BY r.priority ASC, r.reservation_date ASC
              LIMIT 5
            `;
          }

          const reservationsParams = loan.document_type === 'book'
            ? [documentId]
            : [documentId, loan.document_type];

          const waitingReservations = await executeQuery(reservationsQuery, reservationsParams) as Array<any>;

          if (waitingReservations.length > 0) {
            console.log(`📋 ${waitingReservations.length} réservation(s) en attente trouvée(s)`);

            const { EmailNotificationService } = await import('@/lib/services/email-notification-service');

            // Notifier chaque utilisateur en attente
            for (const reservation of waitingReservations) {
              try {
                const availabilityEmailData = {
                  user_name: reservation.user_name,
                  user_email: reservation.user_email,
                  document_title: reservation.document_title || 'Document',
                  document_author: reservation.document_author || 'Auteur non spécifié',
                  document_type: loan.document_type as 'book' | 'these' | 'memoire' | 'rapport_stage',
                  reservation_date: reservation.reservation_date,
                  priority: reservation.priority,
                  return_date: returnDate
                };

                const emailSent = await EmailNotificationService.sendDocumentAvailableNotification(availabilityEmailData);
                if (emailSent) {
                  console.log(`✅ Email de disponibilité envoyé à ${reservation.user_email} (priorité ${reservation.priority})`);
                } else {
                  console.log(`⚠️ Échec envoi email de disponibilité à ${reservation.user_email}`);
                }
              } catch (notificationError) {
                console.error(`❌ Erreur envoi email à ${reservation.user_email}:`, notificationError);
              }
            }
          } else {
            console.log(`ℹ️ Aucune réservation en attente pour ce document`);
          }
        } catch (reservationError) {
          console.error('❌ Erreur lors de la notification des réservations en attente:', reservationError);
        }

        break;

      case 'extend':
        // Prolongation de l'emprunt
        if (!new_due_date) {
          return NextResponse.json(
            { error: 'Nouvelle date d\'échéance requise pour la prolongation' },
            { status: 400 }
          );
        }

        const oldDueDate = loan.due_date;

        await executeQuery(`
          UPDATE loans
          SET due_date = ?, notes = ?, updated_at = NOW()
          WHERE id = ?
        `, [new_due_date, notes || loan.notes, loanId]);

        // 📧 ENVOYER EMAIL DE NOTIFICATION DE PROLONGATION
        try {
          const { EmailNotificationService } = await import('@/lib/services/email-notification-service');

          const extensionEmailData = {
            user_name: loan.user_name,
            user_email: loan.user_email,
            document_title: loan.document_title || 'Document',
            document_author: loan.document_author || 'Auteur non spécifié',
            document_type: loan.document_type as 'book' | 'these' | 'memoire' | 'rapport_stage',
            old_due_date: oldDueDate,
            new_due_date: new_due_date,
            loan_id: loanId
          };

          const emailSent = await EmailNotificationService.sendExtensionNotification(extensionEmailData);
          if (emailSent) {
            console.log(`✅ Email de prolongation envoyé à ${loan.user_email}`);
          } else {
            console.log(`⚠️ Échec envoi email de prolongation à ${loan.user_email}`);
          }
        } catch (emailError) {
          console.error('❌ Erreur envoi email prolongation:', emailError);
        }

        break;

      case 'update_notes':
        // Mise à jour des notes
        await executeQuery(`
          UPDATE loans 
          SET notes = ?, updated_at = NOW()
          WHERE id = ?
        `, [notes, loanId]);

        break;

      default:
        return NextResponse.json(
          { error: 'Action non supportée' },
          { status: 400 }
        );
    }

    // Enregistrer l'activité
    try {
      await executeQuery(`
        INSERT INTO recent_activities (activity_type, description, details, created_at)
        VALUES (?, ?, ?, NOW())
      `, [
        `loan_${action}`,
        `Emprunt ${action === 'return' ? 'retourné' : action === 'extend' ? 'prolongé' : 'mis à jour'}`,
        JSON.stringify({ loan_id: loanId, action, user_action: true })
      ]);
    } catch (activityError) {
      console.warn('Erreur enregistrement activité:', activityError);
    }

    return NextResponse.json({
      success: true,
      message: `Emprunt ${action === 'return' ? 'retourné' : action === 'extend' ? 'prolongé' : 'mis à jour'} avec succès`
    });

  } catch (error) {
    console.error('Erreur mise à jour emprunt:', error);
    return NextResponse.json(
      { 
        error: 'Erreur lors de la mise à jour de l\'emprunt',
        details: error instanceof Error ? error.message : 'Erreur inconnue'
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/loans/[id]
 * Supprime un emprunt (admin seulement)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: loanId } = await params;

    // Vérifier que l'emprunt existe
    const existingLoan = await executeQuery(`
      SELECT * FROM loans WHERE id = ?
    `, [loanId]);

    if (!Array.isArray(existingLoan) || existingLoan.length === 0) {
      return NextResponse.json(
        { error: 'Emprunt non trouvé' },
        { status: 404 }
      );
    }

    const loan = existingLoan[0];

    // Si le livre n'a pas été retourné, remettre l'exemplaire disponible
    if (!loan.return_date) {
      await executeQuery(`
        UPDATE books 
        SET available_copies = available_copies + 1 
        WHERE id = ?
      `, [loan.book_id]);
    }

    // Supprimer l'emprunt
    await executeQuery(`
      DELETE FROM loans WHERE id = ?
    `, [loanId]);

    // Enregistrer l'activité
    try {
      await executeQuery(`
        INSERT INTO recent_activities (activity_type, description, details, created_at)
        VALUES (?, ?, ?, NOW())
      `, [
        'loan_deleted',
        'Emprunt supprimé',
        JSON.stringify({ loan_id: loanId, admin_action: true })
      ]);
    } catch (activityError) {
      console.warn('Erreur enregistrement activité:', activityError);
    }

    return NextResponse.json({
      success: true,
      message: 'Emprunt supprimé avec succès'
    });

  } catch (error) {
    console.error('Erreur suppression emprunt:', error);
    return NextResponse.json(
      { 
        error: 'Erreur lors de la suppression de l\'emprunt',
        details: error instanceof Error ? error.message : 'Erreur inconnue'
      },
      { status: 500 }
    );
  }
}
