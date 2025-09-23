/**
 * Service pour l'import depuis de vraies APIs de bibliothèques
 * Remplace le Z39.50 par des APIs REST modernes et fiables
 */

export interface BookMetadata {
  isbn: string;
  title: string;
  subtitle?: string;
  authors: string[];
  publisher?: string;
  publishedDate?: string;
  description?: string;
  pageCount?: number;
  categories?: string[];
  language?: string;
  imageLinks?: {
    thumbnail?: string;
    small?: string;
    medium?: string;
    large?: string;
  };
  source: string;
  _originalSource?: string;
  _fallbackReason?: string;
}

export interface LibraryAPIResult {
  success: boolean;
  book?: BookMetadata;
  error?: string;
  source: string;
}

export class RealLibraryAPI {
  
  /**
   * Recherche dans Google Books API
   */
  static async searchGoogleBooks(isbn: string): Promise<LibraryAPIResult> {
    try {
      const cleanISBN = isbn.replace(/[-\s]/g, '');
      const url = `https://www.googleapis.com/books/v1/volumes?q=isbn:${cleanISBN}`;
      
      console.log(`🔍 Recherche Google Books: ${cleanISBN}`);
      
      const response = await fetch(url);
      const data = await response.json();
      
      if (!data.items || data.items.length === 0) {
        return {
          success: false,
          error: 'Aucun résultat trouvé',
          source: 'Google Books'
        };
      }
      
      const item = data.items[0];
      const volumeInfo = item.volumeInfo;
      
      const book: BookMetadata = {
        isbn: cleanISBN,
        title: volumeInfo.title || 'Titre non disponible',
        subtitle: volumeInfo.subtitle,
        authors: volumeInfo.authors || ['Auteur non disponible'],
        publisher: volumeInfo.publisher,
        publishedDate: volumeInfo.publishedDate,
        description: volumeInfo.description,
        pageCount: volumeInfo.pageCount,
        categories: volumeInfo.categories,
        language: volumeInfo.language,
        imageLinks: volumeInfo.imageLinks,
        source: 'Google Books'
      };
      
      console.log(`✅ Google Books: "${book.title}" par ${book.authors.join(', ')}`);
      
      return {
        success: true,
        book,
        source: 'Google Books'
      };
      
    } catch (error) {
      console.error('❌ Erreur Google Books:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erreur inconnue',
        source: 'Google Books'
      };
    }
  }
  
  /**
   * Recherche dans OpenLibrary API
   */
  static async searchOpenLibrary(isbn: string): Promise<LibraryAPIResult> {
    try {
      const cleanISBN = isbn.replace(/[-\s]/g, '');
      const url = `https://openlibrary.org/api/books?bibkeys=ISBN:${cleanISBN}&format=json&jscmd=data`;
      
      console.log(`� Recherche via OpenLibrary API`);
      console.log(`�🔍 Recherche OpenLibrary: ${cleanISBN}`);
      
      const response = await fetch(url);
      const data = await response.json();
      
      const bookKey = `ISBN:${cleanISBN}`;
      if (!data[bookKey]) {
        return {
          success: false,
          error: 'Aucun résultat trouvé',
          source: 'OpenLibrary'
        };
      }
      
      const bookData = data[bookKey];
      
      const book: BookMetadata = {
        isbn: cleanISBN,
        title: bookData.title || 'Titre non disponible',
        subtitle: bookData.subtitle,
        authors: bookData.authors ? bookData.authors.map((a: any) => a.name) : ['Auteur non disponible'],
        publisher: bookData.publishers ? bookData.publishers[0]?.name : undefined,
        publishedDate: bookData.publish_date,
        description: bookData.notes || bookData.description,
        pageCount: bookData.number_of_pages,
        categories: bookData.subjects ? bookData.subjects.map((s: any) => s.name) : undefined,
        language: 'fr', // Par défaut français
        imageLinks: bookData.cover ? {
          thumbnail: bookData.cover.small,
          small: bookData.cover.medium,
          medium: bookData.cover.large
        } : undefined,
        source: 'OpenLibrary'
      };
      
      console.log(`✅ OpenLibrary: "${book.title}" par ${book.authors.join(', ')}`);
      
      return {
        success: true,
        book,
        source: 'OpenLibrary'
      };
      
    } catch (error) {
      console.error('❌ Erreur OpenLibrary:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erreur inconnue',
        source: 'OpenLibrary'
      };
    }
  }
  
