"use client";

import React, { createContext, useContext, ReactNode } from 'react';
import { udmColors, udmGradients, udmClasses, documentColors } from '@/lib/udm-colors';

// Types pour le contexte UdM
interface UdmThemeContextType {
  colors: typeof udmColors;
  gradients: typeof udmGradients;
  classes: typeof udmClasses;
  documentColors: typeof documentColors;
  getUdmClass: (type: 'primary' | 'secondary' | 'neutral', element: 'button' | 'text' | 'bg' | 'border') => string;
  getDocumentColor: (docType: 'books' | 'theses' | 'memoires' | 'reports', property: 'icon' | 'bg' | 'border' | 'badge') => string;
}

// Contexte UdM
const UdmThemeContext = createContext<UdmThemeContextType | undefined>(undefined);

// Provider UdM
interface UdmThemeProviderProps {
  children: ReactNode;
}

export function UdmThemeProvider({ children }: UdmThemeProviderProps) {
  // Fonction utilitaire pour obtenir les classes UdM
  const getUdmClass = (
    type: 'primary' | 'secondary' | 'neutral' = 'primary',
    element: 'button' | 'text' | 'bg' | 'border' = 'text'
  ): string => {
    const classMap = {
      primary: {
        button: udmClasses.primaryButton,
        text: 'text-green-600 dark:text-green-400',
        bg: 'bg-green-50 dark:bg-green-800/90',
        border: 'border-green-200 dark:border-green-700',
      },
      secondary: {
        button: udmClasses.secondaryButton,
        text: 'text-gray-600 dark:text-gray-400',
        bg: 'bg-gray-50 dark:bg-gray-800/90',
        border: 'border-gray-200 dark:border-gray-700',
      },
      neutral: {
        button: udmClasses.outlineButton,
        text: 'text-gray-700 dark:text-gray-300',
        bg: 'bg-white dark:bg-gray-800',
        border: 'border-gray-200 dark:border-gray-700',
      },
    };

    return classMap[type][element];
  };

  // Fonction utilitaire pour obtenir les couleurs des documents
  const getDocumentColor = (
    docType: 'books' | 'theses' | 'memoires' | 'reports',
    property: 'icon' | 'bg' | 'border' | 'badge'
  ): string => {
    return documentColors[docType][property];
  };

  const value: UdmThemeContextType = {
    colors: udmColors,
    gradients: udmGradients,
    classes: udmClasses,
    documentColors,
    getUdmClass,
    getDocumentColor,
  };

  return (
    <UdmThemeContext.Provider value={value}>
      {children}
    </UdmThemeContext.Provider>
  );
}

// Hook pour utiliser le thème UdM
export function useUdmTheme() {
  const context = useContext(UdmThemeContext);
  if (context === undefined) {
    throw new Error('useUdmTheme must be used within a UdmThemeProvider');
  }
  return context;
}

// Composants utilitaires UdM
interface UdmButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  children: ReactNode;
}

export function UdmButton({ 
  variant = 'primary', 
  size = 'md', 
  className = '', 
  children, 
  ...props 
}: UdmButtonProps) {
  const { classes } = useUdmTheme();
  
  const baseClasses = 'inline-flex items-center justify-center rounded-lg font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2';
  
  const variantClasses = {
    primary: classes.primaryButton,
    secondary: classes.secondaryButton,
    outline: classes.outlineButton,
  };
  
  const sizeClasses = {
    sm: 'px-3 py-2 text-sm',
    md: 'px-4 py-2 text-base',
    lg: 'px-6 py-3 text-lg',
  };
  
  const combinedClasses = `${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${className}`;
  
  return (
    <button className={combinedClasses} {...props}>
      {children}
    </button>
  );
}

// Badge UdM
interface UdmBadgeProps {
  variant?: 'primary' | 'secondary' | 'document';
  docType?: 'books' | 'theses' | 'memoires' | 'reports';
  children: ReactNode;
  className?: string;
}

export function UdmBadge({ 
  variant = 'primary', 
  docType, 
  children, 
  className = '' 
}: UdmBadgeProps) {
  const { classes, getDocumentColor } = useUdmTheme();
  
  const baseClasses = 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium';
  
  let variantClasses = '';
  
  if (variant === 'document' && docType) {
    variantClasses = getDocumentColor(docType, 'badge');
  } else if (variant === 'primary') {
    variantClasses = classes.badgePrimary;
  } else {
    variantClasses = classes.badgeSecondary;
  }
  
  return (
    <span className={`${baseClasses} ${variantClasses} ${className}`}>
      {children}
    </span>
  );
}

// Card UdM
interface UdmCardProps {
  children: ReactNode;
  className?: string;
  variant?: 'default' | 'document';
  docType?: 'books' | 'theses' | 'memoires' | 'reports';
}

export function UdmCard({ 
  children, 
  className = '', 
  variant = 'default',
  docType 
}: UdmCardProps) {
  const { classes, getDocumentColor } = useUdmTheme();
  
  let cardClasses = classes.card;
  
  if (variant === 'document' && docType) {
    const docBg = getDocumentColor(docType, 'bg');
    const docBorder = getDocumentColor(docType, 'border');
    cardClasses = `${classes.card} ${docBg} ${docBorder}`;
  }
  
  return (
    <div className={`${cardClasses} ${className}`}>
      {children}
    </div>
  );
}

// Text UdM
interface UdmTextProps {
  variant?: 'primary' | 'secondary' | 'title' | 'gradient';
  children: ReactNode;
  className?: string;
  as?: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6' | 'p' | 'span';
}

export function UdmText({ 
  variant = 'secondary', 
  children, 
  className = '', 
  as: Component = 'p' 
}: UdmTextProps) {
  const { classes } = useUdmTheme();
  
  const variantClasses = {
    primary: classes.titlePrimary,
    secondary: classes.titleSecondary,
    title: classes.titlePrimary,
    gradient: classes.titleGradient,
  };
  
  return (
    <Component className={`${variantClasses[variant]} ${className}`}>
      {children}
    </Component>
  );
}

export default UdmThemeProvider;
