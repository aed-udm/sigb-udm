'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, X, ArrowRight, CheckCircle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface CamesNotificationProps {
  onDismiss?: () => void;
  onNavigateToCompliance?: () => void;
}

export function CamesNotification({ onDismiss, onNavigateToCompliance }: CamesNotificationProps) {
  const [isVisible, setIsVisible] = useState(true);

  const handleDismiss = () => {
    setIsVisible(false);
    onDismiss?.();
  };

  const handleNavigate = () => {
    onNavigateToCompliance?.();
    handleDismiss();
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: -50, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -50, scale: 0.95 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="fixed top-4 right-4 z-50 max-w-md"
        >
          <Card className="bg-white/95 dark:bg-gray-800/95 backdrop-blur-xl border-0 shadow-2xl hover:shadow-3xl transition-all duration-500 rounded-3xl overflow-hidden relative group"
            style={{
              background: "linear-gradient(135deg, rgba(255,255,255,0.95) 0%, rgba(248,250,252,0.95) 100%)",
              backdropFilter: "blur(20px)",
              border: "1px solid rgba(255,255,255,0.2)"
            }}
          >
            {/* Effet de brillance */}
            <div className="absolute inset-0 bg-gradient-to-r from-green-500/5 via-transparent to-gray-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

            <CardContent className="p-6 relative z-10">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
                    className="p-2.5 bg-gradient-to-br from-green-600 to-green-700 rounded-2xl shadow-lg flex-shrink-0"
                  >
                    <Shield className="h-6 w-6 text-white" />
                  </motion.div>
                  <div>
                    <motion.h3
                      className="font-bold bg-gradient-to-r from-slate-800 via-green-600 to-slate-800 dark:from-slate-200 dark:via-green-400 dark:to-slate-200 bg-clip-text text-transparent"
                      animate={{ scale: [1, 1.02, 1] }}
                      transition={{ duration: 2, repeat: Infinity }}
                    >
                      🎉 Nouvelle Fonctionnalité !
                    </motion.h3>
                    <Badge className="mt-1 bg-gradient-to-r from-green-600 to-green-700 text-white shadow-lg">
                      Standards DICAMES Centralisés
                    </Badge>
                  </div>
                </div>
                <motion.div
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                >
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleDismiss}
                    className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </motion.div>
              </div>

              <div className="space-y-3 mb-4">
                <p className="text-sm text-gray-700 dark:text-gray-300">
                  <strong>Toutes les vérifications CAMES/DICAMES</strong> sont maintenant centralisées dans un onglet dédié !
                </p>
                
                <div className="space-y-2">
                  <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span>Validation complète des documents</span>
                  </div>
                  <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span>Export automatique vers DICAMES</span>
                  </div>
                  <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span>Suivi du processus CAMES complet</span>
                  </div>
                  <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span>Monitoring en temps réel</span>
                  </div>
                </div>
              </div>

              <div className="flex space-x-2">
                <motion.div
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="flex-1"
                >
                  <Button
                    onClick={handleNavigate}
                    className="w-full bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white shadow-lg hover:shadow-xl transition-all duration-300"
                    size="sm"
                  >
                    <Shield className="h-4 w-4 mr-2" />
                    Découvrir
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </motion.div>
                <motion.div
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Button
                    variant="outline"
                    onClick={handleDismiss}
                    size="sm"
                    className="border-2 border-gray-300 dark:border-gray-600 hover:border-green-400 dark:hover:border-green-500"
                  >
                    Plus tard
                  </Button>
                </motion.div>
              </div>

              {/* Particules flottantes */}
              <div className="absolute inset-0 overflow-hidden pointer-events-none">
                {[...Array(3)].map((_, i) => (
                  <motion.div
                    key={i}
                    className="absolute w-1 h-1 bg-gray-400/40 rounded-full"
                    animate={{
                      y: [0, -30],
                      opacity: [0, 1, 0],
                    }}
                    transition={{
                      duration: 2,
                      repeat: Infinity,
                      delay: i * 0.6,
                    }}
                    style={{
                      left: `${20 + i * 25}%`,
                      top: "80%",
                    }}
                  />
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// Hook pour gérer l'affichage de la notification
export function useCamesNotification() {
  const [showNotification, setShowNotification] = useState(false); // Désactivée par défaut
  
  // Ancien code commenté au cas où on voudrait le réactiver plus tard
  /*
  const [showNotification, setShowNotification] = useState(() => {
    // Vérifier si l'utilisateur a déjà vu la notification
    if (typeof window !== 'undefined') {
      return !localStorage.getItem('cames-notification-dismissed');
    }
    return false;
  });
  */

  const dismissNotification = () => {
    setShowNotification(false);
    if (typeof window !== 'undefined') {
      localStorage.setItem('cames-notification-dismissed', 'true');
    }
  };

  const navigateToCompliance = () => {
    if (typeof window !== 'undefined') {
      window.location.href = '/admin/compliance';
    }
  };

  return {
    showNotification,
    dismissNotification,
    navigateToCompliance
  };
}
