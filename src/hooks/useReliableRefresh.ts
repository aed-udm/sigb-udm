/**
 * Hook pour rafraîchissement fiable des données
 */

import { useCallback, useRef } from 'react';

export function useReliableRefresh(fetchFunction: () => Promise<void>, delay: number = 2000) {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isRefreshingRef = useRef(false);

  const refresh = useCallback(async () => {
    if (isRefreshingRef.current) return;
    
    isRefreshingRef.current = true;
    
    try {
      await fetchFunction();
    } catch (error) {
      console.error('Erreur lors du rafraîchissement:', error);
    } finally {
      isRefreshingRef.current = false;
    }
  }, [fetchFunction]);

  const scheduleRefresh = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    timeoutRef.current = setTimeout(() => {
      refresh();
    }, delay);
  }, [refresh, delay]);

  const cancelRefresh = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  return {
    refresh,
    scheduleRefresh,
    cancelRefresh,
    isRefreshing: isRefreshingRef.current
  };
}

export default useReliableRefresh;