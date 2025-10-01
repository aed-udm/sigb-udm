/**
 * Hooks centralisés pour l'application
 * Fusion de tous les hooks utilisés pour réduire le nombre de fichiers
 */

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { usePathname } from 'next/navigation';
import { useRefresh } from '@/contexts/refresh-context';

// ============================================================================
// TYPES ET INTERFACES
// ============================================================================

export type UserRole = 'admin' | 'bibliothecaire' | 'enregistrement' | 'etudiant' | 'user';

export interface UserRoleData {
  role: UserRole;
  displayName: string;
  permissions: string[];
  canAccess: (module: string) => boolean;
}

export interface UseReliableRefreshOptions {
  onRefresh: () => void | Promise<void>;
  fallbackDelay?: number;
  notifyOthers?: () => void;
}

export interface SearchState {
  query: string;
  type: string;
  filters: Record<string, any>;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
  page: number;
  limit: number;
  includeFacets: boolean;
}

export interface SearchResults {
  data: any[];
  total: number;
  totalPages: number;
  facets: any[];
  loading: boolean;
  error: string | null;
  searchTime: number;
}

// ============================================================================
// CONFIGURATION DES RÔLES
// ============================================================================

const ROLE_CONFIG: Record<UserRole, Omit<UserRoleData, 'canAccess'>> = {
  admin: {
    role: 'admin',
    displayName: 'Administrateur',
    permissions: [
      'catalog.view', 'catalog.create', 'catalog.edit', 'catalog.delete',
      'users.view', 'users.create', 'users.edit', 'users.delete',
      'loans.view', 'loans.create', 'loans.edit', 'loans.delete',
      'reservations.view', 'reservations.create', 'reservations.edit', 'reservations.delete',
      'analytics.view', 'analytics.create', 'analytics.edit',
      'settings.view', 'settings.edit', 'settings.delete',
      'profile.view', 'profile.edit',
      'dashboard.view', 'archives.view', 'compliance.view', 'ad-sync.view'
    ]
  },
  bibliothecaire: {
    role: 'bibliothecaire',
    displayName: 'Bibliothécaire',
    permissions: [
      'catalog.view', 'catalog.create', 'catalog.edit',
      'dashboard.view',
      'analytics.view',
      'profile.view', 'profile.edit'
    ]
  },

  enregistrement: {
    role: 'enregistrement',
    displayName: 'Agent d\'enregistrement et circulation',
    permissions: [
      'users.view', 'users.create', 'users.edit',
      'loans.view', 'loans.create', 'loans.edit',
      'reservations.view', 'reservations.create', 'reservations.edit',
      'profile.view', 'profile.edit'
    ]
  },
  etudiant: {
    role: 'etudiant',
    displayName: 'Étudiant',
    permissions: [
      'catalog.view',
      'reservations.view', 'reservations.create',
      'profile.view', 'profile.edit'
    ]
  },
  user: {
    role: 'user',
    displayName: 'Utilisateur',
    permissions: [
      'catalog.view',
      'profile.view', 'profile.edit'
    ]
  }
};

// ============================================================================
// HOOKS PRINCIPAUX
// ============================================================================

/**
 * Hook pour gérer les rôles et permissions utilisateur
 */
