"use client";

import React, { memo, useMemo } from "react";
import { LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { motion } from "framer-motion";

// Composant d'icône STATIQUE ultra-léger (0 animations)
export const InstantIcon = memo(({ 
  Icon, 
  className = "h-12 w-12 text-green-600"
}: {
  Icon: LucideIcon;
  className?: string;
}) => <Icon className={className} />);

InstantIcon.displayName = "InstantIcon";

// Composant de statistiques UNIFIÉ avec animations spectaculaires
export const UnifiedStatCard = memo(({
  stat,
  className = "",
  index = 0
}: {
  stat: {
    value: number | string;
    label: string;
    icon: LucideIcon;
    gradient: string;
    color?: string;
  };
  className?: string;
  index?: number;
}) => (
  <Card className={`bg-white/95 dark:bg-gray-800/95 backdrop-blur-xl border-0 shadow-lg hover:shadow-2xl transition-all duration-500 rounded-3xl overflow-hidden relative group ${className}`}>
    {/* Effet de brillance */}
    <div className={`absolute inset-0 bg-gradient-to-r ${stat.gradient} opacity-0 group-hover:opacity-10 transition-opacity duration-300`} />

    <CardContent className="p-3 sm:p-4 relative z-10">
      {/* Disposition verticale centrée pour une meilleure lisibilité */}
      <div className="flex flex-col items-center text-center space-y-2">
        {/* Icône en haut avec animation spectaculaire */}
        <motion.div
          animate={{
            rotate: 360,
            scale: [1, 1.1, 1]
          }}
          transition={{
            rotate: { duration: 8, repeat: Infinity, ease: "linear" },
            scale: { duration: 2, repeat: Infinity, delay: index * 0.3 }
          }}
          className={`p-2 sm:p-3 bg-gradient-to-br ${stat.gradient} rounded-xl shadow-lg`}
        >
          <stat.icon className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
        </motion.div>

        {/* Valeur numérique spectaculaire */}
        <motion.div
          className={`text-xl sm:text-2xl md:text-3xl font-black bg-gradient-to-r ${stat.gradient} bg-clip-text text-transparent`}
          animate={{
            scale: [1, 1.05, 1],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            delay: index * 0.5
          }}
        >
          {stat.value}
        </motion.div>

        {/* Label complet et lisible */}
        <div className="text-xs sm:text-sm font-semibold text-gray-700 dark:text-gray-200 leading-relaxed px-1">
          {stat.label}
        </div>
      </div>

      {/* Particules flottantes */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(3)].map((_, i) => (
          <motion.div
            key={i}
            className={`absolute w-1 h-1 bg-${stat.color || 'blue'}-400/40 rounded-full`}
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
));

UnifiedStatCard.displayName = "UnifiedStatCard";

// InstantStatCard supprimé - utiliser directement UnifiedStatCard

// Composant de header STATIQUE ultra-léger
export const InstantPageHeader = memo(({ 
  title,
  subtitle,
  icon: Icon,
  actions
}: {
  title: string;
  subtitle: string;
  icon: LucideIcon;
  actions?: React.ReactNode;
}) => (
  <div className="bg-white dark:bg-gray-800 shadow-lg border-b border-gray-200 dark:border-gray-700">
    <div className="container mx-auto px-4 sm:px-6 py-6 lg:py-8">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-6 lg:space-y-0">
        <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-6 space-y-4 sm:space-y-0">
          <div className="relative self-center sm:self-auto">
            <Icon className="h-10 w-10 sm:h-12 sm:w-12 text-green-600 drop-shadow-lg" />
          </div>
          <div className="text-center sm:text-left">
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold bg-gradient-to-r from-slate-800 via-green-600 to-slate-800 dark:from-slate-200 dark:via-green-400 dark:to-slate-200 bg-clip-text text-transparent">
              {title}
            </h1>
            <p className="text-base sm:text-lg text-gray-700 dark:text-gray-100 mt-2 font-medium">
              {subtitle}
            </p>
          </div>
        </div>
        {actions && (
          <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-4 w-full sm:w-auto">
            {actions}
          </div>
        )}
      </div>
    </div>
  </div>
));

InstantPageHeader.displayName = "InstantPageHeader";

// Composant de carte STATIQUE ultra-léger
export const InstantCard = memo(({ 
  children,
  className = "",
  hover = true
}: {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
}) => (
  <div className={`glass-card p-4 bg-white/95 dark:bg-gray-800/95 text-gray-900 dark:text-gray-100 ${
    hover ? 'hover:scale-105 transition-all duration-300' : ''
  } ${className}`}>
    {children}
  </div>
));

InstantCard.displayName = "InstantCard";

// Composant de grille STATIQUE ultra-optimisé
export const InstantGrid = memo(({ 
  children,
  cols = "1 sm:2 lg:4",
  gap = "4 sm:6",
  className = ""
}: {
  children: React.ReactNode;
  cols?: string;
  gap?: string;
  className?: string;
}) => (
  <div className={`grid grid-cols-${cols} gap-${gap} ${className}`}>
    {children}
  </div>
));

InstantGrid.displayName = "InstantGrid";

// Composant de liste STATIQUE ultra-léger
export const InstantList = memo(({ 
  items,
  renderItem,
  className = ""
}: {
  items: unknown[];
  renderItem: (item: unknown, index: number) => React.ReactNode;
  className?: string;
}) => (
  <div className={`space-y-4 ${className}`}>
    {items.map((item, index) => (
      <div key={(item as { id?: string | number }).id || index}>
        {renderItem(item, index)}
      </div>
    ))}
  </div>
));

InstantList.displayName = "InstantList";

// Composant de bouton STATIQUE ultra-léger
export const InstantButton = memo(({ 
  children,
  onClick,
  variant = "default",
  size = "default",
  className = "",
  disabled = false,
  asChild = false,
  href
}: {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: "default" | "outline" | "ghost";
  size?: "sm" | "default" | "lg";
  className?: string;
  disabled?: boolean;
  asChild?: boolean;
  href?: string;
}) => {
  const baseClasses = "inline-flex items-center justify-center rounded-md font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none";
  
  const variantClasses = {
    default: "bg-green-600 text-white hover:bg-green-700",
    outline: "border border-input bg-background hover:bg-accent hover:text-accent-foreground",
    ghost: "hover:bg-accent hover:text-accent-foreground"
  };
  
  const sizeClasses = {
    sm: "h-9 px-3 text-sm",
    default: "h-10 px-4 py-2",
    lg: "h-11 px-8"
  };

  const classes = `${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${className}`;

  if (asChild && href) {
    return (
      <a href={href} className={classes}>
        {children}
      </a>
    );
  }

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={classes}
    >
      {children}
    </button>
  );
});

InstantButton.displayName = "InstantButton";

// Composant de wrapper STATIQUE pour éliminer les re-rendus
export const InstantMemo = memo(({ 
  children,
  deps = []
}: {
  children: React.ReactNode;
  deps?: unknown[];
}) => {
  const memoizedChildren = useMemo(() => children, deps);
  return <>{memoizedChildren}</>;
});

InstantMemo.displayName = "InstantMemo";

// Composant de loading ULTRA-LÉGER
export const InstantLoading = memo(({ 
  message = "Chargement...",
  className = ""
}: {
  message?: string;
  className?: string;
}) => (
  <div className={`flex items-center justify-center py-8 ${className}`}>
    <div className="text-center">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mx-auto mb-4"></div>
      <span className="text-gray-700 dark:text-gray-100">{message}</span>
    </div>
  </div>
));

InstantLoading.displayName = "InstantLoading";

// Hook pour performances INSTANTANÉES
export const useInstantPerformance = () => {
  const optimizeRender = useMemo(() => ({
    shouldUpdate: (prevProps: Record<string, unknown>, nextProps: Record<string, unknown>) => {
      return JSON.stringify(prevProps) !== JSON.stringify(nextProps);
    },
    memoize: (fn: unknown): unknown => fn,
  }), []);

  return { optimizeRender };
};

export default {
  InstantIcon,
  UnifiedStatCard,
  InstantPageHeader,
  InstantCard,
  InstantGrid,
  InstantList,
  InstantButton,
  InstantMemo,
  InstantLoading,
  useInstantPerformance
};
