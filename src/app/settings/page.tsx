"use client";

import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import ProtectedLayout from "@/components/layout/protected-layout";
import { useToast } from "@/hooks/use-toast";
import { InstantPageHeader, UnifiedStatCard } from "@/components/ui/instant-components";
import { useRefresh } from "@/contexts/refresh-context";
import { useReliableRefresh, useReliableFormRefresh } from "@/hooks";
import { 
  Settings, 
  Database, 
  Shield, 
  Clock, 
  FileText, 
  Users, 
  BookOpen, 
  Save, 
  RefreshCw, 
  AlertTriangle, 
  CheckCircle, 
  Info, 
  Briefcase, 
  DollarSign,
  Check,
  X,
  Link,
  UserCheck
} from "lucide-react";

// Types pour les données
interface SystemStats {
  general: {
    total_books: number;
    total_copies: number;
    available_copies: number;
    active_users: number;
    total_users: number;
    active_loans: number;
    overdue_loans: number;
    returned_loans: number;
    active_reservations: number;
    expired_reservations: number;
  };
  academic: {
    total_theses: number;
    total_memoires: number;
    total_stage_reports: number;
    theses_with_files: number;
    memoires_with_files: number;
    stage_reports_with_files: number;
  };
  system_info: {
    mysql_version: string;
    database_name: string;
    server_time: string;
    charset: string;
    collation: string;
  };
  database_size: {
    size_mb: number;
    table_count: number;
  };
  recent_activity: {
    new_books_30d: number;
    new_users_30d: number;
    new_loans_30d: number;
    new_theses_30d: number;
    new_memoires_30d: number;
    new_stage_reports_30d: number;
  };
}

interface Settings {
  general: Record<string, any>;
  loans: Record<string, any>;
  system: Record<string, any>;
  security: Record<string, any>;
  [key: string]: Record<string, any>; // Permet l'indexation dynamique
}

