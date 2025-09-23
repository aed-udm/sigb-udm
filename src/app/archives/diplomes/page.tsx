"use client";

import { useState, useEffect } from "react";
import { motion } from 'framer-motion';
import {
  GraduationCap,
  Search,
  Filter,
  Plus,
  Users,
  FileText,
  Upload,
  Download,
  Eye,
  Edit,
  Folder,
  FolderOpen,
  Calendar,
  User,
  Mail,
  Phone,
  MapPin,
  BookOpen,
  Award,
  ChevronRight,
  ArrowLeft
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import ProtectedLayout from "@/components/layout/protected-layout";
import { UnifiedStatCard } from "@/components/ui/instant-components";
import { useToast } from "@/hooks/use-toast";

interface Student {
  id: string;
  full_name: string;
  email: string;
  matricule?: string;
  phone?: string;
  barcode: string;
  is_active: boolean;
  created_at: string;
  // Statistiques du dossier
  documents_count: number;
  last_document_upload?: string;
  folder_size: number; // en MB
}

export default function ServiceDiplomesPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedFilter, setSelectedFilter] = useState("all");
  const { toast } = useToast();

  // Charger les étudiants depuis l'API existante
  useEffect(() => {
    fetchStudents();
  }, []);

  const fetchStudents = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/users?limit=100');
      if (response.ok) {
        const data = await response.json();
        // Récupérer les vraies statistiques de dossier depuis l'API
        const studentsWithStats = await Promise.all(
          data.data.map(async (user: any) => {
            try {
              // Récupérer les statistiques réelles de documents pour chaque étudiant
              const statsResponse = await fetch(`/api/archives/documents?student_id=${user.id}`);
              if (statsResponse.ok) {
                const statsData = await statsResponse.json();
                const documents = statsData.data || [];
                return {
                  ...user,
                  documents_count: documents.length,
                  last_document_upload: documents.length > 0 ? documents[0].upload_date : undefined,
                  folder_size: documents.reduce((total: number, doc: any) => total + (doc.file_size || 0), 0) / (1024 * 1024) // Convertir en MB
                };
              }
              return {
                ...user,
                documents_count: 0,
                last_document_upload: undefined,
                folder_size: 0
              };
            } catch (error) {
              console.error(`Erreur lors du chargement des stats pour ${user.id}:`, error);
              return {
                ...user,
                documents_count: 0,
                last_document_upload: undefined,
                folder_size: 0
              };
            }
          })
        );
        setStudents(studentsWithStats);
      } else {
        throw new Error('Erreur lors du chargement des étudiants');
      }
    } catch (error) {
      console.error('Erreur:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les étudiants",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Filtrage des étudiants
  const filteredStudents = students.filter(student => {
    const matchesSearch = student.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         student.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (student.matricule && student.matricule.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesFilter = selectedFilter === "all" || 
                         (selectedFilter === "active" && student.is_active) ||
                         (selectedFilter === "inactive" && !student.is_active) ||
                         (selectedFilter === "with_documents" && student.documents_count > 0) ||
                         (selectedFilter === "empty" && student.documents_count === 0);
    
    return matchesSearch && matchesFilter;
  });

  // Statistiques
  const totalStudents = students.length;
  const activeStudents = students.filter(s => s.is_active).length;
  const studentsWithDocuments = students.filter(s => s.documents_count > 0).length;
  const totalDocuments = students.reduce((sum, s) => sum + s.documents_count, 0);

  return (
    <ProtectedLayout>
      <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-gray-50 dark:from-gray-900 dark:via-gray-800 dark:to-green-900 relative overflow-hidden">
        {/* Header */}
        {/* Header professionnel avec glassmorphism - Style uniforme */}
        <motion.div
          className="glass-nav shadow-lg border-b border-white/20 dark:border-gray-700/20 relative overflow-hidden bg-white/95 dark:bg-gray-900/95 backdrop-blur-md"
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.6 }}
        >
          {/* Effet glassmorphism background */}
          <div className="absolute inset-0 bg-gradient-to-r from-green-500/5 via-transparent to-gray-500/5" />
          <div className="relative z-10 container mx-auto px-4 sm:px-6 py-4 sm:py-6 lg:py-8">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <motion.div
                initial={{ opacity: 0, x: -30 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6, delay: 0.2 }}
                className="flex items-center space-x-3 sm:space-x-4"
              >
                <Button variant="ghost" size="sm" asChild>
                  <Link href="/archives" className="flex items-center">
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Retour aux Archives
                  </Link>
                </Button>
                <GraduationCap className="h-6 w-6 sm:h-8 sm:w-8 text-green-600 flex-shrink-0" />
                <div>
                  <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold bg-gradient-to-r from-slate-800 to-green-600 dark:from-slate-200 dark:to-green-400 bg-clip-text text-transparent">
                    Service des Diplômes
                  </h1>
                  <p className="text-sm sm:text-base lg:text-lg text-gray-600 dark:text-gray-300 mt-1 sm:mt-2 font-medium">
                    Gestion des dossiers étudiants et documents académiques
                  </p>
                </div>
              </motion.div>
            </div>
          </div>
        </motion.div>

        <div className="container mx-auto px-4 py-8">
          {/* Statistiques avec animations spectaculaires - responsive */}
          <motion.div
            className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6 mb-4 sm:mb-6 lg:mb-8"
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 1 }}
          >
            <UnifiedStatCard
              stat={{
                value: totalStudents?.toLocaleString() || '0',
                label: "Total Étudiants",
                icon: Users,
                gradient: "from-green-600 to-green-700"
              }}
            />
            <UnifiedStatCard
              stat={{
                value: activeStudents?.toLocaleString() || '0',
                label: "Étudiants Actifs",
                icon: User,
                gradient: "from-green-600 to-green-700"
              }}
            />
            <UnifiedStatCard
              stat={{
                value: studentsWithDocuments?.toLocaleString() || '0',
                label: "Avec Documents",
                icon: FileText,
                gradient: "from-gray-600 to-gray-700"
              }}
            />
            <UnifiedStatCard
              stat={{
                value: totalDocuments?.toLocaleString() || '0',
                label: "Total Documents",
                icon: BookOpen,
                gradient: "from-gray-600 to-gray-700"
              }}
            />
          </motion.div>

          {/* Barre de recherche et filtres */}
          <motion.div
            initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="mb-8"
          >
            <Card className="bg-white/95 dark:bg-gray-800/95 backdrop-blur-xl border-0 shadow-lg">
              <CardContent className="p-6">
                <div className="flex flex-col lg:flex-row gap-4">
                  <div className="flex-1">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                      <Input
                        placeholder="Rechercher par nom, email ou matricule..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant={selectedFilter === "all" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setSelectedFilter("all")}
                    >
                      Tous
                    </Button>
                    <Button
                      variant={selectedFilter === "active" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setSelectedFilter("active")}
                    >
                      Actifs
                    </Button>
                    <Button
                      variant={selectedFilter === "with_documents" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setSelectedFilter("with_documents")}
                    >
                      Avec documents
                    </Button>
                    <Button
                      variant={selectedFilter === "empty" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setSelectedFilter("empty")}
                    >
                      Dossiers vides
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Liste des étudiants */}
          <motion.div
            initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.3 }}
          >
            <Card className="bg-white/95 dark:bg-gray-800/95 backdrop-blur-xl border-0 shadow-lg">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-xl font-semibold text-gray-900 dark:text-white">
                      Dossiers Étudiants ({filteredStudents.length})
                    </CardTitle>
                    <CardDescription>
                      Cliquez sur un étudiant pour accéder à son dossier d'archives
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="text-center">
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                        className="mb-4"
                      >
                        <GraduationCap className="h-12 w-12 text-green-600 mx-auto" />
                      </motion.div>
                      <span className="text-lg font-medium text-gray-600 dark:text-gray-300">
                        Chargement des dossiers...
                      </span>
                    </div>
                  </div>
                ) : filteredStudents.length === 0 ? (
                  <div className="text-center py-12">
                    <Users className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                      Aucun étudiant trouvé
                    </h3>
                    <p className="text-gray-600 dark:text-gray-400">
                      Essayez de modifier vos critères de recherche
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {filteredStudents.map((student, index) => (
                      <motion.div
                        key={student.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05 }}
                        whileHover={{ scale: 1.01 }}
                        className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-all duration-200 cursor-pointer"
                      >
                        <Link href={`/archives/diplomes/${student.id}`}>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-4">
                              <div className="p-2 bg-green-100 dark:bg-green-800/90 rounded-lg">
                                <User className="h-5 w-5 text-green-600" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center space-x-3 mb-1">
                                  <h3 className="font-semibold text-gray-900 dark:text-white truncate">
                                    {student.full_name}
                                  </h3>
                                  <Badge variant={student.is_active ? "default" : "secondary"}>
                                    {student.is_active ? 'Actif' : 'Inactif'}
                                  </Badge>
                                  {student.documents_count > 0 && (
                                    <Badge variant="outline" className="text-green-600 border-green-600">
                                      {student.documents_count} docs
                                    </Badge>
                                  )}
                                </div>
                                <div className="flex items-center space-x-4 text-sm text-gray-600 dark:text-gray-400">
                                  <span className="flex items-center">
                                    <Mail className="h-3 w-3 mr-1" />
                                    {student.email}
                                  </span>
                                  {student.matricule && (
                                    <span className="flex items-center">
                                      <Award className="h-3 w-3 mr-1" />
                                      {student.matricule}
                                    </span>
                                  )}
                                  <span className="flex items-center">
                                    <Calendar className="h-3 w-3 mr-1" />
                                    {new Date(student.created_at).toLocaleDateString('fr-FR')}
                                  </span>
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center space-x-2">
                              <div className="text-right text-sm">
                                <div className="font-medium text-gray-900 dark:text-white">
                                  {student.folder_size && !isNaN(student.folder_size) ?
                                    `${student.folder_size.toFixed(2)} MB` :
                                    '0 MB'
                                  }
                                </div>
                                <div className="text-gray-600 dark:text-gray-300">
                                  Taille dossier
                                </div>
                              </div>
                              <ChevronRight className="h-5 w-5 text-gray-400" />
                            </div>
                          </div>
                        </Link>
                      </motion.div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    </ProtectedLayout>
  );
}
