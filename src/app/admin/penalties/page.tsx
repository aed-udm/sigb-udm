"use client";

import React, { useState, useEffect } from "react";
import { motion } from 'framer-motion';
import {
  AlertTriangle,
  Save,
  RefreshCw,
  Calendar,
  Clock,
  BookOpen,
  GraduationCap,
  FileText,
  Briefcase,
  Settings,
  Info,
  CheckCircle,
  XCircle
} from "lucide-react";
import { FcfaIcon } from "@/components/ui/fcfa-icon";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import ProtectedLayout from "@/components/layout/protected-layout";
import { useToast } from "@/hooks/use-toast";

interface PenaltySettings {
  id?: number;
  document_type: 'book' | 'these' | 'memoire' | 'rapport_stage';
  daily_rate: number;
  max_penalty: number;
  grace_period_days: number;
  is_active: boolean;
  document_type_label?: string;
  daily_rate_formatted?: string;
  max_penalty_formatted?: string;
  grace_period_label?: string;
}

const documentTypeConfig = {
  book: {
    label: 'Livres',
    icon: BookOpen,
    color: 'text-green-600 dark:text-green-400',
    bgColor: 'bg-green-50 dark:bg-green-900/20',
    borderColor: 'border-green-200 dark:border-green-700'
  },
  these: {
    label: 'Thèses',
    icon: GraduationCap,
    color: 'text-red-600 dark:text-red-400',
    bgColor: 'bg-red-50 dark:bg-red-900/20',
    borderColor: 'border-red-200 dark:border-red-700'
  },
  memoire: {
    label: 'Mémoires',
    icon: FileText,
    color: 'text-green-600 dark:text-green-400',
    bgColor: 'bg-green-50 dark:bg-green-900/20',
    borderColor: 'border-green-200 dark:border-green-700'
  },
  rapport_stage: {
    label: 'Rapports de stage',
    icon: Briefcase,
    color: 'text-gray-600 dark:text-gray-400',
    bgColor: 'bg-gray-50 dark:bg-gray-800/50',
    borderColor: 'border-gray-200 dark:border-gray-700'
  }
};

