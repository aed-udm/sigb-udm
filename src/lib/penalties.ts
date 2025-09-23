/**
 * Bibliothèque de gestion des pénalités en temps réel
 * Génère automatiquement les pénalités lors des retours en retard
 */

import { executeQuery } from '@/lib/mysql';
import { v4 as uuidv4 } from 'uuid';

export interface PenaltyData {
  id?: string;
  user_id: string;
  loan_id: string;
  penalty_type: 'late_return' | 'damage' | 'loss' | 'other';
  amount_fcfa: number;
  penalty_date: string;
  due_date: string;
  status: 'unpaid' | 'paid' | 'waived' | 'partial';
  description?: string;
}

/**
 * Créer automatiquement une pénalité pour retard
 */
export async function createLatePenalty(
  userId: string, 
  loanId: string, 
  daysLate: number,
  documentType: string = 'book'
): Promise<string> {
  try {
    // Récupérer les paramètres de pénalité pour ce type de document
    const settingsQuery = `
      SELECT daily_rate, max_penalty, grace_period_days 
      FROM penalty_settings 
      WHERE document_type = ? AND is_active = 1
    `;
    
    const [settings] = await executeQuery(settingsQuery, [documentType]) as any[];
    
    const dailyRate = settings?.daily_rate || 100; // Défaut: 100 FCFA/jour
    const maxPenalty = settings?.max_penalty || 5000; // Défaut: 5000 FCFA max
    const gracePeriod = settings?.grace_period_days || 1; // Défaut: 1 jour de grâce
    
    // Calculer le montant (en soustrayant la période de grâce)
    const effectiveDaysLate = Math.max(0, daysLate - gracePeriod);
    const calculatedAmount = Math.min(effectiveDaysLate * dailyRate, maxPenalty);
    
    if (calculatedAmount <= 0) {
      return ''; // Pas de pénalité si dans la période de grâce
    }
    
    const penaltyId = uuidv4();
    const penaltyDate = new Date().toISOString().split('T')[0];
    const dueDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]; // 30 jours pour payer
    
    const insertQuery = `
      INSERT INTO penalties (
        id, user_id, loan_id, penalty_type, amount_fcfa, 
        penalty_date, due_date, status, description, created_at
      ) VALUES (?, ?, ?, 'late_return', ?, ?, ?, 'unpaid', ?, NOW())
    `;
    
    const description = `Retard de ${daysLate} jour(s) pour ${documentType} (${effectiveDaysLate} jours facturés après période de grâce)`;
    
    await executeQuery(insertQuery, [
      penaltyId, userId, loanId, calculatedAmount,
      penaltyDate, dueDate, description
    ]);

    // 📧 ENVOYER EMAIL DE NOTIFICATION DE PÉNALITÉ CRÉÉE
    try {
      // Récupérer les informations utilisateur et du document
      const userAndDocumentInfo = await executeQuery(`
        SELECT
          u.full_name, u.email,
          l.document_type,
          CASE
            WHEN l.document_type = 'book' THEN b.title
            WHEN l.document_type = 'these' THEN t.title
            WHEN l.document_type = 'memoire' THEN m.title
            WHEN l.document_type = 'rapport_stage' THEN s.title
            ELSE 'Document non spécifié'
          END as document_title,
          CASE
            WHEN l.document_type = 'book' THEN b.main_author
            WHEN l.document_type = 'these' THEN t.main_author
            WHEN l.document_type = 'memoire' THEN m.main_author
            WHEN l.document_type = 'rapport_stage' THEN s.student_name
            ELSE 'Auteur non spécifié'
          END as document_author,
          l.due_date, l.return_date
        FROM users u
        INNER JOIN loans l ON u.id = l.user_id
        LEFT JOIN books b ON l.book_id = b.id AND l.document_type = 'book'
        LEFT JOIN theses t ON l.academic_document_id = t.id AND l.document_type = 'these'
        LEFT JOIN memoires m ON l.academic_document_id = m.id AND l.document_type = 'memoire'
        LEFT JOIN stage_reports s ON l.academic_document_id = s.id AND l.document_type = 'rapport_stage'
        WHERE u.id = ? AND l.id = ?
      `, [userId, loanId]) as Array<any>;

      if (userAndDocumentInfo.length > 0) {
        const info = userAndDocumentInfo[0];

        // Importer le service d'email de manière dynamique pour éviter les dépendances circulaires
        const { EmailNotificationService } = await import('@/lib/services/email-notification-service');

        const penaltyEmailData = {
          user_name: info.full_name,
          user_email: info.email,
          document_title: info.document_title,
          document_author: info.document_author,
          document_type: info.document_type as 'book' | 'these' | 'memoire' | 'rapport_stage',
          penalty_amount: calculatedAmount,
          days_late: daysLate,
          due_date: info.due_date,
          penalty_due_date: dueDate,
          description: description
        };

        // Créer la méthode sendPenaltyCreatedNotification si elle n'existe pas
        if (typeof EmailNotificationService.sendPenaltyCreatedNotification === 'function') {
          const emailSent = await EmailNotificationService.sendPenaltyCreatedNotification(penaltyEmailData);
          if (emailSent) {
            console.log(`✅ Email de notification de pénalité envoyé à ${info.email}`);
          } else {
            console.log(`⚠️ Échec envoi email de notification de pénalité à ${info.email}`);
          }
        } else {
          console.log(`⚠️ Méthode sendPenaltyCreatedNotification non disponible - Ajout nécessaire`);
        }
      }
    } catch (emailError) {
      console.error('❌ Erreur envoi email notification pénalité:', emailError);
    }

    // Logger l'action
    await logSystemAction('penalty_created', 'penalties', penaltyId, userId,
      `Pénalité créée automatiquement: ${calculatedAmount} FCFA pour retard de ${daysLate} jours`);

    return penaltyId;
    
  } catch (error) {
    console.error('Erreur création pénalité automatique:', error);
    throw error;
  }
}

