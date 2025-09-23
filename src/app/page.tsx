"use client";

import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { BookOpen, Users, FileText, BarChart3, ArrowRight, Library, Sparkles, Star, Zap, Heart, Award, TrendingUp, GraduationCap, Briefcase, Archive, Calendar } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";

import { SimpleThemeToggle } from "@/components/ui/theme-toggle";
import { useRefresh } from "@/contexts/refresh-context";
import { useDebouncedRefresh } from "@/hooks";
import { useAutoRefreshOnReturn } from "@/hooks/useAutoRefreshOnReturn";
import { UnifiedStatCard } from "@/components/ui/instant-components";




interface HomeStats {
  total_books: number;
  total_users: number;
  active_loans: number;
  active_reservations: number; // NOUVEAU: Réservations actives
  total_theses: number;
  total_memoires: number;
  total_stage_reports: number;
}

interface CatalogItem {
  id: string;
  type: 'book' | 'thesis' | 'memoire' | 'report';
  title: string;
  author: string;
  mfn?: string;
  subtitle?: string;
  main_author?: string;
  secondary_author?: string;
  publisher?: string;
  publication_year?: number;
  publication_city?: string;
  edition?: string;
  domain?: string;
  total_copies?: number;
  available_copies?: number;
  isbn?: string;
  director?: string;
  co_director?: string;
  target_degree?: string;
  supervisor?: string;
  co_supervisor?: string;
  degree_level?: string;
  field_of_study?: string;
  specialty?: string;
  student_name?: string;
  company_supervisor?: string;
  company_name?: string;
  stage_duration?: number;
  university?: string;
  faculty?: string;
  department?: string;
  defense_year?: number;
  degree_type?: string;
  language?: string;
  pages?: number;
  created_at: string;
}

const features = [
  {
    icon: BookOpen,
    title: "Gestion des Livres",
    description: "Cataloguez et gérez votre collection de livres avec des informations détaillées",
    href: "/books"
  },
  {
    icon: FileText,
    title: "Gestion des Thèses",
    description: "Organisez et archivez les thèses avec métadonnées complètes",
    href: "/theses"
  },
  {
    icon: Users,
    title: "Gestion des Usagers",
    description: "Administrez les comptes utilisateurs et leurs privilèges d'emprunt",
    href: "/users"
  },
  {
    icon: BarChart3,
    title: "Statistiques",
    description: "Analysez l'utilisation de votre bibliothèque avec des rapports détaillés",
    href: "/analytics"
  }
];

