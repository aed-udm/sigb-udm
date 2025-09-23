/**
 * API de téléchargement pour livres - SIGB UdM
 */

import { NextRequest, NextResponse } from 'next/server';
import { executeQuery } from '@/lib/mysql';
import { readFile } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';
import { UdMFileServerService } from '@/lib/services/file-server';

// GET /api/books/[id]/download - Télécharger un livre
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Récupérer les informations du livre
    const books = await executeQuery(
      'SELECT title, main_author, document_path, file_type, document_size FROM books WHERE id = ?',
      [id]
    ) as Array<{ 
      title: string;
      main_author: string;
      document_path: string | null; 
      file_type: string | null;
      document_size: number | null;
    }>;

    if (books.length === 0) {
      return NextResponse.json(
        { error: { code: 'BOOK_NOT_FOUND', message: 'Livre non trouvé' } },
        { status: 404 }
      );
    }

    const book = books[0];

    if (!book.document_path) {
      return NextResponse.json(
        { error: { code: 'NO_DIGITAL_VERSION', message: 'Aucune version numérique disponible' } },
        { status: 404 }
      );
    }

    // Construire le chemin vers le fichier
    // Le document_path est de la forme: "books/filename.pdf" ou "book/filename.pdf"
    const filename = book.document_path.split('/').pop();
    if (!filename) {
      return NextResponse.json(
        { error: { code: 'INVALID_PATH', message: 'Chemin de fichier invalide' } },
        { status: 400 }
      );
    }

    // Essayer plusieurs emplacements possibles
    const possiblePaths = [
      // Serveur FTP local (si disponible)
      join(process.cwd(), 'public', 'uploads', 'books', filename),
      join(process.cwd(), 'public', 'uploads', 'book', filename),
      // Dossier public direct
      join(process.cwd(), 'public', book.document_path),
      // Dossier uploads avec le chemin complet
      join(process.cwd(), 'public', 'uploads', book.document_path)
    ];

    let fileBuffer: Buffer | null = null;
    let foundPath: string | null = null;

    // 1. Essayer d'abord de récupérer depuis le serveur FTP UdM
    try {
      console.log(`Tentative de téléchargement FTP pour livre: ${book.document_path}`);
      const ftpBuffer = await UdMFileServerService.downloadFile(book.document_path, 'book' as any);
      if (ftpBuffer) {
        fileBuffer = ftpBuffer;
        foundPath = `FTP: ${book.document_path}`;
        console.log(`✅ Livre récupéré depuis le serveur FTP UdM`);
      }
    } catch (ftpError) {
      console.warn(`⚠️ Impossible de récupérer le livre depuis FTP:`, ftpError);
    }

    // 2. Si FTP échoue, chercher dans les emplacements locaux (fallback)
    if (!fileBuffer) {
      console.log(`Recherche locale pour livre: ${filename}`);
      for (const filePath of possiblePaths) {
        if (existsSync(filePath)) {
          try {
            fileBuffer = await readFile(filePath);
            foundPath = filePath;
            console.log(`✅ Livre trouvé localement: ${filePath}`);
            break;
          } catch (error) {
            console.warn(`Impossible de lire le fichier: ${filePath}`, error);
            continue;
          }
        }
      }
    }

    if (!fileBuffer) {
      console.error(`Fichier non trouvé pour le livre ${id}:`, {
        document_path: book.document_path,
        filename,
        searched_paths: possiblePaths
      });
      
      return NextResponse.json(
        { error: { code: 'FILE_NOT_FOUND', message: 'Fichier non trouvé sur le serveur' } },
        { status: 404 }
      );
    }

    // Déterminer le type MIME
    const mimeType = book.file_type || 
      (filename.toLowerCase().endsWith('.pdf') ? 'application/pdf' : 'application/octet-stream');

    // Créer un nom de fichier sécurisé pour le téléchargement
    const safeTitle = book.title.replace(/[^a-zA-Z0-9\s\-_]/g, '').replace(/\s+/g, '_');
    const safeAuthor = book.main_author.replace(/[^a-zA-Z0-9\s\-_]/g, '').replace(/\s+/g, '_');
    const downloadFilename = `${safeTitle}_${safeAuthor}.${filename.split('.').pop()}`;

    console.log(`✅ Téléchargement livre: ${book.title} depuis ${foundPath}`);

    return new NextResponse(fileBuffer, {
      headers: {
        'Content-Type': mimeType,
        'Content-Disposition': `attachment; filename="${downloadFilename}"`,
        'Content-Length': fileBuffer.length.toString(),
        'Cache-Control': 'public, max-age=3600', // Cache 1 heure
      }
    });

  } catch (error) {
    console.error('Erreur lors du téléchargement du livre:', error);
    return NextResponse.json(
      { error: { code: 'DOWNLOAD_ERROR', message: 'Erreur lors du téléchargement du livre' } },
      { status: 500 }
    );
  }
}
