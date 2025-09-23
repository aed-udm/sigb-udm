import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { executeQuery } from '@/lib/mysql';

// Vérification du token JWT pour les routes admin
const verifyAdminToken = (request: NextRequest) => {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.substring(7);
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key') as any;
    return decoded;
  } catch (error) {
    return null;
  }
};

// DELETE - Supprimer un utilisateur synchronisé
export async function DELETE(request: NextRequest, { params }: { params: { userId: string } }) {
  try {
    // Vérifier l'authentification
    const user = verifyAdminToken(request);
    if (!user) {
      return NextResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'Token d\'authentification invalide' } },
        { status: 401 }
      );
    }

    // Vérifier que l'utilisateur a les permissions admin
    if (user.role !== 'admin') {
      return NextResponse.json(
        { error: { code: 'FORBIDDEN', message: 'Seuls les administrateurs peuvent supprimer des utilisateurs' } },
        { status: 403 }
      );
    }

    const { userId } = params;

    if (!userId) {
      return NextResponse.json(
        { error: { code: 'INVALID_INPUT', message: 'userId est requis' } },
        { status: 400 }
      );
    }

    console.log(`🗑️ Suppression de l'utilisateur ${userId}...`);

    // Vérifier que l'utilisateur existe
    const existingUser = await executeQuery(
      'SELECT id, ad_username, full_name, role FROM synced_users WHERE id = ?',
      [userId]
    );

    if (!existingUser || existingUser.length === 0) {
      return NextResponse.json(
        { error: { code: 'USER_NOT_FOUND', message: 'Utilisateur introuvable' } },
        { status: 404 }
      );
    }

    const userToDelete = existingUser[0];

    // Empêcher la suppression du dernier administrateur
    if (userToDelete.role === 'admin') {
      const adminCount = await executeQuery(
        'SELECT COUNT(*) as count FROM synced_users WHERE role = "admin" AND is_active = 1'
      );
      
      if (adminCount[0]?.count <= 1) {
        return NextResponse.json(
          { error: { code: 'CANNOT_DELETE_LAST_ADMIN', message: 'Impossible de supprimer le dernier administrateur' } },
          { status: 400 }
        );
      }
    }

    // Supprimer l'utilisateur
    const deleteResult = await executeQuery(
      'DELETE FROM synced_users WHERE id = ?',
      [userId]
    );

    console.log(`✅ Utilisateur ${userToDelete.ad_username} (${userToDelete.full_name}) supprimé avec succès`);

    return NextResponse.json({
      success: true,
      message: `Utilisateur ${userToDelete.full_name || userToDelete.ad_username} supprimé avec succès`,
      data: {
        deletedUser: {
          id: userToDelete.id,
          username: userToDelete.ad_username,
          fullName: userToDelete.full_name,
          role: userToDelete.role
        },
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('❌ Erreur suppression utilisateur:', error);
    
    return NextResponse.json(
      { 
        error: { 
          code: 'DELETE_USER_ERROR', 
          message: 'Erreur lors de la suppression de l\'utilisateur',
          details: error instanceof Error ? error.message : 'Erreur inconnue'
        } 
      },
      { status: 500 }
    );
  }
}