export function useUserRole(): UserRoleData {
  const [userRole, setUserRole] = useState<UserRole>('admin'); // Par défaut admin pour la démo

  useEffect(() => {
    // Récupérer le rôle depuis les données utilisateur Active Directory
    try {
      const currentUser = localStorage.getItem('currentUser');
      if (currentUser) {
        const userData = JSON.parse(currentUser);
        const adRole = userData.role as UserRole;
        if (adRole && ROLE_CONFIG[adRole]) {
          setUserRole(adRole);
          return;
        }
      }
    } catch (error) {
      console.warn('Erreur récupération rôle AD:', error);
    }

    // Fallback vers l'ancien système si nécessaire
    const savedRole = localStorage.getItem('userRole') as UserRole;
    if (savedRole && ROLE_CONFIG[savedRole]) {
      setUserRole(savedRole);
    }
  }, []);

  const roleData = ROLE_CONFIG[userRole];

  const canAccess = (module: string): boolean => {
    // Mapping des modules vers les permissions correspondantes
    const modulePermissionMap: Record<string, string[]> = {
      'dashboard': ['catalog.view', 'users.view', 'loans.view'], // Dashboard accessible si au moins une permission
      'books': ['catalog.view', 'catalog.create', 'catalog.edit'],
      'theses': ['catalog.view', 'catalog.create', 'catalog.edit'],
      'others': ['catalog.view'], // Autres documents - À venir (même permissions que catalog)
      'users': ['users.view', 'users.create', 'users.edit'],
      'loans': ['loans.view', 'loans.create', 'loans.edit'],
      'reading_room': ['reading_room.view'],
      'reservations': ['reservations.view', 'reservations.create', 'reservations.edit'],
      'analytics': ['analytics.view'],
      'archives': ['catalog.view'], // Archives accessible avec permission catalog
      'compliance': ['catalog.view', 'analytics.view'], // Conformité CAMES accessible avec catalog ou analytics
      'ad-sync': ['ad-sync.view'], // Interface Active Directory pour admin uniquement
      'settings': ['settings.view', 'settings.edit'],
      'profile': ['profile.view', 'profile.edit']
    };

    const requiredPermissions = modulePermissionMap[module];
    if (!requiredPermissions) {
      // Si le module n'est pas dans la map, on utilise l'ancienne logique
      return roleData.permissions.some(permission =>
        permission.startsWith(module) || permission === `${module}.view`
      );
    }

    // Pour le dashboard, on vérifie qu'au moins une permission est présente
    if (module === 'dashboard') {
      return requiredPermissions.some(reqPerm =>
        roleData.permissions.includes(reqPerm)
      );
    }

    // Pour les autres modules, on vérifie qu'au moins une permission correspondante est présente
    return requiredPermissions.some(reqPerm =>
      roleData.permissions.includes(reqPerm)
    );
  };

  return {
    ...roleData,
    canAccess
  };
}

/**
 * Hook pour un rafraîchissement avec debounce
 */
export function useDebouncedRefresh(delay: number = 300) {
  const { triggerRefresh } = useRefresh();
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const debouncedRefresh = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      triggerRefresh();
    }, delay);
  }, [triggerRefresh, delay]);

  return { debouncedRefresh };
}

/**
 * Hook pour rafraîchissement fiable avec fallback
 */
export function useReliableRefresh(options: UseReliableRefreshOptions) {
  const { onRefresh, fallbackDelay = 2000, notifyOthers } = options;
  const { triggerRefresh } = useRefresh();
  const isRefreshingRef = useRef(false);

  const debouncedRefresh = useCallback(async () => {
    if (isRefreshingRef.current) return;
    
    isRefreshingRef.current = true;
    
    try {
      await onRefresh();
      triggerRefresh();
      notifyOthers?.();
    } catch (error) {
      console.error('Erreur lors du rafraîchissement:', error);
      // Fallback après délai
      setTimeout(() => {
        triggerRefresh();
      }, fallbackDelay);
    } finally {
      isRefreshingRef.current = false;
    }
  }, [onRefresh, triggerRefresh, notifyOthers, fallbackDelay]);

  return { debouncedRefresh };
}

/**
 * Hook pour rafraîchir automatiquement lors de la navigation
 */
export function useNavigationRefresh() {
  const pathname = usePathname();
  const { triggerRefresh } = useRefresh();
  const previousPathnameRef = useRef<string>('');

  useEffect(() => {
    if (previousPathnameRef.current === '') {
      previousPathnameRef.current = pathname;
      return;
    }

    if (previousPathnameRef.current !== pathname) {
      setTimeout(() => {
        triggerRefresh();
      }, 100);
      
      previousPathnameRef.current = pathname;
    }
  }, [pathname, triggerRefresh]);
}

// ============================================================================
// HOOKS UTILITAIRES
// ============================================================================

/**
 * Hook pour vérifier une permission spécifique
 */
export function usePermission(permission: string): boolean {
  const { permissions } = useUserRole();
  return permissions.includes(permission);
}

/**
 * Hook pour rafraîchissement fiable dans les formulaires
 */
export function useReliableFormRefresh() {
  const { triggerRefresh } = useRefresh();

  const performReliableRefresh = useCallback(async (action?: string) => {
    try {
      console.log(`🚀 Rafraîchissement fiable: ${action || 'Action formulaire'}`);

      // Déclencher le rafraîchissement
      triggerRefresh();

      // Attendre un court délai pour s'assurer que le rafraîchissement est propagé
      await new Promise(resolve => setTimeout(resolve, 100));

      return true;
    } catch (error) {
      console.error('Erreur lors du rafraîchissement fiable:', error);
      return false;
    }
  }, [triggerRefresh]);

  return { performReliableRefresh };
}

