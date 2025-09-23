import { useState, useEffect, useCallback } from 'react';

export interface UserPermissions {
  books: {
    view: boolean;
    create: boolean;
    edit: boolean;
    delete: boolean;
    manage_copies: boolean;
  };
  users: {
    view: boolean;
    create: boolean;
    edit: boolean;
    delete: boolean;
    manage_roles: boolean;
  };
  loans: {
    view: boolean;
    create: boolean;
    edit: boolean;
    delete: boolean;
    extend: boolean;
    force_return: boolean;
  };
  reservations: {
    view: boolean;
    create: boolean;
    edit: boolean;
    delete: boolean;
    manage_queue: boolean;
  };
  academic_documents: {
    view: boolean;
    create: boolean;
    edit: boolean;
    delete: boolean;
    upload: boolean;
  };
  system: {
    view_stats: boolean;
    manage_settings: boolean;
    sync_ad: boolean;
    manage_backups: boolean;
    view_logs: boolean;
  };
}

export interface User {
  id: string;
  username: string;
  email: string;
  fullName: string;
  role: 'admin' | 'bibliothecaire' | 'enregistrement' | 'etudiant';
  permissions: UserPermissions;
  department?: string;
  position?: string;
  isActive: boolean;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

export function useAuth() {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    token: null,
    isLoading: true,
    isAuthenticated: false
  });

  // Charger le token depuis le localStorage au démarrage
  useEffect(() => {
    const savedToken = localStorage.getItem('auth_token');
    if (savedToken) {
      verifyToken(savedToken);
    } else {
      setAuthState(prev => ({ ...prev, isLoading: false }));
    }
  }, []);

  // Vérifier la validité du token
  const verifyToken = async (token: string) => {
    try {
      const response = await fetch('/api/auth/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token })
      });

      if (response.ok) {
        const data = await response.json();
        setAuthState({
          user: data.user,
          token,
          isLoading: false,
          isAuthenticated: true
        });
      } else {
        // Token invalide, le supprimer
        localStorage.removeItem('auth_token');
        setAuthState({
          user: null,
          token: null,
          isLoading: false,
          isAuthenticated: false
        });
      }
    } catch (error) {
      console.error('Erreur lors de la vérification du token:', error);
      localStorage.removeItem('auth_token');
      setAuthState({
        user: null,
        token: null,
        isLoading: false,
        isAuthenticated: false
      });
    }
  };

  // Fonction de connexion
  const login = async (username: string, password: string): Promise<{ success: boolean; error?: string }> => {
    try {
      setAuthState(prev => ({ ...prev, isLoading: true }));

      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password })
      });

      const data = await response.json();

      if (response.ok && data.success) {
        // Sauvegarder le token
        localStorage.setItem('auth_token', data.token);
        
        setAuthState({
          user: data.user,
          token: data.token,
          isLoading: false,
          isAuthenticated: true
        });

        return { success: true };
      } else {
        setAuthState(prev => ({ ...prev, isLoading: false }));
        return { 
          success: false, 
          error: data.error?.message || 'Erreur de connexion' 
        };
      }
    } catch (error) {
      setAuthState(prev => ({ ...prev, isLoading: false }));
      return { 
        success: false, 
        error: 'Erreur réseau lors de la connexion' 
      };
    }
  };

  // Fonction de déconnexion
  const logout = useCallback(async () => {
    try {
      if (authState.user) {
        await fetch('/api/auth/logout', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ userId: authState.user.id })
        });
      }
    } catch (error) {
      console.error('Erreur lors de la déconnexion:', error);
    } finally {
      // Nettoyer l'état local
      localStorage.removeItem('auth_token');
      setAuthState({
        user: null,
        token: null,
        isLoading: false,
        isAuthenticated: false
      });
    }
  }, [authState.user]);

  // Fonction pour obtenir le token d'autorisation
  const getAuthHeader = useCallback(() => {
    return authState.token ? `Bearer ${authState.token}` : null;
  }, [authState.token]);

  // Fonction pour vérifier les permissions
  const hasPermission = useCallback((module: keyof UserPermissions, action: string): boolean => {
    if (!authState.user || !authState.user.permissions) {
      return false;
    }
    return authState.user.permissions[module]?.[action as keyof UserPermissions[typeof module]] === true;
  }, [authState.user]);

  // Fonction pour synchroniser AD (si autorisé)
  const syncAD = useCallback(async (): Promise<{ success: boolean; stats?: any; error?: string }> => {
    if (!hasPermission('system', 'sync_ad')) {
      return { success: false, error: 'Permission insuffisante' };
    }

    try {
      const response = await fetch('/api/auth/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': getAuthHeader() || ''
        }
      });

      const data = await response.json();

      if (response.ok && data.success) {
        return { success: true, stats: data.stats };
      } else {
        return { success: false, error: data.error?.message || 'Erreur de synchronisation' };
      }
    } catch (error) {
      return { success: false, error: 'Erreur réseau lors de la synchronisation' };
    }
  }, [hasPermission, getAuthHeader]);

  return {
    ...authState,
    login,
    logout,
    getAuthHeader,
    hasPermission,
    syncAD,
    refreshAuth: () => {
      const savedToken = localStorage.getItem('auth_token');
      if (savedToken) {
        verifyToken(savedToken);
      }
    }
  };
}