export default function PenaltiesSettingsPage() {
  const [settings, setSettings] = useState<PenaltySettings[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasChanges, setHasChanges] = useState(false);
  const { toast } = useToast();

  // Charger les paramètres de pénalités
  const fetchSettings = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/penalties');
      const data = await response.json();

      if (data.success) {
        setSettings(data.data);
        setError(null);
      } else {
        setError(data.error || 'Erreur lors du chargement');
      }
    } catch (err) {
      setError('Erreur de connexion');
      console.error('Erreur:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  // Mettre à jour un paramètre
  const updateSetting = (documentType: string, field: keyof PenaltySettings, value: any) => {
    setSettings(prev => prev.map(setting => 
      setting.document_type === documentType 
        ? { ...setting, [field]: value }
        : setting
    ));
    setHasChanges(true);
  };

  // Sauvegarder tous les paramètres
  const saveSettings = async () => {
    try {
      setSaving(true);
      
      const promises = settings.map(setting => 
        fetch('/api/admin/penalties', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            document_type: setting.document_type,
            daily_rate: Number(setting.daily_rate),
            max_penalty: Number(setting.max_penalty),
            grace_period_days: Number(setting.grace_period_days),
            is_active: setting.is_active
          })
        })
      );

      const responses = await Promise.all(promises);
      const results = await Promise.all(responses.map(r => r.json()));

      const errors = results.filter(r => !r.success);
      
      if (errors.length === 0) {
        toast({
          title: "Succès",
          description: "Paramètres de pénalités mis à jour avec succès",
        });
        setHasChanges(false);
        await fetchSettings(); // Recharger pour avoir les données formatées
      } else {
        toast({
          title: "Erreur",
          description: `${errors.length} erreur(s) lors de la sauvegarde`,
          variant: "destructive",
        });
      }
    } catch (err) {
      toast({
        title: "Erreur",
        description: "Erreur lors de la sauvegarde",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <ProtectedLayout>
        <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-gray-50 dark:from-gray-900 dark:via-gray-800 dark:to-purple-900 flex items-center justify-center">
          <motion.div
            className="text-center"
            initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5 }}
          >
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
              className="mb-6"
            >
              <Settings className="h-16 w-16 text-green-600 dark:text-green-400 mx-auto" />
            </motion.div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4">
              Chargement des paramètres...
            </h2>
          </motion.div>
        </div>
      </ProtectedLayout>
    );
  }

  if (error) {
    return (
      <ProtectedLayout>
        <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-gray-50 dark:from-gray-900 dark:via-gray-800 dark:to-green-900 flex items-center justify-center">
          <motion.div
            className="text-center"
            initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5 }}
          >
            <XCircle className="h-16 w-16 text-red-600 dark:text-red-400 mx-auto mb-6" />
            <h2 className="text-2xl font-bold text-red-600 dark:text-red-400 mb-4">
              {error}
            </h2>
            <Button onClick={fetchSettings} variant="outline">
              <RefreshCw className="h-4 w-4 mr-2" />
              Réessayer
            </Button>
          </motion.div>
        </div>
      </ProtectedLayout>
    );
  }

  return (
    <ProtectedLayout>
      <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-gray-50 dark:from-gray-900 dark:via-gray-800 dark:to-green-900">
        {/* Header */}
        <motion.div
          className="glass-nav shadow-lg border-b border-white/20 dark:border-gray-700/20 relative overflow-hidden bg-white/95 dark:bg-gray-900/95 backdrop-blur-md"
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.6 }}
        >
          <div className="absolute inset-0 bg-gradient-to-r from-green-500/5 via-transparent to-gray-500/5" />
          <div className="relative z-10 container mx-auto px-4 sm:px-6 py-6 lg:py-8">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-6 lg:space-y-0">
              <motion.div
                initial={{ opacity: 0, x: -30 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6, delay: 0.2 }}
                className="flex items-center gap-3 sm:gap-6"
              >
                <motion.div
                  animate={{
                    rotateY: 360,
                    scale: [1, 1.1, 1]
                  }}
                  transition={{
                    duration: 4,
                    repeat: Infinity,
                    ease: "easeInOut"
                  }}
                  className="relative flex-shrink-0"
                >
                  <AlertTriangle className="h-8 w-8 sm:h-10 sm:w-10 lg:h-12 lg:w-12 text-red-600 dark:text-red-400 drop-shadow-lg" />
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
                    className="absolute -inset-1 sm:-inset-2"
                  >
                    <FcfaIcon className="h-3 w-3 sm:h-4 sm:w-4 text-green-600 dark:text-green-400 absolute top-0 right-0" />
                    <Clock className="h-2 w-2 sm:h-3 sm:w-3 text-gray-600 dark:text-gray-400 absolute bottom-0 left-0" />
                  </motion.div>
                </motion.div>

                <div className="min-w-0 flex-1">
                  <motion.h1
                    className="text-2xl sm:text-3xl lg:text-4xl xl:text-5xl font-bold bg-gradient-to-r from-slate-800 via-green-600 to-slate-800 dark:from-slate-200 dark:via-green-400 dark:to-slate-200 bg-clip-text text-transparent"
                    initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
                    transition={{ duration: 0.8, delay: 0.4 }}
                  >
                    Configuration des Pénalités
                  </motion.h1>
                  <motion.div
                    className="text-sm sm:text-base lg:text-lg text-gray-600 dark:text-gray-300 mt-1 sm:mt-2 font-medium"
                    initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
                    transition={{ duration: 0.8, delay: 0.6 }}
                  >
                    Gérez les amendes pour les emprunts en retard
                    <motion.span
                      animate={{ scale: [1, 1.1, 1] }}
                      transition={{ duration: 3, repeat: Infinity }}
                      className="inline-block ml-2 sm:ml-3"
                    >
                      <AlertTriangle className="h-4 w-4 sm:h-5 sm:w-5 text-red-600 dark:text-red-400 inline" />
                    </motion.span>
                  </motion.div>
                </div>
              </motion.div>

              <motion.div
                className="flex flex-col sm:flex-row gap-2 sm:gap-4"
                initial={{ opacity: 0, x: 30 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6, delay: 0.8 }}
              >
                <Button
                  onClick={fetchSettings}
                  variant="outline"
                  disabled={loading}
                  className="bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Actualiser
                </Button>
                
                <Button
                  onClick={saveSettings}
                  disabled={!hasChanges || saving}
                  className="bg-green-600 hover:bg-green-700 dark:bg-green-600 dark:hover:bg-green-700 text-white"
                >
                  {saving ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Sauvegarde...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      Sauvegarder
                    </>
                  )}
                </Button>
              </motion.div>
            </div>
          </div>
        </motion.div>

        <div className="container mx-auto px-4 py-8">
          {/* Alerte d'information */}
          <motion.div
            initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.5 }}
            className="mb-8"
          >
            <Alert className="border-green-200 bg-green-50 dark:bg-green-900/20 dark:border-green-700">
              <Info className="h-4 w-4 text-green-600 dark:text-green-400" />
              <AlertDescription className="text-green-800 dark:text-green-200">
                <strong>Information :</strong> Les pénalités sont calculées automatiquement pour les emprunts en retard. 
                La période de grâce permet d'éviter les pénalités pendant les premiers jours de retard.
              </AlertDescription>
            </Alert>
          </motion.div>

          {/* Cartes de configuration */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {settings.map((setting, index) => {
              const config = documentTypeConfig[setting.document_type];
              const IconComponent = config.icon;

              return (
                <motion.div
                  key={setting.document_type}
                  initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                >
                  <Card className={`${config.bgColor} ${config.borderColor} border-2`}>
                    <CardHeader>
                      <CardTitle className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <IconComponent className={`h-6 w-6 ${config.color}`} />
                          <span className="text-gray-900 dark:text-gray-100">{config.label}</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Label htmlFor={`active-${setting.document_type}`} className="text-sm font-medium">
                            Actif
                          </Label>
                          <Switch
                            id={`active-${setting.document_type}`}
                            checked={setting.is_active}
                            onCheckedChange={(checked) => 
                              updateSetting(setting.document_type, 'is_active', checked)
                            }
                          />
                        </div>
                      </CardTitle>
                      <CardDescription>
                        Configuration des pénalités pour les {config.label.toLowerCase()}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      {/* Taux journalier */}
                      <div className="space-y-2">
                        <Label htmlFor={`daily-rate-${setting.document_type}`} className="flex items-center space-x-2">
                          <FcfaIcon className="h-4 w-4 text-green-600 dark:text-green-400" />
                          <span>Taux journalier (FCFA)</span>
                        </Label>
                        <Input
                          id={`daily-rate-${setting.document_type}`}
                          type="number"
                          min="0"
                          step="50"
                          value={setting.daily_rate}
                          onChange={(e) => 
                            updateSetting(setting.document_type, 'daily_rate', Number(e.target.value))
                          }
                          className="bg-white dark:bg-gray-800"
                        />
                        <p className="text-xs text-gray-600 dark:text-gray-300">
                          Montant de la pénalité par jour de retard
                        </p>
                      </div>

                      {/* Pénalité maximale */}
                      <div className="space-y-2">
                        <Label htmlFor={`max-penalty-${setting.document_type}`} className="flex items-center space-x-2">
                          <AlertTriangle className="h-4 w-4 text-red-600 dark:text-red-400" />
                          <span>Pénalité maximale (FCFA)</span>
                        </Label>
                        <Input
                          id={`max-penalty-${setting.document_type}`}
                          type="number"
                          min="0"
                          step="100"
                          value={setting.max_penalty}
                          onChange={(e) => 
                            updateSetting(setting.document_type, 'max_penalty', Number(e.target.value))
                          }
                          className="bg-white dark:bg-gray-800"
                        />
                        <p className="text-xs text-gray-600 dark:text-gray-300">
                          Montant maximum de la pénalité (0 = illimité)
                        </p>
                      </div>

                      {/* Période de grâce */}
                      <div className="space-y-2">
                        <Label htmlFor={`grace-period-${setting.document_type}`} className="flex items-center space-x-2">
                          <Calendar className="h-4 w-4 text-green-600 dark:text-green-400" />
                          <span>Période de grâce (jours)</span>
                        </Label>
                        <Input
                          id={`grace-period-${setting.document_type}`}
                          type="number"
                          min="0"
                          max="30"
                          value={setting.grace_period_days}
                          onChange={(e) => 
                            updateSetting(setting.document_type, 'grace_period_days', Number(e.target.value))
                          }
                          className="bg-white dark:bg-gray-800"
                        />
                        <p className="text-xs text-gray-600 dark:text-gray-300">
                          Nombre de jours sans pénalité après la date d'échéance
                        </p>
                      </div>

                      {/* Aperçu des calculs */}
                      <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                        <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
                          Aperçu du calcul
                        </h4>
                        <div className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
                          <p>• Retard de 1 jour : {setting.grace_period_days >= 1 ? '0 FCFA' : `${setting.daily_rate} FCFA`}</p>
                          <p>• Retard de 7 jours : {Math.max(0, (7 - setting.grace_period_days) * setting.daily_rate).toLocaleString()} FCFA</p>
                          <p>• Retard de 30 jours : {Math.min(setting.max_penalty || Infinity, Math.max(0, (30 - setting.grace_period_days) * setting.daily_rate)).toLocaleString()} FCFA</p>
                        </div>
                      </div>

                      {/* Statut */}
                      <div className="flex items-center justify-between pt-2">
                        <Badge className={setting.is_active
                          ? "bg-green-600 dark:bg-green-600 text-white border-green-700 dark:border-green-500"
                          : "bg-gray-600 dark:bg-gray-600 text-white border-gray-700 dark:border-gray-500"
                        }>
                          {setting.is_active ? (
                            <>
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Actif
                            </>
                          ) : (
                            <>
                              <XCircle className="h-3 w-3 mr-1" />
                              Inactif
                            </>
                          )}
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </div>

          {/* Indicateur de changements */}
          {hasChanges && (
            <motion.div
              initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
              className="fixed bottom-6 right-6 z-50"
            >
              <Alert className="border-red-200 bg-red-50 dark:bg-red-900/20 dark:border-red-700 shadow-lg">
                <AlertTriangle className="h-4 w-4 text-red-600 dark:text-red-400" />
                <AlertDescription className="text-red-800 dark:text-red-200">
                  Vous avez des modifications non sauvegardées
                </AlertDescription>
              </Alert>
            </motion.div>
          )}
        </div>
      </div>
    </ProtectedLayout>
  );
}
