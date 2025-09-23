/**
 * Utilitaires pour les couleurs et styles des badges de notification
 */

export type NotificationBadgeType = 'info' | 'warning' | 'error' | 'success' | 'neutral' | 'coming_soon';

export const notificationBadgeColors = {
  info: 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900 dark:text-green-300 dark:border-green-800',
  warning: 'bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900 dark:text-yellow-300 dark:border-yellow-800',
  error: 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900 dark:text-red-300 dark:border-red-800',
  success: 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900 dark:text-green-300 dark:border-green-800',
  neutral: 'bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-900 dark:text-gray-300 dark:border-gray-800',
  coming_soon: 'bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-500 dark:text-white dark:border-orange-400'
};

/**
 * Obtenir les classes CSS pour un badge de notification
 */
export function getNotificationBadgeClasses(type: NotificationBadgeType, pulse: boolean = false): string {
  const baseClasses = 'inline-flex items-center justify-center px-2 py-1 text-xs font-medium rounded-full border';
  
  const typeClasses = notificationBadgeColors[type];
  const pulseClass = pulse ? 'animate-pulse' : '';
  
  return `${baseClasses} ${typeClasses} ${pulseClass}`.trim();
}

/**
 * Déterminer le type de badge basé sur l'item et la valeur
 */
export function getNotificationBadgeType(itemName: string, value: string | number): NotificationBadgeType {
  const stringValue = String(value).toLowerCase();
  
  // Badges spéciaux par nom d'item
  if (itemName.toLowerCase().includes('autres documents') && (stringValue === 'à venir' || stringValue === 'bientôt' || stringValue === 'en développement')) {
    return 'coming_soon';
  }
  
  // Badges par valeur textuelle
  if (stringValue === 'nouveau') return 'success';
  if (stringValue === '!' || stringValue === 'urgent') return 'error';
  if (stringValue === 'attention') return 'warning';
  
  // Badges numériques
  const numValue = typeof value === 'number' ? value : parseInt(String(value)) || 0;
  
  if (itemName.toLowerCase().includes('emprunt') && numValue > 0) {
    return numValue >= 10 ? 'error' : numValue >= 5 ? 'warning' : 'info';
  }
  
  return numValue > 0 ? 'info' : 'neutral';
}

/**
 * Déterminer si le badge doit pulser
 */
export function shouldBadgePulse(itemName: string, value: string | number): boolean {
  const badgeType = getNotificationBadgeType(itemName, value);
  return badgeType === 'error' || badgeType === 'warning' || badgeType === 'coming_soon';
}