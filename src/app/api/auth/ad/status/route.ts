/**
 * API pour le statut Active Directory - SIGB UdM
 * Endpoint: /api/auth/ad/status
 */

import { NextRequest, NextResponse } from 'next/server';
import { ActiveDirectoryService } from '@/lib/services/active-directory';

// GET /api/auth/ad/status - Récupérer le statut du service AD
export async function GET(request: NextRequest) {
  try {
    console.log('📊 Récupération du statut AD...');

    const adService = new ActiveDirectoryService();
    
    // Récupérer les informations de statut
    const syncStatus = await adService.getSyncStatus();
    const roleDistribution = await adService.getRoleDistribution();
    const adConfig = {
      server: process.env.AD_SERVER || 'ldap://192.168.192.52',
      domain: process.env.AD_DOMAIN || 'UDM',
      mock_mode: process.env.AD_MOCK_MODE === 'true'
    };

    return NextResponse.json({
      success: true,
      available: true,
      mockMode: adConfig.mock_mode,
      message: 'Service Active Directory opérationnel',
      data: {
        sync_status: syncStatus,
        role_distribution: roleDistribution,
        ad_config: adConfig
      }
    });

  } catch (error) {
    console.error('❌ Erreur GET AD status:', error);
    
    return NextResponse.json({
      success: false,
      available: false,
      mockMode: true,
      message: 'Service Active Directory non disponible - Mode dégradé',
      error: { 
        code: 'AD_STATUS_ERROR', 
        message: 'Erreur lors de la récupération du statut AD',
        details: error instanceof Error ? error.message : 'Erreur inconnue'
      }
    }, { status: 500 });
  }
}
