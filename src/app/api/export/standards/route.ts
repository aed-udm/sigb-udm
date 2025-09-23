import { NextRequest, NextResponse } from 'next/server';
import { DublinCoreService } from '@/lib/standards/dublin-core';
import { MARC21Service } from '@/lib/standards/marc21';
import mysql from 'mysql2/promise';

// Configuration de la base de données
const dbConfig = {
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'bibliotheque_cameroun',
  charset: 'utf8mb4',
  connectTimeout: 60000,
};

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const format = searchParams.get('format');
    const documentId = searchParams.get('documentId');
    const documentType = searchParams.get('documentType') || searchParams.get('type') || 'all';
    const limit = parseInt(searchParams.get('limit') || '50');

    if (!format) {
      return NextResponse.json({ error: 'Format requis (dublin-core-xml, dublin-core-json, marc21-xml, marc21-json)' }, { status: 400 });
    }

    // Connexion à la base de données
    const connection = await mysql.createConnection(dbConfig);

    try {
      let documents: any[] = [];

      // Si un document spécifique est demandé
      if (documentId) {
        const document = await getDocumentById(connection, documentId, documentType);
        if (document) {
          documents = [document];
        }
      } else {
        // Récupérer tous les documents conformes
        documents = await getAllCompliantDocuments(connection, documentType, limit);
      }

      if (documents.length === 0) {
        await connection.end();
        return NextResponse.json({ error: 'Aucun document trouvé' }, { status: 404 });
      }

      // Traitement selon le format demandé
      let result: any;
      const dublinCoreService = new DublinCoreService();
      const marc21Service = new MARC21Service();

      switch (format) {
        case 'dublin-core-xml':
          if (documents.length === 1) {
            result = dublinCoreService.exportToXML(documents[0]);
            await connection.end();
            return new NextResponse(result, {
              headers: {
                'Content-Type': 'application/xml',
                'Content-Disposition': `attachment; filename="dublin-core-${documents[0].id}.xml"`
              }
            });
          } else {
            // Export multiple documents - Structure XML correcte
            const xmlDocs = documents.map(doc => {
              const xml = dublinCoreService.exportToXML(doc);
              // Retirer la déclaration XML et ajouter l'indentation
              return xml.replace(/^<\?xml.*?\?>\n/, '').replace(/^/gm, '  ');
            }).join('\n\n');

            result = `<?xml version="1.0" encoding="UTF-8"?>\n<collection xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/">\n${xmlDocs}\n</collection>`;
            await connection.end();
            return new NextResponse(result, {
              headers: {
                'Content-Type': 'application/xml',
                'Content-Disposition': 'attachment; filename="dublin-core-collection.xml"'
              }
            });
          }

        case 'dublin-core-json':
          result = documents.length === 1 ?
            dublinCoreService.exportToJSON(documents[0]) :
            { collection: documents.map(doc => dublinCoreService.exportToJSON(doc)) };
          await connection.end();
          return NextResponse.json(result);

        case 'marc21-xml':
          if (documents.length === 1) {
            result = marc21Service.exportToXML(documents[0]);
            await connection.end();
            return new NextResponse(result, {
              headers: {
                'Content-Type': 'application/xml',
                'Content-Disposition': `attachment; filename="marc21-${documents[0].id}.xml"`
              }
            });
          } else {
            // Export multiple documents - Structure XML correcte
            const xmlDocs = documents.map(doc => {
              const xml = marc21Service.exportToXML(doc);
              // Retirer la déclaration XML et ajouter l'indentation
              return xml.replace(/^<\?xml.*?\?>\n/, '').replace(/^/gm, '  ');
            }).join('\n\n');

            result = `<?xml version="1.0" encoding="UTF-8"?>\n<collection xmlns="http://www.loc.gov/MARC21/slim">\n${xmlDocs}\n</collection>`;
            await connection.end();
            return new NextResponse(result, {
              headers: {
                'Content-Type': 'application/xml',
                'Content-Disposition': 'attachment; filename="marc21-collection.xml"'
              }
            });
          }

        case 'marc21-json':
          result = documents.length === 1 ?
            marc21Service.exportToJSON(documents[0]) :
            { collection: documents.map(doc => marc21Service.exportToJSON(doc)) };
          await connection.end();
          return NextResponse.json(result);

        default:
          await connection.end();
          return NextResponse.json({ error: 'Format non supporté' }, { status: 400 });
      }
    } catch (error) {
      console.error('Erreur lors de l\'export des standards:', error);
      return NextResponse.json({ error: 'Erreur interne du serveur' }, { status: 500 });
    }
  } catch (error) {
    console.error('Erreur lors de la récupération des documents conformes:', error);
    return NextResponse.json({ error: 'Erreur interne du serveur' }, { status: 500 });
  }
}

