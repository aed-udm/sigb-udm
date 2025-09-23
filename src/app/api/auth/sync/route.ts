import { NextRequest, NextResponse } from 'next/server';
import { ActiveDirectoryService } from '@/lib/services/active-directory';
import { authenticateRequest } from '@/lib/middleware/auth';

// GET /api/auth/sync - Récupérer le statut de synchronisation AD
export async function GET(request: NextRequest) {
  try {
    console.log('📊 Récupération du statut AD...');

    const adService = new ActiveDirectoryService();
    
    // Récupérer les informations de statut sans authentification stricte pour la démo
    const syncStatus = await adService.getSyncStatus();
    const roleDistribution = await adService.getRoleDistribution();
    const adConfig = {
      server: process.env.AD_SERVER || 'ldap://192.168.192.52',
      domain: process.env.AD_DOMAIN || 'UDM',
      mock_mode: false // Plus de mode mock selon votre .env.local
    };

    return NextResponse.json({
      success: true,
      data: {
        sync_status: syncStatus,
        role_distribution: roleDistribution,
        ad_config: adConfig
      }
    });

  } catch (error) {
    console.error('❌ Erreur GET sync status:', error);
    
    return NextResponse.json(
      { 
        error: { 
          code: 'STATUS_ERROR', 
          message: 'Erreur lors de la récupération du statut',
          details: error instanceof Error ? error.message : 'Erreur inconnue'
        } 
      },
      { status: 500 }
    );
  }
}

// POST /api/auth/sync - Lancer une synchronisation AD

export async function POST(request: NextRequest) {
  try {
    console.log('🔄 Tentative de synchronisation AD...');

    // Récupérer le token depuis les cookies ou headers
    const authHeader = request.headers.get('authorization');
    const cookieToken = request.cookies.get('auth_token')?.value;
    
    let token = null;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7);
    } else if (cookieToken) {
      token = cookieToken;
    }

    console.log('🔍 DEBUG Token - Headers:', {
      authHeader: authHeader ? 'Present (Bearer)' : 'None',
      cookieToken: cookieToken ? 'Present' : 'None',
      finalToken: token ? `${token.substring(0, 20)}...` : 'None'
    });

    if (!token) {
      console.log('❌ Aucun token trouvé dans les headers ou cookies');
      return NextResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'Token d\'authentification requis pour la synchronisation' } },
        { status: 401 }
      );
    }

    // Vérifier le token
    const adService = new ActiveDirectoryService();
    const payload = adService.verifyJWT(token);
    
    console.log('🔍 DEBUG Payload:', {
      valid: !!payload,
      payload: payload ? {
        userId: payload.userId,
        username: payload.username,
        role: payload.role,
        exp: payload.exp,
        iat: payload.iat
      } : null
    });
    
    if (!payload) {
      console.log('❌ Token invalide ou expiré');
      return NextResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'Token invalide ou expiré' } },
        { status: 401 }
      );
    }

    // Vérifier que l'utilisateur est admin
    if (payload.role !== 'admin') {
      return NextResponse.json(
        { error: { code: 'FORBIDDEN', message: 'Seuls les administrateurs peuvent synchroniser AD' } },
        { status: 403 }
      );
    }

    console.log('🔄 Début de la synchronisation AD complète par:', payload.username);

    // Lancer la synchronisation complète avec le VRAI Active Directory
    const syncStats = await adService.syncAllUsersFromAD();

    console.log('✅ Synchronisation AD terminée');
    console.log('📊 Statistiques:', syncStats);

    return NextResponse.json({
      success: true,
      message: 'Synchronisation AD terminée avec succès',
      stats: syncStats,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Erreur API sync:', error);
    
    return NextResponse.json(
      { 
        error: { 
          code: 'SYNC_ERROR', 
          message: 'Erreur lors de la synchronisation',
          details: error instanceof Error ? error.message : 'Erreur inconnue'
        } 
      },
      { status: 500 }
    );
  }
}