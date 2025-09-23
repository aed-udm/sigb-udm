import { NextRequest, NextResponse } from 'next/server';
import { executeQuery } from '@/lib/mysql';

// GET /api/reservations/queue - Obtenir la file d'attente des réservations pour un document
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const documentId = searchParams.get('documentId');
    const documentType = searchParams.get('documentType');

    if (!documentId || !documentType) {
      return NextResponse.json(
        { error: 'Les paramètres documentId et documentType sont requis' },
        { status: 400 }
      );
    }

    // Valider le type de document
    const validTypes = ['book', 'these', 'memoire', 'rapport_stage'];
    if (!validTypes.includes(documentType)) {
      return NextResponse.json(
        { error: 'Type de document invalide' },
        { status: 400 }
      );
    }

    // Construire la requête selon le type de document
    const documentField = documentType === 'book' ? 'book_id' : 'academic_document_id';
    const whereClause = documentType === 'book'
      ? `r.${documentField} = ?`
      : `r.${documentField} = ? AND r.document_type = ?`;
    const params = documentType === 'book' ? [documentId] : [documentId, documentType];

    // Récupérer la file d'attente des réservations
    const queue = await executeQuery(`
      SELECT 
        r.id,
        r.user_id,
        r.priority_order,
        r.reservation_date,
        r.expiry_date,
        r.status,
        r.document_type,
        r.notes,
        u.full_name as user_name,
        u.email as user_email,
        u.barcode as user_barcode
      FROM reservations r
      INNER JOIN users u ON r.user_id COLLATE utf8mb4_unicode_ci = u.id COLLATE utf8mb4_unicode_ci
      WHERE ${whereClause}
      AND r.status = 'active'
      ORDER BY r.priority_order ASC
    `, params) as Array<{
      id: string;
      user_id: string;
      priority_order: number;
      reservation_date: string;
      expiry_date: string;
      status: string;
      document_type: string;
      notes: string | null;
      user_name: string;
      user_email: string;
      user_barcode: string;
    }>;

    // Calculer des statistiques supplémentaires
    const stats = {
      total_reservations: queue.length,
      next_user: queue.length > 0 ? queue[0].user_name : null,
      average_wait_time: queue.length > 1 ? Math.ceil(queue.length * 7) : 0, // Estimation en jours
      positions_available: queue.length < 10 // Limite arbitraire
    };

    // Vérifier s'il y a des problèmes de priorité
    const priorityIssues = [];
    for (let i = 0; i < queue.length; i++) {
      const expectedPriority = i + 1;
      if (queue[i].priority_order !== expectedPriority) {
        priorityIssues.push({
          reservation_id: queue[i].id,
          current_priority: queue[i].priority_order,
          expected_priority: expectedPriority,
          user_name: queue[i].user_name
        });
      }
    }

    return NextResponse.json({
      data: {
        document_id: documentId,
        document_type: documentType,
        queue,
        stats,
        priority_issues: priorityIssues
      },
      message: `File d'attente récupérée avec succès (${queue.length} réservation${queue.length > 1 ? 's' : ''})`
    });

  } catch (error) {
    console.error('Erreur lors de la récupération de la file d\'attente:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la récupération de la file d\'attente des réservations' },
      { status: 500 }
    );
  }
}

// POST /api/reservations/queue - Réorganiser la file d'attente (admin seulement)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { documentId, documentType, newOrder } = body;

    if (!documentId || !documentType || !Array.isArray(newOrder)) {
      return NextResponse.json(
        { error: 'Les paramètres documentId, documentType et newOrder sont requis' },
        { status: 400 }
      );
    }

    // Valider le type de document
    const validTypes = ['book', 'these', 'memoire', 'rapport_stage'];
    if (!validTypes.includes(documentType)) {
      return NextResponse.json(
        { error: 'Type de document invalide' },
        { status: 400 }
      );
    }

    // Vérifier que toutes les réservations existent
    const documentField = documentType === 'book' ? 'book_id' : 'academic_document_id';
    const whereClause = documentType === 'book'
      ? `${documentField} = ?`
      : `${documentField} = ? AND document_type = ?`;
    const params = documentType === 'book' ? [documentId] : [documentId, documentType];

    const existingReservations = await executeQuery(`
      SELECT id FROM reservations
      WHERE ${whereClause}
      AND status = 'active'
    `, params) as Array<{ id: string }>;

    const existingIds = existingReservations.map(r => r.id);
    const invalidIds = newOrder.filter(id => !existingIds.includes(id));

    if (invalidIds.length > 0) {
      return NextResponse.json(
        { error: `Réservations invalides: ${invalidIds.join(', ')}` },
        { status: 400 }
      );
    }

    if (newOrder.length !== existingIds.length) {
      return NextResponse.json(
        { error: 'Le nouvel ordre doit inclure toutes les réservations actives' },
        { status: 400 }
      );
    }

    // Mettre à jour les priorités
    for (let i = 0; i < newOrder.length; i++) {
      await executeQuery(
        'UPDATE reservations SET priority_order = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [i + 1, newOrder[i]]
      );
    }

    // Récupérer la nouvelle file d'attente
    const updatedQueue = await executeQuery(`
      SELECT 
        r.id,
        r.user_id,
        r.priority_order,
        u.full_name as user_name
      FROM reservations r
      INNER JOIN users u ON r.user_id COLLATE utf8mb4_unicode_ci = u.id COLLATE utf8mb4_unicode_ci
      WHERE ${whereClause}
      AND r.status = 'active'
      ORDER BY r.priority_order ASC
    `, params) as Array<{
      id: string;
      user_id: string;
      priority_order: number;
      user_name: string;
    }>;

    return NextResponse.json({
      data: {
        document_id: documentId,
        document_type: documentType,
        updated_queue: updatedQueue
      },
      message: 'File d\'attente réorganisée avec succès'
    });

  } catch (error) {
    console.error('Erreur lors de la réorganisation de la file d\'attente:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la réorganisation de la file d\'attente' },
      { status: 500 }
    );
  }
}
