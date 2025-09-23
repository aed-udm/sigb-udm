/**
 * Service de notification email avec SendGrid
 * Système complet de notifications pour emprunts, réservations et rappels
 * Université des Montagnes - SIGB UdM
 */

import sgMail from '@sendgrid/mail';
import { executeQuery } from '@/lib/mysql';
import { udmColors } from '@/lib/udm-colors';

// Configuration SendGrid
const SENDGRID_API_KEY = process.env.EMAIL_API_KEY;
const FROM_EMAIL = process.env.EMAIL_FROM || 'evriken77@gmail.com';
const FROM_NAME = process.env.EMAIL_FROM_NAME || 'SIGB UdM';
const NOTIFICATIONS_ENABLED = process.env.EMAIL_NOTIFICATIONS_ENABLED === 'true';

// Debug configuration
console.log('Configuration Email Service:', {
  hasApiKey: !!SENDGRID_API_KEY,
  apiKeyPrefix: SENDGRID_API_KEY ? SENDGRID_API_KEY.substring(0, 10) + '...' : 'MANQUANTE',
  fromEmail: FROM_EMAIL,
  fromName: FROM_NAME,
  notificationsEnabled: NOTIFICATIONS_ENABLED
});

if (SENDGRID_API_KEY) {
  sgMail.setApiKey(SENDGRID_API_KEY);
}

// Types pour les notifications
export interface LoanNotificationData {
  user_name: string;
  user_email: string;
  document_title: string;
  document_author: string;
  document_type: 'book' | 'these' | 'memoire' | 'rapport_stage';
  loan_date: string;
  due_date: string;
  loan_id: string;
  barcode?: string;
}

export interface ReservationNotificationData {
  user_name: string;
  user_email: string;
  document_title: string;
  document_author: string;
  document_type: 'book' | 'these' | 'memoire' | 'rapport_stage';
  reservation_date: string;
  expiry_date: string;
  reservation_id: string;
  priority_order: number;
}

export interface ReminderNotificationData {
  user_name: string;
  user_email: string;
  document_title: string;
  document_author: string;
  document_type: 'book' | 'these' | 'memoire' | 'rapport_stage';
  due_date: string;
  days_until_due: number;
  loan_id: string;
}

export interface AvailabilityNotificationData {
  user_name: string;
  user_email: string;
  document_title: string;
  document_author: string;
  document_type: 'book' | 'these' | 'memoire' | 'rapport_stage';
  reservation_id: string;
  pickup_deadline: string;
}

export interface PenaltySettings {
  daily_rate: number;
  max_penalty: number;
  grace_period_days: number;
}

export interface ReturnConfirmationData {
  user_name: string;
  user_email: string;
  document_title: string;
  document_author: string;
  document_type: 'book' | 'these' | 'memoire' | 'rapport_stage';
  loan_date: string;
  return_date: string;
  was_overdue: boolean;
  penalty_amount?: number;
}

export interface CancellationNotificationData {
  user_name: string;
  user_email: string;
  document_title: string;
  document_author: string;
  document_type: 'book' | 'these' | 'memoire' | 'rapport_stage';
  reservation_date: string;
  cancellation_reason?: string;
}

export interface PaymentConfirmationData {
  user_name: string;
  user_email: string;
  amount_paid: number;
  payment_method: string;
  payment_date: string;
  penalties_paid: Array<{
    description: string;
    amount: number;
  }>;
}

export interface ExtensionNotificationData {
  user_name: string;
  user_email: string;
  document_title: string;
  document_author: string;
  document_type: 'book' | 'these' | 'memoire' | 'rapport_stage';
  old_due_date: string;
  new_due_date: string;
  loan_id: string;
}

export interface PenaltyCreatedData {
  user_name: string;
  user_email: string;
  document_title: string;
  document_author: string;
  document_type: 'book' | 'these' | 'memoire' | 'rapport_stage';
  penalty_amount: number;
  days_overdue: number;
  due_date: string;
}

export interface DocumentAvailableNotificationData {
  user_name: string;
  user_email: string;
  document_title: string;
  document_author: string;
  document_type: 'book' | 'these' | 'memoire' | 'rapport_stage';
  reservation_date: string;
  priority: number;
  return_date: string;
}

/**
 * Service principal de notification email
 */
export class EmailNotificationService {
  
  /**
   * Envoyer une notification d'emprunt
   */
  static async sendLoanConfirmation(data: LoanNotificationData): Promise<boolean> {
    if (!NOTIFICATIONS_ENABLED || !SENDGRID_API_KEY) {
      console.log('Notifications email désactivées ou clé API manquante');
      return false;
    }

    try {
      const documentTypeLabel = this.getDocumentTypeLabel(data.document_type);

      // Récupérer les paramètres de pénalité pour ce type de document
      const penaltySettings = await this.getPenaltySettings(data.document_type);

      const msg = {
        to: data.user_email,
        from: {
          email: FROM_EMAIL,
          name: FROM_NAME
        },
        subject: `Confirmation d'emprunt - ${documentTypeLabel}`,
        html: this.generateLoanConfirmationHTML(data, penaltySettings),
        text: this.generateLoanConfirmationText(data, penaltySettings)
      };

      await sgMail.send(msg);
      console.log(`Email d'emprunt envoyé à ${data.user_email} pour ${data.document_title}`);
      return true;
    } catch (error) {
      console.error('Erreur envoi email emprunt:', error);
      return false;
    }
  }

