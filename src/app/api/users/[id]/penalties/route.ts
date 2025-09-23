import { NextRequest, NextResponse } from 'next/server';
import { executeQuery } from '@/lib/mysql';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: userId } = await params;

    // Récupérer toutes les pénalités de cet utilisateur avec les informations de paiement
    const penalties = await executeQuery(`
      SELECT 
        p.id,
        p.loan_id,
        p.penalty_type,
        p.amount_fcfa,
        p.penalty_date,
        p.due_date,
        p.status,
        p.description,
        p.created_at,
        CASE 
          WHEN l.document_type = 'book' THEN b.title
          WHEN l.document_type = 'these' THEN t.title
          WHEN l.document_type = 'memoire' THEN m.title
          WHEN l.document_type = 'rapport_stage' THEN s.title
          ELSE 'Document non spécifié'
        END as document_title,
        COALESCE(SUM(pp.amount_paid), 0) as total_paid,
        MAX(pp.payment_date) as last_payment_date,
        COUNT(pp.id) as payment_count
      FROM penalties p
      LEFT JOIN loans l ON p.loan_id COLLATE utf8mb4_unicode_ci = l.id COLLATE utf8mb4_unicode_ci
      LEFT JOIN books b ON l.book_id COLLATE utf8mb4_unicode_ci = b.id COLLATE utf8mb4_unicode_ci AND l.document_type = 'book'
      LEFT JOIN theses t ON l.academic_document_id COLLATE utf8mb4_unicode_ci = t.id COLLATE utf8mb4_unicode_ci AND l.document_type = 'these'
      LEFT JOIN memoires m ON l.academic_document_id COLLATE utf8mb4_unicode_ci = m.id COLLATE utf8mb4_unicode_ci AND l.document_type = 'memoire'
      LEFT JOIN stage_reports s ON l.academic_document_id COLLATE utf8mb4_unicode_ci = s.id COLLATE utf8mb4_unicode_ci AND l.document_type = 'rapport_stage'
      LEFT JOIN penalty_payments pp ON p.id COLLATE utf8mb4_unicode_ci = pp.penalty_id COLLATE utf8mb4_unicode_ci
      WHERE p.user_id = ?
      GROUP BY p.id, p.loan_id, p.penalty_type, p.amount_fcfa, p.penalty_date, 
               p.due_date, p.status, p.description, p.created_at, document_title
      ORDER BY p.penalty_date DESC, p.created_at DESC
    `, [userId]);

    // Calculer les statistiques
    const totalPenalties = penalties.length;
    const unpaidPenalties = penalties.filter((p: any) => p.status === 'unpaid');
    const paidPenalties = penalties.filter((p: any) => p.status === 'paid');
    const partialPenalties = penalties.filter((p: any) => p.status === 'partial');

    const totalAmount = penalties.reduce((sum: number, p: any) => sum + p.amount_fcfa, 0);
    const totalPaid = penalties.reduce((sum: number, p: any) => sum + p.total_paid, 0);
    const totalUnpaid = unpaidPenalties.reduce((sum: number, p: any) => sum + p.amount_fcfa, 0);

    return NextResponse.json({
      success: true,
      data: penalties,
      statistics: {
        total_penalties: totalPenalties,
        unpaid_count: unpaidPenalties.length,
        paid_count: paidPenalties.length,
        partial_count: partialPenalties.length,
        total_amount: totalAmount,
        total_paid: totalPaid,
        total_unpaid: totalUnpaid
      }
    });

  } catch (error) {
    console.error('❌ Erreur récupération pénalités utilisateur:', error);
    return NextResponse.json(
      { 
        error: 'Erreur lors de la récupération des pénalités',
        details: error instanceof Error ? error.message : 'Erreur inconnue'
      },
      { status: 500 }
    );
  }
}
