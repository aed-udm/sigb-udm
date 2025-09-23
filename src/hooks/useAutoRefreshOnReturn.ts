"use client";

import { useEffect, useCallback } from 'react';
import { useRefresh } from '@/contexts/refresh-context';

/**
 * Hook pour rafraîchir automatiquement les interfaces après un retour de livre
 * Écoute les événements de retour et déclenche un rafraîchissement global
 */
export function useAutoRefreshOnReturn() {
  const { triggerRefresh } = useRefresh();

  const handleReturnSuccess = useCallback((event: CustomEvent) => {
    const { refresh_required } = event.detail;
    
    console.log('🔄 Retour détecté, rafraîchissement automatique des interfaces...');
    
    // Rafraîchir toutes les interfaces concernées
    if (refresh_required?.catalog) {
      triggerRefresh('catalog');
    }
    if (refresh_required?.books) {
      triggerRefresh('books');
    }
    if (refresh_required?.loans) {
      triggerRefresh('loans');
    }
    if (refresh_required?.reservations) {
      triggerRefresh('reservations');
    }
    if (refresh_required?.home) {
      triggerRefresh('home');
    }
    
    // Rafraîchissement global pour s'assurer que tout est mis à jour
    setTimeout(() => {
      triggerRefresh();
    }, 100);
    
  }, [triggerRefresh]);

  useEffect(() => {
    // Écouter les événements de retour de livre
    window.addEventListener('book-returned', handleReturnSuccess as EventListener);
    
    return () => {
      window.removeEventListener('book-returned', handleReturnSuccess as EventListener);
    };
  }, [handleReturnSuccess]);

  return {
    triggerManualRefresh: () => triggerRefresh()
  };
}

/**
 * Fonction utilitaire pour déclencher l'événement de retour
 * À utiliser dans les composants qui gèrent les retours
 */
export function notifyBookReturn(refreshData: any) {
  const event = new CustomEvent('book-returned', {
    detail: refreshData
  });
  window.dispatchEvent(event);
}
