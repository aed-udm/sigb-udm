"use client";

import { useState, useEffect } from "react";
import { motion } from 'framer-motion';
import {
  GraduationCap,
  ArrowLeft,
  Upload,
  Download,
  Eye,
  Edit,
  Trash2,
  File,
  FileText,
  Image,
  FileVideo,
  FileAudio,
  Folder,
  FolderOpen,
  Plus,
  Calendar,
  User,
  Mail,
  Phone,
  Award,
  MapPin,
  Clock,
  AlertCircle,
  FileX,
  CheckCircle
} from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import ProtectedLayout from "@/components/layout/protected-layout";
import { useToast } from "@/hooks/use-toast";
import { DeleteConfirmationDialog } from "@/components/ui/delete-confirmation-dialog";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface Student {
  id: string;
  full_name: string;
  email: string;
  matricule?: string;
  phone?: string;
  address?: string;
  barcode: string;
  is_active: boolean;
  created_at: string;
}

interface DocumentCategory {
  id: string;
  name: string;
  description: string;
  icon: any;
  color: string;
  documents: Document[];
}

interface Document {
  id: string;
  name: string;
  file_type: string;
  file_size: number;
  upload_date: string;
  category: string;
  document_path?: string;
  description?: string;
  // Propriétés ajoutées par l'interface
  type?: string;
  size?: number;
  uploadDate?: string;
  categoryName?: string;
  categoryIcon?: any;
  categoryColor?: string;
}

// Catégories de documents simplifiées (3 dossiers serveur)
const documentCategories: Omit<DocumentCategory, 'documents'>[] = [
  {
    id: "diplomes",
    name: "Diplômes",
    description: "Diplômes, certificats, attestations de réussite",
    icon: GraduationCap,
    color: "text-green-600"
  },
  {
    id: "releves",
    name: "Relevés de Notes",
    description: "Bulletins, relevés de notes, transcripts",
    icon: FileText,
    color: "text-green-600"
  },
  {
    id: "autres",
    name: "Autres Documents",
    description: "Correspondances, demandes spéciales, documents divers",
    icon: File,
    color: "text-gray-600"
  }
];

