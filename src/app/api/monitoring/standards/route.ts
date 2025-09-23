/**
 * API Route: /api/monitoring/standards
 * Monitoring et métriques de performance des standards bibliographiques
 */

import { NextRequest, NextResponse } from 'next/server';
import { StandardsMonitoringService } from '@/lib/services/standards-monitoring-service';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const service = searchParams.get('service');
    const metric = searchParams.get('metric');
    const period = searchParams.get('period') || '24h';

    // Si un service spécifique est demandé
    if (service) {
      return await getServiceMetrics(service, metric, period);
    }

    // Sinon, retourner toutes les métriques
    const metrics = await StandardsMonitoringService.getAllMetrics();
    const alerts = await StandardsMonitoringService.getActiveAlerts();

    return NextResponse.json({
      success: true,
      data: {
        metrics,
        alerts,
        lastUpdated: new Date().toISOString(),
        period
      }
    });

  } catch (error) {
    console.error('Erreur API /api/monitoring/standards:', error);
    
    return NextResponse.json({
      success: false,
      error: {
        code: 'MONITORING_ERROR',
        message: 'Erreur lors de la récupération des métriques',
        details: process.env.NODE_ENV === 'development' ? error : undefined
      }
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { service, metric, value, metadata } = body;

    if (!service || !metric || value === undefined) {
      return NextResponse.json({
        success: false,
        error: {
          code: 'INVALID_INPUT',
          message: 'Service, métrique et valeur requis'
        }
      }, { status: 400 });
    }

    // Enregistrer la métrique
    await StandardsMonitoringService.recordMetric(service, metric, value, metadata);

    // Invalider le cache pour forcer la mise à jour
    StandardsMonitoringService.invalidateCache();

    return NextResponse.json({
      success: true,
      data: {
        message: 'Métrique enregistrée avec succès',
        service,
        metric,
        value,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Erreur API POST /api/monitoring/standards:', error);
    
    return NextResponse.json({
      success: false,
      error: {
        code: 'MONITORING_ERROR',
        message: 'Erreur lors de l\'enregistrement de la métrique',
        details: process.env.NODE_ENV === 'development' ? error : undefined
      }
    }, { status: 500 });
  }
}

/**
 * Obtient les métriques d'un service spécifique
 */
async function getServiceMetrics(service: string, metric: string | null, period: string) {
  const allMetrics = await StandardsMonitoringService.getAllMetrics();
  
  let serviceData;
  
  switch (service.toLowerCase()) {
    case 'oai-pmh':
      serviceData = allMetrics.oaiPmh;
      break;
    case 'pdf-validation':
      serviceData = allMetrics.pdfValidation;
      break;
    case 'cames-export':
      serviceData = allMetrics.camesExport;
      break;
    case 'z3950':
      serviceData = allMetrics.z3950;
      break;
    case 'dublin-core':
      serviceData = allMetrics.dublinCore;
      break;
    case 'marc21':
      serviceData = allMetrics.marc21;
      break;
    case 'performance':
      serviceData = allMetrics.performance;
      break;
    case 'compliance':
      serviceData = allMetrics.compliance;
      break;
    default:
      return NextResponse.json({
        success: false,
        error: {
          code: 'INVALID_SERVICE',
          message: `Service non reconnu: ${service}`,
          availableServices: ['oai-pmh', 'pdf-validation', 'cames-export', 'z3950', 'dublin-core', 'marc21', 'performance', 'compliance']
        }
      }, { status: 400 });
  }

  // Si une métrique spécifique est demandée
  if (metric && serviceData && typeof serviceData === 'object') {
    const metricValue = (serviceData as any)[metric];
    if (metricValue === undefined) {
      return NextResponse.json({
        success: false,
        error: {
          code: 'INVALID_METRIC',
          message: `Métrique non trouvée: ${metric}`,
          availableMetrics: Object.keys(serviceData)
        }
      }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      data: {
        service,
        metric,
        value: metricValue,
        period,
        timestamp: new Date().toISOString()
      }
    });
  }

  return NextResponse.json({
    success: true,
    data: {
      service,
      metrics: serviceData,
      period,
      timestamp: new Date().toISOString()
    }
  });
}