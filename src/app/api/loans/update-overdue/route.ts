import { NextRequest, NextResponse } from 'next/server';
import { executeQuery } from '@/lib/mysql';

// POST /api/loans/update-overdue - Mettre à jour manuellement les statuts en retard
export async function POST(request: NextRequest) {
  try {
    // Mettre à jour tous les emprunts actifs dont la date de retour est dépassée
    const result = await executeQuery(`
      UPDATE loans 
      SET status = 'overdue', updated_at = CURRENT_TIMESTAMP 
      WHERE status = 'active' 
      AND due_date < CURDATE() 
      AND return_date IS NULL
    `) as any;

    // Récupérer les emprunts qui viennent d'être marqués en retard avec période de grâce
    const overdueLoans = await executeQuery(`
      SELECT
        l.id,
        l.loan_date,
        l.due_date,
        l.status,
        u.full_name as user_name,
        u.email as user_email,
        u.barcode as user_barcode,
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
        l.document_type,
        DATEDIFF(CURDATE(), l.due_date) as days_overdue,
        COALESCE(ps.grace_period_days, 1) as grace_period_days,
        GREATEST(0, DATEDIFF(CURDATE(), l.due_date) - COALESCE(ps.grace_period_days, 1)) as effective_days_overdue
      FROM loans l
      JOIN users u ON l.user_id COLLATE utf8mb4_unicode_ci = u.id COLLATE utf8mb4_unicode_ci
      LEFT JOIN books b ON l.book_id COLLATE utf8mb4_unicode_ci = b.id COLLATE utf8mb4_unicode_ci AND l.document_type = 'book'
      LEFT JOIN theses t ON l.academic_document_id COLLATE utf8mb4_unicode_ci = t.id COLLATE utf8mb4_unicode_ci AND l.document_type = 'these'
      LEFT JOIN memoires m ON l.academic_document_id COLLATE utf8mb4_unicode_ci = m.id COLLATE utf8mb4_unicode_ci AND l.document_type = 'memoire'
      LEFT JOIN stage_reports s ON l.academic_document_id COLLATE utf8mb4_unicode_ci = s.id COLLATE utf8mb4_unicode_ci AND l.document_type = 'rapport_stage'
      LEFT JOIN penalty_settings ps ON ps.document_type COLLATE utf8mb4_unicode_ci = COALESCE(l.document_type, 'book') COLLATE utf8mb4_unicode_ci AND ps.is_active = 1
      WHERE l.status = 'overdue'
      AND l.return_date IS NULL
      ORDER BY l.due_date ASC
    `) as Array<{
      id: string;
      loan_date: string;
      due_date: string;
      status: string;
      user_name: string;
      user_email: string;
      user_barcode: string;
      document_title: string;
      document_author: string;
      document_type: string;
      days_overdue: number;
      grace_period_days: number;
      effective_days_overdue: number;
    }>;

    const affectedRows = result.affectedRows || 0;

    // Compter les emprunts effectivement en retard (après période de grâce)
    const effectiveOverdueCount = overdueLoans.filter(loan => {
      // Utiliser les jours de retard effectifs calculés dans la requête SQL
      return loan.effective_days_overdue > 0;
    }).length;

    const message = affectedRows > 0
      ? `${affectedRows} emprunt(s) marqué(s) en retard`
      : `${effectiveOverdueCount} emprunt(s) en retard effectif (${overdueLoans.length} total avec période de grâce)`;

    return NextResponse.json({
      success: true,
      message: message,
      data: {
        updated_count: affectedRows,
        overdue_loans: overdueLoans,
        total_overdue: overdueLoans.length,
        effective_overdue: effectiveOverdueCount
      }
    });

  } catch (error) {
    console.error('❌ Erreur lors de la mise à jour des emprunts en retard:', error);
    return NextResponse.json(
      { 
        error: { 
          code: 'UPDATE_OVERDUE_ERROR', 
          message: 'Erreur lors de la mise à jour des emprunts en retard' 
        } 
      },
      { status: 500 }
    );
  }
}

// GET /api/loans/update-overdue - Obtenir la liste des emprunts en retard sans mise à jour
export async function GET() {
  try {
    // Récupérer tous les emprunts en retard actuels
    const overdueLoans = await executeQuery(`
      SELECT 
        l.id,
        l.loan_date,
        l.due_date,
        l.status,
        u.full_name as user_name,
        u.email as user_email,
        u.barcode as user_barcode,
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
        l.document_type,
        DATEDIFF(CURDATE(), l.due_date) as days_overdue
      FROM loans l
      JOIN users u ON l.user_id COLLATE utf8mb4_unicode_ci = u.id COLLATE utf8mb4_unicode_ci
      LEFT JOIN books b ON l.book_id COLLATE utf8mb4_unicode_ci = b.id COLLATE utf8mb4_unicode_ci AND l.document_type = 'book'
      LEFT JOIN theses t ON l.academic_document_id COLLATE utf8mb4_unicode_ci = t.id COLLATE utf8mb4_unicode_ci AND l.document_type = 'these'
      LEFT JOIN memoires m ON l.academic_document_id COLLATE utf8mb4_unicode_ci = m.id COLLATE utf8mb4_unicode_ci AND l.document_type = 'memoire'
      LEFT JOIN stage_reports s ON l.academic_document_id COLLATE utf8mb4_unicode_ci = s.id COLLATE utf8mb4_unicode_ci AND l.document_type = 'rapport_stage'
      WHERE (l.status = 'overdue' OR (l.status = 'active' AND l.due_date < CURDATE()))
      AND l.return_date IS NULL
      ORDER BY l.due_date ASC
    `) as Array<{
      id: string;
      loan_date: string;
      due_date: string;
      status: string;
      user_name: string;
      user_email: string;
      user_barcode: string;
      document_title: string;
      document_author: string;
      document_type: string;
      days_overdue: number;
    }>;

    // Compter les emprunts qui devraient être marqués en retard mais ne le sont pas encore
    const pendingOverdue = overdueLoans.filter(loan => loan.status === 'active').length;

    return NextResponse.json({
      data: overdueLoans,
      meta: {
        total_overdue: overdueLoans.length,
        already_marked: overdueLoans.filter(loan => loan.status === 'overdue').length,
        pending_update: pendingOverdue
      }
    });

  } catch (error) {
    console.error('❌ Erreur lors de la récupération des emprunts en retard:', error);
    return NextResponse.json(
      { 
        error: { 
          code: 'FETCH_OVERDUE_ERROR', 
          message: 'Erreur lors de la récupération des emprunts en retard' 
        } 
      },
      { status: 500 }
    );
  }
}
