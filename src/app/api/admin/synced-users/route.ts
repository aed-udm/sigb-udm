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

// GET - Récupérer tous les utilisateurs synchronisés
export async function GET(request: NextRequest) {
  try {
    // Vérifier l'authentification
    const user = verifyAdminToken(request);
    if (!user) {
      return NextResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'Token d\'authentification invalide' } },
        { status: 401 }
      );
    }

    console.log('📋 Récupération des utilisateurs synchronisés...');

    // Récupérer tous les utilisateurs synchronisés avec leurs informations détaillées
    const users = await executeQuery(`
      SELECT 
        id,
        ad_username,
        email,
        full_name,
        role,
        department,
        position,
        is_active,
        manual_role_override,
        last_login,
        last_sync,
        created_at,
        updated_at
      FROM synced_users 
      ORDER BY 
        CASE role 
          WHEN 'admin' THEN 1
          WHEN 'bibliothecaire' THEN 2
          WHEN 'circulation' THEN 3
          WHEN 'enregistrement' THEN 4
          WHEN 'etudiant' THEN 5
          ELSE 6
        END,
        full_name ASC
    `);

    console.log(`✅ ${users.length} utilisateurs trouvés`);

    return NextResponse.json({
      success: true,
      data: {
        users,
        total: users.length,
        active: users.filter((u: any) => u.is_active).length,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('❌ Erreur récupération utilisateurs:', error);
    
    return NextResponse.json(
      { 
        error: { 
          code: 'FETCH_USERS_ERROR', 
          message: 'Erreur lors de la récupération des utilisateurs',
          details: error instanceof Error ? error.message : 'Erreur inconnue'
        } 
      },
      { status: 500 }
    );
  }
}

// PUT - Mettre à jour le rôle d'un utilisateur
export async function PUT(request: NextRequest) {
  try {
    // Vérifier l'authentification
    const user = verifyAdminToken(request);
    if (!user) {
      return NextResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'Token d\'authentification invalide' } },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { userId, role } = body;

    if (!userId || !role) {
      return NextResponse.json(
        { error: { code: 'INVALID_INPUT', message: 'userId et role sont requis' } },
        { status: 400 }
      );
    }

    // Valider le rôle
    const validRoles = ['admin', 'bibliothecaire', 'circulation', 'enregistrement', 'etudiant'];
    if (!validRoles.includes(role)) {
      return NextResponse.json(
        { error: { code: 'INVALID_ROLE', message: 'Rôle invalide' } },
        { status: 400 }
      );
    }

    console.log(`🔄 Mise à jour du rôle utilisateur ${userId} vers ${role}...`);

    // Récupérer les permissions par défaut pour le nouveau rôle
    const getDefaultPermissions = (userRole: string) => {
      switch (userRole) {
        case 'admin':
          return {
            books: { view: true, create: true, edit: true, delete: true, manage_copies: true },
            users: { view: true, create: true, edit: true, delete: true, manage_roles: true },
            loans: { view: true, create: true, edit: true, delete: true, extend: true, force_return: true },
            reservations: { view: true, create: true, edit: true, delete: true, manage_queue: true },
            academic_documents: { view: true, create: true, edit: true, delete: true, upload: true },
            system: { view_stats: true, manage_settings: true, sync_ad: true, manage_backups: true, view_logs: true }
          };
        case 'bibliothecaire':
          return {
            books: { view: true, create: true, edit: true, delete: false, manage_copies: true },
            users: { view: true, create: false, edit: true, delete: false, manage_roles: false },
            loans: { view: true, create: true, edit: true, delete: false, extend: true, force_return: true },
            reservations: { view: true, create: true, edit: true, delete: false, manage_queue: true },
            academic_documents: { view: true, create: true, edit: true, delete: false, upload: true },
            system: { view_stats: true, manage_settings: false, sync_ad: false, manage_backups: false, view_logs: false }
          };

        case 'enregistrement':
          return {
            books: { view: true, create: true, edit: true, delete: false, manage_copies: true },
            users: { view: true, create: true, edit: true, delete: false, manage_roles: false },
            loans: { view: true, create: true, edit: true, delete: false, extend: true, force_return: false },
            reservations: { view: true, create: true, edit: true, delete: false, manage_queue: false },
            academic_documents: { view: true, create: true, edit: true, delete: false, upload: true },
            system: { view_stats: false, manage_settings: false, sync_ad: false, manage_backups: false, view_logs: false }
          };
        case 'etudiant':
          return {
            books: { view: true, create: false, edit: false, delete: false, manage_copies: false },
            users: { view: false, create: false, edit: false, delete: false, manage_roles: false },
            loans: { view: true, create: false, edit: false, delete: false, extend: false, force_return: false },
            reservations: { view: true, create: true, edit: false, delete: false, manage_queue: false },
            academic_documents: { view: true, create: false, edit: false, delete: false, upload: false },
            system: { view_stats: false, manage_settings: false, sync_ad: false, manage_backups: false, view_logs: false }
          };
        default:
          return {};
      }
    };

    const permissions = getDefaultPermissions(role);

    // Mettre à jour l'utilisateur avec manual_role_override = 1 pour marquer l'assignation manuelle
    const result = await executeQuery(
      `UPDATE synced_users 
       SET role = ?, permissions = ?, manual_role_override = 1, updated_at = NOW() 
       WHERE id = ?`,
      [role, JSON.stringify(permissions), userId]
    );

    // Vérifier si la mise à jour a affecté des lignes
    const checkResult = await executeQuery(
      'SELECT COUNT(*) as count FROM synced_users WHERE id = ? AND role = ?',
      [userId, role]
    );

    if (!checkResult || checkResult[0]?.count === 0) {
      return NextResponse.json(
        { error: { code: 'USER_NOT_FOUND', message: 'Utilisateur introuvable ou mise à jour échouée' } },
        { status: 404 }
      );
    }

    console.log(`✅ Rôle mis à jour pour l'utilisateur ${userId}`);

    return NextResponse.json({
      success: true,
      message: `Rôle mis à jour vers ${role}`,
      data: {
        userId,
        newRole: role,
        permissions,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('❌ Erreur mise à jour rôle:', error);
    
    return NextResponse.json(
      { 
        error: { 
          code: 'UPDATE_ROLE_ERROR', 
          message: 'Erreur lors de la mise à jour du rôle',
          details: error instanceof Error ? error.message : 'Erreur inconnue'
        } 
      },
      { status: 500 }
    );
  }
}