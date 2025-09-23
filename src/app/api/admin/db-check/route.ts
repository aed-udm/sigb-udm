import { NextRequest, NextResponse } from 'next/server';
import { executeQuery } from '@/lib/mysql';

// API pour vérifier la structure de la table synced_users
export async function GET(request: NextRequest) {
  try {
    console.log('🔍 Vérification structure table synced_users...');

    // Décrire la structure de la table
    const tableStructure = await executeQuery('DESCRIBE synced_users');
    
    // Compter les utilisateurs existants
    const userCount = await executeQuery('SELECT COUNT(*) as count FROM synced_users');
    
    // Quelques exemples d'utilisateurs s'il y en a
    const sampleUsers = await executeQuery('SELECT id, ad_username, email, role, is_active FROM synced_users LIMIT 3');

    return NextResponse.json({
      success: true,
      data: {
        tableStructure,
        userCount: userCount[0]?.count || 0,
        sampleUsers,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('❌ Erreur vérification table:', error);
    
    return NextResponse.json(
      { 
        error: { 
          code: 'TABLE_CHECK_ERROR', 
          message: 'Erreur lors de la vérification de la table',
          details: error instanceof Error ? error.message : 'Erreur inconnue'
        } 
      },
      { status: 500 }
    );
  }
}