/**
 * Service de rappels automatiques
 * Gestion des notifications d'échéance et de disponibilité
 * Université des Montagnes - SIGB UdM
 */

import { executeQuery } from '@/lib/mysql';
import { EmailNotificationService, ReminderNotificationData, AvailabilityNotificationData } from './email-notification-service';
import { logLibraryOperation, logError } from '@/lib/system-logger';

export class ReminderService {
  
  /**
   * Envoyer des rappels pour les emprunts qui arrivent à échéance
   */
  static async sendDueReminders(): Promise<{ sent: number; errors: number }> {
    let sent = 0;
    let errors = 0;

    try {
      // Récupérer les emprunts qui arrivent à échéance dans 3 jours
      const reminderDays = parseInt(process.env.EMAIL_REMINDER_DAYS_BEFORE || '3');
      
      const loansNearDue = await executeQuery(`
        SELECT
          l.id as loan_id,
          l.due_date,
          l.document_type,
          u.full_name as user_name,
          u.email as user_email,
          CASE WHEN l.document_type = 'book' THEN b.title ELSE ad.title END as document_title,
          CASE WHEN l.document_type = 'book' THEN b.main_author ELSE ad.main_author END as document_author,
          DATEDIFF(l.due_date, CURDATE()) as days_until_due
        FROM loans l
        INNER JOIN users u ON l.user_id = u.id
        LEFT JOIN books b ON l.book_id = b.id
        LEFT JOIN (
          SELECT id, title, main_author FROM theses
          UNION ALL
          SELECT id, title, main_author FROM memoires
          UNION ALL
          SELECT id, title, student_name as main_author FROM stage_reports
        ) ad ON l.academic_document_id = ad.id
        WHERE l.status = 'active'
        AND DATEDIFF(l.due_date, CURDATE()) = ?
        AND u.email IS NOT NULL
        AND u.email != ''
      `, [reminderDays]) as Array<any>;

      console.log(`📧 ${loansNearDue.length} rappels d'échéance à envoyer`);

      // Envoyer un rappel pour chaque emprunt
      for (const loan of loansNearDue) {
        try {
          const reminderData: ReminderNotificationData = {
            user_name: loan.user_name,
            user_email: loan.user_email,
            document_title: loan.document_title || 'Document',
            document_author: loan.document_author || 'Auteur non spécifié',
            document_type: loan.document_type as 'book' | 'these' | 'memoire' | 'rapport_stage',
            due_date: loan.due_date,
            days_until_due: loan.days_until_due,
            loan_id: loan.loan_id
          };

          const emailSent = await EmailNotificationService.sendDueReminder(reminderData);
          
          if (emailSent) {
            sent++;
            console.log(`✅ Rappel envoyé à ${loan.user_email} pour ${loan.document_title}`);
            
            // Logger l'envoi du rappel
            await logLibraryOperation(
              'reminder_sent',
              loan.user_id,
              loan.book_id || loan.academic_document_id,
              {
                loanId: loan.loan_id,
                reminderType: 'due_reminder',
                daysUntilDue: loan.days_until_due,
                documentTitle: loan.document_title
              }
            );
          } else {
            errors++;
            console.log(`❌ Échec rappel à ${loan.user_email} pour ${loan.document_title}`);
          }
        } catch (error) {
          errors++;
          console.error(`❌ Erreur rappel pour ${loan.user_email}:`, error);
          await logError(error as Error, {
            action: 'send_due_reminder',
            loanId: loan.loan_id,
            userEmail: loan.user_email
          });
        }
      }

    } catch (error) {
      console.error('❌ Erreur générale service de rappels:', error);
      await logError(error as Error, { action: 'send_due_reminders_batch' });
    }

    return { sent, errors };
  }

