import { BarChart3, BookOpen, GraduationCap, Palette, Target, TrendingUp, Users } from "lucide-react";
// <Palette className="h-4 w-4" /> PALETTE DE COULEURS UDM - UNIVERSITÉ DES MONTAGNES

export const colorPalette = {
  // 🟢 COULEURS PRINCIPALES UDM - Vert, Gris, Blanc
  primary: {
    50: '#f0fdf4',   // Vert très clair UdM
    100: '#dcfce7',  // Vert clair UdM
    200: '#bbf7d0',  // Vert léger UdM
    300: '#86efac',  // Vert moyen UdM
    400: '#4ade80',  // Vert vif UdM
    500: '#22c55e',  // Vert principal UdM
    600: '#16a34a',  // Vert foncé UdM
    700: '#15803d',  // Vert très foncé UdM
    800: '#166534',  // Vert sombre UdM
    900: '#14532d',  // Vert ultra-sombre UdM
  },

  // ⚫ Couleurs neutres UdM (Gris et Blanc)
  neutral: {
    50: '#f8fafc',   // Blanc cassé UdM
    100: '#f1f5f9',  // Gris très clair UdM
    200: '#e2e8f0',  // Gris clair UdM
    300: '#cbd5e1',  // Gris moyen UdM
    400: '#94a3b8',  // Gris UdM
    500: '#64748b',  // Gris principal UdM
    600: '#475569',  // Gris foncé UdM
    700: '#334155',  // Gris très foncé UdM
    800: '#1e293b',  // Gris sombre UdM
    900: '#0f172a',  // Gris ultra-sombre UdM
  },

  // 🔵 COULEURS SECONDAIRES (anciennes couleurs principales conservées)
  secondary: {
    50: '#f0f9ff',
    100: '#e0f2fe',
    200: '#bae6fd',
    300: '#7dd3fc',
    400: '#38bdf8',
    500: '#0ea5e9',  // Bleu secondaire
    600: '#0284c7',  // Bleu foncé secondaire
    700: '#0369a1',
    800: '#075985',
    900: '#0c4a6e',
  },

  // 🟡 Couleur d'accent UdM (jaune conservé comme accent)
  accent: {
    50: '#fefce8',
    100: '#fef9c3',
    200: '#fef08a',
    300: '#fde047',
    400: '#facc15',
    500: '#eab308',  // Jaune accent
    600: '#ca8a04',  // Jaune foncé accent
    700: '#a16207',
    800: '#854d0e',
    900: '#713f12',
  },

  // 🔴 Couleur d'alerte (rouge conservé)
  danger: {
    50: '#fef2f2',
    100: '#fee2e2',
    200: '#fecaca',
    300: '#fca5a5',
    400: '#f87171',
    500: '#ef4444',  // Rouge alerte
    600: '#dc2626',  // Rouge foncé alerte
    700: '#b91c1c',
    800: '#991b1b',
    900: '#7f1d1d',
  }
};

// <Palette className="h-4 w-4" /> Gradients UdM
export const gradients = {
  primary: 'from-green-600 to-green-700',      // Vert UdM principal
  secondary: 'from-green-600 to-green-700',      // Bleu secondaire
  accent: 'from-yellow-500 to-yellow-600',     // Jaune accent
  neutral: 'from-slate-600 to-slate-700',      // Gris neutre

  // Gradients spéciaux UdM
  hero: 'from-slate-800 via-green-600 to-slate-800',        // Hero avec vert UdM
  card: 'from-green-500/10 to-slate-500/10',                // Cartes vert/gris UdM
  background: 'from-slate-50 via-white to-green-50',        // Fond avec vert UdM
  backgroundDark: 'from-gray-900 via-gray-800 to-green-900', // Fond sombre avec vert UdM
};

