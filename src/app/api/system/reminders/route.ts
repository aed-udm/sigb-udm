/**
 * API Route: /api/system/reminders
 * Exécution des rappels automatiques et notifications
 * Université des Montagnes - SIGB UdM
 */

import { NextRequest, NextResponse } from 'next/server';
import { ReminderService } from '@/lib/services/reminder-service';
import { logLibraryOperation, logError } from '@/lib/system-logger';

export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'all';

    let result: any = {};

    switch (type) {
      case 'due':
        // Envoyer seulement les rappels d'échéance
        result.dueReminders = await ReminderService.sendDueReminders();
        break;

      case 'availability':
        // Envoyer seulement les notifications de disponibilité
        result.availabilityNotifications = await ReminderService.notifyAvailableReservations();
        break;

      case 'cleanup':
        // Nettoyer les réservations expirées
        result.expiredReservationsCleanup = await ReminderService.cleanupExpiredReservations();
        break;

      case 'all':
      default:
        // Exécuter tous les rappels et le nettoyage
        const reminders = await ReminderService.runAllReminders();
        const cleanup = await ReminderService.cleanupExpiredReservations();
        
        result = {
          ...reminders,
          expiredReservationsCleanup: cleanup
        };
        break;
    }

    // Logger l'exécution des rappels
    await logLibraryOperation(
      'reminders_executed',
      'system',
      null,
      {
        type: type,
        result: result,
        executedAt: new Date().toISOString()
      }
    );

    return NextResponse.json({
      success: true,
      data: result,
      message: `Rappels de type "${type}" exécutés avec succès`,
      executedAt: new Date().toISOString()
    });

  } catch (error: unknown) {
    console.error('Error executing reminders:', error);
    await logError(error as Error, {
      action: 'execute_reminders',
      requestUrl: '/api/system/reminders'
    });

    return NextResponse.json(
      { error: { code: 'REMINDERS_ERROR', message: 'Erreur lors de l\'exécution des rappels' } },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action') || 'status';

    switch (action) {
      case 'status':
        // Retourner le statut des notifications
        const notificationsEnabled = process.env.EMAIL_NOTIFICATIONS_ENABLED === 'true';
        const reminderDays = parseInt(process.env.EMAIL_REMINDER_DAYS_BEFORE || '3');
        
        return NextResponse.json({
          success: true,
          data: {
            notifications_enabled: notificationsEnabled,
            reminder_days_before: reminderDays,
            email_service: process.env.EMAIL_SERVICE || 'none',
            email_from: process.env.EMAIL_FROM || 'not_configured'
          }
        });

      case 'preview':
        // Prévisualiser les rappels qui seraient envoyés
        // Cette fonctionnalité pourrait être ajoutée plus tard
        return NextResponse.json({
          success: true,
          data: {
            message: 'Fonctionnalité de prévisualisation à venir'
          }
        });

      default:
        return NextResponse.json(
          { error: { code: 'INVALID_ACTION', message: 'Action non reconnue' } },
          { status: 400 }
        );
    }

  } catch (error: unknown) {
    console.error('Error getting reminders status:', error);
    return NextResponse.json(
      { error: { code: 'STATUS_ERROR', message: 'Erreur lors de la récupération du statut' } },
      { status: 500 }
    );
  }
}
