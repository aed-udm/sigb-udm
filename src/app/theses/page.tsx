"use client";

import { useState, useEffect, useCallback } from "react";
import { motion } from 'framer-motion';
import {
  BookOpen,
  Search,
  Plus,
  Filter,
  Download,
  Edit,
  Trash2,
  Eye,
  Loader2,
  Award,
  TrendingUp,
  Star,
  Upload,
  FileDown,
  FileUp,
  GraduationCap,
  FileText,
  Calendar,
  Users,
  Briefcase
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import ProtectedLayout from "@/components/layout/protected-layout";
import { useToast } from "@/hooks/use-toast";
import { useRefresh } from "@/contexts/refresh-context";
import { useReliableRefresh } from "@/hooks";
import { UnifiedStatCard } from "@/components/ui/instant-components";
import { DeleteConfirmationDialog } from "@/components/ui/delete-confirmation-dialog";

interface AcademicDocument {
  id: string;
  title: string;
  author: string;
  supervisor: string;
  document_type: 'these' | 'memoire' | 'rapport_stage';
  year: number;
  specialty: string;
  university: string;
  is_accessible: boolean;
  created_at: string;
  degree?: string;
  faculty?: string;
  // Nouveaux champs SIGB
  status?: 'available' | 'borrowed' | 'reserved' | 'lost' | 'damaged' | 'withdrawn' | 'not_for_loan' | 'in_transit' | 'in_processing' | 'missing';
  target_audience?: 'undergraduate' | 'graduate' | 'postgraduate' | 'researcher' | 'professional' | 'academic';
  format?: 'print' | 'digital' | 'pdf' | 'bound' | 'electronic' | 'multimedia';
  language?: string;
  physical_location?: string;
  view_count?: number;
  // Nouvelles propriétés pour le système de statut unifié
  availability_status?: 'disponible' | 'indisponible';
  is_borrowed?: boolean;
  is_reserved?: boolean;
  defense_date?: string;
  defense_year?: number;
}

export default function ThesesPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedSpecialty, setSelectedSpecialty] = useState("");
  const [selectedYear, setSelectedYear] = useState("");
  const [selectedDocumentType, setSelectedDocumentType] = useState("all");
  const [selectedSupervisor, setSelectedSupervisor] = useState("");
  const [selectedUniversity, setSelectedUniversity] = useState("");
  const [documents, setDocuments] = useState<AcademicDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();
  const { subscribe, notifyBookChange } = useRefresh();

  // États pour le dialogue de suppression
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [thesisToDelete, setThesisToDelete] = useState<{ id: string; title: string; document_type: string } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Fonction pour charger les documents académiques depuis l'API
  const fetchDocuments = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/academic-documents');

      if (!response.ok) {
        throw new Error('Erreur lors du chargement des documents');
      }

      const data = await response.json();
      setDocuments(data.data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue');
      toast({
        title: "Erreur",
        description: "Impossible de charger les documents académiques",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  // Système de rafraîchissement avec debouncing pour éviter trop de requêtes
  const { debouncedRefresh } = useReliableRefresh({
    onRefresh: fetchDocuments,
    fallbackDelay: 2000
  });

  // Charger les documents au montage et s'abonner aux changements
  useEffect(() => {
    fetchDocuments();

    // S'abonner aux changements d'emprunts et de réservations avec debouncing
    const unsubscribeLoan = subscribe('loans', debouncedRefresh);
    const unsubscribeReservation = subscribe('reservations', debouncedRefresh);

    return () => {
      unsubscribeLoan();
      unsubscribeReservation();
    };
  }, [fetchDocuments, subscribe, debouncedRefresh]);

  const specialties = [...new Set(documents.map(doc => doc.specialty).filter(Boolean))];
  const years = [...new Set(documents.map(doc => doc.year))].sort((a, b) => (b as number) - (a as number));
  const supervisors = [...new Set(documents.map(doc => doc.supervisor).filter(Boolean))].sort();
  const universities = [...new Set(documents.map(doc => doc.university).filter(Boolean))].sort();

  const filteredDocuments = documents.filter(doc => {
    const matchesSearch = doc.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         doc.author.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         doc.supervisor.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesSpecialty = !selectedSpecialty || doc.specialty === selectedSpecialty;
    const matchesYear = !selectedYear || doc.year.toString() === selectedYear;
    const matchesType = selectedDocumentType === "all" || doc.document_type === selectedDocumentType;
    const matchesSupervisor = !selectedSupervisor || doc.supervisor === selectedSupervisor;
    const matchesUniversity = !selectedUniversity || doc.university === selectedUniversity;

    return matchesSearch && matchesSpecialty && matchesYear && matchesType && matchesSupervisor && matchesUniversity;
  });

  // Fonction pour ouvrir le dialogue de suppression
  const handleDelete = (documentId: string, documentTitle: string, documentType: string) => {
    setThesisToDelete({ id: documentId, title: documentTitle, document_type: documentType });
    setDeleteDialogOpen(true);
  };

  // Fonction pour confirmer la suppression
  const confirmDelete = async () => {
    if (!thesisToDelete) return;

    try {
      setIsDeleting(true);
      const response = await fetch(`/api/academic-documents/${thesisToDelete.id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        toast({
          title: "Succès",
          description: "Document supprimé avec succès",
        });

        // 🚀 RAFRAÎCHISSEMENT FIABLE - Mise à jour immédiate + notifications
        debouncedRefresh();

        // Fermer le dialogue
        setDeleteDialogOpen(false);
        setThesisToDelete(null);
      } else {
        throw new Error('Erreur lors de la suppression');
      }
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de supprimer le document",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  // Fonction pour exporter les documents en PDF
  const handleExport = async () => {
    try {
      const params = new URLSearchParams();
      params.append('format', 'pdf');

      if (searchTerm) params.append('search', searchTerm);
      if (selectedDocumentType !== 'all') params.append('type', selectedDocumentType);
      if (selectedSpecialty) params.append('specialty', selectedSpecialty);
      if (selectedYear) params.append('year', selectedYear);

      const response = await fetch(`/api/academic-documents/export?${params.toString()}`);

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
          description: `${filteredDocuments.length} documents préparés pour impression/sauvegarde PDF`,
        });
      } else {
        throw new Error('Erreur lors de l\'export');
      }
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible d'exporter les documents en PDF",
        variant: "destructive",
      });
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
                  <GraduationCap className="h-12 w-12 text-pink-600 drop-shadow-lg" />
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
                    className="absolute -inset-2"
                  >
                    <Award className="h-4 w-4 text-amber-500 absolute top-0 right-0" />
                    <FileText className="h-3 w-3 text-green-500 absolute bottom-0 left-0" />
                  </motion.div>
                </motion.div>

                <div>
                  <motion.h1
                    className="text-xl sm:text-2xl md:text-3xl lg:text-4xl xl:text-5xl font-bold bg-gradient-to-r from-slate-800 via-green-600 to-slate-800 dark:from-slate-200 dark:via-green-400 dark:to-slate-200 bg-clip-text text-transparent"
                    initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
                    transition={{ duration: 0.8, delay: 0.4 }}
                  >
                    Documents Académiques
                  </motion.h1>
                  <motion.div
                    className="text-lg text-gray-600 dark:text-gray-500 dark:text-gray-300mt-2 font-medium"
                    initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
                    transition={{ duration: 0.8, delay: 0.6 }}
                  >
                    Gérez thèses, mémoires et rapports de stage avec efficacité
                    <motion.span
                      animate={{ scale: [1, 1.1, 1] }}
                      transition={{ duration: 3, repeat: Infinity }}
                      className="inline-block ml-3"
                    >
                      <Award className="h-5 w-5 text-amber-500 inline" />
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
                    scale: 1.05,
                    boxShadow: "0 10px 30px rgba(34, 197, 94, 0.3)"
                  }}
                  whileTap={{ scale: 0.95 }}
                  className="w-full sm:w-auto"
                >
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full sm:w-auto bg-white dark:bg-gray-800 backdrop-blur-sm border-2 border-slate-300 dark:border-gray-600 hover:border-green-400 dark:hover:border-green-500 font-semibold text-xs sm:text-sm text-gray-900 dark:text-gray-100"
                    onClick={handleExport}
                  >
                    <FileDown className="h-4 w-4 sm:h-5 sm:w-5 mr-1 sm:mr-2" />
                    <span className="hidden sm:inline">Télécharger liste en PDF</span>
                    <span className="sm:hidden">PDF</span>
                    <span className="ml-1">({filteredDocuments.length})</span>
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
                  <Button asChild size="sm" className="w-full sm:w-auto bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white font-semibold shadow-lg text-xs sm:text-sm">
                    <Link href="/admin/import?type=theses" className="flex items-center justify-center">
                      <motion.span
                        animate={{ y: [0, -2, 0] }}
                        transition={{ duration: 2, repeat: Infinity }}
                        className="flex items-center"
                      >
                        <FileUp className="h-4 w-4 sm:h-5 sm:w-5 mr-1 sm:mr-2" />
                        <span className="hidden sm:inline">Importer Documents</span>
                        <span className="sm:hidden">Import</span>
                      </motion.span>
                    </Link>
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
                  <Button asChild size="sm" className="w-full sm:w-auto bg-gradient-to-r from-slate-800 to-green-600 hover:from-slate-900 hover:to-green-700 text-white font-semibold shadow-lg text-xs sm:text-sm">
                    <Link href="/theses/new" className="flex items-center justify-center">
                      <motion.span
                        animate={{ x: [0, 2, 0] }}
                        transition={{ duration: 3, repeat: Infinity }}
                        className="flex items-center"
                      >
                        <Plus className="h-4 w-4 sm:h-5 sm:w-5 mr-1 sm:mr-2" />
                        <span className="hidden sm:inline">Ajouter un document</span>
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
                    onClick={fetchDocuments}
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

        <div className="container mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-4 sm:py-6 md:py-7 lg:py-8 max-w-full overflow-x-hidden">
          {/* Filters */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="text-lg">Filtres et Recherche</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4">
                <div className="min-w-0">
                  <Label htmlFor="search">Rechercher</Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      id="search"
                      placeholder="Titre, auteur, directeur..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10 w-full"
                    />
                  </div>
                </div>
                <div className="min-w-0">
                  <Label htmlFor="documentType">Type de document</Label>
                  <select
                    id="documentType"
                    value={selectedDocumentType}
                    onChange={(e) => setSelectedDocumentType(e.target.value)}
                    className="w-full h-10 px-3 rounded-md border border-gray-300 bg-white text-sm ring-offset-white focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                  >
                    <option value="all" className="bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100">Tous les documents</option>
                    <option value="these" className="bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100">Thèses</option>
                    <option value="memoire" className="bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100">Mémoires</option>
                    <option value="rapport_stage" className="bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100">Rapports de stage</option>
                  </select>
                </div>
                <div className="min-w-0">
                  <Label htmlFor="specialty">Spécialité</Label>
                  <select
                    id="specialty"
                    value={selectedSpecialty}
                    onChange={(e) => setSelectedSpecialty(e.target.value)}
                    className="w-full h-10 px-3 rounded-md border border-gray-300 bg-white text-sm ring-offset-white focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                  >
                    <option value="" className="bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100">Toutes les spécialités</option>
                    {specialties.map(specialty => (
                      <option key={specialty} value={specialty} className="bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100">{specialty}</option>
                    ))}
                  </select>
                </div>
                <div className="min-w-0">
                  <Label htmlFor="year">Année de soutenance</Label>
                  <select
                    id="year"
                    value={selectedYear}
                    onChange={(e) => setSelectedYear(e.target.value)}
                    className="w-full h-10 px-3 rounded-md border border-gray-300 bg-white text-sm ring-offset-white focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                  >
                    <option value="" className="bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100">Toutes les années</option>
                    {years.map(year => (
                      <option key={year} value={year} className="bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100">{year}</option>
                    ))}
                  </select>
                </div>
                <div className="min-w-0">
                  <Label htmlFor="supervisor">Superviseur</Label>
                  <select
                    id="supervisor"
                    value={selectedSupervisor}
                    onChange={(e) => setSelectedSupervisor(e.target.value)}
                    className="w-full h-10 px-3 rounded-md border border-gray-300 bg-white text-sm ring-offset-white focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                  >
                    <option value="" className="bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100">Tous les directeurs</option>
                    {supervisors.map(supervisor => (
                      <option key={supervisor} value={supervisor} className="bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100">{supervisor}</option>
                    ))}
                  </select>
                </div>
                <div className="min-w-0">
                  <Label htmlFor="university">Université</Label>
                  <select
                    id="university"
                    value={selectedUniversity}
                    onChange={(e) => setSelectedUniversity(e.target.value)}
                    className="w-full h-10 px-3 rounded-md border border-gray-300 bg-white text-sm ring-offset-white focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                  >
                    <option value="" className="bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100">Toutes les universités</option>
                    {universities.map(university => (
                      <option key={university} value={university} className="bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100">{university}</option>
                    ))}
                  </select>
                </div>

              </div>
            </CardContent>
          </Card>

          {/* Stats avec animations spectaculaires - responsive */}
          <motion.div
            className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6 mb-4 sm:mb-6 lg:mb-8"
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 1 }}
          >
            {[
              {
                value: documents.length,
                label: "Total documents",
                color: "green",
                icon: GraduationCap,
                gradient: "from-green-500 to-green-600"
              },
              {
                value: new Set(documents.map(t => t.specialty).filter(Boolean)).size,
                label: "Spécialités",
                color: "green",
                icon: BookOpen,
                gradient: "from-green-500 to-green-600"
              },
              {
                value: documents.filter(t => t.year === new Date().getFullYear()).length,
                label: "Cette année",
                color: "yellow",
                icon: Calendar,
                gradient: "from-yellow-500 to-yellow-600"
              },
              {
                value: new Set(documents.map(t => t.supervisor).filter(Boolean)).size,
                label: "Superviseurs",
                color: "red",
                icon: Users,
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

          {/* Theses List */}
          <Card>
            <CardHeader>
              <CardTitle>Liste des Documents Académiques ({filteredDocuments.length})</CardTitle>
              <CardDescription>
                Gérez votre archive de thèses, mémoires et rapports de stage
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
                      <GraduationCap className="h-12 w-12 text-green-600 mx-auto" />
                    </motion.div>
                    <span className="text-lg font-medium text-gray-600 dark:text-gray-300">
                      Chargement des documents...
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
              ) : filteredDocuments.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-600 dark:text-gray-300">Aucun document trouvé</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredDocuments.map((document, index) => (
                  <motion.div
                    key={document.id}
                    initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
                    transition={{ duration: 0.3, delay: index * 0.1 }}
                    className="border border-gray-200 dark:border-gray-700 rounded-lg p-3 sm:p-4 hover:shadow-md transition-all duration-200 bg-white dark:bg-gray-800"
                  >
                    {/* Layout responsive : stack sur mobile, flex sur desktop */}
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 sm:gap-4">
                      {/* Contenu principal */}
                      <div className="flex-1 min-w-0 space-y-3">
                        {/* Header avec icône, titre et type */}
                        <div className="flex items-start gap-3">
                          <div className={`flex-shrink-0 p-2 rounded-lg ${
                            document.document_type === 'these' ? 'bg-pink-100 dark:bg-pink-800/90' :
                            document.document_type === 'memoire' ? 'bg-green-100 dark:bg-green-800/90' :
                            'bg-purple-100 dark:bg-purple-800/90'
                          }`}>
                            {document.document_type === 'these' && <GraduationCap className="h-4 w-4 sm:h-5 sm:w-5 text-pink-600" />}
                            {document.document_type === 'memoire' && <FileText className="h-4 w-4 sm:h-5 sm:w-5 text-green-600" />}
                            {document.document_type === 'rapport_stage' && <Briefcase className="h-4 w-4 sm:h-5 sm:w-5 text-purple-600" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 mb-2">
                              <div className={`px-2 py-1 rounded-full text-xs font-bold w-fit border shadow-sm ${
                                document.document_type === 'these' ? 'bg-pink-600 text-white border-pink-700 dark:bg-pink-500 dark:border-pink-400' :
                                document.document_type === 'memoire' ? 'bg-green-600 text-white border-green-700 dark:bg-green-500 dark:border-green-400' :
                                'bg-purple-600 text-white border-purple-700 dark:bg-purple-500 dark:border-purple-400'
                              }`}>
                                {document.document_type === 'these' && 'Thèse'}
                                {document.document_type === 'memoire' && 'Mémoire'}
                                {document.document_type === 'rapport_stage' && 'Rapport de stage'}
                              </div>
                            </div>
                            <h3 className="font-semibold text-sm sm:text-base text-gray-900 dark:text-white line-clamp-2 leading-tight">
                              {document.title}
                            </h3>
                            <p className="text-xs sm:text-sm text-gray-700 dark:text-gray-200 mt-1">
                              par <span className="font-medium">{document.author}</span>
                            </p>
                          </div>
                        </div>

                        {/* Informations principales - layout responsive */}
                        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-6 gap-2 sm:gap-4 text-xs sm:text-sm">
                          <div>
                            <p className="text-gray-700 dark:text-gray-200 text-xs uppercase tracking-wide">
                              {document.document_type === 'these' ? 'Directeur de thèse' :
                               document.document_type === 'memoire' ? 'Encadreur académique' : 'Superviseur de stage'}
                            </p>
                            <p className="font-medium text-gray-900 dark:text-white truncate">{document.supervisor}</p>
                          </div>
                          <div>
                            <p className="text-gray-700 dark:text-gray-200 text-xs uppercase tracking-wide">Date de dépôt</p>
                            <p className="font-medium text-gray-900 dark:text-white">{document.defense_date ? new Date(document.defense_date).toLocaleDateString('fr-FR') : document.year}</p>
                          </div>
                          <div className="sm:col-span-1 lg:col-span-1">
                            <p className="text-gray-700 dark:text-gray-200 text-xs uppercase tracking-wide">Diplôme</p>
                            <p className="font-medium text-gray-900 dark:text-white truncate">{document.degree}</p>
                          </div>
                          <div className="sm:col-span-1 lg:col-span-1">
                            <p className="text-gray-700 dark:text-gray-200 text-xs uppercase tracking-wide">Spécialité</p>
                            <p className="font-medium text-gray-900 dark:text-white truncate">{document.specialty || 'N/A'}</p>
                          </div>
                          <div className="hidden xl:block">
                            <p className="text-gray-700 dark:text-gray-200 text-xs uppercase tracking-wide">Université</p>
                            <p className="font-medium text-gray-900 dark:text-white truncate">{document.university || 'N/A'}</p>
                          </div>
                          <div className="hidden xl:block">
                            <p className="text-gray-700 dark:text-gray-200 text-xs uppercase tracking-wide">Étudiant</p>
                            <p className="font-medium text-gray-900 dark:text-white truncate">{document.author}</p>
                          </div>
                        </div>

                        {/* Informations supplémentaires - masquées sur très petit écran */}
                        <div className="hidden sm:block space-y-2">
                          {document.faculty && (
                            <p className="text-sm text-gray-700 dark:text-gray-200">
                              <span className="font-medium">Faculté:</span> {document.faculty}
                            </p>
                          )}
                          {document.university && (
                            <p className="text-sm text-gray-700 dark:text-gray-200">
                              <span className="font-medium">Université:</span> {document.university}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Boutons d'action - responsive */}
                      <div className="flex sm:flex-col gap-2 sm:gap-2 flex-shrink-0 w-full sm:w-auto">
                        {/* Sur mobile : boutons horizontaux, sur desktop : verticaux */}
                        <Button asChild variant="ghost" size="sm" className="flex-1 sm:flex-none h-8 px-2 sm:px-3 text-xs sm:text-sm text-green-600 hover:text-green-700 hover:bg-green-50 dark:hover:bg-green-900/20">
                          <Link href={`/theses/${document.id}`}>
                            <Eye className="h-3 w-3 sm:h-4 sm:w-4 sm:mr-2" />
                            <span className="hidden sm:inline">Voir</span>
                          </Link>
                        </Button>
                        <Button asChild variant="ghost" size="sm" className="flex-1 sm:flex-none h-8 px-2 sm:px-3 text-xs sm:text-sm text-green-600 hover:text-green-700 hover:bg-green-50 dark:hover:bg-green-900/20">
                          <Link href={`/theses/${document.id}/edit`}>
                            <Edit className="h-3 w-3 sm:h-4 sm:w-4 sm:mr-2" />
                            <span className="hidden sm:inline">Modifier</span>
                          </Link>
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="flex-1 sm:flex-none h-8 px-2 sm:px-3 text-xs sm:text-sm text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                          onClick={() => handleDelete(document.id, document.title, document.document_type)}
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
      <DeleteConfirmationDialog
        isOpen={deleteDialogOpen}
        onClose={() => {
          setDeleteDialogOpen(false);
          setThesisToDelete(null);
        }}
        onConfirm={confirmDelete}
        title={`Supprimer ${thesisToDelete?.document_type === 'these' ? 'la thèse' :
                           thesisToDelete?.document_type === 'memoire' ? 'le mémoire' : 'le rapport de stage'}`}
        itemName={thesisToDelete?.title}
        itemType={thesisToDelete?.document_type === 'these' ? 'thèse' :
                  thesisToDelete?.document_type === 'memoire' ? 'mémoire' : 'rapport de stage'}
        isLoading={isDeleting}
      />
    </ProtectedLayout>
  );
}
