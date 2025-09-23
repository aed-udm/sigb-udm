import { NextRequest, NextResponse } from 'next/server';
import { executeQuery } from '@/lib/mysql';
import { DocumentIdentifierService } from '@/lib/services/document-identifier-service';

// GET /api/academic-documents - Récupérer tous les documents académiques
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const search = searchParams.get('search') || '';
    const documentType = searchParams.get('type') || '';
    const specialty = searchParams.get('specialty') || '';
    const year = searchParams.get('year');

    // Utilisation du pool de connexions via executeQuery

    // Construire la requête avec filtres
    let whereConditions = [];
    let queryParams = [];

    if (search) {
      whereConditions.push('(title LIKE ? OR author LIKE ? OR supervisor LIKE ?)');
      queryParams.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    if (documentType && documentType !== 'all') {
      whereConditions.push('document_type = ?');
      queryParams.push(documentType);
    }

    if (specialty) {
      whereConditions.push('specialty = ?');
      queryParams.push(specialty);
    }

    if (year) {
      whereConditions.push('year = ?');
      queryParams.push(parseInt(year));
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    // Requête pour récupérer les documents depuis les tables réelles via la vue academic_documents
    const query = `
      SELECT
        id,
        title,
        author,
        supervisor,
        degree,
        specialty,
        year,
        defense_date,
        document_type,
        university,
        faculty,
        document_path,
        file_type,
        document_size,
        is_accessible,
        created_at
      FROM academic_documents
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `;

    const offset = (page - 1) * limit;
    const rows = await executeQuery(query, [...queryParams, limit, offset]);

    // Requête pour compter le total depuis les tables réelles
    const countQuery = `
      SELECT COUNT(*) as total
      FROM academic_documents
      ${whereClause}
    `;
    const countRows = await executeQuery(countQuery, queryParams);
    const total = (countRows as any)[0].total;

    // Traiter les données
    const documents = (rows as any[]).map(doc => ({
      ...doc,
      specialty: doc.specialty || undefined,
      university: doc.university || undefined,
      faculty: doc.faculty || undefined,
      document_path: doc.document_path || undefined,
      document_size: doc.document_size || undefined
    }));

    const response = {
      data: documents,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
        has_next: offset + limit < total,
        has_prev: page > 1
      }
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error fetching academic documents:', error);
    return NextResponse.json(
      { 
        error: { 
          code: 'FETCH_ERROR', 
          message: 'Erreur lors de la récupération des documents académiques',
          details: error instanceof Error ? error.message : 'Erreur inconnue'
        } 
      },
      { status: 500 }
    );
  }
}