  /**
   * Envoyer une notification de réservation
   */
  static async sendReservationConfirmation(data: ReservationNotificationData): Promise<boolean> {
    if (!NOTIFICATIONS_ENABLED || !SENDGRID_API_KEY) {
      console.log('Notifications email désactivées ou clé API manquante');
      return false;
    }

    try {
      const documentTypeLabel = this.getDocumentTypeLabel(data.document_type);
      
      const msg = {
        to: data.user_email,
        from: {
          email: FROM_EMAIL,
          name: FROM_NAME
        },
        subject: `Confirmation de réservation - ${documentTypeLabel}`,
        html: this.generateReservationConfirmationHTML(data),
        text: this.generateReservationConfirmationText(data)
      };

      await sgMail.send(msg);
      console.log(`Email de réservation envoyé à ${data.user_email} pour ${data.document_title}`);
      return true;
    } catch (error) {
      console.error('Erreur envoi email réservation:', error);
      return false;
    }
  }

  /**
   * Envoyer un rappel avant échéance
   */
  static async sendDueReminder(data: ReminderNotificationData): Promise<boolean> {
    if (!NOTIFICATIONS_ENABLED || !SENDGRID_API_KEY) {
      console.log('Notifications email désactivées ou clé API manquante');
      return false;
    }

    try {
      const documentTypeLabel = this.getDocumentTypeLabel(data.document_type);

      // Récupérer les paramètres de pénalité pour ce type de document
      const penaltySettings = await this.getPenaltySettings(data.document_type);

      const msg = {
        to: data.user_email,
        from: {
          email: FROM_EMAIL,
          name: FROM_NAME
        },
        subject: `Rappel de retour - ${documentTypeLabel} (${data.days_until_due} jour${data.days_until_due > 1 ? 's' : ''} restant${data.days_until_due > 1 ? 's' : ''})`,
        html: this.generateDueReminderHTML(data, penaltySettings),
        text: this.generateDueReminderText(data, penaltySettings)
      };

      await sgMail.send(msg);
      console.log(`Rappel envoyé à ${data.user_email} pour ${data.document_title}`);
      return true;
    } catch (error) {
      console.error('Erreur envoi rappel:', error);
      return false;
    }
  }

  /**
   * Envoyer une notification de disponibilité
   */
  static async sendAvailabilityNotification(data: AvailabilityNotificationData): Promise<boolean> {
    if (!NOTIFICATIONS_ENABLED || !SENDGRID_API_KEY) {
      console.log('Notifications email désactivées ou clé API manquante');
      return false;
    }

    try {
      const documentTypeLabel = this.getDocumentTypeLabel(data.document_type);

      const msg = {
        to: data.user_email,
        from: {
          email: FROM_EMAIL,
          name: FROM_NAME
        },
        subject: `Document disponible - ${documentTypeLabel}`,
        html: this.generateAvailabilityNotificationHTML(data),
        text: this.generateAvailabilityNotificationText(data)
      };

      await sgMail.send(msg);
      console.log(`Notification de disponibilité envoyée à ${data.user_email} pour ${data.document_title}`);
      return true;
    } catch (error) {
      console.error('Erreur envoi notification disponibilité:', error);
      return false;
    }
  }

  /**
   * Envoyer une confirmation de retour de document
   */
  static async sendReturnConfirmation(data: ReturnConfirmationData): Promise<boolean> {
    if (!NOTIFICATIONS_ENABLED || !SENDGRID_API_KEY) {
      console.log('Notifications email désactivées ou clé API manquante');
      return false;
    }

    try {
      const documentTypeLabel = this.getDocumentTypeLabel(data.document_type);

      const msg = {
        to: data.user_email,
        from: {
          email: FROM_EMAIL,
          name: FROM_NAME
        },
        subject: `Retour confirmé - ${documentTypeLabel}`,
        html: this.generateReturnConfirmationHTML(data),
        text: this.generateReturnConfirmationText(data)
      };

      await sgMail.send(msg);
      console.log(`Confirmation de retour envoyée à ${data.user_email} pour ${data.document_title}`);
      return true;
    } catch (error) {
      console.error('Erreur envoi confirmation retour:', error);
      return false;
    }
  }

  /**
   * Envoyer une notification d'annulation de réservation
   */
  static async sendCancellationNotification(data: CancellationNotificationData): Promise<boolean> {
    if (!NOTIFICATIONS_ENABLED || !SENDGRID_API_KEY) {
      console.log('Notifications email désactivées ou clé API manquante');
      return false;
    }

    try {
      const documentTypeLabel = this.getDocumentTypeLabel(data.document_type);

      const msg = {
        to: data.user_email,
        from: {
          email: FROM_EMAIL,
          name: FROM_NAME
        },
        subject: `Réservation annulée - ${documentTypeLabel}`,
        html: this.generateCancellationNotificationHTML(data),
        text: this.generateCancellationNotificationText(data)
      };

      await sgMail.send(msg);
      console.log(`Notification d'annulation envoyée à ${data.user_email} pour ${data.document_title}`);
      return true;
    } catch (error) {
      console.error('Erreur envoi notification annulation:', error);
      return false;
    }
  }

  /**
   * Envoyer une confirmation de paiement de pénalité
   */
  static async sendPaymentConfirmation(data: PaymentConfirmationData): Promise<boolean> {
    if (!NOTIFICATIONS_ENABLED || !SENDGRID_API_KEY) {
      console.log('Notifications email désactivées ou clé API manquante');
      return false;
    }

    try {
      const msg = {
        to: data.user_email,
        from: {
          email: FROM_EMAIL,
          name: FROM_NAME
        },
        subject: `Paiement confirmé - ${data.amount_paid.toLocaleString()} FCFA`,
        html: this.generatePaymentConfirmationHTML(data),
        text: this.generatePaymentConfirmationText(data)
      };

      await sgMail.send(msg);
      console.log(`Confirmation de paiement envoyée à ${data.user_email} pour ${data.amount_paid} FCFA`);
      return true;
    } catch (error) {
      console.error('Erreur envoi confirmation paiement:', error);
      return false;
    }
  }

