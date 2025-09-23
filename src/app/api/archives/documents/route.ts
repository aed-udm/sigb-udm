/**
 * API Route: /api/archives/documents
 * Gestion des documents d'archives étudiants
 * Université des Montagnes - SIGB UdM
 */

import { NextRequest, NextResponse } from 'next/server';
import { executeQuery } from '@/lib/mysql';
import { v4 as uuidv4 } from 'uuid';
import { logLibraryOperation, logError } from '@/lib/system-logger';

// Interface pour les documents d'archives
interface ArchiveDocument {
  id: string;
  student_id: string;
  category: string;
  name: string;
  description?: string;
  file_type: string;
  file_size: number;
  document_path?: string;
  upload_date: string;
  created_at: string;
  updated_at: string;
}

// GET /api/archives/documents - Récupérer les documents d'archives
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const studentId = searchParams.get('student_id');
    const category = searchParams.get('category');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = (page - 1) * limit;

    // Construire la requête avec filtres (adaptation à la structure existante)
    let query = `
      SELECT
        id, student_id, category_id as category, title as name, description, file_type,
        file_size, file_path as document_path, upload_date, created_at, updated_at
      FROM archive_documents
      WHERE 1=1
    `;
    const params: any[] = [];

    if (studentId) {
      query += ' AND student_id = ?';
      params.push(studentId);
    }

    if (category) {
      query += ' AND category_id = ?';
      params.push(category);
    }

    query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const documents = await executeQuery(query, params) as ArchiveDocument[];

    // Compter le total pour la pagination
    let countQuery = 'SELECT COUNT(*) as total FROM archive_documents WHERE 1=1';
    const countParams: any[] = [];

    if (studentId) {
      countQuery += ' AND student_id = ?';
      countParams.push(studentId);
    }

    if (category) {
      countQuery += ' AND category_id = ?';
      countParams.push(category);
    }

    const [countResult] = await executeQuery(countQuery, countParams) as Array<{ total: number }>;
    const total = countResult?.total || 0;

    return NextResponse.json({
      success: true,
      data: documents,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
        has_next: offset + limit < total,
        has_prev: page > 1
      }
    });

  } catch (error: unknown) {
    console.error('Error fetching archive documents:', error);
    await logError(error as Error, {
      action: 'fetch_archive_documents',
      requestUrl: '/api/archives/documents'
    });

    return NextResponse.json(
      { error: { code: 'FETCH_ERROR', message: 'Erreur lors de la récupération des documents' } },
      { status: 500 }
    );
  }
}

// POST /api/archives/documents - Créer un nouveau document d'archive
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validation des données requises
    if (!body.student_id || !body.category || !body.name) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'Données manquantes: student_id, category et name sont requis' } },
        { status: 400 }
      );
    }

    // Vérifier que l'étudiant existe (adaptation à la structure existante)
    const students = await executeQuery(
      'SELECT id FROM users WHERE id = ? AND user_category = "student"',
      [body.student_id]
    ) as Array<{ id: string }>;

    if (students.length === 0) {
      return NextResponse.json(
        { error: { code: 'STUDENT_NOT_FOUND', message: 'Étudiant non trouvé' } },
        { status: 404 }
      );
    }

    // Générer un UUID pour le nouveau document
    const documentId = uuidv4();
    const now = new Date().toISOString();

    // Créer le document dans la base de données (adaptation à la structure existante)
    await executeQuery(
      `INSERT INTO archive_documents (
        id, student_id, category_id, title, description, file_type,
        file_size, file_path, upload_date, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        documentId,
        body.student_id,
        body.category,
        body.name,
        body.description || null,
        body.file_type || 'unknown',
        body.file_size || 0,
        body.document_path || null,
        body.upload_date || now,
        now,
        now
      ]
    );

    // Récupérer le document créé
    const [newDocument] = await executeQuery(
      'SELECT * FROM archive_documents WHERE id = ?',
      [documentId]
    ) as ArchiveDocument[];

    // Logger l'opération (utiliser un type existant)
    await logLibraryOperation(
      'reservation_created', // Utiliser un type existant temporairement
      body.student_id,
      documentId,
      {
        category: body.category,
        documentName: body.name,
        fileType: body.file_type,
        action: 'archive_document_created'
      }
    );

    return NextResponse.json(
      { 
        success: true,
        data: newDocument, 
        message: 'Document d\'archive créé avec succès' 
      },
      { status: 201 }
    );

  } catch (error: unknown) {
    console.error('Error creating archive document:', error);
    await logError(error as Error, {
      action: 'create_archive_document',
      requestUrl: '/api/archives/documents'
    });

    return NextResponse.json(
      { error: { code: 'CREATE_ERROR', message: 'Erreur lors de la création du document' } },
      { status: 500 }
    );
  }
}

// PUT /api/archives/documents - Mettre à jour un document (utilisé par l'API individuelle)
export async function PUT(_request: NextRequest) {
  return NextResponse.json(
    { error: { code: 'METHOD_NOT_ALLOWED', message: 'Utilisez /api/archives/documents/[id] pour mettre à jour un document' } },
    { status: 405 }
  );
}

// DELETE /api/archives/documents - Supprimer des documents (utilisé par l'API individuelle)
export async function DELETE(_request: NextRequest) {
  return NextResponse.json(
    { error: { code: 'METHOD_NOT_ALLOWED', message: 'Utilisez /api/archives/documents/[id] pour supprimer un document' } },
    { status: 405 }
  );
}