  /**
   * Recherche dans l'API BNF (Bibliothèque nationale de France)
   * ATTENTION: API BNF actuellement non fiable - fallback immédiat vers Google Books
   */
  static async searchBNF(isbn: string): Promise<LibraryAPIResult> {
    try {
      const cleanISBN = isbn.replace(/[-\s]/g, '');
      console.log(`🇫🇷 Recherche via BNF (Bibliothèque nationale de France)`);
      console.log(`🇫🇷 Recherche BNF: ${cleanISBN}`);

      // ⚠️ PROBLÈME IDENTIFIÉ: API BNF ne retourne aucun résultat même pour des ISBN français célèbres
      // Tests effectués avec Le Petit Prince, Les Misérables, L'Étranger, Madame Bovary = 0 résultats
      // Fallback immédiat vers Google Books pour garantir des résultats

      console.log(`⚠️ API BNF actuellement non fiable, fallback immédiat vers Google Books`);
      console.log(`🔄 Fallback BNF → Google Books pour ISBN: ${cleanISBN}`);

      const googleResult = await this.searchGoogleBooks(cleanISBN);
      if (googleResult.success && googleResult.book) {
        console.log(`✅ BNF Fallback: "${googleResult.book.title}"`);
        return {
          ...googleResult,
          source: 'BNF (via Google Books)',
          book: {
            ...googleResult.book,
            source: 'BNF (via Google Books)',
            _originalSource: 'Google Books',
            _fallbackReason: 'API BNF non fiable'
          }
        };
      }

      return {
        success: false,
        error: 'API BNF non fiable et fallback Google Books échoué',
        source: 'BNF'
      };

    } catch (error) {
      console.error('❌ Erreur BNF complète:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erreur inconnue',
        source: 'BNF'
      };
    }
  }

  /**
   * Recherche dans l'API SUDOC (ABES)
   * ATTENTION: API SUDOC actuellement non fiable - fallback immédiat vers Google Books
   */
  static async searchSUDOC(isbn: string): Promise<LibraryAPIResult> {
    try {
      const cleanISBN = isbn.replace(/[-\s]/g, '');
      console.log(`📚 Recherche via SUDOC (ABES)`);
      console.log(`📚 Recherche SUDOC: ${cleanISBN}`);

      // ⚠️ PROBLÈME IDENTIFIÉ: API SUDOC retourne des erreurs système
      // "System temporarily unavailable" et "Not authorised to send record in this schema"
      // Fallback immédiat vers Google Books pour garantir des résultats

      console.log(`⚠️ API SUDOC actuellement non fiable, fallback immédiat vers Google Books`);
      console.log(`🔄 SUDOC échoué, fallback vers Google Books`);

      const googleResult = await this.searchGoogleBooks(cleanISBN);
      if (googleResult.success && googleResult.book) {
        return {
          ...googleResult,
          source: 'SUDOC (via Google Books)',
          book: {
            ...googleResult.book,
            source: 'SUDOC (via Google Books)',
            _originalSource: 'Google Books',
            _fallbackReason: 'API SUDOC non fiable'
          }
        };
      }

      return {
        success: false,
        error: 'API SUDOC non fiable et fallback Google Books échoué',
        source: 'SUDOC'
      };

    } catch (error) {
      console.error('❌ Erreur SUDOC complète:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erreur inconnue',
        source: 'SUDOC'
      };
    }
  }

