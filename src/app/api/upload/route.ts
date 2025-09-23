import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';
import { UdMFileServerService } from '@/lib/services/file-server';

// POST /api/upload - Upload de fichiers
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const type = formData.get('type') as string; // 'book', 'these', 'memoire', 'rapport_stage', 'user'
    const id = formData.get('id') as string; // ID de l'entité

    if (!file) {
      return NextResponse.json(
        { error: { code: 'NO_FILE', message: 'Aucun fichier fourni' } },
        { status: 400 }
      );
    }

    if (!type || !id) {
      return NextResponse.json(
        { error: { code: 'MISSING_PARAMS', message: 'Type et ID requis' } },
        { status: 400 }
      );
    }

    // Validation du type de fichier
    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain'
    ];

    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: { code: 'INVALID_TYPE', message: 'Type de fichier non autorisé' } },
        { status: 400 }
      );
    }

    // Validation de la taille (10MB max)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: { code: 'FILE_TOO_LARGE', message: 'Fichier trop volumineux (max 10MB)' } },
        { status: 400 }
      );
    }

    // Convertir le fichier en buffer
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Vérifier si on remplace un fichier existant
    const replaceExisting = formData.get('replaceExisting') === 'true';
    const existingFilePath = formData.get('existingFilePath') as string;

    // Upload vers le serveur de fichiers UdM
    const fileInfo = await UdMFileServerService.uploadFile(
      buffer,
      file.name,
      type as any, // Cast vers DocumentType
      id,
      replaceExisting,
      existingFilePath
    );

    return NextResponse.json({
      success: true,
      message: 'Fichier uploadé avec succès',
      data: fileInfo
    });

  } catch (error) {
    console.error('Error uploading file:', error);
    return NextResponse.json(
      { 
        error: { 
          code: 'UPLOAD_ERROR', 
          message: 'Erreur lors de l\'upload du fichier',
          details: error instanceof Error ? error.message : 'Erreur inconnue'
        } 
      },
      { status: 500 }
    );
  }
}

// DELETE /api/upload - Supprimer un fichier
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const filePath = searchParams.get('path');

    if (!filePath) {
      return NextResponse.json(
        { error: { code: 'NO_PATH', message: 'Chemin du fichier requis' } },
        { status: 400 }
      );
    }

    // Construire le chemin complet
    const fullPath = join(process.cwd(), 'public', filePath);

    // Vérifier que le fichier existe
    if (!existsSync(fullPath)) {
      return NextResponse.json(
        { error: { code: 'FILE_NOT_FOUND', message: 'Fichier non trouvé' } },
        { status: 404 }
      );
    }

    // Supprimer le fichier
    const { unlink } = await import('fs/promises');
    await unlink(fullPath);

    return NextResponse.json({
      success: true,
      message: 'Fichier supprimé avec succès'
    });

  } catch (error) {
    console.error('Error deleting file:', error);
    return NextResponse.json(
      { 
        error: { 
          code: 'DELETE_ERROR', 
          message: 'Erreur lors de la suppression du fichier',
          details: error instanceof Error ? error.message : 'Erreur inconnue'
        } 
      },
      { status: 500 }
    );
  }
}
