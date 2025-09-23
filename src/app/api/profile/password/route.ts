import { NextRequest, NextResponse } from 'next/server';
import { ActiveDirectoryService } from '@/lib/services/active-directory';

// PUT /api/profile/password - Changer le mot de passe de l'utilisateur connecté
export async function PUT(request: NextRequest) {
  try {
    // Récupérer le token depuis les headers
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: { code: 'MISSING_TOKEN', message: 'Token d\'authentification requis' } },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);
    const adService = new ActiveDirectoryService();
    
    // Vérifier le token
    const payload = adService.verifyJWT(token);
    if (!payload) {
      return NextResponse.json(
        { error: { code: 'INVALID_TOKEN', message: 'Token invalide ou expiré' } },
        { status: 401 }
      );
    }

    const { current_password, new_password } = await request.json();

    // Validation des données
    if (!current_password || !new_password) {
      return NextResponse.json(
        { error: { code: 'MISSING_DATA', message: 'Mot de passe actuel et nouveau mot de passe requis' } },
        { status: 400 }
      );
    }

    if (new_password.length < 6) {
      return NextResponse.json(
        { error: { code: 'WEAK_PASSWORD', message: 'Le nouveau mot de passe doit contenir au moins 6 caractères' } },
        { status: 400 }
      );
    }

    // Vérifier le mot de passe actuel en tentant une authentification
    const authResult = await adService.authenticateUser(payload.username, current_password);
    if (!authResult) {
      return NextResponse.json(
        { error: { code: 'INVALID_CURRENT_PASSWORD', message: 'Mot de passe actuel incorrect' } },
        { status: 400 }
      );
    }

    // Tenter de changer le mot de passe dans Active Directory
    try {
      const changeResult = await adService.changeUserPassword(payload.username, current_password, new_password);
      
      if (!changeResult) {
        return NextResponse.json(
          { error: { code: 'PASSWORD_CHANGE_FAILED', message: 'Échec du changement de mot de passe dans Active Directory' } },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        message: 'Mot de passe modifié avec succès'
      });

    } catch (error) {
      console.error('❌ Erreur changement mot de passe AD:', error);
      
      // Pour la démo, on simule le succès si AD n'est pas disponible
      if (error instanceof Error && error.message.includes('ECONNREFUSED')) {
        console.log('⚠️ AD non disponible, simulation du changement de mot de passe');
        
        return NextResponse.json({
          success: true,
          message: 'Mot de passe modifié avec succès (mode simulation)',
          warning: 'Active Directory non disponible - changement simulé'
        });
      }
      
      throw error;
    }

  } catch (error) {
    console.error('❌ Erreur API changement mot de passe:', error);
    
    return NextResponse.json(
      { 
        error: { 
          code: 'PASSWORD_CHANGE_ERROR', 
          message: 'Erreur lors du changement de mot de passe',
          details: error instanceof Error ? error.message : 'Erreur inconnue'
        } 
      },
      { status: 500 }
    );
  }
}
