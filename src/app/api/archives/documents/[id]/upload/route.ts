/**
 * API Route: /api/archives/documents/[id]/upload
 * Upload de fichiers pour documents d'archives étudiants
 * Université des Montagnes - SIGB UdM
 */

import { NextRequest, NextResponse } from 'next/server';
import { executeQuery } from '@/lib/mysql';
import { UdMFileServerService } from '@/lib/services/file-server';
import { logLibraryOperation, logError } from '@/lib/system-logger';

// POST /api/archives/documents/[id]/upload - Upload d'un fichier pour un document d'archive
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const documentId = params.id;

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

    const document = documents[0];

    // Récupérer le fichier depuis FormData
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json(
        { error: { code: 'NO_FILE', message: 'Aucun fichier fourni' } },
        { status: 400 }
      );
    }

    // Validation du fichier
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: { code: 'FILE_TOO_LARGE', message: 'Fichier trop volumineux (max 10MB)' } },
        { status: 400 }
      );
    }

    // Types de fichiers autorisés
    const allowedTypes = [
      'application/pdf',
      'image/jpeg',
      'image/png',
      'image/gif',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain'
    ];

    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: { code: 'INVALID_FILE_TYPE', message: 'Type de fichier non autorisé' } },
        { status: 400 }
      );
    }

    // Convertir le fichier en Buffer
    const arrayBuffer = await file.arrayBuffer();
    const fileBuffer = Buffer.from(arrayBuffer);

    // Upload vers le serveur de fichiers UdM
    try {
      const uploadResult = await UdMFileServerService.uploadFile(
        fileBuffer,
        file.name,
        'academic-documents', // Type de document pour le serveur
        documentId,
        true, // Remplacer si existe
        document.document_path, // Chemin existant à remplacer
        document.category // Catégorie pour organiser les fichiers
      );

      // Mettre à jour le document avec les informations du fichier
      await executeQuery(
        `UPDATE archive_documents
         SET file_path = ?, file_type = ?, file_size = ?, updated_at = ?
         WHERE id = ?`,
        [
          uploadResult.filePath,
          file.type,
          file.size,
          new Date().toISOString(),
          documentId
        ]
      );

      // Récupérer le document mis à jour
      const [updatedDocument] = await executeQuery(
        'SELECT id, student_id, category_id as category, title as name, description, file_type, file_size, file_path as document_path, upload_date, created_at, updated_at FROM archive_documents WHERE id = ?',
        [documentId]
      ) as Array<any>;

      // Logger l'opération (utiliser un type existant)
      await logLibraryOperation(
        'reservation_created', // Utiliser un type existant temporairement
        document.student_id,
        documentId,
        {
          fileName: file.name,
          fileSize: file.size,
          fileType: file.type,
          category: document.category,
          serverPath: uploadResult.filePath,
          action: 'archive_document_file_uploaded'
        }
      );

      return NextResponse.json({
        success: true,
        data: {
          document: updatedDocument,
          upload: {
            fileName: uploadResult.fileName,
            filePath: uploadResult.filePath,
            fileSize: uploadResult.fileSize,
            fileType: uploadResult.fileType,
            uploadedAt: new Date().toISOString()
          }
        },
        message: 'Fichier uploadé avec succès'
      });

    } catch (uploadError) {
      console.error('Erreur upload fichier:', uploadError);
      
      return NextResponse.json(
        { error: { code: 'UPLOAD_ERROR', message: 'Erreur lors de l\'upload du fichier' } },
        { status: 500 }
      );
    }

  } catch (error: unknown) {
    console.error('Error uploading archive document file:', error);
    await logError(error as Error, {
      action: 'upload_archive_document_file',
      documentId: params.id,
      requestUrl: `/api/archives/documents/${params.id}/upload`
    });

    return NextResponse.json(
      { error: { code: 'UPLOAD_ERROR', message: 'Erreur lors de l\'upload du fichier' } },
      { status: 500 }
    );
  }
}

// GET /api/archives/documents/[id]/upload - Informations sur l'upload
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const documentId = params.id;

    // Vérifier que le document existe
    const documents = await executeQuery(
      'SELECT id, title as name, file_type, file_size, file_path as document_path, upload_date FROM archive_documents WHERE id = ?',
      [documentId]
    ) as Array<any>;

    if (documents.length === 0) {
      return NextResponse.json(
        { error: { code: 'DOCUMENT_NOT_FOUND', message: 'Document non trouvé' } },
        { status: 404 }
      );
    }

    const document = documents[0];

    return NextResponse.json({
      success: true,
      data: {
        hasFile: !!document.document_path,
        fileInfo: document.document_path ? {
          fileName: document.name,
          fileType: document.file_type,
          fileSize: document.file_size,
          filePath: document.document_path,
          uploadDate: document.upload_date
        } : null,
        uploadLimits: {
          maxSize: 10 * 1024 * 1024, // 10MB
          allowedTypes: [
            'application/pdf',
            'image/jpeg',
            'image/png',
            'image/gif',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'text/plain'
          ]
        }
      }
    });

  } catch (error: unknown) {
    console.error('Error getting upload info:', error);
    return NextResponse.json(
      { error: { code: 'INFO_ERROR', message: 'Erreur lors de la récupération des informations' } },
      { status: 500 }
    );
  }
}
