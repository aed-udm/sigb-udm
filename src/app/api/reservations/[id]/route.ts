import { NextRequest, NextResponse } from 'next/server';
import { executeQuery } from '@/lib/mysql';
import { z } from 'zod';
import { logLibraryOperation, logError } from '@/lib/system-logger';

// Schema pour la mise à jour d'une réservation
const updateReservationSchema = z.object({
  status: z.enum(['active', 'fulfilled', 'expired', 'cancelled']).optional(),
  expiry_date: z.string().optional(),
  notes: z.string().optional(),
  priority_order: z.number().int().min(1).optional(),
  notification_sent: z.boolean().optional()
});

// Types pour les erreurs
interface ZodError {
  issues: Array<{
    path: string[];
    message: string;
  }>;
}

function isZodError(error: unknown): error is ZodError {
  return error !== null && typeof error === 'object' && 'issues' in error;
}

function createValidationErrorResponse(error: ZodError) {
  return NextResponse.json(
    {
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Données invalides',
        details: error.issues.map(issue => ({
          field: issue.path.join('.'),
          message: issue.message
        }))
      }
    },
    { status: 400 }
  );
}

function createDatabaseErrorResponse(error: unknown) {
  console.error('Database error:', error);
  return NextResponse.json(
    { error: { code: 'DATABASE_ERROR', message: 'Erreur de base de données' } },
    { status: 500 }
  );
}

// GET /api/reservations/[id] - Récupérer une réservation spécifique
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: reservationId } = await params;

    const reservations = await executeQuery(
      `SELECT
        r.*,
        u.full_name as user_name,
        u.email as user_email,
        u.barcode as user_barcode,
        -- Informations du livre (si c'est un livre)
        CASE WHEN r.document_type = 'book' THEN b.title ELSE NULL END as book_title,
        CASE WHEN r.document_type = 'book' THEN b.main_author ELSE NULL END as book_author,
        CASE WHEN r.document_type = 'book' THEN b.mfn ELSE NULL END as book_mfn,
        -- Informations du document académique (si c'est un document académique)
        CASE WHEN r.document_type != 'book' THEN ad.title ELSE NULL END as academic_title,
        CASE WHEN r.document_type != 'book' THEN ad.main_author ELSE NULL END as academic_author,
        CASE WHEN r.document_type != 'book' THEN ad.target_degree ELSE NULL END as academic_degree,
        -- Calcul des jours jusqu'à expiration
        DATEDIFF(r.expiry_date, CURDATE()) as days_until_expiry
      FROM reservations r
      INNER JOIN users u ON r.user_id COLLATE utf8mb4_unicode_ci = u.id COLLATE utf8mb4_unicode_ci
      LEFT JOIN books b ON r.book_id COLLATE utf8mb4_unicode_ci = b.id COLLATE utf8mb4_unicode_ci
      LEFT JOIN (
        SELECT id, title, main_author, target_degree FROM theses
        UNION ALL
        SELECT id, title, main_author, degree_level as target_degree FROM memoires
        UNION ALL
        SELECT id, title, student_name as main_author, degree_level as target_degree FROM stage_reports
      ) ad ON r.academic_document_id COLLATE utf8mb4_unicode_ci = ad.id COLLATE utf8mb4_unicode_ci
      WHERE r.id = ?`,
      [reservationId]
    );

    if (reservations.length === 0) {
      return NextResponse.json(
        { error: { code: 'RESERVATION_NOT_FOUND', message: 'Réservation non trouvée' } },
        { status: 404 }
      );
    }

    return NextResponse.json({ data: reservations[0] });
  } catch (error) {
    return createDatabaseErrorResponse(error);
  }
}

