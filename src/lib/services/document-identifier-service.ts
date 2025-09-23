/**
 * Service de génération d'identifiants pour documents
 * Gère la génération automatique de tous les types d'identifiants
 */


import { executeQuery } from '@/lib/mysql';

export type DocumentType = 'book' | 'these' | 'memoire' | 'rapport_stage' | 'user' | 'agent';

export interface DocumentIdentifier {
  uuid: string;                    // Identifiant technique unique
  barcode?: string;               // Code-barres scannable
  cames_id?: string;              // Identifiant CAMES/DICAMES
  local_id?: string;              // Identifiant local lisible
  handle?: string;                // Handle persistant
  doi?: string;                   // DOI (pour publications)
  mfn?: string;                   // MFN (pour livres)
  employee_id?: string;           // Numéro d'employé (pour agents)
}

export interface SequenceInfo {
  document_type: DocumentType;
  year: number;
  last_sequence: number;
}

/**
 * Service principal de génération d'identifiants
 */
export class DocumentIdentifierService {
  
  /**
   * Générer un identifiant complet pour un document
   */
  static async generateCompleteIdentifier(
    documentType: DocumentType,
    year?: number,
    options: {
      generateDOI?: boolean;
      generateHandle?: boolean;
      customSequence?: number;
    } = {}
  ): Promise<DocumentIdentifier> {
    
    const docYear = year || new Date().getFullYear();
    const uuid = crypto.randomUUID();
    
    // Obtenir le prochain numéro de séquence
    const sequence = options.customSequence || await this.getNextSequence(documentType, docYear);
    
    const identifier: DocumentIdentifier = {
      uuid,
      barcode: this.generateBarcode(documentType, docYear, sequence),
      cames_id: this.generateCamesId(documentType, docYear, sequence),
      local_id: this.generateLocalId(documentType, docYear, sequence),
    };
    
    // Ajouter handle si demandé
    if (options.generateHandle) {
      identifier.handle = this.generateHandle(documentType, docYear, sequence);
    }
    
    // Ajouter DOI si demandé (pour thèses principalement)
    if (options.generateDOI && documentType === 'these') {
      identifier.doi = this.generateDOI(documentType, docYear, sequence);
    }
    
    // Ajouter MFN pour les livres
    if (documentType === 'book') {
      identifier.mfn = this.generateMFN(docYear, sequence);
    }

    // Ajouter employee_id pour les agents
    if (documentType === 'agent') {
      identifier.employee_id = this.generateEmployeeId(docYear, sequence);
    }

    return identifier;
  }
  
  /**
   * Générer un code-barres selon le type de document
   */
  static generateBarcode(documentType: DocumentType, year: number, sequence: number): string {
    switch (documentType) {
      case 'user':
        const month = new Date().getMonth() + 1;
        return `BIB${year}${month.toString().padStart(2, '0')}${sequence.toString().padStart(4, '0')}`;

      case 'book':
        return `LIV${sequence.toString().padStart(6, '0')}`;

      case 'these':
        return `THE${year}${sequence.toString().padStart(3, '0')}`;

      case 'memoire':
        return `MEM${year}${sequence.toString().padStart(3, '0')}`;

      case 'rapport_stage':
        return `RAP${year}${sequence.toString().padStart(3, '0')}`;

      case 'agent':
        return `AGT${year}${sequence.toString().padStart(3, '0')}`;

      default:
        return `DOC${year}${sequence.toString().padStart(4, '0')}`;
    }
  }

  /**
   * Générer un code-barres pour utilisateur (méthode spécialisée)
   */
  static generateUserBarcode(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;
    const sequence = Math.floor(Math.random() * 9999) + 1;

    return `BIB${year}${month.toString().padStart(2, '0')}${sequence.toString().padStart(4, '0')}`;
  }
  
  /**
   * Générer un identifiant CAMES/DICAMES
   */
  static generateCamesId(documentType: DocumentType, year: number, sequence: number): string {
    const typeMap = {
      book: 'LIV',
      these: 'TH',
      memoire: 'ME',
      rapport_stage: 'RS',
      user: 'USR',
      agent: 'AGT'
    };
    
    const typeCode = typeMap[documentType] || 'DOC';
    return `CAMES-CM-UDM-${year}-${typeCode}-${sequence.toString().padStart(3, '0')}`;
  }
  
