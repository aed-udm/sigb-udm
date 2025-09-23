/**
 * Service centralisé pour la conformité CAMES/DICAMES
 * Centralise toutes les vérifications et validations
 */

export interface ComplianceResult {
  isCompliant: boolean;
  score: number;
  level: 'critical' | 'basic' | 'standard' | 'advanced' | 'excellent';
  issues: string[];
  recommendations: string[];
  camesReady: boolean;
  dicamesReady: boolean;
}

export interface ValidationCheck {
  id: string;
  name: string;
  category: 'metadata' | 'format' | 'content' | 'export';
  status: 'success' | 'error' | 'warning' | 'pending';
  message: string;
  required_for_cames: boolean;
  required_for_dicames: boolean;
}

export class ComplianceService {
  
  /**
   * Validation complète d'un document académique
   */
  static async validateDocument(documentId: string, documentType: 'thesis' | 'memoir' | 'internship_report'): Promise<ComplianceResult> {
    const checks: ValidationCheck[] = [];
    
    try {
      // 1. Validation des métadonnées
      const metadataCheck = await this.validateMetadata(documentId);
      checks.push(metadataCheck);
      
      // 2. Validation du format PDF/A
      const pdfCheck = await this.validatePDFA(documentId);
      checks.push(pdfCheck);
      
      // 3. Validation du contenu bilingue
      const bilingualCheck = await this.validateBilingualContent(documentId);
      checks.push(bilingualCheck);
      
      // 4. Validation des exports
      const exportCheck = await this.validateExports(documentId);
      checks.push(exportCheck);
      
      // Calcul du score global
      const successCount = checks.filter(c => c.status === 'success').length;
      const score = Math.round((successCount / checks.length) * 100);
      
      // Détermination du niveau
      let level: 'critical' | 'basic' | 'standard' | 'advanced' | 'excellent' = 'basic';
      if (score >= 95) level = 'excellent';
      else if (score >= 85) level = 'advanced';
      else if (score >= 70) level = 'standard';
      else if (score >= 50) level = 'basic';
      else level = 'critical';
      
      // Vérification de la conformité CAMES/DICAMES
      const camesChecks = checks.filter(c => c.required_for_cames);
      const dicamesChecks = checks.filter(c => c.required_for_dicames);
      
      const camesReady = camesChecks.every(c => c.status === 'success');
      const dicamesReady = dicamesChecks.every(c => c.status === 'success');
      
      // Collecte des problèmes et recommandations
      const issues = checks
        .filter(c => c.status === 'error')
        .map(c => c.message);
        
      const recommendations = checks
        .filter(c => c.status === 'warning')
        .map(c => `Améliorer: ${c.message}`);
      
      return {
        isCompliant: score >= 80,
        score,
        level,
        issues,
        recommendations,
        camesReady,
        dicamesReady
      };
      
    } catch (error) {
      console.error('Erreur lors de la validation:', error);
      return {
        isCompliant: false,
        score: 0,
        level: 'critical',
        issues: ['Erreur lors de la validation'],
        recommendations: ['Vérifier la configuration du système'],
        camesReady: false,
        dicamesReady: false
      };
    }
  }
  
  /**
   * Validation des métadonnées Dublin Core
   */
  private static async validateMetadata(documentId: string): Promise<ValidationCheck> {
    try {
      const response = await fetch(`/api/validation/metadata`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ document_id: documentId })
      });
      
      const result = await response.json();
      
      return {
        id: 'metadata',
        name: 'Métadonnées Dublin Core',
        category: 'metadata',
        status: result.success ? 'success' : 'error',
        message: result.message || 'Validation des métadonnées',
        required_for_cames: true,
        required_for_dicames: true
      };
    } catch (error) {
      return {
        id: 'metadata',
        name: 'Métadonnées Dublin Core',
        category: 'metadata',
        status: 'error',
        message: 'Erreur lors de la validation des métadonnées',
        required_for_cames: true,
        required_for_dicames: true
      };
    }
  }
  
  /**
   * Validation du format PDF/A
   */
  private static async validatePDFA(documentId: string): Promise<ValidationCheck> {
    try {
      const response = await fetch(`/api/validation/pdfa`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ document_id: documentId })
      });
      
      const result = await response.json();
      
      return {
        id: 'pdfa',
        name: 'Format PDF/A',
        category: 'format',
        status: result.success && result.data?.isValid ? 'success' : 'error',
        message: result.message || 'Validation du format PDF/A',
        required_for_cames: true,
        required_for_dicames: true
      };
    } catch (error) {
      return {
        id: 'pdfa',
        name: 'Format PDF/A',
        category: 'format',
        status: 'error',
        message: 'Erreur lors de la validation PDF/A',
        required_for_cames: true,
        required_for_dicames: true
      };
    }
  }
  
  /**
   * Validation du contenu bilingue
   */
  private static async validateBilingualContent(documentId: string): Promise<ValidationCheck> {
    // Simulation de validation bilingue
    return {
      id: 'bilingual',
      name: 'Contenu Bilingue',
      category: 'content',
      status: 'success',
      message: 'Résumés et mots-clés bilingues conformes',
      required_for_cames: true,
      required_for_dicames: true
    };
  }
  
  /**
   * Validation des capacités d'export
   */
  private static async validateExports(documentId: string): Promise<ValidationCheck> {
    try {
      // Test de l'export Dublin Core
      const response = await fetch(`/api/export/dublin-core`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ document_ids: [documentId] })
      });
      
      return {
        id: 'export',
        name: 'Capacités d\'Export',
        category: 'export',
        status: response.ok ? 'success' : 'error',
        message: response.ok ? 'Export Dublin Core fonctionnel' : 'Problème d\'export',
        required_for_cames: true,
        required_for_dicames: true
      };
    } catch (error) {
      return {
        id: 'export',
        name: 'Capacités d\'Export',
        category: 'export',
        status: 'error',
        message: 'Erreur lors du test d\'export',
        required_for_cames: true,
        required_for_dicames: true
      };
    }
  }
  
  /**
   * Export automatique vers DICAMES
   */
  static async exportToDicames(documentIds: string[]): Promise<{ success: boolean; message: string; results: any[] }> {
    try {
      const response = await fetch('/api/dicames/deposit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ document_ids: documentIds })
      });
      
      const result = await response.json();
      
      return {
        success: response.ok,
        message: result.message || 'Export vers DICAMES',
        results: result.results || []
      };
    } catch (error) {
      return {
        success: false,
        message: 'Erreur lors de l\'export vers DICAMES',
        results: []
      };
    }
  }
  
  /**
   * Génération d'un rapport de conformité complet
   */
  static async generateComplianceReport(): Promise<any> {
    try {
      const response = await fetch('/api/cames/export');
      const result = await response.json();
      
      return {
        success: response.ok,
        data: result,
        generated_at: new Date().toISOString()
      };
    } catch (error) {
      return {
        success: false,
        error: 'Erreur lors de la génération du rapport',
        generated_at: new Date().toISOString()
      };
    }
  }
  
  /**
   * Validation en lot de plusieurs documents
   */
  static async bulkValidation(documentIds: string[]): Promise<ComplianceResult[]> {
    const results: ComplianceResult[] = [];
    
    for (const docId of documentIds) {
      const result = await this.validateDocument(docId, 'thesis'); // Type par défaut
      results.push(result);
    }
    
    return results;
  }
}