export default function StudentArchivePage() {
  const params = useParams();
  const router = useRouter();
  const studentId = params?.id as string;
  const [student, setStudent] = useState<Student | null>(null);
  const [loading, setLoading] = useState(true);
  const [allDocuments, setAllDocuments] = useState<Document[]>([]);
  const { toast } = useToast();

  // États pour les dialogues
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [documentToDelete, setDocumentToDelete] = useState<Document | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [documentToView, setDocumentToView] = useState<Document | null>(null);

  useEffect(() => {
    if (studentId) {
      fetchStudentData();
      initializeCategories();
    }
  }, [studentId]);

  const fetchStudentData = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/users/${studentId}`);
      if (response.ok) {
        const data = await response.json();
        setStudent(data.data);
      } else {
        throw new Error('Étudiant non trouvé');
      }
    } catch (error) {
      console.error('Erreur:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les données de l'étudiant",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const initializeCategories = async () => {
    // Initialiser les catégories et charger les documents réels
    const categoriesWithDocs = await Promise.all(
      documentCategories.map(async (cat) => ({
        ...cat,
        documents: await fetchDocuments(cat.id)
      }))
    );

    // Créer une liste unifiée de tous les documents avec mapping correct
    const allDocs = categoriesWithDocs.flatMap(cat =>
      cat.documents.map(doc => ({
        ...doc,
        // Mapping correct des propriétés de l'API vers l'interface
        size: doc.file_size || 0,
        uploadDate: doc.upload_date,
        type: doc.file_type,
        categoryName: cat.name,
        categoryIcon: cat.icon,
        categoryColor: cat.color
      }))
    );
    setAllDocuments(allDocs);
  };

  // Fonction pour récupérer les documents réels depuis l'API
  const fetchDocuments = async (categoryId: string): Promise<Document[]> => {
    try {
      const response = await fetch(`/api/archives/documents?student_id=${studentId}&category=${categoryId}`);
      if (response.ok) {
        const data = await response.json();
        return data.data || [];
      }
      return [];
    } catch (error) {
      console.error('Erreur lors du chargement des documents:', error);
      return [];
    }
  };

  const getFileIcon = (type: string | undefined) => {
    if (!type) return File; // Retourner File par défaut si type est undefined
    if (type.startsWith('image/')) return Image;
    if (type.startsWith('video/')) return FileVideo;
    if (type.startsWith('audio/')) return FileAudio;
    if (type === 'application/pdf') return FileText;
    return File;
  };

  const formatFileSize = (bytes: number | undefined | null) => {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const totalDocuments = allDocuments.length;
  const totalSize = allDocuments.reduce((sum, doc) => sum + (doc.size || 0), 0);

  // Handlers pour les actions sur les documents
  const handleViewDocument = (document: any) => {
    setDocumentToView(document);
    setViewDialogOpen(true);
  };

  const handleDownloadDocument = (document: any) => {
    // Télécharger le document via l'API dédiée
    const link = window.document.createElement('a');
    link.href = `/api/archives/documents/${document.id}/download`;
    link.download = document.name;
    link.style.display = 'none';
    window.document.body.appendChild(link);
    link.click();
    window.document.body.removeChild(link);
  };

  const handleEditDocument = (_document: any) => {
    // Rediriger vers la page d'édition (à implémenter)
    toast({
      title: "Fonctionnalité à venir",
      description: "L'édition de documents sera bientôt disponible",
    });
  };

  const handleDeleteDocument = (document: any) => {
    setDocumentToDelete(document);
    setDeleteDialogOpen(true);
  };

  const confirmDeleteDocument = async () => {
    if (!documentToDelete) return;

    try {
      setIsDeleting(true);
      const response = await fetch(`/api/archives/documents/${documentToDelete.id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        toast({
          title: "Document supprimé",
          description: "Le document a été supprimé avec succès",
        });
        // Recharger les documents
        await initializeCategories();
        // Fermer le dialogue
        setDeleteDialogOpen(false);
        setDocumentToDelete(null);
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

  const handleAddDocument = () => {
    router.push(`/archives/diplomes/${studentId}/add-document`);
  };

  if (loading) {
    return (
      <ProtectedLayout>
        <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-gray-50 dark:from-gray-900 dark:via-gray-800 dark:to-green-900 flex items-center justify-center">
          <div className="text-center">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
              className="mb-4"
            >
              <GraduationCap className="h-12 w-12 text-green-600 mx-auto" />
            </motion.div>
            <span className="text-lg font-medium text-gray-600 dark:text-gray-300">
              Chargement du dossier...
            </span>
          </div>
        </div>
      </ProtectedLayout>
    );
  }

  if (!student) {
    return (
      <ProtectedLayout>
        <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-gray-50 dark:from-gray-900 dark:via-gray-800 dark:to-green-900 flex items-center justify-center">
          <div className="text-center">
            <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              Étudiant non trouvé
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Le dossier demandé n'existe pas ou n'est plus accessible.
            </p>
            <Button asChild>
              <Link href="/archives/diplomes">
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
      <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-gray-50 dark:from-gray-900 dark:via-gray-800 dark:to-green-900 relative overflow-hidden">
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
                  <Link href="/archives/diplomes" className="flex items-center">
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Retour à la liste
                  </Link>
                </Button>
                <User className="h-6 w-6 sm:h-8 sm:w-8 text-green-600 flex-shrink-0" />
                <div>
                  <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold bg-gradient-to-r from-slate-800 to-green-600 dark:from-slate-200 dark:to-green-400 bg-clip-text text-transparent">
                    {student.full_name}
                  </h1>
                  <p className="text-sm sm:text-base lg:text-lg text-gray-600 dark:text-gray-300 mt-1 sm:mt-2 font-medium">
                    Dossier d'archives - Service des Diplômes
                  </p>
                </div>
              </motion.div>
              <div className="flex items-center space-x-2">
                <Button size="sm" className="bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white" onClick={handleAddDocument}>
                  <Plus className="h-4 w-4 mr-2" />
                  Ajouter un document
                </Button>
              </div>
            </div>
          </div>
        </motion.div>

        <div className="container mx-auto px-4 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            {/* Sidebar - Informations étudiant */}
            <motion.div
              initial={{ x: -20, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="lg:col-span-1"
            >
              <Card className="bg-white/95 dark:bg-gray-800/95 backdrop-blur-xl border-0 shadow-lg sticky top-24">
                <CardHeader>
                  <div className="text-center">
                    <div className="w-20 h-20 bg-gradient-to-br from-green-600 to-green-700 rounded-full flex items-center justify-center mx-auto mb-4">
                      <User className="h-10 w-10 text-white" />
                    </div>
                    <CardTitle className="text-xl font-semibold text-gray-900 dark:text-white">
                      {student.full_name}
                    </CardTitle>
                    <Badge variant={student.is_active ? "default" : "secondary"} className="mt-2">
                      {student.is_active ? 'Actif' : 'Inactif'}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <div className="flex items-center space-x-3 text-sm">
                      <Mail className="h-4 w-4 text-gray-500" />
                      <span className="text-gray-900 dark:text-white truncate">{student.email}</span>
                    </div>
                    
                    {student.matricule && (
                      <div className="flex items-center space-x-3 text-sm">
                        <Award className="h-4 w-4 text-gray-500" />
                        <span className="text-gray-900 dark:text-white">{student.matricule}</span>
                      </div>
                    )}
                    
                    {student.phone && (
                      <div className="flex items-center space-x-3 text-sm">
                        <Phone className="h-4 w-4 text-gray-500" />
                        <span className="text-gray-900 dark:text-white">{student.phone}</span>
                      </div>
                    )}
                    
                    {student.address && (
                      <div className="flex items-center space-x-3 text-sm">
                        <MapPin className="h-4 w-4 text-gray-500" />
                        <span className="text-gray-900 dark:text-white text-xs">{student.address}</span>
                      </div>
                    )}
                    
                    <div className="flex items-center space-x-3 text-sm">
                      <Calendar className="h-4 w-4 text-gray-500" />
                      <span className="text-gray-900 dark:text-white">
                        {new Date(student.created_at).toLocaleDateString('fr-FR')}
                      </span>
                    </div>
                  </div>
                  
                  <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                    <div className="grid grid-cols-2 gap-4 text-center">
                      <div>
                        <div className="text-2xl font-bold text-green-600">{totalDocuments}</div>
                        <div className="text-xs text-gray-500">Documents</div>
                      </div>
                      <div>
                        <div className="text-2xl font-bold text-green-600">{formatFileSize(totalSize)}</div>
                        <div className="text-xs text-gray-500">Taille totale</div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Contenu principal */}
            <motion.div
              initial={{ x: 20, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="lg:col-span-3"
            >
              <Card className="bg-white/95 dark:bg-gray-800/95 backdrop-blur-xl border-0 shadow-lg">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-xl font-semibold text-gray-900 dark:text-white">
                        Tous les Documents ({totalDocuments})
                      </CardTitle>
                      <CardDescription>
                        Liste complète de tous les documents de l'étudiant
                      </CardDescription>
                    </div>
                    <Button onClick={handleAddDocument} className="bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white">
                      <Plus className="h-4 w-4 mr-2" />
                      Ajouter
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>

                  {allDocuments.length === 0 ? (
                    <div className="text-center py-12">
                      <File className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                        Aucun document
                      </h3>
                      <p className="text-gray-600 dark:text-gray-400 mb-4">
                        Ce dossier ne contient aucun document pour le moment.
                      </p>
                      <Button onClick={handleAddDocument} className="bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white">
                        <Plus className="h-4 w-4 mr-2" />
                        Ajouter le premier document
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {allDocuments.map((document, index) => {
                        const FileIcon = getFileIcon(document.type);
                        const CategoryIcon = document.categoryIcon;
                        return (
                          <motion.div
                            key={document.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.05 }}
                            className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-all duration-200"
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-4">
                                <div className="p-2 bg-gray-100 dark:bg-gray-800 rounded-lg">
                                  <FileIcon className="h-5 w-5 text-gray-600" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center space-x-3 mb-1">
                                    <h3 className="font-semibold text-gray-900 dark:text-white truncate">
                                      {document.name}
                                    </h3>
                                    <Badge variant="outline" className="flex items-center space-x-1">
                                      <CategoryIcon className="h-3 w-3" />
                                      <span>{document.categoryName}</span>
                                    </Badge>
                                  </div>
                                  <div className="flex items-center space-x-4 text-sm text-gray-600 dark:text-gray-400">
                                    <span>{formatFileSize(document.size)}</span>
                                    <span>
                                      {document.uploadDate ?
                                        new Date(document.uploadDate).toLocaleDateString('fr-FR') :
                                        'Date inconnue'
                                      }
                                    </span>
                                    {document.description && (
                                      <span className="truncate max-w-xs">{document.description}</span>
                                    )}
                                  </div>
                                </div>
                              </div>
                              <div className="flex items-center space-x-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleViewDocument(document)}
                                  title="Voir le document"
                                >
                                  <Eye className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleDownloadDocument(document)}
                                  title="Télécharger le document"
                                >
                                  <Download className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleEditDocument(document)}
                                  title="Modifier le document"
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="text-red-600 hover:text-red-700"
                                  onClick={() => handleDeleteDocument(document)}
                                  title="Supprimer le document"
                                >
                                  <Trash2 className="h-4 w-4" />
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
            </motion.div>
          </div>
        </div>
      </div>

      {/* Dialogue de confirmation de suppression */}
      <DeleteConfirmationDialog
        isOpen={deleteDialogOpen}
        onClose={() => {
          setDeleteDialogOpen(false);
          setDocumentToDelete(null);
        }}
        onConfirm={confirmDeleteDocument}
        title="Supprimer le document"
        itemName={documentToDelete?.name}
        itemType="document d'archive"
        isLoading={isDeleting}
      />

      {/* Dialogue de visualisation de document */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <Eye className="h-5 w-5 text-green-600" />
              <span>Informations du document</span>
            </DialogTitle>
            <DialogDescription>
              Détails complets du document d'archive
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {documentToView ? (
              <div className="space-y-4">
                {/* Informations principales */}
                <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Nom du document:</span>
                    <span className="font-semibold text-gray-900 dark:text-white text-right max-w-xs truncate">
                      {documentToView.name}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Catégorie:</span>
                    <Badge variant="outline" className="text-green-600 border-green-600">
                      {documentToView.categoryName || documentToView.category}
                    </Badge>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Taille du fichier:</span>
                    <span className="font-medium text-gray-900 dark:text-white">
                      {formatFileSize(documentToView.file_size)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Type de fichier:</span>
                    <span className="font-medium text-gray-900 dark:text-white">
                      {documentToView.file_type || 'Non spécifié'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Date d'upload:</span>
                    <span className="font-medium text-gray-900 dark:text-white">
                      {documentToView.upload_date ?
                        new Date(documentToView.upload_date).toLocaleDateString('fr-FR', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        }) :
                        'Date inconnue'
                      }
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-600 dark:text-gray-400">ID du document:</span>
                    <span className="font-mono text-xs text-gray-500 dark:text-gray-400">
                      {documentToView.id}
                    </span>
                  </div>

                  {documentToView.description && (
                    <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
                      <span className="text-sm font-medium text-gray-600 dark:text-gray-400 block mb-2">Description:</span>
                      <p className="text-sm text-gray-900 dark:text-white bg-white dark:bg-gray-900 p-3 rounded border">
                        {documentToView.description}
                      </p>
                    </div>
                  )}

                  {documentToView.document_path && (
                    <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
                      <span className="text-sm font-medium text-gray-600 dark:text-gray-400 block mb-2">Chemin serveur:</span>
                      <code className="text-xs text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-900 p-2 rounded border block break-all">
                        {documentToView.document_path}
                      </code>
                    </div>
                  )}
                </div>

                {/* Statut du fichier */}
                <div className="flex items-center justify-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                  {documentToView.document_path ? (
                    <div className="flex items-center space-x-2 text-green-700 dark:text-green-400">
                      <CheckCircle className="h-5 w-5" />
                      <span className="font-medium">Fichier disponible sur le serveur</span>
                    </div>
                  ) : (
                    <div className="flex items-center space-x-2 text-amber-700 dark:text-amber-400">
                      <AlertCircle className="h-5 w-5" />
                      <span className="font-medium">Aucun fichier uploadé</span>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <FileX className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600 dark:text-gray-400">Aucune information disponible</p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </ProtectedLayout>
  );
}
