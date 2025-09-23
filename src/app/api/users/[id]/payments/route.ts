import { NextRequest, NextResponse } from 'next/server';
import { executeQuery } from '@/lib/mysql';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: userId } = await params;

    // Récupérer l'historique des paiements de pénalités pour cet utilisateur
    const payments = await executeQuery(`
      SELECT 
        pp.id,
        pp.penalty_id,
        pp.amount_paid,
        pp.payment_method,
        pp.payment_date,
        pp.notes,
        pp.processed_by,
        pp.created_at,
        p.loan_id,
        p.description as penalty_description,
        p.amount_fcfa as original_penalty_amount,
        CASE 
          WHEN l.document_type = 'book' THEN b.title
          WHEN l.document_type = 'these' THEN t.title
          WHEN l.document_type = 'memoire' THEN m.title
          WHEN l.document_type = 'rapport_stage' THEN s.title
          ELSE 'Document non spécifié'
        END as document_title
      FROM penalty_payments pp
      INNER JOIN penalties p ON pp.penalty_id COLLATE utf8mb4_unicode_ci = p.id COLLATE utf8mb4_unicode_ci
      LEFT JOIN loans l ON p.loan_id COLLATE utf8mb4_unicode_ci = l.id COLLATE utf8mb4_unicode_ci
      LEFT JOIN books b ON l.book_id COLLATE utf8mb4_unicode_ci = b.id COLLATE utf8mb4_unicode_ci AND l.document_type = 'book'
      LEFT JOIN theses t ON l.academic_document_id COLLATE utf8mb4_unicode_ci = t.id COLLATE utf8mb4_unicode_ci AND l.document_type = 'these'
      LEFT JOIN memoires m ON l.academic_document_id COLLATE utf8mb4_unicode_ci = m.id COLLATE utf8mb4_unicode_ci AND l.document_type = 'memoire'
      LEFT JOIN stage_reports s ON l.academic_document_id COLLATE utf8mb4_unicode_ci = s.id COLLATE utf8mb4_unicode_ci AND l.document_type = 'rapport_stage'
      WHERE p.user_id = ?
      ORDER BY pp.payment_date DESC, pp.created_at DESC
    `, [userId]);

    return NextResponse.json({
      success: true,
      data: payments,
      total: payments.length
    });

  } catch (error) {
    console.error('❌ Erreur récupération historique paiements:', error);
    return NextResponse.json(
      { 
        error: 'Erreur lors de la récupération de l\'historique des paiements',
        details: error instanceof Error ? error.message : 'Erreur inconnue'
      },
      { status: 500 }
    );
  }
}
