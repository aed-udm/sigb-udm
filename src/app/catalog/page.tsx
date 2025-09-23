"use client";

import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { useAutoRefreshOnReturn } from "@/hooks/useAutoRefreshOnReturn";
import { BookOpen, GraduationCap, FileText, Briefcase, Search, Filter, Library, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { SimpleThemeToggle } from "@/components/ui/theme-toggle";
import { getDocumentTypeLabel } from "@/lib/utils/document-types";



interface CatalogItem {
  id: string;
  type: 'book' | 'these' | 'memoire' | 'rapport_stage';
  title: string;
  subtitle?: string;
  author?: string;
  main_author?: string;
  secondary_author?: string;
  director?: string;
  co_director?: string;
  supervisor?: string;
  co_supervisor?: string;
  student_name?: string;
  company_supervisor?: string;
  university?: string;
  faculty?: string;
  publisher?: string;
  publication_year?: number;
  publication_city?: string;
  edition?: string;
  defense_year?: number;
  defense_date?: string;
  defense_date_formatted?: string;
  domain?: string;
  target_degree?: string;
  degree_level?: string;
  field_of_study?: string;
  specialty?: string;
  company_name?: string;
  stage_duration?: number;
  summary?: string;
  abstract?: string;
  status?: string;
  degree_type?: string;
  total_copies?: number;
  available_copies?: number;
  is_reserved?: boolean;
  is_borrowed?: boolean;
  created_at: string;
}

export default function CatalogPage() {
  // 🎯 NOUVEAU : Hook pour rafraîchissement automatique après retour
  useAutoRefreshOnReturn();

  const [items, setItems] = useState<CatalogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedType, setSelectedType] = useState("all");
  const [selectedDomain, setSelectedDomain] = useState("all");
  const [selectedAvailability, setSelectedAvailability] = useState("all");
  const [selectedLanguage, setSelectedLanguage] = useState("all");
  const [selectedYear, setSelectedYear] = useState("all");
  const [selectedFormat, setSelectedFormat] = useState("all");
  const [selectedLevel, setSelectedLevel] = useState("all");
  const [selectedPublisher, setSelectedPublisher] = useState("all");
  const [selectedClassification, setSelectedClassification] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Données dynamiques pour les filtres
  const [filterData, setFilterData] = useState({
    domains: [] as string[],
    years: [] as number[],
    languages: [] as string[],
    formats: [] as string[],
    levels: [] as string[],
    publishers: [] as string[]
  });

  const itemsPerPage = 24;

  // Fonction pour déterminer quels filtres afficher selon le type de document
  const getAvailableFilters = (documentType: string) => {
    const baseFilters = ['search', 'type', 'domain', 'availability'];

    switch (documentType) {
      case 'books':
        return [
          ...baseFilters,
          'language',
          'year',
          'format',
          'level',
          'publisher',
          'classification'
        ];

      case 'theses':
        return [
          ...baseFilters,
          'language',
          'year',
          'level', // Niveau d'études (Master, Doctorat)
          'publisher' // Université/Institution
        ];

      case 'memoires':
        return [
          ...baseFilters,
          'language',
          'year',
          'level', // Niveau d'études (Licence, Master)
          'publisher' // Université/Institution
        ];

      case 'reports':
        return [
          ...baseFilters,
          'language',
          'year',
          'format',
          'publisher' // Entreprise/Institution
        ];

      case 'all':
      default:
        return [
          ...baseFilters,
          'language',
          'format'
        ];
    }
  };

  // Fonction pour réinitialiser les filtres non pertinents
  const resetIrrelevantFilters = (newDocumentType: string) => {
    const availableFilters = getAvailableFilters(newDocumentType);

    if (!availableFilters.includes('year')) {
      setSelectedYear("all");
    }
    if (!availableFilters.includes('format')) {
      setSelectedFormat("all");
    }
    if (!availableFilters.includes('level')) {
      setSelectedLevel("all");
    }
    if (!availableFilters.includes('publisher')) {
      setSelectedPublisher("all");
    }
    if (!availableFilters.includes('classification')) {
      setSelectedClassification("all");
    }
    if (!availableFilters.includes('language')) {
      setSelectedLanguage("all");
    }
  };

  // Fonction pour vérifier si un filtre doit être affiché
  const shouldShowFilter = (filterName: string) => {
    const availableFilters = getAvailableFilters(selectedType);
    return availableFilters.includes(filterName);
  };

  // Fonction pour charger les données des filtres
  const fetchFilterData = useCallback(async () => {
    try {
      const response = await fetch('/api/public/catalog/filters');
      if (response.ok) {
        const data = await response.json();
        setFilterData(data.data || {
          domains: [],
          years: [],
          languages: [],
          formats: [],
          levels: [],
          publishers: []
        });
      }
    } catch (error) {
      console.error('Erreur lors du chargement des filtres:', error);
    }
  }, []);

  // Fonction pour charger les éléments du catalogue
  const fetchCatalog = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        type: selectedType,
        domain: selectedDomain,
        availability: selectedAvailability,
        language: selectedLanguage,
        year: selectedYear,
        format: selectedFormat,
        level: selectedLevel,
        publisher: selectedPublisher,
        classification: selectedClassification,
        limit: itemsPerPage.toString(),
        search: searchTerm,
        page: currentPage.toString()
      });

      const response = await fetch(`/api/public/catalog?${params}`);
      if (response.ok) {
        const data = await response.json();
        setItems(data.data || []);
        setTotalPages(Math.ceil((data.total || 0) / itemsPerPage));
      }
    } catch (error) {
      console.error('Erreur lors du chargement du catalogue:', error);
    } finally {
      setLoading(false);
    }
  }, [selectedType, selectedDomain, selectedAvailability, selectedLanguage, selectedYear, selectedFormat, selectedLevel, selectedPublisher, selectedClassification, searchTerm, currentPage]);

  // Charger les données des filtres au montage
  useEffect(() => {
    fetchFilterData();
  }, [fetchFilterData]);

  // Charger le catalogue au montage
  useEffect(() => {
    fetchCatalog();
  }, [fetchCatalog]);

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'book':
        return <BookOpen className="h-3 w-3" />;
      case 'these':
        return <GraduationCap className="h-3 w-3" />;
      case 'memoire':
        return <FileText className="h-3 w-3" />;
      case 'rapport_stage':
        return <Briefcase className="h-3 w-3" />;
      default:
        return <BookOpen className="h-3 w-3" />;
    }
  };

  // Utilisation de l'utilitaire uniforme pour les labels
  const getTypeLabel = (type: string) => getDocumentTypeLabel(type);



  return (
    <>
      <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-gray-50 dark:from-gray-900 dark:via-gray-800 dark:to-green-900 relative overflow-hidden flex flex-col">
        {/* Header professionnel avec glassmorphism */}
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
              <div className="flex items-center space-x-3 sm:space-x-4">
                <Button variant="ghost" size="sm" asChild className="text-gray-700 dark:text-gray-200 hover:text-green-600 dark:hover:text-green-300 hover:bg-gray-100 dark:hover:bg-gray-700 font-medium transition-all duration-200">
                  <Link href="/">
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Retour à l'accueil
                  </Link>
                </Button>
                <div className="flex items-center space-x-2 sm:space-x-3">
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
                    <Library className="h-6 w-6 sm:h-8 sm:w-8 text-green-600 drop-shadow-lg" />
                  </motion.div>
                  <div>
                    <motion.h1
                      className="text-xl sm:text-2xl md:text-3xl font-bold bg-gradient-to-r from-gray-900 via-green-700 to-gray-900 dark:from-white dark:via-green-300 dark:to-white bg-clip-text text-transparent"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.4, delay: 0.1 }}
                    >
                      Catalogue Public
                    </motion.h1>
                    <motion.p
                      className="text-sm sm:text-base text-gray-700 dark:text-gray-200 mt-1 font-medium"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.4, delay: 0.2 }}
                    >
                      Explorez notre collection complète de documents
                    </motion.p>
                  </div>
                </div>
              </div>

              <motion.div
                initial={{ opacity: 0, x: 30 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6, delay: 0.3 }}
                className="flex items-center space-x-3"
              >
                <Button
                  onClick={fetchCatalog}
                  variant="outline"
                  size="sm"
                  className="bg-green-100 dark:bg-green-700 border border-green-300 dark:border-green-600 hover:bg-green-200 dark:hover:bg-green-600 hover:border-green-400 dark:hover:border-green-500 font-medium text-green-700 dark:text-green-200 transition-all duration-200"
                >
                  Actualiser
                </Button>
                <SimpleThemeToggle />
                <Button variant="outline" size="sm" asChild className="bg-green-100 dark:bg-green-700 border border-green-500 dark:border-green-400 text-green-700 dark:text-green-200 hover:bg-green-200 dark:hover:bg-green-600 hover:border-green-600 dark:hover:border-green-500 font-medium transition-all duration-200">
                  <Link href="/auth/login">
                    Se connecter
                  </Link>
                </Button>
              </motion.div>
            </div>
          </div>
        </motion.div>

        {/* Filtres et recherche */}
        <div className="flex-1 container mx-auto px-3 sm:px-4 md:px-6 py-4 sm:py-6 pb-20">
          <div className="bg-white/95 dark:bg-gray-800/95 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-gray-200 dark:border-gray-700 mb-8">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 2xl:grid-cols-8 gap-3 sm:gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Rechercher dans le catalogue..."
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="pl-10"
                />
              </div>
              <div className="relative">
                <select
                  value={selectedType}
                  onChange={(e) => {
                    const newType = e.target.value;
                    setSelectedType(newType);
                    resetIrrelevantFilters(newType);
                    setCurrentPage(1);
                  }}
                  className="w-full h-10 px-3 rounded-md border border-gray-300 bg-white text-sm ring-offset-white focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 dark:ring-offset-gray-900 dark:focus:ring-green-400"
                >
                  <option value="all" className="bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100">Tous les documents</option>
                  <option value="books" className="bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100">Livres</option>
                  <option value="theses" className="bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100">Thèses</option>
                  <option value="memoires" className="bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100">Mémoires</option>
                  <option value="reports" className="bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100">Rapports de stage</option>
                </select>
              </div>
              <div className="relative">
                <select
                  value={selectedDomain}
                  onChange={(e) => {
                    setSelectedDomain(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full h-10 px-3 rounded-md border border-gray-300 bg-white text-sm ring-offset-white focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 dark:ring-offset-gray-900 dark:focus:ring-green-400"
                >
                  <option value="all" className="bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100">Tous les domaines</option>
                  {filterData.domains.map((domain) => (
                    <option key={domain} value={domain} className="bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100">
                      {domain}
                    </option>
                  ))}
                </select>
              </div>
              <div className="relative">
                <select
                  value={selectedAvailability}
                  onChange={(e) => {
                    setSelectedAvailability(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full h-10 px-3 rounded-md border border-gray-300 bg-white text-sm ring-offset-white focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 dark:ring-offset-gray-900 dark:focus:ring-green-400"
                >
                  <option value="all" className="bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100">Toute disponibilité</option>
                  <option value="available" className="bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100">Disponible</option>
                  <option value="unavailable" className="bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100">Indisponible</option>
                  <option value="borrowed" className="bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100">Emprunté</option>
                  <option value="reserved" className="bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100">Réservé</option>
                </select>
              </div>
              {shouldShowFilter('language') && (
                <div className="relative">
                  <select
                    value={selectedLanguage}
                  onChange={(e) => {
                    setSelectedLanguage(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full h-10 px-3 rounded-md border border-gray-300 bg-white text-sm ring-offset-white focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 dark:ring-offset-gray-900 dark:focus:ring-green-400"
                >
                  <option value="all" className="bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100">Toutes les langues</option>
                  {filterData.languages.map((language) => (
                    <option key={language} value={language} className="bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100">
                      {language}
                    </option>
                  ))}
                  </select>
                </div>
              )}
              {shouldShowFilter('year') && (
                <div className="relative">
                  <select
                    value={selectedYear}
                  onChange={(e) => {
                    setSelectedYear(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full h-10 px-3 rounded-md border border-gray-300 bg-white text-sm ring-offset-white focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 dark:ring-offset-gray-900 dark:focus:ring-green-400"
                >
                  <option value="all" className="bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100">Toutes les années</option>
                  {filterData.years.map((year) => (
                    <option key={year} value={year.toString()} className="bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100">
                      {year}
                    </option>
                  ))}
                  </select>
                </div>
              )}
              {shouldShowFilter('format') && (
                <div className="relative">
                  <select
                    value={selectedFormat}
                  onChange={(e) => {
                    setSelectedFormat(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full h-10 px-3 rounded-md border border-gray-300 bg-white text-sm ring-offset-white focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 dark:ring-offset-gray-900 dark:focus:ring-green-400"
                >
                  <option value="all" className="bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100">Tous les formats</option>
                  <option value="imprime" className="bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100">Imprimé</option>
                  <option value="numerique" className="bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100">Numérique</option>
                  <option value="pdf" className="bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100">PDF</option>
                  <option value="ebook" className="bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100">E-book</option>
                  <option value="audiobook" className="bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100">Livre audio</option>
                  <option value="multimedia" className="bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100">Multimédia</option>
                  <option value="video" className="bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100">Vidéo</option>
                  </select>
                </div>
              )}
              {shouldShowFilter('level') && (
                <div className="relative">
                  <select
                    value={selectedLevel}
                  onChange={(e) => {
                    setSelectedLevel(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full h-10 px-3 rounded-md border border-gray-300 bg-white text-sm ring-offset-white focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 dark:ring-offset-gray-900 dark:focus:ring-green-400"
                >
                  <option value="all" className="bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100">Tous les niveaux</option>
                  <option value="debutant" className="bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100">Débutant</option>
                  <option value="intermediaire" className="bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100">Intermédiaire</option>
                  <option value="avance" className="bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100">Avancé</option>
                  <option value="licence" className="bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100">Licence</option>
                  <option value="master" className="bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100">Master</option>
                  <option value="doctorat" className="bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100">Doctorat</option>
                  <option value="professionnel" className="bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100">Professionnel</option>
                  <option value="general" className="bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100">Grand public</option>
                  </select>
                </div>
              )}
              {shouldShowFilter('publisher') && (
                <div className="relative">
                  <select
                    value={selectedPublisher}
                  onChange={(e) => {
                    setSelectedPublisher(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full h-10 px-3 rounded-md border border-gray-300 bg-white text-sm ring-offset-white focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 dark:ring-offset-gray-900 dark:focus:ring-green-400"
                >
                  <option value="all" className="bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100">Tous les éditeurs</option>
                  <option value="pearson" className="bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100">Pearson</option>
                  <option value="mcgraw-hill" className="bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100">McGraw-Hill</option>
                  <option value="wiley" className="bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100">Wiley</option>
                  <option value="springer" className="bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100">Springer</option>
                  <option value="elsevier" className="bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100">Elsevier</option>
                  <option value="cambridge" className="bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100">Cambridge University Press</option>
                  <option value="oxford" className="bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100">Oxford University Press</option>
                  <option value="mit-press" className="bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100">MIT Press</option>
                  <option value="harvard" className="bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100">Harvard University Press</option>
                  <option value="puf" className="bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100">PUF</option>
                  <option value="gallimard" className="bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100">Gallimard</option>
                  <option value="seuil" className="bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100">Seuil</option>
                  <option value="harmattan" className="bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100">L'Harmattan</option>
                  <option value="karthala" className="bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100">Karthala</option>
                  <option value="autre" className="bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100">Autre</option>
                  </select>
                </div>
              )}
              {shouldShowFilter('classification') && (
                <div className="relative">
                  <select
                    value={selectedClassification}
                  onChange={(e) => {
                    setSelectedClassification(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full h-10 px-3 rounded-md border border-gray-300 bg-white text-sm ring-offset-white focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 dark:ring-offset-gray-900 dark:focus:ring-green-400"
                >
                  <option value="all" className="bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100">Toutes les classifications</option>
                  <option value="000-099" className="bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100">000-099 Informatique, information</option>
                  <option value="100-199" className="bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100">100-199 Philosophie, psychologie</option>
                  <option value="200-299" className="bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100">200-299 Religion</option>
                  <option value="300-399" className="bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100">300-399 Sciences sociales</option>
                  <option value="400-499" className="bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100">400-499 Langues</option>
                  <option value="500-599" className="bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100">500-599 Sciences pures</option>
                  <option value="600-699" className="bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100">600-699 Sciences appliquées</option>
                  <option value="700-799" className="bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100">700-799 Arts, loisirs</option>
                  <option value="800-899" className="bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100">800-899 Littérature</option>
                  <option value="900-999" className="bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100">900-999 Histoire, géographie</option>
                  </select>
                </div>
              )}
              <div className="text-sm text-gray-800 dark:text-gray-100 flex items-center font-semibold">
                {loading ? (
                  "Chargement..."
                ) : (
                  `${items.length} document${items.length > 1 ? 's' : ''} trouvé${items.length > 1 ? 's' : ''}`
                )}
              </div>
            </div>
          </div>

          {/* Grille des documents */}
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="animate-pulse">
                  <div className="bg-white/95 dark:bg-gray-800/95 rounded-2xl p-6 h-64">
                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded mb-4"></div>
                    <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded mb-2"></div>
                    <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded mb-2"></div>
                    <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-2/3"></div>
                  </div>
                </div>
              ))}
            </div>
          ) : items.length === 0 ? (
            <div className="text-center py-16">
              <Library className="h-16 w-16 text-gray-600 dark:text-gray-300 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                Aucun document trouvé
              </h3>
              <p className="text-gray-700 dark:text-gray-200">
                Essayez de modifier vos critères de recherche
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
              {items.map((item, index) => (
                <motion.div
                  key={item.id}
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.3 }}
                >
                  <Card className="h-full bg-white/95 dark:bg-gray-800/95 backdrop-blur-sm border border-gray-200 dark:border-gray-700 hover:shadow-lg transition-all duration-300 group">
                    <div>
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between mb-2">
                          <div className={`px-2 py-1 rounded-full text-xs font-bold border shadow-sm flex items-center ${
                            item.type === 'book' ? 'bg-blue-600 dark:bg-blue-500 text-white border-blue-700 dark:border-blue-400' :
                            item.type === 'these' ? 'bg-pink-600 dark:bg-pink-500 text-white border-pink-700 dark:border-pink-400' :
                            item.type === 'memoire' ? 'bg-green-600 dark:bg-green-500 text-white border-green-700 dark:border-green-400' :
                            'bg-purple-600 dark:bg-purple-500 text-white border-purple-700 dark:border-purple-400'
                          }`}>
                            {getTypeIcon(item.type)}
                            <span className="ml-1">
                              {getTypeLabel(item.type)}
                            </span>
                          </div>

                          {/* Badges de statut - Design uniforme avec le système existant */}
                          <div className="flex flex-wrap gap-1.5 items-center">
                            {/* Badge de statut principal - Utilise le système Badge unifié */}
                            {item.availability_status && (
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
                            )}

                            {/* Badges détaillés - Utilise le système Badge unifié */}
                            {item.availability_status === 'indisponible' && (
                              <>
                                {/* Badge Emprunté */}
                                {item.is_borrowed && (
                                  <Badge variant="warning" className="text-[10px] px-1.5 py-0.5 h-5">
                                    Emprunté
                                  </Badge>
                                )}

                                {/* Badge Réservé */}
                                {item.is_reserved && (
                                  <Badge variant="outline" className="text-[10px] px-1.5 py-0.5 h-5 border-yellow-400 text-yellow-700 dark:text-yellow-300">
                                    Réservé
                                  </Badge>
                                )}
                              </>
                            )}
                          </div>
                        </div>
                        <CardTitle className="text-sm font-bold line-clamp-3 text-gray-900 dark:text-white group-hover:text-green-600 dark:group-hover:text-blue-400 transition-colors">
                          {item.title}
                          {item.subtitle && (
                            <span className="block text-xs font-normal text-gray-600 dark:text-gray-400 mt-1">
                              {item.subtitle}
                            </span>
                          )}
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="pt-0">
                        <div className="space-y-1 text-xs text-gray-700 dark:text-gray-200">
                          {/* 📖 INFORMATIONS SPÉCIFIQUES LIVRES */}
                          {item.type === 'book' && (
                            <>
                              <p><span className="font-semibold">Auteur:</span> {item.author || 'Non spécifié'}</p>
                              {item.secondary_author && <p><span className="font-semibold">Auteur secondaire:</span> {item.secondary_author}</p>}
                              {item.publisher && <p><span className="font-semibold">Éditeur:</span> {item.publisher}</p>}
                              {item.publication_year && <p><span className="font-semibold">Année:</span> {item.publication_year}</p>}
                              {item.publication_city && <p><span className="font-semibold">Ville:</span> {item.publication_city}</p>}
                              {item.edition && <p><span className="font-semibold">Édition:</span> {item.edition}</p>}
                              {item.domain && <p><span className="font-semibold">Domaine:</span> {item.domain}</p>}
                              {item.total_copies && (
                                <p><span className="font-semibold">Exemplaires:</span> {item.available_copies}/{item.total_copies}</p>
                              )}
                            </>
                          )}

                          {/* 📚 INFORMATIONS SPÉCIFIQUES THÈSES */}
                          {item.type === 'these' && (
                            <>
                              <p><span className="font-semibold">Auteur:</span> {item.author || 'Non spécifié'}</p>
                              {item.director && <p><span className="font-semibold">Directeur:</span> {item.director}</p>}
                              {item.co_director && <p><span className="font-semibold">Co-directeur:</span> {item.co_director}</p>}
                              {item.target_degree && <p><span className="font-semibold">Diplôme:</span> {item.target_degree}</p>}
                              {item.specialty && <p><span className="font-semibold">Spécialité:</span> {item.specialty}</p>}
                              {item.university && <p><span className="font-semibold">Université:</span> {item.university}</p>}
                              {item.faculty && <p><span className="font-semibold">Faculté:</span> {item.faculty}</p>}
                              {item.defense_year && <p><span className="font-semibold">Année:</span> {item.defense_year}</p>}
                            </>
                          )}

                          {/* 📝 INFORMATIONS SPÉCIFIQUES MÉMOIRES */}
                          {item.type === 'memoire' && (
                            <>
                              <p><span className="font-semibold">Étudiant:</span> {item.author || 'Non spécifié'}</p>
                              {item.supervisor && <p><span className="font-semibold">Superviseur académique:</span> {item.supervisor}</p>}
                              {item.co_supervisor && <p><span className="font-semibold">Co-superviseur:</span> {item.co_supervisor}</p>}
                              {item.degree_level && <p><span className="font-semibold">Niveau:</span> {item.degree_level}</p>}
                              {item.field_of_study && <p><span className="font-semibold">Filière:</span> {item.field_of_study}</p>}
                              {item.specialty && <p><span className="font-semibold">Spécialité:</span> {item.specialty}</p>}
                              {item.university && <p><span className="font-semibold">Université:</span> {item.university}</p>}
                              {item.faculty && <p><span className="font-semibold">Faculté:</span> {item.faculty}</p>}
                            </>
                          )}

                          {/* 📋 INFORMATIONS SPÉCIFIQUES RAPPORTS */}
                          {item.type === 'rapport_stage' && (
                            <>
                              <p><span className="font-semibold">Étudiant:</span> {item.student_name || 'Non spécifié'}</p>
                              {item.supervisor && <p><span className="font-semibold">Superviseur académique:</span> {item.supervisor}</p>}
                              {item.company_supervisor && <p><span className="font-semibold">Superviseur entreprise:</span> {item.company_supervisor}</p>}
                              {item.degree_level && <p><span className="font-semibold">Niveau:</span> {item.degree_level}</p>}
                              {item.field_of_study && <p><span className="font-semibold">Filière:</span> {item.field_of_study}</p>}
                              {item.specialty && <p><span className="font-semibold">Spécialité:</span> {item.specialty}</p>}
                              {item.company_name && <p><span className="font-semibold">Entreprise:</span> {item.company_name}</p>}
                              {item.university && <p><span className="font-semibold">Université:</span> {item.university}</p>}
                              {item.faculty && <p><span className="font-semibold">Faculté:</span> {item.faculty}</p>}
                              {item.defense_date_formatted && <p><span className="font-semibold">Date soutenance:</span> {item.defense_date_formatted}</p>}
                            </>
                          )}
                        </div>
                      </CardContent>
                    </div>
                  </Card>
                </motion.div>
              ))}
            </div>
          )}
        </div>

        {/* Pagination fixe en bas */}
        {totalPages > 1 && (
          <div className="sticky bottom-0 bg-white/95 dark:bg-gray-900/95 backdrop-blur-md border-t border-gray-200 dark:border-gray-700 py-4 mt-auto">
            <div className="container mx-auto px-3 sm:px-4 md:px-6">
              <div className="flex justify-center space-x-2">
                <Button
                  variant="outline"
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className="border-2 border-green-500 dark:border-green-400 text-green-700 dark:text-green-300 hover:bg-green-50 dark:hover:bg-green-900/20 font-semibold disabled:opacity-50"
                >
                  Précédent
                </Button>
                <span className="flex items-center px-4 text-sm text-gray-800 dark:text-gray-100 font-semibold">
                  Page {currentPage} sur {totalPages}
                </span>
                <Button
                  variant="outline"
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  className="border-2 border-green-500 dark:border-green-400 text-green-700 dark:text-green-300 hover:bg-green-50 dark:hover:bg-green-900/20 font-semibold disabled:opacity-50"
                >
                  Suivant
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
