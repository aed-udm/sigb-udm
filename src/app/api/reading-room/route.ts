/**
 * API pour la gestion des consultations sur place - SIGB UdM
 * Permet aux usagers de consulter des documents en salle de lecture
 */

import { NextRequest, NextResponse } from 'next/server';
import { executeQuery } from '@/lib/mysql';
import { v4 as uuidv4 } from 'uuid';

interface ReadingRoomConsultation {
  id: string;
  user_id: string;
  book_id?: string;
  academic_document_id?: string;
  document_type: 'book' | 'these' | 'memoire' | 'rapport_stage';
  consultation_date: string;
  start_time: string;
  end_time?: string;
  status: 'active' | 'completed' | 'cancelled';
  reading_location: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

// GET /api/reading-room - Récupérer les consultations sur place
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const userId = searchParams.get('user_id');
    const date = searchParams.get('date');
    const documentType = searchParams.get('document_type');

    let query = `
      SELECT 
        rc.*,
        u.full_name as user_name,
        u.email as user_email,
        u.matricule as user_barcode,
        CASE 
          WHEN rc.document_type = 'book' THEN b.title
          WHEN rc.document_type = 'these' THEN t.title
          WHEN rc.document_type = 'memoire' THEN m.title
          WHEN rc.document_type = 'rapport_stage' THEN sr.title
        END as document_title,
        CASE 
          WHEN rc.document_type = 'book' THEN b.main_author
          WHEN rc.document_type = 'these' THEN t.main_author
          WHEN rc.document_type = 'memoire' THEN m.student_name
          WHEN rc.document_type = 'rapport_stage' THEN sr.student_name
        END as document_author,
        CASE 
          WHEN rc.document_type = 'book' THEN b.mfn
          ELSE NULL
        END as document_mfn
      FROM reading_room_consultations rc
      LEFT JOIN users u ON rc.user_id = u.id
      LEFT JOIN books b ON rc.book_id = b.id AND rc.document_type = 'book'
      LEFT JOIN theses t ON rc.academic_document_id = t.id AND rc.document_type = 'these'
      LEFT JOIN memoires m ON rc.academic_document_id = m.id AND rc.document_type = 'memoire'
      LEFT JOIN stage_reports sr ON rc.academic_document_id = sr.id AND rc.document_type = 'rapport_stage'
      WHERE 1=1
    `;

    const queryParams: any[] = [];

    if (status) {
      query += ' AND rc.status = ?';
      queryParams.push(status);
    }

    if (userId) {
      query += ' AND rc.user_id = ?';
      queryParams.push(userId);
    }

    if (date) {
      query += ' AND rc.consultation_date = ?';
      queryParams.push(date);
    }

    if (documentType) {
      query += ' AND rc.document_type = ?';
      queryParams.push(documentType);
    }

    query += ' ORDER BY rc.consultation_date DESC, rc.start_time DESC';

    const consultations = await executeQuery(query, queryParams);

    return NextResponse.json({
      success: true,
      data: consultations
    });

  } catch (error) {
    console.error('Erreur lors de la récupération des consultations:', error);
    return NextResponse.json(
      { 
        error: { 
          code: 'FETCH_ERROR', 
          message: 'Erreur lors de la récupération des consultations',
          details: error instanceof Error ? error.message : 'Erreur inconnue'
        } 
      },
      { status: 500 }
    );
  }
}

