import { NextRequest, NextResponse } from 'next/server';
import { ActiveDirectoryService } from '@/lib/services/active-directory';
import { SecureAuthManager } from '@/lib/auth/secure-auth';

export async function POST(request: NextRequest) {
  try {
    const { username, password } = await request.json();

    // Validation des entrées
    if (!username || !password) {
      return NextResponse.json(
        { error: { code: 'MISSING_CREDENTIALS', message: 'Nom d\'utilisateur et mot de passe requis' } },
        { status: 400 }
      );
    }

    console.log(`🔐 Tentative de connexion pour: ${username}`);

    // Initialiser le service AD
    const adService = new ActiveDirectoryService();

    // Processus de connexion complet
    const loginResult = await adService.login(username, password);

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