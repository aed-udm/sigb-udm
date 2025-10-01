"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowLeft, Edit, Trash2, User, Mail, Phone, MapPin, Calendar, CreditCard, Settings, FileText, Download } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { DarkModeButton } from "@/components/ui/dark-mode-button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import ProtectedLayout from "@/components/layout/protected-layout";
import { useToast } from "@/hooks/use-toast";
import { useRefresh } from "@/contexts/refresh-context";
import { DeleteUserConfirmationDialog } from "@/components/ui/delete-confirmation-dialog";

import { useReliableRefresh } from "@/hooks";
import { PaymentHistoryCard } from "@/components/ui/payment-history-card";

interface User {
  id: string;
  full_name: string;
  email: string;
  matricule?: string;
  phone?: string;
  address?: string;
  barcode: string;
  max_loans: number;
  is_active: boolean;
  created_at: string;
  updated_at?: string;
  // Champs pour le PDF académique
  academic_documents_pdf_path?: string;
  academic_pdf_file_type?: string;
  academic_pdf_file_size?: number;
  academic_pdf_uploaded_at?: string;
}

interface UserLoan {
  id: string;
  document_type: string;
  loan_date: string;
  due_date: string;
  status: string;
  document_title: string;
  document_author: string;
  document_reference: string;
  days_overdue: number;
  effective_days_overdue: number;
}

interface UserDetails {
  user: User;
  active_loans: UserLoan[];
  reservations: any[];
}