// POST /api/reading-room - Créer une nouvelle consultation sur place
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      user_id,
      book_id,
      academic_document_id,
      document_type = 'book',
      reading_location = 'Salle de lecture principale',
      notes
    } = body;

    // Validation des données
    if (!user_id) {
      return NextResponse.json(
        { error: { code: 'MISSING_USER', message: 'ID utilisateur requis' } },
        { status: 400 }
      );
    }

    if (!book_id && !academic_document_id) {
      return NextResponse.json(
        { error: { code: 'MISSING_DOCUMENT', message: 'ID du document requis' } },
        { status: 400 }
      );
    }

    // Vérifier que l'utilisateur existe et est actif
    const users = await executeQuery(
      'SELECT id, full_name, is_active FROM users WHERE id = ?',
      [user_id]
    ) as Array<{ id: string; full_name: string; is_active: boolean }>;

    if (users.length === 0) {
      return NextResponse.json(
        { error: { code: 'USER_NOT_FOUND', message: 'Utilisateur non trouvé' } },
        { status: 404 }
      );
    }

    if (!users[0].is_active) {
      return NextResponse.json(
        { error: { code: 'USER_INACTIVE', message: 'Compte utilisateur inactif' } },
        { status: 403 }
      );
    }

    // Vérifier que le document existe et est disponible
    let documentExists = false;
    let documentTitle = '';

    if (document_type === 'book' && book_id) {
      const books = await executeQuery(
        'SELECT id, title, available_copies FROM books WHERE id = ?',
        [book_id]
      ) as Array<{ id: string; title: string; available_copies: number }>;

      if (books.length > 0) {
        documentExists = true;
        documentTitle = books[0].title;
        
        // Pour la consultation sur place, on ne vérifie pas la disponibilité stricte
        // car le document reste dans la bibliothèque
      }
    } else if (academic_document_id) {
      let table = '';
      switch (document_type) {
        case 'these': table = 'theses'; break;
        case 'memoire': table = 'memoires'; break;
        case 'rapport_stage': table = 'stage_reports'; break;
        default: 
          return NextResponse.json(
            { error: { code: 'INVALID_DOCUMENT_TYPE', message: 'Type de document invalide' } },
            { status: 400 }
          );
      }

      const docs = await executeQuery(
        `SELECT id, title FROM ${table} WHERE id = ?`,
        [academic_document_id]
      ) as Array<{ id: string; title: string }>;

      if (docs.length > 0) {
        documentExists = true;
        documentTitle = docs[0].title;
      }
    }

    if (!documentExists) {
      return NextResponse.json(
        { error: { code: 'DOCUMENT_NOT_FOUND', message: 'Document non trouvé' } },
        { status: 404 }
      );
    }

    // Vérifier qu'il n'y a pas déjà une consultation active pour ce document par cet utilisateur
    const activeConsultations = await executeQuery(
      `SELECT id FROM reading_room_consultations 
       WHERE user_id = ? AND status = 'active' 
       AND (book_id = ? OR academic_document_id = ?)`,
      [user_id, book_id || null, academic_document_id || null]
    );

    if (activeConsultations.length > 0) {
      return NextResponse.json(
        { error: { code: 'CONSULTATION_ALREADY_ACTIVE', message: 'Une consultation est déjà en cours pour ce document' } },
        { status: 409 }
      );
    }

    // Créer la consultation
    const consultationId = uuidv4();
    const currentDate = new Date().toISOString().split('T')[0];
    const currentTime = new Date().toTimeString().split(' ')[0];

    await executeQuery(
      `INSERT INTO reading_room_consultations 
       (id, user_id, book_id, academic_document_id, document_type, 
        consultation_date, start_time, status, reading_location, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'active', ?, ?)`,
      [
        consultationId,
        user_id,
        book_id || null,
        academic_document_id || null,
        document_type,
        currentDate,
        currentTime,
        reading_location,
        notes || null
      ]
    );

    // Récupérer la consultation créée avec les détails
    const newConsultation = await executeQuery(
      `SELECT 
        rc.*,
        u.full_name as user_name,
        u.email as user_email
       FROM reading_room_consultations rc
       LEFT JOIN users u ON rc.user_id = u.id
       WHERE rc.id = ?`,
      [consultationId]
    );

    return NextResponse.json({
      success: true,
      message: `Consultation sur place enregistrée pour "${documentTitle}"`,
      data: newConsultation[0]
    }, { status: 201 });

  } catch (error) {
    console.error('Erreur lors de la création de la consultation:', error);
    return NextResponse.json(
      { 
        error: { 
          code: 'CREATE_ERROR', 
          message: 'Erreur lors de la création de la consultation',
          details: error instanceof Error ? error.message : 'Erreur inconnue'
        } 
      },
      { status: 500 }
    );
  }
}
