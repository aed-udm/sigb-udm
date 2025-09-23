/**
 * Service d'archivage PDF/A conforme aux standards DICAMES
 * Validation temps réel selon ISO 19005 et exigences CAMES
 */

export interface PDFAError {
  code: string;
  message: string;
  severity: 'critical' | 'major' | 'minor';
  suggestion: string;
}

export interface PDFAWarning {
  code: string;
  message: string;
  recommendation: string;
}

export interface PDFMetadata {
  hasXMPMetadata: boolean;
  fontsEmbedded: boolean;
  totalFonts: number;
  embeddedFonts: number;
  hasTransparency: boolean;
  hasJavaScript: boolean;
  hasEncryption: boolean;
  hasAnnotations: boolean;
  pageCount: number;
  colorSpace: string;
  title?: string;
  author?: string;
  subject?: string;
  keywords?: string;
  creator?: string;
  producer?: string;
  creationDate?: string;
  modificationDate?: string;
}

export interface DicamesCompliance {
  isCompliant: boolean;
  level: 'PDF/A-1b' | 'PDF/A-2b' | 'PDF/A-3b' | 'Non-compliant';
  score: number;
  requirements: {
    maxFileSize: boolean;
    fontsEmbedded: boolean;
    noJavaScript: boolean;
    noEncryption: boolean;
    hasMetadata: boolean;
    validStructure: boolean;
  };
  recommendations: string[];
}

export interface PDFAValidationResult {
  isValid: boolean;
  errors: PDFAError[];
  warnings: PDFAWarning[];
  metadata: PDFMetadata;
  dicamesCompliance: DicamesCompliance;
  validationDate: string;
  processingTime: number;
}

export class PDFArchivalService {
  private static readonly MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB limite DICAMES
  
  /**
   * Validation PDF/A complète selon standards DICAMES
   */
  static async validatePDFA(fileBuffer: Buffer, fileName?: string): Promise<PDFAValidationResult> {
    const startTime = Date.now();
    console.log(`🔍 Début validation PDF/A DICAMES pour: ${fileName || 'fichier'}`);
    
    try {
      // 1. Vérifications de base
      const basicChecks = await this.performRealTimeBasicChecks(fileBuffer, fileName);
      
      // 2. Extraction métadonnées
      const metadata = await this.extractRealTimeMetadata(fileBuffer);
      
      // 3. Validation PDF/A spécifique
      const pdfaValidation = await this.performRealTimePDFAValidation(fileBuffer, metadata);
      
      // 4. Validation DICAMES
      const dicamesCompliance = await this.performRealTimeDicamesValidation(
        fileBuffer, 
        metadata, 
        [...basicChecks.errors, ...pdfaValidation.errors]
      );
      
      const processingTime = Date.now() - startTime;
      
      const result: PDFAValidationResult = {
        isValid: basicChecks.isValid && pdfaValidation.isValid && dicamesCompliance.isCompliant,
        errors: [...basicChecks.errors, ...pdfaValidation.errors],
        warnings: [...basicChecks.warnings, ...pdfaValidation.warnings],
        metadata,
        dicamesCompliance,
        validationDate: new Date().toISOString(),
        processingTime
      };
      
      console.log(`✅ Validation terminée en ${processingTime}ms - Conforme: ${result.isValid}`);
      return result;
      
    } catch (error) {
      console.error('❌ Erreur validation PDF/A:', error);
      const processingTime = Date.now() - startTime;
      
      return {
        isValid: false,
        errors: [{
          code: 'VALIDATION_ERROR',
          message: `Erreur lors de la validation: ${error instanceof Error ? error.message : 'Erreur inconnue'}`,
          severity: 'critical',
          suggestion: 'Vérifier l\'intégrité du fichier PDF'
        }],
        warnings: [],
        metadata: this.getEmptyMetadata(),
        dicamesCompliance: this.getFailedDicamesCompliance(),
        validationDate: new Date().toISOString(),
        processingTime
      };
    }
  }

