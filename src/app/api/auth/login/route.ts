import { NextRequest, NextResponse } from 'next/server';
import { ActiveDirectoryService } from '@/lib/services/active-directory';
import { sanitizeInput, containsSQLInjection } from '@/lib/utils';
import { SecureAuthManager } from '@/lib/auth/secure-auth';

export async function POST(request: NextRequest) {
  try {
    const { username, password } = await request.json();

    // Validation et sécurisation des entrées
    if (!username || !password) {
      return NextResponse.json(
        { error: { code: 'MISSING_CREDENTIALS', message: 'Nom d\'utilisateur et mot de passe requis' } },
        { status: 400 }
      );
    }

    // Nettoyer les entrées pour prévenir les attaques
    const cleanUsername = sanitizeInput(username);
    const cleanPassword = password; // Ne pas modifier le mot de passe

    // Vérifier les tentatives d'injection
    if (containsSQLInjection(cleanUsername)) {
      console.warn('🚨 Tentative d\'injection SQL détectée:', cleanUsername);
      return NextResponse.json(
        { error: { code: 'INVALID_INPUT', message: 'Format d\'entrée invalide' } },
        { status: 400 }
      );
    }

    // Validation de la longueur pour prévenir les attaques par déni de service
    if (cleanUsername.length > 100 || cleanPassword.length > 100) {
      return NextResponse.json(
        { error: { code: 'INPUT_TOO_LONG', message: 'Entrées trop longues' } },
        { status: 400 }
      );
    }

    console.log(`🔐 Tentative de connexion pour: ${cleanUsername}`);

    // Initialiser le service AD
    const adService = new ActiveDirectoryService();

    // Processus de connexion complet avec entrées nettoyées
    const loginResult = await adService.login(cleanUsername, cleanPassword);

    if (!loginResult) {
      return NextResponse.json(
        { error: { code: 'INVALID_CREDENTIALS', message: 'Identifiants invalides ou utilisateur inactif' } },
        { status: 401 }
      );
    }

    const { user, token } = loginResult;

    console.log(`✅ Connexion réussie pour: ${user.ad_username} (${user.role})`);

    // Retourner les informations utilisateur et le token
    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        username: user.ad_username,
        email: user.email,
        fullName: user.full_name,
        role: user.role,
        department: user.department,
        position: user.position,
        isActive: user.is_active === 1
      },
      token
    });

  } catch (error) {
    console.error('❌ Erreur API login:', error);
    
    return NextResponse.json(
      { 
        error: { 
          code: 'LOGIN_ERROR', 
          message: 'Erreur lors de la connexion',
          details: error instanceof Error ? error.message : 'Erreur inconnue'
        } 
      },
      { status: 500 }
    );
  }
}