// PATCH /api/reservations/[id] - Mettre à jour une réservation
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: reservationId } = await params;
    const body = await request.json();

    // Validation des données
    const validatedData = updateReservationSchema.parse(body);

    // Vérifier que la réservation existe
    const existingReservations = await executeQuery(
      'SELECT id, status, document_type, book_id, academic_document_id, priority_order FROM reservations WHERE id = ?',
      [reservationId]
    ) as Array<{
      id: string;
      status: string;
      document_type: string;
      book_id: string | null;
      academic_document_id: string | null;
      priority_order: number;
    }>;

    if (existingReservations.length === 0) {
      return NextResponse.json(
        { error: { code: 'RESERVATION_NOT_FOUND', message: 'Réservation non trouvée' } },
        { status: 404 }
      );
    }

    const existingReservation = existingReservations[0];

    // 🚨 VÉRIFICATION CRITIQUE : Si on veut marquer comme 'fulfilled', vérifier la priorité AVANT la mise à jour
    if (validatedData.status === 'fulfilled') {
      // Vérifier que cette réservation est bien la priorité #1 pour ce document
      const documentId = existingReservation.book_id || existingReservation.academic_document_id;
      const documentField = existingReservation.book_id ? 'book_id' : 'academic_document_id';
      const whereClause = existingReservation.book_id
        ? `${documentField} = ? AND status = 'active'`
        : `${documentField} = ? AND document_type = ? AND status = 'active'`;
      const params = existingReservation.book_id
        ? [documentId]
        : [documentId, existingReservation.document_type];

      // 🔍 LOGS DE DÉBOGAGE TEMPORAIRES
      console.log('🔍 DEBUG - Vérification de priorité:');
      console.log('   Réservation ID:', reservationId);
      console.log('   Document ID:', documentId);
      console.log('   Document Field:', documentField);
      console.log('   Where Clause:', whereClause);
      console.log('   Params:', params);
      console.log('   Réservation actuelle priorité:', existingReservation.priority_order);

      const firstReservation = await executeQuery(`
        SELECT id, priority_order, user_id
        FROM reservations
        WHERE ${whereClause}
        ORDER BY priority_order ASC
        LIMIT 1
      `, params) as Array<{ id: string; priority_order: number; user_id: string }>;

      console.log('   Première réservation trouvée:', firstReservation);

      if (firstReservation.length === 0) {
        console.log('   ❌ Aucune réservation trouvée');
        return NextResponse.json(
          { error: 'Aucune réservation active trouvée pour ce document' },
          { status: 400 }
        );
      }

      console.log('   Comparaison IDs:', {
        reservationId,
        firstReservationId: firstReservation[0].id,
        match: firstReservation[0].id === reservationId
      });

      if (firstReservation[0].id !== reservationId) {
        console.log('   ❌ Réservation non autorisée');
        return NextResponse.json(
          {
            error: 'Seule la réservation de priorité #1 peut être satisfaite',
            details: {
              current_reservation_priority: existingReservation.priority_order,
              first_reservation_id: firstReservation[0].id,
              first_reservation_priority: firstReservation[0].priority_order,
              message: 'Vous devez satisfaire les réservations dans l\'ordre de priorité (#1 en premier)'
            }
          },
          { status: 400 }
        );
      }

      console.log('   ✅ Réservation autorisée');
    }

    // Construire la requête de mise à jour dynamiquement
    const updateFields: string[] = [];
    const updateValues: any[] = [];

    if (validatedData.status !== undefined) {
      updateFields.push('status = ?');
      updateValues.push(validatedData.status);
    }

    if (validatedData.expiry_date !== undefined) {
      updateFields.push('expiry_date = ?');
      updateValues.push(validatedData.expiry_date);
    }

    if (validatedData.notes !== undefined) {
      updateFields.push('notes = ?');
      updateValues.push(validatedData.notes);
    }

    if (validatedData.priority_order !== undefined) {
      updateFields.push('priority_order = ?');
      updateValues.push(validatedData.priority_order);
    }

    if (validatedData.notification_sent !== undefined) {
      updateFields.push('notification_sent = ?');
      updateValues.push(validatedData.notification_sent);
    }

    if (updateFields.length === 0) {
      return NextResponse.json(
        { error: { code: 'NO_UPDATES', message: 'Aucune mise à jour fournie' } },
        { status: 400 }
      );
    }

    // Ajouter updated_at
    updateFields.push('updated_at = CURRENT_TIMESTAMP');
    updateValues.push(reservationId);

    // Exécuter la mise à jour
    await executeQuery(
      `UPDATE reservations SET ${updateFields.join(', ')} WHERE id = ?`,
      updateValues
    );

    // Si le statut change vers 'fulfilled' ou 'cancelled', libérer l'exemplaire et réorganiser les priorités
    if (validatedData.status === 'fulfilled' || validatedData.status === 'cancelled') {
      const documentId = existingReservation.book_id || existingReservation.academic_document_id;
      const documentField = existingReservation.book_id ? 'book_id' : 'academic_document_id';
      const documentTable = existingReservation.document_type === 'book' ? 'books' :
                           existingReservation.document_type === 'these' ? 'theses' :
                           existingReservation.document_type === 'memoire' ? 'memoires' : 'stage_reports';

      // Libérer l'exemplaire réservé (remettre à disposition)
      if (documentTable === 'books') {
        // Vérifier d'abord l'état actuel du livre
        const bookInfo = await executeQuery(
          'SELECT total_copies, available_copies FROM books WHERE id = ?',
          [documentId]
        ) as Array<{ total_copies: number; available_copies: number }>;

        if (bookInfo.length > 0) {
          const book = bookInfo[0];
          // Seulement augmenter si on peut le faire sans violer la contrainte
          if (book.available_copies < book.total_copies) {
            await executeQuery(
              'UPDATE books SET available_copies = available_copies + 1 WHERE id = ?',
              [documentId]
            );
          } else {
            console.log(`⚠️ Livre ${documentId} a déjà tous ses exemplaires disponibles (${book.available_copies}/${book.total_copies})`);
          }
        }
      } else {
        // Pour les documents académiques, pas de système d'exemplaires multiples
        // Pas de mise à jour d'available_copies car ils n'en ont pas
        console.log(`📚 Document académique ${documentId} libéré (pas de gestion d'exemplaires)`);
      }

      // Réorganiser les priorités pour les réservations actives restantes
      await executeQuery(
        `UPDATE reservations
         SET priority_order = priority_order - 1
         WHERE ${documentField} = ?
         AND status = 'active'
         AND priority_order > (
           SELECT priority_order FROM (
             SELECT priority_order FROM reservations WHERE id = ?
           ) as temp
         )`,
        [documentId, reservationId]
      );
    }

    // Récupérer la réservation mise à jour
    const updatedReservations = await executeQuery(
      `SELECT
        r.*,
        u.full_name as user_name,
        u.email as user_email,
        u.barcode as user_barcode,
        CASE WHEN r.document_type = 'book' THEN b.title ELSE ad.title END as document_title,
        CASE WHEN r.document_type = 'book' THEN b.main_author ELSE ad.main_author END as document_author,
        DATEDIFF(r.expiry_date, CURDATE()) as days_until_expiry
      FROM reservations r
      INNER JOIN users u ON r.user_id COLLATE utf8mb4_unicode_ci = u.id COLLATE utf8mb4_unicode_ci
      LEFT JOIN books b ON r.book_id COLLATE utf8mb4_unicode_ci = b.id COLLATE utf8mb4_unicode_ci
      LEFT JOIN (
        SELECT id, title, main_author FROM theses
        UNION ALL
        SELECT id, title, main_author FROM memoires
        UNION ALL
        SELECT id, title, student_name as main_author FROM stage_reports
      ) ad ON r.academic_document_id COLLATE utf8mb4_unicode_ci = ad.id COLLATE utf8mb4_unicode_ci
      WHERE r.id = ?`,
      [reservationId]
    );

    const updatedReservation = updatedReservations[0];

    // Logger la mise à jour de la réservation
    const documentId = existingReservation.book_id || existingReservation.academic_document_id;
    if (documentId) {
      await logLibraryOperation(
        'reservation_updated',
        updatedReservation.user_id,
        documentId,
        {
          recordId: reservationId,
          document_type: existingReservation.document_type,
          old_status: existingReservation.status,
          new_status: validatedData.status || existingReservation.status,
          changes: validatedData,
          document_title: updatedReservation.document_title
        }
      );
    }

    return NextResponse.json({
      data: updatedReservation,
      message: 'Réservation mise à jour avec succès'
    });
  } catch (error: unknown) {
    if (isZodError(error)) {
      return createValidationErrorResponse(error);
    }

    await logError(error as Error, { 
      action: 'update_reservation',
      requestUrl: '/api/reservations/[id]'
    });
    return createDatabaseErrorResponse(error);
  }
}

