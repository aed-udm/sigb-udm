import { NextRequest, NextResponse } from 'next/server';
import { executeQuery } from '@/lib/mysql';

/**
 * API pour gérer les notifications de réservations
 * POST: Marquer une réservation comme notifiée
 * GET: Obtenir les réservations nécessitant une notification
 */

// GET /api/reservations/notify - Obtenir les réservations qui nécessitent une notification
export async function GET() {
  try {
    // Récupérer les réservations actives qui n'ont pas encore été notifiées
    // et dont le document est maintenant disponible
    const reservationsToNotify = await executeQuery(`
      SELECT 
        r.id,
        r.user_id,
        r.priority_order,
        r.reservation_date,
        r.expiry_date,
        r.document_type,
        u.full_name as user_name,
        u.email as user_email,
        CASE WHEN r.document_type = 'book' THEN b.title ELSE ad.title END as document_title,
        CASE WHEN r.document_type = 'book' THEN b.available_copies ELSE 1 END as available_copies
      FROM reservations r
      INNER JOIN users u ON r.user_id COLLATE utf8mb4_unicode_ci = u.id COLLATE utf8mb4_unicode_ci
      LEFT JOIN books b ON r.book_id COLLATE utf8mb4_unicode_ci = b.id COLLATE utf8mb4_unicode_ci AND r.document_type = 'book'
      LEFT JOIN (
        SELECT id, title FROM theses
        UNION ALL
        SELECT id, title FROM memoires
        UNION ALL
        SELECT id, title FROM stage_reports
      ) ad ON r.academic_document_id COLLATE utf8mb4_unicode_ci = ad.id COLLATE utf8mb4_unicode_ci
      WHERE r.status = 'active' 
      AND r.notification_sent = FALSE
      AND r.priority_order = 1
      AND (
        (r.document_type = 'book' AND b.available_copies > 0) OR
        (r.document_type != 'book')
      )
      ORDER BY r.reservation_date ASC
    `) as Array<{
      id: string;
      user_id: string;
      priority_order: number;
      reservation_date: string;
      expiry_date: string;
      document_type: string;
      user_name: string;
      user_email: string;
      document_title: string;
      available_copies: number;
    }>;

    return NextResponse.json({
      data: reservationsToNotify,
      count: reservationsToNotify.length,
      message: `${reservationsToNotify.length} réservation(s) nécessitent une notification`
    });

  } catch (error) {
    console.error('Error fetching notifications:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des notifications' },
      { status: 500 }
    );
  }
}

// POST /api/reservations/notify - Marquer une réservation comme notifiée
export async function POST(request: NextRequest) {
  try {
    const { reservation_id } = await request.json();

    if (!reservation_id) {
      return NextResponse.json(
        { error: 'ID de réservation requis' },
        { status: 400 }
      );
    }

    // Vérifier que la réservation existe
    const reservations = await executeQuery(
      'SELECT id, status FROM reservations WHERE id = ?',
      [reservation_id]
    ) as Array<{ id: string; status: string }>;

    if (reservations.length === 0) {
      return NextResponse.json(
        { error: 'Réservation non trouvée' },
        { status: 404 }
      );
    }

    if (reservations[0].status !== 'active') {
      return NextResponse.json(
        { error: 'Seules les réservations actives peuvent être notifiées' },
        { status: 400 }
      );
    }

    // Marquer comme notifiée
    await executeQuery(
      'UPDATE reservations SET notification_sent = TRUE, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [reservation_id]
    );

    return NextResponse.json({
      message: 'Notification marquée comme envoyée',
      reservation_id
    });

  } catch (error) {
    console.error('Error marking notification:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la mise à jour de la notification' },
      { status: 500 }
    );
  }
}
