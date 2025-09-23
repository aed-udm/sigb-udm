import { NextRequest, NextResponse } from 'next/server';
import { executeQuery } from '@/lib/mysql';

export async function POST(request: NextRequest) {
  try {
    const { userId } = await request.json();

    if (userId) {
      // Mettre à jour la date de dernière déconnexion
      await executeQuery(
        'UPDATE synced_users SET last_logout = NOW() WHERE id = ?',
        [userId]
      );

      console.log(`👋 Déconnexion utilisateur: ${userId}`);
    }

    return NextResponse.json({
      success: true,
      message: 'Déconnexion réussie'
    });

  } catch (error) {
    console.error('❌ Erreur API logout:', error);
    
    return NextResponse.json(
      { 
        error: { 
          code: 'LOGOUT_ERROR', 
          message: 'Erreur lors de la déconnexion',
          details: error instanceof Error ? error.message : 'Erreur inconnue'
        } 
      },
      { status: 500 }
    );
  }
}