import { NextRequest, NextResponse } from 'next/server';
import { executeQuery } from '@/lib/mysql';

// POST /api/penalties/calculate - Calculer les pénalités pour tous les emprunts en retard
export async function POST(request: NextRequest) {
  try {
    // Calculer les pénalités directement
    console.log('🔄 Calcul des pénalités en cours...');

    // Récupérer tous les emprunts en retard
    const overdueLoans = await executeQuery(`
      SELECT
        l.id,
        l.user_id,
        l.due_date,
        l.document_type,
        l.fine_amount,
        DATEDIFF(CURDATE(), l.due_date) as days_overdue
      FROM loans l
      WHERE l.status IN ('overdue', 'active')
      AND l.return_date IS NULL
      AND l.due_date < CURDATE()
    `) as Array<{
      id: string;
      user_id: string;
      due_date: string;
      document_type: string;
      fine_amount: number;
      days_overdue: number;
    }>;

    console.log(`📊 ${overdueLoans.length} emprunt(s) en retard trouvé(s)`);

    // Traiter chaque emprunt en retard
    for (const loan of overdueLoans) {
      // Récupérer les paramètres de pénalité pour ce type de document
      const settings = await executeQuery(`
        SELECT daily_rate, max_penalty, grace_period_days
        FROM penalty_settings
        WHERE document_type = ? AND is_active = TRUE
        LIMIT 1
      `, [loan.document_type]) as Array<{
        daily_rate: number;
        max_penalty: number;
        grace_period_days: number;
      }>;

      if (settings.length > 0) {
        const { daily_rate, max_penalty, grace_period_days } = settings[0];

        // Calculer la pénalité (en tenant compte de la période de grâce)
        if (loan.days_overdue > grace_period_days) {
          let calculated_fine = (loan.days_overdue - grace_period_days) * daily_rate;

          // Appliquer le plafond maximum
          if (calculated_fine > max_penalty) {
            calculated_fine = max_penalty;
          }

          // Mettre à jour seulement si la pénalité a changé
          if (calculated_fine !== loan.fine_amount) {
            await executeQuery(`
              UPDATE loans
              SET
                fine_amount = ?,
                fine_calculated_date = CURRENT_TIMESTAMP,
                daily_fine_rate = ?,
                status = 'overdue'
              WHERE id = ?
            `, [calculated_fine, daily_rate, loan.id]);

            console.log(`✓ Pénalité calculée pour emprunt ${loan.id}: ${calculated_fine} FCFA`);
          }
        }
      }
    }

    // Récupérer les statistiques mises à jour
    const stats = await executeQuery(`
      SELECT 
        total_fines_count,
        total_fines_amount,
        paid_fines_count,
        paid_fines_amount,
        unpaid_fines_count,
        unpaid_fines_amount,
        average_fine_amount
      FROM penalty_stats
    `) as Array<{
      total_fines_count: number;
      total_fines_amount: number;
      paid_fines_count: number;
      paid_fines_amount: number;
      unpaid_fines_count: number;
      unpaid_fines_amount: number;
      average_fine_amount: number;
    }>;

    // Récupérer les emprunts avec pénalités
    const loansWithPenalties = await executeQuery(`
      SELECT 
        l.id,
        l.user_id,
        l.due_date,
        l.fine_amount,
        l.fine_paid,
        l.fine_calculated_date,
        l.daily_fine_rate,
        l.document_type,
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
        DATEDIFF(CURDATE(), l.due_date) as days_overdue
      FROM loans l
      JOIN users u ON l.user_id COLLATE utf8mb4_unicode_ci = u.id COLLATE utf8mb4_unicode_ci
      LEFT JOIN books b ON l.book_id COLLATE utf8mb4_unicode_ci = b.id COLLATE utf8mb4_unicode_ci AND l.document_type = 'book'
      LEFT JOIN theses t ON l.academic_document_id COLLATE utf8mb4_unicode_ci = t.id COLLATE utf8mb4_unicode_ci AND l.document_type = 'these'
      LEFT JOIN memoires m ON l.academic_document_id COLLATE utf8mb4_unicode_ci = m.id COLLATE utf8mb4_unicode_ci AND l.document_type = 'memoire'
      LEFT JOIN stage_reports s ON l.academic_document_id COLLATE utf8mb4_unicode_ci = s.id COLLATE utf8mb4_unicode_ci AND l.document_type = 'rapport_stage'
      WHERE l.fine_amount > 0
      ORDER BY l.fine_amount DESC, l.due_date ASC
    `) as Array<{
      id: string;
      user_id: string;
      due_date: string;
      fine_amount: number;
      fine_paid: boolean;
      fine_calculated_date: string;
      daily_fine_rate: number;
      document_type: string;
      user_name: string;
      user_email: string;
      user_barcode: string;
      document_title: string;
      document_author: string;
      days_overdue: number;
    }>;

    return NextResponse.json({
      success: true,
      message: 'Pénalités calculées avec succès',
      data: {
        stats: stats[0] || {
          total_fines_count: 0,
          total_fines_amount: 0,
          paid_fines_count: 0,
          paid_fines_amount: 0,
          unpaid_fines_count: 0,
          unpaid_fines_amount: 0,
          average_fine_amount: 0
        },
        loans_with_penalties: loansWithPenalties
      }
    });

  } catch (error) {
    console.error('Erreur lors du calcul des pénalités:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Erreur lors du calcul des pénalités',
        details: error instanceof Error ? error.message : 'Erreur inconnue'
      },
      { status: 500 }
    );
  }
}