// POST /api/academic-documents - Créer un nouveau document académique
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    console.log('📄 Données reçues pour création document académique:', {
      document_type: body.document_type,
      file_type: body.file_type || null,
      document_path: body.document_path || null,
      document_size: body.document_size || null
    });
    // Générer les identifiants complets pour le nouveau document
    let documentType: 'these' | 'memoire' | 'rapport_stage' = 'these';
    let year = new Date().getFullYear();

    // Déterminer le type et l'année selon le document
    switch (body.document_type) {
      case 'these':
        documentType = 'these';
        year = body.defense_year || body.year || year;
        break;
      case 'memoire':
        documentType = 'memoire';
        year = body.defense_year || body.year || year;
        break;
      case 'rapport_stage':
        documentType = 'rapport_stage';
        year = body.year ? parseInt(body.year.toString().split('-')[0]) : year;
        break;
    }

    const identifiers = await DocumentIdentifierService.generateCompleteIdentifier(
      documentType as any,
      year,
      {
        generateHandle: true,
        generateDOI: documentType === 'these'
      }
    );

    let insertQuery = '';
    let queryParams: any[] = [];

    // Construire la requête selon le type de document
    switch (body.document_type) {
      case 'these':
        insertQuery = `
          INSERT INTO theses (
            id, title, main_author, student_id, director, co_director, target_degree,
            specialty, defense_year, defense_date, university, faculty, department,
            pagination, summary, abstract, keywords, keywords_en,
            dewey_classification, cdu_classification, subject_headings,
            document_path, document_type, document_size,
            barcode, cames_id, local_id, handle, doi,
            created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
        `;
        queryParams = [
          identifiers.uuid,
          body.title || null,
          body.author || body.main_author || null,
          body.student_id || null,
          body.supervisor || body.director || null,
          body.co_supervisor || body.co_director || null,
          body.degree || body.target_degree || null,
          body.specialty || null,
          body.year || body.defense_year || null,
          body.defense_date || null,
          body.university || null,
          body.faculty || null,
          body.department || null,
          body.pagination || null,
          body.summary || null,
          body.abstract || null,
          body.keywords ? JSON.stringify(body.keywords) : null,
          body.keywords_en ? JSON.stringify(body.keywords_en) : null,
          body.dewey_classification || null,
          body.cdu_classification || null,
          body.subject_headings ? JSON.stringify(body.subject_headings) : null,
          body.document_path || null,
          body.file_type ? (body.file_type.includes('pdf') ? 'pdf' : body.file_type.includes('doc') ? 'doc' : 'docx') : null,
          body.document_size || null,
          identifiers.barcode,
          identifiers.cames_id,
          identifiers.local_id,
          identifiers.handle,
          identifiers.doi
        ];
        break;

      case 'memoire':
        insertQuery = `
          INSERT INTO memoires (
            id, title, main_author, student_id, supervisor, co_supervisor, degree_level,
            field_of_study, specialty, academic_year, defense_date, university, faculty,
            department, pagination, summary, keywords, methodology, conclusion,
            dewey_classification, cdu_classification, subject_headings,
            document_path, document_type, document_size,
            barcode, cames_id, local_id, handle
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;
        queryParams = [
          identifiers.uuid,
          body.title || 'Titre non spécifié',
          body.author || body.main_author || 'Auteur non spécifié',
          body.student_id || null,
          body.supervisor || 'Superviseur non spécifié',
          body.co_supervisor || null,
          body.degree || body.target_degree || 'Master 1',
          body.specialty || 'Informatique', // field_of_study requis
          body.specialty || null,
          body.academic_year || (body.year ? `${body.year}-${body.year + 1}` : null),
          body.defense_date || null,
          body.university || 'Université des Montagnes', // university requis
          body.faculty || 'Faculté des Sciences', // faculty requis
          body.department || null,
          body.pagination || null,
          body.summary || null,
          body.keywords ? JSON.stringify(body.keywords) : null,
          body.abstract || null, // methodology
          null, // conclusion
          body.dewey_classification || null,
          body.cdu_classification || null,
          body.subject_headings ? JSON.stringify(body.subject_headings) : null,
          body.document_path || null,
          body.file_type || null,
          body.document_size || null,
          identifiers.barcode,
          identifiers.cames_id,
          identifiers.local_id,
          identifiers.handle
        ];
        break;

      case 'rapport_stage':
        insertQuery = `
          INSERT INTO stage_reports (
            id, title, student_name, student_id, supervisor, company_name, stage_type,
            degree_level, field_of_study, specialty, academic_year,
            stage_start_date, stage_end_date, stage_duration, defense_date, university, faculty,
            department, pagination, summary, objectives, tasks_performed,
            skills_acquired, recommendations, keywords,
            dewey_classification, cdu_classification, subject_headings,
            document_path, document_type, document_size,
            barcode, cames_id, local_id, handle
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;
        queryParams = [
          identifiers.uuid,
          body.title || 'Titre non spécifié',
          body.author || body.main_author || 'Étudiant non spécifié',
          body.student_id || null,
          body.supervisor || 'Superviseur non spécifié',
          body.company_name || 'Entreprise non spécifiée', // company_name requis
          body.stage_type || 'Application', // stage_type requis
          body.degree || 'Licence 3', // degree_level requis
          body.specialty || 'Informatique', // field_of_study requis
          body.specialty || null,
          body.academic_year || (body.year ? `${body.year}-${body.year + 1}` : null),
          body.stage_start_date || (body.year ? `${body.year}-01-01` : '2024-01-01'), // stage_start_date requis
          body.stage_end_date || (body.year ? `${body.year}-06-30` : '2024-06-30'), // stage_end_date requis
          body.stage_duration || 180, // stage_duration en jours (6 mois)
          body.defense_date || null,
          body.university || 'Université des Montagnes', // university requis
          body.faculty || 'Faculté des Sciences', // faculty requis
          body.department || null,
          body.pagination || null,
          body.summary || null,
          body.abstract || null, // objectives
          null, // tasks_performed
          null, // skills_acquired
          null, // recommendations
          body.keywords ? JSON.stringify(body.keywords) : null,
          body.dewey_classification || null,
          body.cdu_classification || null,
          body.subject_headings ? JSON.stringify(body.subject_headings) : null,
          body.document_path || null,
          body.file_type ? body.file_type.includes('pdf') ? 'pdf' : body.file_type.includes('doc') ? 'doc' : 'docx' : null,
          body.document_size || null,
          identifiers.barcode,
          identifiers.cames_id,
          identifiers.local_id,
          identifiers.handle
        ];
        break;

      default:
        throw new Error('Type de document non valide');
    }

    await executeQuery(insertQuery, queryParams);

    return NextResponse.json(
      {
        data: {
          id: identifiers.uuid,
          barcode: identifiers.barcode,
          cames_id: identifiers.cames_id,
          local_id: identifiers.local_id,
          handle: identifiers.handle,
          doi: identifiers.doi,
          ...body
        },
        message: 'Document académique créé avec succès'
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating academic document:', error);
    return NextResponse.json(
      {
        error: {
          code: 'CREATE_ERROR',
          message: 'Erreur lors de la création du document académique',
          details: error instanceof Error ? error.message : 'Erreur inconnue'
        }
      },
      { status: 500 }
    );
  }
}

// PUT /api/academic-documents - Mise à jour en lot (optionnel)
export async function PUT() {
  return NextResponse.json(
    { error: { code: 'NOT_IMPLEMENTED', message: 'Mise à jour en lot non implémentée' } },
    { status: 501 }
  );
}

// DELETE /api/academic-documents - Suppression en lot (optionnel)
export async function DELETE() {
  return NextResponse.json(
    { error: { code: 'NOT_IMPLEMENTED', message: 'Suppression en lot non implémentée' } },
    { status: 501 }
  );
}
