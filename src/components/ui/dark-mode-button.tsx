"use client";

import React from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useTheme } from 'next-themes';

interface DarkModeButtonProps extends React.ComponentProps<typeof Button> {
  buttonType?: 'nav' | 'action';
}

/**
 * Bouton optimisé pour la visibilité en mode sombre
 * Garantit que les boutons "Annuler", "Modifier", etc. sont toujours visibles
 */
export function DarkModeButton({ 
  buttonType = 'nav', 
  className, 
  children, 
  ...props 
}: DarkModeButtonProps) {
  const { theme } = useTheme();
  
  // Styles pour mode sombre
  const darkStyles = theme === 'dark' ? {
    backgroundColor: buttonType === 'nav'
      ? 'rgba(75, 85, 99, 0.95)'
      : 'rgba(34, 197, 94, 0.25)',
    borderColor: buttonType === 'nav'
      ? 'rgb(156, 163, 175)'
      : 'rgb(34, 197, 94)',
    color: buttonType === 'nav'
      ? 'rgb(243, 244, 246)'
      : 'rgb(74, 222, 128)',
    borderWidth: '2px',
    backdropFilter: 'blur(8px)'
  } : {};

  // Classes CSS pour mode clair
  const lightClasses = buttonType === 'nav' 
    ? 'bg-white border-slate-300 text-gray-900 hover:bg-gray-50'
    : 'bg-white border-green-500 text-green-700 hover:bg-green-50';

  return (
    <Button
      {...props}
      className={cn(
        // Classes de base
        'border font-medium transition-all duration-200',
        // Classes pour mode clair
        lightClasses,
        // Classes personnalisées
        className
      )}
      style={darkStyles}
    >
      {children}
    </Button>
  );
}
