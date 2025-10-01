import { clsx } from "clsx"
import type { ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(date: string | Date) {
  return new Intl.DateTimeFormat('fr-FR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(new Date(date))
}

export function formatDateTime(date: string | Date) {
  return new Intl.DateTimeFormat('fr-FR', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(date))
}

// Fonction supprimée - utiliser DocumentIdentifierService.generateCompleteIdentifier() à la place

export function calculateDueDate(loanDate: Date, daysToAdd: number = 14): Date {
  const dueDate = new Date(loanDate)
  dueDate.setDate(dueDate.getDate() + daysToAdd)
  return dueDate
}

export function isOverdue(dueDate: string | Date): boolean {
  return new Date(dueDate) < new Date()
}

export function getDaysOverdue(dueDate: string | Date): number {
  const due = new Date(dueDate)
  const now = new Date()

  // Utiliser la même logique que DATEDIFF de MySQL
  // Comparer les dates à minuit pour éviter les problèmes d'heures
  const dueAtMidnight = new Date(due.getFullYear(), due.getMonth(), due.getDate())
  const nowAtMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate())

  const diffTime = nowAtMidnight.getTime() - dueAtMidnight.getTime()
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))
  return diffDays > 0 ? diffDays : 0
}

export function getEffectiveDaysOverdue(dueDate: string | Date, gracePeriodDays: number = 1): number {
  const rawDaysOverdue = getDaysOverdue(dueDate)
  return Math.max(0, rawDaysOverdue - gracePeriodDays)
}

export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

export function validateBarcode(barcode: string): boolean {
  // Format: BIB + 6 digits + 6 alphanumeric characters
  const barcodeRegex = /^BIB\d{6}[A-Z0-9]{6}$/
  return barcodeRegex.test(barcode)
}

export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text
  return text.substring(0, maxLength) + '...'
}

// Fonction de sécurité pour nettoyer les entrées utilisateur
export function sanitizeInput(input: string): string {
  if (!input) return input;

  return input
    .replace(/[<>]/g, '') // Supprimer les balises HTML
    .replace(/javascript:/gi, '') // Supprimer les liens javascript
    .replace(/on\w+=/gi, '') // Supprimer les handlers d'événements
    .replace(/script/gi, '') // Supprimer le mot "script"
    .trim();
}

// Validation sécurisée des UUIDs
export function isValidUUID(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

// Détection de tentatives d'injection SQL
export function containsSQLInjection(input: string): boolean {
  const sqlPatterns = [
    /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION)\b)/i,
    /(\b(OR|AND)\s+\d+\s*=\s*\d+)/i,
    /(--|\/\*|\*\/)/,
    /(\b(SCRIPT|JAVASCRIPT|VBSCRIPT)\b)/i
  ];

  return sqlPatterns.some(pattern => pattern.test(input));
}

export function capitalizeFirstLetter(string: string): string {
  return string.charAt(0).toUpperCase() + string.slice(1)
}

