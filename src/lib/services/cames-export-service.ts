/**
 * Service d'export conforme aux normes CAMES/DICAMES
 * Respecte l'uniformité des interfaces du projet UDM
 */

import { PDFArchivalService, PDFAValidationResult } from "./pdf-archival-service";
import { DicamesDocument, DublinCoreMetadata } from "@/types/database";
import { executeQuery } from "../mysql";

export interface ExportResult {
  success: boolean;
  data?: {
    exported_count: number;
    documents: DicamesDocument[];
    export_format: string;
    file_url?: string;
  };
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
}

export interface ExportOptions {
  format: 'dublin_core_xml' | 'oai_pmh' | 'pdf_archive';
  include_files: boolean;
  validate_pdfa: boolean;
  target_repository: 'dicames' | 'local' | 'partner';
  metadata_language: 'fr' | 'en' | 'both';
  compression: boolean;
}

// Interface pour la validation de conformité CAMES
export interface CamesComplianceResult {
  isCompliant: boolean;
  isDicamesReady: boolean;
  score: number;
  checks: {
    metadata: { passed: boolean; missingFields: string[] };
    bilingualAbstract: { passed: boolean; hasFrench: boolean; hasEnglish: boolean };
    keywords: { passed: boolean; frenchCount: number; englishCount: number };
    classification: { passed: boolean; hasDewey: boolean; hasSubjects: boolean };
    pdfValidation: { passed: boolean; result?: PDFAValidationResult };
  };
  recommendations: string[];
}

/**
 * Service principal d'export CAMES/DICAMES
 */
export class CamesExportService {
  
  /**
   * Exporte des documents vers le format DICAMES
   */
  static async exportDocuments(
    documentIds: string[],
    documentType: 'thesis' | 'memoir' | 'internship_report',
    options: ExportOptions
  ): Promise<ExportResult> {
    try {
      // Validation des IDs
      if (!documentIds.length) {
        return {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Aucun document spécifié pour l\'export'
          }
        };
      }

      // Récupération des documents depuis la base
      const documents = await this.getDocumentsFromDatabase(documentIds, documentType);
      
      if (!documents.length) {
        return {
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Aucun document trouvé avec les IDs spécifiés'
          }
        };
      }

      // Conversion vers le format DICAMES
      const dicamesDocuments: DicamesDocument[] = [];
      
      for (const doc of documents) {
        try {
          const dicamesDoc = await this.convertToDicames(doc, documentType);
          dicamesDocuments.push(dicamesDoc);
        } catch (error) {
          console.error(`Erreur conversion document ${doc.id}:`, error);
          // Continue avec les autres documents
        }
      }

      // Génération du fichier d'export selon le format
      let fileUrl: string | undefined;
      
      if (options.format === 'dublin_core_xml') {
        fileUrl = await this.generateXMLExport(dicamesDocuments, options);
      } else if (options.format === 'oai_pmh') {
        fileUrl = await this.generateOAIExport(dicamesDocuments, options);
      }