  /**
   * Générer un identifiant local lisible
   */
  static generateLocalId(documentType: DocumentType, year: number, sequence: number): string {
    const typeMap = {
      book: 'LIV',
      these: 'TH',
      memoire: 'ME',
      rapport_stage: 'RS',
      user: 'USR',
      agent: 'AGT'
    };
    
    const typeCode = typeMap[documentType] || 'DOC';
    return `UDM-${year}-${typeCode}-${sequence.toString().padStart(3, '0')}`;
  }
  
  /**
   * Générer un handle persistant
   */
  static generateHandle(documentType: DocumentType, year: number, sequence: number): string {
    const typeMap = {
      book: 'liv',
      these: 'th',
      memoire: 'me',
      rapport_stage: 'rs',
      user: 'usr',
      agent: 'agt'
    };
    
    const typeCode = typeMap[documentType] || 'doc';
    return `123456789/udm-${year}-${typeCode}-${sequence.toString().padStart(3, '0')}`;
  }
  
  /**
   * Générer un DOI
   */
  static generateDOI(documentType: DocumentType, year: number, sequence: number): string {
    const typeMap = {
      these: 'th',
      memoire: 'me',
      rapport_stage: 'rs'
    };
    
    const typeCode = typeMap[documentType as keyof typeof typeMap] || 'doc';
    return `10.1000/udm.${year}.${typeCode}.${sequence.toString().padStart(3, '0')}`;
  }
  
  /**
   * Générer un MFN (Machine-readable File Number) pour les livres
   */
  static generateMFN(year: number, sequence: number): string {
    return `UdM-CM-${year}-${sequence.toString().padStart(6, '0')}`;
  }

  /**
   * Générer un employee_id pour les agents
   */
  static generateEmployeeId(year: number, sequence: number): string {
    return `EMP-${year}-${sequence.toString().padStart(3, '0')}`;
  }

  /**
   * Générer un code-barres pour agent (méthode spécialisée)
   */
  static generateAgentBarcode(): string {
    const year = new Date().getFullYear();
    const sequence = Math.floor(Math.random() * 999) + 1;

    return `AGT${year}${sequence.toString().padStart(3, '0')}`;
  }
  
  /**
   * Obtenir le prochain numéro de séquence avec vérification d'unicité
   */
  static async getNextSequence(documentType: DocumentType, year: number): Promise<number> {
    const maxRetries = 10;
    let attempt = 0;
    
    while (attempt < maxRetries) {
      try {
        let sequence: number;
        
        if (attempt === 0) {
          // Premier essai : utiliser la fonction MySQL
          try {
            const result = await executeQuery(
              'SELECT get_next_sequence(?, ?) as next_sequence',
              [documentType, year]
            ) as Array<{ next_sequence: number }>;
            sequence = result[0]?.next_sequence || 1;
          } catch (mysqlError) {
            console.error('Erreur fonction MySQL get_next_sequence:', mysqlError);
            throw mysqlError;
          }
        } else {
          // Fallback : calculer manuellement la prochaine séquence
          const tableName = this.getTableNameForDocumentType(documentType);
          const barcodePrefix = this.getBarcodePrefix(documentType, year);
          
          const existingBarcodes = await executeQuery(
            `SELECT barcode FROM ${tableName} WHERE barcode LIKE ? ORDER BY barcode DESC LIMIT 1`,
            [`${barcodePrefix}%`]
          ) as Array<{ barcode: string }>;
          
          if (existingBarcodes.length > 0) {
            const lastBarcode = existingBarcodes[0].barcode;
            const lastSequence = parseInt(lastBarcode.replace(barcodePrefix, ''));
            sequence = lastSequence + attempt; // Incrémenter avec le nombre de tentatives
          } else {
            sequence = attempt + 1;
          }
        }
        
        // Vérifier l'unicité du barcode généré
        const proposedBarcode = this.generateBarcode(documentType, year, sequence);
        const tableName = this.getTableNameForDocumentType(documentType);
        
        const existingBarcode = await executeQuery(
          `SELECT barcode FROM ${tableName} WHERE barcode = ? LIMIT 1`,
          [proposedBarcode]
        ) as Array<{ barcode: string }>;
        
        if (existingBarcode.length === 0) {
          // Barcode unique trouvé
          console.log(`✅ Barcode unique généré: ${proposedBarcode} (tentative ${attempt + 1})`);
          return sequence;
        } else {
          console.warn(`⚠️ Barcode ${proposedBarcode} déjà existant, tentative ${attempt + 1}/${maxRetries}`);
          attempt++;
        }
        
      } catch (error) {
        console.error(`Erreur tentative ${attempt + 1}:`, error);
        attempt++;
        
        if (attempt >= maxRetries) {
          // Dernier recours : utiliser timestamp + random pour garantir l'unicité
          const uniqueSequence = Date.now() % 100000 + Math.floor(Math.random() * 1000);
          console.error(`🚨 Utilisation séquence d'urgence: ${uniqueSequence}`);
          return uniqueSequence;
        }
      }
    }
    
    throw new Error(`Impossible de générer un barcode unique après ${maxRetries} tentatives`);
  }

