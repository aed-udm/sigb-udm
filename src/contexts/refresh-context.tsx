"use client";

import React, { createContext, useContext, useState, useCallback, useRef } from 'react';

// Interface pour le contexte de rafraîchissement
interface RefreshContextType {
  // État de rafraîchissement global
  isRefreshing: boolean;

  // Fonction pour déclencher un rafraîchissement
  triggerRefresh: (component?: string) => void;

  // Fonction pour marquer le rafraîchissement comme terminé
  finishRefresh: () => void;

  // Timestamp du dernier rafraîchissement
  lastRefreshTime: number;

  // Composants qui doivent être rafraîchis
  refreshTargets: Set<string>;

  // Fonction pour s'abonner aux rafraîchissements
  subscribe: (component: string, callback: () => void) => () => void;

  // Fonction pour déclencher un rafraîchissement spécifique
  refreshComponent: (component: string) => void;

  // Fonctions de notification spécifiques pour la compatibilité
  notifyLoanChange: () => void;
  notifyBookChange: () => void;
  notifyReservationChange: () => void;
}

// Créer le contexte
const RefreshContext = createContext<RefreshContextType | undefined>(undefined);

// Hook pour utiliser le contexte de rafraîchissement
export function useRefresh() {
  const context = useContext(RefreshContext);
  if (context === undefined) {
    throw new Error('useRefresh must be used within a RefreshProvider');
  }
  return context;
}

// Fournisseur du contexte de rafraîchissement
export function RefreshProvider({ children }: { children: React.ReactNode }) {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastRefreshTime, setLastRefreshTime] = useState(Date.now());
  const [refreshTargets, setRefreshTargets] = useState<Set<string>>(new Set());
  
  // Référence pour stocker les callbacks des composants abonnés
  const subscribersRef = useRef<Map<string, Set<() => void>>>(new Map());

  // Fonction pour déclencher un rafraîchissement global ou spécifique
  const triggerRefresh = useCallback((component?: string) => {
    setIsRefreshing(true);
    setLastRefreshTime(Date.now());

    if (component) {
      setRefreshTargets(prev => new Set(prev).add(component));

      // Notifier les abonnés spécifiques
      const componentSubscribers = subscribersRef.current.get(component);
      if (componentSubscribers) {
        componentSubscribers.forEach(callback => {
          try {
            callback();
          } catch (error) {
            console.error(`Erreur lors du rafraîchissement du composant ${component}:`, error);
          }
        });
      }
    } else {
      // Rafraîchissement global - notifier tous les abonnés
      subscribersRef.current.forEach((callbacks, componentName) => {
        setRefreshTargets(prev => new Set(prev).add(componentName));
        callbacks.forEach(callback => {
          try {
            callback();
          } catch (error) {
            console.error(`Erreur lors du rafraîchissement global du composant ${componentName}:`, error);
          }
        });
      });
    }
    
    // Terminer automatiquement le rafraîchissement après un délai
    setTimeout(() => {
      setIsRefreshing(false);
      setRefreshTargets(new Set());
    }, 1000);
  }, []);

  // Fonction pour marquer le rafraîchissement comme terminé
  const finishRefresh = useCallback(() => {
    setIsRefreshing(false);
    setRefreshTargets(new Set());
  }, []);

  // Fonction pour s'abonner aux rafraîchissements
  const subscribe = useCallback((component: string, callback: () => void) => {
    if (!subscribersRef.current.has(component)) {
      subscribersRef.current.set(component, new Set());
    }
    
    const componentSubscribers = subscribersRef.current.get(component)!;
    componentSubscribers.add(callback);
    
    // Retourner une fonction de désabonnement
    return () => {
      componentSubscribers.delete(callback);
      if (componentSubscribers.size === 0) {
        subscribersRef.current.delete(component);
      }
    };
  }, []);

  // Fonction pour rafraîchir un composant spécifique
  const refreshComponent = useCallback((component: string) => {
    triggerRefresh(component);
  }, [triggerRefresh]);

  // Fonctions de notification spécifiques pour la compatibilité
  const notifyLoanChange = useCallback(() => {
    triggerRefresh('loans');
    triggerRefresh('books'); // Les livres doivent aussi être rafraîchis quand les emprunts changent
  }, [triggerRefresh]);

  const notifyBookChange = useCallback(() => {
    triggerRefresh('books');
  }, [triggerRefresh]);

  const notifyReservationChange = useCallback(() => {
    triggerRefresh('reservations');
    triggerRefresh('books'); // Les livres doivent aussi être rafraîchis quand les réservations changent
  }, [triggerRefresh]);

  const value: RefreshContextType = {
    isRefreshing,
    triggerRefresh,
    finishRefresh,
    lastRefreshTime,
    refreshTargets,
    subscribe,
    refreshComponent,
    notifyLoanChange,
    notifyBookChange,
    notifyReservationChange
  };

  return (
    <RefreshContext.Provider value={value}>
      {children}
    </RefreshContext.Provider>
  );
}

// Hook personnalisé pour les composants qui veulent être rafraîchis automatiquement
export function useAutoRefresh(componentName: string, refreshCallback: () => void) {
  const { subscribe } = useRefresh();
  
  React.useEffect(() => {
    const unsubscribe = subscribe(componentName, refreshCallback);
    return unsubscribe;
  }, [componentName, refreshCallback, subscribe]);
}



// Constantes pour les noms de composants couramment rafraîchis
export const REFRESH_COMPONENTS = {
  DASHBOARD: 'dashboard',
  BOOKS: 'books',
  BOOKS_LIST: 'books-list',
  USERS: 'users',
  USERS_LIST: 'users-list',
  LOANS: 'loans',
  LOANS_LIST: 'loans-list',
  RESERVATIONS: 'reservations',
  RESERVATIONS_LIST: 'reservations-list',
  ACADEMIC_DOCUMENTS: 'academic-documents',
  STATISTICS: 'statistics',
  NOTIFICATIONS: 'notifications',
  SIDEBAR_STATS: 'sidebar-stats',
  AVAILABILITY: 'availability',
  OVERDUE_LOANS: 'overdue-loans',
  SETTINGS: 'settings'
} as const;

export type RefreshComponent = typeof REFRESH_COMPONENTS[keyof typeof REFRESH_COMPONENTS];
