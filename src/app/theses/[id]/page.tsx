"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion } from 'framer-motion';
import { ArrowLeft, Edit, Trash2, BookOpen, User, Building, Calendar, DollarSign, Package, FileText, Download, Tag, School, GraduationCap, Briefcase, MapPin } from "lucide-react";
import { safeKeywordsToArray } from "@/lib/utils/keywords-utils";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { DarkModeButton } from "@/components/ui/dark-mode-button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import ProtectedLayout from "@/components/layout/protected-layout";
import { useToast } from "@/hooks/use-toast";
import { useRefresh } from "@/contexts/refresh-context";
import { DeleteConfirmationDialog } from "@/components/ui/delete-confirmation-dialog";

import { useReliableRefresh } from "@/hooks";

interface AcademicDocument {
  id: string;
  title: string;
  author: string;
  student_id?: string;
  supervisor: string;
  co_director?: string;
  degree: string;
  specialty?: string;
  year?: number;
  defense_date?: string;
  document_type: 'these' | 'memoire' | 'rapport_stage';
  university?: string;
  faculty?: string;
  department?: string;
  pagination?: string;
  document_path?: string;
  file_type?: string;
  document_size?: number;
  is_accessible?: boolean;
  created_at: string;
  updated_at?: string;
  summary?: string;
  abstract?: string;
  keywords?: string[];
  keywords_en?: string[];
  dewey_classification?: string;
  cdu_classification?: string;
  subject_headings?: string[];
  available_copies?: number;
  total_copies?: number;
  barcode?: string;
  cames_id?: string;
  local_id?: string;
  handle?: string;
  doi?: string;
  status?: string;
  target_audience?: string;
  format?: string;
  language?: string;
  physical_location?: string;
  view_count?: number;
  institution?: string;
  country?: string;
  access_rights?: string;
  license?: string;
  // Champs spécifiques aux rapports de stage
  company_name?: string;
  stage_type?: string;
  field_of_study?: string;
  academic_year?: string;
  stage_start_date?: string;
  stage_end_date?: string;
  stage_duration?: number;
  tasks_performed?: string;
  skills_acquired?: string;
  recommendations?: string;
  // Informations spécifiques selon le type
  methodology?: string; // Pour mémoires
  objectives?: string; // Pour rapports de stage
  internship_company?: string; // Pour rapports de stage (ancien champ)
  internship_duration?: string; // Pour rapports de stage (ancien champ)
  grade?: number; // Pour mémoires (note sur 20)
  mention?: string; // Pour mémoires
  conclusion?: string;
  // Champs spécifiques aux mémoires
  co_supervisor?: string; // Co-encadreur pour mémoires
  // Propriétés physiques et gestion
  pages?: number;
  dimensions?: string;
  weight?: number;
  condition?: string;
  notes?: string;
  acquisition_mode?: string;
  price?: number;
  // Relations et documents connexes
  related_documents?: any[];
  same_author_documents?: any[];
  same_domain_documents?: any[];
  // Nouvelles propriétés pour le système de statut unifié
  availability_status?: 'disponible' | 'indisponible';
  is_borrowed?: boolean;
  is_reserved?: boolean;
  defense_year?: number;
}