export default function UserDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const { subscribe } = useRefresh();
  const [user, setUser] = useState<User | null>(null);
  const [userDetails, setUserDetails] = useState<UserDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  // États pour le dialogue de suppression
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  // Fonction pour charger les données utilisateur
  const fetchUser = useCallback(async () => {
    if (!params?.id) return;

    try {
      setLoading(true);

      // Récupérer les informations de base de l'utilisateur
      const userResponse = await fetch(`/api/users/${params?.id}`);
      if (!userResponse.ok) {
        throw new Error('Utilisateur non trouvé');
      }
      const userData = await userResponse.json();
      setUser(userData.data);

      // Récupérer les détails complets (emprunts, réservations)
      const detailsResponse = await fetch(`/api/users/${params?.id}/details`);
      if (detailsResponse.ok) {
        const detailsData = await detailsResponse.json();
        setUserDetails(detailsData);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue');
      toast({
        title: "Erreur",
        description: "Impossible de charger l'utilisateur",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [params?.id, toast]);

  // Système de rafraîchissement avec debouncing
  const { debouncedRefresh } = useReliableRefresh({ onRefresh: fetchUser });

  // Charger l'utilisateur au montage et s'abonner aux changements
  useEffect(() => {
    fetchUser();

    // S'abonner aux changements d'utilisateurs avec debouncing
    const unsubscribeUser = subscribe('users', debouncedRefresh);

    return () => {
      unsubscribeUser();
    };
  }, [fetchUser, subscribe, debouncedRefresh]);

  // Détecter les paramètres de refresh dans l'URL
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const refreshParam = urlParams.get('refresh');

    if (refreshParam) {
      // Forcer le rechargement des données
      fetchUser();

      // Nettoyer l'URL sans recharger la page
      const newUrl = window.location.pathname;
      window.history.replaceState({}, '', newUrl);
    }
  }, [fetchUser]);

  const handleDelete = () => {
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!user) return;

    try {
      setDeleting(true);
      const response = await fetch(`/api/users/${user.id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        toast({
          title: "Succès",
          description: "Utilisateur supprimé avec succès",
        });
        router.push('/users');
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || 'Erreur lors de la suppression');
      }
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message || "Impossible de supprimer l'utilisateur",
        variant: "destructive",
      });
    } finally {
      setDeleting(false);
      setDeleteDialogOpen(false);
    }
  };

  // Fonction pour imprimer la carte
  const handlePrintCard = async () => {
    if (!user) return;

    try {
      const response = await fetch(`/api/users/${user.id}/print-card`);
      if (response.ok) {
        const cardData = await response.json();

        // Ouvrir une nouvelle fenêtre pour l'impression avec charte UdM
        const printWindow = window.open('', '_blank');
        if (printWindow) {
          printWindow.document.write(`
            <html>
              <head>
                <title>Carte de Bibliothèque - ${cardData.data.user.full_name}</title>
                <style>
                  body {
                    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                    margin: 20px;
                    background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%);
                  }
                  .card {
                    border: 3px solid #16a34a;
                    padding: 25px;
                    max-width: 420px;
                    background: white;
                    border-radius: 12px;
                    box-shadow: 0 8px 25px rgba(22, 163, 74, 0.15);
                    position: relative;
                    overflow: hidden;
                  }
                  .card::before {
                    content: '';
                    position: absolute;
                    top: 0;
                    left: 0;
                    right: 0;
                    height: 6px;
                    background: linear-gradient(90deg, #22c55e 0%, #16a34a 50%, #15803d 100%);
                  }
                  .header {
                    text-align: center;
                    border-bottom: 2px solid #22c55e;
                    padding-bottom: 15px;
                    margin-bottom: 20px;
                    margin-top: 10px;
                  }
                  .header h2 {
                    color: #15803d;
                    font-size: 20px;
                    font-weight: bold;
                    margin: 0 0 8px 0;
                    text-transform: uppercase;
                    letter-spacing: 1px;
                  }
                  .header p {
                    color: #64748b;
                    font-size: 14px;
                    margin: 0;
                    font-weight: 500;
                  }
                  .info {
                    margin: 12px 0;
                    padding: 8px 12px;
                    background: #f8fafc;
                    border-left: 4px solid #22c55e;
                    border-radius: 4px;
                  }
                  .info strong {
                    color: #15803d;
                    font-weight: 600;
                  }
                  .barcode {
                    font-family: 'Courier New', monospace;
                    font-size: 20px;
                    text-align: center;
                    margin: 20px 0;
                    padding: 15px;
                    background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%);
                    color: white;
                    border-radius: 8px;
                    font-weight: bold;
                    letter-spacing: 2px;
                  }
                  .rules {
                    font-size: 11px;
                    margin-top: 25px;
                    padding: 15px;
                    background: #f1f5f9;
                    border-radius: 8px;
                    border: 1px solid #e2e8f0;
                  }
                  .rules strong {
                    color: #334155;
                    font-size: 12px;
                  }
                  .footer {
                    text-align: center;
                    margin-top: 20px;
                    padding-top: 15px;
                    border-top: 1px solid #e2e8f0;
                    color: #64748b;
                    font-size: 10px;
                  }
                </style>
              </head>
              <body>
                <div class="card">
                  <div class="header">
                    <h2>CARTE DE BIBLIOTHÈQUE</h2>
                    <p>Université des Montagnes</p>
                  </div>
                  <div class="info"><strong>Nom:</strong> ${cardData.data.user.full_name}</div>
                  <div class="info"><strong>Email:</strong> ${cardData.data.user.email}</div>
                  ${cardData.data.user.matricule ? `<div class="info"><strong>Matricule:</strong> ${cardData.data.user.matricule}</div>` : ''}
                  <div class="info"><strong>Code-barres:</strong> ${cardData.data.user.barcode}</div>
                  <div class="info"><strong>Limite d'emprunts:</strong> ${cardData.data.user.max_loans}</div>
                  <div class="info"><strong>Valide jusqu'au:</strong> ${cardData.data.card.valid_until}</div>
                  <div class="rules">
                    <strong>Règles de la bibliothèque:</strong><br>
                    ${cardData.data.rules.map((rule: string) => `• ${rule}`).join('<br>')}
                  </div>
                  <div class="footer">
                    Bibliothèque Universitaire - UdM © ${new Date().getFullYear()}
                  </div>
                </div>
                <script>window.print(); window.close();</script>
              </body>
            </html>
          `);
          printWindow.document.close();
        }

        toast({
          title: "Carte envoyée à l'impression",
          description: "La carte de bibliothèque a été envoyée à l'imprimante",
        });
      }
    } catch (error) {
      toast({
        title: "Erreur d'impression",
        description: "Impossible d'imprimer la carte",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <ProtectedLayout>
        <div className="container mx-auto px-4 py-8">
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
                <User className="h-12 w-12 text-green-600 mx-auto" />
              </motion.div>
              <span className="text-lg font-medium text-gray-700 dark:text-gray-100">
                Chargement de l'utilisateur...
              </span>
            </div>
          </motion.div>
        </div>
      </ProtectedLayout>
    );
  }

  if (error || !user) {
    return (
      <ProtectedLayout>
        <div className="container mx-auto px-4 py-8">
          <div className="text-center py-8">
            <p className="text-red-600 dark:text-red-400 mb-4">{error || 'Utilisateur non trouvé'}</p>
            <Button asChild variant="outline">
              <Link href="/users">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Retour à la liste
              </Link>
            </Button>
          </div>
        </div>
      </ProtectedLayout>
    );
  }

  return (
    <ProtectedLayout>
      <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-blue-50 dark:from-gray-900 dark:via-gray-800 dark:to-green-900 relative overflow-hidden">
        {/* Header professionnel avec glassmorphism */}
        <motion.div
          className="glass-nav shadow-lg border-b border-white/20 dark:border-gray-700/20 relative overflow-hidden bg-white/95 dark:bg-gray-900/95 backdrop-blur-md"
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.6 }}
        >
          {/* Effet glassmorphism background */}
          <div className="absolute inset-0 bg-gradient-to-r from-green-500/5 via-transparent to-blue-500/5" />

          <div className="relative z-10 container mx-auto px-3 sm:px-4 md:px-6 py-4 sm:py-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
              <div className="flex items-center space-x-3 sm:space-x-4">
                <Button variant="ghost" size="sm" asChild>
                  <Link href="/users">
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Retour
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
                    <User className="h-6 w-6 sm:h-8 sm:w-8 text-green-600 drop-shadow-lg" />
                  </motion.div>
                  <div>
                    <motion.h1
                      className="text-xl sm:text-2xl md:text-3xl font-bold bg-gradient-to-r from-slate-800 via-green-600 to-slate-800 dark:from-slate-200 dark:via-green-400 dark:to-slate-200 bg-clip-text text-transparent"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.4, delay: 0.1 }}
                    >
                      Profil Utilisateur
                    </motion.h1>
                    <motion.p
                      className="text-sm sm:text-base text-gray-700 dark:text-gray-100 mt-1 font-medium"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.4, delay: 0.2 }}
                    >
                      Informations détaillées de l'utilisateur
                    </motion.p>
                  </div>
                </div>
              </div>

              <motion.div
                className="flex flex-col sm:flex-row gap-2 sm:gap-3"
                initial={{ opacity: 0, x: 30 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6, delay: 0.3 }}
              >
                <DarkModeButton asChild variant="outline" buttonType="action">
                  <Link href={`/users/${user.id}/edit`}>
                    <Edit className="h-4 w-4 mr-2" />
                    Modifier
                  </Link>
                </DarkModeButton>
                <Button
                  variant="outline"
                  onClick={handlePrintCard}
                  className="border-purple-300 text-purple-700 hover:bg-purple-50 dark:border-purple-600 dark:text-purple-300 dark:hover:bg-purple-900/30"
                >
                  <CreditCard className="h-4 w-4 mr-2" />
                  Imprimer carte
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleDelete}
                  disabled={deleting}
                  className="bg-red-600 hover:bg-red-700 text-white font-semibold"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  {deleting ? 'Suppression...' : 'Supprimer'}
                </Button>
              </motion.div>
            </div>
          </div>
        </motion.div>

        <div className="container mx-auto px-4 py-8">

        {/* Contenu principal */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          <Card>
            <CardHeader>
              <div className="flex items-start space-x-4">
                <motion.div
                  animate={{ scale: [1, 1.05, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                >
                  <User className="h-8 w-8 text-green-600" />
                </motion.div>
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2">
                    <CardTitle className="text-2xl">{user.full_name}</CardTitle>
                    <Badge variant={user.is_active ? "default" : "destructive"}>
                      {user.is_active ? 'Actif' : 'Inactif'}
                    </Badge>
                  </div>
                  <CardDescription className="text-lg">
                    Matricule: <strong>{user.matricule || user.barcode}</strong>
                  </CardDescription>
                </div>
              </div>
            </CardHeader>

            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Informations de contact */}
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-semibold mb-4 flex items-center">
                      <Mail className="h-5 w-5 mr-2 text-green-600" />
                      Informations de contact
                    </h3>
                    <div className="space-y-2 text-sm">
                      <p><strong>Email:</strong> {user.email}</p>
                      {user.matricule && <p><strong>Matricule:</strong> <span className="font-mono">{user.matricule}</span></p>}
                      {user.phone && <p><strong>Téléphone:</strong> {user.phone}</p>}
                      {user.address && (
                        <div>
                          <strong>Adresse:</strong>
                          <p className="mt-1 text-gray-700 dark:text-gray-100">{user.address}</p>
                        </div>
                      )}
                    </div>
                  </div>

                  <div>
                    <h3 className="text-lg font-semibold mb-4 flex items-center">
                      <Calendar className="h-5 w-5 mr-2 text-green-600" />
                      Informations temporelles
                    </h3>
                    <div className="space-y-2 text-sm">
                      <p><strong>Inscrit le:</strong> {new Date(user.created_at).toLocaleDateString('fr-FR')}</p>
                      {user.updated_at && (
                        <p><strong>Modifié le:</strong> {new Date(user.updated_at).toLocaleDateString('fr-FR')}</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Paramètres et statistiques */}
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-semibold mb-4 flex items-center">
                      <Settings className="h-5 w-5 mr-2 text-purple-600" />
                      Paramètres du compte
                    </h3>
                    <div className="space-y-2 text-sm">
                      <p><strong>Emprunts maximum:</strong> {user.max_loans}</p>
                      <p><strong>Réservations maximum:</strong> {user.max_reservations || 3}</p>
                      <p><strong>Statut:</strong>
                        <span className={user.is_active ? 'text-green-600 font-semibold' : 'text-red-600 font-semibold'}>
                          {' '}{user.is_active ? 'Actif' : 'Inactif'}
                        </span>
                      </p>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-lg font-semibold mb-4 flex items-center">
                      <CreditCard className="h-5 w-5 mr-2 text-orange-600" />
                      Identification
                    </h3>
                    <div className="space-y-2 text-sm">
                      <p><strong>ID utilisateur:</strong> {user.id}</p>
                      <p><strong>Matricule:</strong>
                        <span className="font-mono bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded ml-2">
                          {user.matricule || user.barcode}
                        </span>
                      </p>
                      <p><strong>Code-barres:</strong>
                        <span className="font-mono bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded ml-2">
                          {user.barcode}
                        </span>
                      </p>
                    </div>
                  </div>
                </div>
              </div>


              {/* Section des emprunts actifs */}
              <div className="mt-8">
                <h3 className="text-lg font-semibold mb-4 flex items-center">
                  <Calendar className="h-5 w-5 mr-2 text-green-600" />
                  Emprunts actifs ({userDetails?.active_loans?.length || 0})
                </h3>

                {userDetails?.active_loans && userDetails.active_loans.length > 0 ? (
                  <div className="space-y-3">
                    {userDetails.active_loans.map((loan) => (
                      <div key={loan.id} className="p-4 border rounded-lg bg-white dark:bg-gray-800">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <h4 className="font-semibold text-gray-900 dark:text-gray-100">
                              {loan.document_title}
                            </h4>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                              {loan.document_author}
                            </p>
                            <div className="flex items-center gap-4 mt-2 text-sm">
                              <span className="text-gray-500">
                                Type: {loan.document_type === 'book' ? 'Livre' :
                                      loan.document_type === 'these' ? 'Thèse' :
                                      loan.document_type === 'memoire' ? 'Mémoire' : 'Rapport de stage'}
                              </span>
                              <span className="text-gray-500">
                                Emprunté le: {new Date(loan.loan_date).toLocaleDateString('fr-FR')}
                              </span>
                              <span className="text-gray-500">
                                À retourner le: {new Date(loan.due_date).toLocaleDateString('fr-FR')}
                              </span>
                            </div>
                          </div>
                          <div className="flex flex-col items-end gap-2">
                            <Badge
                              variant={loan.status === 'active' ? 'default' :
                                      loan.status === 'overdue' ? 'destructive' : 'secondary'}
                            >
                              {loan.status === 'active' ? 'Actif' :
                               loan.status === 'overdue' ? 'En retard' : loan.status}
                            </Badge>
                            {loan.status === 'overdue' && (
                              <span className="text-xs text-red-600 font-medium">
                                {loan.effective_days_overdue && loan.effective_days_overdue > 0
                                  ? `${loan.effective_days_overdue} jour${loan.effective_days_overdue > 1 ? 's' : ''} de retard effectif`
                                  : `En période de grâce (${loan.days_overdue} jour${loan.days_overdue > 1 ? 's' : ''} depuis échéance)`
                                }
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg text-center">
                    <p className="text-gray-600 dark:text-gray-400">
                      Aucun emprunt actif
                    </p>
                  </div>
                )}
              </div>

              {/* Section historique des paiements */}
              <div className="mt-8">
                <PaymentHistoryCard
                  userId={user.id}
                  userName={user.full_name}
                  className="w-full"
                />
              </div>
            </CardContent>
          </Card>
        </motion.div>
        </div>
      </div>

      {/* Dialogue de confirmation de suppression */}
      <DeleteUserConfirmationDialog
        isOpen={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        onConfirm={confirmDelete}
        user={user ? {
          id: user.id,
          full_name: user.full_name,
          matricule: user.matricule,
          email: user.email,
          is_active: user.is_active
        } : null}
        isLoading={deleting}
      />
    </ProtectedLayout>
  );
}