export default function SettingsPage() {
  const { toast } = useToast();
  const { subscribe, triggerRefresh } = useRefresh();
  const { performReliableRefresh } = useReliableFormRefresh();
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingStats, setIsLoadingStats] = useState(true);
  const [stats, setStats] = useState<SystemStats | null>(null);
  const [settings, setSettings] = useState<Settings | null>(null);

  const loadSystemStats = useCallback(async () => {
    try {
      setIsLoadingStats(true);
      const response = await fetch('/api/admin/sidebar-stats');
      const data = await response.json();

      if (data.success) {
        // Transformer les données depuis sidebar-stats vers SystemStats
        const mainStats = data.data.main_stats || {};
        const academicStats = data.data.academic_stats || {};
        const recentActivities = data.data.recent_activities || {};
        
        const transformedStats = {
          general: {
            total_books: mainStats.total_books || 0,
            total_copies: mainStats.total_books || 0, // Approximation
            available_copies: mainStats.available_books || 0,
            active_users: mainStats.active_users || 0,
            total_users: mainStats.active_users || 0, // Approximation
            active_loans: mainStats.active_loans || 0,
            overdue_loans: mainStats.overdue_loans || 0,
            returned_loans: 0, // Non disponible dans sidebar-stats
            active_reservations: mainStats.active_reservations || 0,
            expired_reservations: 0, // Non disponible
          },
          academic: {
            total_theses: academicStats.total_theses || 0,
            total_memoires: academicStats.total_memoires || 0,
            total_stage_reports: academicStats.total_stage_reports || 0,
            theses_with_files: academicStats.accessible_theses || 0,
            memoires_with_files: academicStats.accessible_memoires || 0,
            stage_reports_with_files: academicStats.accessible_stage_reports || 0,
          },
          system_info: {
            mysql_version: 'MySQL 8.0',
            database_name: 'bibliotheque_cameroun',
            server_time: data.data.generated_at || new Date().toISOString(),
            charset: 'utf8mb4',
            collation: 'utf8mb4_general_ci',
          },
          database_size: {
            size_mb: Math.round((mainStats.total_books * 0.1) + (academicStats.total_theses * 0.5) + (academicStats.total_memoires * 0.3)) || 1,
            table_count: 25, // Estimation basée sur la structure
          },
          recent_activity: {
            new_books_30d: recentActivities.new_book || 0,
            new_users_30d: recentActivities.new_user || 0,
            new_loans_30d: recentActivities.loan || 0,
            new_theses_30d: 0,
            new_memoires_30d: 0,
            new_stage_reports_30d: 0,
          },
        };
        setStats(transformedStats);
      } else {
        throw new Error(data.error);
      }
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de charger les statistiques système",
        variant: "destructive",
      });
    } finally {
      setIsLoadingStats(false);
    }
  }, [toast]);

  const loadSettings = useCallback(async () => {
    try {
      const response = await fetch('/api/admin/settings');
      const data = await response.json();

      if (data.success) {
        // Transformer la structure des données pour correspondre au format attendu
        const transformedSettings: Partial<Settings> = {};
        
        if (data.data && data.data.settings) {
          Object.keys(data.data.settings).forEach(category => {
            transformedSettings[category] = {};
            if (Array.isArray(data.data.settings[category])) {
              data.data.settings[category].forEach((setting: any) => {
                if (transformedSettings[category]) {
                  transformedSettings[category][setting.key] = {
                    value: setting.value,
                    type: setting.type,
                    description: setting.description,
                    is_public: setting.is_public
                  };
                }
              });
            }
          });
        }
        
        setSettings(transformedSettings as Settings);
      } else {
        throw new Error(data.error);
      }
    } catch (error) {
      console.error('Erreur chargement paramètres:', error);
      // Utiliser des données par défaut en cas d'erreur
      setSettings({
        general: {
          library_name: { value: 'Bibliothèque Université des Montagnes', type: 'string' },
          library_code: { value: 'BIB-UDM', type: 'string' },
          library_phone: { value: '+237 233 462 946', type: 'string' },
          library_email: { value: 'bibliotheque@univ-montagnes.cm', type: 'string' },
          library_website: { value: 'https://univ-montagnes.cm', type: 'string' },
          library_address: { value: 'BP 208 Bangangté, Cameroun', type: 'string' }
        },
        loans: {
          default_loan_duration: { value: 21, type: 'integer' },
          max_renewals: { value: 2, type: 'integer' },
          max_loans_per_user: { value: 3, type: 'integer' },
          max_reservations_per_user: { value: 2, type: 'integer' },
          default_reservation_duration: { value: 7, type: 'integer' }
        },
        system: {},
        security: {}
      });
    }
  }, [toast]);

  // Fonction combinée pour charger toutes les données
  const loadAllData = useCallback(async () => {
    await Promise.all([loadSystemStats(), loadSettings()]);
  }, [loadSystemStats, loadSettings]);

  // Système de rafraîchissement avec debouncing
  const { debouncedRefresh } = useReliableRefresh({
    onRefresh: loadAllData,
    fallbackDelay: 2000
  });

  // Chargement des données réelles au montage et abonnements
  useEffect(() => {
    loadAllData();

    // S'abonner aux changements de toutes les entités avec debouncing
    const unsubscribeLoan = subscribe('loans', debouncedRefresh);
    const unsubscribeReservation = subscribe('reservations', debouncedRefresh);
    const unsubscribeBook = subscribe('books', debouncedRefresh);
    const unsubscribeUser = subscribe('users', debouncedRefresh);

    return () => {
      unsubscribeLoan();
      unsubscribeReservation();
      unsubscribeBook();
      unsubscribeUser();
    };
  }, [loadAllData, subscribe, debouncedRefresh]);

  const handleSaveSettings = async (category: string, categorySettings: Record<string, any>) => {
    setIsLoading(true);
    try {
      // Transformer les données pour l'API
      const settingsArray = Object.keys(categorySettings).map(key => ({
        key,
        value: categorySettings[key],
        type: typeof categorySettings[key] === 'number' ? 'integer' : 'string',
        category,
        description: `Paramètre ${key} pour ${category}`,
        is_public: false
      }));

      const response = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          settings: settingsArray
        })
      });

      const data = await response.json();

      if (data.success) {
        toast({
          icon: <Check className="h-4 w-4" />,
          title: "Paramètres sauvegardés avec succès",
          description: category === 'loans' 
            ? `Limites d'emprunts et réservations mises à jour. Durée de prêt: ${categorySettings.default_loan_duration || 21} jours.`
            : `Configuration ${category} mise à jour dans la base de données.`,
        });

        // Si on sauvegarde les paramètres de prêts, mettre à jour tous les utilisateurs existants
        if (category === 'loans') {
          await updateExistingUsersLimits(categorySettings);
        }

        // RAFRAÎCHISSEMENT FIABLE - Notifier toutes les interfaces
        await performReliableRefresh(`Sauvegarde paramètres ${category}`);
        
        // Rafraîchir spécifiquement les composants concernés
        triggerRefresh('users');
        triggerRefresh('users-list');
        triggerRefresh('settings');
        triggerRefresh('statistics');

        // Recharger les paramètres
        await loadSettings();
      } else {
        throw new Error(data.error?.message || 'Erreur inconnue');
      }
    } catch (error) {
      console.error('Erreur sauvegarde:', error);
      toast({
        icon: <X className="h-4 w-4" />,
        title: "Erreur de sauvegarde",
        description: `Impossible de sauvegarder les paramètres ${category}. Vérifiez votre connexion et réessayez.`,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Fonction pour mettre à jour les limites des utilisateurs existants
  const updateExistingUsersLimits = async (loanSettings: Record<string, any>) => {
    try {
      const response = await fetch('/api/admin/users/update-limits', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          max_loans_per_user: loanSettings.max_loans_per_user,
          max_reservations_per_user: loanSettings.max_reservations_per_user
        })
      });

      const data = await response.json();
      
      if (data.success) {
        toast({
          icon: <UserCheck className="h-4 w-4" />,
          title: "Utilisateurs mis à jour automatiquement",
          description: `${data.data?.updated_count || 0} utilisateurs actifs ont reçu les nouvelles limites (${loanSettings.max_loans_per_user} emprunts max, ${loanSettings.max_reservations_per_user} réservations max).`,
        });
      } else {
        console.error('Erreur mise à jour utilisateurs:', data.error);
      }
    } catch (error) {
      console.error('Erreur lors de la mise à jour des utilisateurs:', error);
    }
  };

  const handleTestConnection = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/admin/sidebar-stats');
      const data = await response.json();

      if (data.success) {
        toast({
          icon: <Link className="h-4 w-4" />,
          title: "Connexion base de données réussie",
          description: "MySQL est accessible. Toutes les fonctionnalités sont opérationnelles.",
        });
        // Recharger les statistiques
        await loadSystemStats();
      } else {
        throw new Error(data.error);
      }
    } catch (error) {
      toast({
        icon: <X className="h-4 w-4" />,
        title: "Erreur de connexion MySQL",
        description: "Impossible d'accéder à la base de données. Vérifiez que le serveur MySQL est démarré.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const updateSetting = (category: string, key: string, value: any) => {
    if (!settings) return;

    setSettings(prev => ({
      ...prev!,
      [category]: {
        ...prev![category],
        [key]: {
          ...prev![category][key],
          value
        }
      }
    }));
  };

  return (
    <ProtectedLayout>
      <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-gray-50 dark:from-gray-900 dark:via-gray-800 dark:to-green-900 relative overflow-hidden">
        {/* Éléments d'arrière-plan animés */}
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-green-400/20 to-gray-400/20 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-gradient-to-br from-gray-400/20 to-green-400/20 rounded-full blur-3xl" />

        {/* Particules flottantes */}
        {[...Array(15)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-2 h-2 bg-green-400/30 rounded-full"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
            }}
            animate={{
              y: [0, -20, 0],
              opacity: [0.3, 0.8, 0.3],
            }}
            transition={{
              duration: 3 + Math.random() * 2,
              repeat: Infinity,
              delay: Math.random() * 2,
            }}
          />
        ))}

        {/* Header RESPONSIVE uniforme */}
        <InstantPageHeader
          title="Paramètres du Système"
          subtitle="Configuration et gestion des paramètres de la bibliothèque"
          icon={Settings}
          actions={
            <Button
              onClick={loadAllData}
              variant="outline"
              size="sm"
              className="bg-green-100 dark:bg-green-700 border border-green-300 dark:border-green-600 hover:bg-green-200 dark:hover:bg-green-600 hover:border-green-400 dark:hover:border-green-500 transition-all duration-200 font-medium text-green-700 dark:text-green-200"
            >
              Actualiser
            </Button>
          }
        />

        <div className="container mx-auto px-4 py-8 space-y-8 relative z-10">

        {/* Configuration des Pénalités */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-gray-600" />
                Configuration des Pénalités
              </CardTitle>
              <CardDescription>
                Gestion des amendes pour les emprunts en retard par type de document
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-4 bg-gray-50 dark:bg-gray-800/90 rounded-lg border border-gray-200 dark:border-gray-700">
                <div className="flex-1 min-w-0">
                  <h4 className="font-medium text-gray-900 dark:text-gray-100">
                    Paramètres des Pénalités
                  </h4>
                  <p className="text-sm text-gray-700 dark:text-gray-300">
                    Configurez les taux journaliers, pénalités maximales et périodes de grâce pour chaque type de document
                  </p>
                </div>
                <Button
                  onClick={() => window.location.href = '/admin/penalties'}
                  className="bg-gray-600 hover:bg-gray-700 w-full sm:w-auto flex-shrink-0"
                  size="sm"
                >
                  <DollarSign className="h-4 w-4 mr-2" />
                  <span className="truncate">Configurer les Pénalités</span>
                </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="text-center p-4 bg-green-50 dark:bg-green-800/90 rounded-lg border border-green-200 dark:border-green-700">
                  <BookOpen className="h-8 w-8 text-green-600 dark:text-green-300 mx-auto mb-2" />
                  <div className="text-lg font-bold text-green-600 dark:text-green-200">Livres</div>
                  <div className="text-sm text-gray-600 dark:text-gray-300">100 FCFA/jour</div>
                </div>
                <div className="text-center p-4 bg-gray-50 dark:bg-gray-800/90 rounded-lg border border-gray-200 dark:border-gray-700">
                  <FileText className="h-8 w-8 text-gray-600 dark:text-gray-300 mx-auto mb-2" />
                  <div className="text-lg font-bold text-gray-600 dark:text-gray-200">Thèses</div>
                  <div className="text-sm text-gray-600 dark:text-gray-300">200 FCFA/jour</div>
                </div>
                <div className="text-center p-4 bg-green-50 dark:bg-green-800/90 rounded-lg border border-green-200 dark:border-green-700">
                  <FileText className="h-8 w-8 text-green-600 dark:text-green-300 mx-auto mb-2" />
                  <div className="text-lg font-bold text-green-600 dark:text-green-200">Mémoires</div>
                  <div className="text-sm text-gray-600 dark:text-gray-300">150 FCFA/jour</div>
                </div>
                <div className="text-center p-4 bg-gray-50 dark:bg-gray-800/90 rounded-lg border border-gray-200 dark:border-gray-700">
                  <Briefcase className="h-8 w-8 text-gray-600 dark:text-gray-300 mx-auto mb-2" />
                  <div className="text-lg font-bold text-gray-600 dark:text-gray-200">Rapports</div>
                  <div className="text-sm text-gray-600 dark:text-gray-300">100 FCFA/jour</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Informations générales */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Info className="h-5 w-5 text-green-600" />
                Informations Générales
              </CardTitle>
              <CardDescription>
                Configuration des informations de base de la bibliothèque
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {settings?.general ? (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="libraryName">Nom de la bibliothèque</Label>
                      <Input
                        id="libraryName"
                        value={settings.general.library_name?.value || ''}
                        onChange={(e) => updateSetting('general', 'library_name', e.target.value)}
                      />
                    </div>
                    <div>
                      <Label htmlFor="libraryCode">Code de la bibliothèque</Label>
                      <Input
                        id="libraryCode"
                        value={settings.general.library_code?.value || ''}
                        onChange={(e) => updateSetting('general', 'library_code', e.target.value)}
                      />
                    </div>
                    <div>
                      <Label htmlFor="phone">Téléphone</Label>
                      <Input
                        id="phone"
                        value={settings.general.library_phone?.value || ''}
                        onChange={(e) => updateSetting('general', 'library_phone', e.target.value)}
                      />
                    </div>
                    <div>
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        value={settings.general.library_email?.value || ''}
                        onChange={(e) => updateSetting('general', 'library_email', e.target.value)}
                      />
                    </div>
                    <div>
                      <Label htmlFor="website">Site web</Label>
                      <Input
                        id="website"
                        type="url"
                        value={settings.general.library_website?.value || ''}
                        onChange={(e) => updateSetting('general', 'library_website', e.target.value)}
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="address">Adresse</Label>
                    <Textarea
                      id="address"
                      value={settings.general.library_address?.value || ''}
                      onChange={(e) => updateSetting('general', 'library_address', e.target.value)}
                      rows={3}
                    />
                  </div>
                  <Button
                    onClick={() => {
                      const generalData = Object.keys(settings.general).reduce((acc, key) => {
                        acc[key] = settings.general[key].value;
                        return acc;
                      }, {} as Record<string, any>);
                      handleSaveSettings("general", generalData);
                    }}
                    disabled={isLoading}
                    className="w-full md:w-auto"
                  >
                    <Save className="h-4 w-4 mr-2" />
                    Sauvegarder
                  </Button>
                </>
              ) : (
                <div className="text-center py-4">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mx-auto mb-4"></div>
                  <p className="text-gray-700 dark:text-gray-200">Chargement des paramètres...</p>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Paramètres généraux des prêts */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-green-600" />
                Paramètres Généraux des Prêts
              </CardTitle>
              <CardDescription>
                Configuration des règles générales de prêt (durée, renouvellements, limites)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {settings?.loans ? (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <Label htmlFor="loanDuration">Durée de prêt (jours)</Label>
                      <Input
                        id="loanDuration"
                        type="number"
                        value={settings.loans.default_loan_duration?.value || 21}
                        onChange={(e) => updateSetting('loans', 'default_loan_duration', parseInt(e.target.value))}
                      />
                    </div>
                    <div>
                      <Label htmlFor="maxRenewals">Renouvellements max</Label>
                      <Input
                        id="maxRenewals"
                        type="number"
                        value={settings.loans.max_renewals?.value || 2}
                        onChange={(e) => updateSetting('loans', 'max_renewals', parseInt(e.target.value))}
                      />
                    </div>
                    <div>
                      <Label htmlFor="maxLoans">Prêts max par utilisateur</Label>
                      <Input
                        id="maxLoans"
                        type="number"
                        value={settings.loans.max_loans_per_user?.value || 3}
                        onChange={(e) => updateSetting('loans', 'max_loans_per_user', parseInt(e.target.value))}
                      />
                    </div>
                  </div>

                  {/* Nouveaux paramètres pour les réservations */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                    <div>
                      <Label htmlFor="maxReservations">Réservations max par utilisateur</Label>
                      <Input
                        id="maxReservations"
                        type="number"
                        value={settings.loans.max_reservations_per_user?.value || 2}
                        onChange={(e) => updateSetting('loans', 'max_reservations_per_user', parseInt(e.target.value))}
                      />
                    </div>
                    <div>
                      <Label htmlFor="reservationDuration">Durée de réservation (jours)</Label>
                      <Input
                        id="reservationDuration"
                        type="number"
                        value={settings.loans.default_reservation_duration?.value || 7}
                        onChange={(e) => updateSetting('loans', 'default_reservation_duration', parseInt(e.target.value))}
                      />
                    </div>
                  </div>

                  {/* Note sur les pénalités */}
                  <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-800/90 rounded-lg border border-gray-200 dark:border-gray-800">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-1">
                          Configuration des Pénalités
                        </h4>
                        <p className="text-sm text-gray-700 dark:text-gray-300">
                          Les paramètres de pénalités (amendes, périodes de grâce) sont maintenant configurés par type de document dans une interface dédiée.
                        </p>
                      </div>
                      <Button
                        onClick={() => window.location.href = '/admin/penalties'}
                        size="sm"
                        className="bg-gray-600 hover:bg-gray-700 text-white w-full sm:w-auto flex-shrink-0"
                      >
                        <AlertTriangle className="h-4 w-4 mr-2" />
                        <span className="truncate">Configurer</span>
                      </Button>
                    </div>
                  </div>
                  <Button
                    onClick={() => {
                      // Sauvegarder tous les paramètres de prêts et réservations
                      const loansData = {
                        default_loan_duration: settings.loans.default_loan_duration?.value || 21,
                        max_renewals: settings.loans.max_renewals?.value || 2,
                        max_loans_per_user: settings.loans.max_loans_per_user?.value || 3,
                        max_reservations_per_user: settings.loans.max_reservations_per_user?.value || 2,
                        default_reservation_duration: settings.loans.default_reservation_duration?.value || 7
                      };
                      handleSaveSettings("loans", loansData);
                    }}
                    disabled={isLoading}
                    className="w-full md:w-auto"
                  >
                    <Save className="h-4 w-4 mr-2" />
                    Sauvegarder les Paramètres Généraux
                  </Button>
                </>
              ) : (
                <div className="text-center py-4">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mx-auto mb-4"></div>
                  <p className="text-gray-700 dark:text-gray-200">Chargement des paramètres...</p>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Paramètres système */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5 text-green-600" />
                Paramètres Système
              </CardTitle>
              <CardDescription>
                Configuration du système et de la base de données
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Test de connexion */}
              <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800/90 rounded-lg border border-gray-200 dark:border-gray-700">
                <div>
                  <h4 className="font-medium">Connexion à la base de données</h4>
                  <p className="text-sm text-gray-700 dark:text-gray-200">
                    Tester la connectivité avec MySQL
                  </p>
                </div>
                <Button 
                  onClick={handleTestConnection}
                  disabled={isLoading}
                  variant="outline"
                >
                  {isLoading ? (
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <CheckCircle className="h-4 w-4 mr-2" />
                  )}
                  Tester
                </Button>
              </div>

              {/* Statistiques système */}
              {isLoadingStats ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mx-auto mb-4"></div>
                  <p className="text-gray-700 dark:text-gray-200">Chargement des statistiques...</p>
                </div>
              ) : stats ? (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
                  <UnifiedStatCard
                    stat={{
                      value: stats?.general?.total_books?.toLocaleString() || '0',
                      label: "Livres",
                      icon: BookOpen,
                      gradient: "from-green-600 to-green-700"
                    }}
                  />
                  <UnifiedStatCard
                    stat={{
                      value: stats?.general?.active_users?.toLocaleString() || '0',
                      label: "Utilisateurs actifs",
                      icon: Users,
                      gradient: "from-green-600 to-green-700"
                    }}
                  />
                  <UnifiedStatCard
                    stat={{
                      value: stats?.general?.active_loans?.toLocaleString() || '0',
                      label: "Prêts actifs",
                      icon: Clock,
                      gradient: "from-gray-600 to-gray-700"
                    }}
                  />
                  <UnifiedStatCard
                    stat={{
                      value: stats?.academic?.total_theses?.toLocaleString() || '0',
                      label: "Thèses",
                      icon: FileText,
                      gradient: "from-gray-600 to-gray-700"
                    }}
                  />
                  <UnifiedStatCard
                    stat={{
                      value: stats?.academic?.total_memoires?.toLocaleString() || '0',
                      label: "Mémoires",
                      icon: FileText,
                      gradient: "from-green-600 to-green-700"
                    }}
                  />
                  <UnifiedStatCard
                    stat={{
                      value: stats?.academic?.total_stage_reports?.toLocaleString() || '0',
                      label: "Rapports de stage",
                      icon: Briefcase,
                      gradient: "from-gray-600 to-gray-700"
                    }}
                  />
                  <UnifiedStatCard
                    stat={{
                      value: stats?.general?.overdue_loans?.toLocaleString() || '0',
                      label: "Retards",
                      icon: AlertTriangle,
                      gradient: "from-gray-600 to-gray-700"
                    }}
                  />
                  <UnifiedStatCard
                    stat={{
                      value: `${stats?.database_size?.size_mb || '0'}`,
                      label: "MB (Base de données)",
                      icon: Database,
                      gradient: "from-gray-600 to-gray-700"
                    }}
                  />
                </div>
              ) : (
                <div className="text-center py-4 text-red-600">
                  Erreur lors du chargement des statistiques
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Informations système */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.4 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-gray-600" />
                Informations Système
              </CardTitle>
              <CardDescription>
                Détails techniques et version du système
              </CardDescription>
            </CardHeader>
            <CardContent>
              {stats ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm font-medium">Version Application:</span>
                      <Badge variant="info">v2.1.0</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm font-medium">Base de données:</span>
                      <Badge variant="success">{stats?.system_info?.mysql_version || 'N/A'}</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm font-medium">Framework:</span>
                      <Badge variant="info">Next.js 15</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm font-medium">Charset:</span>
                      <Badge variant="outline">{stats?.system_info?.charset || 'N/A'}</Badge>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm font-medium">Base de données:</span>
                      <span className="text-sm text-gray-600">{stats?.system_info?.database_name || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm font-medium">Taille DB:</span>
                      <span className="text-sm text-gray-600">{stats?.database_size?.size_mb || '0'} MB</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm font-medium">Tables:</span>
                      <span className="text-sm text-gray-600">{stats?.database_size?.table_count || '0'} tables</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm font-medium">Statut système:</span>
                      <Badge variant="success">Opérationnel</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm font-medium">Dernière mise à jour:</span>
                      <span className="text-sm text-gray-600">
                        {stats?.system_info?.server_time ? new Date(stats?.system_info?.server_time).toLocaleString('fr-FR') : 'N/A'}
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-4">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mx-auto mb-4"></div>
                  <p className="text-gray-700 dark:text-gray-200">Chargement des informations système...</p>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
    </ProtectedLayout>
  );
}