export default function DocumentDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const { subscribe } = useRefresh();
  const [document, setDocument] = useState<AcademicDocument | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  // États pour le dialogue de suppression
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  // Fonction pour charger les données du document
  const fetchDocument = useCallback(async () => {
    if (!params?.id) return;

    try {
      setLoading(true);
      const response = await fetch(`/api/academic-documents/${params?.id}`);

      if (!response.ok) {
        throw new Error('Document non trouvé');
      }

      const data = await response.json();
      setDocument(data.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue');
      toast({
        title: "Erreur",
        description: "Impossible de charger le document",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [params?.id, toast]);

  // Système de rafraîchissement avec debouncing
  const { debouncedRefresh } = useReliableRefresh({
    onRefresh: fetchDocument,
    fallbackDelay: 2000
  });

  // Charger le document au montage et s'abonner aux changements
  useEffect(() => {
    fetchDocument();

    // S'abonner aux changements de documents académiques et emprunts avec debouncing
    const unsubscribeAcademic = subscribe('academic-documents', debouncedRefresh);
    const unsubscribeLoan = subscribe('loans', debouncedRefresh);

    return () => {
      unsubscribeAcademic();
      unsubscribeLoan();
    };
  }, [fetchDocument, subscribe, debouncedRefresh]);

  const handleDelete = () => {
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!document) return;

    try {
      setDeleting(true);
      const response = await fetch(`/api/academic-documents/${document.id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        toast({
          title: "Succès",
          description: "Document supprimé avec succès",
        });
        router.push('/theses');
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
      setDeleting(false);
      setDeleteDialogOpen(false);
    }
  };

  const getDocumentIcon = () => {
    switch (document?.document_type) {
      case 'these':
        return <GraduationCap className="h-8 w-8 text-pink-600 dark:text-pink-400" />;
      case 'memoire':
        return <FileText className="h-8 w-8 text-green-600 dark:text-green-400" />;
      case 'rapport_stage':
        return <Briefcase className="h-8 w-8 text-purple-600 dark:text-purple-400" />;
      default:
        return <FileText className="h-8 w-8 text-gray-600 dark:text-gray-400" />;
    }
  };

  const getDocumentTypeLabel = () => {
    switch (document?.document_type) {
      case 'these':
        return 'Thèse';
      case 'memoire':
        return 'Mémoire';
      case 'rapport_stage':
        return 'Rapport de stage';
      default:
        return 'Document';
    }
  };

  const getDocumentTypeBadge = () => {
    const baseClasses = "px-3 py-1 rounded-full text-sm font-bold border shadow-sm";
    switch (document?.document_type) {
      case 'these':
        return `${baseClasses} bg-pink-600 text-white border-pink-700 dark:bg-pink-500 dark:border-pink-400`;
      case 'memoire':
        return `${baseClasses} bg-green-600 text-white border-green-700 dark:bg-green-500 dark:border-green-400`;
      case 'rapport_stage':
        return `${baseClasses} bg-gray-600 text-white border-gray-700 dark:bg-gray-500 dark:border-gray-400`;
      default:
        return `${baseClasses} bg-gray-600 text-white border-gray-700 dark:bg-gray-500 dark:border-gray-400`;
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
                <GraduationCap className="h-12 w-12 text-green-600 mx-auto" />
              </motion.div>
              <span className="text-lg font-medium text-gray-600 dark:text-gray-300">
                Chargement du document...
              </span>
            </div>
          </motion.div>
        </div>
      </ProtectedLayout>
    );
  }

  if (error || !document) {
    return (
      <ProtectedLayout>
        <div className="container mx-auto px-4 py-8">
          <div className="text-center py-8">
            <p className="text-red-600 dark:text-red-400 mb-4">{error || 'Document non trouvé'}</p>
            <Button asChild variant="outline">
              <Link href="/theses">
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
        {/* Header professionnel avec glassmorphism */}
        <motion.div
          className="glass-nav shadow-lg border-b border-white/20 dark:border-gray-700/20 relative overflow-hidden bg-white/95 dark:bg-gray-900/95 backdrop-blur-md"
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.6 }}
        >
          {/* Effet glassmorphism background */}
          <div className="absolute inset-0 bg-gradient-to-r from-green-500/5 via-transparent to-gray-500/5" />

          <div className="relative z-10 container mx-auto px-3 sm:px-4 md:px-6 py-4 sm:py-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
              <div className="flex items-center space-x-3 sm:space-x-4">
                <Button variant="ghost" size="sm" asChild>
                  <Link href="/theses">
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
                    {getDocumentIcon()}
                  </motion.div>
                  <div>
                    <motion.h1
                      className="text-xl sm:text-2xl md:text-3xl font-bold bg-gradient-to-r from-slate-800 via-green-600 to-slate-800 dark:from-slate-200 dark:via-green-400 dark:to-slate-200 bg-clip-text text-transparent"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.4, delay: 0.1 }}
                    >
                      {getDocumentTypeLabel()}
                    </motion.h1>
                    <motion.p
                      className="text-sm sm:text-base text-gray-600 dark:text-gray-300 mt-1 font-medium"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.4, delay: 0.2 }}
                    >
                      Détails du document académique
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
                  <Link href={`/theses/${document.id}/edit`}>
                    <Edit className="h-4 w-4 mr-2" />
                    Modifier
                  </Link>
                </DarkModeButton>
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

        <div className="container mx-auto px-4 lg:px-8 py-8 max-w-full">

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
                  {getDocumentIcon()}
                </motion.div>
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2">
                    <CardTitle className="text-2xl">{document.title}</CardTitle>
                    <div className={getDocumentTypeBadge()}>
                      {getDocumentTypeLabel()}
                    </div>
                  </div>
                  <CardDescription className="text-lg">
                    par <strong>{document.author}</strong>
                  </CardDescription>
                </div>
              </div>
            </CardHeader>

            <CardContent>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Section Identification */}
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-semibold mb-4 flex items-center text-orange-600 dark:text-orange-400">
                      <Tag className="h-5 w-5 mr-2" />
                      Identification
                    </h3>
                    <div className="space-y-2 text-sm">
                      <p><strong>ID document:</strong> 
                        <span className="font-mono bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded ml-2 text-xs">
                          {document.id}
                        </span>
                      </p>
                      <p><strong>Type:</strong> 
                        <span className="font-mono bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded ml-2">
                          {document.document_type === 'these' ? 'Thèse' : 
                           document.document_type === 'memoire' ? 'Mémoire' : 'Rapport de stage'}
                        </span>
                      </p>
                      {document.defense_date && (
                        <p><strong>Date de dépôt:</strong> 
                          <span className="font-mono bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded ml-2">
                            {new Date(document.defense_date).toLocaleDateString('fr-FR')}
                          </span>
                        </p>
                      )}
                      {document.language && (
                        <p><strong>Langue:</strong> 
                          <Badge variant="outline" className="ml-2">
                            {document.language === 'fr' ? 'Français' : 
                             document.language === 'en' ? 'Anglais' : 
                             document.language === 'es' ? 'Espagnol' : 
                             document.language === 'de' ? 'Allemand' : 
                             document.language === 'ar' ? 'Arabe' : document.language}
                          </Badge>
                        </p>
                      )}
                      {document.format && (
                        <p><strong>Format:</strong> 
                          <Badge variant="outline" className="ml-2">
                            {document.format === 'print' ? 'Imprimé' : 
                             document.format === 'digital' ? 'Numérique' : 
                             document.format === 'hybrid' ? 'Hybride' : document.format}
                          </Badge>
                        </p>
                      )}

                    </div>
                  </div>

                  {/* Informations physiques et techniques */}
                  {(document.pages || document.dimensions || document.weight || document.condition || document.physical_location || document.status) && (
                    <div>
                      <h3 className="text-lg font-semibold mb-4 flex items-center text-blue-600 dark:text-blue-400">
                        <BookOpen className="h-5 w-5 mr-2" />
                        Caractéristiques physiques
                      </h3>
                      <div className="space-y-2 text-sm">
                        {document.pages && <p><strong>Nombre de pages:</strong> {document.pages}</p>}
                        {document.dimensions && <p><strong>Dimensions:</strong> {document.dimensions}</p>}
                        {document.weight && <p><strong>Poids:</strong> {document.weight}g</p>}
                        {document.condition && (
                          <p><strong>État:</strong> 
                            <Badge 
                              variant={document.condition === 'excellent' ? 'default' : 
                                      document.condition === 'good' ? 'secondary' : 'destructive'} 
                              className="ml-2"
                            >
                              {document.condition === 'excellent' ? 'Excellent' :
                               document.condition === 'good' ? 'Bon' :
                               document.condition === 'fair' ? 'Correct' :
                               document.condition === 'poor' ? 'Mauvais' : document.condition}
                            </Badge>
                          </p>
                        )}
                        {document.physical_location && (
                          <p><strong>Localisation:</strong>
                            <span className="font-mono bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded ml-2 text-xs">
                              {document.physical_location}
                            </span>
                          </p>
                        )}
                        {/* Affichage du statut unifié */}
                        {(document.availability_status || document.status) && (
                          <p><strong>Statut:</strong>
                            <Badge
                              variant={
                                (document.availability_status === 'disponible' || document.status === 'available') ? 'default' :
                                (document.availability_status === 'indisponible' || document.status === 'maintenance') ? 'destructive' :
                                'secondary'
                              }
                              className="ml-2"
                            >
                              {/* Priorité au nouveau statut unifié */}
                              {document.availability_status === 'disponible' ? 'Disponible' :
                               document.availability_status === 'indisponible' ? 'Indisponible' :
                               document.status === 'available' ? 'Disponible' :
                               document.status === 'borrowed' ? 'Emprunté' :
                               document.status === 'reserved' ? 'Réservé' :
                               document.status === 'maintenance' ? 'En maintenance' :
                               document.status === 'lost' ? 'Perdu' :
                               document.status === 'damaged' ? 'Endommagé' :
                               document.availability_status || document.status}
                            </Badge>
                          </p>
                        )}

                        {/* Affichage des détails si indisponible */}
                        {document.availability_status === 'indisponible' && (document.is_borrowed || document.is_reserved) && (
                          <div className="mt-2 flex gap-2">
                            {document.is_borrowed && (
                              <Badge variant="warning" className="text-xs">
                                Actuellement emprunté
                              </Badge>
                            )}
                            {document.is_reserved && (
                              <Badge variant="outline" className="text-xs border-yellow-400 text-yellow-700 dark:text-yellow-300">
                                Réservé
                              </Badge>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Informations académiques */}
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-semibold mb-4 flex items-center">
                      <User className="h-5 w-5 mr-2 text-green-600" />
                      Informations académiques
                    </h3>
                    <div className="space-y-3 text-sm">
                      {/* Informations de base */}
                      <p><strong>Titre:</strong> {document.title}</p>
                      <p><strong>
                        {document.document_type === 'these' ? 'Auteur:' :
                         document.document_type === 'memoire' ? 'Étudiant:' : 'Étudiant:'}
                      </strong> {document.author}</p>
                      
                      {/* Encadrement */}
                      {document.supervisor && (
                        <p><strong>
                          {document.document_type === 'these' ? 'Directeur de thèse (Encadreur académique):' :
                           document.document_type === 'memoire' ? 'Superviseur (Encadreur académique - Enseignant):' : 'Superviseur de stage (Encadreur académique):'}
                        </strong> {document.supervisor}</p>
                      )}
                      {document.co_director && (
                        <p><strong>Co-directeur (Co-encadreur académique):</strong> {document.co_director}</p>
                      )}
                      {document.document_type === 'memoire' && document.co_supervisor && (
                        <p><strong>Co-superviseur (Encadreur professionnel - Entreprise/Organisation):</strong> {document.co_supervisor}</p>
                      )}
                      {document.document_type === 'rapport_stage' && (document as any).company_supervisor && (
                        <p><strong>Encadreur en entreprise (Encadreur professionnel):</strong> {(document as any).company_supervisor}</p>
                      )}
                      
                      {/* Département */}
                      {document.department && (
                        <p><strong>Département:</strong> {document.department}</p>
                      )}
                      
                      {/* Diplôme et niveau */}
                      {document.degree && (
                        <p><strong>
                          {document.document_type === 'these' ? 'Diplôme visé:' :
                           document.document_type === 'memoire' ? 'Niveau d\'études:' : 'Niveau de formation:'}
                        </strong> {document.degree}</p>
                      )}
                      
                      {/* Université */}
                      {document.university && (
                        <p><strong>Université:</strong> {document.university}</p>
                      )}
                      
                      {/* Spécialité/Filière */}
                      {document.specialty && (
                        <p><strong>
                          {document.document_type === 'these' ? 'Spécialité:' :
                           document.document_type === 'memoire' ? 'Spécialité:' : 'Domaine de stage:'}
                        </strong> {document.specialty}</p>
                      )}
                      
                      {/* Filière d'études pour les mémoires */}
                      {document.document_type === 'memoire' && document.field_of_study && (
                        <p><strong>Filière d'études:</strong> {document.field_of_study}</p>
                      )}
                      
                      {/* Matricule étudiant (pour tous les types de documents) */}
                      {(document.student_id || (document as any).student_id) && (
                        <p><strong>Matricule étudiant:</strong>
                          <span className="font-mono bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded ml-2 text-xs">
                            {document.student_id || (document as any).student_id}
                          </span>
                        </p>
                      )}

                      {/* Champs spécifiques aux rapports de stage */}
                      {document.document_type === 'rapport_stage' && (
                        <>
                          {(document as any).company_name && (
                            <p><strong>Entreprise de stage:</strong> {(document as any).company_name}</p>
                          )}


                          {(document as any).company_address && (
                            <p><strong>Adresse de l'entreprise:</strong> {(document as any).company_address}</p>
                          )}
                          {(document as any).company_sector && (
                            <p><strong>Secteur d'activité:</strong> {(document as any).company_sector}</p>
                          )}
                          {(document as any).field_of_study && (
                            <p><strong>Filière d'études:</strong> {(document as any).field_of_study}</p>
                          )}
                        </>
                      )}
                      
                      {/* Département */}
                      {document.department && (
                        <p><strong>Département:</strong> {document.department}</p>
                      )}
                      
                      {/* Années académiques - Affichage correct selon le type */}
                      {document.document_type === 'these' && (document.defense_year || document.year) && (
                        <p><strong>Année de soutenance:</strong> {document.defense_year || document.year}</p>
                      )}

                      {document.document_type === 'memoire' && document.academic_year && (
                        <p><strong>Année de soutenance:</strong> {document.academic_year}</p>
                      )}
                      
                      {document.defense_date && (
                        <p><strong>Date de dépôt:</strong> {new Date(document.defense_date).toLocaleDateString('fr-FR')}</p>
                      )}
                      
                      
                      {/* Pagination */}
                      {document.pagination && (
                        <p><strong>Nombre de pages:</strong> {document.pagination}</p>
                      )}
                      
                      {/* Mots-clés français */}
                      {document.keywords && document.keywords.length > 0 && (
                        <div>
                          <strong>Mots-clés (français):</strong>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {document.keywords.map((keyword, index) => (
                              <Badge key={index} variant="secondary" className="text-xs">
                                {keyword}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      {/* Mots-clés anglais */}
                      {document.keywords_en && (
                        <div>
                          <strong>Mots-clés (anglais):</strong>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {(() => {
                              // Utiliser la fonction utilitaire pour une gestion sécurisée
                              const keywords = safeKeywordsToArray(document.keywords_en);
                              
                              return keywords.length > 0 ? keywords.map((keyword, index) => (
                                <Badge key={index} variant="secondary" className="text-xs">
                                  {keyword}
                                </Badge>
                              )) : <span className="text-gray-500 text-xs">Aucun mot-clé anglais</span>;
                            })()}
                          </div>
                        </div>
                      )}
                      
                      {/* Note/Mention pour mémoires */}
                      {document.document_type === 'memoire' && document.grade && (
                        <p><strong>Note obtenue:</strong> {document.grade}/20</p>
                      )}
                      
                      {document.document_type === 'memoire' && document.mention && (
                        <p><strong>Mention:</strong> {document.mention}</p>
                      )}
                    </div>
                  </div>

                  <div>
                    <h3 className="text-lg font-semibold mb-4 flex items-center">
                      <School className="h-5 w-5 mr-2 text-green-600" />
                      Institution
                    </h3>
                    <div className="space-y-2 text-sm">
                      {document.university && <p><strong>Université:</strong> {document.university}</p>}
                      {document.faculty && <p><strong>Faculté:</strong> {document.faculty}</p>}
                      
                      {/* Informations spécifiques aux rapports de stage */}
                      {document.document_type === 'rapport_stage' && (
                        <>
                          {(document as any).company_name && (
                            <p><strong>Entreprise de stage:</strong> {(document as any).company_name}</p>
                          )}
                          {(document as any).academic_year && (
                            <p><strong>Année académique:</strong>
                              <Badge variant="outline" className="ml-2">
                                {(document as any).academic_year}
                              </Badge>
                            </p>
                          )}
                        </>
                      )}
                      
                      {/* Anciens champs pour compatibilité */}
                      {document.internship_company && !((document as any).company_name) && (
                        <p><strong>Entreprise de stage:</strong> {document.internship_company}</p>
                      )}
                    </div>
                  </div>

                  {/* Contenu spécialisé selon le type */}
                  {(document.methodology || document.objectives || document.tasks_performed || document.skills_acquired || document.recommendations || document.conclusion) && (
                    <div>
                      <h3 className="text-lg font-semibold mb-4 flex items-center text-purple-600 dark:text-purple-400">
                        <FileText className="h-5 w-5 mr-2" />
                        Contenu spécialisé
                      </h3>
                      <div className="space-y-2 text-sm">
                        {document.methodology && (
                          <div>
                            <p><strong>Méthodologie:</strong></p>
                            <div className="bg-gray-100 dark:bg-gray-800 p-2 rounded mt-1">
                              <p className="text-xs">{document.methodology}</p>
                            </div>
                          </div>
                        )}
                        {document.objectives && (
                          <div>
                            <p><strong>Objectifs:</strong></p>
                            <div className="bg-gray-100 dark:bg-gray-800 p-2 rounded mt-1">
                              <p className="text-xs">{document.objectives}</p>
                            </div>
                          </div>
                        )}
                        {document.tasks_performed && (
                          <div>
                            <p><strong>Tâches réalisées:</strong></p>
                            <div className="bg-gray-100 dark:bg-gray-800 p-2 rounded mt-1">
                              <p className="text-xs">{document.tasks_performed}</p>
                            </div>
                          </div>
                        )}
                        {document.skills_acquired && (
                          <div>
                            <p><strong>Compétences acquises:</strong></p>
                            <div className="bg-gray-100 dark:bg-gray-800 p-2 rounded mt-1">
                              <p className="text-xs">{document.skills_acquired}</p>
                            </div>
                          </div>
                        )}
                        {document.recommendations && (
                          <div>
                            <p><strong>Recommandations:</strong></p>
                            <div className="bg-gray-100 dark:bg-gray-800 p-2 rounded mt-1">
                              <p className="text-xs">{document.recommendations}</p>
                            </div>
                          </div>
                        )}
                        {document.conclusion && (
                          <div>
                            <p><strong>
                              {document.document_type === 'memoire' ? 'Conclusion principale:' : 'Conclusion:'}
                            </strong></p>
                            <div className="bg-gray-100 dark:bg-gray-800 p-2 rounded mt-1">
                              <p className="text-xs">{document.conclusion}</p>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Classification documentaire */}
                  {(document.dewey_classification || document.cdu_classification || (document.subject_headings && document.subject_headings.length > 0)) && (
                    <div>
                      <h3 className="text-lg font-semibold mb-4 flex items-center">
                        <BookOpen className="h-5 w-5 mr-2 text-orange-600" />
                        Classification documentaire
                      </h3>
                      <div className="space-y-2 text-sm">
                        {document.dewey_classification && (
                          <p><strong>Classification Dewey:</strong> {document.dewey_classification}</p>
                        )}
                        {document.cdu_classification && (
                          <p><strong>Classification CDU:</strong> {document.cdu_classification}</p>
                        )}
                        {document.subject_headings && document.subject_headings.length > 0 && (
                          <div>
                            <p className="font-semibold mb-2">Vedettes-matières:</p>
                            <div className="flex flex-wrap gap-1">
                              {document.subject_headings.map((heading, index) => (
                                <Badge key={index} className="text-xs bg-slate-700 dark:bg-gray-600 text-white border-slate-600 dark:border-gray-500 shadow-sm">
                                  <Tag className="h-3 w-3 mr-1" />
                                  {heading}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Statistiques et gestion */}
                <div className="space-y-6">

                  {/* Informations temporelles */}
                  <div>
                    <h3 className="text-lg font-semibold mb-4 flex items-center">
                      <Calendar className="h-5 w-5 mr-2 text-purple-600" />
                      Informations temporelles
                    </h3>
                    <div className="space-y-2 text-sm">
                      <p><strong>
                        {document.document_type === 'these' ? 'Année de soutenance:' :
                         document.document_type === 'memoire' ? 'Année de soutenance:' : 'Année de soutenance:'}
                      </strong> {
                        document.document_type === 'these' ? (document.defense_year || document.year || 'Non spécifiée') :
                        document.document_type === 'memoire' ? (document.academic_year || 'Non spécifiée') :
                        (document.academic_year || 'Non spécifiée')
                      }</p>
                      {document.defense_date && (
                        <p><strong>Date de dépôt:</strong> {new Date(document.defense_date).toLocaleDateString('fr-FR')}</p>
                      )}
                      <p><strong>Ajouté le:</strong> {new Date(document.created_at).toLocaleDateString('fr-FR')}</p>
                      {document.updated_at && (
                        <p><strong>Modifié le:</strong> {new Date(document.updated_at).toLocaleDateString('fr-FR')}</p>
                      )}
                    </div>
                  </div>


                </div>
              </div>

              {/* Section du document numérique - Pleine largeur */}
              {document.document_path && (
                <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
                  <div className="bg-transparent dark:bg-gray-800 rounded-lg border border-green-200 dark:border-gray-600 p-5">
                    <h3 className="text-lg font-semibold mb-4 flex items-center text-blue-800 dark:text-white">
                      <FileText className="h-5 w-5 mr-2" />
                      Document numérique
                    </h3>

                    {/* Nom du fichier avec icône */}
                    <div className="bg-gray-100 dark:bg-gray-700 p-4 rounded-md border border-gray-200 dark:border-gray-600 shadow-sm mb-4">
                      <p className="font-medium text-gray-900 dark:text-white text-sm break-all flex items-center">
                        <span className="text-green-600 dark:text-green-400 mr-2 text-base">📄</span>
                        {document.document_path.split('/').pop()}
                      </p>
                    </div>

                    {/* Informations du fichier */}
                    <div className="space-y-3 text-sm">
                      <div className="bg-gray-100 dark:bg-gray-700 p-3 rounded-md border border-gray-200 dark:border-gray-600">
                        <div className="flex items-center justify-between">
                          <span className="text-gray-600 dark:text-gray-300 font-medium">Type:</span>
                          <span className="font-semibold text-white bg-green-600 dark:bg-green-500 px-2 py-1 rounded text-xs shadow-sm">
                            application/pdf
                          </span>
                        </div>
                      </div>

                      {document.document_size && (
                        <div className="bg-gray-100 dark:bg-gray-700 p-3 rounded-md border border-gray-200 dark:border-gray-600">
                          <div className="flex items-center justify-between">
                            <span className="text-gray-600 dark:text-gray-300 font-medium">Taille:</span>
                            <span className="font-semibold text-white bg-purple-600 dark:bg-purple-500 px-2 py-1 rounded text-xs shadow-sm">
                              {(document.document_size / 1024 / 1024).toFixed(2)} MB
                            </span>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Bouton de téléchargement */}
                    <div className="flex justify-center pt-3">
                      <Button
                        asChild
                        className="bg-green-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-green-600 text-white border-0 shadow-md hover:shadow-lg transition-all duration-200 w-full sm:w-auto"
                      >
                        <a href={`/api/academic-documents/${document.id}/download`} target="_blank" rel="noopener noreferrer">
                          <Download className="h-4 w-4 mr-2" />
                          Télécharger le document
                        </a>
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {/* Section résumé et abstract */}
              {(document.summary || document.abstract) && (
                <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {document.summary && (
                      <div>
                        <h3 className="text-lg font-semibold mb-3 flex items-center">
                          <FileText className="h-5 w-5 mr-2 text-green-600" />
                          Résumé
                        </h3>
                        <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-600">
                          <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed break-words overflow-wrap-anywhere whitespace-pre-wrap">
                            {document.summary}
                          </p>
                        </div>
                      </div>
                    )}

                    {document.abstract && (
                      <div>
                        <h3 className="text-lg font-semibold mb-3 flex items-center">
                          <BookOpen className="h-5 w-5 mr-2 text-green-600" />
                          Abstract
                        </h3>
                        <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-600">
                          <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed break-words overflow-wrap-anywhere whitespace-pre-wrap">
                            {document.abstract}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Section Documents Connexes */}
              {((document.related_documents?.length ?? 0) > 0 || (document.same_author_documents?.length ?? 0) > 0 || (document.same_domain_documents?.length ?? 0) > 0) && (
                <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
                  <h3 className="text-lg font-semibold mb-4 flex items-center text-indigo-600 dark:text-indigo-400">
                    <GraduationCap className="h-5 w-5 mr-2" />
                    Documents Connexes
                  </h3>
                  
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Documents du même auteur */}
                    {(document.same_author_documents?.length ?? 0) > 0 && (
                      <div>
                        <h4 className="font-semibold text-gray-800 dark:text-gray-200 mb-3">
                          Du même auteur ({document.same_author_documents?.length ?? 0})
                        </h4>
                        <div className="space-y-2">
                          {document.same_author_documents?.slice(0, 3).map((relatedDoc: any, index: number) => (
                            <div key={index} className="p-2 bg-gray-50 dark:bg-gray-800 rounded border">
                              <Link 
                                href={`/theses/${relatedDoc.id}`}
                                className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline"
                              >
                                {relatedDoc.title}
                              </Link>
                              <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                                {relatedDoc.document_type === 'these' ? 'Thèse' : 
                                 relatedDoc.document_type === 'memoire' ? 'Mémoire' : 'Rapport'} - {relatedDoc.year}
                              </p>
                            </div>
                          ))}
                          {(document.same_author_documents?.length ?? 0) > 3 && (
                            <p className="text-xs text-gray-500">
                              +{(document.same_author_documents?.length ?? 0) - 3} autres documents
                            </p>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Documents du même domaine */}
                    {(document.same_domain_documents?.length ?? 0) > 0 && (
                      <div>
                        <h4 className="font-semibold text-gray-800 dark:text-gray-200 mb-3">
                          Même domaine ({document.same_domain_documents?.length ?? 0})
                        </h4>
                        <div className="space-y-2">
                          {document.same_domain_documents?.slice(0, 3).map((relatedDoc: any, index: number) => (
                            <div key={index} className="p-2 bg-gray-50 dark:bg-gray-800 rounded border">
                              <Link 
                                href={`/theses/${relatedDoc.id}`}
                                className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline"
                              >
                                {relatedDoc.title}
                              </Link>
                              <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                                par {relatedDoc.author}
                              </p>
                            </div>
                          ))}
                          {(document.same_domain_documents?.length ?? 0) > 3 && (
                            <p className="text-xs text-gray-500">
                              +{(document.same_domain_documents?.length ?? 0) - 3} autres documents
                            </p>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Documents connexes/recommandés */}
                    {(document.related_documents?.length ?? 0) > 0 && (
                      <div>
                        <h4 className="font-semibold text-gray-800 dark:text-gray-200 mb-3">
                          Recommandés ({document.related_documents?.length ?? 0})
                        </h4>
                        <div className="space-y-2">
                          {document.related_documents?.slice(0, 3).map((relatedDoc: any, index: number) => (
                            <div key={index} className="p-2 bg-gray-50 dark:bg-gray-800 rounded border">
                              <Link 
                                href={`/theses/${relatedDoc.id}`}
                                className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline"
                              >
                                {relatedDoc.title}
                              </Link>
                              <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                                par {relatedDoc.author}
                              </p>
                            </div>
                          ))}
                          {(document.related_documents?.length ?? 0) > 3 && (
                            <p className="text-xs text-gray-500">
                              +{(document.related_documents?.length ?? 0) - 3} autres documents
                            </p>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
        </div>
      </div>

      {/* Dialogue de confirmation de suppression */}
      <DeleteConfirmationDialog
        isOpen={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        onConfirm={confirmDelete}
        title={`Supprimer ${document?.document_type === 'these' ? 'la thèse' :
                           document?.document_type === 'memoire' ? 'le mémoire' : 'le rapport de stage'}`}
        itemName={document?.title}
        itemType={document?.document_type === 'these' ? 'thèse' :
                  document?.document_type === 'memoire' ? 'mémoire' : 'rapport de stage'}
        isLoading={deleting}
      />
    </ProtectedLayout>
  );
}
