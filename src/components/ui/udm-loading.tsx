"use client";

import React from 'react';
import { motion } from 'framer-motion';
import { Loader2, BarChart3, BookOpen, Users, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';

// Types pour le composant de loading UdM
interface UdmLoadingProps {
  message?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  variant?: 'spinner' | 'pulse' | 'dots' | 'bars';
  className?: string;
  showIcon?: boolean;
  iconType?: 'general' | 'books' | 'users' | 'analytics';
}

// Composant de loading principal UdM
export function UdmLoading({
  message = "Chargement...",
  size = 'md',
  variant = 'spinner',
  className = '',
  showIcon = false,
  iconType = 'general'
}: UdmLoadingProps) {
  
  // Tailles des éléments
  const sizes = {
    sm: {
      spinner: 'h-4 w-4',
      text: 'text-xs',
      padding: 'py-2'
    },
    md: {
      spinner: 'h-8 w-8',
      text: 'text-sm',
      padding: 'py-4'
    },
    lg: {
      spinner: 'h-12 w-12',
      text: 'text-base',
      padding: 'py-6'
    },
    xl: {
      spinner: 'h-16 w-16',
      text: 'text-lg',
      padding: 'py-8'
    }
  };

  // Icônes par type
  const icons = {
    general: BarChart3,
    books: BookOpen,
    users: Users,
    analytics: BarChart3
  };

  const Icon = icons[iconType];
  const sizeConfig = sizes[size];

  // Spinner UdM
  const renderSpinner = () => (
    <div className={cn(
      "animate-spin rounded-full border-b-2 border-green-600 mx-auto mb-4",
      sizeConfig.spinner
    )} />
  );

  // Animation pulse UdM
  const renderPulse = () => (
    <motion.div
      className={cn(
        "rounded-full bg-green-600 mx-auto mb-4",
        sizeConfig.spinner
      )}
      animate={{
        scale: [1, 1.2, 1],
        opacity: [0.7, 1, 0.7]
      }}
      transition={{
        duration: 1.5,
        repeat: Infinity,
        ease: "easeInOut"
      }}
    />
  );

  // Animation dots UdM
  const renderDots = () => (
    <div className="flex space-x-1 justify-center mb-4">
      {[0, 1, 2].map((index) => (
        <motion.div
          key={index}
          className="w-2 h-2 bg-green-600 rounded-full"
          animate={{
            y: [0, -8, 0],
            opacity: [0.7, 1, 0.7]
          }}
          transition={{
            duration: 0.6,
            repeat: Infinity,
            delay: index * 0.1,
            ease: "easeInOut"
          }}
        />
      ))}
    </div>
  );

  // Animation bars UdM
  const renderBars = () => (
    <div className="flex space-x-1 justify-center mb-4">
      {[0, 1, 2, 3].map((index) => (
        <motion.div
          key={index}
          className="w-1 bg-green-600 rounded-full"
          animate={{
            height: [8, 24, 8],
            opacity: [0.7, 1, 0.7]
          }}
          transition={{
            duration: 0.8,
            repeat: Infinity,
            delay: index * 0.1,
            ease: "easeInOut"
          }}
        />
      ))}
    </div>
  );

  // Rendu de l'animation selon le variant
  const renderAnimation = () => {
    switch (variant) {
      case 'pulse':
        return renderPulse();
      case 'dots':
        return renderDots();
      case 'bars':
        return renderBars();
      default:
        return renderSpinner();
    }
  };

  return (
    <div className={cn(
      "flex items-center justify-center",
      sizeConfig.padding,
      className
    )}>
      <div className="text-center">
        {/* Icône optionnelle */}
        {showIcon && (
          <motion.div
            className="mb-4"
            animate={{ rotate: variant === 'spinner' ? 360 : 0 }}
            transition={{ 
              duration: variant === 'spinner' ? 2 : 0, 
              repeat: variant === 'spinner' ? Infinity : 0, 
              ease: "linear" 
            }}
          >
            <Icon className={cn(
              "text-green-600 mx-auto",
              sizeConfig.spinner
            )} />
          </motion.div>
        )}
        
        {/* Animation de loading */}
        {!showIcon && renderAnimation()}
        
        {/* Message */}
        <motion.span 
          className={cn(
            "text-gray-700 dark:text-gray-300 font-medium",
            sizeConfig.text
          )}
          animate={{ opacity: [0.7, 1, 0.7] }}
          transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
        >
          {message}
        </motion.span>
      </div>
    </div>
  );
}

// Composant de loading pour cartes statistiques
export function UdmStatCardLoading({ 
  className = '' 
}: { 
  className?: string 
}) {
  return (
    <div className={cn(
      "bg-white/95 dark:bg-gray-800/95 backdrop-blur-xl border-0 shadow-lg rounded-3xl p-6",
      className
    )}>
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          {/* Skeleton pour le titre */}
          <motion.div 
            className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-20"
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          />
          {/* Skeleton pour la valeur */}
          <motion.div 
            className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-16"
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 1.5, repeat: Infinity, delay: 0.2 }}
          />
        </div>
        {/* Skeleton pour l'icône */}
        <motion.div 
          className="h-12 w-12 bg-green-100 dark:bg-green-800/90 rounded-full flex items-center justify-center"
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 1.5, repeat: Infinity, delay: 0.4 }}
        >
          <div className="h-6 w-6 bg-green-600 rounded opacity-50" />
        </motion.div>
      </div>
    </div>
  );
}

// Composant de loading pour pages complètes
export function UdmPageLoading({ 
  title = "Chargement de la page...",
  className = '' 
}: { 
  title?: string;
  className?: string;
}) {
  return (
    <div className={cn(
      "min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 via-white to-gray-50 dark:from-gray-900 dark:via-gray-800 dark:to-green-900",
      className
    )}>
      <div className="text-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
          className="mb-6"
        >
          <BarChart3 className="h-16 w-16 text-green-600 mx-auto" />
        </motion.div>
        <UdmLoading 
          message={title}
          size="lg"
          variant="dots"
        />
      </div>
    </div>
  );
}

// Export par défaut
export default UdmLoading;
