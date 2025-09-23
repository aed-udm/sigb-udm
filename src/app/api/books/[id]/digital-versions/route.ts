import { NextRequest, NextResponse } from 'next/server';
import { getBookById, executeQuery } from '@/lib/mysql';

/**
 * GET /api/books/[id]/digital-versions - Récupérer les versions numériques d'un livre
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Récupérer le livre
    const book = await getBookById(id);

    if (!book) {
      return NextResponse.json(
        { error: { code: 'NOT_FOUND', message: 'Livre non trouvé' } },
        { status: 404 }
      );
    }

    // Si les versions numériques sont déjà en cache, les retourner
    if (book.digital_versions) {
      let digitalData;
      try {
        // Parser le JSON si c'est une chaîne
        digitalData = typeof book.digital_versions === 'string'
          ? JSON.parse(book.digital_versions)
          : book.digital_versions;

        return NextResponse.json({
          success: true,
          data: digitalData,
          cached: true,
          book: {
            id: book.id,
            title: book.title,
            main_author: book.main_author
          }
        });
      } catch (error) {
        console.warn('Erreur parsing digital_versions:', error);
        // Continuer vers la recherche si le parsing échoue
      }
    }

    // Sinon, rechercher les versions numériques (implémentation simplifiée)
    const digitalVersions = {
      versions: [],
      total: 0,
      message: 'Service de recherche de versions numériques temporairement indisponible'
    };

    // Mettre à jour le livre avec les versions trouvées
    await executeQuery(
      'UPDATE books SET digital_versions = ?, has_digital_version = ? WHERE id = ?',
      [
        JSON.stringify(digitalVersions),
        digitalVersions.totalFound > 0,
        id
      ]
    );

    return NextResponse.json({
      success: true,
      data: digitalVersions,
      cached: false,
      book: {
        id: book.id,
        title: book.title,
        main_author: book.main_author
      }
    });

  } catch (error) {
    console.error('Error fetching digital versions:', error);
    return NextResponse.json(
      { 
        error: { 
          code: 'FETCH_ERROR', 
          message: 'Erreur lors de la récupération des versions numériques' 
        } 
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/books/[id]/digital-versions - Forcer la recherche des versions numériques
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Récupérer le livre
    const book = await getBookById(id);

    if (!book) {
      return NextResponse.json(
        { error: { code: 'NOT_FOUND', message: 'Livre non trouvé' } },
        { status: 404 }
      );
    }

    // Forcer la recherche des versions numériques (implémentation simplifiée)
    const digitalVersions = {
      versions: [],
      total: 0,
      message: 'Service de recherche de versions numériques temporairement indisponible'
    };

    // Mettre à jour le livre avec les nouvelles versions
    await executeQuery(
      'UPDATE books SET digital_versions = ?, has_digital_version = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [
        JSON.stringify(digitalVersions),
        digitalVersions.totalFound > 0,
        id
      ]
    );

    return NextResponse.json({
      success: true,
      data: digitalVersions,
      message: 'Versions numériques mises à jour',
      book: {
        id: book.id,
        title: book.title,
        main_author: book.main_author
      }
    });

  } catch (error) {
    console.error('Error updating digital versions:', error);
    return NextResponse.json(
      { 
        error: { 
          code: 'UPDATE_ERROR', 
          message: 'Erreur lors de la mise à jour des versions numériques' 
        } 
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/books/[id]/digital-versions - Supprimer le cache des versions numériques
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Vérifier que le livre existe
    const book = await getBookById(id);

    if (!book) {
      return NextResponse.json(
        { error: { code: 'NOT_FOUND', message: 'Livre non trouvé' } },
        { status: 404 }
      );
    }

    // Supprimer le cache des versions numériques
    await executeQuery(
      'UPDATE books SET digital_versions = NULL, has_digital_version = FALSE, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [id]
    );

    return NextResponse.json({
      success: true,
      message: 'Cache des versions numériques supprimé'
    });

  } catch (error) {
    console.error('Error clearing digital versions cache:', error);
    return NextResponse.json(
      { 
        error: { 
          code: 'DELETE_ERROR', 
          message: 'Erreur lors de la suppression du cache' 
        } 
      },
      { status: 500 }
    );
  }
}
