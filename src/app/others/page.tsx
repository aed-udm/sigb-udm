"use client";

import { useState, useEffect, useCallback } from "react";
import { motion } from 'framer-motion';
import {
  Archive,
  Search,
  Plus,
  Filter,
  Download,
  Edit,
  Trash2,
  Eye,
  FileText,
  Music,
  Video,
  Map,
  BookOpen,
  Calendar,
  Users,
  Upload,
  Clock,
  Globe
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

interface OtherDocument {
  id: string;
  title: string;
  type: 'periodique' | 'audiovisuel' | 'carte' | 'archive' | 'numerique' | 'manuscrit';
  author?: string;
  description?: string;
  year?: number;
  status: 'available' | 'coming_soon' | 'in_development';
  created_at: string;
}

export default function OthersPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedType, setSelectedType] = useState("all");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [documents, setDocuments] = useState<OtherDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();
  const { subscribe } = useRefresh();

  // Fonction pour charger les documents (simulation)
  const fetchDocuments = useCallback(async () => {
    try {
      setLoading(true);
      // Appel API réel pour récupérer les autres documents
      const response = await fetch('/api/others/documents');
      if (response.ok) {
        const data = await response.json();
        setDocuments(data.data || []);
      } else {
        setDocuments([]); // Aucun document pour l'instant
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue');
      setDocuments([]); // Aucun document en cas d'erreur
      toast({
        title: "Erreur",
        description: "Impossible de charger les autres documents",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  // Système de rafraîchissement
  const { debouncedRefresh } = useReliableRefresh({
    onRefresh: fetchDocuments,
    fallbackDelay: 2000
  });

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  const types = [
    { value: "periodique", label: "Périodiques", icon: FileText },
    { value: "audiovisuel", label: "Audiovisuels", icon: Video },
    { value: "carte", label: "Cartes", icon: Map },
    { value: "archive", label: "Archives", icon: Archive },
    { value: "numerique", label: "Numériques", icon: Globe },
    { value: "manuscrit", label: "Manuscrits", icon: BookOpen }
  ];

  const filteredDocuments = documents.filter(doc => {
    const matchesSearch = doc.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (doc.author && doc.author.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesType = selectedType === "all" || doc.type === selectedType;
    const matchesStatus = selectedStatus === "all" || doc.status === selectedStatus;

    return matchesSearch && matchesType && matchesStatus;
  });

  const getTypeIcon = (type: string) => {
    const typeMap: { [key: string]: any } = {
      periodique: FileText,
      audiovisuel: Video,
      carte: Map,
      archive: Archive,
      numerique: Globe,
      manuscrit: BookOpen
    };
    return typeMap[type] || Archive;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'available':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'coming_soon':
        return 'px-2.5 py-1 text-xs font-extrabold rounded-full border bg-orange-500 text-white border-orange-600 dark:bg-orange-500 dark:text-white dark:border-orange-400 animate-pulse shadow-sm';
      case 'in_development':
        return 'px-2.5 py-1 text-xs font-extrabold rounded-full border bg-orange-500 text-white border-orange-600 dark:bg-orange-500 dark:text-white dark:border-orange-400 animate-pulse shadow-sm';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'available':
        return 'Disponible';
      case 'coming_soon':
        return 'BIENTÔT';
      case 'in_development':
        return 'EN DÉVELOPPEMENT';
      default:
        return 'Inconnu';
    }
  };

  // Statistiques
  const stats = [
    {
      value: documents.length,
      label: "Total documents",
      color: "green",
      icon: Archive,
      gradient: "from-green-500 to-green-600"
    },
    {
      value: new Set(documents.map(d => d.type)).size,
      label: "Types différents",
      color: "gray",
      icon: FileText,
      gradient: "from-gray-500 to-gray-600"
    },
    {
      value: documents.filter(d => d.status === 'coming_soon').length,
      label: "Bientôt disponibles",
      color: "green",
      icon: Clock,
      gradient: "from-green-500 to-green-600"
    },
    {
      value: documents.filter(d => d.status === 'in_development').length,
      label: "En développement",
      color: "gray",
      icon: Users,
      gradient: "from-gray-500 to-gray-600"
    }
  ];

  return (
    <ProtectedLayout>
      <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-gray-50 dark:from-gray-900 dark:via-gray-800 dark:to-green-900 relative overflow-hidden opacity-75 grayscale-[0.2]">
        {/* Badge Bientôt global */}
        <motion.div
          initial={{ y: -50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="fixed top-20 left-1/2 transform -translate-x-1/2 z-50"
        >
          <div className="px-8 py-4 rounded-full shadow-2xl border-2 border-white bg-orange-500 text-white border-orange-600 dark:bg-orange-500 dark:text-white dark:border-orange-400 animate-pulse">
            <div className="flex items-center space-x-3">
              <Clock className="h-6 w-6" />
              <span className="font-extrabold text-xl">BIENTÔT DISPONIBLE</span>
            </div>
          </div>
        </motion.div>

        {/* Header professionnel */}
        <motion.div
          className="glass-nav shadow-lg border-b border-white/20 dark:border-gray-700/20 relative overflow-hidden bg-white/95 dark:bg-gray-900/95 backdrop-blur-md"
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.6 }}
        >
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
                  <Archive className="h-12 w-12 text-green-600 drop-shadow-lg" />
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
                    className="absolute -inset-2"
                  >
                    <FileText className="h-4 w-4 text-green-500 absolute top-0 right-0" />
                    <Video className="h-3 w-3 text-gray-500 absolute bottom-0 left-0" />
                  </motion.div>
                </motion.div>

                <div>
                  <motion.h1
                    className="text-xl sm:text-2xl md:text-3xl lg:text-4xl xl:text-5xl font-bold bg-gradient-to-r from-slate-800 via-green-600 to-slate-800 dark:from-slate-200 dark:via-green-400 dark:to-slate-200 bg-clip-text text-transparent"
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ duration: 0.8, delay: 0.4 }}
                  >
                    Autres Documents
                  </motion.h1>
                  <motion.div
                    className="text-lg text-gray-600 dark:text-gray-300 mt-2 font-medium"
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ duration: 0.8, delay: 0.6 }}
                  >
                    Fonctionnalités à venir - Périodiques, Archives, Audiovisuels
                    <motion.span
                      animate={{ scale: [1, 1.1, 1] }}
                      transition={{ duration: 3, repeat: Infinity }}
                      className="inline-block ml-3"
                    >
                      <Clock className="h-5 w-5 text-green-500 inline" />
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
                    onClick={() => {
                      toast({
                        title: "Fonctionnalité à venir",
                        description: "L'export sera disponible dans une prochaine version",
                      });
                    }}
                  >
                    <Download className="h-4 w-4 sm:h-5 sm:w-5 mr-1 sm:mr-2" />
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
                  <Button 
                    size="sm" 
                    className="w-full sm:w-auto bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white font-semibold shadow-lg text-xs sm:text-sm"
                    onClick={() => {
                      toast({
                        title: "Fonctionnalité à venir",
                        description: "L'ajout de documents sera disponible dans une prochaine version",
                      });
                    }}
                  >
                    <motion.span
                      animate={{ x: [0, 2, 0] }}
                      transition={{ duration: 3, repeat: Infinity }}
                      className="flex items-center"
                    >
                      <Plus className="h-4 w-4 sm:h-5 sm:w-5 mr-1 sm:mr-2" />
                      <span className="hidden sm:inline">Ajouter un document</span>
                      <span className="sm:hidden">Ajouter</span>
                    </motion.span>
                  </Button>
                </motion.div>

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
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
                <div className="min-w-0">
                  <Label htmlFor="search">Rechercher</Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      id="search"
                      placeholder="Titre, auteur..."
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
                    value={selectedType}
                    onChange={(e) => setSelectedType(e.target.value)}
                    className="w-full h-10 px-3 rounded-md border border-gray-300 bg-white text-sm ring-offset-white focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                  >
                    <option value="all">Tous les types</option>
                    {types.map(type => (
                      <option key={type.value} value={type.value}>{type.label}</option>
                    ))}
                  </select>
                </div>
                <div className="min-w-0">
                  <Label htmlFor="status">Statut</Label>
                  <select
                    id="status"
                    value={selectedStatus}
                    onChange={(e) => setSelectedStatus(e.target.value)}
                    className="w-full h-10 px-3 rounded-md border border-gray-300 bg-white text-sm ring-offset-white focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                  >
                    <option value="all">Tous les statuts</option>
                    <option value="available">Disponible</option>
                    <option value="coming_soon">Bientôt</option>
                    <option value="in_development">En développement</option>
                  </select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Stats */}
          <motion.div
            className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6 mb-4 sm:mb-6 lg:mb-8"
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 1 }}
          >
            {stats.map((stat, index) => (
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

          {/* Documents List */}
          <Card>
            <CardHeader>
              <CardTitle>Liste des Autres Documents ({filteredDocuments.length})</CardTitle>
              <CardDescription>
                Aperçu des fonctionnalités à venir pour la gestion d'autres types de documents
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
                      <Archive className="h-12 w-12 text-green-600 mx-auto" />
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
                  {filteredDocuments.map((document, index) => {
                    const TypeIcon = getTypeIcon(document.type);
                    return (
                      <motion.div
                        key={document.id}
                        initial={{ y: 20, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ duration: 0.3, delay: index * 0.1 }}
                        className="border border-gray-200 dark:border-gray-700 rounded-lg p-3 sm:p-4 hover:shadow-md transition-all duration-200 bg-white dark:bg-gray-800 opacity-75"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 sm:gap-4">
                          <div className="flex-1 min-w-0 space-y-3">
                            <div className="flex items-start gap-3">
                              <div className="flex-shrink-0 p-2 rounded-lg bg-green-100 dark:bg-green-800/90">
                                <TypeIcon className="h-4 w-4 sm:h-5 sm:w-5 text-green-600" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 mb-2">
                                  <div className="px-2 py-1 rounded-full text-xs font-bold w-fit border shadow-sm bg-green-600 text-white border-green-700 dark:bg-green-500 dark:border-green-400">
                                    {types.find(t => t.value === document.type)?.label || document.type}
                                  </div>
                                  <div className={`${getStatusColor(document.status)}`}>
                                    {getStatusLabel(document.status)}
                                  </div>
                                </div>
                                <h3 className="font-semibold text-sm sm:text-base text-gray-900 dark:text-white line-clamp-2 leading-tight">
                                  {document.title}
                                </h3>
                                {document.author && (
                                  <p className="text-xs sm:text-sm text-gray-700 dark:text-gray-200 mt-1">
                                    par <span className="font-medium">{document.author}</span>
                                  </p>
                                )}
                              </div>
                            </div>

                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-4 text-xs sm:text-sm">
                              <div>
                                <p className="text-gray-700 dark:text-gray-200 text-xs uppercase tracking-wide">Type</p>
                                <p className="font-medium text-gray-900 dark:text-white truncate">
                                  {types.find(t => t.value === document.type)?.label || document.type}
                                </p>
                              </div>
                              {document.year && (
                                <div>
                                  <p className="text-gray-700 dark:text-gray-200 text-xs uppercase tracking-wide">Année</p>
                                  <p className="font-medium text-gray-900 dark:text-white">{document.year}</p>
                                </div>
                              )}
                              <div>
                                <p className="text-gray-700 dark:text-gray-200 text-xs uppercase tracking-wide">Statut</p>
                                <p className="font-medium text-gray-900 dark:text-white truncate">
                                  {getStatusLabel(document.status)}
                                </p>
                              </div>
                            </div>

                            {document.description && (
                              <div className="hidden sm:block">
                                <p className="text-sm text-gray-700 dark:text-gray-200">
                                  <span className="font-medium">Description:</span> {document.description}
                                </p>
                              </div>
                            )}
                          </div>

                          <div className="flex sm:flex-col gap-2 sm:gap-2 flex-shrink-0 w-full sm:w-auto">
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="flex-1 sm:flex-none h-8 px-2 sm:px-3 text-xs sm:text-sm text-green-600 hover:text-green-700 hover:bg-green-50 dark:hover:bg-green-900/20"
                              onClick={() => {
                                toast({
                                  title: "Fonctionnalité à venir",
                                  description: "La consultation détaillée sera disponible prochainement",
                                });
                              }}
                            >
                              <Eye className="h-3 w-3 sm:h-4 sm:w-4 sm:mr-2" />
                              <span className="hidden sm:inline">Voir</span>
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="flex-1 sm:flex-none h-8 px-2 sm:px-3 text-xs sm:text-sm text-green-600 hover:text-green-700 hover:bg-green-50 dark:hover:bg-green-900/20"
                              onClick={() => {
                                toast({
                                  title: "Fonctionnalité à venir",
                                  description: "La modification sera disponible prochainement",
                                });
                              }}
                            >
                              <Edit className="h-3 w-3 sm:h-4 sm:w-4 sm:mr-2" />
                              <span className="hidden sm:inline">Modifier</span>
                            </Button>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </ProtectedLayout>
  );
}
