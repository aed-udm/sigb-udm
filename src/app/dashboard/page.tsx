"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { motion } from "framer-motion";
import {
  BookOpen,
  Users,
  AlertCircle,
  Calendar,
  BarChart3,
  PlusCircle,
  Clock,
  Upload
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { NotificationBadge } from "@/components/ui/notification-badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import ProtectedLayout from "@/components/layout/protected-layout";
import { useToast } from "@/hooks/use-toast";
import { useUserRole, useDebouncedRefresh } from "@/hooks";
import { useRefresh } from "@/contexts/refresh-context";

import { UnifiedStatCard } from "@/components/ui/instant-components";

interface DashboardStats {
  total_books: number;
  total_users: number;
  active_loans: number;
  overdue_loans: number;
  total_theses: number;
  trends: {
    loans_growth: number;
    users_growth: number;
    books_growth: number;
    return_rate: number;
  };
}

interface Activity {
  type: 'loan' | 'return' | 'new_user' | 'overdue';
  user: string;
  book: string | null;
  time: string;
}

const allQuickActions = [
  {
    title: "Nouvel Emprunt",
    description: "Enregistrer un nouvel emprunt",
    icon: PlusCircle,
    href: "/loans/new",
    color: "bg-green-700", // Couleur UdM principale
    permissions: ["loans.create"] // Circulation et Admin
  },
  {
    title: "Nouveau Livre",
    description: "Ajouter un nouveau livre au catalogue",
    icon: BookOpen,
    href: "/books/new",
    color: "bg-gray-500", // Couleur distincte pour les livres
    permissions: ["catalog.create"] // Bibliothécaire et Admin
  },
  {
    title: "Nouvelle Thèse/Mémoire",
    description: "Ajouter une nouvelle thèse ou mémoire",
    icon: BookOpen,
    href: "/theses/new",
    color: "bg-green-800", // Couleur distincte pour les thèses/mémoires
    permissions: ["catalog.create"] // Bibliothécaire et Admin
  },
  {
    title: "Nouvel Utilisateur",
    description: "Créer un compte utilisateur",
    icon: Users,
    href: "/users/new",
    color: "bg-gray-500", // Couleur UdM neutre
    permissions: ["users.create"] // Enregistrement et Admin
  },
  {
    title: "Nouvelle Réservation",
    description: "Créer une réservation de document",
    icon: Clock,
    href: "/reservations/new",
    color: "bg-green-600", // Couleur UdM principale variant
    permissions: ["reservations.create"] // Circulation et Enregistrement et Admin
  },
  {
    title: "Voir Statistiques",
    description: "Consulter les rapports détaillés",
    icon: BarChart3,
    href: "/analytics",
    color: "bg-gray-600", // Couleur UdM principale variant
    permissions: ["analytics.view"] // Admin et Bibliothécaire
  },
  {
    title: "Import Massif",
    description: "Importer des documents par CSV/Excel",
    icon: Upload,
    href: "/admin/import",
    color: "bg-gray-600", // Couleur UdM neutre variant
    permissions: ["import.create"] // Admin et Bibliothécaire
  }
];

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();
  const { permissions } = useUserRole();
  const { subscribe } = useRefresh();

  // Filtrer les actions rapides selon les permissions du rôle
  const quickActions = useMemo(() => {
    return allQuickActions.filter(action =>
      action.permissions.some(permission => permissions.includes(permission))
    );
  }, [permissions]);

  // Fonction pour charger les statistiques et activités depuis l'API
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);

      // Charger les statistiques et activités en parallèle
      const [statsResponse, activitiesResponse] = await Promise.all([
        fetch('/api/stats/overview'),
        fetch('/api/activities?limit=5')
      ]);

      if (!statsResponse.ok) {
        throw new Error('Erreur lors du chargement des statistiques');
      }

      const statsData = await statsResponse.json();
      setStats(statsData.data);

      // Charger les activités (même si ça échoue, on continue)
      if (activitiesResponse.ok) {
        const activitiesData = await activitiesResponse.json();
        setActivities(activitiesData.data || []);
      }

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue');
      toast({
        title: "Erreur",
        description: "Impossible de charger les données",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  // Système de rafraîchissement avec debouncing pour éviter trop de requêtes
  const { debouncedRefresh } = useDebouncedRefresh(2000);

  // Charger les données au montage et s'abonner aux changements
  useEffect(() => {
    fetchData();

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
  }, [fetchData, subscribe, debouncedRefresh]);

  // Créer les cartes de statistiques à partir des données API
  const statsCards = stats ? [
    {
      value: stats?.total_books?.toLocaleString() || '0',
      label: "Total Livres",
      icon: BookOpen,
      gradient: "from-green-600 to-green-700", // Couleur conservée pour les livres
      color: "blue"
    },
    {
      value: stats?.total_users?.toLocaleString() || '0',
      label: "Utilisateurs Actifs",
      icon: Users,
      gradient: "from-green-500 to-green-600",
      color: "green"
    },
    {
      value: stats.active_loans?.toLocaleString() || '0',
      label: "Emprunts en Cours",
      icon: Calendar,
      gradient: "from-yellow-500 to-yellow-600",
      color: "yellow"
    },
    {
      value: stats.overdue_loans?.toLocaleString() || '0',
      label: "Retards",
      icon: AlertCircle,
      gradient: "from-red-500 to-red-600",
      color: "red"
    }
  ] : [];

  return (
    <ProtectedLayout>
      <div className="relative min-h-screen bg-gradient-to-br from-green-50 via-white to-gray-50 dark:from-gray-900 dark:via-gray-800 dark:to-green-900">
        {/* Header professionnel uniforme avec glassmorphism */}
        <motion.div
          className="glass-nav shadow-lg border-b border-white/20 dark:border-gray-700/20 relative overflow-hidden bg-white/95 dark:bg-gray-900/95 backdrop-blur-md"
          initial={{ y: -50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.6 }}
        >
          {/* Effet glassmorphism background */}
          <div className="absolute inset-0 bg-gradient-to-r from-green-500/5 via-transparent to-gray-500/5" />

          <div className="relative z-10 container mx-auto px-3 sm:px-4 md:px-6 py-4 sm:py-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
              <div className="flex items-center space-x-2 sm:space-x-3">
                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ duration: 0.3 }}
                >
                  <BarChart3 className="h-6 w-6 sm:h-8 sm:w-8 text-green-600" />
                </motion.div>
                <div>
                  <motion.h1
                    className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900 dark:text-gray-100"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, delay: 0.1 }}
                  >
                    Tableau de bord
                  </motion.h1>
                  <motion.p
                    className="text-sm sm:text-base text-gray-600 dark:text-gray-300 mt-1"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, delay: 0.2 }}
                  >
                    Vue d'ensemble de votre bibliothèque
                  </motion.p>
                </div>
              </div>

              <motion.div
                className="w-full sm:w-auto flex items-center gap-3"
                initial={{ x: 20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ duration: 0.4, delay: 0.3 }}
              >
                <div className="flex items-center gap-2 px-3 py-2 bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-900 dark:text-gray-300 dark:border-gray-800 rounded-full border text-xs font-medium backdrop-blur-sm">
                  <Calendar className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
                  <span className="hidden sm:inline">Dernière mise à jour: </span>
                  <span className="sm:hidden">MAJ: </span>
                  <span className="truncate">{new Date().toLocaleString('fr-FR', {
                    day: '2-digit',
                    month: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}</span>
                </div>

                <Button
                  onClick={fetchData}
                  variant="outline"
                  size="sm"
                  className="bg-green-100 dark:bg-green-700 border border-green-300 dark:border-green-600 hover:bg-green-200 dark:hover:bg-green-600 hover:border-green-400 dark:hover:border-green-500 transition-all duration-200 font-medium text-green-700 dark:text-green-200"
                >
                  Actualiser
                </Button>
              </motion.div>
            </div>
          </div>
        </motion.div>

      <div className="container mx-auto px-2 sm:px-4 py-4 sm:py-6 lg:py-8">
        {/* Stats Cards RESPONSIVE */}
        {loading ? (
          <motion.div
            className="flex items-center justify-center py-8 sm:py-12"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <div className="text-center">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                className="mb-4"
              >
                <BarChart3 className="h-8 w-8 sm:h-12 sm:w-12 text-green-600 mx-auto" />
              </motion.div>
              <span className="text-sm sm:text-lg font-medium text-gray-600 dark:text-gray-300">
                Chargement des statistiques...
              </span>
            </div>
          </motion.div>
        ) : error ? (
          <motion.div
            className="text-center py-8 sm:py-12"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
          >
            <AlertCircle className="h-8 w-8 sm:h-12 sm:w-12 text-red-500 mx-auto mb-4" />
            <p className="text-red-600 dark:text-red-400 text-sm sm:text-lg font-medium mb-4 px-4">{error}</p>
            <Button
              variant="outline"
              className="border-red-300 text-red-600 hover:bg-red-50"
              onClick={() => window.location.reload()}
            >
              Réessayer
            </Button>
          </motion.div>
        ) : (
          <motion.div
            className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6 mb-4 sm:mb-6 lg:mb-8"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.6 }}
          >
            {statsCards.map((stat, index) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 50, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{
                duration: 0.6,
                delay: 0.8 + index * 0.1,
                type: "spring",
                stiffness: 100
              }}
              whileHover={{
                y: -5,
                scale: 1.02,
                transition: { duration: 0.2 }
              }}
              className="group"
            >
              <UnifiedStatCard stat={stat} index={index} />
            </motion.div>
          ))}
          </motion.div>
        )}

        <div className={`grid grid-cols-1 gap-4 sm:gap-6 lg:gap-8 ${quickActions.length > 0 ? 'lg:grid-cols-3' : 'lg:grid-cols-2'}`}>
          {/* Quick Actions RESPONSIVE - Affiché seulement si des actions sont disponibles */}
          {quickActions.length > 0 && (
            <div className="lg:col-span-1">
              <Card>
                <CardHeader className="pb-3 sm:pb-6">
                  <CardTitle className="text-lg sm:text-xl">Actions Rapides</CardTitle>
                  <CardDescription className="text-sm">
                    Accès rapide aux fonctionnalités principales
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-2 sm:space-y-3">
                  {quickActions.map((action, index) => (
                    <motion.div
                      key={action.title}
                      initial={{ y: 20, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      transition={{ duration: 0.5, delay: index * 0.1 }}
                    >
                      <Button
                        variant="ghost"
                        className="w-full justify-start h-auto p-3 sm:p-4 hover:bg-gray-50 dark:hover:bg-gray-800"
                        asChild
                      >
                        <Link href={action.href}>
                          <div className={`p-1.5 sm:p-2 rounded-md ${action.color} mr-2 sm:mr-3 flex-shrink-0`}>
                            <action.icon className="h-3 w-3 sm:h-4 sm:w-4 text-white" />
                          </div>
                          <div className="text-left min-w-0 flex-1">
                            <div className="font-medium text-sm sm:text-base truncate">{action.title}</div>
                            <div className="text-xs sm:text-sm text-gray-700 dark:text-gray-200 line-clamp-2">
                              {action.description}
                            </div>
                          </div>
                        </Link>
                      </Button>
                    </motion.div>
                  ))}
                </CardContent>
              </Card>
            </div>
          )}

          {/* Recent Activities RESPONSIVE */}
          <div className={quickActions.length > 0 ? "lg:col-span-2" : ""}>
            <Card>
              <CardHeader className="pb-3 sm:pb-6">
                <CardTitle className="text-lg sm:text-xl">Activités Récentes</CardTitle>
                <CardDescription className="text-sm">
                  Dernières actions effectuées dans le système
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 sm:space-y-3">
                  {activities.length > 0 ? activities.map((activity, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3, delay: index * 0.1 }}
                      className="flex items-center gap-3 sm:gap-4 p-2 sm:p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                    >
                      <div className={`p-1.5 sm:p-2 rounded-full flex-shrink-0 ${
                        activity.type === 'loan' ? 'bg-green-100 dark:bg-green-800/90 text-green-600 dark:text-green-300' :
                        activity.type === 'return' ? 'bg-green-100 dark:bg-green-800/90 text-green-600 dark:text-green-300' :
                        activity.type === 'new_user' ? 'bg-yellow-100 dark:bg-yellow-800/90 text-yellow-600 dark:text-yellow-300' :
                        'bg-red-100 dark:bg-red-800/90 text-red-600 dark:text-red-300'
                      }`}>
                        {activity.type === 'loan' && <Calendar className="h-3 w-3 sm:h-4 sm:w-4" />}
                        {activity.type === 'return' && <BookOpen className="h-3 w-3 sm:h-4 sm:w-4" />}
                        {activity.type === 'new_user' && <Users className="h-3 w-3 sm:h-4 sm:w-4" />}
                        {activity.type === 'overdue' && <AlertCircle className="h-3 w-3 sm:h-4 sm:w-4" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs sm:text-sm font-medium text-gray-900 dark:text-white line-clamp-2">
                          {activity.type === 'loan' && `${activity.user} a emprunté "${activity.book}"`}
                          {activity.type === 'return' && `${activity.user} a rendu "${activity.book}"`}
                          {activity.type === 'new_user' && `Nouvel utilisateur: ${activity.user}`}
                          {activity.type === 'overdue' && `Retard: "${activity.book}" par ${activity.user}`}
                        </p>
                        <p className="text-xs text-gray-700 dark:text-gray-200 truncate">
                          {activity.time}
                        </p>
                      </div>
                    </motion.div>
                  )) : (
                    <div className="text-center py-6 sm:py-8 text-gray-500 text-sm">
                      Aucune activité récente
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
    </ProtectedLayout>
  );
}
