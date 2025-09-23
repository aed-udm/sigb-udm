import { createGetByIdHandler, createUpdateHandler } from '@/lib/crud-api-factory';
import { userSchema } from '@/lib/validations';
import { getUserById, executeQuery } from '@/lib/mysql';
import { NextRequest, NextResponse } from 'next/server';
import { logCrudOperation, logError } from '@/lib/system-logger';

// Configuration CRUD pour les utilisateurs
const usersConfig = {
  tableName: 'users',
  entityName: 'utilisateur',
  schema: userSchema,
  getByIdFunction: getUserById,
  searchableFields: ['full_name', 'email', 'barcode'],
  updateableFields: ['full_name', 'email', 'phone', 'address', 'max_loans', 'max_reservations']
};

// Handlers CRUD génériques
export const GET = createGetByIdHandler(usersConfig);
export const PUT = createUpdateHandler(usersConfig);

// Handler DELETE spécialisé pour les utilisateurs (sans gestion de document_path)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Vérifier que l'utilisateur existe
    const existingUser = await getUserById(id);

    if (!existingUser) {
      return NextResponse.json(
        { error: { code: 'NOT_FOUND', message: 'Utilisateur non trouvé' } },
        { status: 404 }
      );
    }

    // 🔍 VÉRIFICATIONS MINUTIEUSES AVANT SUPPRESSION

    // 1. Vérifier les emprunts actifs
    const activeLoans = await executeQuery(
      'SELECT COUNT(*) as count FROM loans WHERE user_id = ? AND status IN (?, ?)',
      [id, 'active', 'overdue']
    ) as Array<{ count: number }>;

    if (activeLoans[0]?.count > 0) {
      return NextResponse.json(
        {
          error: {
            code: 'HAS_ACTIVE_LOANS',
            message: `Impossible de supprimer l'utilisateur : ${activeLoans[0].count} emprunt(s) en cours`,
            details: `L'utilisateur ${existingUser.full_name} a des emprunts actifs qui doivent être retournés avant suppression.`
          }
        },
        { status: 422 }
      );
    }

    // 2. Vérifier les réservations actives
    const activeReservations = await executeQuery(
      'SELECT COUNT(*) as count FROM reservations WHERE user_id = ? AND status = ?',
      [id, 'active']
    ) as Array<{ count: number }>;

    if (activeReservations[0]?.count > 0) {
      return NextResponse.json(
        {
          error: {
            code: 'HAS_ACTIVE_RESERVATIONS',
            message: `Impossible de supprimer l'utilisateur : ${activeReservations[0].count} réservation(s) active(s)`,
            details: `L'utilisateur ${existingUser.full_name} a des réservations actives qui doivent être annulées avant suppression.`
          }
        },
        { status: 422 }
      );
    }

    // 3. Vérifier les documents dans l'archive
    const archiveDocuments = await executeQuery(
      'SELECT COUNT(*) as count FROM archive_documents WHERE student_id = ?',
      [id]
    ) as Array<{ count: number }>;

    if (archiveDocuments[0]?.count > 0) {
      return NextResponse.json(
        {
          error: {
            code: 'HAS_ARCHIVE_DOCUMENTS',
            message: `Impossible de supprimer l'utilisateur : ${archiveDocuments[0].count} document(s) dans l'archive`,
            details: `L'utilisateur ${existingUser.full_name} a des documents archivés qui doivent être traités avant suppression.`
          }
        },
        { status: 422 }
      );
    }

    // 4. Vérifier les pénalités impayées
    const unpaidPenalties = await executeQuery(
      'SELECT COUNT(*) as count FROM penalties WHERE user_id = ? AND status = ?',
      [id, 'unpaid']
    ) as Array<{ count: number }>;

    if (unpaidPenalties[0]?.count > 0) {
      return NextResponse.json(
        {
          error: {
            code: 'HAS_UNPAID_PENALTIES',
            message: `Impossible de supprimer l'utilisateur : ${unpaidPenalties[0].count} pénalité(s) impayée(s)`,
            details: `L'utilisateur ${existingUser.full_name} a des pénalités impayées qui doivent être réglées avant suppression.`
          }
        },
        { status: 422 }
      );
    }

    // ✅ Toutes les vérifications passées - Procéder à la suppression

    // Logger la suppression avant de supprimer
    await logCrudOperation(
      'delete',
      'users',
      id,
      undefined,
      {
        deleted_user: {
          id: existingUser.id,
          full_name: existingUser.full_name,
          email: existingUser.email,
          matricule: existingUser.matricule
        },
        verification_passed: {
          active_loans: 0,
          active_reservations: 0,
          archive_documents: 0,
          unpaid_penalties: 0
        }
      }
    );

    // Supprimer l'utilisateur
    await executeQuery('DELETE FROM users WHERE id = ?', [id]);

    return NextResponse.json({
      success: true,
      message: `Utilisateur ${existingUser.full_name} supprimé avec succès`,
      data: {
        deleted_user: {
          id: existingUser.id,
          full_name: existingUser.full_name,
          email: existingUser.email
        }
      }
    });

  } catch (error) {
    console.error('Error deleting user:', error);
    const { id: errorId } = await params;
    await logError(error as Error, {
      action: 'delete_user',
      requestUrl: `/api/users/${errorId}`
    });

    return NextResponse.json(
      {
        error: {
          code: 'DELETE_ERROR',
          message: 'Erreur lors de la suppression de l\'utilisateur',
          details: error instanceof Error ? error.message : 'Erreur inconnue'
        }
      },
      { status: 500 }
    );
  }
}