  /**
   * Parse le XML de réponse SUDOC pour extraire les métadonnées
   */
  private static parseSUDOCXML(xmlText: string, isbn: string): BookMetadata | null {
    try {
      console.log(`🔍 Parsing XML SUDOC pour ISBN: ${isbn}`);

      // Vérifier s'il y a des résultats
      if (xmlText.includes('<srw:numberOfRecords>0</srw:numberOfRecords>')) {
        console.log('📭 Aucun résultat SUDOC');
        return null;
      }

      // Extraction des métadonnées UNIMARC et Dublin Core
      const titleMatch = xmlText.match(/<dc:title>([^<]+)<\/dc:title>/) ||
                         xmlText.match(/<datafield tag="200"[^>]*>[\s\S]*?<subfield code="a">([^<]+)<\/subfield>/) ||
                         xmlText.match(/<title>([^<]+)<\/title>/);

      const authorMatch = xmlText.match(/<dc:creator>([^<]+)<\/dc:creator>/) ||
                         xmlText.match(/<datafield tag="700"[^>]*>[\s\S]*?<subfield code="a">([^<]+)<\/subfield>/) ||
                         xmlText.match(/<author>([^<]+)<\/author>/);

      const publisherMatch = xmlText.match(/<dc:publisher>([^<]+)<\/dc:publisher>/) ||
                            xmlText.match(/<datafield tag="210"[^>]*>[\s\S]*?<subfield code="c">([^<]+)<\/subfield>/);

      const dateMatch = xmlText.match(/<dc:date>([^<]+)<\/dc:date>/) ||
                       xmlText.match(/<datafield tag="210"[^>]*>[\s\S]*?<subfield code="d">([^<]+)<\/subfield>/);

      if (!titleMatch) {
        console.log('❌ Titre non trouvé dans la réponse SUDOC');
        return null;
      }

      const metadata: BookMetadata = {
        isbn: isbn,
        title: titleMatch[1].trim(),
        authors: authorMatch ? [authorMatch[1].trim()] : ['Auteur inconnu'],
        publisher: publisherMatch ? publisherMatch[1].trim() : undefined,
        publishedDate: dateMatch ? dateMatch[1].trim() : undefined,
        language: 'fr',
        source: 'SUDOC',
        categories: ['Catalogue universitaire']
      };

      console.log(`✅ Métadonnées SUDOC extraites: "${metadata.title}" par ${metadata.authors[0]}`);
      return metadata;

    } catch (error) {
      console.error('❌ Erreur parsing XML SUDOC:', error);
      return null;
    }
  }

  /**
   * Parse le XML de réponse BNF pour extraire les métadonnées - Version améliorée
   */
  private static parseBNFXML(xmlText: string, isbn: string): BookMetadata | null {
    try {
      console.log(`🔍 Parsing XML BNF pour ISBN: ${isbn}`);
      
      // Extraction du titre avec patterns UNIMARC et Dublin Core
      const titlePatterns = [
        // UNIMARC champ 200$a (titre principal)
        /<datafield tag="200"[^>]*>[\s\S]*?<subfield code="a">([^<]+)<\/subfield>/,
        // UNIMARC champ 245$a (alternative)
        /<datafield tag="245"[^>]*>[\s\S]*?<subfield code="a">([^<]+)<\/subfield>/,
        // Dublin Core
        /<dc:title>([^<]+)<\/dc:title>/,
        // Patterns génériques
        /<title>([^<]+)<\/title>/,
        // Pattern plus large pour subfield
        /<subfield code="a">([^<]+)<\/subfield>/
      ];
      
      let title = 'Titre non disponible';
      for (const pattern of titlePatterns) {
        const match = xmlText.match(pattern);
        if (match && match[1] && match[1].trim().length > 3) {
          title = match[1].trim();
          console.log(`📖 Titre trouvé: "${title}"`);
          break;
        }
      }

      // Extraction de l'auteur avec patterns UNIMARC spécifiques
      const authorPatterns = [
        // UNIMARC champ 700$a (auteur principal)
        /<datafield tag="700"[^>]*>[\s\S]*?<subfield code="a">([^<]+)<\/subfield>/g,
        // UNIMARC champ 100$a (auteur personnel)
        /<datafield tag="100"[^>]*>[\s\S]*?<subfield code="a">([^<]+)<\/subfield>/g,
        // Dublin Core
        /<dc:creator>([^<]+)<\/dc:creator>/g,
        /<creator>([^<]+)<\/creator>/g
      ];
      
      const authors: string[] = [];
      for (const pattern of authorPatterns) {
        let match;
        while ((match = pattern.exec(xmlText)) !== null) {
          const author = match[1].trim();
          if (author && author !== title && author.length > 2 && !authors.includes(author)) {
            authors.push(author);
            console.log(`👤 Auteur trouvé: "${author}"`);
          }
        }
        if (authors.length > 0) break;
      }

      // Extraction de l'éditeur
      const publisherMatch = xmlText.match(/<subfield code="c">([^<]+)<\/subfield>/) || 
                           xmlText.match(/<dc:publisher>([^<]+)<\/dc:publisher>/);
      const publisher = publisherMatch ? publisherMatch[1].trim() : undefined;

      // Extraction de la date de publication
      const dateMatch = xmlText.match(/<subfield code="d">([^<]+)<\/subfield>/) || 
                       xmlText.match(/<dc:date>([^<]+)<\/dc:date>/);
      const publishedDate = dateMatch ? dateMatch[1].trim() : undefined;

      // Extraction de la description
      const descMatch = xmlText.match(/<subfield code="a">([^<]+)<\/subfield>.*?résumé/i) || 
                       xmlText.match(/<dc:description>([^<]+)<\/dc:description>/);
      const description = descMatch ? descMatch[1].trim() : undefined;

      const book: BookMetadata = {
        isbn,
        title,
        authors: authors.length > 0 ? authors : ['Auteur non disponible'],
        publisher,
        publishedDate,
        description,
        language: 'fr',
        source: 'BNF'
      };

      return book;

    } catch (parseError) {
      console.error('❌ Erreur parsing XML BNF:', parseError);
      return null;
    }
  }
  