  /**
   * Envoyer une notification de prolongation d'emprunt
   */
  static async sendExtensionNotification(data: ExtensionNotificationData): Promise<boolean> {
    if (!NOTIFICATIONS_ENABLED || !SENDGRID_API_KEY) {
      console.log('Notifications email désactivées ou clé API manquante');
      return false;
    }

    try {
      const documentTypeLabel = this.getDocumentTypeLabel(data.document_type);

      const msg = {
        to: data.user_email,
        from: {
          email: FROM_EMAIL,
          name: FROM_NAME
        },
        subject: `Prolongation confirmée - ${documentTypeLabel}`,
        html: this.generateExtensionNotificationHTML(data),
        text: this.generateExtensionNotificationText(data)
      };

      await sgMail.send(msg);
      console.log(`Notification de prolongation envoyée à ${data.user_email} pour ${data.document_title}`);
      return true;
    } catch (error) {
      console.error('Erreur envoi notification prolongation:', error);
      return false;
    }
  }

  /**
   * Générer les styles CSS uniformes UdM pour les emails
   */
  private static getUdmEmailStyles(type: 'success' | 'warning' | 'info' | 'reminder' = 'info'): string {
    const headerGradient = type === 'warning' ?
      `linear-gradient(135deg, #f59e0b 0%, #fbbf24 100%)` :
      type === 'success' ?
      `linear-gradient(135deg, ${udmColors.green[500]} 0%, ${udmColors.green[600]} 100%)` :
      `linear-gradient(135deg, ${udmColors.green[500]} 0%, ${udmColors.green[600]} 100%)`;

    return `
      body {
        font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        line-height: 1.6;
        color: ${udmColors.gray[800]};
        max-width: 600px;
        margin: 0 auto;
        padding: 20px;
      }
      .header {
        background: ${headerGradient};
        color: white;
        padding: 30px;
        text-align: center;
        border-radius: 10px 10px 0 0;
      }
      .content {
        background: ${udmColors.white};
        padding: 30px;
        border: 1px solid ${udmColors.gray[200]};
      }
      .footer {
        background: ${udmColors.gray[50]};
        padding: 20px;
        text-align: center;
        border-radius: 0 0 10px 10px;
        font-size: 12px;
        color: ${udmColors.gray[500]};
      }
      .success {
        background: ${udmColors.green[100]};
        border: 1px solid ${udmColors.green[500]};
        padding: 15px;
        border-radius: 8px;
        margin: 20px 0;
      }
      .info {
        background: ${udmColors.gray[50]};
        border-left: 4px solid ${udmColors.green[500]};
        padding: 15px;
        margin: 15px 0;
      }
      .warning {
        background: #fef3c7;
        border: 1px solid #f59e0b;
        padding: 15px;
        border-radius: 8px;
        margin: 15px 0;
      }
      .danger {
        background: #fef2f2;
        border: 1px solid #ef4444;
        padding: 15px;
        border-radius: 8px;
        margin: 15px 0;
      }
      h1 {
        margin: 0;
        font-size: 24px;
        font-weight: 600;
      }
      h2 {
        color: ${udmColors.green[600]};
        margin-top: 0;
        font-weight: 600;
      }
      h3, h4 {
        color: ${udmColors.gray[700]};
        font-weight: 600;
      }
      .document-info {
        background: ${udmColors.gray[50]};
        padding: 15px;
        border-radius: 8px;
        margin: 15px 0;
        border-left: 4px solid ${udmColors.green[500]};
      }
      .btn {
        display: inline-block;
        background: ${udmColors.green[500]};
        color: white;
        padding: 12px 24px;
        text-decoration: none;
        border-radius: 6px;
        margin: 10px 0;
        font-weight: 600;
      }
      .btn:hover {
        background: ${udmColors.green[600]};
      }
    `;
  }

  /**
   * Obtenir le libellé du type de document
   */
  private static getDocumentTypeLabel(type: string): string {
    const labels: { [key: string]: string } = {
      'book': 'Livre',
      'these': 'Thèse',
      'memoire': 'Mémoire',
      'rapport_stage': 'Rapport de Stage'
    };
    return labels[type] || 'Document';
  }

