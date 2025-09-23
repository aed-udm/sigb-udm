import { useState, useEffect } from 'react';

/**
 * Hook pour gérer le token d'authentification
 */
export function useAuthToken() {
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Récupérer le token depuis localStorage au montage
    // Utiliser la même clé que dans la page de login
    const storedToken = localStorage.getItem('auth_token');
    const isLoggedIn = localStorage.getItem('isLoggedIn');
    const currentUser = localStorage.getItem('currentUser');

    console.log('🔍 [useAuthToken] État d\'authentification:', {
      storedToken: storedToken ? `${storedToken.substring(0, 20)}...` : 'ABSENT',
      isLoggedIn,
      currentUser: currentUser ? 'PRÉSENT' : 'ABSENT',
      tokenLength: storedToken?.length || 0
    });

    setToken(storedToken);
    setIsLoading(false);
  }, []);

  const updateToken = (newToken: string | null) => {
    setToken(newToken);
    if (newToken) {
      localStorage.setItem('auth_token', newToken);
    } else {
      localStorage.removeItem('auth_token');
    }
  };

  const getAuthHeaders = (): Record<string, string> => {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    return headers;
  };

  return {
    token,
    isLoading,
    updateToken,
    getAuthHeaders,
    isAuthenticated: !!token
  };
}
