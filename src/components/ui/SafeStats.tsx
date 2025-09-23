/**
 * Composant de protection pour l'affichage sécurisé des statistiques
 */

import React from 'react';

interface SafeStatsProps {
  value: number | string | undefined | null;
  format?: 'number' | 'currency' | 'percentage';
  fallback?: string;
  className?: string;
}

export function SafeStats({ 
  value, 
  format = 'number', 
  fallback = '0',
  className = ''
}: SafeStatsProps) {
  // Vérification de sécurité
  if (value === undefined || value === null || value === '') {
    return <span className={className}>{fallback}</span>;
  }

  // Conversion sécurisée en nombre
  const numValue = typeof value === 'string' ? parseFloat(value) : value;
  
  if (isNaN(numValue)) {
    return <span className={className}>{fallback}</span>;
  }

  // Formatage selon le type
  let formattedValue: string;
  
  try {
    switch (format) {
      case 'currency':
        formattedValue = numValue.toLocaleString('fr-FR', {
          style: 'currency',
          currency: 'XAF'
        });
        break;
      case 'percentage':
        formattedValue = `${numValue.toFixed(1)}%`;
        break;
      default:
        formattedValue = numValue.toLocaleString('fr-FR');
    }
  } catch (error) {
    formattedValue = String(numValue);
  }

  return <span className={className}>{formattedValue}</span>;
}

export default SafeStats;