import { NextRequest, NextResponse } from 'next/server';
import { ActiveDirectoryService } from '@/lib/services/active-directory';

export async function POST(request: NextRequest) {
  try {
    const { token } = await request.json();

    if (!token) {
      return NextResponse.json(
        { error: { code: 'MISSING_TOKEN', message: 'Token requis' } },
        { status: 400 }
      );
    }

    // Initialiser le service AD
    const adService = new ActiveDirectoryService();

    // Vérifier le token
    const payload = adService.verifyJWT(token);

    if (!payload) {
      return NextResponse.json(
        { error: { code: 'INVALID_TOKEN', message: 'Token invalide ou expiré' } },
        { status: 401 }
      );
    }

    // Retourner les informations utilisateur
    return NextResponse.json({
      success: true,
      user: {
        id: payload.userId,
        username: payload.username,
        email: payload.email,
        fullName: payload.fullName,
        role: payload.role,
        isActive: payload.isActive
      }
    });

  } catch (error) {
    console.error('❌ Erreur API verify:', error);
    
    return NextResponse.json(
      { 
        error: { 
          code: 'VERIFY_ERROR', 
          message: 'Erreur lors de la vérification du token',
          details: error instanceof Error ? error.message : 'Erreur inconnue'
        } 
      },
      { status: 500 }
    );
  }
}