// Fonction pour récupérer un document spécifique par ID
async function getDocumentById(connection: mysql.Connection, documentId: string, documentType: string): Promise<any | null> {
  try {
    let query = '';

    // Déterminer la table selon le type de document
    if (documentType === 'thesis' || documentType === 'all') {
      query = `
        SELECT
          id, title, main_author as author, director, co_director, target_degree as degree,
          specialty, defense_year as year, defense_date, university, faculty,
          summary, abstract, keywords, keywords_en, document_path, document_type,
          document_size, language, dewey_classification, cdu_classification,
          subject_headings, created_at, updated_at,
          'thesis' as doc_type
        FROM theses WHERE id = ?
      `;
    } else if (documentType === 'memoir') {
      query = `
        SELECT
          id, title, main_author as author, supervisor, co_supervisor, degree_level as degree,
          specialty, field_of_study, academic_year, defense_date, university, faculty,
          summary, abstract, keywords, keywords_en, document_path, document_type,
          document_size, language, dewey_classification, cdu_classification,
          subject_headings, created_at, updated_at,
          'memoir' as doc_type
        FROM memoires WHERE id = ?
      `;
    } else if (documentType === 'report') {
      query = `
        SELECT
          id, title, student_name as author, supervisor, company_supervisor, degree_level as degree,
          specialty, field_of_study, academic_year, university, faculty,
          summary, abstract, keywords, keywords_en, document_path, document_type,
          document_size, language, dewey_classification, cdu_classification,
          subject_headings, created_at, updated_at,
          'report' as doc_type
        FROM stage_reports WHERE id = ?
      `;
    }

    if (!query) {
      return null;
    }

    const [rows] = await connection.execute(query, [documentId]);
    const documents = rows as any[];

    if (documents.length === 0) {
      return null;
    }

    return normalizeDocument(documents[0]);
  } catch (error) {
    console.error('Erreur lors de la récupération du document:', error);
    return null;
  }
}

// Fonction pour récupérer tous les documents conformes
async function getAllCompliantDocuments(connection: mysql.Connection, documentType: string, limit: number): Promise<any[]> {
  try {
    const documents: any[] = [];

    // Récupérer les thèses si demandé
    if (documentType === 'all' || documentType === 'academic' || documentType === 'thesis') {
      const [thesesRows] = await connection.execute(`
        SELECT
          id, title, main_author as author, director, co_director, target_degree as degree,
          specialty, defense_year as year, defense_date, university, faculty,
          summary, abstract, keywords, keywords_en, document_path, document_type,
          document_size, language, dewey_classification, cdu_classification,
          subject_headings, created_at, updated_at,
          'thesis' as doc_type
        FROM theses
        WHERE title IS NOT NULL
          AND main_author IS NOT NULL
        ORDER BY created_at DESC
        LIMIT ?
      `, [limit]);

      for (const row of thesesRows as any[]) {
        documents.push(normalizeDocument(row));
      }
    }

    // Récupérer les mémoires si demandé
    if (documentType === 'all' || documentType === 'academic' || documentType === 'memoir') {
      const [memoiresRows] = await connection.execute(`
        SELECT
          id, title, main_author as author, supervisor, co_supervisor, degree_level as degree,
          specialty, field_of_study, academic_year, defense_date, university, faculty,
          summary, abstract, keywords, keywords_en, document_path, document_type,
          document_size, language, dewey_classification, cdu_classification,
          subject_headings, created_at, updated_at,
          'memoir' as doc_type
        FROM memoires
        WHERE title IS NOT NULL
          AND main_author IS NOT NULL
        ORDER BY created_at DESC
        LIMIT ?
      `, [limit]);

      for (const row of memoiresRows as any[]) {
        documents.push(normalizeDocument(row));
      }
    }

    // Récupérer les rapports de stage si demandé
    if (documentType === 'all' || documentType === 'academic' || documentType === 'report') {
      const [reportsRows] = await connection.execute(`
        SELECT
          id, title, student_name as author, supervisor, company_supervisor, degree_level as degree,
          specialty, field_of_study, academic_year, university, faculty,
          summary, abstract, keywords, keywords_en, document_path, document_type,
          document_size, language, dewey_classification, cdu_classification,
          subject_headings, created_at, updated_at,
          'report' as doc_type
        FROM stage_reports
        WHERE title IS NOT NULL
          AND student_name IS NOT NULL
        ORDER BY created_at DESC
        LIMIT ?
      `, [limit]);

      for (const row of reportsRows as any[]) {
        documents.push(normalizeDocument(row));
      }
    }

    // Récupérer les livres si demandé (SEULEMENT pour 'all' ou 'book', PAS pour 'academic')
    if (documentType === 'all' || documentType === 'book') {
      const [booksRows] = await connection.execute(`
        SELECT
          id, title, main_author, secondary_author, publisher, publication_year,
          publication_city, domain, summary, abstract, keywords, keywords_en,
          dewey_classification, cdu_classification, subject_headings, language,
          isbn, edition, collection, created_at, updated_at, 'book' as doc_type
        FROM books
        WHERE title IS NOT NULL
          AND main_author IS NOT NULL
        ORDER BY created_at DESC
        LIMIT ?
      `, [limit]);

      for (const row of booksRows as any[]) {
        documents.push(normalizeDocument(row));
      }
    }

    return documents.slice(0, limit);
  } catch (error) {
    console.error('Erreur lors de la récupération des documents conformes:', error);
    return [];
  }
}

