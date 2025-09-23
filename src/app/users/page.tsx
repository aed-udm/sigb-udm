"use client";

import { useState, useEffect, useCallback } from "react";
import { motion } from 'framer-motion';
import {
  Users,
  Search,
  Plus,
  Filter,
  Download,
  Edit,
  Trash2,
  Eye,
  UserCheck,
  UserX,
  CreditCard,
  Shield,
  Calendar,
  BookOpen,
  TrendingUp,
  Award,
  Loader2
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import ProtectedLayout from "@/components/layout/protected-layout";
import { useToast } from "@/hooks/use-toast";
import { UnifiedStatCard } from "@/components/ui/instant-components";
import { useRefresh } from "@/contexts/refresh-context";
import { useReliableRefresh } from "@/hooks";
import { DeleteUserConfirmationDialog } from "@/components/ui/delete-confirmation-dialog";

interface User {
  id: string;
  full_name: string;
  email: string;
  barcode: string;
  phone?: string;
  address?: string;
  registration_date: string;
  registration_year?: number;
  is_active: boolean;
  max_loans: number;
  max_reservations: number;
  category?: string;
  level?: string;
  department?: string;
  created_at?: string;
}

export default function UsersPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [levelFilter, setLevelFilter] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("");
  const [yearFilter, setYearFilter] = useState("");
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();
  const { subscribe } = useRefresh();

  // États pour le dialogue de suppression
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Fonction pour charger les usagers depuis l'API
  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/users');

      if (!response.ok) {
        throw new Error('Erreur lors du chargement des usagers');
      }

      const data = await response.json();
      setUsers(data.data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue');
      toast({
        title: "Erreur",
        description: "Impossible de charger les usagers",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  // Système de rafraîchissement avec debouncing pour éviter trop de requêtes
  const { debouncedRefresh } = useReliableRefresh({
    onRefresh: fetchUsers,
    fallbackDelay: 2000
  });

  // Charger les utilisateurs au montage et s'abonner aux changements
  useEffect(() => {
    fetchUsers();

    // S'abonner aux changements d'emprunts et de réservations avec debouncing
    const unsubscribeLoan = subscribe('loans', debouncedRefresh);
    const unsubscribeReservation = subscribe('reservations', debouncedRefresh);

    return () => {
      unsubscribeLoan();
      unsubscribeReservation();
    };
  }, [fetchUsers, subscribe, debouncedRefresh]);

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.barcode.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = !statusFilter ||
                         (statusFilter === "active" && user.is_active) ||
                         (statusFilter === "inactive" && !user.is_active);
    const matchesCategory = !categoryFilter || user.category === categoryFilter;
    const matchesLevel = !levelFilter || user.level === levelFilter;
    const matchesDepartment = !departmentFilter || user.department === departmentFilter;
    const matchesYear = !yearFilter || user.registration_year?.toString() === yearFilter;

    return matchesSearch && matchesStatus && matchesCategory && matchesLevel && matchesDepartment && matchesYear;
  });

  // Fonction pour ouvrir le dialogue de suppression
  const handleDelete = (user: User) => {
    setUserToDelete(user);
    setDeleteDialogOpen(true);
  };

  // Fonction pour confirmer la suppression
  const confirmDelete = async () => {
    if (!userToDelete) return;

    try {
      setIsDeleting(true);
      const response = await fetch(`/api/users/${userToDelete.id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        toast({
          title: "Succès",
          description: "Utilisateur supprimé avec succès",
        });

        // 🚀 RAFRAÎCHISSEMENT FIABLE - Mise à jour immédiate + notifications
        fetchUsers();

        // Fermer le dialogue
        setDeleteDialogOpen(false);
        setUserToDelete(null);
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
      setIsDeleting(false);
    }
  };

  // Fonction pour exporter les utilisateurs en PDF
  const handleExport = async () => {
    try {
      const params = new URLSearchParams();
      params.append('format', 'pdf');

      if (searchTerm) params.append('search', searchTerm);
      if (statusFilter) params.append('status', statusFilter);

      const response = await fetch(`/api/users/export?${params.toString()}`);

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
          description: `${filteredUsers.length} utilisateurs préparés pour impression/sauvegarde PDF`,
        });
      } else {
        throw new Error('Erreur lors de l\'export');
      }
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible d'exporter les utilisateurs en PDF",
        variant: "destructive",
      });
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
                  <Users className="h-8 w-8 sm:h-10 sm:w-10 lg:h-12 lg:w-12 text-green-600 drop-shadow-lg" />
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
                    className="absolute -inset-1 sm:-inset-2"
                  >
                    <Shield className="h-3 w-3 sm:h-4 sm:w-4 text-blue-500 absolute top-0 right-0" />
                    <UserCheck className="h-2 w-2 sm:h-3 sm:w-3 text-green-500 absolute bottom-0 left-0" />
                  </motion.div>
                </motion.div>

                <div className="min-w-0 flex-1">
                  <motion.h1
                    className="text-2xl sm:text-3xl lg:text-4xl xl:text-5xl font-bold bg-gradient-to-r from-slate-800 via-green-600 to-slate-800 dark:from-slate-200 dark:via-green-400 dark:to-slate-200 bg-clip-text text-transparent"
                    initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
                    transition={{ duration: 0.8, delay: 0.4 }}
                  >
                    Gestion des Usagers
                  </motion.h1>
                  <motion.div
                    className="text-sm sm:text-base lg:text-lg text-gray-600 dark:text-gray-300 mt-1 sm:mt-2 font-medium"
                    initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
                    transition={{ duration: 0.8, delay: 0.6 }}
                  >
                    Administrez les comptes utilisateurs avec efficacité
                    <motion.span
                      animate={{ scale: [1, 1.1, 1] }}
                      transition={{ duration: 3, repeat: Infinity }}
                      className="inline-block ml-2 sm:ml-3"
                    >
                      <Shield className="h-4 w-4 sm:h-5 sm:w-5 text-amber-500 inline" />
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
                    className="w-full sm:w-auto bg-white dark:bg-gray-800 backdrop-blur-sm border-2 border-slate-300 dark:border-gray-600 hover:border-green-400 dark:hover:border-green-500 font-semibold text-xs sm:text-sm text-gray-900 dark:text-gray-100"
                    onClick={handleExport}
                  >
                    <Download className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
                    <span className="hidden sm:inline">Télécharger liste en PDF ({filteredUsers.length})</span>
                    <span className="sm:hidden">PDF ({filteredUsers.length})</span>
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
                    <Link href="/users/new" className="flex items-center justify-center">
                      <motion.span
                        animate={{ x: [0, 2, 0] }}
                        transition={{ duration: 3, repeat: Infinity }}
                        className="flex items-center"
                      >
                        <Plus className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
                        <span className="hidden sm:inline">Ajouter un usager</span>
                        <span className="sm:hidden">Ajouter</span>
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
                    onClick={fetchUsers}
                    variant="outline"
                    size="sm"
                    className="w-full sm:w-auto bg-green-100 dark:bg-green-700 border border-green-300 dark:border-green-600 hover:bg-green-200 dark:hover:bg-green-600 hover:border-green-400 dark:hover:border-green-500 transition-all duration-200 font-medium text-green-700 dark:text-green-200 text-xs sm:text-sm"
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
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4">
                <div className="sm:col-span-2 lg:col-span-1 xl:col-span-2">
                  <Label htmlFor="search" className="text-sm">Rechercher</Label>
                  <div className="relative mt-1">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      id="search"
                      placeholder="Nom, email, code-barres..."
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
                    <option value="active" className="bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100">Actifs</option>
                    <option value="inactive" className="bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100">Inactifs</option>
                  </select>
                </div>
                                <div>
                  <Label htmlFor="category" className="text-sm">Catégorie</Label>
                  <select
                    id="category"
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value)}
                    className="w-full h-9 sm:h-10 px-3 mt-1 rounded-md border border-gray-300 bg-white text-sm ring-offset-white focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                  >
                    <option value="">Toutes les catégories</option>
                    <option value="student">Étudiant</option>
                    <option value="teacher">Enseignant</option>
                    <option value="researcher">Chercheur</option>
                    <option value="staff">Personnel</option>
                    <option value="external">Externe</option>
                    <option value="guest">Invité</option>
                    <option value="alumni">Ancien étudiant</option>
                    <option value="visitor">Visiteur</option>
                  </select>
                </div>
                <div>
                  <Label htmlFor="level" className="text-sm">Niveau d'études</Label>
                  <select
                    id="level"
                    value={levelFilter}
                    onChange={(e) => setLevelFilter(e.target.value)}
                    className="w-full h-9 sm:h-10 px-3 mt-1 rounded-md border border-gray-300 bg-white text-sm ring-offset-white focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                  >
                    <option value="">Tous les niveaux</option>
                    <option value="L1">L1 (Licence 1)</option>
                    <option value="L2">L2 (Licence 2)</option>
                    <option value="L3">L3 (Licence 3)</option>
                    <option value="M1">M1 (Master 1)</option>
                    <option value="M2">M2 (Master 2)</option>
                    <option value="PhD">Doctorat</option>
                    <option value="PostDoc">Post-Doctorat</option>
                    <option value="Professor">Professeur</option>
                    <option value="Researcher">Chercheur</option>
                    <option value="Staff">Personnel</option>
                    <option value="Other">Autre</option>
                  </select>
                </div>
                <div>
                  <Label htmlFor="department" className="text-sm">Département</Label>
                  <select
                    id="department"
                    value={departmentFilter}
                    onChange={(e) => setDepartmentFilter(e.target.value)}
                    className="w-full h-9 sm:h-10 px-3 mt-1 rounded-md border border-gray-300 bg-white text-sm ring-offset-white focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                  >
                    <option value="">Tous les départements</option>
                    <option value="Informatique">Informatique</option>
                    <option value="Mathématiques">Mathématiques</option>
                    <option value="Physique">Physique</option>
                    <option value="Chimie">Chimie</option>
                    <option value="Biologie">Biologie</option>
                    <option value="Économie">Économie</option>
                    <option value="Gestion">Gestion</option>
                    <option value="Droit">Droit</option>
                    <option value="Lettres">Lettres</option>
                    <option value="Histoire">Histoire</option>
                    <option value="Géographie">Géographie</option>
                    <option value="Sociologie">Sociologie</option>
                    <option value="Psychologie">Psychologie</option>
                    <option value="Médecine">Médecine</option>
                    <option value="Pharmacie">Pharmacie</option>
                    <option value="Ingénierie">Ingénierie</option>
                    <option value="Architecture">Architecture</option>
                    <option value="Arts">Arts</option>
                    <option value="Langues">Langues</option>
                    <option value="Autre">Autre</option>
                  </select>
                </div>
                <div>
                  <Label htmlFor="year" className="text-sm">Année d'inscription</Label>
                  <select
                    id="year"
                    value={yearFilter}
                    onChange={(e) => setYearFilter(e.target.value)}
                    className="w-full h-9 sm:h-10 px-3 mt-1 rounded-md border border-gray-300 bg-white text-sm ring-offset-white focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                  >
                    <option value="">Toutes les années</option>
                    <option value="2024">2024</option>
                    <option value="2023">2023</option>
                    <option value="2022">2022</option>
                    <option value="2021">2021</option>
                    <option value="2020">2020</option>
                    <option value="2019">2019</option>
                    <option value="2018">2018</option>
                    <option value="2017">2017</option>
                    <option value="2016">2016</option>
                    <option value="2015">2015</option>
                    <option value="Avant 2015">Avant 2015</option>
                  </select>
                </div>

              </div>
            </CardContent>
          </Card>

          {/* Stats avec composant unifié et animations spectaculaires */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6 mb-4 sm:mb-6 lg:mb-8">
            {[
              {
                value: users.length,
                label: "Total usagers",
                icon: Users,
                gradient: "from-green-500 to-green-600",
                color: "green"
              },
              {
                value: users.filter(u => u.is_active).length,
                label: "Actifs",
                icon: UserCheck,
                gradient: "from-green-500 to-green-600",
                color: "green"
              },
              {
                value: users.filter(u => !u.is_active).length,
                label: "Inactifs",
                icon: UserX,
                gradient: "from-yellow-500 to-yellow-600",
                color: "yellow"
              },
              {
                value: users.reduce((sum, user) => sum + user.max_loans, 0),
                label: "Limite totale emprunts",
                icon: BookOpen,
                gradient: "from-red-500 to-red-600",
                color: "red"
              }
            ].map((stat, index) => (
              <motion.div
                key={stat.label}
                initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.5, delay: 0.1 + index * 0.1 }}
                whileHover={{ y: -5, transition: { duration: 0.2 } }}
              >
                <UnifiedStatCard stat={stat} index={index} />
              </motion.div>
            ))}
          </div>

          {/* Users List */}
          <Card>
            <CardHeader>
              <CardTitle>Liste des Usagers ({filteredUsers.length})</CardTitle>
              <CardDescription>
                Gérez les comptes utilisateurs de votre bibliothèque
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
                      <Users className="h-12 w-12 text-green-600 mx-auto" />
                    </motion.div>
                    <span className="text-lg font-medium text-gray-600 dark:text-gray-300">
                      Chargement des usagers...
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
              ) : filteredUsers.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-600 dark:text-gray-300">Aucun usager trouvé</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredUsers.map((user, index) => (
                  <motion.div
                    key={user.id}
                    initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
                    transition={{ duration: 0.3, delay: index * 0.1 }}
                    className="border border-gray-200 dark:border-gray-700 rounded-lg p-3 sm:p-4 hover:shadow-md transition-all duration-200 bg-white dark:bg-gray-800"
                  >
                    {/* Layout responsive : stack sur mobile, flex sur desktop */}
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 sm:gap-4">
                      {/* Contenu principal */}
                      <div className="flex-1 min-w-0 space-y-3">
                        {/* Header avec icône, nom et statut */}
                        <div className="flex items-start gap-3">
                          <div className="flex-shrink-0 p-2 bg-green-100 dark:bg-green-800/90 rounded-lg">
                            <Users className="h-4 w-4 sm:h-5 sm:w-5 text-green-600" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 mb-2">
                              <h3 className="font-semibold text-sm sm:text-base text-gray-900 dark:text-white truncate">
                                {user.full_name}
                              </h3>
                              <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-bold w-fit border shadow-sm ${
                                user.is_active
                                  ? 'bg-green-600 text-white border-green-700 dark:bg-green-500 dark:border-green-400'
                                  : 'bg-red-600 text-white border-red-700 dark:bg-red-500 dark:border-red-400'
                              }`}>
                                {user.is_active ? (
                                  <>
                                    <UserCheck className="h-3 w-3 mr-1" />
                                    Actif
                                  </>
                                ) : (
                                  <>
                                    <UserX className="h-3 w-3 mr-1" />
                                    Inactif
                                  </>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Informations principales - layout responsive */}
                        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-5 gap-2 sm:gap-4 text-xs sm:text-sm">
                          <div>
                            <p className="text-gray-600 dark:text-gray-300 text-xs uppercase tracking-wide">Email</p>
                            <p className="font-medium text-gray-900 dark:text-white truncate">{user.email}</p>
                          </div>
                          <div>
                            <p className="text-gray-600 dark:text-gray-300 text-xs uppercase tracking-wide">Code</p>
                            <div className="flex items-center gap-1">
                              <CreditCard className="h-3 w-3 text-gray-400" />
                              <p className="font-medium text-gray-900 dark:text-white truncate">{user.barcode}</p>
                            </div>
                          </div>
                          <div className="sm:col-span-1 lg:col-span-1">
                            <p className="text-gray-600 dark:text-gray-300 text-xs uppercase tracking-wide">Inscription</p>
                            <p className="font-medium text-gray-900 dark:text-white">{user.created_at ? new Date(user.created_at).toLocaleDateString('fr-FR') : 'N/A'}</p>
                          </div>
                          <div className="sm:col-span-1 lg:col-span-1">
                            <p className="text-gray-600 dark:text-gray-300 text-xs uppercase tracking-wide">Emprunts</p>
                            <p className="font-medium text-gray-900 dark:text-white">{user.max_loans} max</p>
                          </div>
                          <div className="sm:col-span-1 lg:col-span-1">
                            <p className="text-gray-600 dark:text-gray-300 text-xs uppercase tracking-wide">Réservations</p>
                            <p className="font-medium text-gray-900 dark:text-white">{user.max_reservations || 2} max</p>
                          </div>
                        </div>

                        {/* Téléphone et adresse - masqués sur très petit écran */}
                        <div className="hidden sm:block space-y-2">
                          {user.phone && (
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                              <span className="font-medium">Téléphone:</span> {user.phone}
                            </p>
                          )}
                          {user.address && (
                            <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                              <span className="font-medium">Adresse:</span> {user.address}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Boutons d'action - responsive */}
                      <div className="flex sm:flex-col gap-2 sm:gap-2 flex-shrink-0 w-full sm:w-auto">
                        {/* Sur mobile : boutons horizontaux, sur desktop : verticaux */}
                        <Button asChild variant="ghost" size="sm" className="flex-1 sm:flex-none h-8 px-2 sm:px-3 text-xs sm:text-sm text-green-600 hover:text-green-700 hover:bg-green-50 dark:hover:bg-green-900/20">
                          <Link href={`/users/${user.id}`}>
                            <Eye className="h-3 w-3 sm:h-4 sm:w-4 sm:mr-2" />
                            <span className="hidden sm:inline">Voir</span>
                          </Link>
                        </Button>
                        <Button asChild variant="ghost" size="sm" className="flex-1 sm:flex-none h-8 px-2 sm:px-3 text-xs sm:text-sm text-green-600 hover:text-green-700 hover:bg-green-50 dark:hover:bg-green-900/20">
                          <Link href={`/users/${user.id}/edit`}>
                            <Edit className="h-3 w-3 sm:h-4 sm:w-4 sm:mr-2" />
                            <span className="hidden sm:inline">Modifier</span>
                          </Link>
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="flex-1 sm:flex-none h-8 px-2 sm:px-3 text-xs sm:text-sm text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                          onClick={() => handleDelete(user)}
                        >
                          <Trash2 className="h-3 w-3 sm:h-4 sm:w-4 sm:mr-2" />
                          <span className="hidden sm:inline">Supprimer</span>
                        </Button>
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

      {/* Dialogue de confirmation de suppression */}
      <DeleteUserConfirmationDialog
        isOpen={deleteDialogOpen}
        onClose={() => {
          setDeleteDialogOpen(false);
          setUserToDelete(null);
        }}
        onConfirm={confirmDelete}
        user={userToDelete}
        isLoading={isDeleting}
      />
    </ProtectedLayout>
  );
}
