"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { motion } from "framer-motion";
import { 
  CreditCard, 
  Calendar, 
  DollarSign, 
  FileText, 
  ChevronDown, 
  ChevronUp,
  AlertCircle,
  CheckCircle,
  Clock,
  User,
  Banknote,
  Smartphone,
  Building2,
  Gift
} from "lucide-react";

interface PaymentRecord {
  id: string;
  loan_id: string;
  amount_paid: number;
  payment_method: 'cash' | 'bank_transfer' | 'mobile_money' | 'waived';
  payment_date: string;
  notes?: string;
  processed_by: string;
  document_title?: string;
  penalty_description?: string;
  original_penalty_amount?: number;
}

interface PenaltyRecord {
  id: string;
  loan_id: string;
  amount_fcfa: number;
  penalty_date: string;
  status: 'paid' | 'unpaid' | 'partial';
  description: string;
  document_title?: string;
  total_paid?: number;
}

interface PaymentHistoryCardProps {
  userId: string;
  userName: string;
  className?: string;
}

export function PaymentHistoryCard({ userId, userName, className }: PaymentHistoryCardProps) {
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [penalties, setPenalties] = useState<PenaltyRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    fetchPaymentHistory();
  }, [userId]);

  const fetchPaymentHistory = async () => {
    try {
      setLoading(true);
      setError(null);

      // Récupérer les paiements et pénalités en parallèle
      const [paymentsResponse, penaltiesResponse] = await Promise.all([
        fetch(`/api/users/${userId}/payments`),
        fetch(`/api/users/${userId}/penalties`)
      ]);

      if (!paymentsResponse.ok || !penaltiesResponse.ok) {
        throw new Error('Erreur lors du chargement des données');
      }

      const paymentsData = await paymentsResponse.json();
      const penaltiesData = await penaltiesResponse.json();

      setPayments(paymentsData.data || []);
      setPenalties(penaltiesData.data || []);

    } catch (err) {
      setError('Erreur lors du chargement de l\'historique');
      console.error('Erreur historique paiements:', err);
    } finally {
      setLoading(false);
    }
  };

  const getPaymentMethodLabel = (method: string) => {
    const methods = {
      cash: 'Espèces',
      bank_transfer: 'Virement bancaire',
      mobile_money: 'Mobile Money',
      waived: 'Exonération'
    };
    return methods[method as keyof typeof methods] || method;
  };

  const getPaymentMethodIcon = (method: string) => {
    switch (method) {
      case 'cash': return Banknote;
      case 'bank_transfer': return Building2;
      case 'mobile_money': return Smartphone;
      case 'waived': return Gift;
      default: return CreditCard;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'decimal',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  // Calculs sécurisés avec conversion explicite en nombre
  const totalPaid = payments.reduce((sum, payment) => {
    const amount = typeof payment.amount_paid === 'string' ? parseFloat(payment.amount_paid) : payment.amount_paid;
    return sum + (isNaN(amount) ? 0 : amount);
  }, 0);

  const totalPenalties = penalties.reduce((sum, penalty) => {
    const amount = typeof penalty.amount_fcfa === 'string' ? parseFloat(penalty.amount_fcfa) : penalty.amount_fcfa;
    return sum + (isNaN(amount) ? 0 : amount);
  }, 0);

  const unpaidPenalties = penalties.filter(p => p.status === 'unpaid');
  const totalUnpaid = unpaidPenalties.reduce((sum, penalty) => {
    const amount = typeof penalty.amount_fcfa === 'string' ? parseFloat(penalty.amount_fcfa) : penalty.amount_fcfa;
    return sum + (isNaN(amount) ? 0 : amount);
  }, 0);

  if (loading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-green-600" />
            Historique financier
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-green-600" />
            Historique financier
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8 text-red-600">
            <AlertCircle className="h-5 w-5 mr-2" />
            {error}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <Card className={className}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-green-600" />
              Historique financier
            </CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setExpanded(!expanded)}
              className="flex items-center gap-2 hover:bg-green-50 dark:hover:bg-green-900/20"
            >
              {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              {expanded ? 'Réduire' : 'Développer'}
            </Button>
          </div>
        </CardHeader>

        <CardContent>
          {/* Résumé financier - Design uniforme et responsive */}
          <motion.div
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 mb-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            <div className="bg-green-50 dark:bg-green-900/20 p-3 sm:p-4 rounded-lg border border-green-200 dark:border-green-800">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0" />
                <span className="text-xs sm:text-sm font-medium text-green-700 dark:text-green-300 truncate">
                  Total payé
                </span>
              </div>
              <p className="text-lg sm:text-xl font-bold text-green-800 dark:text-green-200 break-words">
                {formatCurrency(totalPaid)} FCFA
              </p>
            </div>

            <div className="bg-red-50 dark:bg-red-900/20 p-3 sm:p-4 rounded-lg border border-red-200 dark:border-red-800">
              <div className="flex items-center gap-2 mb-2">
                <AlertCircle className="h-4 w-4 text-red-600 flex-shrink-0" />
                <span className="text-xs sm:text-sm font-medium text-red-700 dark:text-red-300 truncate">
                  Impayé
                </span>
              </div>
              <p className="text-lg sm:text-xl font-bold text-red-800 dark:text-red-200 break-words">
                {formatCurrency(totalUnpaid)} FCFA
              </p>
            </div>

            <div className="bg-gray-50 dark:bg-gray-800 p-3 sm:p-4 rounded-lg border border-gray-200 dark:border-gray-700 sm:col-span-2 lg:col-span-1">
              <div className="flex items-center gap-2 mb-2">
                <FileText className="h-4 w-4 text-gray-600 flex-shrink-0" />
                <span className="text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 truncate">
                  Paiements
                </span>
              </div>
              <p className="text-lg sm:text-xl font-bold text-gray-800 dark:text-gray-200">
                {payments.length}
              </p>
            </div>
          </motion.div>

          {expanded && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3 }}
            >
              {/* Pénalités impayées - Responsive */}
              {unpaidPenalties.length > 0 && (
                <div className="mb-4 sm:mb-6">
                  <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 text-red-600 flex-shrink-0" />
                    <span className="truncate">Pénalités impayées ({unpaidPenalties.length})</span>
                  </h4>
                  <div className="space-y-2 sm:space-y-3">
                    {unpaidPenalties.map((penalty, index) => (
                      <motion.div 
                        key={penalty.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.1 }}
                        className="bg-red-50 dark:bg-red-900/20 p-3 sm:p-4 rounded-lg border border-red-200 dark:border-red-800"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-red-800 dark:text-red-200 text-sm sm:text-base break-words">
                              {penalty.document_title || 'Document non spécifié'}
                            </p>
                            <p className="text-xs sm:text-sm text-red-600 dark:text-red-400 mt-1 break-words">
                              {penalty.description}
                            </p>
                            <div className="flex flex-wrap items-center gap-2 sm:gap-4 mt-2 text-xs text-red-600 dark:text-red-400">
                              <span className="flex items-center gap-1 flex-shrink-0">
                                <Calendar className="h-3 w-3" />
                                {formatDate(penalty.penalty_date)}
                              </span>
                            </div>
                          </div>
                          <Badge variant="destructive" className="self-start sm:ml-2 flex-shrink-0">
                            {formatCurrency(penalty.amount_fcfa)} FCFA
                          </Badge>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>
              )}

              {/* Historique des paiements - Responsive */}
              {payments.length > 0 ? (
                <div>
                  <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0" />
                    <span className="truncate">Historique des paiements ({payments.length})</span>
                  </h4>
                  <div className="space-y-2 sm:space-y-3">
                    {payments.map((payment, index) => {
                      const IconComponent = getPaymentMethodIcon(payment.payment_method);
                      return (
                        <motion.div 
                          key={payment.id}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.1 }}
                          className="bg-green-50 dark:bg-green-900/20 p-3 sm:p-4 rounded-lg border border-green-200 dark:border-green-800"
                        >
                          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-2">
                                <IconComponent className="h-4 w-4 text-green-600 flex-shrink-0" />
                                <span className="text-xs sm:text-sm font-medium text-green-800 dark:text-green-200 truncate">
                                  {getPaymentMethodLabel(payment.payment_method)}
                                </span>
                              </div>
                              <p className="font-medium text-green-800 dark:text-green-200 text-sm sm:text-base break-words">
                                {payment.document_title || 'Document non spécifié'}
                              </p>
                              <p className="text-xs sm:text-sm text-green-600 dark:text-green-400 mt-1 break-words">
                                {payment.penalty_description}
                              </p>
                              <div className="flex flex-wrap items-center gap-2 sm:gap-4 mt-2 text-xs text-green-600 dark:text-green-400">
                                <span className="flex items-center gap-1 flex-shrink-0">
                                  <Calendar className="h-3 w-3" />
                                  {formatDate(payment.payment_date)}
                                </span>
                                {payment.processed_by && (
                                  <span className="flex items-center gap-1 flex-shrink-0">
                                    <User className="h-3 w-3" />
                                    <span className="hidden sm:inline">Agent Bibliothèque</span>
                                    <span className="sm:hidden">Agent</span>
                                  </span>
                                )}
                              </div>
                              {payment.notes && (
                                <p className="text-xs text-green-600 dark:text-green-400 mt-1 italic break-words">
                                  Note: {payment.notes}
                                </p>
                              )}
                            </div>
                            <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100 self-start sm:ml-2 flex-shrink-0">
                              {formatCurrency(payment.amount_paid)} FCFA
                            </Badge>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <CreditCard className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500 dark:text-gray-400">
                    Aucun paiement enregistré
                  </p>
                </div>
              )}
            </motion.div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
