import { NextRequest, NextResponse } from 'next/server';
import { bookSchema } from '@/lib/validations';
import { getBooks, executeQuery } from '@/lib/mysql';
import { v4 as uuidv4 } from 'uuid';
import { logCrudOperation, logError } from '@/lib/system-logger';
import { DocumentIdentifierService } from '@/lib/services/document-identifier-service';

import { DatabaseBook } from '@/types/database';

// GET /api/books - Récupérer tous les livres avec pagination et filtres
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const search = searchParams.get('search') || '';
    const domain = searchParams.get('domain') || '';
    const available = searchParams.get('available');
    const hasDigital = searchParams.get('has_digital_version');

    // Construire les filtres pour MySQL
    const filters: Record<string, unknown> = {};

    if (search) {
      filters.search = search;
    }

    if (domain) {
      filters.domain = domain;
    }

    if (available !== null) {
      filters.available_only = available === 'true';
    }

    if (hasDigital !== null) {
      filters.has_digital_version = hasDigital === 'true';
    }

    // Récupérer tous les livres avec filtres depuis MySQL
    const allBooks = await getBooks(filters);

    // Calculer la pagination
    const total = allBooks.length;
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const books = allBooks.slice(startIndex, endIndex);

    const response = {
      data: books || [],
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
        has_next: startIndex + limit < total,
        has_prev: page > 1
      }
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error fetching books:', error);
    return NextResponse.json(
      { error: { code: 'FETCH_ERROR', message: 'Erreur lors de la récupération des livres' } },
      { status: 500 }
    );
  }
}

