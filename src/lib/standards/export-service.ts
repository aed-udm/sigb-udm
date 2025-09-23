/**
 * Service d'export en formats standards internationaux
 * Supporte MARC21, Dublin Core, JSON-LD, XML
 */

import { bookToMARC21, marcToXML, validateMARCRecord } from './marc21';
import {
  bookToDublinCore,
  thesisToDublinCore,
  memoireToDublinCore,
  stageReportToDublinCore,
  dublinCoreToXML,
  dublinCoreToJSONLD,
  validateDublinCore,
  type DublinCoreMetadata
} from './dublin-core';

export type ExportFormat = 'marc21-xml' | 'dublin-core-xml' | 'dublin-core-json' | 'json-ld' | 'csv' | 'json';
export type DocumentType = 'book' | 'thesis' | 'memoire' | 'rapport_stage';

export interface ExportOptions {
  format: ExportFormat;
  includeMetadata?: boolean;
  validateBeforeExport?: boolean;
  encoding?: 'UTF-8' | 'ISO-8859-1';
}

export interface ExportResult {
  success: boolean;
  data?: string;
  filename?: string;
  mimeType?: string;
  errors?: string[];
  warnings?: string[];
  recordCount?: number;
}

/**
 * Service principal d'export
 */
export class StandardsExportService {
  
  /**
   * Exporte un seul document
   */
  static async exportSingleDocument(
    document: any, 
    documentType: DocumentType, 
    options: ExportOptions
  ): Promise<ExportResult> {
    try {
      const result = await this.exportDocuments([document], documentType, options);
      return result;
    } catch (error) {
      return {
        success: false,
        errors: [`Erreur lors de l'export: ${error instanceof Error ? error.message : 'Erreur inconnue'}`]
      };
    }
  }
  
  /**
   * Exporte plusieurs documents
   */
  static async exportDocuments(
    documents: any[], 
    documentType: DocumentType, 
    options: ExportOptions
  ): Promise<ExportResult> {
    try {
      const errors: string[] = [];
      const warnings: string[] = [];
      
      if (!documents || documents.length === 0) {
        return {
          success: false,
          errors: ['Aucun document à exporter']
        };
      }
      
      switch (options.format) {
        case 'marc21-xml':
          return await this.exportToMARC21XML(documents, documentType, options);
          
        case 'dublin-core-xml':
          return await this.exportToDublinCoreXML(documents, documentType, options);
          
        case 'dublin-core-json':
        case 'json-ld':
          return await this.exportToDublinCoreJSON(documents, documentType, options);
          
        case 'csv':
          return await this.exportToCSV(documents, documentType, options);
          
        case 'json':
          return await this.exportToJSON(documents, documentType, options);
          
        default:
          return {
            success: false,
            errors: [`Format d'export non supporté: ${options.format}`]
          };
      }
    } catch (error) {
      return {
        success: false,
        errors: [`Erreur lors de l'export: ${error instanceof Error ? error.message : 'Erreur inconnue'}`]
      };
    }
  }
  