/**
 * Hook pour vérifier l'accès à un module
 */
export function useCanAccess(module: string): boolean {
  const { canAccess } = useUserRole();
  return canAccess(module);
}

/**
 * Hook pour changer le rôle utilisateur (démo)
 */
export function useSetUserRole() {
  return useCallback((role: UserRole) => {
    localStorage.setItem('userRole', role);
    window.location.reload(); // Recharger pour appliquer le nouveau rôle
  }, []);
}

/**
 * Hook pour obtenir les rôles disponibles
 */
export function useAvailableRoles() {
  return useMemo(() => Object.keys(ROLE_CONFIG) as UserRole[], []);
}

// ============================================================================
// HOOK DE RECHERCHE AVANCÉE
// ============================================================================

export interface UseAdvancedSearchOptions {
  initialQuery?: string;
  initialType?: string;
  initialFilters?: Record<string, any>;
  autoSearch?: boolean;
  debounceMs?: number;
}

/**
 * Hook pour la recherche avancée
 */
export function useAdvancedSearch(options: UseAdvancedSearchOptions = {}) {
  const {
    initialQuery = '',
    initialType = 'all',
    initialFilters = {},
    autoSearch = false,
    debounceMs = 300
  } = options;

  const [searchState, setSearchState] = useState<SearchState>({
    query: initialQuery,
    type: initialType,
    filters: initialFilters,
    sortBy: 'relevance',
    sortOrder: 'desc',
    page: 1,
    limit: 20,
    includeFacets: true
  });

  const [results, setResults] = useState<SearchResults>({
    data: [],
    total: 0,
    totalPages: 0,
    facets: [],
    loading: false,
    error: null,
    searchTime: 0
  });

  const [availableFacets, setAvailableFacets] = useState<Record<string, any>>({});

  // Debounced search state
  const debouncedSearchState = useMemo(() => {
    const timeoutRef = { current: null as NodeJS.Timeout | null };

    return searchState; // Simplified for now
  }, [searchState]);

  const performSearch = useCallback(async (state: SearchState) => {
    setResults(prev => ({ ...prev, loading: true, error: null }));

    try {
      const params = new URLSearchParams({
        q: state.query,
        type: state.type,
        sort: `${state.sortBy}:${state.sortOrder}`,
        page: state.page.toString(),
        limit: state.limit.toString(),
        include_facets: state.includeFacets.toString(),
        ...state.filters
      });

      const response = await fetch(`/api/search?${params}`);

      if (!response.ok) {
        throw new Error('Erreur de recherche');
      }

      const data = await response.json();

      setResults({
        data: data.data || [],
        total: data.total || 0,
        totalPages: data.total_pages || 0,
        facets: data.facets || [],
        loading: false,
        error: null,
        searchTime: data.search_metadata?.search_time || 0
      });

    } catch (error) {
      setResults(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'Erreur de recherche'
      }));
    }
  }, []);

  const updateQuery = useCallback((query: string) => {
    setSearchState(prev => ({ ...prev, query, page: 1 }));
  }, []);

  const updateType = useCallback((type: string) => {
    setSearchState(prev => ({ ...prev, type, page: 1 }));
  }, []);

  const updateFilter = useCallback((key: string, value: any) => {
    setSearchState(prev => ({
      ...prev,
      filters: { ...prev.filters, [key]: value },
      page: 1
    }));
  }, []);

  const search = useCallback(() => {
    performSearch(searchState);
  }, [performSearch, searchState]);

  const reset = useCallback(() => {
    setSearchState({
      query: '',
      type: 'all',
      filters: {},
      sortBy: 'relevance',
      sortOrder: 'desc',
      page: 1,
      limit: 20,
      includeFacets: true
    });
    setResults({
      data: [],
      total: 0,
      totalPages: 0,
      facets: [],
      loading: false,
      error: null,
      searchTime: 0
    });
  }, []);

  // Calcul des statistiques de recherche
  const searchStats = useMemo(() => {
    const hasQuery = searchState.query.trim().length > 0;
    const hasFilters = Object.keys(searchState.filters).some(key =>
      searchState.filters[key] && searchState.filters[key] !== ''
    );
    const activeFiltersCount = Object.keys(searchState.filters).filter(key =>
      searchState.filters[key] && searchState.filters[key] !== ''
    ).length;

    return {
      hasQuery,
      hasFilters,
      activeFiltersCount,
      hasResults: results.total > 0,
      isFirstPage: searchState.page === 1,
      isLastPage: searchState.page >= results.totalPages,
      canGoNext: searchState.page < results.totalPages,
      canGoPrev: searchState.page > 1
    };
  }, [searchState, results]);

  const removeFilter = useCallback((key: string) => {
    setSearchState(prev => {
      const newFilters = { ...prev.filters };
      delete newFilters[key];
      return { ...prev, filters: newFilters, page: 1 };
    });
  }, []);

  const clearFilters = useCallback(() => {
    setSearchState(prev => ({ ...prev, filters: {}, page: 1 }));
  }, []);

  const updateSort = useCallback((sortBy: string, sortOrder: 'asc' | 'desc' = 'desc') => {
    setSearchState(prev => ({ ...prev, sortBy, sortOrder, page: 1 }));
  }, []);

  const updatePage = useCallback((page: number) => {
    setSearchState(prev => ({ ...prev, page }));
  }, []);

  const updateLimit = useCallback((limit: number) => {
    setSearchState(prev => ({ ...prev, limit, page: 1 }));
  }, []);

  return {
    searchState,
    results,
    availableFacets,
    searchStats,
    suggestions: [], // Placeholder pour les suggestions
    updateQuery,
    updateType,
    updateFilter,
    removeFilter,
    clearFilters,
    updateSort,
    updatePage,
    updateLimit,
    search,
    reset,
    performSearch
  };
}

