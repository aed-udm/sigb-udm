import { NextRequest, NextResponse } from 'next/server';
import { executeQuery } from '@/lib/mysql';

/**
 * API pour nettoyer les réservations expirées
 * POST: Marquer les réservations expirées et réorganiser les priorités
 * GET: Obtenir les réservations expirées
 */

// GET /api/reservations/cleanup - Obtenir les réservations expirées
export async function GET() {
  try {
    // Récupérer les réservations expirées qui sont encore actives
    const expiredReservations = await executeQuery(`
      SELECT 
        r.id,
        r.user_id,
        r.priority_order,
        r.reservation_date,
        r.expiry_date,
        r.document_type,
        r.book_id,
        r.academic_document_id,
        u.full_name as user_name,
        u.email as user_email,
        CASE WHEN r.document_type = 'book' THEN b.title ELSE ad.title END as document_title,
        DATEDIFF(CURDATE(), r.expiry_date) as days_expired
      FROM reservations r
      INNER JOIN users u ON r.user_id = u.id
      LEFT JOIN books b ON r.book_id = b.id AND r.document_type = 'book'
      LEFT JOIN (
        SELECT id, title FROM theses
        UNION ALL
        SELECT id, title FROM memoires
        UNION ALL
        SELECT id, title FROM stage_reports
      ) ad ON r.academic_document_id = ad.id
      WHERE r.status = 'active' 
      AND r.expiry_date < CURDATE()
      ORDER BY r.expiry_date ASC
    `) as Array<{
      id: string;
      user_id: string;
      priority_order: number;
      reservation_date: string;
      expiry_date: string;
      document_type: string;
      book_id: string | null;
      academic_document_id: string | null;
      user_name: string;
      user_email: string;
      document_title: string;
      days_expired: number;
    }>;

    return NextResponse.json({
      data: expiredReservations,
      count: expiredReservations.length,
      message: `${expiredReservations.length} réservation(s) expirée(s) trouvée(s)`
    });

  } catch (error) {
    console.error('Error fetching expired reservations:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des réservations expirées' },
      { status: 500 }
    );
  }
}

// POST /api/reservations/cleanup - Nettoyer les réservations expirées
export async function POST(_request: NextRequest) {
  try {
    // Récupérer d'abord les réservations expirées pour la réorganisation
    const expiredReservations = await executeQuery(`
      SELECT 
        id,
        book_id,
        academic_document_id,
        document_type,
        priority_order
      FROM reservations 
      WHERE status = 'active' AND expiry_date < CURDATE()
    `) as Array<{
      id: string;
      book_id: string | null;
      academic_document_id: string | null;
      document_type: string;
      priority_order: number;
    }>;

    let cleanedCount = 0;
    let freedCopies = 0;

    // Traiter chaque réservation expirée
    for (const reservation of expiredReservations) {
      const documentId = reservation.book_id || reservation.academic_document_id;
      const documentField = reservation.book_id ? 'book_id' : 'academic_document_id';

      // Marquer la réservation comme expirée
      await executeQuery(
        'UPDATE reservations SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        ['expired', reservation.id]
      );

      // Libérer l'exemplaire si c'est un livre
      if (reservation.document_type === 'book' && reservation.book_id) {
        const bookInfo = await executeQuery(
          'SELECT total_copies, available_copies FROM books WHERE id = ?',
          [reservation.book_id]
        ) as Array<{ total_copies: number; available_copies: number }>;

        if (bookInfo.length > 0) {
          const book = bookInfo[0];
          if (book.available_copies < book.total_copies) {
            await executeQuery(
              'UPDATE books SET available_copies = available_copies + 1 WHERE id = ?',
              [reservation.book_id]
            );
            freedCopies++;
          }
        }
      }

      // Réorganiser les priorités pour les réservations actives restantes
      await executeQuery(
        `UPDATE reservations 
         SET priority_order = priority_order - 1 
         WHERE ${documentField} = ? 
         AND status = 'active' 
         AND priority_order > ?`,
        [documentId, reservation.priority_order]
      );

      cleanedCount++;
    }

    return NextResponse.json({
      message: 'Nettoyage des réservations expirées terminé',
      cleaned_reservations: cleanedCount,
      freed_copies: freedCopies,
      details: {
        expired_reservations_marked: cleanedCount,
        book_copies_freed: freedCopies,
        priorities_reorganized: cleanedCount > 0
      }
    });

  } catch (error) {
    console.error('Error cleaning expired reservations:', error);
    return NextResponse.json(
      { error: 'Erreur lors du nettoyage des réservations expirées' },
      { status: 500 }
    );
  }
}
