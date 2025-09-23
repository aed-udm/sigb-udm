import { NextRequest, NextResponse } from 'next/server';
import { executeQuery } from '@/lib/mysql';
import { Z3950Service, Z3950_SERVERS } from '@/lib/standards/z3950-service';

/**
 * POST /api/z3950/import - Import automatique via Z39.50
 * 
 * Body:
 * {
 *   "isbn": "9782123456789",
 *   "server": "BNF",
 *   "copies": 1,
 *   "autoSave": true
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    const {
      isbn,
      server = 'MODERN_APIS',
      copies = 1,
      autoSave = false,
      additionalData = {}
    } = body;
    
    // Validation
    if (!isbn) {
      return NextResponse.json(
        { error: 'Le paramètre "isbn" est requis' },
        { status: 400 }
      );
    }
    
    if (!Z3950_SERVERS[server as keyof typeof Z3950_SERVERS]) {
      return NextResponse.json(
        { error: `Source de données invalide. Sources disponibles: ${Object.keys(Z3950_SERVERS).join(', ')}` },
        { status: 400 }
      );
    }
    
    // Nettoyer l'ISBN
    const cleanISBN = isbn.replace(/[-\s]/g, '');
    if (!/^\d{10}(\d{3})?$/.test(cleanISBN)) {
      return NextResponse.json(
        { error: 'Format ISBN invalide' },
        { status: 400 }
      );
    }
    
    // 🔧 CORRECTION DÉFINITIVE : Vérification existence sans conflit collation
    // Le problème vient de l'INDEX UNIQUE sur isbn qui cause conflit de collation
    const existingBooks = await executeQuery(`
      SELECT id, title, main_author, mfn, isbn
      FROM books
      WHERE mfn LIKE ? OR isbn = ?
    `, [`%${cleanISBN}%`, cleanISBN]) as Array<{ id: string; title: string; main_author: string; mfn: string; isbn: string }>;
      
      if (Array.isArray(existingBooks) && existingBooks.length > 0) {
        const existing = existingBooks[0] as any;
        return NextResponse.json(
          { 
            error: 'Livre déjà existant',
            details: `Le livre "${existing.title}" par ${existing.main_author} existe déjà avec l'ISBN ${existing.isbn}`,
            existingBook: existing
          },
          { status: 409 }
        );
      }
      
      // Rechercher via Z39.50
      const importResult = await Z3950Service.searchAndImport(
        cleanISBN, 
        server as keyof typeof Z3950_SERVERS
      );
      
      if (!importResult.success) {
        return NextResponse.json(
          { 
            error: 'Aucun résultat trouvé',
            details: importResult.errors 
          },
          { status: 404 }
        );
      }
      
      // 🔧 SOLUTION DÉFINITIVE : Générer TOUS les champs pour éviter le TRIGGER
      // Le trigger cause conflit collation, on génère tout manuellement
      const currentYear = new Date().getFullYear();
      const sequenceNum = Math.floor(Math.random() * 999) + 1; // Temporaire, à améliorer

      // Enrichir les données avec TOUS les champs requis
      const bookData = {
        ...importResult.book,
        isbn: cleanISBN,
        total_copies: copies,
        available_copies: copies,
        // Générer les identifiants pour éviter le trigger
        barcode: `LIV${String(sequenceNum).padStart(6, '0')}`,
        cames_id: `CAMES-CM-UDM-${currentYear}-LIV-${String(sequenceNum).padStart(3, '0')}`,
        local_id: `UDM-${currentYear}-LIV-${String(sequenceNum).padStart(3, '0')}`,
        handle: `123456789/udm-${currentYear}-liv-${String(sequenceNum).padStart(3, '0')}`,
        ...additionalData,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      
      // Sauvegarder automatiquement si demandé
      if (autoSave) {
        // Générer un UUID pour le nouveau livre
        const { v4: uuidv4 } = require('uuid');
        const bookId = uuidv4();

        // 🔧 SOLUTION FINALE : INSERT avec barcode fourni pour éviter trigger
        // Le trigger ne se déclenche que si barcode est NULL
        const insertQuery = `
          INSERT INTO books (
            id, mfn, title, subtitle, parallel_title, main_author, secondary_author,
            edition, publication_city, publisher, publication_year, acquisition_mode,
            price, domain, collection, summary, abstract, keywords, isbn, total_copies,
            available_copies, digital_versions, has_digital_version, barcode, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;

        const values = [
          bookId, // UUID généré
          bookData.mfn || `ISBN_${cleanISBN}`, // Utiliser l'ISBN comme MFN temporairement
          bookData.title || null,
          bookData.subtitle || null,
          bookData.parallel_title || null,
          bookData.main_author || null,
          bookData.secondary_author || null,
          bookData.edition || null,
          bookData.publication_city || null,
          bookData.publisher || null,
          bookData.publication_year || null,
          bookData.acquisition_mode || 'Import Z39.50',
          bookData.price || null,
          bookData.domain || null,
          bookData.collection || null,
          bookData.summary || null, // Résumé français (vide pour import)
          bookData.abstract || null, // 🔧 AJOUT : Résumé anglais depuis l'API
          bookData.keywords ? JSON.stringify(bookData.keywords) : null,
          bookData.isbn || cleanISBN, // 🔧 CORRECTION : ISBN était manquant !
          bookData.total_copies || 1,
          bookData.available_copies || 1,
          bookData.digital_versions ? JSON.stringify(bookData.digital_versions) : null,
          bookData.has_digital_version || false,
          // Générer barcode pour éviter le trigger (qui cause conflit collation)
          bookData.barcode || `LIV${String(Math.floor(Math.random() * 999999) + 1).padStart(6, '0')}`,
          new Date().toISOString(),
          new Date().toISOString()
        ];

        // 🔧 SOLUTION FINALE : INSERT simple avec barcode fourni
        // Le trigger ne se déclenche que si barcode est NULL
        // En fournissant un barcode, on évite le trigger et donc le conflit de collation
        console.log('💾 Insertion en base (trigger évité par barcode fourni)...');

        const insertResult = await executeQuery(insertQuery, values);
        console.log('✅ Livre inséré avec succès');
        console.log('📊 Résultat INSERT:', insertResult);
        console.log('🔍 ID inséré:', bookId);
        console.log('📚 ISBN inséré:', bookData.isbn || cleanISBN);

        return NextResponse.json({
          success: true,
          message: 'Livre importé et sauvegardé avec succès',
          book: {
            id: bookId,
            ...bookData
          },
          source: {
            server: server,
            serverName: Z3950_SERVERS[server as keyof typeof Z3950_SERVERS].name,
            isbn: cleanISBN
          }
        });
      } else {
        // Retourner les données pour prévisualisation
        return NextResponse.json({
          success: true,
          message: 'Données importées avec succès (non sauvegardées)',
          book: bookData,
          source: {
            server: server,
            serverName: Z3950_SERVERS[server as keyof typeof Z3950_SERVERS].name,
            isbn: cleanISBN
          },
          preview: true
        });
      }
    
  } catch (error) {
    console.error('Erreur import Z39.50:', error);
    return NextResponse.json(
      { 
        error: 'Erreur interne du serveur',
        details: error instanceof Error ? error.message : 'Erreur inconnue'
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/z3950/import - Obtenir les serveurs disponibles
 */
export async function GET(request: NextRequest) {
  try {
    const servers = Z3950Service.getAvailableServers();
    
    return NextResponse.json({
      success: true,
      servers,
      defaultServer: 'MULTI_SOURCE',
      supportedFormats: ['JSON', 'REST API'],
      features: [
        'Recherche par ISBN',
        'APIs modernes (Google Books, OpenLibrary)',
        'Base française vérifiée',
        'Import automatique',
        'Validation des données',
        'Détection des doublons'
      ]
    });
    
  } catch (error) {
    console.error('Erreur API Z39.50 GET:', error);
    return NextResponse.json(
      { 
        error: 'Erreur interne du serveur',
        details: error instanceof Error ? error.message : 'Erreur inconnue'
      },
      { status: 500 }
    );
  }
}
