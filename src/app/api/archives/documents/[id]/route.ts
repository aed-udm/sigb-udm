/**
 * API Route: /api/archives/documents/[id]
 * Gestion individuelle des documents d'archives étudiants
 * Université des Montagnes - SIGB UdM
 */

import { NextRequest, NextResponse } from 'next/server';
import { executeQuery } from '@/lib/mysql';
import { logLibraryOperation, logError } from '@/lib/system-logger';
import { UdMFileServerService } from '@/lib/services/file-server';

// GET /api/archives/documents/[id] - Récupérer un document spécifique
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const documentId = params.id;

    const documents = await executeQuery(
      'SELECT id, student_id, category_id as category, title as name, description, file_type, file_size, file_path as document_path, upload_date, created_at, updated_at FROM archive_documents WHERE id = ?',
      [documentId]
    ) as Array<any>;

    if (documents.length === 0) {
      return NextResponse.json(
        { error: { code: 'DOCUMENT_NOT_FOUND', message: 'Document non trouvé' } },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: documents[0]
    });

  } catch (error: unknown) {
    console.error('Error fetching archive document:', error);
    await logError(error as Error, {
      action: 'fetch_archive_document',
      documentId: params.id,
      requestUrl: `/api/archives/documents/${params.id}`
    });

    return NextResponse.json(
      { error: { code: 'FETCH_ERROR', message: 'Erreur lors de la récupération du document' } },
      { status: 500 }
    );
  }
}

// PUT /api/archives/documents/[id] - Mettre à jour un document
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const documentId = params.id;
    const body = await request.json();

    // Vérifier que le document existe
    const documents = await executeQuery(
      'SELECT id, student_id, category_id as category, title as name, description, file_type, file_size, file_path as document_path, upload_date, created_at, updated_at FROM archive_documents WHERE id = ?',
      [documentId]
    ) as Array<any>;

    if (documents.length === 0) {
      return NextResponse.json(
        { error: { code: 'DOCUMENT_NOT_FOUND', message: 'Document non trouvé' } },
        { status: 404 }
      );
    }

    // Construire la requête de mise à jour
    const updateFields: string[] = [];
    const updateValues: any[] = [];

    if (body.name !== undefined) {
      updateFields.push('title = ?');
      updateValues.push(body.name);
    }

    if (body.description !== undefined) {
      updateFields.push('description = ?');
      updateValues.push(body.description);
    }

    if (body.file_type !== undefined) {
      updateFields.push('file_type = ?');
      updateValues.push(body.file_type);
    }

    if (body.file_size !== undefined) {
      updateFields.push('file_size = ?');
      updateValues.push(body.file_size);
    }

    if (body.document_path !== undefined) {
      updateFields.push('file_path = ?');
      updateValues.push(body.document_path);
    }

    if (updateFields.length === 0) {
      return NextResponse.json(
        { error: { code: 'NO_UPDATES', message: 'Aucune donnée à mettre à jour' } },
        { status: 400 }
      );
    }

    // Ajouter la date de mise à jour
    updateFields.push('updated_at = ?');
    updateValues.push(new Date().toISOString());

    // Ajouter l'ID pour la clause WHERE
    updateValues.push(documentId);

    // Exécuter la mise à jour
    await executeQuery(
      `UPDATE archive_documents SET ${updateFields.join(', ')} WHERE id = ?`,
      updateValues
    );

    // Récupérer le document mis à jour
    const [updatedDocument] = await executeQuery(
      'SELECT id, student_id, category_id as category, title as name, description, file_type, file_size, file_path as document_path, upload_date, created_at, updated_at FROM archive_documents WHERE id = ?',
      [documentId]
    ) as Array<any>;

    // Logger l'opération (utiliser un type existant)
    await logLibraryOperation(
      'reservation_updated', // Utiliser un type existant temporairement
      updatedDocument.student_id,
      documentId,
      {
        updatedFields: updateFields.map(field => field.split(' = ')[0]),
        documentName: updatedDocument.name,
        action: 'archive_document_updated'
      }
    );

    return NextResponse.json({
      success: true,
      data: updatedDocument,
      message: 'Document mis à jour avec succès'
    });

  } catch (error: unknown) {
    console.error('Error updating archive document:', error);
    await logError(error as Error, {
      action: 'update_archive_document',
      documentId: params.id,
      requestUrl: `/api/archives/documents/${params.id}`
    });

    return NextResponse.json(
      { error: { code: 'UPDATE_ERROR', message: 'Erreur lors de la mise à jour du document' } },
      { status: 500 }
    );
  }
}

// DELETE /api/archives/documents/[id] - Supprimer un document
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const documentId = params.id;

    // Récupérer le document avant suppression
    const documents = await executeQuery(
      'SELECT id, student_id, category_id as category, title as name, description, file_type, file_size, file_path as document_path, upload_date, created_at, updated_at FROM archive_documents WHERE id = ?',
      [documentId]
    ) as Array<any>;

    if (documents.length === 0) {
      return NextResponse.json(
        { error: { code: 'DOCUMENT_NOT_FOUND', message: 'Document non trouvé' } },
        { status: 404 }
      );
    }

    const document = documents[0];

    // Supprimer le fichier du serveur si il existe
    if (document.document_path) {
      try {
        await UdMFileServerService.deleteFile(document.document_path);
        console.log(`✅ Fichier supprimé du serveur: ${document.document_path}`);
      } catch (fileError) {
        console.warn(`⚠️ Impossible de supprimer le fichier: ${document.document_path}`, fileError);
        // Ne pas faire échouer la suppression du document si le fichier ne peut pas être supprimé
      }
    }

    // Supprimer le document de la base de données
    await executeQuery(
      'DELETE FROM archive_documents WHERE id = ?',
      [documentId]
    );

    // Logger l'opération (utiliser un type existant)
    await logLibraryOperation(
      'reservation_cancelled', // Utiliser un type existant temporairement
      document.student_id,
      documentId,
      {
        documentName: document.name,
        category: document.category,
        hadFile: !!document.document_path,
        action: 'archive_document_deleted'
      }
    );

    return NextResponse.json({
      success: true,
      message: 'Document supprimé avec succès'
    });

  } catch (error: unknown) {
    console.error('Error deleting archive document:', error);
    await logError(error as Error, {
      action: 'delete_archive_document',
      documentId: params.id,
      requestUrl: `/api/archives/documents/${params.id}`
    });

    return NextResponse.json(
      { error: { code: 'DELETE_ERROR', message: 'Erreur lors de la suppression du document' } },
      { status: 500 }
    );
  }
}
