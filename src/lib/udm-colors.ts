/**
 * Configuration des couleurs spécifiques à l'Université des Montagnes (UdM)
 * Charte graphique : Vert, Gris, Blanc comme couleurs principales
 * Couleurs existantes conservées comme couleurs secondaires
 */

// Couleurs principales UdM
export const udmColors = {
  // Vert UdM - Couleur principale
  green: {
    50: '#f0fdf4',
    100: '#dcfce7',
    200: '#bbf7d0',
    300: '#86efac',
    400: '#4ade80',
    500: '#22c55e',  // Vert principal UdM
    600: '#16a34a',
    700: '#15803d',
    800: '#166534',
    900: '#14532d',
  },
  
  // Gris UdM - Couleur neutre
  gray: {
    50: '#f8fafc',
    100: '#f1f5f9',
    200: '#e2e8f0',
    300: '#cbd5e1',
    400: '#94a3b8',
    500: '#64748b',  // Gris principal UdM
    600: '#475569',
    700: '#334155',
    800: '#1e293b',
    900: '#0f172a',
  },
  
  // Blanc UdM
  white: '#ffffff',
  
  // Couleurs d'accent UdM
  accent: {
    lightGreen: '#86efac',
    darkGreen: '#15803d',
    lightGray: '#e2e8f0',
    darkGray: '#334155',
  }
};

// Gradients UdM
export const udmGradients = {
  primary: 'from-green-600 to-green-700',
  secondary: 'from-gray-600 to-gray-700',
  hero: 'from-gray-800 via-green-600 to-gray-800',
  card: 'from-green-500/10 to-gray-500/10',
  background: 'from-gray-50 via-white to-green-50',
  backgroundDark: 'from-gray-900 via-gray-800 to-green-900',
};

// Classes CSS UdM
export const udmClasses = {
  // Boutons UdM
  primaryButton: 'bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white font-semibold shadow-lg transition-all duration-200',
  secondaryButton: 'bg-gradient-to-r from-gray-600 to-gray-700 hover:from-gray-700 hover:to-gray-800 text-white font-semibold shadow-lg transition-all duration-200',
  outlineButton: 'border-2 border-green-500 hover:border-green-600 text-green-600 hover:text-green-700 hover:bg-green-50 dark:hover:bg-green-900/20 font-semibold transition-all duration-200',
  
  // Navigation UdM
  navLink: 'text-gray-700 hover:text-green-600 hover:bg-green-50 dark:text-gray-300 dark:hover:text-green-400 dark:hover:bg-green-900/20 transition-all duration-200',
  navLinkActive: 'text-green-600 bg-green-50 dark:text-green-400 dark:bg-green-900/20',
  
  // Cartes UdM
  card: 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-lg hover:shadow-xl transition-all duration-200 rounded-lg',
  cardHeader: 'bg-green-50 dark:bg-green-900/20 border-b border-green-200 dark:border-green-700',
  
  // Textes UdM
  titlePrimary: 'text-green-700 dark:text-green-400 font-bold',
  titleSecondary: 'text-gray-700 dark:text-gray-300 font-semibold',
  titleGradient: 'bg-gradient-to-r from-gray-800 via-green-600 to-gray-800 dark:from-gray-200 dark:via-green-400 dark:to-gray-200 bg-clip-text text-transparent',
  
  // Badges UdM
  badgePrimary: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 border border-green-200 dark:border-green-700',
  badgeSecondary: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300 border border-gray-200 dark:border-gray-700',
  
  // Backgrounds UdM
  pageBackground: 'bg-gradient-to-br from-gray-50 via-white to-green-50 dark:from-gray-900 dark:via-gray-800 dark:to-green-900',
  sectionBackground: 'bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm',
};

// Couleurs spécifiques par type de document (conservées)
export const documentColors = {
  books: {
    primary: 'blue',
    icon: 'text-green-600 dark:text-green-400',
    bg: 'bg-green-50 dark:bg-green-900/20',
    border: 'border-green-200 dark:border-green-700',
    badge: 'bg-green-600 dark:bg-green-500 text-white',
  },
  theses: {
    primary: 'pink',
    icon: 'text-pink-600 dark:text-pink-400',
    bg: 'bg-pink-50 dark:bg-pink-900/20',
    border: 'border-pink-200 dark:border-pink-700',
    badge: 'bg-pink-600 dark:bg-pink-500 text-white',
  },
  memoires: {
    primary: 'green',
    icon: 'text-green-600 dark:text-green-400',
    bg: 'bg-green-50 dark:bg-green-900/20',
    border: 'border-green-200 dark:border-green-700',
    badge: 'bg-green-600 dark:bg-green-500 text-white',
  },
  reports: {
    primary: 'purple',
    icon: 'text-purple-600 dark:text-purple-400',
    bg: 'bg-purple-50 dark:bg-purple-900/20',
    border: 'border-purple-200 dark:border-purple-700',
    badge: 'bg-purple-600 dark:bg-purple-500 text-white',
  },
};

// Fonction utilitaire pour obtenir les couleurs UdM
export function getUdmColor(shade: keyof typeof udmColors.green = 500) {
  return udmColors.green[shade];
}

// Fonction utilitaire pour obtenir les couleurs grises UdM
export function getUdmGray(shade: keyof typeof udmColors.gray = 500) {
  return udmColors.gray[shade];
}

// Fonction pour obtenir les classes CSS selon le contexte UdM
export function getUdmContextClasses(context: 'primary' | 'secondary' | 'neutral' = 'primary') {
  switch (context) {
    case 'primary':
      return {
        text: 'text-green-600 dark:text-green-400',
        bg: 'bg-green-50 dark:bg-green-900/20',
        border: 'border-green-200 dark:border-green-700',
        hover: 'hover:bg-green-100 dark:hover:bg-green-900/30',
      };
    case 'secondary':
      return {
        text: 'text-gray-600 dark:text-gray-400',
        bg: 'bg-gray-50 dark:bg-gray-900/20',
        border: 'border-gray-200 dark:border-gray-700',
        hover: 'hover:bg-gray-100 dark:hover:bg-gray-900/30',
      };
    case 'neutral':
      return {
        text: 'text-gray-700 dark:text-gray-300',
        bg: 'bg-white dark:bg-gray-800',
        border: 'border-gray-200 dark:border-gray-700',
        hover: 'hover:bg-gray-50 dark:hover:bg-gray-700',
      };
    default:
      return getUdmContextClasses('primary');
  }
}

export default udmColors;
