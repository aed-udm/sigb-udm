/**
 * SYSTÈME D'AUTHENTIFICATION SÉCURISÉ
 * Utilise des cookies httpOnly au lieu de localStorage
 */

import { NextRequest, NextResponse } from 'next/server';
import { ActiveDirectoryService } from '@/lib/services/active-directory';

export interface SecureAuthOptions {
  maxAge?: number; // Durée de vie en secondes (défaut: 24h)
  secure?: boolean; // HTTPS uniquement (défaut: true en production)
  sameSite?: 'strict' | 'lax' | 'none'; // Protection CSRF
}

export class SecureAuthManager {
  private static readonly TOKEN_COOKIE_NAME = 'auth_token';
  private static readonly REFRESH_COOKIE_NAME = 'refresh_token';
  
  private static readonly DEFAULT_OPTIONS: SecureAuthOptions = {
    maxAge: 24 * 60 * 60, // 24 heures
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict'
  };

  /**
   * Définit les cookies d'authentification sécurisés
   */
  static setAuthCookies(
    response: NextResponse, 
    token: string, 
    refreshToken?: string,
    options: SecureAuthOptions = {}
  ): NextResponse {
    const opts = { ...this.DEFAULT_OPTIONS, ...options };
    
    // Cookie principal avec le token JWT
    response.cookies.set(this.TOKEN_COOKIE_NAME, token, {
      httpOnly: true, // ✅ Inaccessible via JavaScript
      secure: opts.secure, // ✅ HTTPS uniquement en production
      sameSite: opts.sameSite, // ✅ Protection CSRF
      maxAge: opts.maxAge,
      path: '/'
    });

    // Cookie de refresh (optionnel, durée plus longue)
    if (refreshToken) {
      response.cookies.set(this.REFRESH_COOKIE_NAME, refreshToken, {
        httpOnly: true,
        secure: opts.secure,
        sameSite: opts.sameSite,
        maxAge: opts.maxAge * 7, // 7 fois plus long
        path: '/api/auth' // Limité aux routes d'auth
      });
    }

    console.log('🔒 [SecureAuth] Cookies sécurisés définis');
    return response;
  }

  /**
   * Récupère le token depuis les cookies
   */
  static getTokenFromRequest(request: NextRequest): string | null {
    const token = request.cookies.get(this.TOKEN_COOKIE_NAME)?.value;
    console.log('🔍 [SecureAuth] Token depuis cookie:', token ? `${token.substring(0, 20)}...` : 'ABSENT');
    return token || null;
  }

  /**
   * Vérifie l'authentification depuis les cookies
   */
  static async verifyAuthFromCookies(request: NextRequest): Promise<{
    success: boolean;
    user?: any;
    error?: string;
  }> {
    try {
      const token = this.getTokenFromRequest(request);
      
      if (!token) {
        return { success: false, error: 'Token manquant' };
      }

      const adService = new ActiveDirectoryService();
      const payload = adService.verifyJWT(token);

      if (!payload) {
        return { success: false, error: 'Token invalide' };
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
      console.error('❌ [SecureAuth] Erreur vérification:', error);
      return { success: false, error: 'Erreur de vérification' };
    }
  }

  /**
   * Supprime les cookies d'authentification
   */
  static clearAuthCookies(response: NextResponse): NextResponse {
    response.cookies.delete(this.TOKEN_COOKIE_NAME);
    response.cookies.delete(this.REFRESH_COOKIE_NAME);
    console.log('🗑️ [SecureAuth] Cookies supprimés');
    return response;
  }

  /**
   * Middleware pour protéger les routes
   */
  static async protectRoute(
    request: NextRequest,
    handler: (request: NextRequest, user: any) => Promise<NextResponse>
  ): Promise<NextResponse> {
    const authResult = await this.verifyAuthFromCookies(request);

    if (!authResult.success) {
      return NextResponse.json(
        { error: { code: 'UNAUTHORIZED', message: authResult.error } },
        { status: 401 }
      );
    }

    return handler(request, authResult.user);
  }
}

/**
 * MIGRATION DEPUIS LOCALSTORAGE
 * Fonction utilitaire pour migrer les tokens existants
 */
export function createMigrationResponse(token: string): NextResponse {
  const response = NextResponse.json({ 
    success: true, 
    message: 'Migration vers cookies sécurisés',
    migrated: true 
  });
  
  return SecureAuthManager.setAuthCookies(response, token);
}
