/**
 * Utilitaires pour récupérer les paramètres système depuis la base de données
 * IMPORTANT: Ce fichier ne doit être utilisé QUE côté serveur (API routes)
 */

// Import conditionnel pour éviter les erreurs côté client
let executeQuery: any;

if (typeof window === 'undefined') {
  // Côté serveur seulement
  executeQuery = require('@/lib/mysql').executeQuery;
}

export interface SystemSetting {
  key: string;
  value: any;
  type: 'string' | 'number' | 'boolean' | 'json';
  category: string;
}

/**
 * Récupère un paramètre système par sa clé
 */
export async function getSystemSetting(key: string): Promise<any> {
  if (typeof window !== 'undefined') {
    throw new Error('getSystemSetting ne peut être utilisé que côté serveur');
  }
  
  try {
    const result = await executeQuery(
      'SELECT value, type FROM system_settings WHERE setting_key = ?',
      [key]
    ) as any[];

    if (result.length === 0) {
      return null;
    }

    const setting = result[0];
    return parseSettingValue(setting.value, setting.type);
  } catch (error) {
    console.error(`Erreur lors de la récupération du paramètre ${key}:`, error);
    return null;
  }
}

/**
 * Récupère plusieurs paramètres système par catégorie
 */
export async function getSystemSettingsByCategory(category: string): Promise<Record<string, any>> {
  if (typeof window !== 'undefined') {
    throw new Error('getSystemSettingsByCategory ne peut être utilisé que côté serveur');
  }
  
  try {
    const results = await executeQuery(
      'SELECT setting_key, value, type FROM system_settings WHERE category = ?',
      [category]
    ) as any[];

    const settings: Record<string, any> = {};
    
    for (const row of results) {
      settings[row.setting_key] = parseSettingValue(row.value, row.type);
    }

    return settings;
  } catch (error) {
    console.error(`Erreur lors de la récupération des paramètres de la catégorie ${category}:`, error);
    return {};
  }
}

/**
 * Récupère tous les paramètres système
 */
export async function getAllSystemSettings(): Promise<Record<string, Record<string, any>>> {
  try {
    const results = await executeQuery(
      'SELECT setting_key, value, type, category FROM system_settings'
    ) as any[];

    const settings: Record<string, Record<string, any>> = {};
    
    for (const row of results) {
      if (!settings[row.category]) {
        settings[row.category] = {};
      }
      settings[row.category][row.setting_key] = parseSettingValue(row.value, row.type);
    }

    return settings;
  } catch (error) {
    console.error('Erreur lors de la récupération de tous les paramètres système:', error);
    return {};
  }
}

/**
 * Met à jour un paramètre système
 */
export async function updateSystemSetting(key: string, value: any, type: string, category: string): Promise<boolean> {
  try {
    const stringValue = stringifySettingValue(value, type);
    
    await executeQuery(
      `INSERT INTO system_settings (setting_key, value, type, category, updated_at) 
       VALUES (?, ?, ?, ?, NOW()) 
       ON DUPLICATE KEY UPDATE 
       value = VALUES(value), 
       type = VALUES(type), 
       category = VALUES(category), 
       updated_at = NOW()`,
      [key, stringValue, type, category]
    );

    return true;
  } catch (error) {
    console.error(`Erreur lors de la mise à jour du paramètre ${key}:`, error);
    return false;
  }
}

/**
 * Récupère les paramètres par défaut pour les nouveaux utilisateurs
 */
export async function getDefaultUserSettings(): Promise<{
  max_loans_per_user: number;
  max_reservations_per_user: number;
  default_loan_duration: number;
  default_reservation_duration: number;
}> {
  try {
    const loanSettings = await getSystemSettingsByCategory('loans');
    
    return {
      max_loans_per_user: loanSettings.max_loans_per_user || 3,
      max_reservations_per_user: loanSettings.max_reservations_per_user || 2,
      default_loan_duration: loanSettings.default_loan_duration || 21,
      default_reservation_duration: loanSettings.default_reservation_duration || 7,
    };
  } catch (error) {
    console.error('Erreur lors de la récupération des paramètres utilisateur par défaut:', error);
    return {
      max_loans_per_user: 3,
      max_reservations_per_user: 2,
      default_loan_duration: 21,
      default_reservation_duration: 7,
    };
  }
}

/**
 * Parse une valeur de paramètre selon son type
 */
function parseSettingValue(value: string, type: string): any {
  switch (type) {
    case 'number':
      return parseInt(value, 10);
    case 'boolean':
      return value === 'true';
    case 'json':
      try {
        return JSON.parse(value);
      } catch {
        return value;
      }
    default:
      return value;
  }
}

/**
 * Convertit une valeur en string pour stockage
 */
function stringifySettingValue(value: any, type: string): string {
  switch (type) {
    case 'json':
      return JSON.stringify(value);
    case 'boolean':
      return value ? 'true' : 'false';
    default:
      return String(value);
  }
}