// PUT /api/reservations/[id] - Alias pour PATCH (compatibilité)
export const PUT = PATCH;

// DELETE /api/reservations/[id] - Supprimer une réservation
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: reservationId } = await params;

    // Vérifier que la réservation existe
    const existingReservations = await executeQuery(
      'SELECT id, document_type, book_id, academic_document_id, priority_order FROM reservations WHERE id = ?',
      [reservationId]
    ) as Array<{ 
      id: string; 
      document_type: string; 
      book_id: string | null; 
      academic_document_id: string | null; 
      priority_order: number; 
    }>;

    if (existingReservations.length === 0) {
      return NextResponse.json(
        { error: { code: 'RESERVATION_NOT_FOUND', message: 'Réservation non trouvée' } },
        { status: 404 }
      );
    }

    const reservation = existingReservations[0];

    // Déterminer la table du document
    const documentTable = reservation.document_type === 'book' ? 'books' :
                         reservation.document_type === 'these' ? 'theses' :
                         reservation.document_type === 'memoire' ? 'memoires' : 'stage_reports';

    // Libérer l'exemplaire réservé (remettre à disposition)
    const documentId = reservation.book_id || reservation.academic_document_id;

    if (documentTable === 'books') {
      // Vérifier d'abord l'état actuel du livre
      const bookInfo = await executeQuery(
        'SELECT total_copies, available_copies FROM books WHERE id = ?',
        [documentId]
      ) as Array<{ total_copies: number; available_copies: number }>;

      if (bookInfo.length > 0) {
        const book = bookInfo[0];
        // Seulement augmenter si on peut le faire sans violer la contrainte
        if (book.available_copies < book.total_copies) {
          await executeQuery(
            'UPDATE books SET available_copies = available_copies + 1 WHERE id = ?',
            [documentId]
          );
        } else {
          console.log(`⚠️ Livre ${documentId} a déjà tous ses exemplaires disponibles (${book.available_copies}/${book.total_copies})`);
        }
      }
    } else {
      // Pour les documents académiques, pas de système d'exemplaires multiples
      // Pas de mise à jour d'available_copies car ils n'en ont pas
      console.log(`📚 Document académique ${documentId} libéré (pas de gestion d'exemplaires)`);
    }

    // Récupérer les détails de la réservation avant suppression pour le log
    const reservationDetails = await executeQuery(
      `SELECT r.*, u.full_name, 
       CASE WHEN r.document_type = 'book' THEN b.title ELSE ad.title END as document_title
       FROM reservations r
       INNER JOIN users u ON r.user_id COLLATE utf8mb4_unicode_ci = u.id COLLATE utf8mb4_unicode_ci
       LEFT JOIN books b ON r.book_id COLLATE utf8mb4_unicode_ci = b.id COLLATE utf8mb4_unicode_ci
       LEFT JOIN (
         SELECT id, title FROM theses
         UNION ALL
         SELECT id, title FROM memoires
         UNION ALL
         SELECT id, title FROM stage_reports
       ) ad ON r.academic_document_id COLLATE utf8mb4_unicode_ci = ad.id COLLATE utf8mb4_unicode_ci
       WHERE r.id = ?`,
      [reservationId]
    ) as Array<any>;

    // Supprimer la réservation
    await executeQuery('DELETE FROM reservations WHERE id = ?', [reservationId]);

    // Réorganiser les priorités pour les réservations restantes
    const documentField = reservation.book_id ? 'book_id' : 'academic_document_id';

    await executeQuery(
      `UPDATE reservations
       SET priority_order = priority_order - 1
       WHERE ${documentField} = ?
       AND status = 'active'
       AND priority_order > ?`,
      [documentId, reservation.priority_order]
    );

    // 📧 ENVOYER EMAIL D'ANNULATION DE RÉSERVATION
    if (reservationDetails.length > 0) {
      const reservationDetail = reservationDetails[0];

      try {
        const { EmailNotificationService } = await import('@/lib/services/email-notification-service');

        const cancellationEmailData = {
          user_name: reservationDetail.full_name,
          user_email: reservationDetail.email,
          document_title: reservationDetail.document_title || 'Document',
          document_author: reservationDetail.document_author || 'Auteur non spécifié',
          document_type: reservation.document_type as 'book' | 'these' | 'memoire' | 'rapport_stage',
          reservation_date: reservationDetail.reservation_date,
          cancellation_reason: 'Réservation supprimée par l\'administrateur'
        };

        const emailSent = await EmailNotificationService.sendCancellationNotification(cancellationEmailData);
        if (emailSent) {
          console.log(`✅ Email d'annulation de réservation envoyé à ${reservationDetail.email}`);
        } else {
          console.log(`⚠️ Échec envoi email d'annulation de réservation à ${reservationDetail.email}`);
        }
      } catch (emailError) {
        console.error('❌ Erreur envoi email annulation réservation:', emailError);
      }
    }

    // Logger la suppression de la réservation
    if (reservationDetails.length > 0 && documentId) {
      const reservationDetail = reservationDetails[0];
      await logLibraryOperation(
        'reservation_cancelled',
        reservationDetail.user_id,
        documentId,
        {
          recordId: reservationId,
          document_type: reservation.document_type,
          priority_order: reservation.priority_order,
          document_title: reservationDetail.document_title,
          action: 'deleted'
        }
      );
    }

    return NextResponse.json({
      message: 'Réservation supprimée avec succès'
    });
  } catch (error) {
    await logError(error as Error, { 
      action: 'delete_reservation',
      requestUrl: '/api/reservations/[id]'
    });
    return createDatabaseErrorResponse(error);
  }
}
