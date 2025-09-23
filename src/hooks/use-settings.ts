"use client";

import { useState, useEffect } from 'react';
import { useRefresh } from '@/contexts/refresh-context';

export interface SystemSettings {
  general: {
    max_loans_per_user: number;
    max_reservations_per_user: number;
    default_loan_duration_days: number;
    default_reservation_duration_days: number;
    library_name: string;
    library_address: string;
    library_phone: string;
    library_email: string;
    working_hours: string;
    late_fee_per_day: number;
    max_renewal_count: number;
    reservation_expiry_notification_days: number;
  };
  loans: {
    allow_renewals: boolean;
    max_renewals_per_item: number;
    renewal_duration_days: number;
    grace_period_days: number;
    auto_extend_on_holidays: boolean;
    block_loans_on_overdue: boolean;
    send_reminder_notifications: boolean;
    reminder_days_before_due: number;
  };
}

const defaultSettings: SystemSettings = {
  general: {
    max_loans_per_user: 3,
    max_reservations_per_user: 3,
    default_loan_duration_days: 14,
    default_reservation_duration_days: 7,
    library_name: "Bibliothèque Université des Montagnes",
    library_address: "Bangangté, Cameroun",
    library_phone: "+237 XXX XXX XXX",
    library_email: "bibliotheque@udm.edu.cm",
    working_hours: "Lundi-Vendredi: 8h-18h, Samedi: 8h-12h",
    late_fee_per_day: 100,
    max_renewal_count: 2,
    reservation_expiry_notification_days: 2,
  },
  loans: {
    allow_renewals: true,
    max_renewals_per_item: 2,
    renewal_duration_days: 14,
    grace_period_days: 3,
    auto_extend_on_holidays: true,
    block_loans_on_overdue: true,
    send_reminder_notifications: true,
    reminder_days_before_due: 3,
  }
};

export function useSettings() {
  const [settings, setSettings] = useState<SystemSettings>(defaultSettings);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { subscribe } = useRefresh();

  const fetchSettings = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const response = await fetch('/api/admin/settings');
      
      if (!response.ok) {
        throw new Error('Erreur lors du chargement des paramètres');
      }
      
      const data = await response.json();
      
      if (data.success && data.data.settings) {
        // Transformer les paramètres de la base de données en structure typée
        const transformedSettings: SystemSettings = {
          general: {
            max_loans_per_user: getSettingValue(data.data.settings, 'loans', 'max_loans_per_user', defaultSettings.general.max_loans_per_user),
            max_reservations_per_user: getSettingValue(data.data.settings, 'loans', 'max_reservations_per_user', defaultSettings.general.max_reservations_per_user),
            default_loan_duration_days: getSettingValue(data.data.settings, 'loans', 'default_loan_duration', defaultSettings.general.default_loan_duration_days),
            default_reservation_duration_days: getSettingValue(data.data.settings, 'loans', 'default_reservation_duration', defaultSettings.general.default_reservation_duration_days),
            library_name: getSettingValue(data.data.settings, 'general', 'library_name', defaultSettings.general.library_name),
            library_address: getSettingValue(data.data.settings, 'general', 'library_address', defaultSettings.general.library_address),
            library_phone: getSettingValue(data.data.settings, 'general', 'library_phone', defaultSettings.general.library_phone),
            library_email: getSettingValue(data.data.settings, 'general', 'library_email', defaultSettings.general.library_email),
            working_hours: getSettingValue(data.data.settings, 'general', 'working_hours', defaultSettings.general.working_hours),
            late_fee_per_day: getSettingValue(data.data.settings, 'general', 'late_fee_per_day', defaultSettings.general.late_fee_per_day),
            max_renewal_count: getSettingValue(data.data.settings, 'general', 'max_renewal_count', defaultSettings.general.max_renewal_count),
            reservation_expiry_notification_days: getSettingValue(data.data.settings, 'general', 'reservation_expiry_notification_days', defaultSettings.general.reservation_expiry_notification_days),
          },
          loans: {
            allow_renewals: getSettingValue(data.data.settings, 'loans', 'allow_renewals', defaultSettings.loans.allow_renewals),
            max_renewals_per_item: getSettingValue(data.data.settings, 'loans', 'max_renewals_per_item', defaultSettings.loans.max_renewals_per_item),
            renewal_duration_days: getSettingValue(data.data.settings, 'loans', 'renewal_duration_days', defaultSettings.loans.renewal_duration_days),
            grace_period_days: getSettingValue(data.data.settings, 'loans', 'grace_period_days', defaultSettings.loans.grace_period_days),
            auto_extend_on_holidays: getSettingValue(data.data.settings, 'loans', 'auto_extend_on_holidays', defaultSettings.loans.auto_extend_on_holidays),
            block_loans_on_overdue: getSettingValue(data.data.settings, 'loans', 'block_loans_on_overdue', defaultSettings.loans.block_loans_on_overdue),
            send_reminder_notifications: getSettingValue(data.data.settings, 'loans', 'send_reminder_notifications', defaultSettings.loans.send_reminder_notifications),
            reminder_days_before_due: getSettingValue(data.data.settings, 'loans', 'reminder_days_before_due', defaultSettings.loans.reminder_days_before_due),
          }
        };
        
        setSettings(transformedSettings);
      } else {
        // Utiliser les paramètres par défaut si pas de données
        setSettings(defaultSettings);
      }
    } catch (err) {
      console.error('Erreur lors du chargement des paramètres:', err);
      setError(err instanceof Error ? err.message : 'Erreur inconnue');
      // Utiliser les paramètres par défaut en cas d'erreur
      setSettings(defaultSettings);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
    
    // S'abonner aux changements de paramètres pour rafraîchir automatiquement
    const unsubscribe = subscribe('settings', () => {
      console.log('🔄 Rafraîchissement des paramètres détecté');
      fetchSettings();
    });
    
    return unsubscribe;
  }, [subscribe]);

  const refreshSettings = () => {
    fetchSettings();
  };

  return {
    settings,
    isLoading,
    error,
    refreshSettings
  };
}

// Fonction utilitaire pour extraire une valeur de paramètre
function getSettingValue(settings: any, category: string, key: string, defaultValue: any): any {
  if (!settings[category]) {
    return defaultValue;
  }
  
  const setting = settings[category].find((s: any) => s.key === key);
  return setting ? setting.value : defaultValue;
}
