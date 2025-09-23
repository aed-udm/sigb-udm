import { NextRequest, NextResponse } from 'next/server';
import { thesisSchema } from '@/lib/validations';
import { getTheses, executeQuery } from '@/lib/mysql';
import { DocumentIdentifierService } from '@/lib/services/document-identifier-service';
import { v4 as uuidv4 } from 'uuid';
import { logCrudOperation, logError } from '@/lib/system-logger';

// GET /api/theses - Récupérer toutes les thèses avec pagination et filtres
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const search = searchParams.get('search') || '';
    // const specialty = searchParams.get('specialty') || ''; // Réservé pour usage futur
    const degree = searchParams.get('degree') || '';
    const year = searchParams.get('year');

    // Construire les filtres pour MySQL
    const filters: Record<string, unknown> = {};

    if (search) {
      filters.search = search;
    }

    if (degree) {
      filters.degree = degree;
    }

    if (year) {
      filters.year = parseInt(year);
    }

    // Récupérer toutes les thèses avec filtres depuis MySQL
    const allTheses = await getTheses(filters);

    // Calculer la pagination
    const total = allTheses.length;
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const theses = allTheses.slice(startIndex, endIndex);

    const response = {
      data: theses || [],
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
    console.error('Error fetching theses:', error);
    return NextResponse.json(
      { error: { code: 'FETCH_ERROR', message: 'Erreur lors de la récupération des thèses' } },
      { status: 500 }
    );
  }
}

// POST /api/theses - Créer une nouvelle thèse
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validation des données
    const validatedData = thesisSchema.parse(body);

    // Générer les identifiants complets pour la nouvelle thèse
    const year = validatedData.defense_year || new Date().getFullYear();
    const identifiers = await DocumentIdentifierService.generateCompleteIdentifier(
      'these',
      year,
      {
        generateDOI: true,
        generateHandle: true
      }
    );

    // Créer la nouvelle thèse dans MySQL avec tous les identifiants
    await executeQuery(
      `INSERT INTO theses (id, main_author, director, co_director, title, target_degree,
       specialty, defense_year, defense_date, university, faculty, department, pagination,
       summary, keywords, abstract, keywords_en, document_path, document_type,
       document_size, is_accessible, barcode, cames_id, local_id, handle, doi,
       language, format, target_audience, physical_location, status, institution, country, access_rights, license)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        identifiers.uuid,
        validatedData.main_author,
        validatedData.director,
        validatedData.co_director || null,
        validatedData.title,
        validatedData.target_degree,
        validatedData.specialty || null,
        validatedData.defense_year || null,
        validatedData.defense_date || null,
        validatedData.university || null,
        validatedData.faculty || null,
        validatedData.department || null,
        validatedData.pagination || null,
        validatedData.summary || null,
        validatedData.keywords ? JSON.stringify(validatedData.keywords) : null,
        validatedData.abstract || null,
        validatedData.keywords_en ? JSON.stringify(validatedData.keywords_en) : null,
        validatedData.document_path || null,
        validatedData.document_type || null,
        validatedData.document_size || null,
        validatedData.is_accessible !== undefined ? validatedData.is_accessible : true,
        identifiers.barcode,
        identifiers.cames_id,
        identifiers.local_id,
        identifiers.handle,
        identifiers.doi,
        validatedData.language || 'fr',
        validatedData.format || 'print',
        validatedData.target_audience || 'graduate',
        validatedData.physical_location || null,
        validatedData.status || 'available',
        validatedData.institution || 'Université des Montagnes',
        validatedData.country || 'Cameroun',
        validatedData.access_rights || 'open',
        validatedData.license || 'CC-BY'
      ]
    );

    // Récupérer la thèse créée
    const newTheses = await executeQuery(
      'SELECT * FROM theses WHERE id = ?',
      [identifiers.uuid]
    ) as Array<{
      id: string;
      main_author: string;
      director: string;
      title: string;
      target_degree: string;
      specialty: string;
      defense_year: number;
      keywords: string;
      keywords_en: string;
      created_at: string;
      updated_at: string;
    }>;

    const newThesis = newTheses[0];
    if (newThesis.keywords) {
      newThesis.keywords = JSON.parse(newThesis.keywords);
    }
    if (newThesis.keywords_en) {
      newThesis.keywords_en = JSON.parse(newThesis.keywords_en);
    }

    // Logger la création de la thèse
    await logCrudOperation(
      'create',
      'theses',
      identifiers.uuid,
      undefined,
      {
        title: validatedData.title,
        main_author: validatedData.main_author,
        director: validatedData.director,
        target_degree: validatedData.target_degree,
        defense_year: validatedData.defense_year,
        barcode: identifiers.barcode
      }
    );

    return NextResponse.json(
      { data: newThesis, message: 'Thèse créée avec succès' },
      { status: 201 }
    );
  } catch (error: unknown) {
    console.error('Error creating thesis:', error);
    await logError(error as Error, { 
      action: 'create_thesis',
      requestUrl: '/api/theses'
    });
    return NextResponse.json(
      { error: { code: 'CREATE_ERROR', message: 'Erreur lors de la création de la thèse' } },
      { status: 500 }
    );
  }
}

// PUT /api/theses - Mise à jour en lot (optionnel)
export async function PUT() {
  return NextResponse.json(
    { error: { code: 'NOT_IMPLEMENTED', message: 'Mise à jour en lot non implémentée' } },
    { status: 501 }
  );
}

// DELETE /api/theses - Suppression en lot (optionnel)
export async function DELETE() {
  return NextResponse.json(
    { error: { code: 'NOT_IMPLEMENTED', message: 'Suppression en lot non implémentée' } },
    { status: 501 }
  );
}
