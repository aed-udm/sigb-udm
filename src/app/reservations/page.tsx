"use client";

import { useState, useEffect, useCallback } from "react";
import { motion } from 'framer-motion';
import { useRefresh } from "@/contexts/refresh-context";
import { useReliableRefresh } from "@/hooks";
import {
  Calendar,
  Search,
  Plus,
  Filter,
  Download,
  CheckCircle,
  XCircle,
  Clock,
  User,
  Users,
  BookOpen,
  Loader2,
  AlertTriangle,
  RefreshCw,
  TrendingUp
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import ProtectedLayout from "@/components/layout/protected-layout";
import { UnifiedStatCard } from "@/components/ui/instant-components";
import { formatDate, getStatusColor } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { ReservationWithDetails } from "@/types/database";

interface ReservationStats {
  active_reservations: number;
  fulfilled_reservations: number;
  expired_reservations: number;
  cancelled_reservations: number;
  total_reservations: number;
}

export default function ReservationsPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [documentTypeFilter, setDocumentTypeFilter] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("");
  const [reservations, setReservations] = useState<ReservationWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingReservation, setUpdatingReservation] = useState<string | null>(null);
  const [refreshingStats, setRefreshingStats] = useState(false);
  const [stats, setStats] = useState<ReservationStats | null>(null);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loadingNotifications, setLoadingNotifications] = useState(false);
  const { toast } = useToast();
  const { notifyReservationChange, notifyBookChange, subscribe } = useRefresh();

  // Fonction pour charger les statistiques
  const fetchStats = async () => {
    try {
      const response = await fetch('/api/reservations/stats');
      if (response.ok) {
        const data = await response.json();
        setStats(data.stats);
      }
    } catch (error) {
      console.error('Erreur lors du chargement des statistiques:', error);
    }
  };

  // Fonction pour charger les notifications
  const fetchNotifications = async () => {
    try {
      setLoadingNotifications(true);
      const response = await fetch('/api/reservations/notify');
      if (response.ok) {
        const data = await response.json();
        setNotifications(data.data || []);
      }
    } catch (error) {
      console.error('Erreur lors du chargement des notifications:', error);
    } finally {
      setLoadingNotifications(false);
    }
  };

  // Fonction pour marquer une notification comme envoyée
  const handleMarkNotificationSent = async (reservationId: string) => {
    try {
      const response = await fetch('/api/reservations/notify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ reservation_id: reservationId }),
      });

      if (response.ok) {
        toast({
          title: "Notification marquée",
          description: "La notification a été marquée comme envoyée",
        });

        // Recharger les notifications
        fetchNotifications();
      } else {
        throw new Error('Erreur lors de la mise à jour');
      }
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de marquer la notification",
        variant: "destructive",
      });
    }
  };

  // Fonction pour charger les réservations depuis l'API
  const fetchReservations = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/reservations');

      if (!response.ok) {
        throw new Error('Erreur lors du chargement des réservations');
      }

      const data = await response.json();
      setReservations(data.data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue');
      toast({
        title: "Erreur",
        description: "Impossible de charger les réservations",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  // Fonction pour actualiser manuellement les statistiques
  const handleRefreshStats = async () => {
    try {
      setRefreshingStats(true);
      await fetchStats();
      await fetchReservations();

      toast({
        title: "Actualisation réussie",
        description: "Les données ont été mises à jour",
      });

    } catch (error) {
      console.error('Erreur lors de l\'actualisation:', error);
      toast({
        title: "Erreur d'actualisation",
        description: "Impossible d'actualiser les données.",
        variant: "destructive",
      });
    } finally {
      setRefreshingStats(false);
    }
  };

  // Fonction pour exporter les réservations en PDF
  const handleExport = async () => {
    try {
      const params = new URLSearchParams();
      params.append('format', 'pdf');

      if (searchTerm) params.append('search', searchTerm);
      if (statusFilter) params.append('status', statusFilter);

      const response = await fetch(`/api/reservations/export?${params.toString()}`);

      if (response.ok) {
        const htmlContent = await response.text();

        // Ouvrir dans une nouvelle fenêtre pour impression/sauvegarde PDF
        const printWindow = window.open('', '_blank');
        if (printWindow) {
          printWindow.document.write(htmlContent);
          printWindow.document.close();

          // Attendre que le contenu soit chargé puis déclencher l'impression
          printWindow.onload = () => {
            setTimeout(() => {
              printWindow.print();
            }, 500);
          };
        }

        toast({
          title: "Export PDF réussi",
          description: `${filteredReservations.length} réservations préparées pour impression/sauvegarde PDF`,
        });
      } else {
        throw new Error('Erreur lors de l\'export');
      }
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible d'exporter les réservations en PDF",
        variant: "destructive",
      });
    }
  };

  // Fonctions utilitaires pour obtenir les informations du document
  const getDocumentTitle = (reservation: ReservationWithDetails): string => {
    if (reservation.document_type === 'book') {
      return reservation.book_title || 'Titre non disponible';
    }
    return reservation.academic_title || 'Titre non disponible';
  };

  const getDocumentAuthor = (reservation: ReservationWithDetails): string => {
    if (reservation.document_type === 'book') {
      return reservation.book_author || 'Auteur non disponible';
    }
    return reservation.academic_author || 'Auteur non disponible';
  };

  const getDocumentReference = (reservation: ReservationWithDetails): string => {
    if (reservation.document_type === 'book') {
      return reservation.book_mfn || '';
    }
    return reservation.academic_degree || '';
  };

  const getDocumentTypeLabel = (type: string): string => {
    switch (type) {
      case 'book': return 'Livre';
      case 'these': return 'Thèse';
      case 'memoire': return 'Mémoire';
      case 'rapport_stage': return 'Rapport de stage';
      default: return 'Document';
    }
  };

  // Système de rafraîchissement avec debouncing pour éviter trop de requêtes
  const { debouncedRefresh } = useReliableRefresh({
    onRefresh: fetchReservations,
    fallbackDelay: 2000
  });

  // Charger les réservations au montage et s'abonner aux changements
  useEffect(() => {
    fetchReservations();
    fetchStats();
    fetchNotifications();

    // S'abonner aux changements d'emprunts avec debouncing
    const unsubscribeLoan = subscribe('loans', debouncedRefresh);

    return () => {
      unsubscribeLoan();
    };
  }, [fetchReservations, subscribe, debouncedRefresh]);

  const filteredReservations = reservations.filter(reservation => {
    const documentTitle = getDocumentTitle(reservation);
    const documentAuthor = getDocumentAuthor(reservation);
    const documentRef = getDocumentReference(reservation);

    const matchesSearch = reservation.user_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         documentTitle.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         documentAuthor.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         reservation.user_barcode.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         documentRef.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         getDocumentTypeLabel(reservation.document_type).toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = !statusFilter || reservation.status === statusFilter;
    const matchesDocumentType = !documentTypeFilter || reservation.document_type === documentTypeFilter;

    // Logique de priorité basée sur priority_order
    let matchesPriority = true;
    if (priorityFilter) {
      if (priorityFilter === 'high' && reservation.priority_order !== 1) {
        matchesPriority = false;
      } else if (priorityFilter === 'normal' && (reservation.priority_order < 2 || reservation.priority_order > 3)) {
        matchesPriority = false;
      } else if (priorityFilter === 'low' && reservation.priority_order <= 3) {
        matchesPriority = false;
      }
    }

    return matchesSearch && matchesStatus && matchesDocumentType && matchesPriority;
  });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "active":
        return <Clock className="h-4 w-4" />;
      case "fulfilled":
        return <CheckCircle className="h-4 w-4" />;
      case "expired":
        return <AlertTriangle className="h-4 w-4" />;
      case "cancelled":
        return <XCircle className="h-4 w-4" />;
      default:
        return <Calendar className="h-4 w-4" />;
    }
  };

  // Fonction getStatusColor supprimée - utilise l'utilitaire unifié de src/lib/utils.ts

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "active":
        return "Active";
      case "fulfilled":
        return "Satisfaite";
      case "expired":
        return "Expirée";
      case "cancelled":
        return "Annulée";
      default:
        return status;
    }
  };

  // Vérifier si une réservation peut être satisfaite
  const canFulfillReservation = (reservation: any) => {
    if (reservation.status !== 'active') return false;

    // Trouver toutes les réservations pour le même document
    const documentId = reservation.book_id || reservation.academic_document_id;
    const sameDocumentReservations = reservations.filter(r =>
      r.status === 'active' &&
      (r.book_id === documentId || r.academic_document_id === documentId) &&
      r.document_type === reservation.document_type
    );

    // Trier par priorité
    sameDocumentReservations.sort((a, b) => a.priority_order - b.priority_order);

    // Seule la première réservation (priorité #1) peut être satisfaite
    return sameDocumentReservations.length > 0 && sameDocumentReservations[0].id === reservation.id;
  };

  // Fonction pour satisfaire une réservation (créer automatiquement un emprunt)
  const handleFulfillReservation = async (reservationId: string, documentTitle: string, userName: string, priorityOrder: number) => {
    try {
      setUpdatingReservation(reservationId);

      // Utiliser la nouvelle API /fulfill qui crée automatiquement un emprunt
      const response = await fetch(`/api/reservations/${reservationId}/fulfill`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();

        toast({
          title: "Réservation satisfaite - Emprunt créé",
          description: data.message || `"${documentTitle}" transformée en emprunt pour ${userName}. Un email de confirmation a été envoyé.`,
        });

        // Rafraîchissement des données
        debouncedRefresh();
      } else {
        const errorData = await response.json();
        toast({
          title: "Erreur",
          description: errorData.error?.message || "Erreur lors de la mise à jour",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Erreur lors de la mise à jour de la réservation",
        variant: "destructive",
      });
    } finally {
      setUpdatingReservation(null);
    }
  };

  // Fonction pour annuler une réservation
  const handleCancelReservation = async (reservationId: string, documentTitle: string, userName: string) => {
    try {
      setUpdatingReservation(reservationId);

      const response = await fetch(`/api/reservations/${reservationId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: 'cancelled' }),
      });

      if (response.ok) {
        const data = await response.json();

        toast({
          title: "Réservation annulée",
          description: data.message || `"${documentTitle}" annulée pour ${userName}`,
        });

        // Rafraîchissement des données
        debouncedRefresh();
      } else {
        const errorData = await response.json();
        toast({
          title: "Erreur",
          description: errorData.error?.message || "Erreur lors de l'annulation",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Erreur lors de l'annulation de la réservation",
        variant: "destructive",
      });
    } finally {
      setUpdatingReservation(null);
    }
  };

  return (
    <ProtectedLayout>
      <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-gray-50 dark:from-gray-900 dark:via-gray-800 dark:to-green-900 relative overflow-hidden">
        {/* Header professionnel avec glassmorphism */}
        <motion.div
          className="glass-nav shadow-lg border-b border-white/20 dark:border-gray-700/20 relative overflow-hidden bg-white/95 dark:bg-gray-900/95 backdrop-blur-md"
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.6 }}
        >
          {/* Effet glassmorphism background */}
          <div className="absolute inset-0 bg-gradient-to-r from-green-500/5 via-transparent to-gray-500/5" />

          <div className="relative z-10 container mx-auto px-3 sm:px-4 md:px-6 py-4 sm:py-6 md:py-7 lg:py-8">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-6 lg:space-y-0">
              <motion.div
                initial={{ opacity: 0, x: -30 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6, delay: 0.2 }}
                className="flex items-center space-x-6"
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
                  className="relative"
                >
                  <Calendar className="h-12 w-12 text-green-600 drop-shadow-lg" />
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
                    className="absolute -inset-2"
                  >
                    <BookOpen className="h-4 w-4 text-blue-500 absolute top-0 right-0" />
                    <Users className="h-3 w-3 text-green-500 absolute bottom-0 left-0" />
                  </motion.div>
                </motion.div>

                <div>
                  <motion.h1
                    className="text-xl sm:text-2xl md:text-3xl lg:text-4xl xl:text-5xl font-bold bg-gradient-to-r from-slate-800 via-green-600 to-slate-800 dark:from-slate-200 dark:via-green-400 dark:to-slate-200 bg-clip-text text-transparent"
                    initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
                    transition={{ duration: 0.8, delay: 0.4 }}
                  >
                    Gestion des Réservations
                  </motion.h1>
                  <motion.div
                    className="text-lg text-gray-600 dark:text-gray-300 mt-2 font-medium"
                    initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
                    transition={{ duration: 0.8, delay: 0.6 }}
                  >
                    Suivez les demandes et gérez les réservations
                    <motion.span
                      animate={{ scale: [1, 1.1, 1] }}
                      transition={{ duration: 3, repeat: Infinity }}
                      className="inline-block ml-3"
                    >
                      <BookOpen className="h-5 w-5 text-amber-500 inline" />
                    </motion.span>
                  </motion.div>
                </div>
              </motion.div>

              <motion.div
                className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2 md:space-x-3 lg:space-x-4 w-full sm:w-auto"
                initial={{ opacity: 0, x: 30 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6, delay: 0.8 }}
              >
                <motion.div
                  whileHover={{
                    scale: 1.02,
                    boxShadow: "0 10px 30px rgba(147, 51, 234, 0.3)"
                  }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full sm:w-auto bg-white dark:bg-gray-800 backdrop-blur-sm border-2 border-slate-300 dark:border-gray-600 hover:border-green-400 dark:hover:border-green-500 font-semibold text-xs sm:text-sm text-gray-900 dark:text-gray-100"
                    onClick={handleExport}
                  >
                    <Download className="h-4 w-4 sm:h-5 sm:w-5 mr-1 sm:mr-2" />
                    <span className="hidden sm:inline">Télécharger liste en PDF</span>
                    <span className="sm:hidden">PDF</span>
                    <span className="ml-1">({filteredReservations.length})</span>
                  </Button>
                </motion.div>

                <motion.div
                  whileHover={{
                    scale: 1.02,
                    boxShadow: "0 10px 30px rgba(255, 165, 0, 0.3)"
                  }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full sm:w-auto bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 hover:bg-gray-200 dark:hover:bg-gray-600 hover:border-gray-400 dark:hover:border-gray-500 font-medium text-gray-700 dark:text-gray-200 text-xs sm:text-sm transition-all duration-200"
                    onClick={handleRefreshStats}
                    disabled={refreshingStats}
                  >
                    {refreshingStats ? (
                      <Loader2 className="h-4 w-4 sm:h-5 sm:w-5 mr-1 sm:mr-2 animate-spin" />
                    ) : (
                      <RefreshCw className="h-4 w-4 sm:h-5 sm:w-5 mr-1 sm:mr-2" />
                    )}
                    <span className="hidden sm:inline">{refreshingStats ? 'Actualisation...' : 'Actualiser'}</span>
                    <span className="sm:hidden">{refreshingStats ? '...' : 'Sync'}</span>
                  </Button>
                </motion.div>

                <motion.div
                  whileHover={{
                    scale: 1.02,
                    boxShadow: "0 15px 40px rgba(34, 197, 94, 0.4)"
                  }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Button asChild size="sm" className="w-full sm:w-auto bg-gradient-to-r from-slate-800 to-green-600 hover:from-slate-900 hover:to-green-700 text-white font-semibold shadow-lg text-xs sm:text-sm">
                    <Link href="/reservations/new" className="flex items-center justify-center">
                      <motion.span
                        animate={{ x: [0, 2, 0] }}
                        transition={{ duration: 3, repeat: Infinity }}
                        className="flex items-center"
                      >
                        <Plus className="h-4 w-4 sm:h-5 sm:w-5 mr-1 sm:mr-2" />
                        <span className="hidden sm:inline">Nouvelle réservation</span>
                        <span className="sm:hidden">Nouvelle</span>
                      </motion.span>
                    </Link>
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
                    onClick={fetchReservations}
                    variant="outline"
                    size="sm"
                    className="w-full sm:w-auto bg-green-100 dark:bg-green-700 border border-green-300 dark:border-green-600 hover:bg-green-200 dark:hover:bg-green-600 hover:border-green-400 dark:hover:border-green-500 font-medium text-green-700 dark:text-green-200 text-xs sm:text-sm transition-all duration-200"
                  >
                    Actualiser
                  </Button>
                </motion.div>
              </motion.div>
            </div>
          </div>
        </motion.div>

        <div className="container mx-auto px-3 sm:px-4 md:px-6 py-4 sm:py-6 md:py-7 lg:py-8">
          {/* Filters - identique à l'interface d'emprunts */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="text-lg">Filtres et Recherche</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
                <div>
                  <Label htmlFor="search">Rechercher</Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      id="search"
                      placeholder="Utilisateur, document, code-barres..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="status">Statut</Label>
                  <select
                    id="status"
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="w-full h-10 px-3 rounded-md border border-gray-300 bg-white text-sm ring-offset-white focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                  >
                    <option value="" className="bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100">Tous les statuts</option>
                    <option value="active" className="bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100">Actives</option>
                    <option value="fulfilled" className="bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100">Satisfaites</option>
                    <option value="expired" className="bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100">Expirées</option>
                    <option value="cancelled" className="bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100">Annulées</option>
                  </select>
                </div>
                <div>
                  <Label htmlFor="documentType">Type de document</Label>
                  <select
                    id="documentType"
                    value={documentTypeFilter}
                    onChange={(e) => setDocumentTypeFilter(e.target.value)}
                    className="w-full h-10 px-3 rounded-md border border-gray-300 bg-white text-sm ring-offset-white focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                  >
                    <option value="" className="bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100">Tous les types</option>
                    <option value="book" className="bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100">Livres</option>
                    <option value="these" className="bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100">Thèses</option>
                    <option value="memoire" className="bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100">Mémoires</option>
                    <option value="rapport_stage" className="bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100">Rapports de stage</option>
                  </select>
                </div>
                <div>
                  <Label htmlFor="priority">Priorité</Label>
                  <select
                    id="priority"
                    value={priorityFilter}
                    onChange={(e) => setPriorityFilter(e.target.value)}
                    className="w-full h-10 px-3 rounded-md border border-gray-300 bg-white text-sm ring-offset-white focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                  >
                    <option value="" className="bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100">Toutes les priorités</option>
                    <option value="high" className="bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100">Haute</option>
                    <option value="normal" className="bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100">Normale</option>
                    <option value="low" className="bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100">Basse</option>
                  </select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Stats avec animations spectaculaires - identique à l'interface d'emprunts */}
          {stats && (
            <motion.div
              className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-4 lg:gap-6 mb-4 sm:mb-6 lg:mb-8"
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 1 }}
            >
              {[
                {
                  value: stats.active_reservations,
                  label: "Réservations actives",
                  color: "green",
                  icon: Clock,
                  gradient: "from-green-500 to-green-600"
                },
                {
                  value: stats.fulfilled_reservations,
                  label: "Satisfaites",
                  color: "green",
                  icon: CheckCircle,
                  gradient: "from-green-500 to-green-600"
                },
                {
                  value: stats.expired_reservations,
                  label: "Expirées",
                  color: "red",
                  icon: AlertTriangle,
                  gradient: "from-red-500 to-red-600"
                },
                {
                  value: stats?.total_reservations,
                  label: "Total réservations",
                  color: "gray",
                  icon: TrendingUp,
                  gradient: "from-gray-600 to-gray-700"
                }
              ].map((stat, index) => (
                <motion.div
                  key={stat.label}
                  initial={{ opacity: 0, y: 50, scale: 0.8 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{
                    duration: 0.6,
                    delay: 1.2 + index * 0.1,
                    type: "spring",
                    stiffness: 100
                  }}
                  whileHover={{
                    scale: 1.05,
                    y: -10,
                    transition: { duration: 0.2 }
                  }}
                  className="group"
                >
                  <UnifiedStatCard stat={stat} />
                </motion.div>
              ))}
            </motion.div>
          )}

          {/* Reservations List - identique à l'interface d'emprunts */}
          <Card>
            <CardHeader>
              <CardTitle>Liste des Réservations ({filteredReservations.length})</CardTitle>
              <CardDescription>
                Gérez les réservations et demandes de votre bibliothèque
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <motion.div
                  className="flex items-center justify-center py-12"
                  initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
                >
                  <div className="text-center">
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                      className="mb-4"
                    >
                      <Calendar className="h-12 w-12 text-green-600 mx-auto" />
                    </motion.div>
                    <span className="text-lg font-medium text-gray-600 dark:text-gray-300">
                      Chargement des réservations...
                    </span>
                  </div>
                </motion.div>
              ) : error ? (
                <div className="text-center py-8">
                  <p className="text-red-600 dark:text-red-400">{error}</p>
                  <Button
                    variant="outline"
                    className="mt-4"
                    onClick={() => window.location.reload()}
                  >
                    Réessayer
                  </Button>
                </div>
              ) : filteredReservations.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-600 dark:text-gray-300">Aucune réservation trouvée</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredReservations.map((reservation, index) => (
                  <motion.div
                    key={reservation.id}
                    initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
                    transition={{ duration: 0.3, delay: index * 0.1 }}
                    className="border rounded-lg p-4 hover:shadow-md transition-shadow"
                  >
                    {/* Layout responsive : stack sur mobile, flex sur desktop */}
                    <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between space-y-4 lg:space-y-0">
                      <div className="flex-1">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-3 sm:space-y-0 mb-4">
                          <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-3 space-y-2 sm:space-y-0">
                            <div className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium self-center sm:self-auto ${getStatusColor(reservation.status, 'solid')}`}>
                              {getStatusIcon(reservation.status)}
                              <span className="ml-1">{getStatusLabel(reservation.status)}</span>
                            </div>
                            {reservation.status === "expired" && (
                              <span className="text-red-600 text-sm font-medium text-center sm:text-left">
                                Expirée depuis {Math.abs(reservation.days_until_expiry)} jour(s)
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                          <div className="space-y-2">
                            <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-2 space-y-2 sm:space-y-0">
                              <User className="h-4 w-4 text-gray-400 self-center sm:self-auto" />
                              <div className="text-center sm:text-left">
                                <p className="font-medium text-gray-900 dark:text-white">
                                  {reservation.user_name}
                                </p>
                                <p className="text-sm text-gray-600 dark:text-gray-300">
                                  {reservation.user_barcode} • {reservation.user_email}
                                </p>
                              </div>
                            </div>
                          </div>

                          <div className="space-y-2">
                            <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-2 space-y-2 sm:space-y-0">
                              <BookOpen className="h-4 w-4 text-gray-400 self-center sm:self-auto" />
                              <div className="text-center sm:text-left">
                                <p className="font-medium text-gray-900 dark:text-white">
                                  {getDocumentTitle(reservation)}
                                </p>
                                <p className="text-sm text-gray-600 dark:text-gray-300">
                                  {getDocumentAuthor(reservation)} • {getDocumentReference(reservation)}
                                </p>
                                <p className="text-xs text-green-600 dark:text-green-400 font-medium">
                                  {getDocumentTypeLabel(reservation.document_type)}
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm text-gray-600 dark:text-gray-400">
                          <div className="text-center sm:text-left">
                            <p><strong>Réservation:</strong> {formatDate(reservation.reservation_date)}</p>
                          </div>
                          <div className="text-center sm:text-left">
                            <p><strong>Expire le:</strong> {formatDate(reservation.expiry_date)}</p>
                          </div>
                          {reservation.status === "active" && (
                            <div className="text-center sm:text-left">
                              <p className="flex items-center justify-center sm:justify-start gap-2">
                                <strong>Priorité:</strong>
                                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                  reservation.priority_order === 1
                                    ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 animate-pulse'
                                    : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
                                }`}>
                                  #{reservation.priority_order}

                                </span>
                                {reservation.priority_order === 1 && (
                                  <span className="text-xs text-green-600 font-medium">PROCHAIN</span>
                                )}
                              </p>
                            </div>
                          )}
                        </div>

                        {reservation.notes && (
                          <div className="mt-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-md">
                            <p className="text-sm text-gray-700 dark:text-gray-300">
                              <strong>Notes:</strong> {reservation.notes}
                            </p>
                          </div>
                        )}
                      </div>

                      {/* Boutons d'action - responsive */}
                      <div className="flex justify-center lg:justify-end lg:ml-4 space-x-2">
                        {reservation.status === "active" && (
                          <>
                            <Button
                              size="sm"
                              className={`${canFulfillReservation(reservation)
                                ? 'bg-green-600 hover:bg-green-700 text-white'
                                : 'bg-gray-400 cursor-not-allowed text-gray-600'
                              }`}
                              onClick={() => handleFulfillReservation(reservation.id, getDocumentTitle(reservation), reservation.user_name, reservation.priority_order)}
                              disabled={updatingReservation === reservation.id || !canFulfillReservation(reservation)}
                              title={!canFulfillReservation(reservation) ? `Seule la réservation de priorité #1 peut être satisfaite. Cette réservation est #${reservation.priority_order}` : 'Satisfaire cette réservation'}
                            >
                              {updatingReservation === reservation.id ? (
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              ) : (
                                <CheckCircle className="h-4 w-4 mr-2" />
                              )}
                              {updatingReservation === reservation.id ? "Traitement..." : "Satisfaire"}
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleCancelReservation(reservation.id, getDocumentTitle(reservation), reservation.user_name)}
                              disabled={updatingReservation === reservation.id}
                            >
                              <XCircle className="h-4 w-4 mr-2" />
                              Annuler
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  </motion.div>
                ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </ProtectedLayout>
  );
}