  /**
   * Formater une date en français
   */
  private static formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }

  /**
   * Générer le HTML pour confirmation d'emprunt
   */
  private static generateLoanConfirmationHTML(data: LoanNotificationData, penaltySettings: PenaltySettings): string {
    const documentTypeLabel = this.getDocumentTypeLabel(data.document_type);
    const loanDate = this.formatDate(data.loan_date);
    const dueDate = this.formatDate(data.due_date);

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #15803d, #22c55e); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f8fafc; padding: 30px; border-radius: 0 0 10px 10px; }
          .document-info { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #15803d; }
          .important { background: #fef3c7; padding: 15px; border-radius: 8px; border-left: 4px solid #f59e0b; margin: 20px 0; }
          .footer { text-align: center; margin-top: 30px; color: #64748b; font-size: 14px; }
          .btn { display: inline-block; background: #15803d; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 10px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Confirmation d'Emprunt</h1>
            <p>Bibliothèque de l'Université des Montagnes</p>
          </div>
          <div class="content">
            <p>Bonjour <strong>${data.user_name}</strong>,</p>
            
            <p>Votre emprunt a été confirmé avec succès ! Voici les détails :</p>
            
            <div class="document-info">
              <h3>${documentTypeLabel} emprunté</h3>
              <p><strong>Titre :</strong> ${data.document_title}</p>
              <p><strong>Auteur :</strong> ${data.document_author}</p>
              <p><strong>Type :</strong> ${documentTypeLabel}</p>
              <p><strong>Date d'emprunt :</strong> ${loanDate}</p>
              <p><strong>Date de retour prévue :</strong> ${dueDate}</p>
              <p><strong>Référence emprunt :</strong> ${data.loan_id}</p>
            </div>
            
            <div class="important">
              <h4>Important</h4>
              <ul>
                <li>Vous recevrez un rappel 3 jours avant la date de retour</li>
                <li>Des amendes de ${penaltySettings.daily_rate} FCFA/jour s'appliquent en cas de retard${penaltySettings.grace_period_days > 0 ? ` (après ${penaltySettings.grace_period_days} jour${penaltySettings.grace_period_days > 1 ? 's' : ''} de grâce)` : ''}</li>
                ${penaltySettings.max_penalty > 0 ? `<li>Amende maximale : ${penaltySettings.max_penalty} FCFA</li>` : ''}
                <li>Vous pouvez prolonger votre emprunt si aucune réservation n'est en attente</li>
              </ul>
            </div>
            
            <p>Merci d'utiliser les services de la bibliothèque UdM !</p>
          </div>
          <div class="footer">
            <p>Bibliothèque de l'Université des Montagnes<br>
            Email : bibliotheque@udm.edu.cm | Tél : +237 233 XX XX XX</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Générer le texte pour confirmation d'emprunt
   */
  private static generateLoanConfirmationText(data: LoanNotificationData, penaltySettings: PenaltySettings): string {
    const documentTypeLabel = this.getDocumentTypeLabel(data.document_type);
    const loanDate = this.formatDate(data.loan_date);
    const dueDate = this.formatDate(data.due_date);

    return `
CONFIRMATION D'EMPRUNT - Bibliothèque UdM

Bonjour ${data.user_name},

Votre emprunt a été confirmé avec succès !

DÉTAILS DE L'EMPRUNT :
- ${documentTypeLabel} : ${data.document_title}
- Auteur : ${data.document_author}
- Date d'emprunt : ${loanDate}
- Date de retour prévue : ${dueDate}
- Référence : ${data.loan_id}

IMPORTANT :
- Rappel automatique 3 jours avant échéance
- Amendes : ${penaltySettings.daily_rate} FCFA/jour en cas de retard${penaltySettings.grace_period_days > 0 ? ` (après ${penaltySettings.grace_period_days} jour${penaltySettings.grace_period_days > 1 ? 's' : ''} de grâce)` : ''}
${penaltySettings.max_penalty > 0 ? `- Amende maximale : ${penaltySettings.max_penalty} FCFA` : ''}
- Prolongation possible si pas de réservation

Merci d'utiliser les services de la bibliothèque UdM !

Bibliothèque de l'Université des Montagnes
Email : bibliotheque@udm.edu.cm
    `;
  }

  /**
   * Générer le HTML pour confirmation de réservation
   */
  private static generateReservationConfirmationHTML(data: ReservationNotificationData): string {
    const documentTypeLabel = this.getDocumentTypeLabel(data.document_type);
    const reservationDate = this.formatDate(data.reservation_date);
    const expiryDate = this.formatDate(data.expiry_date);

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #15803d, #22c55e); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f8fafc; padding: 30px; border-radius: 0 0 10px 10px; }
          .document-info { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #15803d; }
          .queue-info { background: #e0f2fe; padding: 15px; border-radius: 8px; border-left: 4px solid #0284c7; margin: 20px 0; }
          .footer { text-align: center; margin-top: 30px; color: #64748b; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Confirmation de Réservation</h1>
            <p>Bibliothèque de l'Université des Montagnes</p>
          </div>
          <div class="content">
            <p>Bonjour <strong>${data.user_name}</strong>,</p>

            <p>Votre réservation a été enregistrée avec succès !</p>

            <div class="document-info">
              <h3>${documentTypeLabel} réservé</h3>
              <p><strong>Titre :</strong> ${data.document_title}</p>
              <p><strong>Auteur :</strong> ${data.document_author}</p>
              <p><strong>Type :</strong> ${documentTypeLabel}</p>
              <p><strong>Date de réservation :</strong> ${reservationDate}</p>
              <p><strong>Référence réservation :</strong> ${data.reservation_id}</p>
            </div>

            <div class="queue-info">
              <h4>Position dans la file d'attente</h4>
              <p><strong>Votre position :</strong> ${data.priority_order}${data.priority_order === 1 ? 'er' : 'ème'}</p>
              <p>Vous serez notifié dès que le document sera disponible.</p>
              <p><strong>Délai de récupération :</strong> 7 jours après notification</p>
            </div>

            <p>Nous vous contacterons dès que le document sera disponible !</p>
          </div>
          <div class="footer">
            <p>Bibliothèque de l'Université des Montagnes<br>
            Email : bibliotheque@udm.edu.cm | Tél : +237 233 XX XX XX</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Générer le texte pour confirmation de réservation
   */
  private static generateReservationConfirmationText(data: ReservationNotificationData): string {
    const documentTypeLabel = this.getDocumentTypeLabel(data.document_type);
    const reservationDate = this.formatDate(data.reservation_date);

    return `
CONFIRMATION DE RÉSERVATION - Bibliothèque UdM

Bonjour ${data.user_name},

Votre réservation a été enregistrée avec succès !

DÉTAILS DE LA RÉSERVATION :
- ${documentTypeLabel} : ${data.document_title}
- Auteur : ${data.document_author}
- Date de réservation : ${reservationDate}
- Référence : ${data.reservation_id}
- Position dans la file : ${data.priority_order}${data.priority_order === 1 ? 'er' : 'ème'}

IMPORTANT :
- Notification automatique quand disponible
- 7 jours pour récupérer après notification
- Réservation annulée si non récupérée

Merci d'utiliser les services de la bibliothèque UdM !

Bibliothèque de l'Université des Montagnes
Email : bibliotheque@udm.edu.cm
    `;
  }

  /**
   * Générer le HTML pour rappel d'échéance
   */
  private static generateDueReminderHTML(data: ReminderNotificationData, penaltySettings: PenaltySettings): string {
    const documentTypeLabel = this.getDocumentTypeLabel(data.document_type);
    const dueDate = this.formatDate(data.due_date);

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #f59e0b, #fbbf24); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f8fafc; padding: 30px; border-radius: 0 0 10px 10px; }
          .document-info { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #f59e0b; }
          .urgent { background: #fef2f2; padding: 15px; border-radius: 8px; border-left: 4px solid #ef4444; margin: 20px 0; }
          .footer { text-align: center; margin-top: 30px; color: #64748b; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>⏰ Rappel de Retour</h1>
            <p>Bibliothèque de l'Université des Montagnes</p>
          </div>
          <div class="content">
            <p>Bonjour <strong>${data.user_name}</strong>,</p>

            <p>Ceci est un rappel concernant votre emprunt qui arrive à échéance.</p>

            <div class="document-info">
              <h3>${documentTypeLabel} à retourner</h3>
              <p><strong>Titre :</strong> ${data.document_title}</p>
              <p><strong>Auteur :</strong> ${data.document_author}</p>
              <p><strong>Date de retour prévue :</strong> ${dueDate}</p>
              <p><strong>Référence emprunt :</strong> ${data.loan_id}</p>
            </div>

            <div class="urgent">
              <h4>Attention</h4>
              <p><strong>Il vous reste ${data.days_until_due} jour${data.days_until_due > 1 ? 's' : ''}</strong> pour retourner ce document.</p>
              <p>Après cette date, des amendes de <strong>${penaltySettings.daily_rate} FCFA par jour</strong> s'appliqueront${penaltySettings.grace_period_days > 0 ? ` (après ${penaltySettings.grace_period_days} jour${penaltySettings.grace_period_days > 1 ? 's' : ''} de grâce)` : ''}.</p>
              ${penaltySettings.max_penalty > 0 ? `<p>Amende maximale : <strong>${penaltySettings.max_penalty} FCFA</strong></p>` : ''}
            </div>

            <p>Merci de retourner le document à temps à la bibliothèque !</p>
          </div>
          <div class="footer">
            <p>Bibliothèque de l'Université des Montagnes<br>
            Email : bibliotheque@udm.edu.cm | Tél : +237 233 XX XX XX</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Générer le texte pour rappel d'échéance
   */
  private static generateDueReminderText(data: ReminderNotificationData, penaltySettings: PenaltySettings): string {
    const documentTypeLabel = this.getDocumentTypeLabel(data.document_type);
    const dueDate = this.formatDate(data.due_date);

    return `
RAPPEL DE RETOUR - Bibliothèque UdM

Bonjour ${data.user_name},

Rappel : votre emprunt arrive à échéance !

DÉTAILS DE L'EMPRUNT :
- ${documentTypeLabel} : ${data.document_title}
- Auteur : ${data.document_author}
- Date de retour prévue : ${dueDate}
- Référence : ${data.loan_id}

ATTENTION :
Il vous reste ${data.days_until_due} jour${data.days_until_due > 1 ? 's' : ''} pour retourner ce document.
Amendes : ${penaltySettings.daily_rate} FCFA/jour après échéance${penaltySettings.grace_period_days > 0 ? ` (après ${penaltySettings.grace_period_days} jour${penaltySettings.grace_period_days > 1 ? 's' : ''} de grâce)` : ''}.
${penaltySettings.max_penalty > 0 ? `Amende maximale : ${penaltySettings.max_penalty} FCFA` : ''}

Merci de retourner le document à temps !

Bibliothèque de l'Université des Montagnes
Email : bibliotheque@udm.edu.cm
    `;
  }

  /**
   * Générer le HTML pour notification de disponibilité
   */
  private static generateAvailabilityNotificationHTML(data: AvailabilityNotificationData): string {
    const documentTypeLabel = this.getDocumentTypeLabel(data.document_type);
    const pickupDeadline = this.formatDate(data.pickup_deadline);

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #059669, #10b981); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f8fafc; padding: 30px; border-radius: 0 0 10px 10px; }
          .document-info { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #059669; }
          .pickup-info { background: #ecfdf5; padding: 15px; border-radius: 8px; border-left: 4px solid #10b981; margin: 20px 0; }
          .footer { text-align: center; margin-top: 30px; color: #64748b; font-size: 14px; }
          .btn { display: inline-block; background: #059669; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 10px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Document Disponible !</h1>
            <p>Bibliothèque de l'Université des Montagnes</p>
          </div>
          <div class="content">
            <p>Bonjour <strong>${data.user_name}</strong>,</p>

            <p>Excellente nouvelle ! Le document que vous avez réservé est maintenant disponible !</p>

            <div class="document-info">
              <h3>${documentTypeLabel} disponible</h3>
              <p><strong>Titre :</strong> ${data.document_title}</p>
              <p><strong>Auteur :</strong> ${data.document_author}</p>
              <p><strong>Type :</strong> ${documentTypeLabel}</p>
              <p><strong>Référence réservation :</strong> ${data.reservation_id}</p>
            </div>

            <div class="pickup-info">
              <h4>Récupération</h4>
              <p><strong>Où :</strong> Comptoir de la bibliothèque UdM</p>
              <p><strong>Quand :</strong> Pendant les heures d'ouverture</p>
              <p><strong>Délai limite :</strong> ${pickupDeadline}</p>
              <p><strong>À apporter :</strong> Votre carte d'étudiant ou pièce d'identité</p>
            </div>

            <p><strong>Important :</strong> Vous avez 7 jours pour récupérer ce document. Passé ce délai, votre réservation sera automatiquement annulée.</p>

            <p>Nous vous attendons à la bibliothèque !</p>
          </div>
          <div class="footer">
            <p>Bibliothèque de l'Université des Montagnes<br>
            Email : bibliotheque@udm.edu.cm | Tél : +237 233 XX XX XX</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Générer le texte pour notification de disponibilité
   */
  private static generateAvailabilityNotificationText(data: AvailabilityNotificationData): string {
    const documentTypeLabel = this.getDocumentTypeLabel(data.document_type);
    const pickupDeadline = this.formatDate(data.pickup_deadline);

    return `
DOCUMENT DISPONIBLE ! - Bibliothèque UdM

Bonjour ${data.user_name},

Excellente nouvelle ! Votre document réservé est disponible !

DÉTAILS DU DOCUMENT :
- ${documentTypeLabel} : ${data.document_title}
- Auteur : ${data.document_author}
- Référence réservation : ${data.reservation_id}

RÉCUPÉRATION :
- Où : Comptoir de la bibliothèque UdM
- Délai limite : ${pickupDeadline}
- À apporter : Carte d'étudiant ou pièce d'identité

IMPORTANT :
Vous avez 7 jours pour récupérer ce document.
Passé ce délai, la réservation sera annulée.

Nous vous attendons à la bibliothèque !

Bibliothèque de l'Université des Montagnes
Email : bibliotheque@udm.edu.cm
    `;
  }

  /**
   * Récupérer les paramètres de pénalité pour un type de document
   */
  private static async getPenaltySettings(documentType: string): Promise<PenaltySettings> {
    try {
      const settings = await executeQuery(`
        SELECT daily_rate, max_penalty, grace_period_days
        FROM penalty_settings
        WHERE document_type = ? AND is_active = 1
        LIMIT 1
      `, [documentType]) as any[];

      if (settings.length > 0) {
        return {
          daily_rate: settings[0].daily_rate,
          max_penalty: settings[0].max_penalty,
          grace_period_days: settings[0].grace_period_days
        };
      }

      // Valeurs par défaut si aucune configuration trouvée
      const defaults: Record<string, PenaltySettings> = {
        'book': { daily_rate: 100, max_penalty: 5000, grace_period_days: 1 },
        'these': { daily_rate: 200, max_penalty: 10000, grace_period_days: 2 },
        'memoire': { daily_rate: 150, max_penalty: 7500, grace_period_days: 1 },
        'rapport_stage': { daily_rate: 100, max_penalty: 5000, grace_period_days: 1 }
      };

      return defaults[documentType] || defaults['book'];
    } catch (error) {
      console.error('Erreur récupération paramètres pénalité:', error);
      // Retourner des valeurs par défaut en cas d'erreur
      return { daily_rate: 100, max_penalty: 5000, grace_period_days: 1 };
    }
  }

  /**
   * Générer le HTML pour confirmation de retour
   */
  private static generateReturnConfirmationHTML(data: ReturnConfirmationData): string {
    const documentTypeLabel = this.getDocumentTypeLabel(data.document_type);
    const loanDate = this.formatDate(data.loan_date);
    const returnDate = this.formatDate(data.return_date);

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Retour confirmé - SIGB UdM</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; }
            .footer { background: #f8fafc; padding: 20px; text-align: center; border-radius: 0 0 10px 10px; font-size: 12px; color: #64748b; }
            .success { background: #dcfce7; border: 1px solid #22c55e; padding: 15px; border-radius: 8px; margin: 20px 0; }
            .info { background: #f0f9ff; border-left: 4px solid #0ea5e9; padding: 15px; margin: 15px 0; }
            .penalty { background: #fef3c7; border: 1px solid #f59e0b; padding: 15px; border-radius: 8px; margin: 15px 0; }
            h1 { margin: 0; font-size: 24px; }
            h2 { color: #16a34a; margin-top: 0; }
            .document-info { background: #f8fafc; padding: 15px; border-radius: 8px; margin: 15px 0; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Retour confirmé</h1>
            <p>Université des Montagnes - Bibliothèque</p>
          </div>

          <div class="content">
            <div class="success">
              <h2>Document retourné avec succès</h2>
              <p>Bonjour <strong>${data.user_name}</strong>,</p>
              <p>Nous confirmons le retour de votre document.</p>
            </div>

            <div class="document-info">
              <h3>Détails du document</h3>
              <p><strong>Type :</strong> ${documentTypeLabel}</p>
              <p><strong>Titre :</strong> ${data.document_title}</p>
              <p><strong>Auteur :</strong> ${data.document_author}</p>
            </div>

            <div class="info">
              <h4>Informations de l'emprunt</h4>
              <p><strong>Date d'emprunt :</strong> ${loanDate}</p>
              <p><strong>Date de retour :</strong> ${returnDate}</p>
              ${data.was_overdue ? '<p style="color: #dc2626;"><strong>Statut :</strong> Retour en retard</p>' : '<p style="color: #16a34a;"><strong>Statut :</strong> Retour dans les délais</p>'}
            </div>

            ${data.penalty_amount && data.penalty_amount > 0 ? `
            <div class="penalty">
              <h4>Pénalité appliquée</h4>
              <p>Une amende de <strong>${data.penalty_amount.toLocaleString()} FCFA</strong> a été appliquée pour ce retard.</p>
              <p>Veuillez vous présenter à la bibliothèque pour régler cette amende.</p>
            </div>
            ` : ''}

            <p>Merci d'avoir utilisé nos services !</p>
          </div>

          <div class="footer">
            <p>Bibliothèque de l'Université des Montagnes<br>
            Email : bibliotheque@udm.edu.cm</p>
          </div>
        </body>
      </html>
    `;
  }

  /**
   * Générer le texte pour confirmation de retour
   */
  private static generateReturnConfirmationText(data: ReturnConfirmationData): string {
    const documentTypeLabel = this.getDocumentTypeLabel(data.document_type);
    const loanDate = this.formatDate(data.loan_date);
    const returnDate = this.formatDate(data.return_date);

    return `
RETOUR CONFIRMÉ - SIGB UdM

Bonjour ${data.user_name},

Nous confirmons le retour de votre document.

DÉTAILS DU DOCUMENT :
- Type : ${documentTypeLabel}
- Titre : ${data.document_title}
- Auteur : ${data.document_author}

INFORMATIONS DE L'EMPRUNT :
- Date d'emprunt : ${loanDate}
- Date de retour : ${returnDate}
- Statut : ${data.was_overdue ? 'Retour en retard' : 'Retour dans les délais'}

${data.penalty_amount && data.penalty_amount > 0 ? `
PÉNALITÉ APPLIQUÉE :
Une amende de ${data.penalty_amount.toLocaleString()} FCFA a été appliquée pour ce retard.
Veuillez vous présenter à la bibliothèque pour régler cette amende.
` : ''}

Merci d'avoir utilisé nos services !

Bibliothèque de l'Université des Montagnes
Email : bibliotheque@udm.edu.cm
    `;
  }

  /**
   * Envoyer une notification de pénalité créée
   */
  static async sendPenaltyCreatedNotification(data: {
    user_name: string;
    user_email: string;
    document_title: string;
    document_author: string;
    document_type: 'book' | 'these' | 'memoire' | 'rapport_stage';
    penalty_amount: number;
    days_late: number;
    due_date: string;
    penalty_due_date: string;
    description: string;
  }): Promise<boolean> {
    try {
      const documentTypeLabel = this.getDocumentTypeLabel(data.document_type);
      const dueDate = new Date(data.due_date).toLocaleDateString('fr-FR');
      const penaltyDueDate = new Date(data.penalty_due_date).toLocaleDateString('fr-FR');

      const subject = `🚨 Pénalité appliquée - Retard de document - UdM`;

      const htmlContent = `
        <div style="${this.getUdmEmailStyles('warning')}">
          <div class="header">
            <h1>⚠️ PÉNALITÉ POUR RETARD</h1>
            <p>Université des Montagnes - Bibliothèque</p>
          </div>

          <div class="content">
            <p>Bonjour <strong>${data.user_name}</strong>,</p>

            <div class="warning">
              <h3>🚨 Une pénalité a été appliquée à votre compte</h3>
              <p>Votre emprunt est en retard et une amende a été automatiquement générée.</p>
            </div>

            <div class="info">
              <h4>📚 DOCUMENT CONCERNÉ :</h4>
              <ul>
                <li><strong>Type :</strong> ${documentTypeLabel}</li>
                <li><strong>Titre :</strong> ${data.document_title}</li>
                <li><strong>Auteur :</strong> ${data.document_author}</li>
              </ul>
            </div>

            <div class="info">
              <h4>💰 DÉTAILS DE LA PÉNALITÉ :</h4>
              <ul>
                <li><strong>Montant :</strong> ${data.penalty_amount.toLocaleString()} FCFA</li>
                <li><strong>Jours de retard :</strong> ${data.days_late} jour(s)</li>
                <li><strong>Date d'échéance initiale :</strong> ${dueDate}</li>
                <li><strong>Date limite de paiement :</strong> ${penaltyDueDate}</li>
              </ul>
            </div>

            <div class="warning">
              <h4>⚡ ACTION REQUISE :</h4>
              <p>Veuillez vous présenter à la bibliothèque pour :</p>
              <ol>
                <li>Retourner le document emprunté</li>
                <li>Régler l'amende de ${data.penalty_amount.toLocaleString()} FCFA</li>
              </ol>
            </div>

            <p><strong>Note :</strong> ${data.description}</p>

            <p>Pour toute question, contactez-nous à bibliotheque@udm.edu.cm</p>
          </div>

          <div class="footer">
            <p>Bibliothèque de l'Université des Montagnes</p>
            <p>Email : bibliotheque@udm.edu.cm | Tél : +237 XXX XXX XXX</p>
            <p><em>Cet email a été généré automatiquement par le système SIGB-UdM</em></p>
          </div>
        </div>
      `;

      const textContent = this.generatePenaltyCreatedTextContent(data);

      return await this.sendEmail(data.user_email, subject, htmlContent, textContent);
    } catch (error) {
      console.error('Erreur envoi email pénalité créée:', error);
      return false;
    }
  }

  /**
   * Générer le contenu texte pour la notification de pénalité créée
   */
  private static generatePenaltyCreatedTextContent(data: {
    user_name: string;
    document_title: string;
    document_author: string;
    document_type: 'book' | 'these' | 'memoire' | 'rapport_stage';
    penalty_amount: number;
    days_late: number;
    due_date: string;
    penalty_due_date: string;
    description: string;
  }): string {
    const documentTypeLabel = this.getDocumentTypeLabel(data.document_type);
    const dueDate = new Date(data.due_date).toLocaleDateString('fr-FR');
    const penaltyDueDate = new Date(data.penalty_due_date).toLocaleDateString('fr-FR');

    return `
PÉNALITÉ POUR RETARD - UNIVERSITÉ DES MONTAGNES

Bonjour ${data.user_name},

Une pénalité a été appliquée à votre compte pour retard de document.

DOCUMENT CONCERNÉ :
- Type : ${documentTypeLabel}
- Titre : ${data.document_title}
- Auteur : ${data.document_author}

DÉTAILS DE LA PÉNALITÉ :
- Montant : ${data.penalty_amount.toLocaleString()} FCFA
- Jours de retard : ${data.days_late} jour(s)
- Date d'échéance initiale : ${dueDate}
- Date limite de paiement : ${penaltyDueDate}

ACTION REQUISE :
Veuillez vous présenter à la bibliothèque pour :
1. Retourner le document emprunté
2. Régler l'amende de ${data.penalty_amount.toLocaleString()} FCFA

Note : ${data.description}

Pour toute question, contactez-nous à bibliotheque@udm.edu.cm

Bibliothèque de l'Université des Montagnes
Email : bibliotheque@udm.edu.cm
    `;
  }

  /**
   * 🚨 NOUVELLE MÉTHODE : Notifier qu'un document réservé est maintenant disponible
   */
  static async sendDocumentAvailableNotification(data: DocumentAvailableNotificationData): Promise<boolean> {
    if (!NOTIFICATIONS_ENABLED || !SENDGRID_API_KEY) {
      console.log('⚠️ Notifications email désactivées ou clé API manquante');
      return false;
    }

    try {
      const documentTypeLabel = this.getDocumentTypeLabel(data.document_type);
      const priorityText = data.priority === 1 ? 'PRIORITÉ 1 (Premier dans la file)' : `PRIORITÉ ${data.priority}`;

      const msg = {
        to: data.user_email,
        from: {
          email: FROM_EMAIL,
          name: FROM_NAME
        },
        subject: `📚 Document disponible - ${data.document_title}`,
        html: this.generateDocumentAvailableEmailTemplate(data, documentTypeLabel, priorityText)
      };

      await sgMail.send(msg);
      console.log(`✅ Email de disponibilité de document envoyé à ${data.user_email}`);
      return true;
    } catch (error) {
      console.error('❌ Erreur envoi email de disponibilité:', error);
      return false;
    }
  }

  /**
   * Template HTML pour notification de disponibilité de document
   */
  private static generateDocumentAvailableEmailTemplate(
    data: DocumentAvailableNotificationData,
    documentTypeLabel: string,
    priorityText: string
  ): string {
    const reservationDate = new Date(data.reservation_date).toLocaleDateString('fr-FR');
    const returnDate = new Date(data.return_date).toLocaleDateString('fr-FR');

    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Document Disponible - SIGB UdM</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, ${udmColors.primary}, ${udmColors.secondary}); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
        .highlight { background: #e8f5e8; padding: 15px; border-left: 4px solid #28a745; margin: 20px 0; border-radius: 5px; }
        .priority { background: #fff3cd; padding: 10px; border-left: 4px solid #ffc107; margin: 15px 0; border-radius: 5px; }
        .action-box { background: #d1ecf1; padding: 20px; border: 1px solid #bee5eb; border-radius: 5px; margin: 20px 0; }
        .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
        .document-info { background: white; padding: 15px; border-radius: 5px; margin: 15px 0; }
        .urgent { color: #dc3545; font-weight: bold; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>📚 Document Disponible !</h1>
            <p>Votre réservation peut maintenant être satisfaite</p>
        </div>

        <div class="content">
            <p>Bonjour <strong>${data.user_name}</strong>,</p>

            <div class="highlight">
                <h3>🎉 Excellente nouvelle !</h3>
                <p>Le document que vous aviez réservé est maintenant <strong>disponible</strong> et prêt à être emprunté.</p>
            </div>

            <div class="document-info">
                <h3>📖 Détails du Document</h3>
                <p><strong>Titre :</strong> ${data.document_title}</p>
                <p><strong>Auteur :</strong> ${data.document_author}</p>
                <p><strong>Type :</strong> ${documentTypeLabel}</p>
            </div>

            <div class="priority">
                <h3>🏆 Votre Position</h3>
                <p><strong>${priorityText}</strong></p>
                <p>Date de réservation : ${reservationDate}</p>
                <p>Document retourné le : ${returnDate}</p>
            </div>

            <div class="action-box">
                <h3>⚡ ACTION REQUISE</h3>
                <p class="urgent">Vous devez vous présenter à la bibliothèque dans les <strong>48 heures</strong> pour récupérer votre document.</p>

                <p><strong>Que faire maintenant :</strong></p>
                <ol>
                    <li>Présentez-vous à la bibliothèque avec votre carte d'étudiant</li>
                    <li>Demandez à satisfaire votre réservation</li>
                    <li>Le document vous sera remis pour emprunt</li>
                </ol>

                <p><strong>⚠️ Important :</strong> Si vous ne vous présentez pas dans les 48h, votre réservation sera automatiquement annulée et le document sera proposé au prochain utilisateur en attente.</p>
            </div>

            <div class="footer">
                <p>Cet email a été envoyé automatiquement par le Système Intégré de Gestion de Bibliothèque (SIGB)</p>
                <p><strong>Université des Montagnes</strong></p>
                <p>Email : bibliotheque@udm.edu.cm | Tél : +237 XXX XXX XXX</p>
            </div>
        </div>
    </div>
</body>
</html>
    `;
  }


}