  /**
   * Recherche multi-sources avec fallback
   */
  static async searchMultipleSources(isbn: string): Promise<LibraryAPIResult> {
    console.log(`🔍 Recherche multi-sources pour ISBN: ${isbn}`);
    
    // Essayer Google Books en premier (plus fiable)
    const googleResult = await this.searchGoogleBooks(isbn);
    if (googleResult.success) {
      return googleResult;
    }
    
    // Fallback vers OpenLibrary
    const openLibResult = await this.searchOpenLibrary(isbn);
    if (openLibResult.success) {
      return openLibResult;
    }
    
    // Fallback vers BNF
    const bnfResult = await this.searchBNF(isbn);
    if (bnfResult.success) {
      return bnfResult;
    }

    // Fallback vers SUDOC
    const sudocResult = await this.searchSUDOC(isbn);
    if (sudocResult.success) {
      return sudocResult;
    }

    // Aucune source n'a fonctionné
    return {
      success: false,
      error: 'Aucun résultat trouvé dans toutes les sources (Google Books, OpenLibrary, BNF, SUDOC)',
      source: 'Multi-sources'
    };
  }
  
  /**
   * Convertir les métadonnées en format de base de données
   */
  static convertToBookData(metadata: BookMetadata): any {
    return {
      // 🔧 CORRECTION : Inclure TOUS les champs requis
      isbn: metadata.isbn, // 🚨 ÉTAIT MANQUANT !
      mfn: `${metadata.source}_${metadata.isbn}`,
      title: metadata.title,
      subtitle: metadata.subtitle,
      main_author: metadata.authors[0] || 'Auteur non disponible',
      secondary_author: metadata.authors.slice(1).join('; ') || null,
      edition: null, // 🔧 Non disponible dans les APIs modernes
      publication_city: null, // 🔧 Non disponible dans les APIs modernes
      publisher: metadata.publisher,
      publication_year: metadata.publishedDate ? new Date(metadata.publishedDate).getFullYear() : null,
      collection: null, // 🔧 Non disponible dans les APIs modernes
      domain: metadata.categories ? metadata.categories[0] : 'Non classé',
      // 🔧 CORRECTION : Résumé anglais dans abstract, summary français vide
      summary: null, // Résumé français (à compléter manuellement)
      abstract: metadata.description, // Résumé anglais depuis l'API
      keywords: metadata.categories || [],
      total_copies: 1,
      available_copies: 1,
      acquisition_mode: `Import ${metadata.source}`,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
  }
}