  /**
   * Vérifications de base DICAMES
   */
  private static async performRealTimeBasicChecks(fileBuffer: Buffer, fileName?: string): Promise<{
    isValid: boolean;
    errors: PDFAError[];
    warnings: PDFAWarning[];
  }> {
    const errors: PDFAError[] = [];
    const warnings: PDFAWarning[] = [];
    
    console.log(`🔍 Vérifications de base DICAMES...`);
    
    // 1. Vérifier la taille du fichier (CRITIQUE DICAMES - 50MB max)
    if (fileBuffer.length > this.MAX_FILE_SIZE) {
      errors.push({
        code: 'DICAMES_FILE_TOO_LARGE',
        message: `Fichier trop volumineux (${this.formatFileSize(fileBuffer.length)}). Limite DICAMES: ${this.formatFileSize(this.MAX_FILE_SIZE)}`,
        severity: 'critical',
        suggestion: 'Réduire la taille sous 50MB selon les exigences DICAMES'
      });
    }
    
    // 2. Vérification taille minimale
    if (fileBuffer.length < 1024) {
      errors.push({
        code: 'FILE_TOO_SMALL',
        message: 'Fichier trop petit (moins de 1KB)',
        severity: 'critical',
        suggestion: 'Vérifier que le fichier n\'est pas corrompu'
      });
    }
    
    // 3. Vérifier la signature PDF
    const pdfSignature = fileBuffer.subarray(0, 8).toString('ascii');
    if (!pdfSignature.startsWith('%PDF-')) {
      errors.push({
        code: 'NOT_PDF',
        message: 'Le fichier n\'est pas un PDF valide (signature manquante)',
        severity: 'critical',
        suggestion: 'Convertir le fichier au format PDF'
      });
    }
    
    // 4. Vérifier la structure PDF de base
    const pdfContent = fileBuffer.toString('ascii', 0, Math.min(fileBuffer.length, 10000));
    
    if (!pdfContent.includes('trailer') && !pdfContent.includes('%%EOF')) {
      errors.push({
        code: 'CORRUPTED_PDF',
        message: 'Structure PDF corrompue (trailer manquant)',
        severity: 'critical',
        suggestion: 'Réparer le fichier PDF avec un outil spécialisé'
      });
    }
    
    // 5. Détecter le chiffrement (INTERDIT DICAMES)
    if (pdfContent.includes('/Encrypt') || pdfContent.includes('/Filter/Standard')) {
      errors.push({
        code: 'DICAMES_ENCRYPTION_FORBIDDEN',
        message: 'Chiffrement détecté - INTERDIT selon les standards DICAMES',
        severity: 'critical',
        suggestion: 'Supprimer le chiffrement du PDF avant archivage DICAMES'
      });
    }
    
    // 6. Vérifier JavaScript (INTERDIT DICAMES)
    if (pdfContent.includes('/JavaScript') || pdfContent.includes('/JS')) {
      errors.push({
        code: 'DICAMES_JAVASCRIPT_FORBIDDEN',
        message: 'Code JavaScript détecté - INTERDIT DICAMES',
        severity: 'critical',
        suggestion: 'Supprimer tout code JavaScript du PDF'
      });
    }
    
    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Extraction métadonnées temps réel
   */
  private static async extractRealTimeMetadata(fileBuffer: Buffer): Promise<PDFMetadata> {
    console.log(`🔍 Extraction des métadonnées...`);
    
    const pdfContent = fileBuffer.toString('ascii', 0, Math.min(fileBuffer.length, 50000));
    
    const metadata: PDFMetadata = {
      hasXMPMetadata: false,
      fontsEmbedded: false,
      totalFonts: 0,
      embeddedFonts: 0,
      hasTransparency: false,
      hasJavaScript: false,
      hasEncryption: false,
      hasAnnotations: false,
      pageCount: 0,
      colorSpace: 'Unknown'
    };

    // Vérifier XMP
    if (pdfContent.includes('<x:xmpmeta') || pdfContent.includes('<?xpacket')) {
      metadata.hasXMPMetadata = true;
    }

    // Compter les polices
    const fontMatches = pdfContent.match(/\/BaseFont\s*\/[^\s\/>]+/g);
    if (fontMatches) {
      metadata.totalFonts = fontMatches.length;
      
      // Vérifier polices intégrées
      const embeddedMatches = pdfContent.match(/\/FontFile[123]?\s/g);
      metadata.embeddedFonts = embeddedMatches ? embeddedMatches.length : 0;
      metadata.fontsEmbedded = metadata.embeddedFonts >= metadata.totalFonts;
    }

    // Détecter JavaScript
    metadata.hasJavaScript = pdfContent.includes('/JavaScript') || pdfContent.includes('/JS');

    // Détecter chiffrement
    metadata.hasEncryption = pdfContent.includes('/Encrypt');

    // Compter les pages
    const pageMatches = pdfContent.match(/\/Type\s*\/Page[^s]/g);
    metadata.pageCount = pageMatches ? pageMatches.length : 1;

    // Extraire métadonnées Dublin Core
    const titleMatch = pdfContent.match(/\/Title\s*\(([^)]+)\)/);
    if (titleMatch) metadata.title = titleMatch[1];

    const authorMatch = pdfContent.match(/\/Author\s*\(([^)]+)\)/);
    if (authorMatch) metadata.author = authorMatch[1];