// Fonction pour normaliser les données des documents
function normalizeDocument(doc: any): any {
  // Pour les livres, préserver les données originales
  if (doc.doc_type === 'book') {
    return {
      id: doc.id,
      title: doc.title || 'Titre non spécifié',
      main_author: doc.main_author || 'Auteur non spécifié',
      secondary_author: doc.secondary_author || '',
      publisher: doc.publisher || 'Éditeur non spécifié',
      publication_year: doc.publication_year || new Date().getFullYear(),
      publication_city: doc.publication_city || 'Ville non spécifiée',
      language: doc.language || 'fr',
      domain: doc.domain || 'Non spécifié',
      summary: doc.summary || doc.abstract || 'Résumé non disponible',
      abstract: doc.abstract || '',
      keywords: doc.keywords ? (typeof doc.keywords === 'string' ? JSON.parse(doc.keywords) : doc.keywords) : [],
      isbn: doc.isbn || '',
      edition: doc.edition || '',
      collection: doc.collection || '',
      type: 'book',
      format: 'text',
      identifier: doc.isbn || doc.id,
      coverage: 'Cameroun',
      rights: 'Tous droits réservés',
      created_at: doc.created_at,
      updated_at: doc.updated_at,
      dewey_classification: doc.dewey_classification,
      cdu_classification: doc.cdu_classification,
      subject_headings: doc.subject_headings
    };
  }

  // Pour les documents académiques (thèses, mémoires, rapports)
  return {
    id: doc.id,
    title: doc.title || 'Titre non spécifié',
    main_author: doc.author || 'Auteur non spécifié',
    secondary_author: doc.director || doc.supervisor || '',
    co_author: doc.co_director || doc.co_supervisor || doc.company_supervisor || '',
    publisher: doc.university || 'Université des Montagnes',
    publication_year: doc.year || doc.academic_year?.split('-')[0] || new Date().getFullYear().toString(),
    publication_city: 'Bangangté',
    language: doc.language || 'fr',
    domain: doc.specialty || doc.field_of_study || 'Non spécifié',
    summary: doc.summary || doc.abstract || 'Résumé non disponible',
    keywords: doc.keywords ? (typeof doc.keywords === 'string' ? JSON.parse(doc.keywords) : doc.keywords) : [],
    type: doc.doc_type || 'document',
    format: 'text',
    identifier: doc.id,
    source: doc.university || 'Université des Montagnes',
    relation: `Collection ${doc.doc_type}s UdM`,
    coverage: 'Cameroun',
    rights: 'Usage académique uniquement',
    created_at: doc.created_at,
    updated_at: doc.updated_at,
    defense_date: doc.defense_date,
    university: doc.university,
    faculty: doc.faculty,
    degree: doc.degree,
    document_path: doc.document_path,
    document_type: doc.document_type,
    document_size: doc.document_size,
    dewey_classification: doc.dewey_classification,
    cdu_classification: doc.cdu_classification,
    subject_headings: doc.subject_headings
  };
}