// GET /api/penalties/calculate - Récupérer les statistiques de pénalités
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const includeLoans = searchParams.get('include_loans') === 'true';

    // Récupérer les statistiques
    const stats = await executeQuery(`
      SELECT 
        total_fines_count,
        total_fines_amount,
        paid_fines_count,
        paid_fines_amount,
        unpaid_fines_count,
        unpaid_fines_amount,
        average_fine_amount
      FROM penalty_stats
    `) as Array<{
      total_fines_count: number;
      total_fines_amount: number;
      paid_fines_count: number;
      paid_fines_amount: number;
      unpaid_fines_count: number;
      unpaid_fines_amount: number;
      average_fine_amount: number;
    }>;

    let loansWithPenalties: any[] = [];

    if (includeLoans) {
      // Récupérer les emprunts avec pénalités
      loansWithPenalties = await executeQuery(`
        SELECT
          l.id,
          l.user_id,
          l.due_date,
          l.fine_amount,
          l.fine_paid,
          l.fine_calculated_date,
          l.daily_fine_rate,
          l.document_type,
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
          DATEDIFF(CURDATE(), l.due_date) as days_overdue
        FROM loans l
        JOIN users u ON l.user_id COLLATE utf8mb4_unicode_ci = u.id COLLATE utf8mb4_unicode_ci
        LEFT JOIN books b ON l.book_id COLLATE utf8mb4_unicode_ci = b.id COLLATE utf8mb4_unicode_ci AND l.document_type = 'book'
        LEFT JOIN theses t ON l.academic_document_id COLLATE utf8mb4_unicode_ci = t.id COLLATE utf8mb4_unicode_ci AND l.document_type = 'these'
        LEFT JOIN memoires m ON l.academic_document_id COLLATE utf8mb4_unicode_ci = m.id COLLATE utf8mb4_unicode_ci AND l.document_type = 'memoire'
        LEFT JOIN stage_reports s ON l.academic_document_id COLLATE utf8mb4_unicode_ci = s.id COLLATE utf8mb4_unicode_ci AND l.document_type = 'rapport_stage'
        WHERE l.fine_amount > 0
        ORDER BY l.fine_amount DESC, l.due_date ASC
      `);
    }

    return NextResponse.json({
      success: true,
      data: {
        stats: stats[0] || {
          total_fines_count: 0,
          total_fines_amount: 0,
          paid_fines_count: 0,
          paid_fines_amount: 0,
          unpaid_fines_count: 0,
          unpaid_fines_amount: 0,
          average_fine_amount: 0
        },
        loans_with_penalties: loansWithPenalties
      }
    });

  } catch (error) {
    console.error('Erreur lors de la récupération des pénalités:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Erreur lors de la récupération des pénalités',
        details: error instanceof Error ? error.message : 'Erreur inconnue'
      },
      { status: 500 }
    );
  }
}
