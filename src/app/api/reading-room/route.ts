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

// PUT /api/reading-room - Terminer une consultation sur place
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { consultation_id, action } = body;

    if (!consultation_id) {
      return NextResponse.json(
        { error: { code: 'MISSING_CONSULTATION_ID', message: 'ID de consultation requis' } },
        { status: 400 }
      );
    }

    // Récupérer les détails de la consultation
    const consultations = await executeQuery(
      `SELECT rc.*, 
              CASE 
                WHEN rc.document_type = 'book' THEN b.title
                WHEN rc.document_type = 'these' THEN t.title
                WHEN rc.document_type = 'memoire' THEN m.title
                WHEN rc.document_type = 'rapport_stage' THEN sr.title
              END as document_title
       FROM reading_room_consultations rc
       LEFT JOIN books b ON rc.book_id = b.id AND rc.document_type = 'book'
       LEFT JOIN theses t ON rc.academic_document_id = t.id AND rc.document_type = 'these'
       LEFT JOIN memoires m ON rc.academic_document_id = m.id AND rc.document_type = 'memoire'
       LEFT JOIN stage_reports sr ON rc.academic_document_id = sr.id AND rc.document_type = 'rapport_stage'
       WHERE rc.id = ? AND rc.status = 'active'`,
      [consultation_id]
    ) as Array<{
      id: string;
      user_id: string;
      book_id?: string;
      academic_document_id?: string;
      document_type: string;
      document_title: string;
    }>;

    if (consultations.length === 0) {
      return NextResponse.json(
        { error: { code: 'CONSULTATION_NOT_FOUND', message: 'Consultation active non trouvée' } },
        { status: 404 }
      );
    }

    const consultation = consultations[0];

    if (action === 'complete') {
      // 🎯 TRANSACTION POUR TERMINER LA CONSULTATION ET REMETTRE DISPONIBLE
      const currentTime = new Date().toTimeString().split(' ')[0];
      
      const queries = [
        // 1. Marquer la consultation comme terminée
        {
          query: `UPDATE reading_room_consultations 
                  SET status = 'completed', end_time = ?, updated_at = CURRENT_TIMESTAMP 
                  WHERE id = ?`,
          params: [currentTime, consultation_id]
        }
      ];

      // 2. Remettre le document disponible selon son type
      if (consultation.document_type === 'book' && consultation.book_id) {
        queries.push({
          query: 'UPDATE books SET available_copies = available_copies + 1 WHERE id = ?',
          params: [consultation.book_id]
        });
      } else if (consultation.academic_document_id) {
        let tableName = '';
        switch (consultation.document_type) {
          case 'these': tableName = 'theses'; break;
          case 'memoire': tableName = 'memoires'; break;
          case 'rapport_stage': tableName = 'stage_reports'; break;
        }
        
        if (tableName) {
          queries.push({
            query: `UPDATE ${tableName} SET available_copies = available_copies + 1 WHERE id = ?`,
            params: [consultation.academic_document_id]
          });
        }
      }

      // Exécuter la transaction
      const { executeTransaction } = await import('@/lib/mysql');
      await executeTransaction(queries);

      // 🔄 INVALIDER LE CACHE DU CATALOGUE PUBLIC
      try {
        await executeQuery('DELETE FROM catalog_search_cache WHERE created_at < DATE_SUB(NOW(), INTERVAL 1 SECOND)');
        console.log('🗑️  Cache du catalogue public invalidé après fin de consultation');
      } catch (cacheError) {
        console.warn('⚠️  Erreur lors de l\'invalidation du cache:', cacheError);
      }

      console.log(`✅ CONSULTATION TERMINÉE: ${consultation.document_title} remis disponible`);

      return NextResponse.json({
        success: true,
        message: `Consultation terminée. "${consultation.document_title}" est maintenant disponible.`,
        data: { consultation_id, status: 'completed' }
      });

    } else if (action === 'cancel') {
      // Annuler la consultation (même logique que terminer)
      const queries = [
        {
          query: `UPDATE reading_room_consultations 
                  SET status = 'cancelled', updated_at = CURRENT_TIMESTAMP 
                  WHERE id = ?`,
          params: [consultation_id]
        }
      ];

      // Remettre le document disponible
      if (consultation.document_type === 'book' && consultation.book_id) {
        queries.push({
          query: 'UPDATE books SET available_copies = available_copies + 1 WHERE id = ?',
          params: [consultation.book_id]
        });
      } else if (consultation.academic_document_id) {
        let tableName = '';
        switch (consultation.document_type) {
          case 'these': tableName = 'theses'; break;
          case 'memoire': tableName = 'memoires'; break;
          case 'rapport_stage': tableName = 'stage_reports'; break;
        }
        
        if (tableName) {
          queries.push({
            query: `UPDATE ${tableName} SET available_copies = available_copies + 1 WHERE id = ?`,
            params: [consultation.academic_document_id]
          });
        }
      }

      const { executeTransaction } = await import('@/lib/mysql');
      await executeTransaction(queries);

      // 🔄 INVALIDER LE CACHE DU CATALOGUE PUBLIC
      try {
        await executeQuery('DELETE FROM catalog_search_cache WHERE created_at < DATE_SUB(NOW(), INTERVAL 1 SECOND)');
        console.log('🗑️  Cache du catalogue public invalidé après annulation de consultation');
      } catch (cacheError) {
        console.warn('⚠️  Erreur lors de l\'invalidation du cache:', cacheError);
      }

      return NextResponse.json({
        success: true,
        message: `Consultation annulée. "${consultation.document_title}" est maintenant disponible.`,
        data: { consultation_id, status: 'cancelled' }
      });

    } else {
      return NextResponse.json(
        { error: { code: 'INVALID_ACTION', message: 'Action invalide. Utilisez "complete" ou "cancel"' } },
        { status: 400 }
      );
    }

  } catch (error) {
    console.error('Erreur lors de la mise à jour de la consultation:', error);
    return NextResponse.json(
      { 
        error: { 
          code: 'UPDATE_ERROR', 
          message: 'Erreur lors de la mise à jour de la consultation',
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

    // 🔍 VÉRIFIER LA DISPONIBILITÉ AVANT LA CONSULTATION
    // Utiliser le service de disponibilité pour vérifier si le document est disponible
    const { DocumentAvailabilityService } = await import('@/lib/document-availability');
    const documentIdForCheck = book_id || academic_document_id;
    const documentTypeForCheck = document_type;

    const availability = await DocumentAvailabilityService.getDocumentAvailability(
      documentIdForCheck!,
      documentTypeForCheck
    );

    if (!availability) {
      return NextResponse.json(
        { error: { code: 'AVAILABILITY_CHECK_ERROR', message: 'Erreur lors de la vérification de disponibilité' } },
        { status: 500 }
      );
    }

    console.log(`🔍 DISPONIBILITÉ CONSULTATION ${documentIdForCheck}:`, {
      type: documentTypeForCheck,
      title: documentTitle,
      available_copies: availability.available_copies,
      active_loans: availability.active_loans,
      active_reservations: availability.active_reservations,
      active_consultations: availability.active_consultations || 0,
      is_available: availability.is_available
    });

    // Vérifier qu'il y a au moins un exemplaire disponible pour la consultation
    if (availability.available_copies <= 0) {
      return NextResponse.json(
        { 
          error: { 
            code: 'DOCUMENT_UNAVAILABLE_FOR_CONSULTATION', 
            message: `Document non disponible pour consultation. Tous les exemplaires sont actuellement empruntés ou en consultation.`,
            details: {
              available_copies: availability.available_copies,
              active_loans: availability.active_loans,
              active_reservations: availability.active_reservations,
              active_consultations: availability.active_consultations || 0,
              document_title: documentTitle
            }
          } 
        },
        { status: 422 }
      );
    }

    // Créer la consultation
    const consultationId = uuidv4();
    const currentDate = new Date().toISOString().split('T')[0];
    const currentTime = new Date().toTimeString().split(' ')[0];

    // 🎯 TRANSACTION POUR GARANTIR LA COHÉRENCE
    // Créer la consultation ET mettre à jour la disponibilité en une seule transaction
    const queries = [
      // 1. Créer la consultation
      {
        query: `INSERT INTO reading_room_consultations 
                (id, user_id, book_id, academic_document_id, document_type, 
                 consultation_date, start_time, status, reading_location, notes)
                VALUES (?, ?, ?, ?, ?, ?, ?, 'active', ?, ?)`,
        params: [
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
      }
    ];

    // 2. Mettre à jour la disponibilité selon le type de document
    if (document_type === 'book' && book_id) {
      queries.push({
        query: 'UPDATE books SET available_copies = available_copies - 1 WHERE id = ? AND available_copies > 0',
        params: [book_id]
      });
    } else if (academic_document_id) {
      let tableName = '';
      switch (document_type) {
        case 'these': tableName = 'theses'; break;
        case 'memoire': tableName = 'memoires'; break;
        case 'rapport_stage': tableName = 'stage_reports'; break;
      }
      
      if (tableName) {
        queries.push({
          query: `UPDATE ${tableName} SET available_copies = available_copies - 1 WHERE id = ? AND available_copies > 0`,
          params: [academic_document_id]
        });
      }
    }

    // Exécuter la transaction
    const { executeTransaction } = await import('@/lib/mysql');
    await executeTransaction(queries);

    // 🔄 INVALIDER LE CACHE DU CATALOGUE PUBLIC
    try {
      await executeQuery('DELETE FROM catalog_search_cache WHERE created_at < DATE_SUB(NOW(), INTERVAL 1 SECOND)');
      console.log('🗑️  Cache du catalogue public invalidé après création de consultation');
    } catch (cacheError) {
      console.warn('⚠️  Erreur lors de l\'invalidation du cache:', cacheError);
    }

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