export function formatPrice(price: number): string {
  return new Intl.NumberFormat('fr-CM', {
    style: 'currency',
    currency: 'XAF',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(price)
}

export function searchFilter<T>(
  items: T[],
  searchTerm: string,
  searchFields: (keyof T)[]
): T[] {
  if (!searchTerm) return items

  const lowercaseSearch = searchTerm.toLowerCase()

  return items.filter(item =>
    searchFields.some(field => {
      const value = item[field]
      if (typeof value === 'string') {
        return value.toLowerCase().includes(lowercaseSearch)
      }
      if (Array.isArray(value)) {
        return value.some(v =>
          typeof v === 'string' && v.toLowerCase().includes(lowercaseSearch)
        )
      }
      return false
    })
  )
}

// Fonctions spécifiques au contexte camerounais
export function validateCameroonPhone(phone: string): boolean {
  // Format camerounais: +237 6XX XX XX XX ou 6XX XX XX XX
  const phoneRegex = /^(\+237|237)?[6-9]\d{8}$/
  return phoneRegex.test(phone.replace(/\s/g, ''))
}

export function formatCameroonPhone(phone: string): string {
  const cleaned = phone.replace(/\D/g, '')
  if (cleaned.startsWith('237')) {
    const number = cleaned.substring(3)
    return `+237 ${number.substring(0, 3)} ${number.substring(3, 5)} ${number.substring(5, 7)} ${number.substring(7)}`
  }
  if (cleaned.length === 9) {
    return `+237 ${cleaned.substring(0, 3)} ${cleaned.substring(3, 5)} ${cleaned.substring(5, 7)} ${cleaned.substring(7)}`
  }
  return phone
}

// Fonction supprimée - utiliser DocumentIdentifierService.generateBarcode() à la place

export function calculateLateFee(daysLate: number): number {
  return daysLate * 100 // 100 FCFA par jour de retard
}

export function formatLateFee(daysLate: number): string {
  const fee = calculateLateFee(daysLate)
  return `${formatPrice(fee)} (${daysLate} jour${daysLate > 1 ? 's' : ''} de retard)`
}

export function isHoliday(date: Date): boolean {
  const month = (date.getMonth() + 1).toString().padStart(2, '0')
  const day = date.getDate().toString().padStart(2, '0')
  const dateStr = `${month}-${day}`

  const holidays = [
    '01-01', // Jour de l'An
    '02-11', // Fête de la Jeunesse
    '05-01', // Fête du Travail
    '05-20', // Fête Nationale
    '08-15', // Assomption
    '12-25'  // Noël
  ]

  return holidays.includes(dateStr)
}

export async function calculateDueDateCameroon(loanDate: Date, duration?: number): Promise<Date> {
  // Récupérer la durée par défaut depuis les paramètres système si non spécifiée
  if (duration === undefined) {
    try {
      const response = await fetch('/api/admin/settings?category=loans');
      if (response.ok) {
        const data = await response.json();
        const loanSettings = data.data.settings.loans;
        const defaultDurationSetting = loanSettings?.find((s: any) => s.key === 'default_loan_duration');
        duration = defaultDurationSetting?.value || 21;
      } else {
        duration = 21; // Fallback
      }
    } catch (error) {
      duration = 21; // Fallback en cas d'erreur
    }
  }

  return calculateDueDateCameroonSync(loanDate, duration);
}

export function calculateDueDateCameroonSync(loanDate: Date, duration: number = 21): Date {
  const dueDate = new Date(loanDate)
  let daysAdded = 0

  while (daysAdded < duration) {
    dueDate.setDate(dueDate.getDate() + 1)

    // Skip weekends and holidays
    if (dueDate.getDay() !== 0 && dueDate.getDay() !== 6 && !isHoliday(dueDate)) {
      daysAdded++
    }
  }

  return dueDate
}

// Fonction formatPrice déjà définie ligne 73

// UTILITAIRE DE COULEURS UNIFIÉ - REMPLACE TOUTES LES FONCTIONS getStatusColor
export function getStatusColor(status: string, variant: 'badge' | 'solid' | 'user' | 'digital' = 'badge'): string {
  const colorMaps = {
    // Couleurs pour badges (style léger)
    badge: {
      active: 'bg-green-100 text-green-800 border-green-200',
      returned: 'bg-green-100 text-blue-800 border-green-200',
      overdue: 'bg-red-100 text-red-800 border-red-200',
      reserved: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      available: 'bg-green-100 text-green-800 border-green-200',
      borrowed: 'bg-orange-100 text-orange-800 border-orange-200',
      maintenance: 'bg-gray-100 text-gray-800 border-gray-200',
      lost: 'bg-red-100 text-red-800 border-red-200',
      cancelled: 'bg-gray-100 text-gray-800 border-gray-200',
      expired: 'bg-red-100 text-red-800 border-red-200',
      fulfilled: 'bg-green-100 text-blue-800 border-green-200'
    },
    // Couleurs solides (style foncé)
    solid: {
      active: 'bg-green-600 dark:bg-green-500 text-white border border-green-700 dark:border-green-400 shadow-sm',
      returned: 'bg-green-600 dark:bg-green-500 text-white border border-green-700 dark:border-green-400 shadow-sm',
      overdue: 'bg-red-600 dark:bg-red-500 text-white border border-red-700 dark:border-red-400 shadow-sm',
      fulfilled: 'bg-green-600 dark:bg-green-500 text-white border border-green-700 dark:border-green-400 shadow-sm',
      expired: 'bg-red-600 dark:bg-red-500 text-white border border-red-700 dark:border-red-400 shadow-sm',
      cancelled: 'bg-gray-600 dark:bg-gray-500 text-white border border-gray-700 dark:border-gray-400 shadow-sm'
    },
    // Couleurs pour utilisateurs
    user: {
      active: 'bg-green-100 text-green-800 border-green-300',
      inactive: 'bg-gray-100 text-gray-800 border-gray-300',
      overdue: 'bg-red-100 text-red-800 border-red-300',
      limited: 'bg-yellow-100 text-yellow-800 border-yellow-300'
    },
    // Couleurs pour versions numériques
    digital: {
      available: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
      restricted: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
      preview_only: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
      not_found: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300'
    }
  };

  const colorMap = colorMaps[variant];
  return colorMap[status as keyof typeof colorMap] || colorMaps.badge.cancelled;
}

// Alias pour compatibilité
export const getBadgeColor = (status: string) => getStatusColor(status, 'badge');

// Utilitaires pour la gestion des erreurs (consolidé depuis error-utils.ts)
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  return 'Une erreur inconnue s\'est produite';
}

export function isNetworkError(error: unknown): boolean {
  return error instanceof Error && (
    error.message.includes('fetch') ||
    error.message.includes('network') ||
    error.message.includes('NetworkError')
  );
}

// Utilitaires pour le mode sombre (consolidé depuis dark-mode-utils.ts)
export function getSystemTheme(): 'light' | 'dark' {
  if (typeof window !== 'undefined') {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  return 'light';
}

export function applyTheme(theme: 'light' | 'dark' | 'system'): void {
  if (typeof window === 'undefined') return;

  const root = window.document.documentElement;
  root.classList.remove('light', 'dark');

  if (theme === 'system') {
    const systemTheme = getSystemTheme();
    root.classList.add(systemTheme);
  } else {
    root.classList.add(theme);
  }
}

// Fonctions pour la compatibilité avec les imports existants
export function generateCameroonBarcode(type: 'user' | 'book' | 'thesis' | 'memoire' | 'stage_report' = 'user'): string {
  const now = new Date()
  const year = now.getFullYear()
  const month = (now.getMonth() + 1).toString().padStart(2, '0')
  const seq = Math.floor(Math.random() * 9999)

  switch (type) {
    case 'user':
      return `BIB${year}${month}${seq.toString().padStart(4, '0')}`
    case 'book':
      return `LIV${seq.toString().padStart(6, '0')}`
    case 'thesis':
      return `THE${year}${seq.toString().padStart(3, '0')}`
    case 'memoire':
      return `MEM${year}${seq.toString().padStart(3, '0')}`
    case 'stage_report':
      return `RAP${year}${seq.toString().padStart(3, '0')}`
    default:
      return `BIB${year}${month}${seq.toString().padStart(4, '0')}`
  }
}

// Fonctions pour la gestion des erreurs de validation
export function isZodError(error: unknown): boolean {
  return error && typeof error === 'object' && 'issues' in error;
}

export function createValidationErrorResponse(error: unknown) {
  return {
    success: false,
    message: 'Données invalides',
    errors: isZodError(error) ? (error as any).issues : []
  };
}

export function createDatabaseErrorResponse(error: unknown) {
  return {
    success: false,
    message: 'Erreur de base de données',
    error: error instanceof Error ? error.message : 'Erreur inconnue'
  };
}