/**
 * Marquer une pénalité comme payée
 */
export async function markPenaltyAsPaid(
  penaltyId: string,
  paymentMethod: 'cash' | 'bank_transfer' | 'mobile_money' | 'check',
  receiptNumber?: string,
  userId?: string
): Promise<void> {
  try {
    const updateQuery = `
      UPDATE penalties 
      SET status = 'paid', 
          payment_date = CURDATE(),
          payment_method = ?,
          receipt_number = ?,
          updated_at = NOW()
      WHERE id = ? AND status = 'unpaid'
    `;
    
    const result = await executeQuery(updateQuery, [paymentMethod, receiptNumber, penaltyId]);
    
    if ((result as any).affectedRows === 0) {
      throw new Error('Pénalité non trouvée ou déjà payée');
    }
    
    // Logger l'action
    await logSystemAction('penalty_paid', 'penalties', penaltyId, userId, 
      `Pénalité payée via ${paymentMethod}${receiptNumber ? ` - Reçu: ${receiptNumber}` : ''}`);
    
  } catch (error) {
    console.error('Erreur paiement pénalité:', error);
    throw error;
  }
}

/**
 * Annuler une pénalité (waive)
 */
export async function waivePenalty(
  penaltyId: string,
  reason: string,
  waivedBy: string
): Promise<void> {
  try {
    const updateQuery = `
      UPDATE penalties 
      SET status = 'waived',
          waived_by = ?,
          waived_reason = ?,
          updated_at = NOW()
      WHERE id = ? AND status = 'unpaid'
    `;
    
    const result = await executeQuery(updateQuery, [waivedBy, reason, penaltyId]);
    
    if ((result as any).affectedRows === 0) {
      throw new Error('Pénalité non trouvée ou déjà traitée');
    }
    
    // Logger l'action
    await logSystemAction('penalty_waived', 'penalties', penaltyId, waivedBy, 
      `Pénalité annulée - Raison: ${reason}`);
    
  } catch (error) {
    console.error('Erreur annulation pénalité:', error);
    throw error;
  }
}

/**
 * Logger une action système
 */
export async function logSystemAction(
  action: string,
  tableName?: string,
  recordId?: string,
  userId?: string,
  message?: string,
  level: 'info' | 'warning' | 'error' | 'critical' | 'debug' = 'info',
  context?: any
): Promise<void> {
  try {
    const insertQuery = `
      INSERT INTO system_logs (
        action, table_name, record_id, user_id, message, level, context, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, NOW())
    `;
    
    await executeQuery(insertQuery, [
      action,
      tableName || null,
      recordId || null,
      userId || null,
      message || `Action: ${action}`,
      level,
      context ? JSON.stringify(context) : null
    ]);
    
  } catch (error) {
    console.error('Erreur logging système:', error);
    // Ne pas faire échouer l'opération principale si le log échoue
  }
}

/**
 * Vérifier et créer automatiquement les pénalités pour tous les emprunts en retard
 */
export async function processOverdueLoans(): Promise<void> {
  try {
    // Récupérer tous les emprunts en retard sans pénalité existante
    const overdueQuery = `
      SELECT 
        l.id as loan_id,
        l.user_id,
        l.book_id,
        l.due_date,
        DATEDIFF(CURDATE(), l.due_date) as days_late,
        'book' as document_type,
        COALESCE(p.id, '') as existing_penalty_id
      FROM loans l
      LEFT JOIN books b ON l.book_id = b.id
      LEFT JOIN penalties p ON l.id = p.loan_id AND p.penalty_type = 'late_return'
      WHERE l.status = 'active' 
        AND l.due_date < CURDATE()
        AND p.id IS NULL
    `;
    
    const overdueLoans = await executeQuery(overdueQuery) as any[];
    
    for (const loan of overdueLoans) {
      await createLatePenalty(
        loan.user_id,
        loan.loan_id,
        loan.days_late,
        loan.document_type || 'book'
      );
    }
    
    if (overdueLoans.length > 0) {
      await logSystemAction('batch_penalties_created', undefined, undefined, 'system', 
        `${overdueLoans.length} pénalités créées automatiquement pour emprunts en retard`);
    }
    
  } catch (error) {
    console.error('Erreur traitement emprunts en retard:', error);
    await logSystemAction('batch_penalties_error', undefined, undefined, 'system', 
      `Erreur lors du traitement des emprunts en retard: ${error}`, 'error');
  }
}
