/**
 * API pour la gestion individuelle des consultations sur place - SIGB UdM
 */

import { NextRequest, NextResponse } from 'next/server';
import { executeQuery } from '@/lib/mysql';

// GET /api/reading-room/[id] - Récupérer une consultation spécifique
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const consultations = await executeQuery(
      `SELECT 
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
      WHERE rc.id = ?`,
      [id]
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

// PUT /api/reading-room/[id] - Mettre à jour une consultation (terminer, annuler, etc.)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { action, notes, reading_location } = body;

    // Vérifier que la consultation existe
    const consultations = await executeQuery(
      'SELECT * FROM reading_room_consultations WHERE id = ?',
      [id]
    ) as Array<any>;

    if (consultations.length === 0) {
      return NextResponse.json(
        { error: { code: 'CONSULTATION_NOT_FOUND', message: 'Consultation non trouvée' } },
        { status: 404 }
      );
    }

    const consultation = consultations[0];

    if (action === 'complete') {
      // Terminer la consultation
      if (consultation.status !== 'active') {
        return NextResponse.json(
          { error: { code: 'CONSULTATION_NOT_ACTIVE', message: 'La consultation n\'est pas active' } },
          { status: 400 }
        );
      }

      const currentTime = new Date().toTimeString().split(' ')[0];

      await executeQuery(
        `UPDATE reading_room_consultations 
         SET status = 'completed', end_time = ?, notes = COALESCE(?, notes)
         WHERE id = ?`,
        [currentTime, notes || null, id]
      );

      // Calculer la durée de consultation
      const startTime = new Date(`1970-01-01T${consultation.start_time}`);
      const endTime = new Date(`1970-01-01T${currentTime}`);
      const durationMinutes = Math.round((endTime.getTime() - startTime.getTime()) / (1000 * 60));

      return NextResponse.json({
        success: true,
        message: 'Consultation terminée avec succès',
        data: {
          consultation_id: id,
          duration_minutes: durationMinutes,
          end_time: currentTime
        }
      });

    } else if (action === 'cancel') {
      // Annuler la consultation
      if (consultation.status !== 'active') {
        return NextResponse.json(
          { error: { code: 'CONSULTATION_NOT_ACTIVE', message: 'La consultation n\'est pas active' } },
          { status: 400 }
        );
      }

      await executeQuery(
        `UPDATE reading_room_consultations 
         SET status = 'cancelled', notes = COALESCE(?, notes)
         WHERE id = ?`,
        [notes || null, id]
      );

      return NextResponse.json({
        success: true,
        message: 'Consultation annulée avec succès'
      });

    } else if (action === 'update') {
      // Mettre à jour les informations de la consultation
      const updateFields = [];
      const updateParams = [];

      if (notes !== undefined) {
        updateFields.push('notes = ?');
        updateParams.push(notes);
      }

      if (reading_location !== undefined) {
        updateFields.push('reading_location = ?');
        updateParams.push(reading_location);
      }

      if (updateFields.length === 0) {
        return NextResponse.json(
          { error: { code: 'NO_UPDATES', message: 'Aucune mise à jour fournie' } },
          { status: 400 }
        );
      }

      updateParams.push(id);

      await executeQuery(
        `UPDATE reading_room_consultations SET ${updateFields.join(', ')} WHERE id = ?`,
        updateParams
      );

      return NextResponse.json({
        success: true,
        message: 'Consultation mise à jour avec succès'
      });

    } else {
      return NextResponse.json(
        { error: { code: 'INVALID_ACTION', message: 'Action invalide' } },
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

// DELETE /api/reading-room/[id] - Supprimer une consultation
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Vérifier que la consultation existe
    const consultations = await executeQuery(
      'SELECT * FROM reading_room_consultations WHERE id = ?',
      [id]
    );

    if (consultations.length === 0) {
      return NextResponse.json(
        { error: { code: 'CONSULTATION_NOT_FOUND', message: 'Consultation non trouvée' } },
        { status: 404 }
      );
    }

    // Supprimer la consultation
    await executeQuery(
      'DELETE FROM reading_room_consultations WHERE id = ?',
      [id]
    );

    return NextResponse.json({
      success: true,
      message: 'Consultation supprimée avec succès'
    });

  } catch (error) {
    console.error('Erreur lors de la suppression de la consultation:', error);
    return NextResponse.json(
      { 
        error: { 
          code: 'DELETE_ERROR', 
          message: 'Erreur lors de la suppression de la consultation',
          details: error instanceof Error ? error.message : 'Erreur inconnue'
        } 
      },
      { status: 500 }
    );
  }
}
