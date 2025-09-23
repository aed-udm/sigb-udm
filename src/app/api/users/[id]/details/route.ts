import { NextRequest, NextResponse } from 'next/server';
import { executeQuery } from '@/lib/mysql';

// GET /api/users/[id]/details - Récupérer les détails complets d'un utilisateur
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Récupérer les informations de base de l'utilisateur
    const users = await executeQuery(
      `SELECT
        id, full_name, email, barcode, matricule, phone, address,
        max_loans,
        COALESCE(max_reservations, 3) as max_reservations,
        is_active, user_category as user_type,
        created_at, updated_at
       FROM users
       WHERE id = ?`,
      [id]
    ) as Array<{
      id: string;
      full_name: string;
      email: string;
      barcode: string;
      matricule: string;
      phone: string;
      address: string;
      max_loans: number;
      max_reservations: number;
      is_active: boolean;
      user_type: string;
      created_at: string;
      updated_at: string;
    }>;

    if (users.length === 0) {
      return NextResponse.json(
        { error: { code: 'USER_NOT_FOUND', message: 'Utilisateur non trouvé' } },
        { status: 404 }
      );
    }

    const user = users[0];

    // Récupérer les emprunts actifs
    const activeLoans = await executeQuery(
      `SELECT 
        l.id,
        l.document_type,
        l.loan_date,
        l.due_date,
        l.status,
        CASE
          WHEN l.document_type = 'book' THEN b.title
          WHEN l.document_type = 'these' THEN t.title
          WHEN l.document_type = 'memoire' THEN m.title
          WHEN l.document_type = 'rapport_stage' THEN s.title
        END as document_title,
        CASE
          WHEN l.document_type = 'book' THEN b.main_author
          WHEN l.document_type = 'these' THEN t.main_author
          WHEN l.document_type = 'memoire' THEN m.main_author
          WHEN l.document_type = 'rapport_stage' THEN s.student_name
        END as document_author,
        CASE
          WHEN l.document_type = 'book' THEN b.mfn
          WHEN l.document_type = 'these' THEN t.id
          WHEN l.document_type = 'memoire' THEN m.id
          WHEN l.document_type = 'rapport_stage' THEN s.id
        END as document_reference,
        DATEDIFF(CURDATE(), l.due_date) as days_overdue,
        GREATEST(0, DATEDIFF(CURDATE(), l.due_date) - COALESCE(ps.grace_period_days, 1)) as effective_days_overdue
       FROM loans l
       LEFT JOIN books b ON l.book_id COLLATE utf8mb4_unicode_ci = b.id COLLATE utf8mb4_unicode_ci AND l.document_type = 'book'
       LEFT JOIN theses t ON l.academic_document_id COLLATE utf8mb4_unicode_ci = t.id COLLATE utf8mb4_unicode_ci AND l.document_type = 'these'
       LEFT JOIN memoires m ON l.academic_document_id COLLATE utf8mb4_unicode_ci = m.id COLLATE utf8mb4_unicode_ci AND l.document_type = 'memoire'
       LEFT JOIN stage_reports s ON l.academic_document_id COLLATE utf8mb4_unicode_ci = s.id COLLATE utf8mb4_unicode_ci AND l.document_type = 'rapport_stage'
       LEFT JOIN penalty_settings ps ON ps.document_type COLLATE utf8mb4_unicode_ci = COALESCE(l.document_type, 'book') COLLATE utf8mb4_unicode_ci AND ps.is_active = 1
       WHERE l.user_id = ? AND l.status IN ('active', 'overdue')
       ORDER BY l.due_date ASC`,
      [id]
    ) as Array<{
      id: string;
      document_type: string;
      loan_date: string;
      due_date: string;
      status: string;
      document_title: string;
      document_author: string;
      document_reference: string;
      days_overdue: number;
      effective_days_overdue: number;
    }>;

    // Récupérer les réservations actives
    const activeReservations = await executeQuery(
      `SELECT 
        r.id,
        r.document_type,
        r.reservation_date,
        r.expiry_date,
        r.status,
        r.priority_order,
        CASE
          WHEN r.document_type = 'book' THEN b.title
          WHEN r.document_type = 'these' THEN t.title
          WHEN r.document_type = 'memoire' THEN m.title
          WHEN r.document_type = 'rapport_stage' THEN s.title
        END as document_title,
        CASE
          WHEN r.document_type = 'book' THEN b.main_author
          WHEN r.document_type = 'these' THEN t.main_author
          WHEN r.document_type = 'memoire' THEN m.main_author
          WHEN r.document_type = 'rapport_stage' THEN s.student_name
        END as document_author,
        CASE
          WHEN r.document_type = 'book' THEN b.mfn
          WHEN r.document_type = 'these' THEN t.id
          WHEN r.document_type = 'memoire' THEN m.id
          WHEN r.document_type = 'rapport_stage' THEN s.id
        END as document_reference,
        DATEDIFF(r.expiry_date, CURDATE()) as days_until_expiry
       FROM reservations r
       LEFT JOIN books b ON r.book_id COLLATE utf8mb4_unicode_ci = b.id COLLATE utf8mb4_unicode_ci AND r.document_type = 'book'
       LEFT JOIN theses t ON r.academic_document_id COLLATE utf8mb4_unicode_ci = t.id COLLATE utf8mb4_unicode_ci AND r.document_type = 'these'
       LEFT JOIN memoires m ON r.academic_document_id COLLATE utf8mb4_unicode_ci = m.id COLLATE utf8mb4_unicode_ci AND r.document_type = 'memoire'
       LEFT JOIN stage_reports s ON r.academic_document_id COLLATE utf8mb4_unicode_ci = s.id COLLATE utf8mb4_unicode_ci AND r.document_type = 'rapport_stage'
       WHERE r.user_id = ? AND r.status = 'active'
       ORDER BY r.priority_order ASC`,
      [id]
    ) as Array<{
      id: string;
      document_type: string;
      reservation_date: string;
      expiry_date: string;
      status: string;
      priority_order: number;
      document_title: string;
      document_author: string;
      document_reference: string;
      days_until_expiry: number;
    }>;

    // Calculer les statistiques
    const currentLoans = activeLoans.length;
    const currentReservations = activeReservations.length;
    const overdueLoans = activeLoans.filter(loan => loan.status === 'overdue' || loan.days_overdue > 0).length;
    const canBorrow = user.is_active && currentLoans < user.max_loans && overdueLoans === 0;
    const canReserve = user.is_active && currentReservations < user.max_reservations;

    // Construire la réponse
    const userDetails = {
      ...user,
      current_loans: currentLoans,
      current_reservations: currentReservations,
      overdue_loans: overdueLoans,
      can_borrow: canBorrow,
      can_reserve: canReserve,
      loans_remaining: Math.max(0, user.max_loans - currentLoans),
      reservations_remaining: Math.max(0, user.max_reservations - currentReservations),
      active_loans: activeLoans,
      active_reservations: activeReservations
    };

    return NextResponse.json(userDetails);

  } catch (error) {
    console.error('Erreur lors de la récupération des détails utilisateur:', error);
    return NextResponse.json(
      { 
        error: { 
          code: 'DATABASE_ERROR', 
          message: 'Erreur lors de la récupération des détails utilisateur' 
        } 
      },
      { status: 500 }
    );
  }
}