  /**
   * Export en MARC21 XML
   */
  private static async exportToMARC21XML(
    documents: any[], 
    documentType: DocumentType, 
    options: ExportOptions
  ): Promise<ExportResult> {
    const errors: string[] = [];
    const warnings: string[] = [];
    const marcRecords: MARCRecord[] = [];
    
    // Convertir chaque document en MARC21
    for (const doc of documents) {
      try {
        if (documentType === 'book') {
          const marcRecord = bookToMARC21(doc);
          
          if (options.validateBeforeExport) {
            const validation = validateMARCRecord(marcRecord);
            if (!validation.valid) {
              errors.push(`Document ${doc.id}: ${validation.errors.join(', ')}`);
              continue;
            }
          }
          
          marcRecords.push(marcRecord);
        } else {
          warnings.push(`Type de document ${documentType} non supporté pour MARC21`);
        }
      } catch (error) {
        errors.push(`Erreur lors de la conversion du document ${doc.id}: ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
      }
    }
    
    if (marcRecords.length === 0) {
      return {
        success: false,
        errors: ['Aucun enregistrement MARC21 valide généré']
      };
    }
    
    // Générer le XML
    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
    xml += '<collection xmlns="http://www.loc.gov/MARC21/slim">\n';
    
    if (options.includeMetadata) {
      xml += '  <!-- Exporté depuis SGB UdM -->\n';
      xml += `  <!-- Date: ${new Date().toISOString()} -->\n`;
      xml += `  <!-- Nombre d'enregistrements: ${marcRecords.length} -->\n`;
    }
    
    marcRecords.forEach(record => {
      const recordXML = marcToXML(record);
      // Retirer la déclaration XML et ajouter l'indentation
      const cleanXML = recordXML.replace(/^<\?xml.*?\?>\n/, '').replace(/^/gm, '  ');
      xml += cleanXML + '\n';
    });
    
    xml += '</collection>';
    
    const timestamp = new Date().toISOString().slice(0, 10);
    const filename = `export_marc21_${timestamp}.xml`;
    
    return {
      success: true,
      data: xml,
      filename,
      mimeType: 'application/xml',
      errors: errors.length > 0 ? errors : undefined,
      warnings: warnings.length > 0 ? warnings : undefined,
      recordCount: marcRecords.length
    };
  }
  
  /**
   * Export en Dublin Core XML
   */
  private static async exportToDublinCoreXML(
    documents: any[], 
    documentType: DocumentType, 
    options: ExportOptions
  ): Promise<ExportResult> {
    const errors: string[] = [];
    const warnings: string[] = [];
    const dcRecords: DublinCoreMetadata[] = [];
    
    // Convertir chaque document en Dublin Core
    for (const doc of documents) {
      try {
        let dcRecord: DublinCoreMetadata;
        
        switch (documentType) {
          case 'book':
            dcRecord = bookToDublinCore(doc);
            break;
          case 'thesis':
            dcRecord = thesisToDublinCore(doc);
            break;
          case 'memoire':
            dcRecord = memoireToDublinCore(doc);
            break;
          case 'rapport_stage':
            dcRecord = memoireToDublinCore(doc); // Même structure que mémoire
            break;
          default:
            warnings.push(`Type de document ${documentType} non reconnu`);
            continue;
        }
        
        if (options.validateBeforeExport) {
          const validation = validateDublinCore(dcRecord);
          if (!validation.valid) {
            errors.push(`Document ${doc.id}: ${validation.errors.join(', ')}`);
            continue;
          }
        }
        
        dcRecords.push(dcRecord);
      } catch (error) {
        errors.push(`Erreur lors de la conversion du document ${doc.id}: ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
      }
    }
    
    if (dcRecords.length === 0) {
      return {
        success: false,
        errors: ['Aucun enregistrement Dublin Core valide généré']
      };
    }
    
    // Générer le XML
    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
    xml += '<collection xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/">\n';
    
    if (options.includeMetadata) {
      xml += '  <!-- Exporté depuis SGB UdM -->\n';
      xml += `  <!-- Date: ${new Date().toISOString()} -->\n`;
      xml += `  <!-- Nombre d'enregistrements: ${dcRecords.length} -->\n`;
    }
    
    dcRecords.forEach(record => {
      const recordXML = dublinCoreToXML(record);
      // Retirer la déclaration XML et ajouter l'indentation
      const cleanXML = recordXML.replace(/^<\?xml.*?\?>\n/, '').replace(/^/gm, '  ');
      xml += cleanXML + '\n';
    });
    
    xml += '</collection>';
    
    const timestamp = new Date().toISOString().slice(0, 10);
    const filename = `export_dublin_core_${timestamp}.xml`;
    
    return {
      success: true,
      data: xml,
      filename,
      mimeType: 'application/xml',
      errors: errors.length > 0 ? errors : undefined,
      warnings: warnings.length > 0 ? warnings : undefined,
      recordCount: dcRecords.length
    };
  }
  
  /**
   * Export en Dublin Core JSON / JSON-LD
   */
  private static async exportToDublinCoreJSON(
    documents: any[], 
    documentType: DocumentType, 
    options: ExportOptions
  ): Promise<ExportResult> {
    const errors: string[] = [];
    const warnings: string[] = [];
    const dcRecords: any[] = [];
    
    // Convertir chaque document
    for (const doc of documents) {
      try {
        let dcRecord: DublinCoreMetadata;
        
        switch (documentType) {
          case 'book':
            dcRecord = bookToDublinCore(doc);
            break;
          case 'thesis':
            dcRecord = thesisToDublinCore(doc);
            break;
          case 'memoire':
            dcRecord = memoireToDublinCore(doc);
            break;
          case 'rapport_stage':
            dcRecord = stageReportToDublinCore(doc);
            break;
          default:
            warnings.push(`Type de document ${documentType} non reconnu`);
            continue;
        }
        
        if (options.validateBeforeExport) {
          const validation = validateDublinCore(dcRecord);
          if (!validation.valid) {
            errors.push(`Document ${doc.id}: ${validation.errors.join(', ')}`);
            continue;
          }
        }
        
        const jsonRecord = options.format === 'json-ld' 
          ? dublinCoreToJSONLD(dcRecord)
          : dcRecord;
          
        dcRecords.push(jsonRecord);
      } catch (error) {
        errors.push(`Erreur lors de la conversion du document ${doc.id}: ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
      }
    }
    
    if (dcRecords.length === 0) {
      return {
        success: false,
        errors: ['Aucun enregistrement valide généré']
      };
    }
    
    // Générer le JSON
    const exportData = {
      "@context": options.format === 'json-ld' ? {
        "dc": "http://purl.org/dc/elements/1.1/",
        "dcterms": "http://purl.org/dc/terms/"
      } : undefined,
      metadata: options.includeMetadata ? {
        exportDate: new Date().toISOString(),
        source: "SGB UdM",
        recordCount: dcRecords.length,
        format: options.format
      } : undefined,
      records: dcRecords
    };
    
    const timestamp = new Date().toISOString().slice(0, 10);
    const filename = `export_dublin_core_${timestamp}.json`;
    
    return {
      success: true,
      data: JSON.stringify(exportData, null, 2),
      filename,
      mimeType: 'application/json',
      errors: errors.length > 0 ? errors : undefined,
      warnings: warnings.length > 0 ? warnings : undefined,
      recordCount: dcRecords.length
    };
  }
  
  /**
   * Export en CSV (format existant amélioré)
   */
  private static async exportToCSV(
    documents: any[], 
    documentType: DocumentType, 
    options: ExportOptions
  ): Promise<ExportResult> {
    // Utiliser l'export CSV existant mais avec métadonnées standards
    const timestamp = new Date().toISOString().slice(0, 10);
    const filename = `export_${documentType}_${timestamp}.csv`;
    
    // Ici on pourrait améliorer l'export CSV existant
    // Pour l'instant, on retourne un format basique
    const headers = documentType === 'book' 
      ? ['ID', 'Titre', 'Auteur', 'Éditeur', 'Année', 'ISBN', 'Domaine']
      : ['ID', 'Titre', 'Auteur', 'Directeur', 'Université', 'Année', 'Type'];
    
    const rows = documents.map(doc => {
      if (documentType === 'book') {
        return [
          doc.id || '',
          `"${(doc.title || '').replace(/"/g, '""')}"`,
          `"${(doc.main_author || '').replace(/"/g, '""')}"`,
          `"${(doc.publisher || '').replace(/"/g, '""')}"`,
          doc.publication_year || '',
          doc.isbn || '',
          `"${(doc.domain || '').replace(/"/g, '""')}"`
        ];
      } else {
        return [
          doc.id || '',
          `"${(doc.title || '').replace(/"/g, '""')}"`,
          `"${(doc.main_author || '').replace(/"/g, '""')}"`,
          `"${(doc.director || doc.supervisor || '').replace(/"/g, '""')}"`,
          `"${(doc.university || '').replace(/"/g, '""')}"`,
          doc.defense_year || new Date(doc.defense_date || '').getFullYear() || '',
          documentType
        ];
      }
    });
    
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');
    
    return {
      success: true,
      data: csvContent,
      filename,
      mimeType: 'text/csv',
      recordCount: documents.length
    };
  }
  
  /**
   * Export en JSON (format existant)
   */
  private static async exportToJSON(
    documents: any[], 
    documentType: DocumentType, 
    options: ExportOptions
  ): Promise<ExportResult> {
    const exportData = {
      metadata: options.includeMetadata ? {
        exportDate: new Date().toISOString(),
        source: "SGB UdM",
        recordCount: documents.length,
        documentType
      } : undefined,
      documents
    };
    
    const timestamp = new Date().toISOString().slice(0, 10);
    const filename = `export_${documentType}_${timestamp}.json`;
    
    return {
      success: true,
      data: JSON.stringify(exportData, null, 2),
      filename,
      mimeType: 'application/json',
      recordCount: documents.length
    };
  }
}
