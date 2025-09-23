import { NextRequest, NextResponse } from 'next/server';
import { ActiveDirectoryService } from '@/lib/services/active-directory';

export interface AuthenticatedRequest extends NextRequest {
  user?: {
    id: string;
    username: string;
    email: string;
    fullName: string;
    role: string;
    isActive: boolean;
  };
}

/**
 * Middleware d'authentification pour les API routes
 */
export async function authenticateRequest(request: NextRequest): Promise<{ 
  success: boolean; 
  user?: any; 
  error?: string 
}> {
  try {
    const authHeader = request.headers.get('authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return { success: false, error: 'Token d\'authentification manquant' };
    }

    const token = authHeader.substring(7); // Enlever "Bearer "
    
    const adService = new ActiveDirectoryService();
    const payload = adService.verifyJWT(token);

    if (!payload) {
      return { success: false, error: 'Token invalide ou expiré' };
    }

    return { 
      success: true, 
      user: {
        id: payload.userId,
        username: payload.username,
        email: payload.email,
        fullName: payload.fullName,
        role: payload.role,
        isActive: payload.isActive
      }
    };

  } catch (error) {
    console.error('Erreur d\'authentification:', error);
    return { success: false, error: 'Erreur lors de la vérification de l\'authentification' };
  }
}

/**
 * Middleware pour vérifier les rôles
 */
export function requireRole(allowedRoles: string[]) {
  return (user: any): boolean => {
    return allowedRoles.includes(user.role);
  };
}

/**
 * Wrapper pour protéger une API route
 */
export function withAuth(
  handler: (request: AuthenticatedRequest) => Promise<NextResponse>,
  options?: {
    roles?: string[];
  }
) {
  return async (request: NextRequest): Promise<NextResponse> => {
    const authResult = await authenticateRequest(request);

    if (!authResult.success) {
      return NextResponse.json(
        { error: { code: 'UNAUTHORIZED', message: authResult.error } },
        { status: 401 }
      );
    }

    // Vérifier les rôles si spécifiés
    if (options?.roles && !options.roles.includes(authResult.user.role)) {
      return NextResponse.json(
        { error: { code: 'FORBIDDEN', message: 'Accès refusé - rôle insuffisant' } },
        { status: 403 }
      );
    }

    // Ajouter l'utilisateur à la requête
    (request as AuthenticatedRequest).user = authResult.user;

    return handler(request as AuthenticatedRequest);
  };
}