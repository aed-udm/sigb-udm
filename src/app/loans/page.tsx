"use client";

import { useState, useEffect, useCallback } from "react";
import { useRefresh } from "@/contexts/refresh-context";
import { useReliableRefresh } from "@/hooks";
import { notifyBookReturn } from "@/hooks/useAutoRefreshOnReturn";
import { motion } from 'framer-motion';
import {
  Calendar,
  Search,
  Plus,
  Filter,
  Download,
  RotateCcw,
  AlertCircle,
  CheckCircle,
  Clock,
  User,
  Users,
  BookOpen,
  Loader2,
  AlertTriangle,
  RefreshCw,
  Calculator,
  CreditCard,
  Eye,
  Mail,
  BookMarked,
  GraduationCap,
  FileText,
  Briefcase
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import ProtectedLayout from "@/components/layout/protected-layout";
import { formatDate, getDaysOverdue, getStatusColor } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { UnifiedStatCard } from "@/components/ui/instant-components";
import { OverdueReturnDialog } from "@/components/ui/overdue-return-dialog";
import { UnpaidPenaltiesDialog } from "@/components/ui/unpaid-penalties-dialog";
import { FcfaIcon } from "@/components/ui/fcfa-icon";

interface Loan {
  id: string;
  user_id: string;
  book_id?: string;
  academic_document_id?: string;
  document_type: 'book' | 'these' | 'memoire' | 'rapport_stage';
  loan_date: string;
  due_date: string;
  return_date?: string;
  status: 'active' | 'overdue' | 'returned' | 'completed';
  user_name: string;
  user_email: string;
  user_barcode: string;
  // Champs pour les livres
  book_title?: string;
  book_author?: string;
  book_mfn?: string;
  // Champs pour les documents académiques
  academic_title?: string;
  academic_author?: string;
  academic_degree?: string;
  days_overdue?: number;
  effective_days_overdue?: number;
  // Champs pour les pénalités
  fine_amount?: number;
  fine_paid?: boolean;
  fine_calculated_date?: string;
  daily_fine_rate?: number;
  // Champ pour vérifier les pénalités impayées
  has_unpaid_penalties?: number; // 1 si l'utilisateur a des pénalités impayées, 0 sinon
  // Champ pour les pénalités impayées (utilisé dans le dialogue de paiement)
  unpaid_penalties?: Array<{
    id: string;
    amount_fcfa: number;
    description: string;
    penalty_date: string;
    related_loan_id?: string;
  }>;
  // Champs pour les consultations sur place
  loan_type?: 'loan' | 'reading_room';
  start_time?: string;
  end_time?: string;
  reading_location?: string;
  created_at?: string;
  updated_at?: string;
}

export default function LoansPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [documentTypeFilter, setDocumentTypeFilter] = useState("");
  const [loanDateFilter, setLoanDateFilter] = useState("");
  const [loanTypeFilter, setLoanTypeFilter] = useState(""); // Nouveau filtre pour type d'opération
  const [loans, setLoans] = useState<Loan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [returningLoanId, setReturningLoanId] = useState<string | null>(null);
  const [updatingOverdue, setUpdatingOverdue] = useState(false);
  const [calculatingPenalties, setCalculatingPenalties] = useState(false);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [selectedLoanForPayment, setSelectedLoanForPayment] = useState<Loan | null>(null);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [paymentNotes, setPaymentNotes] = useState("");
  const [processingPayment, setProcessingPayment] = useState(false);

  // États pour le dialogue de retour en retard
  const [showOverdueDialog, setShowOverdueDialog] = useState(false);
  const [overdueReturnInfo, setOverdueReturnInfo] = useState<{
    loanId: string;
    bookTitle: string;
    userName: string;
    daysLate: number;
    estimatedPenalty: number;
  } | null>(null);

  // États pour le dialogue de pénalités impayées
  const [showUnpaidPenaltiesDialog, setShowUnpaidPenaltiesDialog] = useState(false);
  const [unpaidPenaltiesInfo, setUnpaidPenaltiesInfo] = useState<{
    userName: string;
    userEmail: string;
    bookTitle: string;
    unpaidPenalties: any[];
    totalAmount: number;
  } | null>(null);

  const { toast } = useToast();
  const { notifyLoanChange, notifyBookChange, subscribe } = useRefresh();

  // Fonction pour charger les emprunts depuis l'API
  const fetchLoans = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/loans?include_consultations=true');

      if (!response.ok) {
        throw new Error('Erreur lors du chargement des emprunts');
      }

      const data = await response.json();
      setLoans(data.data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue');
      toast({
        title: "Erreur",
        description: "Impossible de charger les emprunts",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  // Fonction pour mettre à jour manuellement les statuts en retard
  const handleUpdateOverdue = async () => {
    try {
      setUpdatingOverdue(true);

      const response = await fetch('/api/loans/update-overdue', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Erreur lors de la mise à jour');
      }

      const result = await response.json();

      toast({
        title: "Mise à jour réussie",
        description: result.message,
      });

      // Recharger les données
      await fetchLoans();

    } catch (error) {
      console.error('Erreur lors de la mise à jour des retards:', error);
      toast({
        title: "Erreur de mise à jour",
        description: "Impossible de mettre à jour les statuts en retard.",
        variant: "destructive",
      });
    } finally {
      setUpdatingOverdue(false);
    }
  };

  // Fonction pour exporter les emprunts en PDF
  const handleExport = async () => {
    try {
      const params = new URLSearchParams();
      params.append('format', 'pdf');

      if (searchTerm) params.append('search', searchTerm);
      if (statusFilter) params.append('status', statusFilter);

      const response = await fetch(`/api/export-operations?${params.toString()}`);

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
          description: `${filteredLoans.length} emprunts préparés pour impression/sauvegarde PDF`,
        });
      } else {
        throw new Error('Erreur lors de l\'export');
      }
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible d'exporter les emprunts en PDF",
        variant: "destructive",
      });
    }
  };

  // Fonctions utilitaires pour obtenir les informations du document
  const getDocumentTitle = (loan: Loan): string => {
    if (loan.document_type === 'book') {
      return loan.book_title || 'Titre non disponible';
    }
    return loan.academic_title || 'Titre non disponible';
  };

  const getDocumentAuthor = (loan: Loan): string => {
    if (loan.document_type === 'book') {
      return loan.book_author || 'Auteur non disponible';
    }
    return loan.academic_author || 'Auteur non disponible';
  };

  const getDocumentReference = (loan: Loan): string => {
    if (loan.document_type === 'book') {
      return loan.book_mfn || '';
    }
    return loan.academic_degree || '';
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
    onRefresh: fetchLoans,
    fallbackDelay: 2000
  });

  // Charger les emprunts au montage et s'abonner aux changements
  useEffect(() => {
    fetchLoans();

    // S'abonner aux changements d'emprunts ET de réservations avec debouncing
    const unsubscribeLoan = subscribe('loans', debouncedRefresh);
    const unsubscribeReservation = subscribe('reservations', debouncedRefresh);

    return () => {
      unsubscribeLoan();
      unsubscribeReservation();
    };
  }, [fetchLoans, subscribe, debouncedRefresh]);

  // Fonction pour vérifier les informations de retour avant confirmation
  const checkReturnInfo = async (loanId: string) => {
    try {
      const response = await fetch(`/api/loans/${loanId}/return`, {
        method: 'GET',
      });

      if (response.ok) {
        const data = await response.json();
        return data.data;
      }
      return null;
    } catch (error) {
      console.error('Error checking return info:', error);
      return null;
    }
  };

  // Fonction pour terminer une consultation sur place
  const handleCompleteConsultation = async (consultationId: string, documentTitle: string, userName: string) => {
    try {
      setReturningLoanId(consultationId);

      const response = await fetch(`/api/reading-room/${consultationId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'complete'
        }),
      });

      if (response.ok) {
        const data = await response.json();

        toast({
          title: "Consultation terminée",
          description: `La consultation de "${documentTitle}" par ${userName} a été terminée avec succès.`,
        });

        // Recharger la liste
        await fetchLoans();
      } else {
        const errorData = await response.json();
        toast({
          title: "Erreur",
          description: errorData.error?.message || "Erreur lors de la finalisation de la consultation",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error completing consultation:', error);
      toast({
        title: "Erreur",
        description: "Erreur lors de la finalisation de la consultation",
        variant: "destructive",
      });
    } finally {
      setReturningLoanId(null);
    }
  };

  // Fonction pour retourner un livre avec vérification prioritaire des pénalités impayées
  const handleReturnBook = async (loanId: string, bookTitle: string, userName: string) => {
    try {
      setReturningLoanId(loanId);

      // Essayer directement le retour - l'API vérifiera les pénalités impayées en premier
      const response = await fetch(`/api/loans/${loanId}/return`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const responseData = await response.json();

      if (response.ok) {
        // Retour réussi
        const toastTitle = responseData.return_info?.is_late ? "Livre retourné (en retard)" : "Livre retourné";
        const toastDescription = responseData.return_info?.is_late
          ? `"${bookTitle}" retourné avec ${responseData.return_info.days_late} jour(s) de retard. Pénalité créée.`
          : responseData.message || `"${bookTitle}" retourné par ${userName}`;

        toast({
          title: toastTitle,
          description: toastDescription,
          variant: responseData.return_info?.is_late ? "destructive" : "default",
        });

        // 🎯 NOUVEAU : Déclencher l'événement de rafraîchissement automatique
        if (responseData.refresh_required) {
          notifyBookReturn(responseData.refresh_required);
        }

        // 🚀 RAFRAÎCHISSEMENT FIABLE - Système unifié
        debouncedRefresh();
      } else {
        // CAS PRIORITAIRE : pénalités impayées (status 422 ou 400)
        if (responseData.error?.code === 'UNPAID_PENALTIES') {
          console.log('Pénalités impayées détectées:', responseData.error.details);

          setUnpaidPenaltiesInfo({
            userName: responseData.error.details.user_name,
            userEmail: responseData.error.details.user_email,
            bookTitle,
            unpaidPenalties: responseData.error.details.unpaid_penalties,
            totalAmount: responseData.error.details.total_amount
          });
          setShowUnpaidPenaltiesDialog(true);
          return;
        }

        // Autres erreurs
        toast({
          title: "Erreur",
          description: responseData.error?.message || "Erreur lors du retour du livre",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Erreur lors du retour du livre",
        variant: "destructive",
      });
    } finally {
      setReturningLoanId(null);
    }
  };

  // Fonction pour confirmer le retour en retard depuis le dialogue
  const handleConfirmOverdueReturn = async () => {
    if (!overdueReturnInfo) return;

    try {
      setReturningLoanId(overdueReturnInfo.loanId);
      setShowOverdueDialog(false);

      const response = await fetch(`/api/loans/${overdueReturnInfo.loanId}/return`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();

        // Message spécifique pour retour en retard
        toast({
          title: "Livre retourné (en retard)",
          description: `"${overdueReturnInfo.bookTitle}" retourné avec ${data.return_info.days_late} jour(s) de retard. ${data.return_info.penalty_created ? 'Pénalité créée.' : 'Erreur pénalité.'}`,
          variant: "destructive",
        });

        // 🚀 RAFRAÎCHISSEMENT FIABLE - Système unifié
        debouncedRefresh();
      } else {
        const errorData = await response.json();

        // Cas spécial : pénalités impayées (même dans le retour en retard)
        if (errorData.error?.code === 'UNPAID_PENALTIES') {
          setUnpaidPenaltiesInfo({
            userName: errorData.error.details.user_name,
            userEmail: errorData.error.details.user_email,
            bookTitle: overdueReturnInfo.bookTitle,
            unpaidPenalties: errorData.error.details.unpaid_penalties,
            totalAmount: errorData.error.details.total_amount
          });
          setShowUnpaidPenaltiesDialog(true);
          return;
        }

        toast({
          title: "Erreur",
          description: errorData.error?.message || "Erreur lors du retour du livre",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Erreur lors du retour du livre",
        variant: "destructive",
      });
    } finally {
      setReturningLoanId(null);
      setOverdueReturnInfo(null);
    }
  };

  // Fonction pour ouvrir le dialogue de paiement depuis les pénalités impayées
  const handlePayPenaltiesFromDialog = () => {
    if (!unpaidPenaltiesInfo) return;

    console.log('💳 Ouverture du dialogue de paiement pour pénalités impayées');

    // Fermer le dialogue des pénalités impayées
    setShowUnpaidPenaltiesDialog(false);

    // Créer un loan fictif pour le dialogue de paiement existant
    const fakeLoan: Loan = {
      id: unpaidPenaltiesInfo.unpaidPenalties[0]?.related_loan_id || 'penalty-payment',
      user_id: '',
      book_id: '',
      academic_document_id: undefined,
      document_type: 'book',
      loan_date: '',
      due_date: '',
      return_date: undefined,
      status: 'overdue',
      user_name: unpaidPenaltiesInfo.userName,
      user_email: unpaidPenaltiesInfo.userEmail,
      user_barcode: '',
      book_title: unpaidPenaltiesInfo.bookTitle,
      book_author: '',
      book_mfn: '',
      academic_title: '',
      academic_author: '',
      academic_degree: '',
      days_overdue: 0,
      effective_days_overdue: 0,
      fine_amount: unpaidPenaltiesInfo.totalAmount,
      fine_paid: false,
      fine_calculated_date: '',
      daily_fine_rate: 100,
      created_at: '',
      updated_at: '',
      // Ajouter les informations des pénalités pour le traitement
      unpaid_penalties: unpaidPenaltiesInfo.unpaidPenalties
    };

    // Ouvrir le dialogue de paiement existant avec le montant pré-rempli
    setSelectedLoanForPayment(fakeLoan);
    setPaymentAmount(unpaidPenaltiesInfo.totalAmount.toString());
    setPaymentDialogOpen(true);

    // Réinitialiser les infos des pénalités impayées
    setUnpaidPenaltiesInfo(null);
  };

  // Fonction pour calculer les pénalités
  const handleCalculatePenalties = async () => {
    try {
      setCalculatingPenalties(true);

      const response = await fetch('/api/penalties/calculate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();

        // Recharger la liste des emprunts pour afficher les pénalités mises à jour
        await fetchLoans();

        toast({
          title: "Pénalités calculées",
          description: `${data.data.stats?.total_fines_count} pénalité(s) calculée(s) pour un montant total de ${data.data.stats?.total_fines_amount} FCFA`,
        });
      } else {
        const errorData = await response.json();
        toast({
          title: "Erreur",
          description: errorData.error || "Erreur lors du calcul des pénalités",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Erreur lors du calcul des pénalités",
        variant: "destructive",
      });
    } finally {
      setCalculatingPenalties(false);
    }
  };

  // Fonction pour ouvrir le dialog de paiement
  const handleOpenPaymentDialog = (loan: Loan) => {
    setSelectedLoanForPayment(loan);
    setPaymentAmount(loan.fine_amount ? parseFloat(loan.fine_amount.toString()).toString() : "");
    setPaymentMethod("cash");
    setPaymentNotes("");
    setPaymentDialogOpen(true);
  };

  // Fonction pour enregistrer un paiement de pénalité
  const handlePayPenalty = async () => {
    if (!selectedLoanForPayment || !paymentAmount) {
      toast({
        title: "Erreur",
        description: "Veuillez saisir un montant valide",
        variant: "destructive",
      });
      return;
    }

    try {
      setProcessingPayment(true);

      // Vérifier si c'est un paiement de pénalités impayées (loan fictif avec unpaid_penalties)
      const isUnpaidPenaltiesPayment = selectedLoanForPayment.unpaid_penalties && selectedLoanForPayment.unpaid_penalties.length > 0;

      let response;

      if (isUnpaidPenaltiesPayment) {
        console.log('💳 Paiement de pénalités impayées via dialogue');

        // Utiliser la nouvelle API pour les pénalités impayées
        const penalty_ids = selectedLoanForPayment.unpaid_penalties?.map(p => p.id) || [];

        response = await fetch('/api/penalties/pay-new', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            penalty_ids: penalty_ids,
            amount_paid: parseFloat(paymentAmount),
            payment_method: paymentMethod,
            notes: paymentNotes || `Paiement de ${penalty_ids.length} pénalité(s) impayée(s)`,
            processed_by: 'Agent Bibliothèque'
          }),
        });
      } else {
        console.log(' Paiement de pénalité classique via dialogue');

        // Utiliser l'ancienne API pour les pénalités classiques
        response = await fetch('/api/penalties/pay', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            loan_id: selectedLoanForPayment.id,
            amount_paid: parseFloat(paymentAmount),
            payment_method: paymentMethod,
            notes: paymentNotes,
            processed_by: 'Agent Bibliothèque'
          }),
        });
      }

      if (response.ok) {
        const data = await response.json();

        toast({
          title: "Paiement enregistré",
          description: data.message || `Paiement de ${parseFloat(paymentAmount).toLocaleString()} FCFA enregistré avec succès`,
        });

        // Fermer le dialog
        setPaymentDialogOpen(false);
        setSelectedLoanForPayment(null);
        setPaymentAmount("");
        setPaymentNotes("");

        // 🎯 RAFRAÎCHISSEMENT FORCÉ APRÈS PAIEMENT DE PÉNALITÉS
        console.log('🔄 Rafraîchissement forcé après paiement de pénalités...');

        // Rafraîchissement immédiat
        await fetchLoans();

        // Rafraîchissement supplémentaire après 1 seconde pour s'assurer que la DB est à jour
        setTimeout(async () => {
          console.log('🔄 Rafraîchissement de sécurité après paiement...');
          await fetchLoans();
        }, 1000);
      } else {
        const errorData = await response.json();
        toast({
          title: "Erreur",
          description: errorData.error || "Erreur lors de l'enregistrement du paiement",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('❌ Erreur paiement:', error);
      toast({
        title: "Erreur",
        description: "Erreur lors de l'enregistrement du paiement",
        variant: "destructive",
      });
    } finally {
      setProcessingPayment(false);
    }
  };

  const filteredLoans = loans.filter(loan => {
    const documentTitle = getDocumentTitle(loan);
    const documentAuthor = getDocumentAuthor(loan);
    const documentRef = getDocumentReference(loan);

    const matchesSearch = loan.user_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         documentTitle.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         documentAuthor.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         loan.user_barcode.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         documentRef.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         getDocumentTypeLabel(loan.document_type).toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = !statusFilter || loan.status === statusFilter;
    const matchesDocumentType = !documentTypeFilter || loan.document_type === documentTypeFilter;
    const matchesLoanType = !loanTypeFilter ||
      (loanTypeFilter === 'loan' && (!loan.loan_type || loan.loan_type === 'loan')) ||
      (loanTypeFilter === 'reading_room' && loan.loan_type === 'reading_room');

    // Filtrage par période d'emprunt
    const matchesLoanDate = !loanDateFilter || (() => {
      const loanDate = new Date(loan.loan_date);
      const now = new Date();

      switch (loanDateFilter) {
        case 'today':
          return loanDate.toDateString() === now.toDateString();
        case 'week':
          const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          return loanDate >= weekAgo;
        case 'month':
          const monthAgo = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
          return loanDate >= monthAgo;
        case 'quarter':
          const quarterAgo = new Date(now.getFullYear(), now.getMonth() - 3, now.getDate());
          return loanDate >= quarterAgo;
        case 'year':
          const yearAgo = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
          return loanDate >= yearAgo;
        default:
          return true;
      }
    })();

    return matchesSearch && matchesStatus && matchesDocumentType && matchesLoanDate && matchesLoanType;
  });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "active":
        return <Clock className="h-4 w-4" />;
      case "overdue":
        return <AlertCircle className="h-4 w-4" />;
      case "returned":
        return <CheckCircle className="h-4 w-4" />;
      default:
        return <Calendar className="h-4 w-4" />;
    }
  };

  // Fonction getStatusColor supprimée - utilise l'utilitaire unifié de src/lib/utils.ts

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "active":
        return "En cours";
      case "overdue":
        return "En retard";
      case "returned":
        return "Retourné";
      case "completed":
        return "Terminé";
      default:
        return status;
    }
  };

  return (
    <ProtectedLayout>
      <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-gray-50 dark:from-gray-900 dark:via-gray-800 dark:to-green-900 relative overflow-hidden">
        {/* Header professionnel RESPONSIVE */}
        <motion.div
          className="glass-nav shadow-lg border-b border-white/20 dark:border-gray-700/20 relative overflow-hidden bg-white/95 dark:bg-gray-900/95 backdrop-blur-md"
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.6 }}
        >
          {/* Effet glassmorphism background */}
          <div className="absolute inset-0 bg-gradient-to-r from-green-500/5 via-transparent to-gray-500/5" />
          <div className="relative z-10 container mx-auto px-2 sm:px-4 lg:px-6 py-4 sm:py-6 lg:py-8">
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
                  <Calendar className="h-8 w-8 sm:h-10 sm:w-10 lg:h-12 lg:w-12 text-green-600 drop-shadow-lg" />
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
                    className="absolute -inset-1 sm:-inset-2"
                  >
                    <BookOpen className="h-3 w-3 sm:h-4 sm:w-4 text-blue-500 absolute top-0 right-0" />
                    <Users className="h-2 w-2 sm:h-3 sm:w-3 text-green-500 absolute bottom-0 left-0" />
                  </motion.div>
                </motion.div>

                <div className="min-w-0 flex-1">
                  <motion.h1
                    className="text-2xl sm:text-3xl lg:text-4xl xl:text-5xl font-bold bg-gradient-to-r from-slate-800 via-green-600 to-slate-800 dark:from-slate-200 dark:via-green-400 dark:to-slate-200 bg-clip-text text-transparent"
                    initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
                    transition={{ duration: 0.8, delay: 0.4 }}
                  >
                    Gestion des Emprunts
                  </motion.h1>
                  <motion.div
                    className="text-sm sm:text-base lg:text-lg text-gray-600 dark:text-gray-300 mt-1 sm:mt-2 font-medium"
                    initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
                    transition={{ duration: 0.8, delay: 0.6 }}
                  >
                    Suivez les emprunts et retours avec efficacité
                    <motion.span
                      animate={{ scale: [1, 1.1, 1] }}
                      transition={{ duration: 3, repeat: Infinity }}
                      className="inline-block ml-2 sm:ml-3"
                    >
                      <BookOpen className="h-4 w-4 sm:h-5 sm:w-5 text-amber-500 inline" />
                    </motion.span>
                  </motion.div>
                </div>
              </motion.div>

              <motion.div
                className="flex flex-col sm:flex-row gap-2 sm:gap-3 lg:gap-4"
                initial={{ opacity: 0, x: 30 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6, delay: 0.8 }}
              >
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
                    size="sm"
                    className="w-full sm:w-auto bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 hover:bg-gray-200 dark:hover:bg-gray-600 hover:border-green-400 dark:hover:border-green-500 font-medium text-xs sm:text-sm text-gray-900 dark:text-gray-100 transition-all duration-200"
                    onClick={handleExport}
                  >
                    <Download className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
                    <span className="hidden sm:inline">Télécharger liste en PDF ({filteredLoans.length})</span>
                    <span className="sm:hidden">PDF ({filteredLoans.length})</span>
                  </Button>
                </motion.div>

                <motion.div
                  whileHover={{
                    scale: 1.02,
                    boxShadow: "0 10px 30px rgba(255, 165, 0, 0.3)"
                  }}
                  whileTap={{ scale: 0.98 }}
                  className="w-full sm:w-auto"
                >
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full sm:w-auto bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 hover:bg-gray-200 dark:hover:bg-gray-600 hover:border-gray-400 dark:hover:border-gray-500 font-medium text-gray-700 dark:text-gray-300 text-xs sm:text-sm transition-all duration-200"
                    onClick={handleUpdateOverdue}
                    disabled={updatingOverdue}
                  >
                    {updatingOverdue ? (
                      <Loader2 className="h-4 w-4 sm:h-5 sm:w-5 mr-2 animate-spin" />
                    ) : (
                      <AlertTriangle className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
                    )}
                    <span className="hidden sm:inline">{updatingOverdue ? 'Mise à jour...' : 'Détecter retards'}</span>
                    <span className="sm:hidden">{updatingOverdue ? 'MAJ...' : 'Retards'}</span>
                  </Button>
                </motion.div>

                <motion.div
                  whileHover={{
                    scale: 1.02,
                    boxShadow: "0 15px 40px rgba(34, 197, 94, 0.4)"
                  }}
                  whileTap={{ scale: 0.98 }}
                  className="w-full sm:w-auto"
                >
                  <Button asChild size="sm" className="w-full sm:w-auto bg-gradient-to-r from-slate-800 to-green-600 hover:from-slate-900 hover:to-green-700 text-white font-semibold shadow-lg text-xs sm:text-sm">
                    <Link href="/loans/new" className="flex items-center justify-center">
                      <motion.span
                        animate={{ x: [0, 2, 0] }}
                        transition={{ duration: 3, repeat: Infinity }}
                        className="flex items-center"
                      >
                        <Plus className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
                        <span className="hidden sm:inline">Nouvel emprunt</span>
                        <span className="sm:hidden">Nouveau</span>
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
                    onClick={fetchLoans}
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

        <div className="container mx-auto px-2 sm:px-4 py-4 sm:py-6 lg:py-8">
          {/* Filters RESPONSIVE */}
          <Card className="mb-4 sm:mb-6">
            <CardHeader className="pb-3 sm:pb-6">
              <CardTitle className="text-base sm:text-lg">Filtres et Recherche</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3 sm:gap-4">
                <div className="sm:col-span-2 lg:col-span-1 xl:col-span-2">
                  <Label htmlFor="search" className="text-sm">Rechercher</Label>
                  <div className="relative mt-1">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      id="search"
                      placeholder="Usager, livre, code-barres..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10 text-sm"
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="status" className="text-sm">Statut</Label>
                  <select
                    id="status"
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="w-full h-9 sm:h-10 px-3 mt-1 rounded-md border border-gray-300 bg-white text-sm ring-offset-white focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                  >
                    <option value="" className="bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100">Tous les statuts</option>
                    <option value="active" className="bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100">En cours</option>
                    <option value="overdue" className="bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100">En retard</option>
                    <option value="returned" className="bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100">Retournés</option>
                  </select>
                </div>
                <div>
                  <Label htmlFor="documentType" className="text-sm">Type de document</Label>
                  <select
                    id="documentType"
                    value={documentTypeFilter}
                    onChange={(e) => setDocumentTypeFilter(e.target.value)}
                    className="w-full h-9 sm:h-10 px-3 mt-1 rounded-md border border-gray-300 bg-white text-sm ring-offset-white focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                  >
                    <option value="" className="bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100">Tous les types</option>
                    <option value="book" className="bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100">Livres</option>
                    <option value="thesis" className="bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100">Thèses</option>
                    <option value="memoire" className="bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100">Mémoires</option>
                    <option value="rapport_stage" className="bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100">Rapports de stage</option>
                  </select>
                </div>
                <div>
                  <Label htmlFor="loanType" className="text-sm">Type d'opération</Label>
                  <select
                    id="loanType"
                    value={loanTypeFilter}
                    onChange={(e) => setLoanTypeFilter(e.target.value)}
                    className="w-full h-9 sm:h-10 px-3 mt-1 rounded-md border border-gray-300 bg-white text-sm ring-offset-white focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                  >
                    <option value="" className="bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100">Tous les types</option>
                    <option value="loan" className="bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100">Emprunts à domicile</option>
                    <option value="reading_room" className="bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100">Consultations sur place</option>
                  </select>
                </div>
                <div>
                  <Label htmlFor="loanDate" className="text-sm">Période d'emprunt</Label>
                  <select
                    id="loanDate"
                    value={loanDateFilter}
                    onChange={(e) => setLoanDateFilter(e.target.value)}
                    className="w-full h-9 sm:h-10 px-3 mt-1 rounded-md border border-gray-300 bg-white text-sm ring-offset-white focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                  >
                    <option value="" className="bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100">Toutes les périodes</option>
                    <option value="today" className="bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100">Aujourd'hui</option>
                    <option value="week" className="bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100">Cette semaine</option>
                    <option value="month" className="bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100">Ce mois</option>
                    <option value="quarter" className="bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100">Ce trimestre</option>
                    <option value="year" className="bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100">Cette année</option>
                  </select>
                </div>
                <div className="flex items-end gap-2">
                  <Button
                    variant="outline"
                    className="flex-1 h-9 sm:h-10 text-sm"
                    onClick={handleCalculatePenalties}
                    disabled={calculatingPenalties}
                  >
                    {calculatingPenalties ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Calculator className="h-4 w-4 mr-2" />
                    )}
                    <span className="hidden sm:inline">Calculer pénalités</span>
                    <span className="sm:hidden">Pénalités</span>
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Stats avec animations spectaculaires RESPONSIVE */}
          <motion.div
            className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4 lg:gap-6 mb-4 sm:mb-6 lg:mb-8"
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 1 }}
          >
            {[
              {
                value: loans.filter(l => (l.status === "active" || l.status === "overdue") && (!l.loan_type || l.loan_type === 'loan')).length,
                label: "Emprunts actifs",
                color: "green",
                icon: Calendar,
                gradient: "from-green-500 to-green-600"
              },
              {
                value: loans.filter(l => (l.status === "active" || l.status === "overdue") && l.loan_type === 'reading_room').length,
                label: "Consultations actives",
                color: "gray",
                icon: BookOpen,
                gradient: "from-gray-500 to-gray-600"
              },
              {
                value: loans.filter(l => l.status === "returned" || l.status === "completed").length,
                label: "Terminés",
                color: "green",
                icon: CheckCircle,
                gradient: "from-green-500 to-green-600"
              },
              {
                value: loans.length,
                label: "Total opérations",
                color: "red",
                icon: Users,
                gradient: "from-red-500 to-red-600"
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

          {/* Loans List */}
          <Card>
            <CardHeader>
              <CardTitle>Liste des Emprunts ({filteredLoans.length})</CardTitle>
              <CardDescription>
                Gérez les emprunts et retours de votre bibliothèque
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
                      Chargement des emprunts...
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
              ) : filteredLoans.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-600 dark:text-gray-300">Aucun emprunt trouvé</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredLoans.map((loan, index) => (
                  <motion.div
                    key={loan.id}
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
                            {/* Badge du type d'opération - Design uniforme */}
                            {loan.loan_type === 'reading_room' ? (
                              <div className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium self-center sm:self-auto bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200">
                                <BookOpen className="h-3 w-3 mr-1" />
                                Consultation sur place
                              </div>
                            ) : (
                              <div className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium self-center sm:self-auto bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200">
                                <BookMarked className="h-3 w-3 mr-1" />
                                Emprunt à domicile
                              </div>
                            )}

                            {/* Badge du statut */}
                            <div className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium self-center sm:self-auto ${getStatusColor(loan.status, 'solid')}`}>
                              {getStatusIcon(loan.status)}
                              <span className="ml-1">{getStatusLabel(loan.status)}</span>
                            </div>
                            {loan.status === "overdue" && (
                              <span className="text-red-600 text-sm font-medium text-center sm:text-left">
                                {loan.effective_days_overdue && loan.effective_days_overdue > 0
                                  ? `${loan.effective_days_overdue} jour(s) de retard effectif`
                                  : `En période de grâce (${loan.days_overdue || getDaysOverdue(loan.due_date)} jour(s) depuis échéance)`
                                }
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
                                  {loan.user_name}
                                </p>
                                <p className="text-sm text-gray-600 dark:text-gray-300">
                                  {loan.user_barcode} • {loan.user_email}
                                </p>
                              </div>
                            </div>
                          </div>

                          <div className="space-y-2">
                            <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-2 space-y-2 sm:space-y-0">
                              <BookOpen className="h-4 w-4 text-gray-400 self-center sm:self-auto" />
                              <div className="text-center sm:text-left">
                                <p className="font-medium text-gray-900 dark:text-white">
                                  {getDocumentTitle(loan)}
                                </p>
                                <p className="text-sm text-gray-600 dark:text-gray-300">
                                  {getDocumentAuthor(loan)} • {getDocumentReference(loan)}
                                </p>
                                <p className="text-xs text-green-600 dark:text-green-400 font-medium">
                                  {getDocumentTypeLabel(loan.document_type)}
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm text-gray-600 dark:text-gray-400">
                          <div className="text-center sm:text-left">
                            <p><strong>{loan.loan_type === 'reading_room' ? 'Consultation:' : 'Emprunt:'}</strong> {formatDate(loan.loan_date)}</p>
                          </div>
                          {loan.loan_type === 'reading_room' ? (
                            <>
                              <div className="text-center sm:text-left">
                                <p><strong>Heure début:</strong> {loan.start_time || 'N/A'}</p>
                              </div>
                              <div className="text-center sm:text-left">
                                {loan.end_time ? (
                                  <p><strong>Terminée à:</strong> {loan.end_time}</p>
                                ) : (
                                  <p className="text-green-600 font-medium"><strong>En cours</strong></p>
                                )}
                              </div>
                            </>
                          ) : (
                            <>
                              <div className="text-center sm:text-left">
                                <p><strong>Retour prévu:</strong> {loan.due_date ? formatDate(loan.due_date) : 'N/A'}</p>
                              </div>
                              <div className="text-center sm:text-left">
                                {loan.return_date ? (
                                  <p><strong>Retourné le:</strong> {formatDate(loan.return_date)}</p>
                                ) : (
                                  <p className="text-yellow-600"><strong>Non retourné</strong></p>
                                )}
                              </div>
                            </>
                          )}
                        </div>

                        {/* Informations supplémentaires pour consultations */}
                        {loan.loan_type === 'reading_room' && loan.reading_location && (
                          <div className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                            <p><strong>Lieu:</strong> {loan.reading_location}</p>
                          </div>
                        )}

                        {/* Affichage des pénalités */}
                        {loan.fine_amount && parseFloat(loan.fine_amount.toString()) > 0 && (
                          <div className="mt-4 p-3 bg-red-50 dark:bg-red-800/90 border border-red-200 dark:border-red-800 rounded-lg">
                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-2 sm:space-y-0">
                              <div className="flex items-center space-x-2">
                                <FcfaIcon className="h-4 w-4 text-red-600 dark:text-red-400" />
                                <span className="text-sm font-medium text-red-800 dark:text-red-200">
                                  Pénalité: {parseFloat(loan.fine_amount.toString()).toLocaleString()} FCFA
                                </span>
                                {loan.fine_paid && (
                                  <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 dark:bg-green-800/90 dark:text-green-300 dark:border-green-800">
                                    Payée
                                  </Badge>
                                )}
                              </div>
                              {!loan.fine_paid && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="text-red-600 border-red-300 hover:bg-red-50 dark:text-red-400 dark:border-red-700 dark:hover:bg-red-900/20"
                                  onClick={() => handleOpenPaymentDialog(loan)}
                                >
                                  <CreditCard className="h-4 w-4 mr-2" />
                                  Enregistrer paiement
                                </Button>
                              )}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Bouton d'action - responsive */}
                      <div className="flex justify-center lg:justify-end lg:ml-4">
                        {loan.status !== "returned" && loan.status !== "completed" && (
                          loan.loan_type === 'reading_room' ? (
                            // Bouton pour terminer consultation - Charte UdM (vert)
                            <Button
                              size="sm"
                              className="w-full sm:w-auto bg-green-600 hover:bg-green-700 text-white border-green-600 hover:text-white"
                              onClick={() => handleCompleteConsultation(loan.id, getDocumentTitle(loan), loan.user_name)}
                              disabled={returningLoanId === loan.id}
                              title="Terminer la consultation sur place"
                            >
                              {returningLoanId === loan.id ? (
                                <div className="flex items-center">
                                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                  <span>Finalisation...</span>
                                </div>
                              ) : (
                                <>
                                  <svg className="h-4 w-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/>
                                  </svg>
                                  Terminer
                                </>
                              )}
                            </Button>
                          ) : (
                            // Bouton pour retourner emprunt
                            <Button
                              size="sm"
                              variant={
                                loan.has_unpaid_penalties
                                  ? "destructive"
                                  : loan.status === "overdue"
                                    ? "destructive"
                                    : "outline"
                              }
                              className={`w-full sm:w-auto ${
                                loan.has_unpaid_penalties
                                  ? "bg-red-600 hover:bg-red-700 text-white border-red-600 hover:text-white"
                                  : loan.status === "overdue"
                                    ? "bg-red-600 hover:bg-red-700 text-white border-red-600 hover:text-white"
                                    : "bg-green-600 hover:bg-green-700 text-white border-green-600 hover:text-white"
                              }`}
                              onClick={() => handleReturnBook(loan.id, getDocumentTitle(loan), loan.user_name)}
                              disabled={returningLoanId === loan.id}
                              title={
                                loan.has_unpaid_penalties
                                  ? "Pénalités impayées - Paiement requis avant retour"
                                  : loan.status === "overdue"
                                    ? "Retour en retard - Une pénalité sera appliquée"
                                    : "Retourner le document"
                              }
                            >
                            {returningLoanId === loan.id ? (
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            ) : loan.status === "overdue" ? (
                              <AlertTriangle className="h-4 w-4 mr-2" />
                            ) : (
                              <RotateCcw className="h-4 w-4 mr-2" />
                            )}
                            {returningLoanId === loan.id
                              ? "Retour en cours..."
                              : loan.has_unpaid_penalties
                                ? "Retourner (pénalités impayées)"
                                : loan.status === "overdue"
                                  ? "Retourner (en retard)"
                                  : "Retourner"
                            }
                          </Button>
                          )
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

      {/* Dialog de paiement de pénalité */}
      <Dialog open={paymentDialogOpen} onOpenChange={setPaymentDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <CreditCard className="h-5 w-5 text-green-600" />
              <span>Enregistrer un paiement de pénalité</span>
            </DialogTitle>
            <DialogDescription>
              {selectedLoanForPayment && (
                <>
                  Emprunt: {getDocumentTitle(selectedLoanForPayment)} par {selectedLoanForPayment.user_name}
                  <br />
                  Pénalité totale: {selectedLoanForPayment.fine_amount?.toLocaleString()} FCFA
                </>
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="amount" className="text-right">
                Montant
              </Label>
              <Input
                id="amount"
                type="number"
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(e.target.value)}
                className="col-span-3"
                placeholder="Montant en FCFA"
              />
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="method" className="text-right">
                Méthode
              </Label>
              <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                <SelectTrigger className="col-span-3">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">Espèces</SelectItem>
                  <SelectItem value="bank_transfer">Virement bancaire</SelectItem>
                  <SelectItem value="mobile_money">Mobile Money</SelectItem>
                  <SelectItem value="waived">Exonération</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="notes" className="text-right">
                Notes
              </Label>
              <Input
                id="notes"
                value={paymentNotes}
                onChange={(e) => setPaymentNotes(e.target.value)}
                className="col-span-3"
                placeholder="Notes optionnelles"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setPaymentDialogOpen(false)}
              disabled={processingPayment}
            >
              Annuler
            </Button>
            <Button
              onClick={handlePayPenalty}
              disabled={processingPayment || !paymentAmount}
            >
              {processingPayment ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Enregistrement...
                </>
              ) : (
                <>
                  <CreditCard className="h-4 w-4 mr-2" />
                  Enregistrer le paiement
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialogue de confirmation pour retour en retard */}
      {overdueReturnInfo && (
        <OverdueReturnDialog
          isOpen={showOverdueDialog}
          onClose={() => {
            setShowOverdueDialog(false);
            setOverdueReturnInfo(null);
          }}
          onConfirm={handleConfirmOverdueReturn}
          bookTitle={overdueReturnInfo.bookTitle}
          userName={overdueReturnInfo.userName}
          daysLate={overdueReturnInfo.daysLate}
          estimatedPenalty={overdueReturnInfo.estimatedPenalty}
          isLoading={returningLoanId === overdueReturnInfo.loanId}
        />
      )}

      {/* Dialogue pour pénalités impayées */}
      {unpaidPenaltiesInfo && (
        <UnpaidPenaltiesDialog
          isOpen={showUnpaidPenaltiesDialog}
          onClose={() => {
            setShowUnpaidPenaltiesDialog(false);
            setUnpaidPenaltiesInfo(null);
          }}
          onPayPenalties={handlePayPenaltiesFromDialog}
          userName={unpaidPenaltiesInfo.userName}
          userEmail={unpaidPenaltiesInfo.userEmail}
          unpaidPenalties={unpaidPenaltiesInfo.unpaidPenalties}
          totalAmount={unpaidPenaltiesInfo.totalAmount}
          bookTitle={unpaidPenaltiesInfo.bookTitle}
        />
      )}
    </ProtectedLayout>
  );
}