  /**
   * Obtenir le nom de table pour un type de document
   */
  private static getTableNameForDocumentType(documentType: DocumentType): string {
    switch (documentType) {
      case 'book': return 'books';
      case 'these': return 'theses';
      case 'memoire': return 'memoires';
      case 'rapport_stage': return 'stage_reports';
      case 'user': return 'users';
      case 'agent': return 'agents';
      default: return 'documents';
    }
  }

  /**
   * Obtenir le préfixe de barcode pour un type de document
   */
  private static getBarcodePrefix(documentType: DocumentType, year: number): string {
    switch (documentType) {
      case 'user':
        const month = new Date().getMonth() + 1;
        return `BIB${year}${month.toString().padStart(2, '0')}`;
      case 'book': return 'LIV';
      case 'these': return `THE${year}`;
      case 'memoire': return `MEM${year}`;
      case 'rapport_stage': return `RAP${year}`;
      case 'agent': return `AGT${year}`;
      default: return `DOC${year}`;
    }
  }
  
  /**
   * Obtenir les informations de séquence pour un type de document
   */
  static async getSequenceInfo(documentType: DocumentType, year: number): Promise<SequenceInfo | null> {
    try {
      const result = await executeQuery(
        'SELECT document_type, year, last_sequence FROM document_sequences WHERE document_type = ? AND year = ?',
        [documentType, year]
      ) as Array<SequenceInfo>;
      
      return result[0] || null;
    } catch (error) {
      console.error('Erreur lors de la récupération des informations de séquence:', error);
      return null;
    }
  }
  
  /**
   * Rechercher un document par code-barres
   */
  static async findDocumentByBarcode(barcode: string): Promise<{
    table: string;
    document: any;
  } | null> {
    const tables = ['books', 'theses', 'memoires', 'stage_reports', 'users', 'agents'];

    for (const table of tables) {
      try {
        const result = await executeQuery(
          `SELECT * FROM ${table} WHERE barcode = ? LIMIT 1`,
          [barcode]
        ) as Array<any>;

        if (result.length > 0) {
          return {
            table,
            document: result[0]
          };
        }
      } catch (error) {
        console.error(`Erreur lors de la recherche dans ${table}:`, error);
      }
    }

    return null;
  }
  
  /**
   * Rechercher un document par identifiant CAMES
   */
  static async findDocumentByCamesId(camesId: string): Promise<{
    table: string;
    document: any;
  } | null> {
    const tables = ['books', 'theses', 'memoires', 'stage_reports'];
    
    for (const table of tables) {
      try {
        const result = await executeQuery(
          `SELECT * FROM ${table} WHERE cames_id = ? LIMIT 1`,
          [camesId]
        ) as Array<any>;
        
        if (result.length > 0) {
          return {
            table,
            document: result[0]
          };
        }
      } catch (error) {
        console.error(`Erreur lors de la recherche CAMES dans ${table}:`, error);
      }
    }
    
    return null;
  }
  
