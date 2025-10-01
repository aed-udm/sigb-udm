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
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

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
  // Période fixe - plus de filtre de période
  const [selectedMonth, setSelectedMonth] = useState<string>('');
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [exportFormat, setExportFormat] = useState<'excel' | 'pdf'>('excel');
  const { toast } = useToast();
  const { subscribe } = useRefresh();

  // Fonction pour charger les données d'analyticsData depuis l'API
  const fetchAnalytics = useCallback(async () => {
    try {
      setLoading(true);
      const url = `/api/analytics${selectedMonth ? `?month=${selectedMonth}` : ''}`;
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
  }, [selectedMonth, toast]);

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

      if (exportFormat === 'pdf') {
        // Export PDF
        await exportToPDF(exportData);
      } else {
        // Export Excel
        await exportToExcel(exportData);
      }

      toast({
        title: "Export réussi",
        description: `Fichier analytics_export_${new Date().toISOString().slice(0, 10)}.${exportFormat === 'pdf' ? 'pdf' : 'xlsx'} téléchargé`,
      });
    } catch (error) {
      console.error('❌ Erreur lors de l\'export:', error);
      toast({
        title: "Erreur d'export",
        description: error instanceof Error ? error.message : "Erreur inconnue lors de l'export",
        variant: "destructive",
      });
    } finally {
      setExporting(false);
    }
  }, [analyticsData, selectedMonth, toast, loading, error, exportFormat]);

  // Fonction d'export Excel - Version claire et compréhensible
  const exportToExcel = async (exportData: any) => {
    const workbook = XLSX.utils.book_new();
    const currentDate = new Date().toLocaleDateString('fr-FR');

    // === FEUILLE 1: RÉSUMÉ GÉNÉRAL ===
    const monthDescription = selectedMonth ?
      new Date(selectedMonth + '-01').toLocaleDateString('fr-FR', { year: 'numeric', month: 'long' }) :
      'Tous les mois';

    const resumeData = [
      ['RAPPORT ANALYTICS - BIBLIOTHÈQUE UdM'],
      [`Généré le: ${currentDate}`],
      [`Mois filtré: ${monthDescription}`],
      [''],
      ['INDICATEURS CLÉS', 'VALEURS'],
      ['Nombre total de livres dans la collection', exportData.statistics.total_books || 0],
      ['Nombre total d\'utilisateurs inscrits', exportData.statistics.total_users || 0],
      ['Emprunts actuellement en cours', exportData.statistics.active_loans || 0],
      ['Emprunts en retard (à récupérer)', exportData.statistics.overdue_loans || 0],
      ['Nombre de thèses disponibles', exportData.statistics.total_theses || 0],
      ['Nombre de mémoires disponibles', exportData.statistics.total_memoires || 0],
      ['Nombre de rapports de stage', exportData.statistics.total_stage_reports || 0],
      ['Réservations en attente', exportData.statistics.active_reservations || 0],
      ['Utilisateurs actifs ce mois', exportData.statistics.monthly_active_users || 0],
      ['Durée moyenne d\'emprunt (en jours)', Math.round(exportData.statistics.avg_loan_duration || 0)],
      ['Emprunts avec pénalités impayées', exportData.statistics.loans_with_fines || 0],
      ['Montant total des pénalités (FCFA)', (exportData.statistics.total_fines_amount || 0).toLocaleString('fr-FR')]
    ];

    const resumeSheet = XLSX.utils.aoa_to_sheet(resumeData);

    // Mise en forme de la feuille résumé
    resumeSheet['!cols'] = [
      { width: 50 }, // Colonne descriptions
      { width: 20 }  // Colonne valeurs
    ];

    XLSX.utils.book_append_sheet(workbook, resumeSheet, 'Résumé Général');

    // === FEUILLE 2: TOP DES LIVRES LES PLUS EMPRUNTÉS ===
    if (exportData.popular_books && exportData.popular_books.length > 0) {
      const booksData = [
        ['CLASSEMENT DES LIVRES LES PLUS POPULAIRES'],
        [`Mois: ${monthDescription} | Généré le: ${currentDate}`],
        [''],
        ['Rang', 'Titre du Livre', 'Auteur', 'Code ISBN', 'Nombre d\'Emprunts', 'Popularité'],
        ...exportData.popular_books.slice(0, 20).map((book: any, index: number) => [
          `${index + 1}°`, // Rang
          book.title || 'Titre non disponible',
          book.author || 'Auteur non renseigné',
          book.isbn || 'ISBN non disponible',
          book.loan_count || 0,
          book.loan_count >= 10 ? 'Très populaire' :
          book.loan_count >= 5 ? 'Populaire' :
          'Modéré'
        ])
      ];

      const booksSheet = XLSX.utils.aoa_to_sheet(booksData);
      booksSheet['!cols'] = [
        { width: 8 },  // Rang
        { width: 40 }, // Titre
        { width: 25 }, // Auteur
        { width: 15 }, // ISBN
        { width: 12 }, // Emprunts
        { width: 15 }  // Popularité
      ];

      XLSX.utils.book_append_sheet(workbook, booksSheet, 'Top Livres');
    }

    // === FEUILLE 3: UTILISATEURS LES PLUS ACTIFS ===
    if (exportData.active_users && exportData.active_users.length > 0) {
      const usersData = [
        ['UTILISATEURS LES PLUS ACTIFS DE LA BIBLIOTHÈQUE'],
        [`Mois: ${monthDescription} | Généré le: ${currentDate}`],
        [''],
        ['Nom Complet', 'Adresse Email', 'Statut Compte', 'Total Emprunts', 'Livres Retournés', 'Emprunts en Retard', 'Pénalités (FCFA)', 'Profil Utilisateur'],
        ...exportData.active_users.slice(0, 50).map((user: any) => [
          user.name || 'Nom non disponible',
          user.email || 'Email non renseigné',
          user.status === 'active' ? 'Actif' :
          user.status === 'suspended' ? 'Suspendu' :
          user.status || 'Statut inconnu',
          user.loans_count || 0,
          user.returned_count || 0,
          user.overdue_count || 0,
          (user.total_fines || 0).toLocaleString('fr-FR'),
          // Profil basé sur l'activité
          (user.loans_count || 0) >= 20 ? 'Lecteur Assidu' :
          (user.loans_count || 0) >= 10 ? 'Lecteur Régulier' :
          (user.loans_count || 0) >= 5 ? 'Lecteur Occasionnel' :
          'Nouveau Lecteur'
        ])
      ];

      const usersSheet = XLSX.utils.aoa_to_sheet(usersData);
      usersSheet['!cols'] = [
        { width: 25 }, // Nom
        { width: 30 }, // Email
        { width: 15 }, // Statut
        { width: 12 }, // Emprunts
        { width: 12 }, // Retours
        { width: 12 }, // Retard
        { width: 15 }, // Pénalités
        { width: 18 }  // Profil
      ];

      XLSX.utils.book_append_sheet(workbook, usersSheet, 'Utilisateurs Actifs');
    }

    // === FEUILLE 4: ANALYSE PAR CATÉGORIES DE LIVRES ===
    if (exportData.category_stats && exportData.category_stats.length > 0) {
      const categoryData = [
        ['RÉPARTITION DES EMPRUNTS PAR CATÉGORIE'],
        [`Mois: ${monthDescription} | Généré le: ${currentDate}`],
        [''],
        ['Catégorie de Livres', 'Livres Disponibles', 'Total Emprunts', 'Part du Total', 'Lecteurs Différents', 'Durée Moy. (jours)', 'Popularité'],
        ...exportData.category_stats.map((cat: any) => [
          cat.category || 'Catégorie non définie',
          cat.books_count || 0,
          cat.loans_count || 0,
          `${(Number(cat.percentage) || 0).toFixed(1)}%`,
          cat.unique_borrowers || 0,
          Math.round(Number(cat.avg_loan_duration) || 0),
          (Number(cat.percentage) || 0) >= 20 ? 'Très demandée' :
          (Number(cat.percentage) || 0) >= 10 ? 'Populaire' :
          (Number(cat.percentage) || 0) >= 5 ? 'Modérée' :
          'Peu demandée'
        ])
      ];

      const categorySheet = XLSX.utils.aoa_to_sheet(categoryData);
      categorySheet['!cols'] = [
        { width: 25 }, // Catégorie
        { width: 15 }, // Livres
        { width: 15 }, // Emprunts
        { width: 12 }, // Pourcentage
        { width: 15 }, // Lecteurs
        { width: 15 }, // Durée
        { width: 18 }  // Popularité
      ];

      XLSX.utils.book_append_sheet(workbook, categorySheet, 'Catégories');
    }

    // === FEUILLE 5: ÉVOLUTION MENSUELLE ===
    if (exportData.monthly_data && exportData.monthly_data.length > 0) {
      const monthlyData = [
        ['ÉVOLUTION MENSUELLE DES ACTIVITÉS'],
        [`Mois: ${monthDescription} | Généré le: ${currentDate}`],
        [''],
        ['Mois', 'Nouveaux Emprunts', 'Livres Retournés', 'Solde (Emprunts - Retours)', 'Tendance'],
        ...exportData.monthly_data.map((month: any) => {
          const loans = month.loans || 0;
          const returns = month.returns || 0;
          const balance = loans - returns;
          return [
            month.month || 'Mois non défini',
            loans,
            returns,
            balance,
            balance > 0 ? 'Hausse' : balance < 0 ? 'Baisse' : 'Stable'
          ];
        })
      ];

      const monthlySheet = XLSX.utils.aoa_to_sheet(monthlyData);
      monthlySheet['!cols'] = [
        { width: 20 }, // Mois
        { width: 18 }, // Emprunts
        { width: 18 }, // Retours
        { width: 20 }, // Solde
        { width: 15 }  // Tendance
      ];

      XLSX.utils.book_append_sheet(workbook, monthlySheet, 'Évolution');
    }

    // Générer et télécharger le fichier Excel
    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([excelBuffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Rapport_Analytics_UdM_${new Date().toISOString().slice(0, 10)}.xlsx`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Fonction d'export PDF - Version corrigée sans caractères spéciaux
  const exportToPDF = async (exportData: any) => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;
    const pageHeight = doc.internal.pageSize.height;
    const margin = 20;
    let yPosition = margin;
    const currentDate = new Date().toLocaleDateString('fr-FR');

    // Créer une description claire du mois
    const monthDescription = selectedMonth ?
      new Date(selectedMonth + '-01').toLocaleDateString('fr-FR', { year: 'numeric', month: 'long' }) :
      'Tous les mois';

    // === EN-TETE SIMPLE ET LISIBLE ===
    doc.setFontSize(18);
    doc.setTextColor(0, 128, 0); // Vert UdM
    doc.text('UNIVERSITE DES MONTAGNES', pageWidth / 2, yPosition, { align: 'center' });

    yPosition += 10;
    doc.setFontSize(14);
    doc.setTextColor(0, 0, 0);
    doc.text('RAPPORT ANALYTICS - BIBLIOTHEQUE', pageWidth / 2, yPosition, { align: 'center' });

    yPosition += 15;
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text('Rapport genere le ' + currentDate, pageWidth / 2, yPosition, { align: 'center' });

    doc.text('Mois filtre: ' + monthDescription, pageWidth / 2, yPosition + 5, { align: 'center' });

    yPosition += 20;

    // === RESUME EXECUTIF ===
    doc.setFontSize(12);
    doc.setTextColor(0, 128, 0);
    doc.text('RESUME EXECUTIF', margin, yPosition);
    yPosition += 10;

    const resumeStats = [
      ['INDICATEUR CLES', 'VALEUR', 'INTERPRETATION'],
      ['Collection totale', (exportData.statistics.total_books || 0) + ' livres', 'Taille du fonds documentaire'],
      ['Utilisateurs inscrits', (exportData.statistics.total_users || 0) + ' personnes', 'Communaute de lecteurs'],
      ['Emprunts en cours', (exportData.statistics.active_loans || 0) + ' emprunts', 'Activite actuelle'],
      ['Retards a traiter', (exportData.statistics.overdue_loans || 0) + ' emprunts', 'Necessite un suivi'],
      ['Documents academiques', ((exportData.statistics.total_theses || 0) + (exportData.statistics.total_memoires || 0) + (exportData.statistics.total_stage_reports || 0)) + '', 'Theses, memoires et rapports'],
      ['Penalites en attente', (exportData.statistics.total_fines_amount || 0) + ' FCFA', 'Montant a recouvrer']
    ];

    autoTable(doc, {
      head: [resumeStats[0]],
      body: resumeStats.slice(1),
      startY: yPosition,
      theme: 'striped',
      headStyles: {
        fillColor: [0, 128, 0],
        textColor: [255, 255, 255],
        fontSize: 11,
        fontStyle: 'bold'
      },
      bodyStyles: { fontSize: 10 },
      columnStyles: {
        0: { cellWidth: 50, fontStyle: 'bold' },
        1: { cellWidth: 40, halign: 'center' },
        2: { cellWidth: 80 }
      },
      margin: { left: margin, right: margin }
    });

    yPosition = (doc as any).lastAutoTable.finalY + 20;

    // Nouvelle page si nécessaire
    if (yPosition > pageHeight - 60) {
      doc.addPage();
      yPosition = margin;
    }

    // === TOP 10 DES LIVRES LES PLUS POPULAIRES ===
    if (exportData.popular_books && exportData.popular_books.length > 0) {
      doc.setFontSize(12);
      doc.setTextColor(0, 128, 0);
      doc.text('TOP 10 DES LIVRES LES PLUS EMPRUNTES', margin, yPosition);
      yPosition += 10;

      const booksData = exportData.popular_books.slice(0, 10).map((book: any, index: number) => [
        (index + 1).toString(),
        book.title?.substring(0, 35) + (book.title?.length > 35 ? '...' : '') || 'Titre non disponible',
        book.author?.substring(0, 20) + (book.author?.length > 20 ? '...' : '') || 'Auteur inconnu',
        (book.loan_count || 0).toString(),
        (book.loan_count || 0) >= 20 ? 'Tres populaire' :
        (book.loan_count || 0) >= 10 ? 'Populaire' :
        'Modere'
      ]);

      autoTable(doc, {
        head: [['Rang', 'Titre du Livre', 'Auteur', 'Emprunts', 'Popularite']],
        body: booksData,
        startY: yPosition,
        theme: 'striped',
        headStyles: {
          fillColor: [0, 128, 0],
          textColor: [255, 255, 255],
          fontSize: 10,
          fontStyle: 'bold'
        },
        bodyStyles: { fontSize: 9 },
        columnStyles: {
          0: { cellWidth: 15, halign: 'center' },
          1: { cellWidth: 70 },
          2: { cellWidth: 45 },
          3: { cellWidth: 25, halign: 'center' },
          4: { cellWidth: 25, halign: 'center' }
        },
        margin: { left: margin, right: margin }
      });
    }

    // === PIED DE PAGE ===
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(150, 150, 150);
      doc.text('Page ' + i + ' sur ' + pageCount, pageWidth - margin, pageHeight - 10, { align: 'right' });
      doc.text('SIGB UdM - Systeme Integre de Gestion de Bibliotheque', margin, pageHeight - 10);
    }

    // Sauvegarder le PDF avec nom simple
    doc.save('Rapport_Analytics_UdM_' + new Date().toISOString().slice(0, 10) + '.pdf');
  };

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
              <Activity className="h-16 w-16 text-gray-500 mx-auto" />
            </motion.div>
            <h2 className="text-2xl font-bold text-gray-600 dark:text-gray-400 mb-4">
              {error || 'Erreur de chargement'}
            </h2>
            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Button
                variant="outline"
                className="border-gray-300 text-gray-600 hover:bg-gray-50"
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
                      <Zap className="h-4 w-4 sm:h-5 sm:w-5 text-green-500 inline" />
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


                {/* Filtre de mois spécifique - Simple et clair */}
                <motion.div
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="w-full sm:w-auto"
                >
                  <select
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(e.target.value)}
                    className="w-full sm:w-auto h-12 px-4 rounded-lg border-2 border-gray-300 bg-white text-gray-900 font-medium focus:outline-none focus:ring-2 focus:ring-green-500 hover:border-gray-400 transition-colors"
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
                        <option key={monthKey} value={monthKey}>
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
                      className="h-8 w-8 rounded-full bg-gray-100 dark:bg-gray-900 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors flex items-center justify-center text-sm font-bold"
                    >
                      ✕
                    </motion.button>
                  )}
                </motion.div>

                {/* Boutons d'export avec choix de format */}
                <div className="flex flex-col sm:flex-row gap-3">
                  <motion.div
                    whileHover={{
                      scale: 1.02,
                      boxShadow: "0 10px 30px rgba(107, 114, 128, 0.3)"
                    }}
                    whileTap={{ scale: 0.98 }}
                    className="w-full sm:w-auto"
                  >
                    <Button
                      variant="outline"
                      size="lg"
                      onClick={() => {
                        setExportFormat('pdf');
                        handleExport();
                      }}
                      disabled={exporting || !analyticsData}
                      className="w-full sm:w-auto bg-white hover:bg-gray-50 text-gray-600 border-gray-600 hover:border-gray-700 font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Download className={`h-4 w-4 mr-2 ${exporting && exportFormat === 'pdf' ? 'animate-bounce' : ''}`} />
                      {exporting && exportFormat === 'pdf' ? 'Export PDF...' : 'Exporter PDF'}
                    </Button>
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
                      onClick={() => {
                        setExportFormat('excel');
                        handleExport();
                      }}
                      disabled={exporting || !analyticsData}
                      className="w-full sm:w-auto bg-white hover:bg-gray-50 text-green-600 border-green-600 hover:border-green-700 font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Download className={`h-4 w-4 mr-2 ${exporting && exportFormat === 'excel' ? 'animate-bounce' : ''}`} />
                      {exporting && exportFormat === 'excel' ? 'Export Excel...' : 'Exporter Excel'}
                    </Button>
                  </motion.div>
                </div>

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
                                className="bg-green-600 h-2 rounded-full"
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
                    <Award className="h-5 w-5 text-green-500" />
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
                          <div className="flex-shrink-0 w-7 h-7 sm:w-8 sm:h-8 bg-gradient-to-br from-gray-400 to-gray-600 rounded-full flex items-center justify-center text-white font-bold text-xs sm:text-sm">
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
                    <GraduationCap className="h-5 w-5 text-gray-500" />
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
                          <div className="flex-shrink-0 w-7 h-7 sm:w-8 sm:h-8 bg-gradient-to-br from-gray-400 to-gray-600 rounded-full flex items-center justify-center text-white font-bold text-xs sm:text-sm">
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
                            <p className="text-base sm:text-lg font-bold text-gray-600">{doc.loans_count}</p>
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
                    <FileText className="h-5 w-5 text-green-500" />
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
                          <div className="flex-shrink-0 w-7 h-7 sm:w-8 sm:h-8 bg-gradient-to-br from-green-400 to-green-600 rounded-full flex items-center justify-center text-white font-bold text-xs sm:text-sm">
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
                            <p className="text-base sm:text-lg font-bold text-green-600">{doc.reservations_count}</p>
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
