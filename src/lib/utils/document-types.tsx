import React from 'react';
import { GraduationCap, FileText, Briefcase, BookOpen } from "lucide-react";

/**
 * Types de documents académiques standardisés selon la base de données
 */
export type AcademicDocumentType = 'these' | 'memoire' | 'rapport_stage';
export type DocumentType = 'book' | AcademicDocumentType;

/**
 * Mapping des types de documents vers leurs icônes
 */
export const getDocumentIcon = (type: string, className: string = "h-5 w-5") => {
  switch (type) {
    case 'book':
      return <BookOpen className={className} />;
    case 'these':
      return <GraduationCap className={className} />;
    case 'memoire':
      return <FileText className={className} />;
    case 'rapport_stage':
      return <Briefcase className={className} />;
    default:
      return <FileText className={className} />;
  }
};

/**
 * Mapping des types de documents vers leurs labels
 */
export const getDocumentTypeLabel = (type: string): string => {
  switch (type) {
    case 'book':
      return 'Livre';
    case 'these':
      return 'Thèse';
    case 'memoire':
      return 'Mémoire';
    case 'rapport_stage':
      return 'Rapport de stage';
    default:
      return 'Document';
  }
};

/**
 * Mapping des types de documents vers leurs couleurs
 */
export const getDocumentTypeColor = (type: string): string => {
  switch (type) {
    case 'book':
      return 'text-green-600';
    case 'these':
      return 'text-pink-600';
    case 'memoire':
      return 'text-green-600';
    case 'rapport_stage':
      return 'text-gray-600';
    default:
      return 'text-gray-600';
  }
};

/**
 * Mapping des types de documents vers leurs classes CSS de background
 */
export const getDocumentTypeBgColor = (type: string, isDark: boolean = false): string => {
  const lightColors = {
    book: 'bg-blue-100',
    these: 'bg-pink-100',
    memoire: 'bg-green-100',
    rapport_stage: 'bg-gray-100'
  };
  
  const darkColors = {
    book: 'bg-blue-900/30',
    these: 'bg-pink-900/30',
    memoire: 'bg-green-900/30',
    rapport_stage: 'bg-gray-900/30'
  };
  
  const colors = isDark ? darkColors : lightColors;
  return colors[type as keyof typeof colors] || (isDark ? 'bg-gray-900/30' : 'bg-gray-100');
};

/**
 * Mapping des types de documents vers leurs classes CSS de badge
 */
export const getDocumentTypeBadgeClasses = (type: string): string => {
  const baseClasses = "px-2 py-1 rounded-full text-xs font-bold border shadow-sm";
  
  switch (type) {
    case 'book':
      return `${baseClasses} bg-green-600 text-white border-green-700 dark:bg-green-500 dark:border-blue-400`;
    case 'these':
      return `${baseClasses} bg-pink-600 text-white border-pink-700 dark:bg-pink-500 dark:border-pink-400`;
    case 'memoire':
      return `${baseClasses} bg-green-600 text-white border-green-700 dark:bg-green-500 dark:border-green-400`;
    case 'rapport_stage':
      return `${baseClasses} bg-gray-600 text-white border-gray-700 dark:bg-gray-500 dark:border-gray-400`;
    default:
      return `${baseClasses} bg-gray-600 text-white border-gray-700 dark:bg-gray-500 dark:border-gray-400`;
  }
};

/**
 * Vérifie si un type est un document académique
 */
export const isAcademicDocument = (type: string): boolean => {
  return ['these', 'memoire', 'rapport_stage'].includes(type);
};

/**
 * Convertit les anciens types vers les nouveaux types standardisés
 */
export const normalizeDocumentType = (type: string): string => {
  switch (type) {
    case 'thesis':
      return 'these';
    case 'stage_report':
      return 'rapport_stage';
    case 'memoir':
      return 'memoire';
    default:
      return type;
  }
};

/**
 * Génère un lien vers la page de détail d'un document
 */
export const getDocumentLink = (type: string, id: string): string => {
  switch (type) {
    case 'book':
      return `/books/${id}`;
    case 'these':
    case 'memoire':
    case 'rapport_stage':
      return `/theses/${id}`;
    default:
      return '#';
  }
};
