import { NextRequest, NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';

// Route pour servir les fichiers PDF des documents académiques
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  try {
    const { path } = await params;
    
    if (!path || path.length < 2) {
      return new NextResponse('Chemin invalide', { status: 400 });
    }

    // Construire le chemin du fichier
    // Format attendu: /theses/[type]/[filename]
    // Exemple: /theses/memoire/8db2c71b-a1f8-4341-9c6f-dd3b6a8d6a60_1757179570139.pdf
    const [documentType, filename] = path;
    
    // Vérifier le type de document
    const validTypes = ['these', 'memoire', 'rapport_stage', 'thesis']; // Inclure 'thesis' pour compatibilité
    if (!validTypes.includes(documentType)) {
      return new NextResponse('Type de document invalide', { status: 400 });
    }

    // Mapper les anciens noms vers les nouveaux
    const typeMapping: { [key: string]: string } = {
      'thesis': 'these',
      'memoire': 'memoires', 
      'rapport_stage': 'rapport_stage',
      'these': 'theses'
    };

    const mappedType = typeMapping[documentType] || documentType;
    
    // Construire le chemin vers le fichier sur le serveur FTP local (si disponible)
    // ou dans le dossier public/uploads
    const publicPath = join(process.cwd(), 'public', 'uploads', 'academic-documents', mappedType, filename);
    
    // Vérifier si le fichier existe localement
    if (existsSync(publicPath)) {
      const fileBuffer = await readFile(publicPath);
      
      // Déterminer le type MIME
      const mimeType = filename.toLowerCase().endsWith('.pdf') ? 'application/pdf' : 'application/octet-stream';
      
      return new NextResponse(fileBuffer, {
        headers: {
          'Content-Type': mimeType,
          'Content-Disposition': `inline; filename="${filename}"`,
          'Cache-Control': 'public, max-age=31536000, immutable',
        },
      });
    }

    // Si le fichier n'existe pas localement, essayer de le récupérer depuis le serveur FTP
    // Pour l'instant, retourner 404
    console.log(`Fichier non trouvé: ${publicPath}`);
    return new NextResponse('Fichier non trouvé', { status: 404 });

  } catch (error) {
    console.error('Erreur lors de la récupération du fichier:', error);
    return new NextResponse('Erreur serveur', { status: 500 });
  }
}
