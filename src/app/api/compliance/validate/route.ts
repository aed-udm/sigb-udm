import { NextRequest, NextResponse } from 'next/server';
import { ComplianceService } from '@/lib/services/compliance-service';

/**
 * API centralisée pour la validation CAMES/DICAMES
 * POST /api/compliance/validate
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { document_id, document_type, action } = body;

    // Validation des paramètres
    if (!document_id) {
      return NextResponse.json({
        success: false,
        message: 'ID du document requis'
      }, { status: 400 });
    }

    switch (action) {
      case 'validate_single':
        // Validation d'un seul document
        const result = await ComplianceService.validateDocument(
          document_id, 
          document_type || 'thesis'
        );
        
        return NextResponse.json({
          success: true,
          data: result,
          message: result.isCompliant ? 
            'Document conforme aux standards CAMES/DICAMES' : 
            'Document non conforme - corrections nécessaires'
        });

      case 'validate_bulk':
        // Validation en lot
        const { document_ids } = body;
        if (!Array.isArray(document_ids)) {
          return NextResponse.json({
            success: false,
            message: 'Liste des IDs de documents requise'
          }, { status: 400 });
        }

        const bulkResults = await ComplianceService.bulkValidation(document_ids);
        
        return NextResponse.json({
          success: true,
          data: bulkResults,
          message: `Validation de ${document_ids.length} documents terminée`
        });

      case 'export_dicames':
        // Export vers DICAMES
        const { document_ids: exportIds } = body;
        if (!Array.isArray(exportIds)) {
          return NextResponse.json({
            success: false,
            message: 'Liste des IDs de documents requise pour l\'export'
          }, { status: 400 });
        }

        const exportResult = await ComplianceService.exportToDicames(exportIds);
        
        return NextResponse.json({
          success: exportResult.success,
          data: exportResult.results,
          message: exportResult.message
        });

      case 'generate_report':
        // Génération de rapport complet
        const reportResult = await ComplianceService.generateComplianceReport();
        
        return NextResponse.json({
          success: reportResult.success,
          data: reportResult.data,
          message: reportResult.success ? 
            'Rapport de conformité généré avec succès' : 
            'Erreur lors de la génération du rapport'
        });

      default:
        return NextResponse.json({
          success: false,
          message: 'Action non reconnue. Actions disponibles: validate_single, validate_bulk, export_dicames, generate_report'
        }, { status: 400 });
    }

  } catch (error) {
    console.error('Erreur API compliance/validate:', error);
    
    return NextResponse.json({
      success: false,
      message: 'Erreur interne du serveur',
      error: error instanceof Error ? error.message : 'Erreur inconnue'
    }, { status: 500 });
  }
}

/**
 * GET /api/compliance/validate - Obtenir le statut de conformité
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const documentId = searchParams.get('document_id');
    const action = searchParams.get('action') || 'status';

    switch (action) {
      case 'status':
        if (!documentId) {
          return NextResponse.json({
            success: false,
            message: 'ID du document requis'
          }, { status: 400 });
        }

        // Obtenir le statut de conformité d'un document
        const status = await ComplianceService.validateDocument(documentId, 'thesis');
        
        return NextResponse.json({
          success: true,
          data: {
            document_id: documentId,
            compliance_status: status,
            last_checked: new Date().toISOString()
          }
        });

      case 'system_status':
        // Statut global du système de conformité
        return NextResponse.json({
          success: true,
          data: {
            system_status: 'operational',
            services: {
              metadata_validation: 'active',
              pdfa_validation: 'active',
              bilingual_validation: 'active',
              export_services: 'active',
              dicames_connection: 'active'
            },
            last_updated: new Date().toISOString()
          }
        });

      default:
        return NextResponse.json({
          success: false,
          message: 'Action non reconnue. Actions disponibles: status, system_status'
        }, { status: 400 });
    }

  } catch (error) {
    console.error('Erreur GET compliance/validate:', error);
    
    return NextResponse.json({
      success: false,
      message: 'Erreur lors de la récupération du statut',
      error: error instanceof Error ? error.message : 'Erreur inconnue'
    }, { status: 500 });
  }
}