export default function HomePage() {
  // 🎯 NOUVEAU : Hook pour rafraîchissement automatique après retour
  useAutoRefreshOnReturn();

  const [stats, setStats] = useState<HomeStats | null>(null);
  const [catalogPreview, setCatalogPreview] = useState<CatalogItem[]>([]);
  const [booksPreview, setBooksPreview] = useState<CatalogItem[]>([]);
  const [thesesPreview, setThesesPreview] = useState<CatalogItem[]>([]);
  const [memoiresPreview, setMemoiresPreview] = useState<CatalogItem[]>([]);
  const [reportsPreview, setReportsPreview] = useState<CatalogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const { toast } = useToast();
  const { subscribe } = useRefresh();

  // Fonction pour charger les statistiques depuis l'API
  const fetchStats = useCallback(async () => {
    try {
      const response = await fetch('/api/stats/overview');
      if (response.ok) {
        const data = await response.json();
        // L'API retourne maintenant les stats directement dans data
        setStats(data.data || null);
      }
    } catch (error) {
      console.error('Erreur lors du chargement des statistiques:', error);
    }
  }, []);

  // Fonction pour charger les aperçus par catégorie
  const fetchPreviews = useCallback(async () => {
    try {
      setPreviewLoading(true);

      // Charger les livres
      const booksResponse = await fetch('/api/public/catalog?type=books&limit=4');
      if (booksResponse.ok) {
        const booksData = await booksResponse.json();
        setBooksPreview(booksData.data || []);
      }

      // Charger les thèses
      const thesesResponse = await fetch('/api/public/catalog?type=theses&limit=4');
      if (thesesResponse.ok) {
        const thesesData = await thesesResponse.json();
        setThesesPreview(thesesData.data || []);
      }

      // Charger les mémoires
      const memoiresResponse = await fetch('/api/public/catalog?type=memoires&limit=4');
      if (memoiresResponse.ok) {
        const memoiresData = await memoiresResponse.json();
        setMemoiresPreview(memoiresData.data || []);
      }

      // Charger les rapports de stage
      const reportsResponse = await fetch('/api/public/catalog?type=reports&limit=4');
      if (reportsResponse.ok) {
        const reportsData = await reportsResponse.json();
        setReportsPreview(reportsData.data || []);
      }
    } catch (error) {
      console.error('Erreur lors du chargement des aperçus:', error);
    } finally {
      setPreviewLoading(false);
    }
  }, []);

  // Système de rafraîchissement avec debouncing pour éviter trop de requêtes
  const { debouncedRefresh: debouncedRefreshStats } = useDebouncedRefresh(2000);
  const { debouncedRefresh: debouncedRefreshPreviews } = useDebouncedRefresh(2000);

  // Charger les données au montage du composant
  useEffect(() => {
    fetchStats();
    fetchPreviews();
  }, [fetchStats, fetchPreviews]);

  // Créer les statistiques d'affichage à partir des données API
  const displayStats = stats ? [
    {
      label: "Livres",
      value: `${stats?.total_books?.toLocaleString() || '0'}`,
      icon: BookOpen,
      gradient: "from-blue-600 to-blue-700",
      color: "blue"
    },
    {
      label: "Thèses",
      value: `${stats?.total_theses?.toLocaleString() || '0'}`,
      icon: GraduationCap,
      gradient: "from-gray-500 to-gray-600",
      color: "gray"
    },
    {
      label: "Mémoires",
      value: `${stats?.total_memoires?.toLocaleString() || '0'}`,
      icon: FileText,
      gradient: "from-green-500 to-green-600",
      color: "green"
    },
    {
      label: "Rapports de Stage",
      value: `${stats?.total_stage_reports?.toLocaleString() || '0'}`,
      icon: Briefcase,
      gradient: "from-gray-600 to-gray-700",
      color: "orange"
    },
    {
      label: "Utilisateurs actifs",
      value: `${stats?.total_users?.toLocaleString() || '0'}`,
      icon: Users,
      gradient: "from-green-600 to-green-700",
      color: "teal"
    },
    {
      label: "Emprunts actifs",
      value: `${stats?.active_loans?.toLocaleString() || '0'}`,
      icon: BarChart3,
      gradient: "from-yellow-500 to-yellow-600",
      color: "yellow"
    },
    {
      label: "Réservations actives",
      value: `${stats?.active_reservations?.toLocaleString() || '0'}`,
      icon: Calendar,
      gradient: "from-purple-500 to-purple-600",
      color: "purple"
    }
  ] : [
    { label: "Livres", value: "...", icon: BookOpen, gradient: "from-blue-600 to-blue-700", color: "blue" },
    { label: "Thèses", value: "...", icon: GraduationCap, gradient: "from-gray-500 to-gray-600", color: "gray" },
    { label: "Mémoires", value: "...", icon: FileText, gradient: "from-green-500 to-green-600", color: "green" },
    { label: "Rapports de Stage", value: "...", icon: Briefcase, gradient: "from-gray-600 to-gray-700", color: "orange" },
    { label: "Utilisateurs actifs", value: "...", icon: Users, gradient: "from-green-600 to-green-700", color: "teal" },
    { label: "Emprunts actifs", value: "...", icon: BarChart3, gradient: "from-yellow-500 to-yellow-600", color: "yellow" }
  ];
  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-gray-50 dark:from-gray-900 dark:via-gray-800 dark:to-green-900 relative overflow-hidden">
      {/* Bouton de toggle du thème en position fixe */}
      <motion.div
        className="fixed top-4 right-4 z-50"
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, delay: 0.5 }}
      >
        <SimpleThemeToggle />
      </motion.div>

      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden">
        <motion.div
          animate={{
            rotate: 360,
            scale: [1, 1.1, 1],
          }}
          transition={{
            duration: 20,
            repeat: Infinity,
            ease: "linear"
          }}
          className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-green-400/20 to-gray-400/20 rounded-full blur-3xl"
        />
        <motion.div
          animate={{
            rotate: -360,
            scale: [1, 1.2, 1],
          }}
          transition={{
            duration: 25,
            repeat: Infinity,
            ease: "linear"
          }}
          className="absolute -bottom-40 -left-40 w-96 h-96 bg-gradient-to-br from-gray-400/20 to-green-400/20 rounded-full blur-3xl"
        />
      </div>

      {/* Floating Particles */}
      <div className="absolute inset-0">
        {[...Array(15)].map((_, i) => {
          // Positions déterministes basées sur l'index
          const positions = [
            { left: 10, top: 20 }, { left: 85, top: 15 }, { left: 25, top: 80 },
            { left: 70, top: 60 }, { left: 45, top: 30 }, { left: 90, top: 75 },
            { left: 15, top: 90 }, { left: 60, top: 10 }, { left: 35, top: 65 },
            { left: 80, top: 40 }, { left: 5, top: 55 }, { left: 95, top: 25 },
            { left: 50, top: 85 }, { left: 75, top: 5 }, { left: 30, top: 70 }
          ];
          const position = positions[i] || { left: 50, top: 50 };

          return (
            <motion.div
              key={i}
              className="absolute w-2 h-2 bg-blue-400/30 rounded-full"
              animate={{
                y: [-20, -100],
                opacity: [0, 1, 0],
              }}
              transition={{
                duration: 3 + (i % 3),
                repeat: Infinity,
                delay: i * 0.3,
              }}
              style={{
                left: `${position.left}%`,
                top: `${position.top}%`,
              }}
            />
          );
        })}
      </div>

      {/* Hero Section */}
      <section className="relative overflow-hidden py-20 px-4">
        <div className="relative max-w-7xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, ease: "easeOut" }}
            className="space-y-8"
          >
            {/* Logo de l'Université des Montagnes et icône centrale */}
            <motion.div
              className="flex items-center justify-center space-x-8 mb-8"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{
                type: "spring",
                stiffness: 260,
                damping: 20,
                delay: 0.2
              }}
            >
              {/* Logo de l'Université des Montagnes */}
              <motion.div
                initial={{ opacity: 0, x: -50 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.8, delay: 0.5 }}
                className="relative"
              >
                <motion.img
                  src="/images/logo-udm.png"
                  alt="Logo Université des Montagnes"
                  className="h-24 w-24 md:h-32 md:w-32 object-contain drop-shadow-2xl"
                  animate={{
                    scale: [1, 1.05, 1],
                  }}
                  transition={{
                    duration: 3,
                    repeat: Infinity,
                    ease: "easeInOut"
                  }}
                />
                {/* Effet de brillance sur le logo - Charte UdM */}
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
                  className="absolute -inset-2"
                >
                  <div className="h-2 w-2 bg-gradient-to-r from-green-500 to-green-600 rounded-full absolute top-0 right-0 opacity-80"></div>
                  <div className="h-1.5 w-1.5 bg-gradient-to-r from-gray-400 to-gray-500 rounded-full absolute bottom-0 left-0 opacity-70"></div>
                </motion.div>
              </motion.div>

              {/* Icône centrale de bibliothèque */}
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
                className="relative"
              >
                <Library className="h-20 w-20 text-green-600 drop-shadow-lg" />
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
                  className="absolute -inset-3"
                >
                  <Sparkles className="h-6 w-6 text-green-500 absolute top-0 right-0" />
                  <Star className="h-4 w-4 text-gray-500 absolute bottom-0 left-0" />
                  <Zap className="h-5 w-5 text-green-600 absolute top-0 left-0" />
                  <Heart className="h-4 w-4 text-gray-400 absolute bottom-0 right-0" />
                </motion.div>
              </motion.div>
            </motion.div>

            {/* Titre avec effet spectaculaire */}
            <motion.h1
              className="text-5xl md:text-8xl font-bold bg-gradient-to-r from-slate-800 via-green-600 to-slate-800 dark:from-white dark:via-green-300 dark:to-white bg-clip-text text-transparent leading-tight pb-4"
              initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
              transition={{ duration: 1, delay: 0.5 }}
            >
              <motion.span
                initial={{ opacity: 0, x: -100 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.8, delay: 0.7 }}
                className="block"
              >
                Système de Gestion
              </motion.span>
              <motion.span
                initial={{ opacity: 0, x: 100 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.8, delay: 1 }}
                className="block bg-gradient-to-r from-gray-600 via-gray-500 to-gray-700 dark:from-gray-400 dark:via-gray-300 dark:to-gray-500 bg-clip-text text-transparent"
              >
               de Bibliothèque
              </motion.span>
              <motion.span
                initial={{ opacity: 0, y: 50 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 1.3 }}
                className="block text-3xl md:text-5xl mt-6 pb-2 bg-gradient-to-r from-green-600 via-green-500 to-green-700 dark:from-green-400 dark:via-green-400 dark:to-green-500 bg-clip-text text-transparent leading-tight"
              >
                de l'Université des Montagnes
              </motion.span>
            </motion.h1>

            {/* Sous-titre avec animation */}
            <motion.div
              className="text-xl md:text-2xl text-gray-700 dark:text-gray-100 max-w-4xl mx-auto leading-relaxed font-medium"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 1.2 }}
            >
              Plateforme moderne de gestion documentaire pour l'excellence académique de l'UdM
              <motion.span
                animate={{
                  scale: [1, 1.1, 1],
                }}
                transition={{ duration: 3, repeat: Infinity }}
                className="inline-block ml-3"
              >
                <Award className="h-6 w-6 text-amber-500 inline" />
              </motion.span>
            </motion.div>

            {/* Boutons avec animations sophistiquées */}
            <motion.div
              className="flex flex-col lg:flex-row gap-4 lg:gap-6 justify-center items-center"
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 1.5 }}
            >
              <motion.div
                whileHover={{
                  scale: 1.02,
                  boxShadow: "0 20px 40px rgba(34, 197, 94, 0.3)"
                }}
                whileTap={{ scale: 0.98 }}
                transition={{ type: "spring", stiffness: 400, damping: 17 }}
              >
                <Button asChild size="lg" className="bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 dark:from-green-500 dark:to-green-600 dark:hover:from-green-600 dark:hover:to-green-700 text-white font-semibold px-4 sm:px-6 lg:px-8 py-3 lg:py-4 rounded-xl shadow-lg text-sm sm:text-base border border-green-500 dark:border-green-400 transition-all duration-200 w-full lg:w-auto">
                  <Link href="/dashboard" className="flex items-center justify-center">
                    <BarChart3 className="mr-2 lg:mr-3 h-4 lg:h-5 w-4 lg:w-5 flex-shrink-0" />
                    <motion.span
                      animate={{ x: [0, 2, 0] }}
                      transition={{ duration: 3, repeat: Infinity }}
                      className="text-center"
                    >
                      <span className="hidden sm:inline">Espace Personnel - Gestion Bibliothèque</span>
                      <span className="sm:hidden">Espace Personnel</span>
                    </motion.span>
                    <ArrowRight className="ml-2 lg:ml-3 h-4 lg:h-5 w-4 lg:w-5 flex-shrink-0" />
                  </Link>
                </Button>
              </motion.div>

              <motion.div
                whileHover={{
                  scale: 1.02,
                  borderColor: "rgb(34, 197, 94)",
                  backgroundColor: "rgba(34, 197, 94, 0.05)"
                }}
                whileTap={{ scale: 0.98 }}
                transition={{ type: "spring", stiffness: 400, damping: 17 }}
              >
                <Button
                  variant="outline"
                  size="lg"
                  className="border border-green-500 dark:border-green-400 hover:border-green-600 dark:hover:border-green-200 bg-white dark:bg-gray-800 hover:bg-green-50 dark:hover:bg-green-800/40 text-green-700 dark:text-green-300 hover:text-green-800 dark:hover:text-green-100 px-4 sm:px-6 lg:px-8 py-3 lg:py-4 rounded-xl font-semibold text-sm sm:text-base transition-all duration-200 w-full lg:w-auto"
                  onClick={() => {
                    const section = document.getElementById('collection-section');
                    if (section) {
                      section.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }
                  }}
                >
                  <BookOpen className="mr-2 lg:mr-3 h-4 lg:h-5 w-4 lg:w-5 flex-shrink-0" />
                  <span className="text-center">
                    <span className="hidden sm:inline">Catalogue Public - Consulter les Documents</span>
                    <span className="sm:hidden">Catalogue Public</span>
                  </span>
                  <Library className="ml-2 lg:ml-3 h-4 lg:h-5 w-4 lg:w-5 flex-shrink-0" />
                </Button>
              </motion.div>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Stats Section avec Glassmorphism */}
      <section className="py-20 relative">
        <div className="absolute inset-0 bg-gradient-to-r from-green-500/10 via-gray-500/10 to-green-500/10" />
        <div className="relative container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center mb-12"
          >
            <div className="flex flex-col items-center justify-center mb-4">
              <TrendingUp className="mb-3 h-12 w-12 text-green-600 dark:text-green-300" />
              <h2 className="text-4xl font-bold bg-gradient-to-r from-gray-900 to-green-700 dark:from-white dark:to-green-200 bg-clip-text text-transparent">
                Statistiques
              </h2>
            </div>
            <p className="text-lg text-gray-700 dark:text-gray-100 font-medium">
              Découvrez l&apos;impact de notre système sur votre bibliothèque
            </p>
          </motion.div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-7 gap-4 sm:gap-6">
            {displayStats.map((stat, index) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 50, scale: 0.8 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{
                  duration: 0.8,
                  delay: index * 0.2,
                  type: "spring",
                  stiffness: 100
                }}
                whileHover={{
                  scale: 1.05,
                  y: -10,
                  transition: { duration: 0.2 }
                }}
                className="relative group"
              >
                <UnifiedStatCard stat={stat} index={index} className="!rounded-3xl !p-6 sm:!p-8" />
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Section Aperçu du Catalogue */}
      <section id="collection-section" className="py-20 relative">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center mb-16"
          >
            <div className="flex flex-col items-center justify-center mb-4">
              <Library className="mb-3 h-12 w-12 text-green-600 dark:text-green-300" />
              <h2 className="text-4xl font-bold bg-gradient-to-r from-gray-900 to-green-700 dark:from-white dark:to-green-200 bg-clip-text text-transparent">
                Découvrez Notre Collection
              </h2>
            </div>
            <p className="text-lg text-gray-700 dark:text-gray-100 font-medium">
              Explorez un aperçu de nos livres, thèses, mémoires, rapports de stage et autres documents
            </p>
          </motion.div>

          {/* Colonnes par type de document */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
            {/* Colonne Livres */}
            <div className="space-y-6">
              <div className="flex items-center justify-center mb-6">
                <BookOpen className="h-6 w-6 text-blue-600 dark:text-blue-400 mr-3" />
                <h3 className="text-xl font-bold text-blue-700 dark:text-blue-300">Livres</h3>
              </div>
              <div className="space-y-4">
                {previewLoading ? (
                  [...Array(4)].map((_, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
                      transition={{ delay: i * 0.1 }}
                      className="bg-white/95 dark:bg-gray-800/95 backdrop-blur-sm rounded-2xl p-4 shadow-lg"
                    >
                      <div className="animate-pulse">
                        <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded mb-2"></div>
                        <div className="h-6 bg-gray-300 dark:bg-gray-600 rounded mb-2"></div>
                        <div className="h-3 bg-gray-300 dark:bg-gray-600 rounded"></div>
                      </div>
                    </motion.div>
                  ))
                ) : (
                  booksPreview.map((item: CatalogItem, index: number) => (
                    <motion.div
                      key={item.id}
                      initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
                      transition={{ duration: 0.5, delay: index * 0.1 }}
                      whileHover={{ y: -3, transition: { duration: 0.2 } }}
                      className="group"
                    >
                      <Card className="bg-white/95 dark:bg-gray-800/95 backdrop-blur-sm border-0 shadow-lg hover:shadow-xl transition-all duration-300 rounded-2xl overflow-hidden">
                        <CardHeader className="pb-3">
                          <div className="flex items-center justify-between mb-2">
                            <div className="px-2 py-1 rounded-full text-xs font-bold bg-blue-600 dark:bg-blue-500 text-white border border-blue-700 dark:border-blue-400 shadow-sm">
                              <BookOpen className="h-3 w-3 mr-1 inline" />
                              Livre
                            </div>
                            <Badge
                              variant={
                                item.availability_status === 'disponible' ? 'success' :
                                item.availability_status === 'indisponible' ? 'destructive' :
                                'secondary'
                              }
                              className="text-xs"
                            >
                              {item.availability_status === 'disponible' ? 'Disponible' :
                               item.availability_status === 'indisponible' ? 'Indisponible' :
                               'Statut inconnu'}
                            </Badge>

                            {/* Badges détaillés quand indisponible */}
                            {item.availability_status === 'indisponible' && (
                              <div className="flex gap-1">
                                {item.is_borrowed && (
                                  <Badge variant="warning" className="text-[10px] px-1.5 py-0.5 h-5">
                                    Emprunté
                                  </Badge>
                                )}
                                {item.is_reserved && (
                                  <Badge variant="outline" className="text-[10px] px-1.5 py-0.5 h-5 border-yellow-400 text-yellow-700 dark:text-yellow-300">
                                    Réservé
                                  </Badge>
                                )}
                              </div>
                            )}
                          </div>
                          <CardTitle className="text-sm font-bold text-gray-900 dark:text-gray-100 line-clamp-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                            {item.title}
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="pt-0">
                          <div className="space-y-1 text-xs text-gray-600 dark:text-gray-300">
                            <p className="font-medium">
                              <span className="text-gray-600 dark:text-gray-300">Auteur:</span> {item.author}
                            </p>
                            {item.secondary_author && (
                              <p>
                                <span className="text-gray-600 dark:text-gray-300">Auteur secondaire:</span> {item.secondary_author}
                              </p>
                            )}
                            {item.publisher && (
                              <p>
                                <span className="text-gray-600 dark:text-gray-300">Éditeur:</span> {item.publisher}
                              </p>
                            )}
                            {item.publication_year && (
                              <p>
                                <span className="text-gray-600 dark:text-gray-300">Année:</span> {item.publication_year}
                              </p>
                            )}
                            {item.publication_city && (
                              <p>
                                <span className="text-gray-600 dark:text-gray-300">Ville:</span> {item.publication_city}
                              </p>
                            )}
                            {item.edition && (
                              <p>
                                <span className="text-gray-600 dark:text-gray-300">Édition:</span> {item.edition}
                              </p>
                            )}
                            {item.domain && (
                              <p>
                                <span className="text-gray-600 dark:text-gray-300">Domaine:</span> {item.domain}
                              </p>
                            )}
                            {item.total_copies && (
                              <p>
                                <span className="text-gray-600 dark:text-gray-300">Exemplaires:</span> {item.available_copies}/{item.total_copies}
                              </p>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))
                )}
              </div>
            </div>

            {/* Colonne Thèses */}
            <div className="space-y-6">
              <div className="flex items-center justify-center mb-6">
                <GraduationCap className="h-6 w-6 text-pink-600 dark:text-pink-400 mr-3" />
                <h3 className="text-xl font-bold text-pink-700 dark:text-pink-300">Thèses</h3>
              </div>
              <div className="space-y-4">
                {previewLoading ? (
                  [...Array(4)].map((_, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
                      transition={{ delay: i * 0.1 }}
                      className="bg-white/95 dark:bg-gray-800/95 backdrop-blur-sm rounded-2xl p-4 shadow-lg"
                    >
                      <div className="animate-pulse">
                        <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded mb-2"></div>
                        <div className="h-6 bg-gray-300 dark:bg-gray-600 rounded mb-2"></div>
                        <div className="h-3 bg-gray-300 dark:bg-gray-600 rounded"></div>
                      </div>
                    </motion.div>
                  ))
                ) : (
                  thesesPreview.map((item: CatalogItem, index: number) => (
                    <motion.div
                      key={item.id}
                      initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
                      transition={{ duration: 0.5, delay: index * 0.1 }}
                      whileHover={{ y: -3, transition: { duration: 0.2 } }}
                      className="group"
                    >
                      <Card className="bg-white/95 dark:bg-gray-800/95 backdrop-blur-sm border-0 shadow-lg hover:shadow-xl transition-all duration-300 rounded-2xl overflow-hidden">
                        <CardHeader className="pb-3">
                          <div className="flex items-center justify-between mb-2">
                            <div className="px-2 py-1 rounded-full text-xs font-bold bg-pink-600 dark:bg-pink-500 text-white border border-pink-700 dark:border-pink-400 shadow-sm">
                              <GraduationCap className="h-3 w-3 mr-1 inline" />
                              Thèse
                            </div>
                            <Badge
                              variant={
                                item.availability_status === 'disponible' ? 'success' :
                                item.availability_status === 'indisponible' ? 'destructive' :
                                'secondary'
                              }
                              className="text-xs"
                            >
                              {item.availability_status === 'disponible' ? 'Disponible' :
                               item.availability_status === 'indisponible' ? 'Indisponible' :
                               'Statut inconnu'}
                            </Badge>

                            {/* Badges détaillés quand indisponible */}
                            {item.availability_status === 'indisponible' && (
                              <div className="flex gap-1">
                                {item.is_borrowed && (
                                  <Badge variant="warning" className="text-[10px] px-1.5 py-0.5 h-5">
                                    Emprunté
                                  </Badge>
                                )}
                                {item.is_reserved && (
                                  <Badge variant="outline" className="text-[10px] px-1.5 py-0.5 h-5 border-yellow-400 text-yellow-700 dark:text-yellow-300">
                                    Réservé
                                  </Badge>
                                )}
                              </div>
                            )}
                          </div>
                          <CardTitle className="text-sm font-bold text-gray-900 dark:text-gray-100 line-clamp-2 group-hover:text-pink-600 dark:group-hover:text-pink-400 transition-colors">
                            {item.title}
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="pt-0">
                          <div className="space-y-1 text-xs text-gray-600 dark:text-gray-300">
                            <p className="font-medium">
                              <span className="text-gray-600 dark:text-gray-300">Auteur:</span> {item.author}
                            </p>
                            {item.director && (
                              <p>
                                <span className="text-gray-600 dark:text-gray-300">Directeur:</span> {item.director}
                              </p>
                            )}
                            {item.co_director && (
                              <p>
                                <span className="text-gray-600 dark:text-gray-300">Co-directeur:</span> {item.co_director}
                              </p>
                            )}
                            {item.target_degree && (
                              <p>
                                <span className="text-gray-600 dark:text-gray-300">Diplôme:</span> {item.target_degree}
                              </p>
                            )}
                            {item.specialty && (
                              <p>
                                <span className="text-gray-600 dark:text-gray-300">Spécialité:</span> {item.specialty}
                              </p>
                            )}
                            {item.university && (
                              <p>
                                <span className="text-gray-600 dark:text-gray-300">Université:</span> {item.university}
                              </p>
                            )}
                            {item.faculty && (
                              <p>
                                <span className="text-gray-600 dark:text-gray-300">Faculté:</span> {item.faculty}
                              </p>
                            )}
                            {item.defense_year && (
                              <p>
                                <span className="text-gray-600 dark:text-gray-300">Année:</span> {item.defense_year}
                              </p>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))
                )}
              </div>
            </div>

            {/* Colonne Mémoires */}
            <div className="space-y-6">
              <div className="flex items-center justify-center mb-6">
                <FileText className="h-6 w-6 text-green-600 dark:text-green-400 mr-3" />
                <h3 className="text-xl font-bold text-green-700 dark:text-green-300">Mémoires</h3>
              </div>
              <div className="space-y-4">
                {previewLoading ? (
                  [...Array(4)].map((_, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
                      transition={{ delay: i * 0.1 }}
                      className="bg-white/95 dark:bg-gray-800/95 backdrop-blur-sm rounded-2xl p-4 shadow-lg"
                    >
                      <div className="animate-pulse">
                        <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded mb-2"></div>
                        <div className="h-6 bg-gray-300 dark:bg-gray-600 rounded mb-2"></div>
                        <div className="h-3 bg-gray-300 dark:bg-gray-600 rounded"></div>
                      </div>
                    </motion.div>
                  ))
                ) : (
                  memoiresPreview.map((item: CatalogItem, index: number) => (
                    <motion.div
                      key={item.id}
                      initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
                      transition={{ duration: 0.5, delay: index * 0.1 }}
                      whileHover={{ y: -3, transition: { duration: 0.2 } }}
                      className="group"
                    >
                      <Card className="bg-white/95 dark:bg-gray-800/95 backdrop-blur-sm border-0 shadow-lg hover:shadow-xl transition-all duration-300 rounded-2xl overflow-hidden">
                        <CardHeader className="pb-3">
                          <div className="flex items-center justify-between mb-2">
                            <div className="px-2 py-1 rounded-full text-xs font-bold bg-green-600 dark:bg-green-500 text-white border border-green-700 dark:border-green-400 shadow-sm">
                              <FileText className="h-3 w-3 mr-1 inline" />
                              Mémoire
                            </div>
                            <Badge
                              variant={
                                item.availability_status === 'disponible' ? 'success' :
                                item.availability_status === 'indisponible' ? 'destructive' :
                                'secondary'
                              }
                              className="text-xs"
                            >
                              {item.availability_status === 'disponible' ? 'Disponible' :
                               item.availability_status === 'indisponible' ? 'Indisponible' :
                               'Statut inconnu'}
                            </Badge>

                            {/* Badges détaillés quand indisponible */}
                            {item.availability_status === 'indisponible' && (
                              <div className="flex gap-1">
                                {item.is_borrowed && (
                                  <Badge variant="warning" className="text-[10px] px-1.5 py-0.5 h-5">
                                    Emprunté
                                  </Badge>
                                )}
                                {item.is_reserved && (
                                  <Badge variant="outline" className="text-[10px] px-1.5 py-0.5 h-5 border-yellow-400 text-yellow-700 dark:text-yellow-300">
                                    Réservé
                                  </Badge>
                                )}
                              </div>
                            )}
                          </div>
                          <CardTitle className="text-sm font-bold text-gray-900 dark:text-gray-100 line-clamp-2 group-hover:text-green-600 dark:group-hover:text-green-400 transition-colors">
                            {item.title}
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="pt-0">
                          <div className="space-y-1 text-xs text-gray-600 dark:text-gray-300">
                            <p className="font-medium">
                              <span className="text-gray-600 dark:text-gray-300">Étudiant:</span> {item.author}
                            </p>
                            {item.supervisor && (
                              <p>
                                <span className="text-gray-600 dark:text-gray-300">Superviseur académique:</span> {item.supervisor}
                              </p>
                            )}
                            {item.co_supervisor && (
                              <p>
                                <span className="text-gray-600 dark:text-gray-300">Co-superviseur:</span> {item.co_supervisor}
                              </p>
                            )}
                            {item.degree_level && (
                              <p>
                                <span className="text-gray-600 dark:text-gray-300">Niveau:</span> {item.degree_level}
                              </p>
                            )}
                            {item.field_of_study && (
                              <p>
                                <span className="text-gray-600 dark:text-gray-300">Filière:</span> {item.field_of_study}
                              </p>
                            )}
                            {item.specialty && (
                              <p>
                                <span className="text-gray-600 dark:text-gray-300">Spécialité:</span> {item.specialty}
                              </p>
                            )}
                            {item.university && (
                              <p>
                                <span className="text-gray-600 dark:text-gray-300">Université:</span> {item.university}
                              </p>
                            )}
                            {item.faculty && (
                              <p>
                                <span className="text-gray-600 dark:text-gray-300">Faculté:</span> {item.faculty}
                              </p>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))
                )}
              </div>
            </div>

            {/* Colonne Rapports de Stage */}
            <div className="space-y-6">
              <div className="flex items-center justify-center mb-6">
                <Briefcase className="h-6 w-6 text-purple-600 dark:text-purple-400 mr-3" />
                <h3 className="text-xl font-bold text-purple-700 dark:text-purple-300">Rapports de Stage</h3>
              </div>
              <div className="space-y-4">
                {previewLoading ? (
                  [...Array(4)].map((_, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
                      transition={{ delay: i * 0.1 }}
                      className="bg-white/95 dark:bg-gray-800/95 backdrop-blur-sm rounded-2xl p-4 shadow-lg"
                    >
                      <div className="animate-pulse">
                        <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded mb-2"></div>
                        <div className="h-6 bg-gray-300 dark:bg-gray-600 rounded mb-2"></div>
                        <div className="h-3 bg-gray-300 dark:bg-gray-600 rounded"></div>
                      </div>
                    </motion.div>
                  ))
                ) : (
                  reportsPreview.map((item, index) => (
                    <motion.div
                      key={item.id}
                      initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
                      transition={{ duration: 0.5, delay: index * 0.1 }}
                      whileHover={{ y: -3, transition: { duration: 0.2 } }}
                      className="group"
                    >
                      <Card className="bg-white/95 dark:bg-gray-800/95 backdrop-blur-sm border-0 shadow-lg hover:shadow-xl transition-all duration-300 rounded-2xl overflow-hidden">
                        <CardHeader className="pb-3">
                          <div className="flex items-center justify-between mb-2">
                            <div className="px-2 py-1 rounded-full text-xs font-bold bg-purple-600 dark:bg-purple-500 text-white border border-purple-700 dark:border-purple-400 shadow-sm">
                              <Briefcase className="h-3 w-3 mr-1 inline" />
                              Rapport de stage
                            </div>
                            <Badge
                              variant={
                                item.availability_status === 'disponible' ? 'success' :
                                item.availability_status === 'indisponible' ? 'destructive' :
                                'secondary'
                              }
                              className="text-xs"
                            >
                              {item.availability_status === 'disponible' ? 'Disponible' :
                               item.availability_status === 'indisponible' ? 'Indisponible' :
                               'Statut inconnu'}
                            </Badge>

                            {/* Badges détaillés quand indisponible */}
                            {item.availability_status === 'indisponible' && (
                              <div className="flex gap-1">
                                {item.is_borrowed && (
                                  <Badge variant="warning" className="text-[10px] px-1.5 py-0.5 h-5">
                                    Emprunté
                                  </Badge>
                                )}
                                {item.is_reserved && (
                                  <Badge variant="outline" className="text-[10px] px-1.5 py-0.5 h-5 border-yellow-400 text-yellow-700 dark:text-yellow-300">
                                    Réservé
                                  </Badge>
                                )}
                              </div>
                            )}
                          </div>
                          <CardTitle className="text-sm font-bold text-gray-900 dark:text-gray-100 line-clamp-2 group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">
                            {item.title}
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="pt-0">
                          <div className="space-y-1 text-xs text-gray-600 dark:text-gray-300">
                            <p className="font-medium">
                              <span className="text-gray-600 dark:text-gray-300">Étudiant:</span> {item.author}
                            </p>
                            {item.supervisor && (
                              <p>
                                <span className="text-gray-600 dark:text-gray-300">Superviseur académique:</span> {item.supervisor}
                              </p>
                            )}
                            {item.company_supervisor && (
                              <p>
                                <span className="text-gray-600 dark:text-gray-300">Superviseur entreprise:</span> {item.company_supervisor}
                              </p>
                            )}
                            {item.company_name && (
                              <p>
                                <span className="text-gray-600 dark:text-gray-300">Entreprise:</span> {item.company_name}
                              </p>
                            )}
                            {item.degree_level && (
                              <p>
                                <span className="text-gray-600 dark:text-gray-300">Niveau:</span> {item.degree_level}
                              </p>
                            )}
                            {item.field_of_study && (
                              <p>
                                <span className="text-gray-600 dark:text-gray-300">Filière:</span> {item.field_of_study}
                              </p>
                            )}
                            {item.specialty && (
                              <p>
                                <span className="text-gray-600 dark:text-gray-300">Spécialité:</span> {item.specialty}
                              </p>
                            )}
                            {item.university && (
                              <p>
                                <span className="text-gray-600 dark:text-gray-300">Université:</span> {item.university}
                              </p>
                            )}
                            {item.faculty && (
                              <p>
                                <span className="text-gray-600 dark:text-gray-300">Faculté:</span> {item.faculty}
                              </p>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))
                )}
              </div>
            </div>

            {/* Colonne Autres Documents - À VENIR */}
            <div className="space-y-6 relative cursor-pointer opacity-60 grayscale-[0.3]" onClick={() => {
              toast({
                title: "Fonctionnalités à venir !",
                description: "Cette section comprendra la gestion de : Périodiques et revues, Documents audiovisuels (DVD, CD), Cartes géographiques, Archives historiques, Ressources numériques, Manuscrits anciens. Ces fonctionnalités seront disponibles dans les prochaines versions du système.",
              });
            }}>
              <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-20">
                <div className="bg-orange-500 text-white text-sm font-bold px-4 py-2 rounded-full shadow-xl animate-pulse border-2 border-white opacity-100">
                  Bientôt
                </div>
              </div>
              <div className="flex items-center justify-center mb-6">
                <Archive className="h-6 w-6 text-amber-600 dark:text-amber-400 mr-3" />
                <h3 className="text-xl font-bold text-amber-700 dark:text-amber-300">Autres Documents</h3>
              </div>
              <div className="space-y-4">
                {[...Array(4)].map((_, i) => (
                  <motion.div
                    key={i}
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ duration: 0.5, delay: i * 0.1 }}
                    whileHover={{ y: -3, transition: { duration: 0.2 } }}
                    className="group"
                  >
                    <Card className="bg-white/95 dark:bg-gray-800/95 backdrop-blur-sm border-0 shadow-lg hover:shadow-xl transition-all duration-300 rounded-2xl overflow-hidden">
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between mb-2">
                          <div className="px-2 py-1 rounded-full text-xs font-bold bg-amber-600 dark:bg-amber-500 text-white border border-amber-700 dark:border-amber-400 shadow-sm">
                            <Archive className="h-3 w-3 mr-1 inline" />
                            Autres
                          </div>
                          <div className="text-xs px-2 py-1 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-600">
                            À venir
                          </div>
                        </div>
                        <CardTitle className="text-sm font-bold text-gray-900 dark:text-gray-100 line-clamp-2 group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">
                          {[
                            'Revue Scientifique Camerounaise',
                            'Collection DVD Documentaires',
                            'Archives Historiques UdM',
                            'Ressources Numériques'
                          ][i]}
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="pt-0">
                        <div className="space-y-1 text-xs text-gray-600 dark:text-gray-300">
                          <p className="font-medium">
                            <span className="text-gray-600 dark:text-gray-300">Type:</span> {
                              ['Périodique', 'Audiovisuel', 'Archive', 'Numérique'][i]
                            }
                          </p>
                          <p>
                            <span className="text-gray-600 dark:text-gray-300">Statut:</span> En développement
                          </p>
                          <p>
                            <span className="text-gray-600 dark:text-gray-300">Disponibilité:</span> Version future
                          </p>
                          <div className="mt-2 p-2 bg-orange-50 dark:bg-orange-900/20 rounded border border-orange-200 dark:border-orange-800">
                            <p className="text-orange-700 dark:text-orange-300 font-medium text-xs">
                              Cliquez pour plus d'infos
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>

          {/* Bouton pour voir le catalogue complet */}
          <motion.div
            initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
            transition={{ delay: 0.8 }}
            className="text-center mt-16"
          >
            <Button
              variant="outline"
              size="lg"
              className="bg-white dark:bg-gray-800 backdrop-blur-sm border-2 border-green-500 dark:border-green-400 hover:border-green-600 dark:hover:border-green-200 hover:bg-green-50 dark:hover:bg-green-800/40 text-green-700 dark:text-green-300 hover:text-green-800 dark:hover:text-green-100 font-bold px-4 sm:px-6 lg:px-8 py-3 lg:py-4 text-sm sm:text-base w-full sm:w-auto"
              asChild
            >
              <Link href="/catalog" className="flex items-center justify-center">
                <Library className="h-4 lg:h-5 w-4 lg:w-5 mr-2 flex-shrink-0" />
                <span className="text-center">
                  <span className="hidden sm:inline">Accéder au Catalogue Complet - Tous les Documents</span>
                  <span className="sm:hidden">Catalogue Complet</span>
                </span>
                <ArrowRight className="h-4 lg:h-5 w-4 lg:w-5 ml-2 flex-shrink-0" />
              </Link>
            </Button>
          </motion.div>
        </div>
      </section>

      {/* Features Section avec animations révolutionnaires */}
      <section className="py-32 relative overflow-hidden">
        {/* Background animé */}
        <div className="absolute inset-0">
          <motion.div
            animate={{
              backgroundPosition: ["0% 0%", "100% 100%"],
            }}
            transition={{
              duration: 20,
              repeat: Infinity,
              repeatType: "reverse",
            }}
            className="absolute inset-0 bg-gradient-to-br from-green-50/50 via-gray-50/50 to-green-50/50 dark:from-green-900/20 dark:via-gray-900/20 dark:to-green-900/20"
            style={{
              backgroundSize: "400% 400%",
            }}
          />
        </div>

        <div className="relative container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1 }}
            className="text-center mb-20"
          >
            <motion.div
              className="flex flex-col items-center justify-center mb-6"
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 1 }}
            >
              <motion.div
                animate={{
                  scale: [1, 1.1, 1],
                  rotate: [0, 5, -5, 0],
                }}
                transition={{
                  duration: 3,
                  repeat: Infinity,
                }}
              >
                <Zap className="mb-4 h-16 w-16 text-green-600 dark:text-green-300" />
              </motion.div>
              <motion.h2
                className="text-5xl md:text-6xl font-bold bg-gradient-to-r from-gray-900 via-green-700 to-gray-900 dark:from-white dark:via-green-200 dark:to-white bg-clip-text text-transparent"
                animate={{
                  backgroundPosition: ["0%", "100%", "0%"],
                }}
                transition={{
                  duration: 8,
                  repeat: Infinity,
                }}
              >
                Fonctionnalités Avancées
              </motion.h2>
            </motion.div>
            <motion.div
              className="text-xl md:text-2xl text-gray-700 dark:text-gray-100 max-w-4xl mx-auto leading-relaxed font-medium"
              initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
              transition={{ delay: 0.5, duration: 0.8 }}
            >
              Découvrez l&apos;écosystème complet qui transformera votre bibliothèque en centre d&apos;innovation
              <motion.span
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ duration: 4, repeat: Infinity }}
                className="inline-block ml-3"
              >
                <Star className="h-6 w-6 text-amber-500 inline" />
              </motion.span>
            </motion.div>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 100, rotateX: -90 }}
                animate={{ opacity: 1, y: 0, rotateX: 0 }}
                transition={{
                  duration: 0.8,
                  delay: index * 0.2,
                  type: "spring",
                  stiffness: 100
                }}
                whileHover={{
                  y: -20,
                  rotateY: 5,
                  scale: 1.05,
                  transition: { duration: 0.3 }
                }}
                className="group perspective-1000"
              >
                <Card className="h-full bg-white/95 dark:bg-gray-800/95 backdrop-blur-xl border-0 shadow-2xl hover:shadow-3xl transition-all duration-500 rounded-3xl overflow-hidden relative">
                  {/* Effet de brillance au hover */}
                  <div className="absolute inset-0 bg-gradient-to-r from-green-400/20 via-gray-400/20 to-green-400/20 dark:from-green-300/30 dark:via-gray-300/30 dark:to-green-300/30 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

                  {/* Particules flottantes */}
                  <div className="absolute inset-0 overflow-hidden">
                    {[...Array(5)].map((_, i) => (
                      <motion.div
                        key={i}
                        className="absolute w-1 h-1 bg-blue-400/40 rounded-full"
                        animate={{
                          y: [0, -50],
                          opacity: [0, 1, 0],
                        }}
                        transition={{
                          duration: 2,
                          repeat: Infinity,
                          delay: i * 0.4,
                        }}
                        style={{
                          left: `${20 + i * 15}%`,
                          top: "80%",
                        }}
                      />
                    ))}
                  </div>

                  <CardHeader className="text-center relative z-10 p-8">
                    <motion.div
                      className="mx-auto mb-6 p-4 bg-gradient-to-br from-green-500/20 to-gray-500/20 rounded-2xl w-fit backdrop-blur-sm"
                      whileHover={{
                        scale: 1.2,
                        rotate: 360,
                        transition: { duration: 0.5 }
                      }}
                    >
                      <feature.icon className="h-10 w-10 text-green-600 dark:text-green-300" />
                    </motion.div>

                    <CardTitle className="text-xl font-bold mb-4 text-gray-900 dark:text-white">
                      {feature.title}
                    </CardTitle>

                    <CardDescription className="text-base text-gray-700 dark:text-gray-100 leading-relaxed">
                      {feature.description}
                    </CardDescription>
                  </CardHeader>

                  <CardContent className="pt-0 pb-8 relative z-10">
                    <motion.div
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      <Button
                        variant="ghost"
                        className="w-full bg-green-500/20 dark:bg-green-500/30 hover:bg-green-500/30 dark:hover:bg-green-500/50 border-2 border-green-400 dark:border-green-300 hover:border-green-500 dark:hover:border-green-200 text-green-800 dark:text-green-100 hover:text-green-900 dark:hover:text-white rounded-xl font-bold"
                        asChild
                      >
                        <Link href={feature.href}>
                          <motion.span
                            animate={{ x: [0, 5, 0] }}
                            transition={{ duration: 2, repeat: Infinity }}
                          >
                            Découvrir
                          </motion.span>
                          <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-2 transition-transform duration-300" />
                        </Link>
                      </Button>
                    </motion.div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
