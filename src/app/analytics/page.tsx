"use client";

import { useState, useEffect, useCallback } from "react";
import { motion } from 'framer-motion';
import {
  BarChart3,
  BookOpen,
  Calendar,
  Clock,
  Download,
  Target,
  TrendingUp,
  Users,
  Award,
  Zap,
  AlertTriangle,
  Activity,
  Plus,
  Star,
  GraduationCap,
  FileText
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import ProtectedLayout from "@/components/layout/protected-layout";
import { useToast } from "@/hooks/use-toast";
import { useReliableRefresh } from "@/hooks";
import { useRefresh } from "@/contexts/refresh-context";

import { UnifiedStatCard } from "@/components/ui/instant-components";

interface AnalyticsData {
  // Statistiques de base étendues
  total_books: number;
  total_users: number;
  active_loans: number;
  overdue_loans: number;
  total_theses: number;
  total_memoires: number;
  total_stage_reports: number;
  active_reservations: number;
  monthly_active_users: number;
  avg_loan_duration: number;
  loans_with_fines: number;
  total_fines_amount: number;

  // Données mensuelles enrichies
  monthly_loans: Array<{
    month: string;
    loans: number;
    returns: number;
    overdue: number;
    avg_duration: number;
    unique_users: number;
    unique_books: number;
  }>;

  // Données mensuelles d'ajouts de collections
  monthly_additions: Array<{
    month: string;
    books: number;
    academic: number;
    total: number;
  }>;

  // Statistiques par type de document
  document_type_stats: Array<{
    type: string;
    total_count: number;
    available_count: number;
    borrowed_count: number;
    availability_rate: number;
  }>;

  // Top domaines
  top_domains: Array<{
    domain: string;
    loans_count: number;
    books_count: number;
    avg_loans_per_book: number;
  }>;

  // Statistiques utilisateurs par statut
  user_status_stats: Array<{
    status: string;
    user_count: number;
    active_count: number;
    avg_loans_per_user: number;
  }>;

  // Analyse des amendes
  fines_analysis: {
    total_overdue_loans: number;
    avg_fine_amount: number;
    total_fines: number;
    avg_days_overdue: number;
    loans_with_fines: number;
  };

  // Livres populaires enrichis
  popular_books: Array<{
    id: number;
    title: string;
    author: string;
    loans_count: number;
    category: string;
    availability_status: string;
    popularity_score: number;
  }>;

  // Livres les plus réservés
  popular_reserved_books: Array<{
    id: number;
    title: string;
    author: string;
    reservations_count: number;
    category: string;
    availability_status: string;
  }>;

  // Documents académiques les plus empruntés
  popular_academic_documents: Array<{
    id: number;
    title: string;
    author: string;
    loans_count: number;
    document_type: 'these' | 'memoire' | 'rapport_stage';
    specialty: string;
  }>;

  // Documents académiques les plus réservés
  popular_reserved_academic_documents: Array<{
    id: number;
    title: string;
    author: string;
    reservations_count: number;
    document_type: 'these' | 'memoire' | 'rapport_stage';
    specialty: string;
  }>;

  // Utilisateurs actifs enrichis
  active_users: Array<{
    id: number;
    name: string;
    email: string;
    status: string;
    loans_count: number;
    returned_count: number;
    overdue_count: number;
    total_fines: number;
  }>;

  // Statistiques par catégorie enrichies
  category_stats: Array<{
    category: string;
    books_count: number;
    loans_count: number;
    percentage: number;
    unique_borrowers: number;
    avg_loan_duration: number;
  }>;

  // Tendances
  trends: {
    loans_growth: number;
    users_growth: number;
    books_growth: number;
    return_rate: number;
  };
}

export default function AnalyticsPage() {
  const [selectedPeriod, setSelectedPeriod] = useState('6months');
  const [selectedMonth, setSelectedMonth] = useState<string>('');
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const { toast } = useToast();
  const { subscribe } = useRefresh();

  // Fonction pour charger les données d'analyticsData depuis l'API
  const fetchAnalytics = useCallback(async () => {
    try {
      setLoading(true);
      const url = `/api/analytics?period=${selectedPeriod}${selectedMonth ? `&month=${selectedMonth}` : ''}`;
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error('Erreur lors du chargement des statistiques');
      }

      const data = await response.json();
      setAnalyticsData(data.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue');
      toast({
        title: "Erreur",
        description: "Impossible de charger les statistiques",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [selectedPeriod, selectedMonth, toast]);

  // Système de rafraîchissement avec debouncing pour éviter trop de requêtes
  const { debouncedRefresh } = useReliableRefresh({
    onRefresh: fetchAnalytics,
    fallbackDelay: 2000
  });

  // Fonction d'export des données analytics
  const handleExport = useCallback(async () => {
    if (!analyticsData) {
      toast({
        title: "Erreur",
        description: "Aucune donnée à exporter",
        variant: "destructive",
      });
      return;
    }

    setExporting(true);
    try {
      // Préparer les données d'export
      const exportData = {
        metadata: {
          exportDate: new Date().toISOString(),
          period: selectedPeriod,
          month: selectedMonth || 'Tous les mois',
          source: 'SIGB UdM - Analytics'
        },
        statistics: {
          total_books: analyticsData.total_books,
          total_users: analyticsData.total_users,
          active_loans: analyticsData.active_loans,
          overdue_loans: analyticsData.overdue_loans,
          total_theses: analyticsData.total_theses,
          total_memoires: analyticsData.total_memoires,
          total_stage_reports: analyticsData.total_stage_reports,
          active_reservations: analyticsData.active_reservations,
          monthly_active_users: analyticsData.monthly_active_users,
          avg_loan_duration: analyticsData.avg_loan_duration,
          loans_with_fines: analyticsData.loans_with_fines,
          total_fines_amount: analyticsData.total_fines_amount
        },
        monthly_data: analyticsData.monthly_loans,
        popular_books: analyticsData.popular_books,
        popular_reserved_books: analyticsData.popular_reserved_books,
        popular_academic_documents: analyticsData.popular_academic_documents,
        popular_reserved_academic_documents: analyticsData.popular_reserved_academic_documents,
        active_users: analyticsData.active_users,
        category_stats: analyticsData.category_stats,
        trends: analyticsData.trends
      };

      // Créer et télécharger le fichier JSON
      const blob = new Blob([JSON.stringify(exportData, null, 2)], {
        type: 'application/json'
      });

      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `analytics_export_${selectedPeriod}_${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast({
        title: "Export réussi",
        description: "Les données analytics ont été exportées avec succès",
      });
    } catch (error) {
      console.error('Erreur lors de l\'export:', error);
      toast({
        title: "Erreur d'export",
        description: "Impossible d'exporter les données",
        variant: "destructive",
      });
    } finally {
      setExporting(false);
    }
  }, [analyticsData, selectedPeriod, selectedMonth, toast]);

  // Charger les analyticsData au montage et s'abonner aux changements
  useEffect(() => {
    fetchAnalytics();

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
  }, [fetchAnalytics, subscribe, debouncedRefresh]);

  if (loading) {
    return (
      <ProtectedLayout>
        <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-gray-50 dark:from-gray-900 dark:via-gray-800 dark:to-green-900 flex items-center justify-center">
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
              <BarChart3 className="h-16 w-16 text-green-600 mx-auto" />
            </motion.div>
            <motion.h2
              className="text-2xl font-bold bg-gradient-to-r from-slate-800 to-green-600 dark:from-slate-200 dark:to-green-400 bg-clip-text text-transparent mb-2"
              animate={{ opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              Analyse en cours...
            </motion.h2>
            <p className="text-gray-600 dark:text-gray-300">Chargement des statistiques avancées</p>
          </motion.div>
        </div>
      </ProtectedLayout>
    );
  }

  if (error || !analyticsData) {
    return (
      <ProtectedLayout>
        <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-gray-50 dark:from-gray-900 dark:via-gray-800 dark:to-green-900 flex items-center justify-center">
          <motion.div
            className="text-center"
            initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5 }}
          >
            <motion.div
              animate={{ scale: [1, 1.1, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="mb-6"
            >
              <Activity className="h-16 w-16 text-red-500 mx-auto" />
            </motion.div>
            <h2 className="text-2xl font-bold text-red-600 dark:text-red-400 mb-4">
              {error || 'Erreur de chargement'}
            </h2>
            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Button
                variant="outline"
                className="border-red-300 text-red-600 hover:bg-red-50"
                onClick={() => window.location.reload()}
              >
                <Target className="h-4 w-4 mr-2" />
                Réessayer
              </Button>
            </motion.div>
          </motion.div>
        </div>
      </ProtectedLayout>
    );
  }

  return (
    <ProtectedLayout>
      <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-gray-50 dark:from-gray-900 dark:via-gray-800 dark:to-green-900 relative overflow-hidden">
        {/* Header professionnel */}
        <motion.div
          className="glass-nav shadow-lg border-b border-white/20 dark:border-gray-700/20 relative overflow-hidden bg-white/95 dark:bg-gray-900/95 backdrop-blur-md"
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.6 }}
        >
          {/* Effet glassmorphism background */}
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
                  <BarChart3 className="h-8 w-8 sm:h-10 sm:w-10 lg:h-12 lg:w-12 text-green-600 drop-shadow-lg" />
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
                    className="absolute -inset-1 sm:-inset-2"
                  >
                    <TrendingUp className="h-3 w-3 sm:h-4 sm:w-4 text-green-500 absolute top-0 right-0" />
                    <Target className="h-2 w-2 sm:h-3 sm:w-3 text-gray-500 absolute bottom-0 left-0" />
                  </motion.div>
                </motion.div>

                <div className="min-w-0 flex-1">
                  <motion.h1
                    className="text-2xl sm:text-3xl lg:text-4xl xl:text-5xl font-bold bg-gradient-to-r from-slate-800 via-green-600 to-slate-800 dark:from-slate-200 dark:via-green-400 dark:to-slate-200 bg-clip-text text-transparent"
                    initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
                    transition={{ duration: 0.8, delay: 0.4 }}
                  >
                    Analytics Avancées
                  </motion.h1>
                  <motion.div
                    className="text-sm sm:text-base lg:text-lg text-gray-600 dark:text-gray-300 mt-1 sm:mt-2 font-medium"
                    initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
                    transition={{ duration: 0.8, delay: 0.6 }}
                  >
                    Analysez les performances de votre bibliothèque
                    <motion.span
                      animate={{ scale: [1, 1.1, 1] }}
                      transition={{ duration: 3, repeat: Infinity }}
                      className="inline-block ml-2 sm:ml-3"
                    >
                      <Zap className="h-4 w-4 sm:h-5 sm:w-5 text-yellow-500 inline" />
                    </motion.span>
                  </motion.div>
                </div>
              </motion.div>

              {/* Contrôles responsive */}
              <motion.div
                className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-4 w-full sm:w-auto"
                initial={{ opacity: 0, x: 30 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6, delay: 0.8 }}
              >
                <motion.div
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="w-full sm:w-auto"
                >
                  <select
                    value={selectedPeriod}
                    onChange={(e) => {
                      setSelectedPeriod(e.target.value);
                      setSelectedMonth(''); // Reset month selection when changing period
                    }}
                    className="w-full sm:w-auto h-12 px-4 rounded-xl border-2 border-slate-300 dark:border-gray-600 bg-white dark:bg-gray-800 backdrop-blur-sm text-sm font-medium text-gray-900 dark:text-gray-100 ring-offset-white focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 hover:border-green-400 dark:hover:border-green-500 transition-colors"
                  >
                    <option value="1month" className="text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800">1 mois</option>
                    <option value="3months" className="text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800">3 mois</option>
                    <option value="6months" className="text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800">6 mois</option>
                    <option value="1year" className="text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800">1 an</option>
                  </select>
                </motion.div>

                {/* Sélecteur de mois spécifique */}
                <motion.div
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="w-full sm:w-auto flex items-center gap-2"
                >
                  <select
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(e.target.value)}
                    className="w-full sm:w-auto h-12 px-4 rounded-xl border-2 border-slate-300 dark:border-gray-600 bg-white dark:bg-gray-800 backdrop-blur-sm text-sm font-medium text-gray-900 dark:text-gray-100 ring-offset-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 hover:border-blue-400 dark:hover:border-blue-500 transition-colors"
                  >
                    <option value="">Tous les mois</option>
                    {Array.from({ length: 12 }, (_, i) => {
                      const date = new Date();
                      date.setMonth(date.getMonth() - i);
                      const monthKey = date.toISOString().slice(0, 7);
                      const monthLabel = date.toLocaleDateString('fr-FR', { 
                        year: 'numeric', 
                        month: 'long' 
                      });
                      return (
                        <option key={monthKey} value={monthKey} className="text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800">
                          {monthLabel}
                        </option>
                      );
                    })}
                  </select>
                  {selectedMonth && (
                    <motion.button
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={() => setSelectedMonth('')}
                      className="h-8 w-8 rounded-full bg-red-100 dark:bg-red-900 text-red-600 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-800 transition-colors flex items-center justify-center text-sm font-bold"
                    >
                      ✕
                    </motion.button>
                  )}
                </motion.div>

                <motion.div
                  whileHover={{
                    scale: 1.02,
                    boxShadow: "0 10px 30px rgba(34, 197, 94, 0.3)"
                  }}
                  whileTap={{ scale: 0.98 }}
                  className="w-full sm:w-auto"
                >
                  <Button
                    variant="outline"
                    size="lg"
                    onClick={handleExport}
                    disabled={exporting || !analyticsData}
                    className="w-full sm:w-auto bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 hover:bg-gray-200 dark:hover:bg-gray-600 hover:border-green-400 dark:hover:border-green-500 font-medium text-gray-900 dark:text-gray-100 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Download className={`h-5 w-5 mr-2 ${exporting ? 'animate-bounce' : ''}`} />
                    {exporting ? 'Export en cours...' : 'Exporter'}
                  </Button>
                </motion.div>

                {/* Bouton de rafraîchissement intelligent */}
                <motion.div
                  whileHover={{
                    scale: 1.02,
                    boxShadow: "0 10px 30px rgba(16, 185, 129, 0.3)"
                  }}
                  whileTap={{ scale: 0.98 }}
                  className="w-full sm:w-auto"
                >
                  <Button
                    onClick={fetchAnalytics}
                    variant="outline"
                    size="lg"
                    className="w-full sm:w-auto bg-green-100 dark:bg-green-700 border border-green-300 dark:border-green-600 hover:bg-green-200 dark:hover:bg-green-600 hover:border-green-400 dark:hover:border-green-500 transition-all duration-200 font-medium text-green-700 dark:text-green-200"
                  >
                    Actualiser
                  </Button>
                </motion.div>
              </motion.div>
            </div>
          </div>
        </motion.div>

        <div className="container mx-auto px-4 py-8">




          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8 mb-8">
            {/* Graphique des emprunts mensuels */}
            <motion.div
              initial={{ x: -20, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.5 }}
            >
              <Card>
                <CardHeader>
                  <CardTitle>Évolution des Emprunts</CardTitle>
                  <CardDescription>
                    Emprunts et retours par mois
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {analyticsData.monthly_loans && analyticsData.monthly_loans.length > 0 ? (
                      analyticsData.monthly_loans.map((data) => (
                        <div key={data.month} className="flex items-center space-x-4">
                          <div className="w-12 text-sm font-medium">{data.month}</div>
                          <div className="flex-1 space-y-1">
                            <div className="flex items-center justify-between text-sm">
                              <span>Emprunts: {data.loans}</span>
                              <span>Retours: {data.returns}</span>
                            </div>
                            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                              <div
                                className="bg-green-600 h-2 rounded-full"
                                style={{ width: `${Math.max((data.loans / Math.max(...analyticsData.monthly_loans.map(m => m.loans))) * 100, 5)}%` }}
                              />
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-8 text-gray-500">
                        <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p>Aucune donnée d'emprunt disponible</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Évolution des Ajouts de collections */}
            <motion.div
              initial={{ x: -20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.55 }}
            >
              <Card>
                <CardHeader>
                  <CardTitle>Évolution des Ajouts de Collections</CardTitle>
                  <CardDescription>
                    Nouveaux documents ajoutés par mois (livres, mémoires, thèses, rapports)
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {analyticsData.monthly_additions && analyticsData.monthly_additions.length > 0 ? (
                      analyticsData.monthly_additions.map((data) => (
                        <div key={data.month} className="flex items-center space-x-4">
                          <div className="w-12 text-sm font-medium">{data.month}</div>
                          <div className="flex-1 space-y-1">
                            <div className="flex items-center justify-between text-sm">
                              <span>Livres: {data.books}</span>
                              <span>Académiques: {data.academic}</span>
                            </div>
                            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                              <div
                                className="bg-blue-600 h-2 rounded-full"
                                style={{ width: `${Math.max((data.total / Math.max(...analyticsData.monthly_additions.map(m => m.total))) * 100, 5)}%` }}
                              />
                            </div>
                            <div className="text-xs text-gray-500">
                              Total: {data.total} documents
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-8 text-gray-500">
                        <Plus className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p>Aucune donnée d'ajout disponible</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Répartition par catégorie */}
            <motion.div
              initial={{ x: 20, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.6 }}
            >
              <Card>
                <CardHeader>
                  <CardTitle>Répartition par Catégorie</CardTitle>
                  <CardDescription>
                    Emprunts par domaine de connaissance
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {analyticsData.category_stats && analyticsData.category_stats.length > 0 ? (
                      analyticsData.category_stats.map((category) => (
                        <div key={category.category} className="space-y-2">
                          <div className="flex items-center justify-between text-sm">
                            <span className="font-medium">{category.category}</span>
                            <span>{category.loans_count} emprunts</span>
                          </div>
                          <div className="flex flex-col sm:flex-row gap-2 sm:gap-4">
                          </div>
                          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                            <div
                              className="bg-gradient-to-r from-green-500 to-green-600 h-2 rounded-full"
                              style={{ width: `${category.percentage}%` }}
                            />
                          </div>
                          <div className="text-xs text-gray-500">
                            {category.books_count} livres • {category.percentage}% des emprunts
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-8 text-gray-500">
                        <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p>Aucune donnée de catégorie disponible</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8 mb-8">
            {/* Top livres */}
            <motion.div
              initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.7 }}
            >
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Award className="h-5 w-5 text-yellow-500" />
                    <span>Livres les Plus Empruntés</span>
                  </CardTitle>
                  <CardDescription>
                    Top 5 des livres populaires
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {analyticsData.popular_books && analyticsData.popular_books.length > 0 ? (
                      analyticsData.popular_books.map((book, index) => (
                        <div key={book.id} className="flex items-center space-x-3 sm:space-x-4">
                          <div className="flex-shrink-0 w-7 h-7 sm:w-8 sm:h-8 bg-gradient-to-br from-green-400 to-green-600 rounded-full flex items-center justify-center text-white font-bold text-xs sm:text-sm">
                            {index + 1}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-gray-900 dark:text-white truncate text-sm sm:text-base">
                              {book.title}
                            </p>
                            <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-300 truncate">
                              {book.author} • {book.category}
                            </p>
                          </div>
                          <div className="text-right flex-shrink-0">
                            <p className="text-base sm:text-lg font-bold text-green-600">{book.loans_count}</p>
                            <p className="text-xs text-gray-500">emprunts</p>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-8 text-gray-500">
                        <Award className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p>Aucun livre populaire disponible</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Livres les Plus Réservés */}
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.75 }}
            >
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Star className="h-5 w-5 text-orange-500" />
                    <span>Livres les Plus Réservés</span>
                  </CardTitle>
                  <CardDescription>
                    Top 5 des livres en demande
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {analyticsData.popular_reserved_books && analyticsData.popular_reserved_books.length > 0 ? (
                      analyticsData.popular_reserved_books.map((book, index) => (
                        <div key={book.id} className="flex items-center space-x-3 sm:space-x-4">
                          <div className="flex-shrink-0 w-7 h-7 sm:w-8 sm:h-8 bg-gradient-to-br from-orange-400 to-orange-600 rounded-full flex items-center justify-center text-white font-bold text-xs sm:text-sm">
                            {index + 1}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-gray-900 dark:text-white truncate text-sm sm:text-base">
                              {book.title}
                            </p>
                            <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-300 truncate">
                              {book.author} • {book.category}
                            </p>
                          </div>
                          <div className="text-right flex-shrink-0">
                            <p className="text-base sm:text-lg font-bold text-orange-600">{book.reservations_count}</p>
                            <p className="text-xs text-gray-500">réservations</p>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-8 text-gray-500">
                        <Star className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p>Aucun livre réservé disponible</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8 mb-8">
            {/* Documents Académiques les Plus Empruntés */}
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.8 }}
            >
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <GraduationCap className="h-5 w-5 text-blue-500" />
                    <span>Documents Académiques les Plus Empruntés</span>
                  </CardTitle>
                  <CardDescription>
                    Top 5 des thèses, mémoires et rapports populaires
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {analyticsData.popular_academic_documents && analyticsData.popular_academic_documents.length > 0 ? (
                      analyticsData.popular_academic_documents.map((doc, index) => (
                        <div key={doc.id} className="flex items-center space-x-3 sm:space-x-4">
                          <div className="flex-shrink-0 w-7 h-7 sm:w-8 sm:h-8 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center text-white font-bold text-xs sm:text-sm">
                            {index + 1}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-gray-900 dark:text-white truncate text-sm sm:text-base">
                              {doc.title}
                            </p>
                            <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-300 truncate">
                              {doc.author} • {doc.document_type === 'these' ? 'Thèse' : doc.document_type === 'memoire' ? 'Mémoire' : 'Rapport'}
                            </p>
                          </div>
                          <div className="text-right flex-shrink-0">
                            <p className="text-base sm:text-lg font-bold text-blue-600">{doc.loans_count}</p>
                            <p className="text-xs text-gray-500">emprunts</p>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-8 text-gray-500">
                        <GraduationCap className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p>Aucun document académique emprunté disponible</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Documents Académiques les Plus Réservés */}
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.85 }}
            >
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <FileText className="h-5 w-5 text-purple-500" />
                    <span>Documents Académiques les Plus Réservés</span>
                  </CardTitle>
                  <CardDescription>
                    Top 5 des thèses, mémoires et rapports en demande
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {analyticsData.popular_reserved_academic_documents && analyticsData.popular_reserved_academic_documents.length > 0 ? (
                      analyticsData.popular_reserved_academic_documents.map((doc, index) => (
                        <div key={doc.id} className="flex items-center space-x-3 sm:space-x-4">
                          <div className="flex-shrink-0 w-7 h-7 sm:w-8 sm:h-8 bg-gradient-to-br from-purple-400 to-purple-600 rounded-full flex items-center justify-center text-white font-bold text-xs sm:text-sm">
                            {index + 1}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-gray-900 dark:text-white truncate text-sm sm:text-base">
                              {doc.title}
                            </p>
                            <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-300 truncate">
                              {doc.author} • {doc.document_type === 'these' ? 'Thèse' : doc.document_type === 'memoire' ? 'Mémoire' : 'Rapport'}
                            </p>
                          </div>
                          <div className="text-right flex-shrink-0">
                            <p className="text-base sm:text-lg font-bold text-purple-600">{doc.reservations_count}</p>
                            <p className="text-xs text-gray-500">réservations</p>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-8 text-gray-500">
                        <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p>Aucun document académique réservé disponible</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">

            {/* Top utilisateurs */}
            <motion.div
              initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.8 }}
            >
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Users className="h-5 w-5 text-green-500" />
                    <span>Utilisateurs les Plus Actifs</span>
                  </CardTitle>
                  <CardDescription>
                    Top 5 des lecteurs assidus
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {analyticsData.active_users && analyticsData.active_users.length > 0 ? (
                      analyticsData.active_users.map((user, index) => (
                        <div key={user.id} className="flex items-center space-x-3 sm:space-x-4">
                          <div className="flex-shrink-0 w-7 h-7 sm:w-8 sm:h-8 bg-gradient-to-br from-green-400 to-green-600 rounded-full flex items-center justify-center text-white font-bold text-xs sm:text-sm">
                            {index + 1}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-gray-900 dark:text-white text-sm sm:text-base truncate">
                              {user.name}
                            </p>
                            <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-300 truncate">
                              {user.email}
                            </p>
                          </div>
                          <div className="text-right flex-shrink-0">
                            <p className="text-base sm:text-lg font-bold text-green-600">{user.loans_count}</p>
                            <p className="text-xs text-gray-500">emprunts</p>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-8 text-gray-500">
                        <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p>Aucun utilisateur actif disponible</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </div>
      </div>
    </ProtectedLayout>
  );
}