  /**
   * Notifier les utilisateurs quand leurs documents réservés deviennent disponibles
   */
  static async notifyAvailableReservations(): Promise<{ sent: number; errors: number }> {
    let sent = 0;
    let errors = 0;

    try {
      // Récupérer les réservations qui peuvent être satisfaites (priorité 1 et document disponible)
      const availableReservations = await executeQuery(`
        SELECT
          r.id as reservation_id,
          r.user_id,
          r.document_type,
          r.expiry_date,
          u.full_name as user_name,
          u.email as user_email,
          CASE WHEN r.document_type = 'book' THEN b.title ELSE ad.title END as document_title,
          CASE WHEN r.document_type = 'book' THEN b.main_author ELSE ad.main_author END as document_author,
          CASE WHEN r.document_type = 'book' THEN b.available_copies ELSE 1 END as available_copies,
          DATE_ADD(CURDATE(), INTERVAL 7 DAY) as pickup_deadline
        FROM reservations r
        INNER JOIN users u ON r.user_id = u.id
        LEFT JOIN books b ON r.book_id = b.id
        LEFT JOIN (
          SELECT id, title, main_author FROM theses
          UNION ALL
          SELECT id, title, main_author FROM memoires
          UNION ALL
          SELECT id, title, student_name as main_author FROM stage_reports
        ) ad ON r.academic_document_id = ad.id
        WHERE r.status = 'active'
        AND r.priority_order = 1
        AND (
          (r.document_type = 'book' AND b.available_copies > 0)
          OR (r.document_type != 'book')
        )
        AND u.email IS NOT NULL
        AND u.email != ''
        AND r.expiry_date >= CURDATE()
      `) as Array<any>;

      console.log(`📧 ${availableReservations.length} notifications de disponibilité à envoyer`);

      // Envoyer une notification pour chaque réservation disponible
      for (const reservation of availableReservations) {
        try {
          const availabilityData: AvailabilityNotificationData = {
            user_name: reservation.user_name,
            user_email: reservation.user_email,
            document_title: reservation.document_title || 'Document',
            document_author: reservation.document_author || 'Auteur non spécifié',
            document_type: reservation.document_type as 'book' | 'these' | 'memoire' | 'rapport_stage',
            reservation_id: reservation.reservation_id,
            pickup_deadline: reservation.pickup_deadline
          };

          const emailSent = await EmailNotificationService.sendAvailabilityNotification(availabilityData);
          
          if (emailSent) {
            sent++;
            console.log(`✅ Notification de disponibilité envoyée à ${reservation.user_email} pour ${reservation.document_title}`);
            
            // Logger l'envoi de la notification
            await logLibraryOperation(
              'availability_notification_sent',
              reservation.user_id,
              reservation.book_id || reservation.academic_document_id,
              {
                reservationId: reservation.reservation_id,
                notificationType: 'availability_notification',
                documentTitle: reservation.document_title
              }
            );
          } else {
            errors++;
            console.log(`❌ Échec notification à ${reservation.user_email} pour ${reservation.document_title}`);
          }
        } catch (error) {
          errors++;
          console.error(`❌ Erreur notification pour ${reservation.user_email}:`, error);
          await logError(error as Error, {
            action: 'send_availability_notification',
            reservationId: reservation.reservation_id,
            userEmail: reservation.user_email
          });
        }
      }

    } catch (error) {
      console.error('❌ Erreur générale service de notifications de disponibilité:', error);
      await logError(error as Error, { action: 'send_availability_notifications_batch' });
    }

    return { sent, errors };
  }

  /**
   * Exécuter tous les rappels automatiques
   */
  static async runAllReminders(): Promise<{
    dueReminders: { sent: number; errors: number };
    availabilityNotifications: { sent: number; errors: number };
  }> {
    console.log('🚀 Démarrage des rappels automatiques...');
    
    const dueReminders = await this.sendDueReminders();
    const availabilityNotifications = await this.notifyAvailableReservations();
    
    console.log(`✅ Rappels terminés - Échéances: ${dueReminders.sent} envoyés, ${dueReminders.errors} erreurs`);
    console.log(`✅ Notifications terminées - Disponibilités: ${availabilityNotifications.sent} envoyées, ${availabilityNotifications.errors} erreurs`);
    
    return {
      dueReminders,
      availabilityNotifications
    };
  }

  /**
   * Nettoyer les réservations expirées
   */
  static async cleanupExpiredReservations(): Promise<number> {
    try {
      // Marquer les réservations expirées comme annulées
      const result = await executeQuery(`
        UPDATE reservations 
        SET status = 'expired', updated_at = CURRENT_TIMESTAMP
        WHERE status = 'active' 
        AND expiry_date < CURDATE()
      `) as any;

      const expiredCount = result.affectedRows || 0;
      
      if (expiredCount > 0) {
        console.log(`🧹 ${expiredCount} réservations expirées nettoyées`);
        
        // Remettre les exemplaires disponibles pour les livres
        await executeQuery(`
          UPDATE books b
          INNER JOIN reservations r ON b.id = r.book_id
          SET b.available_copies = b.available_copies + 1
          WHERE r.status = 'expired'
          AND r.document_type = 'book'
          AND r.updated_at >= DATE_SUB(NOW(), INTERVAL 1 HOUR)
        `);
      }

      return expiredCount;
    } catch (error) {
      console.error('❌ Erreur nettoyage réservations expirées:', error);
      await logError(error as Error, { action: 'cleanup_expired_reservations' });
      return 0;
    }
  }
}