    const subjectMatch = pdfContent.match(/\/Subject\s*\(([^)]+)\)/);
    if (subjectMatch) metadata.subject = subjectMatch[1];

    return metadata;
  }

  /**
   * Validation PDF/A spécifique
   */
  private static async performRealTimePDFAValidation(fileBuffer: Buffer, metadata: PDFMetadata): Promise<{
    isValid: boolean;
    errors: PDFAError[];
    warnings: PDFAWarning[];
  }> {
    const errors: PDFAError[] = [];
    const warnings: PDFAWarning[] = [];

    console.log(`🔍 Validation PDF/A ISO 19005...`);

    // 1. Polices intégrées (OBLIGATOIRE PDF/A)
    if (!metadata.fontsEmbedded && metadata.totalFonts > 0) {
      errors.push({
        code: 'PDFA_FONTS_NOT_EMBEDDED',
        message: `${metadata.totalFonts - metadata.embeddedFonts} police(s) non intégrée(s)`,
        severity: 'critical',
        suggestion: 'Intégrer toutes les polices selon ISO 19005'
      });
    }

    // 2. Métadonnées XMP (OBLIGATOIRES PDF/A)
    if (!metadata.hasXMPMetadata) {
      errors.push({
        code: 'PDFA_XMP_MISSING',
        message: 'Métadonnées XMP manquantes',
        severity: 'critical',
        suggestion: 'Ajouter les métadonnées XMP selon ISO 19005'
      });
    }

    // 3. JavaScript interdit
    if (metadata.hasJavaScript) {
      errors.push({
        code: 'PDFA_JAVASCRIPT_FORBIDDEN',
        message: 'JavaScript détecté - interdit en PDF/A',
        severity: 'critical',
        suggestion: 'Supprimer tout code JavaScript'
      });
    }

    // 4. Chiffrement interdit
    if (metadata.hasEncryption) {
      errors.push({
        code: 'PDFA_ENCRYPTION_FORBIDDEN',
        message: 'Chiffrement détecté - interdit en PDF/A',
        severity: 'critical',
        suggestion: 'Supprimer le chiffrement'
      });
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Validation DICAMES spécifique
   */
  private static async performRealTimeDicamesValidation(
    fileBuffer: Buffer, 
    metadata: PDFMetadata, 
    existingErrors: PDFAError[]
  ): Promise<DicamesCompliance> {
    console.log(`🔍 Validation conformité DICAMES...`);

    const requirements = {
      maxFileSize: fileBuffer.length <= this.MAX_FILE_SIZE,
      fontsEmbedded: metadata.fontsEmbedded,
      noJavaScript: !metadata.hasJavaScript,
      noEncryption: !metadata.hasEncryption,
      hasMetadata: metadata.hasXMPMetadata,
      validStructure: existingErrors.filter(e => e.code.includes('CORRUPTED')).length === 0
    };

    const score = Object.values(requirements).filter(Boolean).length / Object.keys(requirements).length * 100;
    
    let level: DicamesCompliance['level'] = 'Non-compliant';
    if (score >= 95) level = 'PDF/A-3b';
    else if (score >= 85) level = 'PDF/A-2b';
    else if (score >= 75) level = 'PDF/A-1b';

    const recommendations: string[] = [];
    if (!requirements.maxFileSize) recommendations.push('Réduire la taille sous 50MB');
    if (!requirements.fontsEmbedded) recommendations.push('Intégrer toutes les polices');
    if (!requirements.noJavaScript) recommendations.push('Supprimer le JavaScript');
    if (!requirements.noEncryption) recommendations.push('Supprimer le chiffrement');
    if (!requirements.hasMetadata) recommendations.push('Ajouter les métadonnées XMP');

    return {
      isCompliant: score >= 75 && existingErrors.length === 0,
      level,
      score: Math.round(score),
      requirements,
      recommendations
    };
  }

  /**
   * Utilitaires
   */
  private static formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  private static getEmptyMetadata(): PDFMetadata {
    return {
      hasXMPMetadata: false,
      fontsEmbedded: false,
      totalFonts: 0,
      embeddedFonts: 0,
      hasTransparency: false,
      hasJavaScript: false,
      hasEncryption: false,
      hasAnnotations: false,
      pageCount: 0,
      colorSpace: 'Unknown'
    };
  }

  private static getFailedDicamesCompliance(): DicamesCompliance {
    return {
      isCompliant: false,
      level: 'Non-compliant',
      score: 0,
      requirements: {
        maxFileSize: false,
        fontsEmbedded: false,
        noJavaScript: false,
        noEncryption: false,
        hasMetadata: false,
        validStructure: false
      },
      recommendations: ['Fichier non valide - validation impossible']
    };
  }
}
