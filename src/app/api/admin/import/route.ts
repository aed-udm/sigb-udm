import { NextRequest, NextResponse } from 'next/server';
import { executeQuery } from '@/lib/mysql';
import * as XLSX from 'xlsx';
import { randomUUID } from 'crypto';

interface ImportError {
  row: number;
  field: string;
  message: string;
  data: any;
}

interface ImportResult {
  success: boolean;
  total: number;
  imported: number;
  errors: ImportError[];
  duplicates: number;
  message: string;
}

// GET /api/admin/import - Informations sur l'API d'import
export async function GET(request: NextRequest) {
  try {
    return NextResponse.json({
      success: true,
      service: 'Admin Import API',
      description: 'API d\'importation en masse de documents',
      version: '1.0',
      supported_formats: ['xlsx', 'csv'],
      supported_document_types: ['book', 'these', 'memoire', 'rapport_stage'],
      usage: {
        endpoint: '/api/admin/import',
        method: 'POST',
        content_type: 'multipart/form-data',
        required_fields: {
          file: 'Fichier Excel ou CSV à importer',
          document_type: 'Type de document (book, these, memoire, rapport_stage)'
        },
        optional_fields: {
          preview_only: 'true/false - Aperçu uniquement sans import',
          column_mapping: 'JSON de mapping des colonnes'
        }
      },
      column_mappings: {
        book: ['title', 'main_author', 'isbn', 'publisher', 'publication_year', 'pages', 'domain', 'keywords', 'summary'],
        these: ['title', 'main_author', 'director', 'target_degree', 'specialty', 'defense_year', 'university', 'faculty'],
        memoire: ['title', 'main_author', 'supervisor', 'degree_level', 'specialty', 'defense_date', 'university', 'faculty'],
        rapport_stage: ['title', 'student_name', 'supervisor', 'company', 'degree_level', 'specialty', 'defense_date', 'university']
      },
      authentication: {
        required: true,
        note: 'Cette API nécessite une authentification administrateur'
      }
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des informations d\'import' },
      { status: 500 }
    );
  }
}

