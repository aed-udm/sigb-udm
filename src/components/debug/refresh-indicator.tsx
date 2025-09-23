"use client";

import { useRefresh } from '@/contexts/refresh-context';
import { motion, AnimatePresence } from 'framer-motion';
import { RefreshCw } from 'lucide-react';

interface RefreshIndicatorProps {
  className?: string;
  showText?: boolean;
}

/**
 * Composant de debug pour visualiser l'état de rafraîchissement
 * Affiche un indicateur quand des données sont en cours de rafraîchissement
 */
export function RefreshIndicator({ className = "", showText = false }: RefreshIndicatorProps) {
  const { isRefreshing, refreshTargets, lastRefreshTime } = useRefresh();

  if (!isRefreshing && refreshTargets.size === 0) {
    return null;
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.8 }}
        className={`flex items-center space-x-2 ${className}`}
      >
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="text-green-500"
        >
          <RefreshCw className="h-4 w-4" />
        </motion.div>
        
        {showText && (
          <div className="text-xs text-gray-600 dark:text-gray-400">
            <div>Rafraîchissement...</div>
            {refreshTargets.size > 0 && (
              <div className="text-xs opacity-75">
                {Array.from(refreshTargets).join(', ')}
              </div>
            )}
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );
}

/**
 * Version compacte pour la sidebar
 */
export function SidebarRefreshIndicator() {
  const { isRefreshing } = useRefresh();

  if (!isRefreshing) {
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0 }}
      className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full"
    >
      <motion.div
        animate={{ scale: [1, 1.2, 1] }}
        transition={{ duration: 1, repeat: Infinity }}
        className="w-full h-full bg-green-500 rounded-full"
      />
    </motion.div>
  );
}

/**
 * Composant de debug détaillé (pour le développement)
 */
export function RefreshDebugPanel() {
  const { isRefreshing, refreshTargets, lastRefreshTime } = useRefresh();

  if (process.env.NODE_ENV !== 'development' || !process.env.NEXT_PUBLIC_SHOW_DEBUG) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-3 shadow-lg text-xs max-w-xs z-50">
      <div className="font-semibold mb-2">Debug Rafraîchissement</div>
      
      <div className="space-y-1">
        <div className="flex justify-between">
          <span>État:</span>
          <span className={isRefreshing ? "text-green-600" : "text-gray-500"}>
            {isRefreshing ? "En cours" : "Inactif"}
          </span>
        </div>
        
        <div className="flex justify-between">
          <span>Cibles:</span>
          <span className="text-green-600">{refreshTargets.size}</span>
        </div>
        
        {refreshTargets.size > 0 && (
          <div className="mt-2">
            <div className="font-medium">Entités rafraîchies:</div>
            <div className="text-gray-600 dark:text-gray-400">
              {Array.from(refreshTargets).map(target => (
                <div key={target} className="truncate">• {target}</div>
              ))}
            </div>
          </div>
        )}
        
        <div className="flex justify-between text-gray-500">
          <span>Dernier:</span>
          <span>{new Date(lastRefreshTime).toLocaleTimeString()}</span>
        </div>
      </div>
    </div>
  );
}
