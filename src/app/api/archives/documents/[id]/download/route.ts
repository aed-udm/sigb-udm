/**
 * API de téléchargement pour documents d'archives - SIGB UdM
 * Gère le téléchargement sécurisé des documents académiques étudiants
 */

import { NextRequest, NextResponse } from 'next/server';
import { executeQuery } from '@/lib/mysql';
import { readFile } from 'fs/promises';
import { existsSync } from 'fs';
import { join } from 'path';
import { UdMFileServerService } from '@/lib/services/file-server';

// GET /api/archives/documents/[id]/download - Télécharger un document d'archive
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: documentId } = await params;

    // Récupérer les informations du document
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

    if (!document.document_path) {
      return NextResponse.json(
        { error: { code: 'NO_FILE', message: 'Aucun fichier associé à ce document' } },
        { status: 404 }
      );
    }

    // Extraire le nom de fichier depuis le chemin
    const filename = document.document_path.split('/').pop() || `${document.name}.pdf`;

    console.log(`📁 Téléchargement demandé pour document d'archive:`, {
      id: documentId,
      name: document.name,
      category: document.category,
      document_path: document.document_path,
      filename
    });

    // Essayer plusieurs emplacements possibles
    const possiblePaths = [
      // Dossier uploads avec structure par catégorie (nouveau système)
      join(process.cwd(), 'public', 'uploads', 'academic-documents', document.category, filename),
      join(process.cwd(), 'public', 'uploads', 'academic-documents', filename),
      // Dossier public direct avec le chemin complet
      join(process.cwd(), 'public', document.document_path),
      // Dossier uploads avec le chemin complet
      join(process.cwd(), 'public', 'uploads', document.document_path),
      // Compatibilité avec l'ancienne structure
      join(process.cwd(), 'public', 'uploads', 'archive', filename)
    ];

    let fileBuffer: Buffer | null = null;
    let foundPath: string | null = null;

    // 1. Essayer d'abord de récupérer depuis le serveur FTP UdM
    try {
      console.log(`Tentative de téléchargement FTP pour: ${document.document_path}`);
      const ftpBuffer = await UdMFileServerService.downloadFile(document.document_path, 'academic-documents');
      if (ftpBuffer) {
        fileBuffer = ftpBuffer;
        foundPath = `FTP: ${document.document_path}`;
        console.log(`✅ Fichier récupéré depuis le serveur FTP UdM`);
      }
    } catch (ftpError) {
      console.warn(`⚠️ Impossible de récupérer depuis FTP:`, ftpError);
    }

    // 2. Si FTP échoue, chercher dans les emplacements locaux (fallback)
    if (!fileBuffer) {
      console.log(`Recherche locale pour: ${filename}`);
      for (const filePath of possiblePaths) {
        if (existsSync(filePath)) {
          try {
            fileBuffer = await readFile(filePath);
            foundPath = filePath;
            console.log(`✅ Fichier trouvé localement: ${filePath}`);
            break;
          } catch (error) {
            console.warn(`Impossible de lire le fichier: ${filePath}`, error);
            continue;
          }
        }
      }
    }

    if (!fileBuffer) {
      console.error(`Fichier non trouvé pour le document d'archive ${documentId}:`, {
        document_path: document.document_path,
        filename,
        searched_paths: possiblePaths
      });
      
      return NextResponse.json(
        { error: { code: 'FILE_NOT_FOUND', message: 'Fichier non trouvé sur le serveur' } },
        { status: 404 }
      );
    }

    // Déterminer le type MIME
    const mimeType = document.file_type || 'application/octet-stream';
    
    // Créer un nom de fichier sécurisé pour le téléchargement
    const safeFilename = `${document.name.replace(/[^a-zA-Z0-9\-_\.]/g, '_')}.${filename.split('.').pop()}`;

    console.log(`✅ Téléchargement réussi depuis: ${foundPath}`);
    console.log(`📊 Taille: ${fileBuffer.length} bytes, Type: ${mimeType}`);

    // Retourner le fichier avec les en-têtes appropriés
    return new NextResponse(fileBuffer, {
      headers: {
        'Content-Type': mimeType,
        'Content-Disposition': `attachment; filename="${safeFilename}"`,
        'Content-Length': fileBuffer.length.toString(),
        'Cache-Control': 'private, no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      },
    });

  } catch (error) {
    console.error('Erreur lors du téléchargement du document d\'archive:', error);
    return NextResponse.json(
      { error: { code: 'DOWNLOAD_ERROR', message: 'Erreur lors du téléchargement' } },
      { status: 500 }
    );
  }
}