// POST /api/admin/import - Importer des documents en masse
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const documentType = formData.get('document_type') as string;
    const previewOnly = formData.get('preview_only') === 'true';
    const columnMappingStr = formData.get('column_mapping') as string;

    if (!file) {
      return NextResponse.json(
        { error: 'Aucun fichier fourni' },
        { status: 400 }
      );
    }

    if (!['book', 'these', 'memoire', 'rapport_stage'].includes(documentType)) {
      return NextResponse.json(
        { error: 'Type de document invalide' },
        { status: 400 }
      );
    }

    // Lire le fichier
    const buffer = await file.arrayBuffer();
    let data: any[] = [];
    let headers: string[] = [];

    try {
      if (file.name.endsWith('.csv')) {
        // Parser CSV
        const text = new TextDecoder().decode(buffer);
        const lines = text.split('\n').filter(line => line.trim());
        
        if (lines.length === 0) {
          return NextResponse.json(
            { error: 'Fichier CSV vide' },
            { status: 400 }
          );
        }

        headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
        
        for (let i = 1; i < lines.length; i++) {
          const values = lines[i].split(',').map(v => v.trim().replace(/"/g, ''));
          const row: any = {};
          headers.forEach((header, index) => {
            row[header] = values[index] || '';
          });
          data.push(row);
        }
      } else if (file.name.endsWith('.xlsx')) {
        // Parser Excel
        const workbook = XLSX.read(buffer, { type: 'buffer' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];
        
        if (jsonData.length === 0) {
          return NextResponse.json(
            { error: 'Fichier Excel vide' },
            { status: 400 }
          );
        }

        headers = jsonData[0].map((h: any) => String(h).trim());
        
        for (let i = 1; i < jsonData.length; i++) {
          const row: any = {};
          headers.forEach((header, index) => {
            row[header] = jsonData[i][index] ? String(jsonData[i][index]).trim() : '';
          });
          data.push(row);
        }
      } else {
        return NextResponse.json(
          { error: 'Format de fichier non supporté' },
          { status: 400 }
        );
      }
    } catch (parseError) {
      console.error('Erreur de parsing:', parseError);
      return NextResponse.json(
        { error: 'Erreur lors de la lecture du fichier. Vérifiez le format.' },
        { status: 400 }
      );
    }

    // Mode prévisualisation
    if (previewOnly) {
      return NextResponse.json({
        preview: data.slice(0, 10), // Première 10 lignes pour la prévisualisation
        headers,
        total: data.length,
        message: `${data.length} lignes détectées`
      });
    }

    // Mode import complet
    if (!columnMappingStr) {
      return NextResponse.json(
        { error: 'Mapping des colonnes requis' },
        { status: 400 }
      );
    }

    const columnMapping = JSON.parse(columnMappingStr);
    const errors: ImportError[] = [];
    let imported = 0;
    let duplicates = 0;

    // Définir les champs requis selon le type
    const requiredFields = {
      book: ['mfn', 'title', 'main_author', 'total_copies'],
      these: ['title', 'main_author', 'director', 'target_degree', 'defense_year'],
      memoire: ['title', 'main_author', 'director', 'target_degree', 'defense_year'],
      rapport_stage: ['title', 'main_author', 'director', 'target_degree', 'defense_year']
    };

    const fields = requiredFields[documentType as keyof typeof requiredFields];

    // Traiter chaque ligne
    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      const rowNumber = i + 2; // +2 car ligne 1 = headers, et index commence à 0

      try {
        // Mapper les données selon le mapping des colonnes
        const mappedData: any = {};
        let hasRequiredFields = true;

        for (const field of fields) {
          const columnName = columnMapping[field];
          if (!columnName || !row[columnName]) {
            if (field !== 'total_copies' || documentType !== 'book') { // total_copies optionnel pour les livres
              errors.push({
                row: rowNumber,
                field,
                message: `Champ requis manquant: ${field}`,
                data: row
              });
              hasRequiredFields = false;
            }
          } else {
            mappedData[field] = row[columnName];
          }
        }

        if (!hasRequiredFields) {
          continue;
        }

        // Validation spécifique selon le type
        if (documentType === 'book') {
          // Vérifier les doublons par MFN
          if (mappedData.mfn) {
            const existingBooks = await executeQuery(
              'SELECT id FROM books WHERE mfn = ?',
              [mappedData.mfn]
            );

            if (existingBooks.length > 0) {
              duplicates++;
              errors.push({
                row: rowNumber,
                field: 'mfn',
                message: `Livre avec MFN ${mappedData.mfn} existe déjà`,
                data: row
              });
              continue;
            }
          }

          // Valider l'année de publication
          if (mappedData.publication_year) {
            const pubYear = parseInt(mappedData.publication_year);
            if (isNaN(pubYear) || pubYear < 1000 || pubYear > new Date().getFullYear()) {
              errors.push({
                row: rowNumber,
                field: 'publication_year',
                message: `Année de publication invalide: ${mappedData.publication_year}`,
                data: row
              });
              continue;
            }
            mappedData.publication_year = pubYear;
          }

          // Valider le nombre d'exemplaires
          const totalCopies = mappedData.total_copies ? parseInt(mappedData.total_copies) : 1;
          if (isNaN(totalCopies) || totalCopies < 1) {
            mappedData.total_copies = 1;
          } else {
            mappedData.total_copies = totalCopies;
          }

          // Valider les exemplaires disponibles
          const availableCopies = mappedData.available_copies ? parseInt(mappedData.available_copies) : totalCopies;
          if (isNaN(availableCopies) || availableCopies < 0 || availableCopies > totalCopies) {
            mappedData.available_copies = totalCopies;
          } else {
            mappedData.available_copies = availableCopies;
          }

          // Générer un UUID pour le livre
          const bookId = randomUUID();

          // Insérer le livre
          await executeQuery(
            `INSERT INTO books (
              id, mfn, title, subtitle, parallel_title, main_author, secondary_author,
              edition, publication_city, publisher, publication_year, acquisition_mode,
              price, domain, collection, summary, keywords, total_copies, available_copies,
              created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
            [
              bookId,
              mappedData.mfn,
              mappedData.title,
              mappedData.subtitle || null,
              mappedData.parallel_title || null,
              mappedData.main_author,
              mappedData.secondary_author || null,
              mappedData.edition || null,
              mappedData.publication_city || null,
              mappedData.publisher || null,
              mappedData.publication_year || null,
              mappedData.acquisition_mode || null,
              mappedData.price ? parseFloat(mappedData.price) : null,
              mappedData.domain || null,
              mappedData.collection || null,
              mappedData.summary || null,
              mappedData.keywords ? JSON.stringify(mappedData.keywords.split(',').map((k: string) => k.trim())) : null,
              mappedData.total_copies,
              mappedData.available_copies
            ]
          );

        } else {
          // Pour les documents académiques
          const tableName = documentType === 'these' ? 'theses' :
                           documentType === 'memoire' ? 'memoires' : 'stage_reports';

          // Vérifier les doublons par titre + auteur
          const existingDocs = await executeQuery(
            `SELECT id FROM ${tableName} WHERE title = ? AND main_author = ?`,
            [mappedData.title, mappedData.main_author]
          );

          if (existingDocs.length > 0) {
            duplicates++;
            errors.push({
              row: rowNumber,
              field: 'title',
              message: `Document "${mappedData.title}" par ${mappedData.main_author} existe déjà`,
              data: row
            });
            continue;
          }

          // Valider l'année de soutenance
          const year = parseInt(mappedData.defense_year);
          if (isNaN(year) || year < 1900 || year > new Date().getFullYear()) {
            errors.push({
              row: rowNumber,
              field: 'defense_year',
              message: `Année de soutenance invalide: ${mappedData.defense_year}`,
              data: row
            });
            continue;
          }

          // Générer un UUID pour le document
          const docId = randomUUID();

          // Insérer le document académique
          if (documentType === 'these') {
            await executeQuery(
              `INSERT INTO theses (
                id, main_author, director, co_director, title, target_degree, specialty,
                defense_year, university, faculty, department, pagination, summary,
                keywords, abstract, keywords_en, created_at, updated_at
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
              [
                docId,
                mappedData.main_author,
                mappedData.director,
                mappedData.co_director || null,
                mappedData.title,
                mappedData.target_degree,
                mappedData.specialty || null,
                year,
                mappedData.university || null,
                mappedData.faculty || null,
                mappedData.department || null,
                mappedData.pagination || null,
                mappedData.summary || null,
                mappedData.keywords ? JSON.stringify(mappedData.keywords.split(',').map((k: string) => k.trim())) : null,
                mappedData.abstract || null,
                mappedData.keywords_en ? JSON.stringify(mappedData.keywords_en.split(',').map((k: string) => k.trim())) : null
              ]
            );
          } else if (documentType === 'memoire') {
            await executeQuery(
              `INSERT INTO memoires (
                id, main_author, director, co_director, title, target_degree, specialty,
                defense_year, university, faculty, department, pagination, summary,
                keywords, abstract, keywords_en, created_at, updated_at
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
              [
                docId,
                mappedData.main_author,
                mappedData.director,
                mappedData.co_director || null,
                mappedData.title,
                mappedData.target_degree,
                mappedData.specialty || null,
                year,
                mappedData.university || null,
                mappedData.faculty || null,
                mappedData.department || null,
                mappedData.pagination || null,
                mappedData.summary || null,
                mappedData.keywords ? JSON.stringify(mappedData.keywords.split(',').map((k: string) => k.trim())) : null,
                mappedData.abstract || null,
                mappedData.keywords_en ? JSON.stringify(mappedData.keywords_en.split(',').map((k: string) => k.trim())) : null
              ]
            );
          } else if (documentType === 'rapport_stage') {
            await executeQuery(
              `INSERT INTO stage_reports (
                id, main_author, director, co_director, title, target_degree, specialty,
                defense_year, university, faculty, department, pagination, summary,
                keywords, abstract, keywords_en, created_at, updated_at
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
              [
                docId,
                mappedData.main_author,
                mappedData.director,
                mappedData.co_director || null,
                mappedData.title,
                mappedData.target_degree,
                mappedData.specialty || null,
                year,
                mappedData.university || null,
                mappedData.faculty || null,
                mappedData.department || null,
                mappedData.pagination || null,
                mappedData.summary || null,
                mappedData.keywords ? JSON.stringify(mappedData.keywords.split(',').map((k: string) => k.trim())) : null,
                mappedData.abstract || null,
                mappedData.keywords_en ? JSON.stringify(mappedData.keywords_en.split(',').map((k: string) => k.trim())) : null
              ]
            );
          }
        }

        imported++;

      } catch (error) {
        console.error(`Erreur ligne ${rowNumber}:`, error);
        errors.push({
          row: rowNumber,
          field: 'general',
          message: `Erreur lors de l'insertion: ${error instanceof Error ? error.message : 'Erreur inconnue'}`,
          data: row
        });
      }
    }

    const result: ImportResult = {
      success: imported > 0,
      total: data.length,
      imported,
      errors,
      duplicates,
      message: `Import terminé: ${imported}/${data.length} documents importés avec succès`
    };

    return NextResponse.json(result);

  } catch (error) {
    console.error('Erreur lors de l\'import:', error);
    return NextResponse.json(
      { error: 'Erreur serveur lors de l\'import' },
      { status: 500 }
    );
  }
}