  /**
   * Valider un code-barres selon son format
   */
  static validateBarcode(barcode: string): {
    isValid: boolean;
    type?: DocumentType;
    year?: number;
    sequence?: number;
    errors: string[];
  } {
    const errors: string[] = [];
    
    if (!barcode || barcode.length < 6) {
      errors.push('Code-barres trop court');
      return { isValid: false, errors };
    }
    
    // Patterns de validation
    const patterns = {
      user: /^BIB(\d{4})(\d{2})(\d{4})$/,      // BIB202501XXXX
      book: /^LIV(\d{6})$/,                     // LIV000123
      these: /^THE(\d{4})(\d{3})$/,            // THE2024001
      memoire: /^MEM(\d{4})(\d{3})$/,           // MEM2024001
      rapport_stage: /^RAP(\d{4})(\d{3})$/,      // RAP2024001
      agent: /^AGT(\d{4})(\d{3})$/              // AGT2024001
    };
    
    for (const [type, pattern] of Object.entries(patterns)) {
      const match = barcode.match(pattern);
      if (match) {
        let year: number | undefined;
        let sequence: number | undefined;
        
        if (type === 'user') {
          year = parseInt(match[1]);
          sequence = parseInt(match[3]);
        } else if (type === 'book') {
          sequence = parseInt(match[1]);
        } else {
          year = parseInt(match[1]);
          sequence = parseInt(match[2]);
        }
        
        return {
          isValid: true,
          type: type as DocumentType,
          year,
          sequence,
          errors: []
        };
      }
    }
    
    errors.push('Format de code-barres non reconnu');
    return { isValid: false, errors };
  }
  
  /**
   * Générer un rapport de statistiques des identifiants
   */
  static async getIdentifierStats(): Promise<{
    totalDocuments: number;
    byType: Record<DocumentType, number>;
    byYear: Record<number, number>;
    recentSequences: SequenceInfo[];
  }> {
    try {
      // Compter les documents par type
      const bookCount = await executeQuery('SELECT COUNT(*) as count FROM books') as Array<{ count: number }>;
      const thesisCount = await executeQuery('SELECT COUNT(*) as count FROM theses') as Array<{ count: number }>;
      const memoireCount = await executeQuery('SELECT COUNT(*) as count FROM memoires') as Array<{ count: number }>;
      const stageReportCount = await executeQuery('SELECT COUNT(*) as count FROM stage_reports') as Array<{ count: number }>;
      const userCount = await executeQuery('SELECT COUNT(*) as count FROM users') as Array<{ count: number }>;
      
      const byType = {
        book: bookCount[0]?.count || 0,
        these: thesisCount[0]?.count || 0,
        memoire: memoireCount[0]?.count || 0,
        rapport_stage: stageReportCount[0]?.count || 0,
        user: userCount[0]?.count || 0,
        agent: 0 // Sera mis à jour quand les agents seront comptés
      };
      
      const totalDocuments = Object.values(byType).reduce((sum, count) => sum + count, 0);
      
      // Obtenir les séquences récentes
      const recentSequences = await executeQuery(
        'SELECT * FROM document_sequences ORDER BY updated_at DESC LIMIT 10'
      ) as SequenceInfo[];
      
      // Compter par année (approximatif basé sur created_at)
      const yearStats = await executeQuery(`
        SELECT 
          YEAR(created_at) as year,
          COUNT(*) as count
        FROM (
          SELECT created_at FROM books
          UNION ALL SELECT created_at FROM theses
          UNION ALL SELECT created_at FROM memoires
          UNION ALL SELECT created_at FROM stage_reports
          UNION ALL SELECT created_at FROM users
        ) as all_docs
        GROUP BY YEAR(created_at)
        ORDER BY year DESC
      `) as Array<{ year: number; count: number }>;
      
      const byYear = yearStats.reduce((acc, { year, count }) => {
        acc[year] = count;
        return acc;
      }, {} as Record<number, number>);
      
      return {
        totalDocuments,
        byType,
        byYear,
        recentSequences
      };
    } catch (error) {
      console.error('Erreur lors de la génération des statistiques:', error);
      return {
        totalDocuments: 0,
        byType: { book: 0, these: 0, memoire: 0, rapport_stage: 0, user: 0, agent: 0 },
        byYear: {},
        recentSequences: []
      };
    }
  }
}