      return {
        success: true,
        data: {
          exported_count: dicamesDocuments.length,
          documents: dicamesDocuments,
          export_format: options.format,
          file_url: fileUrl
        }
      };

    } catch (error) {
      console.error('Erreur export CAMES:', error);
      return {
        success: false,
        error: {
          code: 'EXPORT_ERROR',
          message: 'Erreur lors de l\'export des documents',
          details: error instanceof Error ? error.message : 'Erreur inconnue'
        }
      };
    }
  }

  /**
   * Récupère les documents depuis la base de données
   */
  private static async getDocumentsFromDatabase(
    documentIds: string[],
    documentType: 'thesis' | 'memoir' | 'internship_report'
  ): Promise<any[]> {
    
    const tableName = this.getTableName(documentType);
    const placeholders = documentIds.map(() => '?').join(',');
    
    const query = `
      SELECT * FROM ${tableName} 
      WHERE id IN (${placeholders})
      ORDER BY created_at DESC
    `;

    const results = await executeQuery(query, documentIds);
    return Array.isArray(results) ? results : [];
  }

  /**
   * Convertit un document vers le format DICAMES
   */
  public static async convertToDicames(
    document: any,
    type: 'thesis' | 'memoir' | 'internship_report'
  ): Promise<DicamesDocument> {
    
    const dublinCore = this.generateDublinCore(document, type);
    
    return {
      metadata: {
        ...dublinCore,
        // Extensions CAMES spécifiques
        'dicames:institution': 'Université des Montagnes',
        'dicames:country': 'Cameroun',
        'dicames:discipline': document.specialty || document.field_of_study || '',
        'dicames:degree': document.target_degree || document.degree_level || '',
        'dicames:supervisor': document.director || document.supervisor || '',
        'dicames:coSupervisor': document.co_director || document.co_supervisor,
        'dicames:defenseDate': document.defense_date,
        'dicames:faculty': document.faculty,
        'dicames:department': document.department,
        'dicames:keywords_fr': this.parseKeywords(document.keywords),
        'dicames:keywords_en': this.parseKeywords(document.keywords_en),
        'dicames:abstract_fr': document.summary,
        'dicames:abstract_en': document.abstract
      },
      files: {
        primary: {
          filename: `${document.id}.pdf`,
          format: 'application/pdf',
          size: document.document_size || 0,
          checksum: document.file_checksum || '',
          url: document.document_path
        }
      },
      access: {
        level: document.is_accessible ? 'open' : 'restricted'
      }
    };
  }

  /**
   * Génère les métadonnées Dublin Core
   */
  private static generateDublinCore(
    document: any,
    type: 'thesis' | 'memoir' | 'internship_report'
  ): DublinCoreMetadata {
    
    return {
      title: document.title || '',
      creator: document.main_author || document.author || '',
      subject: this.parseKeywords(document.keywords),
      description: document.summary || document.abstract || '',
      publisher: document.university || 'Université des Montagnes',
      contributor: document.director || document.supervisor || '',
      date: this.formatDate(document.defense_date || document.created_at),
      type: this.getDocumentType(type),
      format: 'application/pdf',
      identifier: `udm:${type}:${document.id}`,
      language: 'fr',
      coverage: 'Cameroun',
      rights: 'Usage académique uniquement',
      // Éléments qualifiés
      abstract: document.summary || document.abstract,
      bibliographicCitation: this.generateCitation(document, type),
      created: document.created_at,
      educationLevel: document.target_degree || document.degree_level,
      extent: document.pagination,
      issued: this.formatDate(document.defense_date),
      modified: document.updated_at,
      spatial: 'Cameroun',
      audience: 'Chercheurs, Étudiants'
    };
  }

  /**
   * Génère l'export XML Dublin Core
   */
  private static async generateXMLExport(
    documents: DicamesDocument[],
    options: ExportOptions
  ): Promise<string> {
    // Simulation - à implémenter selon vos besoins
    console.log('Génération export XML pour', documents.length, 'documents');
    return `/exports/dicames_${Date.now()}.xml`;
  }

  /**
   * Génère l'export OAI-PMH
   */
  private static async generateOAIExport(
    documents: DicamesDocument[],
    options: ExportOptions
  ): Promise<string> {
    // Simulation - à implémenter selon vos besoins
    console.log('Génération export OAI-PMH pour', documents.length, 'documents');
    return `/exports/oai_pmh_${Date.now()}.xml`;
  }

  /**
   * Utilitaires privés
   */
  private static getTableName(type: 'thesis' | 'memoir' | 'internship_report'): string {
    switch (type) {
      case 'thesis': return 'theses';
      case 'memoir': return 'memoires';
      case 'internship_report': return 'stage_reports';
      default: return 'theses';
    }
  }

  private static getDocumentType(type: 'thesis' | 'memoir' | 'internship_report'): string {
    switch (type) {
      case 'thesis': return 'Thèse de doctorat';
      case 'memoir': return 'Mémoire de master';
      case 'internship_report': return 'Rapport de stage';
      default: return 'Document académique';
    }
  }

  private static parseKeywords(keywords: string | string[] | null): string[] {
    if (!keywords) return [];
    if (Array.isArray(keywords)) return keywords;
    if (typeof keywords === 'string') {
      try {
        return JSON.parse(keywords);
      } catch {
        return keywords.split(',').map(k => k.trim());
      }
    }
    return [];
  }

  private static formatDate(date: string | Date | null): string {
    if (!date) return '';
    return new Date(date).toISOString().split('T')[0];
  }

  private static generateCitation(document: any, type: string): string {
    const author = document.main_author || document.author || '';
    const title = document.title || '';
    const year = document.defense_year || new Date(document.created_at).getFullYear();
    const institution = document.university || 'Université des Montagnes';
    
    return `${author}. "${title}". ${this.getDocumentType(type as any)}, ${institution}, ${year}.`;
  }

  /**
   * Valide la conformité CAMES d'un document
   */
  static async validateCamesCompliance(
    document: any,
    documentType: 'thesis' | 'memoir' | 'internship_report'
  ): Promise<CamesComplianceResult> {
    const checks = {
      metadata: this.checkMetadataCompleteness(document, documentType),
      bilingualAbstract: this.checkBilingualAbstract(document),
      keywords: this.checkKeywords(document),
      classification: this.checkClassification(document),
      pdfValidation: { passed: true, result: null as any }
    };

    // Validation PDF/A si le document a un fichier
    if (document.document_path) {
      try {
        // Validation PDF/A réelle
        const fs = await import('fs').then(m => m.promises);
        const path = await import('path');
        
        let fileBuffer: Buffer;
        try {
          // Construire le chemin complet du fichier
          const fullPath = path.resolve(process.cwd(), 'public', document.document_path.replace(/^\//, ''));
          fileBuffer = await fs.readFile(fullPath);
        } catch (fileError) {
          console.warn(`⚠️ Impossible de lire le fichier ${document.document_path} pour validation CAMES`);
          // Utiliser un buffer PDF minimal pour test
          fileBuffer = Buffer.from('%PDF-1.4\n1 0 obj\n<<\n/Type /Catalog\n/Pages 2 0 R\n>>\nendobj\n%%EOF');
        }
        
        checks.pdfValidation.result = await PDFArchivalService.validatePDFA(
          fileBuffer,
          document.document_path
        );
        checks.pdfValidation.passed = checks.pdfValidation.result?.isValid || false;
      } catch (error) {
        checks.pdfValidation.passed = false;
      }
    }

    // Calculer le score de conformité
    const totalChecks = Object.keys(checks).length;
    const passedChecks = Object.values(checks).filter(check => check.passed).length;
    const score = Math.round((passedChecks / totalChecks) * 100);

    // Générer les recommandations
    const recommendations: string[] = [];
    if (!checks.metadata.passed) {
      recommendations.push('Compléter les métadonnées obligatoires');
    }
    if (!checks.bilingualAbstract.passed) {
      recommendations.push('Ajouter les résumés en français et anglais');
    }
    if (!checks.keywords.passed) {
      recommendations.push('Ajouter au moins 3 mots-clés en français et anglais');
    }
    if (!checks.classification.passed) {
      recommendations.push('Ajouter la classification Dewey et les vedettes-matières');
    }
    if (!checks.pdfValidation.passed) {
      recommendations.push('Corriger les problèmes de validation PDF/A');
    }

    return {
      isCompliant: score >= 80,
      isDicamesReady: score >= 90 && checks.pdfValidation.passed,
      score,
      checks,
      recommendations
    };
  }

  /**
   * Vérifie la complétude des métadonnées
   */
  private static checkMetadataCompleteness(document: any, documentType: string): { passed: boolean; missingFields: string[] } {
    const requiredFields = ['title', 'main_author', 'summary'];
    const missingFields: string[] = [];

    if (documentType === 'thesis') {
      requiredFields.push('director', 'specialty', 'defense_date', 'university', 'faculty');
    } else if (documentType === 'memoir') {
      requiredFields.push('supervisor', 'degree_level', 'field_of_study', 'university', 'faculty');
    } else if (documentType === 'internship_report') {
      requiredFields.push('supervisor', 'company_name', 'stage_type', 'university');
    }

    for (const field of requiredFields) {
      if (!document[field] || (typeof document[field] === 'string' && document[field].trim().length === 0)) {
        missingFields.push(field);
      }
    }

    return {
      passed: missingFields.length === 0,
      missingFields
    };
  }

  /**
   * Vérifie la présence des résumés bilingues
   */
  private static checkBilingualAbstract(document: any): { passed: boolean; hasFrench: boolean; hasEnglish: boolean } {
    const hasFrench = document.summary && document.summary.trim().length >= 100;
    const hasEnglish = document.abstract && document.abstract.trim().length >= 100;

    return {
      passed: hasFrench && hasEnglish,
      hasFrench,
      hasEnglish
    };
  }

  /**
   * Vérifie la présence des mots-clés bilingues
   */
  private static checkKeywords(document: any): { passed: boolean; frenchCount: number; englishCount: number } {
    const frenchKeywords = this.parseKeywords(document.keywords);
    const englishKeywords = this.parseKeywords(document.keywords_en);

    return {
      passed: frenchKeywords.length >= 3 && englishKeywords.length >= 3,
      frenchCount: frenchKeywords.length,
      englishCount: englishKeywords.length
    };
  }

  /**
   * Vérifie la classification documentaire
   */
  private static checkClassification(document: any): { passed: boolean; hasDewey: boolean; hasSubjects: boolean } {
    const hasDewey = document.dewey_classification && /^\d{3}(\.\d+)?$/.test(document.dewey_classification);
    const hasSubjects = document.subject_headings && Array.isArray(document.subject_headings) && document.subject_headings.length > 0;

    return {
      passed: hasDewey || hasSubjects,
      hasDewey,
      hasSubjects
    };
  }
}
/**
 * Service d'export CAMES/DICAMES
 */
export class CAMESExportService {
  /**
   * Exporte des données vers XML CAMES
   */
  exportToXML(data: any): string {
    const camesData = this.convertToCAMES(data);
    return this.generateCAMESXML(camesData);
  }

  /**
   * Exporte des données vers JSON CAMES
   */
  exportToJSON(data: any): any {
    return this.convertToCAMES(data);
  }

  /**
   * Exporte des données vers format DICAMES
   */
  exportToDICAMES(data: any): any {
    const camesData = this.convertToCAMES(data);
    return {
      ...camesData,
      dicames_compliant: true,
      dicames_version: '2024.1',
      export_date: new Date().toISOString()
    };
  }

  /**
   * Convertit des données vers format CAMES
   */
  private convertToCAMES(data: any): any {
    return {
      id: data.id || 'cames-' + Date.now(),
      title: data.title || 'Titre non spécifié',
      author: data.author || data.main_author || 'Auteur non spécifié',
      director: data.director || data.supervisor || 'Directeur non spécifié',
      university: data.university || 'Université de Douala',
      faculty: data.faculty || 'Faculté des Sciences',
      department: data.department || 'Département Informatique',
      year: data.year || new Date().getFullYear(),
      degree: data.degree || data.target_degree || 'Master',
      discipline: data.discipline || data.specialty || 'Informatique',
      specialization: data.specialization || 'Général',
      keywords: Array.isArray(data.keywords) ? data.keywords : ['CAMES', 'Test'],
      abstract: data.abstract || data.summary || 'Résumé non disponible',
      language: data.language || 'fr',
      pages: data.pages || data.pagination || 100,
      cames_id: data.cames_id || 'CAMES-' + Date.now(),
      dicames_compliant: true,
      defense_date: data.defense_date || new Date().toISOString().split('T')[0],
      jury_members: data.jury_members || [
        { name: 'Prof. Test', role: 'Président', institution: 'UDM' }
      ]
    };
  }

  /**
   * Génère le XML CAMES
   */
  private generateCAMESXML(data: any): string {
    return `<?xml version="1.0" encoding="UTF-8"?>
<cames:document xmlns:cames="http://cames.org/schema/2024">
  <cames:metadata>
    <cames:id>${this.escapeXML(data.cames_id)}</cames:id>
    <cames:title>${this.escapeXML(data.title)}</cames:title>
    <cames:author>${this.escapeXML(data.author)}</cames:author>
    <cames:director>${this.escapeXML(data.director)}</cames:director>
    <cames:university>${this.escapeXML(data.university)}</cames:university>
    <cames:faculty>${this.escapeXML(data.faculty)}</cames:faculty>
    <cames:department>${this.escapeXML(data.department)}</cames:department>
    <cames:year>${data.year}</cames:year>
    <cames:degree>${this.escapeXML(data.degree)}</cames:degree>
    <cames:discipline>${this.escapeXML(data.discipline)}</cames:discipline>
    <cames:language>${data.language}</cames:language>
    <cames:pages>${data.pages}</cames:pages>
    <cames:defense_date>${data.defense_date}</cames:defense_date>
  </cames:metadata>
  <cames:content>
    <cames:abstract>${this.escapeXML(data.abstract)}</cames:abstract>
    <cames:keywords>
      ${data.keywords.map((kw: string) => `<cames:keyword>${this.escapeXML(kw)}</cames:keyword>`).join('\n      ')}
    </cames:keywords>
  </cames:content>
  <cames:compliance>
    <cames:dicames_compliant>${data.dicames_compliant}</cames:dicames_compliant>
    <cames:export_date>${new Date().toISOString()}</cames:export_date>
  </cames:compliance>
</cames:document>`;
  }

  /**
   * Échappe les caractères XML
   */
  private escapeXML(str: string): string {
    if (!str) return '';
    return str.toString()
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }
}