// ============================================================================
// HOOKS POUR ACTIONS ET DONNÉES
// ============================================================================

/**
 * Hook pour gérer les actions des boutons dans les headers
 */
export function useHeaderActions() {
  const { triggerRefresh } = useRefresh();

  const handleManualRefresh = useCallback((entity?: string, message?: string) => {
    triggerRefresh(entity);
  }, [triggerRefresh]);

  const handleAddAction = useCallback((entity: string, label: string) => {
    return () => {
      // Navigation vers la page d'ajout
      window.location.href = `/${entity}/new`;
    };
  }, []);

  const handleExportAction = useCallback((type: string, entity: string) => {
    return async () => {
      try {
        const response = await fetch(`/api/${entity}/export?format=${type.toLowerCase()}`);
        if (response.ok) {
          const blob = await response.blob();
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `${entity}_export.${type.toLowerCase()}`;
          document.body.appendChild(a);
          a.click();
          window.URL.revokeObjectURL(url);
          document.body.removeChild(a);
        }
      } catch (error) {
        console.error('Erreur lors de l\'export:', error);
      }
    };
  }, []);

  return {
    handleManualRefresh,
    handleAddAction,
    handleExportAction
  };
}

/**
 * Hook pour les données de la sidebar
 */
export function useSidebarData() {
  const { subscribe } = useRefresh();

  const [stats, setStats] = useState({
    overdue_loans: 0,
    pending_reservations: 0,
    new_documents: 0,
    system_alerts: 0,
  });

  const [userInfo, setUserInfo] = useState({
    name: 'Admin',
    email: 'admin@udm.cm',
    role: 'Administrateur',
  });

  const [isLoading, setIsLoading] = useState(true);

  const fetchSidebarStats = useCallback(async () => {
    try {
      const response = await fetch('/api/admin/sidebar-stats');
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setStats(data.data);
        }
      }
    } catch (error) {
      console.error('Erreur lors du chargement des stats sidebar:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSidebarStats();

    const unsubscribe = subscribe('sidebar', fetchSidebarStats);
    return unsubscribe;
  }, [fetchSidebarStats, subscribe]);

  return {
    stats,
    userInfo,
    isLoading,
    refresh: fetchSidebarStats
  };
}

// ============================================================================
// EXPORTS POUR COMPATIBILITÉ
// ============================================================================

export const setUserRole = (role: UserRole) => {
  localStorage.setItem('userRole', role);
  window.location.reload();
};

export const getAvailableRoles = (): { value: UserRole; label: string }[] => {
  return Object.entries(ROLE_CONFIG).map(([role, config]) => ({
    value: role as UserRole,
    label: config.displayName
  }));
};

// Export du hook d'authentification
export { useAuthToken } from './use-auth-token';

// ============================================================================
// EXPORTS HOOKS MONITORING
// ============================================================================

export { 
  useStandardsMonitoring, 
  useServiceMonitoring, 
  useMonitoringAlerts, 
  usePerformanceMetrics, 
  useComplianceMetrics 
} from './use-standards-monitoring';
