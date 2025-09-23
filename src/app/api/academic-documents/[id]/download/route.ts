/**
 * API de téléchargement pour documents académiques - SIGB UdM
 * Gère le téléchargement sécurisé des thèses, mémoires et rapports de stage
 */

import { NextRequest, NextResponse } from 'next/server';
import { executeQuery } from '@/lib/mysql';
import { readFile } from 'fs/promises';
import { existsSync } from 'fs';
import { join } from 'path';
import { UdMFileServerService } from '@/lib/services/file-server';

// GET /api/academic-documents/[id]/download - Télécharger un document académique
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Déterminer le type de document et l'ID propre
    let cleanId = id;
    let documentType: 'these' | 'memoire' | 'rapport_stage' = 'these';
    
    if (id.startsWith('mem_')) {
      cleanId = id.replace('mem_', '');
      documentType = 'memoire';
    } else if (id.startsWith('stage_')) {
      cleanId = id.replace('stage_', '');
      documentType = 'rapport_stage';
    } else {
      // Pour les thèses ou IDs sans préfixe, vérifier dans la vue
      const typeQuery = `SELECT document_type FROM academic_documents WHERE id = ?`;
      const typeRows = await executeQuery(typeQuery, [id]);
      
      if ((typeRows as any[]).length === 0) {
        return NextResponse.json(
          { error: { code: 'NOT_FOUND', message: 'Document non trouvé' } },
          { status: 404 }
        );
      }
      
      documentType = (typeRows as any[])[0].document_type;
      cleanId = id;
    }

    let query = '';
    let titleField = 'title';
    let authorField = 'author';

    // Construire la requête selon le type de document
    switch (documentType) {
      case 'these':
        query = `
          SELECT title, main_author as author, document_path, document_type as file_type, document_size 
          FROM theses WHERE id = ?
        `;
        titleField = 'title';
        authorField = 'author';
        break;
      case 'memoire':
        query = `
          SELECT title, main_author as author, document_path, document_type as file_type, document_size 
          FROM memoires WHERE id = ?
        `;
        titleField = 'title';
        authorField = 'author';
        break;
      case 'rapport_stage':
        query = `
          SELECT title, student_name as author, document_path, document_type as file_type, document_size 
          FROM stage_reports WHERE id = ?
        `;
        titleField = 'title';
        authorField = 'author';
        break;
    }

    const documents = await executeQuery(query, [cleanId]) as Array<{ 
      title: string;
      author: string;
      document_path: string | null; 
      file_type: string | null;
      document_size: number | null;
    }>;

    if (documents.length === 0) {
      return NextResponse.json(
        { error: { code: 'DOCUMENT_NOT_FOUND', message: 'Document non trouvé' } },
        { status: 404 }
      );
    }

    const document = documents[0];

    if (!document.document_path) {
      return NextResponse.json(
        { error: { code: 'NO_DIGITAL_VERSION', message: 'Aucune version numérique disponible' } },
        { status: 404 }
      );
    }

    // Construire le chemin vers le fichier
    // Le document_path peut être de la forme: "these/filename.pdf", "memoire/filename.pdf", etc.
    const filename = document.document_path.split('/').pop();
    if (!filename) {
      return NextResponse.json(
        { error: { code: 'INVALID_PATH', message: 'Chemin de fichier invalide' } },
        { status: 400 }
      );
    }

    // Essayer plusieurs emplacements possibles
    const possiblePaths = [
      // Dossier uploads avec structure par type
      join(process.cwd(), 'public', 'uploads', 'academic-documents', documentType, filename),
      join(process.cwd(), 'public', 'uploads', documentType, filename),
      // Dossier public direct avec le chemin complet
      join(process.cwd(), 'public', document.document_path),
      // Dossier uploads avec le chemin complet
      join(process.cwd(), 'public', 'uploads', document.document_path),
      // Compatibilité avec l'ancienne structure
      join(process.cwd(), 'public', 'uploads', 'theses', filename),
      join(process.cwd(), 'public', 'uploads', 'memoires', filename),
      join(process.cwd(), 'public', 'uploads', 'rapport_stage', filename)
    ];

    let fileBuffer: Buffer | null = null;
    let foundPath: string | null = null;

    // 1. Essayer d'abord de récupérer depuis le serveur FTP UdM
    try {
      console.log(`Tentative de téléchargement FTP pour: ${document.document_path}`);
      const ftpBuffer = await UdMFileServerService.downloadFile(document.document_path, documentType);
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
      console.error(`Fichier non trouvé pour le document ${id}:`, {
        document_type: documentType,
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
    const mimeType = filename.toLowerCase().endsWith('.pdf') ? 'application/pdf' : 'application/octet-stream';

    // Créer un nom de fichier sécurisé pour le téléchargement
    const safeTitle = document.title.replace(/[^a-zA-Z0-9\s\-_]/g, '').replace(/\s+/g, '_');
    const safeAuthor = document.author.replace(/[^a-zA-Z0-9\s\-_]/g, '').replace(/\s+/g, '_');
    const downloadFilename = `${safeTitle}_${safeAuthor}.${filename.split('.').pop()}`;

    console.log(`✅ Téléchargement document académique: ${document.title} depuis ${foundPath}`);

    return new NextResponse(fileBuffer, {
      headers: {
        'Content-Type': mimeType,
        'Content-Disposition': `attachment; filename="${downloadFilename}"`,
        'Content-Length': fileBuffer.length.toString(),
        'Cache-Control': 'public, max-age=3600', // Cache 1 heure
      }
    });

  } catch (error) {
    console.error('Error downloading academic document:', error);
    return NextResponse.json(
      { error: { code: 'DOWNLOAD_ERROR', message: 'Erreur lors du téléchargement du document' } },
      { status: 500 }
    );
  }
}