// POST /api/books - Créer un nouveau livre
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validation des données avec gestion des erreurs Zod
    let validatedData;
    try {
      validatedData = bookSchema.parse(body);
    } catch (validationError: any) {
      console.error('Validation error:', validationError.errors || validationError);
      return NextResponse.json(
        { 
          error: { 
            code: 'VALIDATION_ERROR', 
            message: 'Données invalides', 
            details: validationError.errors || validationError.message 
          } 
        },
        { status: 400 }
      );
    }

    // Vérifier si un livre avec ce MFN existe déjà
    const existingBooks = await executeQuery(
      `SELECT id 
      FROM books WHERE mfn = ?`,
      [validatedData.mfn]
    ) as Array<{ id: string }>;

    if (existingBooks.length > 0) {
      return NextResponse.json(
        { error: { code: 'DUPLICATE_MFN', message: 'Un livre avec ce MFN existe déjà' } },
        { status: 409 }
      );
    }

    // Vérifier si un livre avec cet ISBN existe déjà (si ISBN fourni)
    if (validatedData.isbn) {
      const existingISBN = await executeQuery(
        `SELECT id, title, main_author 
        FROM books WHERE isbn = ?`,
        [validatedData.isbn]
      ) as Array<{ id: string; title: string; main_author: string }>;

      if (existingISBN.length > 0) {
        const existing = existingISBN[0];
        return NextResponse.json(
          { 
            error: { 
              code: 'DUPLICATE_ISBN', 
              message: `Un livre avec l'ISBN ${validatedData.isbn} existe déjà`,
              details: {
                existingBook: {
                  id: existing.id,
                  title: existing.title,
                  author: existing.main_author
                }
              }
            } 
          },
          { status: 409 }
        );
      }
    }

    // Générer les identifiants complets pour le nouveau livre
    const year = validatedData.publication_year || new Date().getFullYear();
    const identifiers = await DocumentIdentifierService.generateCompleteIdentifier(
      'book',
      year,
      {
        generateHandle: true
      }
    );

    // Créer le nouveau livre dans MySQL avec tous les identifiants
    await executeQuery(
      `INSERT INTO books (
        id, mfn, isbn, title, subtitle, parallel_title, main_author, secondary_author,
        edition, publication_city, publisher, publication_year, acquisition_mode, price,
        domain, collection, summary, abstract, keywords, keywords_en, dewey_classification,
        cdu_classification, subject_headings, available_copies, total_copies, document_path,
        file_type, document_size, digital_versions, has_digital_version,
        barcode, cames_id, local_id, handle, language, format, target_audience, physical_location, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        identifiers.uuid,
        validatedData.mfn,
        validatedData.isbn || null,
        validatedData.title,
        validatedData.subtitle || null,
        validatedData.parallel_title || null,
        validatedData.main_author,
        validatedData.secondary_author || null,
        validatedData.edition || null,
        validatedData.publication_city || null,
        validatedData.publisher || null,
        validatedData.publication_year || null,
        validatedData.acquisition_mode || null,
        validatedData.price || null,
        validatedData.domain || null,
        validatedData.collection || null,
        validatedData.summary || null,
        validatedData.abstract || null,
        validatedData.keywords ? JSON.stringify(validatedData.keywords) : null,
        validatedData.keywords_en ?
          (Array.isArray(validatedData.keywords_en) ?
            JSON.stringify(validatedData.keywords_en) :
            validatedData.keywords_en) : null,
        validatedData.dewey_classification || null,
        validatedData.cdu_classification || null,
        validatedData.subject_headings ? JSON.stringify(validatedData.subject_headings) : null,
        validatedData.available_copies || 0,
        validatedData.total_copies || 1,
        validatedData.document_path || null,
        validatedData.file_type || null,
        validatedData.document_size || null,
        validatedData.digital_versions ? JSON.stringify(validatedData.digital_versions) : null,
        validatedData.has_digital_version || false,
        identifiers.barcode,
        identifiers.cames_id,
        identifiers.local_id,
        identifiers.handle,
        validatedData.language || 'fr',
        validatedData.format || 'print',
        validatedData.target_audience || 'general',
        validatedData.physical_location || null,
        validatedData.status || 'available'
      ]
    );

    // Récupérer le livre créé
    const newBooks = await executeQuery(
      'SELECT * FROM books WHERE id = ?',
      [identifiers.uuid]
    ) as DatabaseBook[];

    const newBook = newBooks[0];
    if (newBook.keywords) {
      newBook.keywords = JSON.parse(newBook.keywords);
    }
    if (newBook.keywords_en) {
      newBook.keywords_en = JSON.parse(newBook.keywords_en);
    }

    // Logger la création du livre
    await logCrudOperation(
      'create',
      'books',
      identifiers.uuid,
      undefined,
      {
        title: validatedData.title,
        main_author: validatedData.main_author,
        mfn: validatedData.mfn,
        isbn: validatedData.isbn,
        domain: validatedData.domain,
        barcode: identifiers.barcode
      }
    );

    return NextResponse.json(
      { data: newBook, message: 'Livre créé avec succès' },
      { status: 201 }
    );
  } catch (error: unknown) {
    console.error('Error creating book:', error);
    await logError(error as Error, { 
      action: 'create_book',
      requestUrl: '/api/books'
    });
    return NextResponse.json(
      { error: { code: 'CREATE_ERROR', message: 'Erreur lors de la création du livre' } },
      { status: 500 }
    );
  }
}

// PUT /api/books - Mise à jour en lot (optionnel)
export async function PUT() {
  return NextResponse.json(
    { error: { code: 'NOT_IMPLEMENTED', message: 'Mise à jour en lot non implémentée' } },
    { status: 501 }
  );
}

// DELETE /api/books - Suppression en lot
export async function DELETE(request: NextRequest) {
  try {
    // Vérifier si le body existe et n'est pas vide
    const contentLength = request.headers.get('content-length');
    if (!contentLength || contentLength === '0') {
      return NextResponse.json(
        { error: { code: 'EMPTY_BODY', message: 'Corps de la requête vide. Utilisez {"ids": ["id1", "id2"]}' } },
        { status: 400 }
      );
    }

    let body;
    try {
      body = await request.json();
    } catch (jsonError) {
      return NextResponse.json(
        { error: { code: 'INVALID_JSON', message: 'JSON invalide. Format attendu: {"ids": ["id1", "id2"]}' } },
        { status: 400 }
      );
    }

    const { ids } = body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json(
        { error: { code: 'INVALID_INPUT', message: 'Liste d\'IDs requise. Format: {"ids": ["id1", "id2"]}' } },
        { status: 400 }
      );
    }

    // Vérifier que tous les livres existent
    const placeholders = ids.map(() => '?').join(',');
    const existingBooks = await executeQuery(
      `SELECT id FROM books WHERE id IN (${placeholders})`,
      ids
    ) as Array<{ id: string }>;

    if (existingBooks.length !== ids.length) {
      return NextResponse.json(
        { error: { code: 'SOME_NOT_FOUND', message: 'Certains livres n\'existent pas' } },
        { status: 404 }
      );
    }

    // Vérifier les emprunts actifs (si la table existe)
    try {
      const activeLoans = await executeQuery(
        `SELECT DISTINCT book_id FROM loans WHERE book_id IN (${placeholders}) AND status IN ('active', 'overdue')`,
        ids
      ) as Array<{ book_id: string }>;

      if (activeLoans.length > 0) {
        return NextResponse.json(
          {
            error: {
              code: 'HAS_ACTIVE_LOANS',
              message: `${activeLoans.length} livre(s) ont des emprunts en cours`
            }
          },
          { status: 422 }
        );
      }
    } catch (error) {
      console.warn('Table loans non trouvée, suppression autorisée:', error);
    }

    // Logger la suppression en lot avant de supprimer
    for (const id of ids) {
      await logCrudOperation(
        'delete',
        'books',
        id,
        undefined,
        { bulk_delete: true, total_deleted: ids.length }
      );
    }

    // Suppression en lot
    await executeQuery(
      `DELETE FROM books WHERE id IN (${placeholders})`,
      ids
    );

    return NextResponse.json({
      message: `${ids.length} livre(s) supprimé(s) avec succès`,
      deletedIds: ids
    });

  } catch (error) {
    console.error('Error bulk deleting books:', error);
    await logError(error as Error, { 
      action: 'bulk_delete_books',
      requestUrl: '/api/books'
    });
    return NextResponse.json(
      { error: { code: 'DELETE_ERROR', message: 'Erreur lors de la suppression en lot' } },
      { status: 500 }
    );
  }
}
