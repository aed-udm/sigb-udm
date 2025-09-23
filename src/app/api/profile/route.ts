import { NextRequest, NextResponse } from 'next/server';
import { ActiveDirectoryService } from '@/lib/services/active-directory';
import { executeQuery } from '@/lib/mysql';

// GET /api/profile - Récupérer le profil de l'utilisateur connecté
export async function GET(request: NextRequest) {
  try {
    console.log('🔍 [API Profile] Début de la requête GET /api/profile');

    // Récupérer le token depuis les headers
    const authHeader = request.headers.get('authorization');
    console.log('🔑 [API Profile] Header Authorization:', authHeader ? `${authHeader.substring(0, 20)}...` : 'ABSENT');

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.log('❌ [API Profile] Token manquant ou format incorrect');
      return NextResponse.json(
        { error: { code: 'MISSING_TOKEN', message: 'Token d\'authentification requis' } },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);
    console.log('🔑 [API Profile] Token extrait:', `${token.substring(0, 20)}...`);

    const adService = new ActiveDirectoryService();

    // Vérifier le token
    console.log('🔍 [API Profile] Vérification du token JWT...');
    const payload = adService.verifyJWT(token);
    console.log('📋 [API Profile] Payload JWT:', payload ? {
      userId: payload.userId,
      username: payload.username,
      role: payload.role,
      exp: payload.exp,
      iat: payload.iat
    } : 'INVALIDE');

    if (!payload) {
      console.log('❌ [API Profile] Token invalide ou expiré');
      return NextResponse.json(
        { error: { code: 'INVALID_TOKEN', message: 'Token invalide ou expiré' } },
        { status: 401 }
      );
    }

    // Récupérer les informations complètes de l'utilisateur depuis la base
    console.log('🔍 [API Profile] Requête utilisateur pour ID:', payload.userId);

    const users = await executeQuery(
      `SELECT
        id, ad_username, email, full_name, role, department, position,
        phone, office, manager, is_active, created_at, updated_at, last_login,
        ad_groups, last_sync
       FROM synced_users
       WHERE id = ? AND is_active = 1`,
      [payload.userId]
    ) as Array<{
      id: string;
      ad_username: string;
      email: string;
      full_name: string;
      role: string;
      department: string | null;
      position: string | null;
      phone: string | null;
      office: string | null;
      manager: string | null;
      is_active: number;
      created_at: string;
      updated_at: string;
      last_login: string | null;
      ad_groups: string | null;
      last_sync: string | null;
    }>;

    if (users.length === 0) {
      return NextResponse.json(
        { error: { code: 'USER_NOT_FOUND', message: 'Utilisateur non trouvé ou inactif' } },
        { status: 404 }
      );
    }

    const user = users[0];

    console.log('✅ [API Profile] Utilisateur trouvé:', {
      id: user.id,
      username: user.ad_username,
      email: user.email,
      role: user.role
    });

    // Formater les données pour le frontend
    const profile = {
      id: user.id,
      username: user.ad_username,
      full_name: user.full_name,
      email: user.email,
      phone: user.phone,
      office: user.office,
      manager: user.manager,
      role: user.role,
      department: user.department,
      position: user.position,
      is_active: user.is_active === 1,
      created_at: user.created_at,
      updated_at: user.updated_at,
      last_login: user.last_login,
      ad_info: {
        distinguished_name: user.ad_distinguished_name,
        groups: user.ad_groups ? user.ad_groups.split(',') : [],
        last_sync: user.ad_last_sync
      }
    };

    return NextResponse.json({
      success: true,
      data: profile
    });

  } catch (error) {
    console.error('❌ Erreur API profile:', error);
    
    return NextResponse.json(
      { 
        error: { 
          code: 'PROFILE_ERROR', 
          message: 'Erreur lors de la récupération du profil',
          details: error instanceof Error ? error.message : 'Erreur inconnue'
        } 
      },
      { status: 500 }
    );
  }
}

// PUT /api/profile - Mettre à jour le profil de l'utilisateur connecté
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

    const body = await request.json();
    
    // Champs modifiables par l'utilisateur
    const allowedFields = ['full_name', 'phone', 'office'];
    const updateData: any = {};
    
    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updateData[field] = body[field];
      }
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: { code: 'NO_DATA', message: 'Aucune donnée à mettre à jour' } },
        { status: 400 }
      );
    }

    // Construire la requête de mise à jour
    const setClause = Object.keys(updateData).map(field => `${field} = ?`).join(', ');
    const values = Object.values(updateData);
    values.push(payload.userId);

    await executeQuery(
      `UPDATE synced_users SET ${setClause}, updated_at = NOW() WHERE id = ?`,
      values
    );

    return NextResponse.json({
      success: true,
      message: 'Profil mis à jour avec succès'
    });

  } catch (error) {
    console.error('❌ Erreur mise à jour profil:', error);
    
    return NextResponse.json(
      { 
        error: { 
          code: 'UPDATE_ERROR', 
          message: 'Erreur lors de la mise à jour du profil',
          details: error instanceof Error ? error.message : 'Erreur inconnue'
        } 
      },
      { status: 500 }
    );
  }
}
