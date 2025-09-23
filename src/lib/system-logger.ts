/**
 * Système de logging centralisé pour le SIGB
 * Enregistre automatiquement toutes les actions importantes
 */

import { executeQuery } from '@/lib/mysql';

export interface LogEntry {
  action: string;
  table_name?: string;
  record_id?: string;
  user_id?: string;
  user_email?: string;
  ip_address?: string;
  user_agent?: string;
  message: string;
  level: 'info' | 'warning' | 'error' | 'critical' | 'debug';
  context?: any;
  session_id?: string;
  request_method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  request_url?: string;
  response_status?: number;
  execution_time?: number;
}

/**
 * Logger principal - enregistre toutes les actions système
 */
export async function logAction(entry: LogEntry): Promise<void> {
  try {
    const insertQuery = `
      INSERT INTO system_logs (
        action, table_name, record_id, user_id, user_email, ip_address,
        user_agent, message, level, context, session_id, request_method,
        request_url, response_status, execution_time, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
    `;
    
    await executeQuery(insertQuery, [
      entry.action,
      entry.table_name || null,
      entry.record_id || null,
      entry.user_id || null,
      entry.user_email || null,
      entry.ip_address || null,
      entry.user_agent || null,
      entry.message,
      entry.level,
      entry.context ? JSON.stringify(entry.context) : null,
      entry.session_id || null,
      entry.request_method || null,
      entry.request_url || null,
      entry.response_status || null,
      entry.execution_time || null
    ]);
    
  } catch (error) {
    console.error('Erreur système de logging:', error);
    // Ne pas faire échouer l'opération principale
  }
}

/**
 * Logger pour les connexions utilisateur
 */
export async function logUserLogin(
  userId: string,
  userEmail: string,
  success: boolean,
  ipAddress?: string,
  userAgent?: string
): Promise<void> {
  await logAction({
    action: success ? 'login_success' : 'login_failed',
    user_id: userId,
    user_email: userEmail,
    ip_address: ipAddress,
    user_agent: userAgent,
    message: success ? 
      `Connexion réussie pour ${userEmail}` : 
      `Échec de connexion pour ${userEmail}`,
    level: success ? 'info' : 'warning'
  });
}

/**
 * Logger pour les opérations CRUD
 */
export async function logCrudOperation(
  operation: 'create' | 'read' | 'update' | 'delete',
  tableName: string,
  recordId: string,
  userId?: string,
  details?: any
): Promise<void> {
  const actionMap = {
    create: 'record_created',
    read: 'record_accessed',
    update: 'record_updated',
    delete: 'record_deleted'
  };
  
  await logAction({
    action: actionMap[operation],
    table_name: tableName,
    record_id: recordId,
    user_id: userId,
    message: `${operation.toUpperCase()} opération sur ${tableName} (ID: ${recordId})`,
    level: 'info',
    context: details
  });
}

/**
 * Logger pour les emprunts et retours
 */
export async function logLibraryOperation(
  operation: 'loan_created' | 'loan_returned' | 'loan_renewed' | 'reservation_created' | 'reservation_updated' | 'reservation_cancelled' | 'reservation_fulfilled',
  userId: string,
  bookId: string,
  details?: any
): Promise<void> {
  const messages = {
    loan_created: 'Nouvel emprunt créé',
    loan_returned: 'Livre retourné',
    loan_renewed: 'Emprunt renouvelé',
    reservation_created: 'Nouvelle réservation',
    reservation_updated: 'Réservation mise à jour',
    reservation_cancelled: 'Réservation annulée',
    reservation_fulfilled: 'Réservation satisfaite'
  };
  
  await logAction({
    action: operation,
    table_name: operation.includes('loan') ? 'loans' : 'reservations',
    record_id: details?.recordId,
    user_id: userId,
    message: `${messages[operation]} - Utilisateur: ${userId}, Livre: ${bookId}`,
    level: 'info',
    context: { book_id: bookId, ...details }
  });
}

/**
 * Logger pour les erreurs système
 */
export async function logError(
  error: Error,
  context?: {
    action?: string;
    userId?: string;
    requestUrl?: string;
    additionalInfo?: any;
  }
): Promise<void> {
  await logAction({
    action: context?.action || 'system_error',
    user_id: context?.userId,
    request_url: context?.requestUrl,
    message: `Erreur système: ${error.message}`,
    level: 'error',
    context: {
      error_stack: error.stack,
      ...context?.additionalInfo
    }
  });
}

/**
 * Logger pour les synchronisations DICAMES
 */
export async function logDicamesSync(
  operation: 'sync_started' | 'sync_completed' | 'sync_failed',
  details: {
    documentsProcessed?: number;
    errors?: string[];
    duration?: number;
  }
): Promise<void> {
  await logAction({
    action: 'dicames_sync',
    message: `Synchronisation DICAMES: ${operation}`,
    level: operation === 'sync_failed' ? 'error' : 'info',
    context: details
  });
}

/**
 * Logger pour les accès aux documents
 */
export async function logDocumentAccess(
  documentType: 'book' | 'these' | 'memoire' | 'rapport_stage',
  documentId: string,
  userId?: string,
  accessType: 'view' | 'download' | 'search' = 'view'
): Promise<void> {
  await logAction({
    action: 'document_accessed',
    table_name: documentType === 'book' ? 'books' : 
                documentType === 'these' ? 'theses' :
                documentType === 'memoire' ? 'memoires' : 'stage_reports',
    record_id: documentId,
    user_id: userId,
    message: `Document ${accessType}: ${documentType} (ID: ${documentId})`,
    level: 'info',
    context: { document_type: documentType, access_type: accessType }
  });
}

/**
 * Logger pour les modifications de configuration
 */
export async function logConfigChange(
  configType: string,
  oldValue: any,
  newValue: any,
  userId: string
): Promise<void> {
  await logAction({
    action: 'config_changed',
    user_id: userId,
    message: `Configuration modifiée: ${configType}`,
    level: 'info',
    context: {
      config_type: configType,
      old_value: oldValue,
      new_value: newValue
    }
  });
}

/**
 * Nettoyer les anciens logs (à exécuter périodiquement)
 */
export async function cleanupOldLogs(daysToKeep: number = 90): Promise<void> {
  try {
    const deleteQuery = `
      DELETE FROM system_logs 
      WHERE created_at < DATE_SUB(NOW(), INTERVAL ? DAY)
      AND level NOT IN ('error', 'critical')
    `;
    
    const result = await executeQuery(deleteQuery, [daysToKeep]);
    
    await logAction({
      action: 'logs_cleanup',
      message: `Nettoyage des logs: ${(result as any).affectedRows} entrées supprimées`,
      level: 'info',
      context: { days_kept: daysToKeep, deleted_count: (result as any).affectedRows }
    });
    
  } catch (error) {
    console.error('Erreur nettoyage des logs:', error);
  }
}