// 🏷️ Couleurs par contexte UdM
export const contextColors = {
  // <BookOpen className="h-4 w-4" /> Livres (couleurs conservées)
  books: {
    icon: 'text-green-600',
    gradient: 'from-green-500 to-green-600',
    bg: 'bg-green-50 dark:bg-green-900/20',
    border: 'border-green-200 dark:border-green-700',
    hover: 'hover:border-green-400 dark:hover:border-green-500'
  },

  // <GraduationCap className="h-4 w-4" /> Thèses (couleurs conservées)
  theses: {
    icon: 'text-pink-600',
    gradient: 'from-pink-500 to-pink-600',
    bg: 'bg-pink-50 dark:bg-pink-900/20',
    border: 'border-pink-200 dark:border-pink-700',
    hover: 'hover:border-pink-400 dark:hover:border-pink-500'
  },

  // Mémoires (couleurs conservées)
  memoires: {
    icon: 'text-green-600',
    gradient: 'from-green-500 to-green-600',
    bg: 'bg-green-50 dark:bg-green-900/20',
    border: 'border-green-200 dark:border-green-700',
    hover: 'hover:border-green-400 dark:hover:border-green-500'
  },

  // Rapports de stage (couleurs conservées)
  reports: {
    icon: 'text-purple-600 dark:text-purple-400',
    gradient: 'from-purple-500 to-purple-600',
    bg: 'bg-purple-50 dark:bg-purple-900/20',
    border: 'border-purple-200 dark:border-purple-700',
    hover: 'hover:border-purple-400 dark:hover:border-purple-500'
  },

  // <Users className="h-4 w-4" /> Usagers (adapté aux couleurs UdM)
  users: {
    icon: 'text-green-600',
    gradient: 'from-green-500 to-green-600',
    bg: 'bg-green-50 dark:bg-green-900/20',
    border: 'border-green-200 dark:border-green-700',
    hover: 'hover:border-green-400 dark:hover:border-green-500'
  },

  // <BarChart3 className="h-4 w-4" /> Analytics (adapté aux couleurs UdM)
  analytics: {
    icon: 'text-green-600',
    gradient: 'from-green-500 to-green-600',
    bg: 'bg-green-50 dark:bg-green-900/20',
    border: 'border-green-200 dark:border-green-700',
    hover: 'hover:border-green-400 dark:hover:border-green-500'
  },

  // <TrendingUp className="h-4 w-4" /> Dashboard (adapté aux couleurs UdM)
  dashboard: {
    icon: 'text-slate-600',
    gradient: 'from-slate-500 to-slate-600',
    bg: 'bg-slate-50 dark:bg-slate-900/20',
    border: 'border-slate-200 dark:border-slate-700',
    hover: 'hover:border-slate-400 dark:hover:border-slate-500'
  }
};

// <Target className="h-4 w-4" /> Couleurs des statistiques UdM
export const statColors = {
  // Livres - couleur conservée
  books: {
    icon: 'text-green-600',
    gradient: 'from-green-500 to-green-600',
    bg: 'bg-green-500/10'
  },
  // Thèses - couleur conservée
  theses: {
    icon: 'text-gray-600',
    gradient: 'from-gray-500 to-gray-600',
    bg: 'bg-gray-500/10'
  },
  // Mémoires - couleur conservée
  memoires: {
    icon: 'text-green-600',
    gradient: 'from-green-500 to-green-600',
    bg: 'bg-green-500/10'
  },
  // Rapports de stage - couleur UdM
  reports: {
    icon: 'text-gray-600',
    gradient: 'from-gray-500 to-gray-600',
    bg: 'bg-gray-500/10'
  },
  // Utilisateurs - couleur UdM
  users: {
    icon: 'text-green-600',
    gradient: 'from-green-500 to-green-600',
    bg: 'bg-green-500/10'
  },
  // Emprunts - couleur UdM
  loans: {
    icon: 'text-yellow-600',
    gradient: 'from-yellow-500 to-yellow-600',
    bg: 'bg-yellow-500/10'
  }
};

// <Palette className="h-4 w-4" /> Classes CSS utilitaires UdM
export const utilityClasses = {
  // Boutons principaux UdM
  primaryButton: 'bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white font-semibold shadow-lg',
  secondaryButton: 'bg-gradient-to-r from-gray-600 to-gray-700 hover:from-gray-700 hover:to-gray-800 text-white font-semibold shadow-lg',
  outlineButton: 'border-2 border-slate-300 dark:border-slate-600 hover:border-green-400 dark:hover:border-green-500 font-semibold',

  // Cartes UdM
  card: 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-lg hover:shadow-xl transition-shadow duration-200 rounded-lg',
  cardHeader: 'bg-gray-50 dark:bg-gray-700',

  // Textes UdM
  titleGradient: 'bg-gradient-to-r from-slate-800 via-green-600 to-slate-800 dark:from-slate-200 dark:via-green-400 dark:to-slate-200 bg-clip-text text-transparent',
  subtitleText: 'text-gray-600 dark:text-gray-300 font-medium',

  // Backgrounds UdM
  pageBackground: 'bg-gray-50 dark:bg-gray-900',
  headerBackground: 'bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700'
};

export default colorPalette;
