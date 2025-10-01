/**
 * API pour la gestion d'une consultation spécifique - SIGB UdM
 * Permet de terminer ou annuler une consultation sur place
 */

import { NextRequest, NextResponse } from 'next/server';
import { executeQuery, executeTransaction } from '@/lib/mysql';

// PUT /api/reading-room/[id] - Terminer ou annuler une consultation
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: consultationId } = await params;
    const body = await request.json();
    const { action } = body;

    if (!consultationId) {
      return NextResponse.json(
        { error: { code: 'MISSING_CONSULTATION_ID', message: 'ID de consultation requis' } },
        { status: 400 }
      );
    }

    // Requête simplifiée sans JOIN pour éviter les problèmes de collation
    const consultations = await executeQuery(
      `SELECT rc.*, u.full_name as user_name
       FROM reading_room_consultations rc
       LEFT JOIN users u ON rc.user_id = u.id
       WHERE rc.id = ? AND rc.status = 'active'`,
      [consultationId]
    ) as Array<{
      id: string;
      user_id: string;
      book_id?: string;
      academic_document_id?: string;
      document_type: string;
      user_name: string;
    }>;

    if (consultations.length === 0) {
      return NextResponse.json(
        { error: { code: 'CONSULTATION_NOT_FOUND', message: 'Consultation active non trouvée' } },
        { status: 404 }
      );
    }

    const consultation = consultations[0];

    if (action === 'complete' || action === 'cancel') {
      // 🎯 TRANSACTION POUR TERMINER LA CONSULTATION ET REMETTRE DISPONIBLE
      const currentTime = new Date().toTimeString().split(' ')[0];
      const newStatus = action === 'complete' ? 'completed' : 'cancelled';
      
      const queries = [
        // 1. Marquer la consultation comme terminée/annulée
        {
          query: `UPDATE reading_room_consultations 
                  SET status = ?, end_time = ?, updated_at = CURRENT_TIMESTAMP 
                  WHERE id = ?`,
          params: [newStatus, action === 'complete' ? currentTime : null, consultationId]
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
      await executeTransaction(queries);

      const actionText = action === 'complete' ? 'terminée' : 'annulée';
      console.log(`✅ CONSULTATION ${actionText.toUpperCase()}: Document par ${consultation.user_name} - Document remis disponible`);

      return NextResponse.json({
        success: true,
        message: `Consultation ${actionText}. Document maintenant disponible.`,
        data: { 
          consultation_id: consultationId, 
          status: newStatus,
          user_name: consultation.user_name
        }
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

// GET /api/reading-room/[id] - Récupérer les détails d'une consultation
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: consultationId } = await params;

    const consultations = await executeQuery(
      `SELECT 
        rc.*,
        u.full_name as user_name,
        u.email as user_email,
        u.matricule as user_barcode
      FROM reading_room_consultations rc
      LEFT JOIN users u ON rc.user_id = u.id
      WHERE rc.id = ?`,
      [consultationId]
    );

    if (consultations.length === 0) {
      return NextResponse.json(
        { error: { code: 'CONSULTATION_NOT_FOUND', message: 'Consultation non trouvée' } },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: consultations[0]
    });

  } catch (error) {
    console.error('Erreur lors de la récupération de la consultation:', error);
    return NextResponse.json(
      { 
        error: { 
          code: 'FETCH_ERROR', 
          message: 'Erreur lors de la récupération de la consultation',
          details: error instanceof Error ? error.message : 'Erreur inconnue'
        } 
      },
      { status: 500 }
    );
  }
}