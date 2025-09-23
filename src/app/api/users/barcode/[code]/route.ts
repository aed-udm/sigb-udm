import { NextRequest, NextResponse } from 'next/server';
import { executeQuery } from '@/lib/mysql';

// GET /api/users/barcode/[code] - Rechercher un usager par code-barres
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await params;

    // Décoder le code-barres (au cas où il serait encodé dans l'URL)
    const decodedCode = decodeURIComponent(code);

    const users = await executeQuery(
      'SELECT * FROM users WHERE barcode = ? OR matricule = ?',
      [decodedCode, decodedCode]
    ) as Array<{
      id: string;
      email: string;
      full_name: string;
      barcode: string;
      matricule: string | null;
      phone: string | null;
      address: string | null;
      is_active: boolean;
      max_loans: number;
      max_reservations: number;
      created_at: string;
      updated_at: string;
    }>;

    if (users.length === 0) {
      return NextResponse.json(
        { error: { code: 'NOT_FOUND', message: 'Usager non trouvé avec ce code-barres' } },
        { status: 404 }
      );
    }

    const user = users[0];

    // Vérifier si l'usager est actif
    if (!user.is_active) {
      return NextResponse.json(
        { error: { code: 'USER_INACTIVE', message: 'Usager inactif' } },
        { status: 422 }
      );
    }

    // Récupérer les emprunts actifs de l'usager avec détails des livres
    const activeLoans = await executeQuery(
      `SELECT
        l.id,
        l.loan_date,
        l.due_date,
        l.status,
        b.id as book_id,
        b.title as book_title,
        b.main_author as book_author,
        b.mfn as book_mfn
      FROM loans l
      JOIN books b ON l.book_id = b.id
      WHERE l.user_id = ? AND l.status IN (?, ?)`,
      [user.id, 'active', 'overdue']
    ) as Array<{
      id: string;
      book_id: string;
      loan_date: string;
      due_date: string;
      status: string;
      book_title: string;
      book_author: string;
    }>;

    const response = {
      data: {
        ...user,
        active_loans: activeLoans || [],
        active_loans_count: activeLoans?.length || 0,
        can_borrow: (activeLoans?.length || 0) < user.max_loans
      }
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error fetching user by barcode:', error);
    return NextResponse.json(
      { error: { code: 'FETCH_ERROR', message: 'Erreur lors de la recherche par code-barres' } },
      { status: 500 }
    );
  }
}
