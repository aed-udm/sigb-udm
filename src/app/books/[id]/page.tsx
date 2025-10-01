"use client";

import { useState, useEffect, useCallback } from "react";
import { useReliableRefresh } from '@/hooks/useReliableRefresh';
import { useParams, useRouter } from "next/navigation";
import { motion } from 'framer-motion';
import { ArrowLeft, Edit, Trash2, BookOpen, User, Building, Calendar, Package, FileText, Download, Tag } from "lucide-react";
import Link from "next/link";
import { FcfaIcon } from "@/components/ui/fcfa-icon";

import { Button } from "@/components/ui/button";
import { DarkModeButton } from "@/components/ui/dark-mode-button";
import { safeKeywordsToArray } from "@/lib/utils/keywords-utils";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import ProtectedLayout from "@/components/layout/protected-layout";
import { useToast } from "@/hooks/use-toast";

import { useRefresh } from "@/contexts/refresh-context";
import { DeleteConfirmationDialog } from "@/components/ui/delete-confirmation-dialog";



interface Book {
  id: string;
  mfn: string;
  isbn?: string;
  title: string;
  subtitle?: string;
  parallel_title?: string;
  main_author: string;
  secondary_author?: string;
  edition?: string;
  publication_city?: string;
  publisher?: string;
  publication_year?: number;
  acquisition_mode?: string;
  price?: number;
  domain?: string;
  collection?: string;
  summary?: string;
  abstract?: string;
  keywords?: string[];
  keywords_en?: string | string[];
  dewey_classification?: string;
  cdu_classification?: string;
  subject_headings?: string[];
  total_copies: number;
  available_copies: number;
  document_path?: string;
  file_type?: string;
  document_size?: number;
  created_at: string;
  updated_at?: string;
  // Champs SIGB complets
  language?: string;
  format?: string;
  target_audience?: string;
  physical_location?: string;
  // Statistiques d'utilisation
  total_loans?: number;
  current_loans?: number;
  total_reservations?: number;
  current_reservations?: number;
  popularity_score?: number;
  last_borrowed_date?: string;
  // Informations physiques
  pages?: number;
  dimensions?: string;
  weight?: number;
  condition?: string;
  notes?: string;
  // Relations
  related_books?: any[];
  same_author_books?: any[];
  same_domain_books?: any[];
}

export default function BookDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const { subscribe } = useRefresh();
  const [book, setBook] = useState<Book | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  // États pour le dialogue de suppression
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  // Fonction pour charger les données du livre
  const fetchBook = useCallback(async () => {
    if (!params?.id) return;

    try {
      setLoading(true);
      const response = await fetch(`/api/books/${params.id}`);

      if (!response.ok) {
        throw new Error('Livre non trouvé');
      }

      const data = await response.json();
      console.log('Book data received:', data.data); // Debug log
      console.log('Document path:', data.data?.document_path); // Debug log
      setBook(data.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue');
      toast({
        title: "Erreur",
        description: "Impossible de charger le livre",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [params?.id, toast]);

  // Système de rafraîchissement avec debouncing
  const { refresh } = useReliableRefresh(fetchBook, 2000);

  // Charger le livre au montage et s'abonner aux changements
  useEffect(() => {
    fetchBook();

    // S'abonner aux changements de livres et emprunts avec debouncing
    const unsubscribeBook = subscribe('books', refresh);
    const unsubscribeLoan = subscribe('loans', refresh);

    return () => {
      unsubscribeBook();
      unsubscribeLoan();
    };
  }, [fetchBook, subscribe, refresh]);

  const handleDelete = () => {
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!book) return;

    try {
      setDeleting(true);
      const response = await fetch(`/api/books/${book.id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        toast({
          title: "Succès",
          description: "Livre supprimé avec succès",
        });
        router.push('/books');
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || 'Erreur lors de la suppression');
      }
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message || "Impossible de supprimer le livre",
        variant: "destructive",
      });
    } finally {
      setDeleting(false);
      setDeleteDialogOpen(false);
    }
  };

  if (loading) {
    return (
      <ProtectedLayout>
        <div className="container mx-auto px-3 sm:px-4 md:px-6 py-4 sm:py-6 md:py-7 lg:py-8">
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
                <BookOpen className="h-12 w-12 text-blue-600 mx-auto" />
              </motion.div>
              <span className="text-lg font-medium text-gray-600 dark:text-gray-300">
                Chargement du livre...
              </span>
            </div>
          </motion.div>
        </div>
      </ProtectedLayout>
    );
  }

  if (error || !book) {
    return (
      <ProtectedLayout>
        <div className="container mx-auto px-3 sm:px-4 md:px-6 py-4 sm:py-6 md:py-7 lg:py-8">
          <div className="text-center py-8">
            <p className="text-red-600 dark:text-red-400 mb-4">{error || 'Livre non trouvé'}</p>
            <Button asChild variant="outline">
              <Link href="/books">
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
                  <Link href="/books">
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
                    <BookOpen className="h-6 w-6 sm:h-8 sm:w-8 text-blue-600 drop-shadow-lg" />
                  </motion.div>
                  <div>
                    <motion.h1
                      className="text-xl sm:text-2xl md:text-3xl font-bold bg-gradient-to-r from-slate-800 via-green-600 to-slate-800 dark:from-slate-200 dark:via-green-400 dark:to-slate-200 bg-clip-text text-transparent"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.4, delay: 0.1 }}
                    >
                      Détails du Livre
                    </motion.h1>
                    <motion.p
                      className="text-sm sm:text-base text-gray-600 dark:text-gray-300 mt-1 font-medium"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.4, delay: 0.2 }}
                    >
                      Informations complètes du livre
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
                  <Link href={`/books/${book.id}/edit`}>
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

        <div className="container mx-auto px-3 sm:px-4 md:px-6 py-4 sm:py-6 md:py-7 lg:py-8">

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
                  <BookOpen className="h-8 w-8 text-blue-600" />
                </motion.div>
                <div className="flex-1">
                  {/* Titre sur une ligne séparée pour mobile */}
                  <div className="mb-2">
                    <CardTitle className="text-xl sm:text-2xl">{book.title}</CardTitle>
                  </div>

                  {/* Badges sur une ligne séparée pour éviter les problèmes de responsive */}
                  <div className="flex flex-wrap gap-2 mb-2">
                    <Badge variant={book.available_copies > 0 ? "default" : "destructive"}>
                      {book.available_copies > 0 ? 'Disponible' : 'Indisponible'}
                    </Badge>
                  </div>
                  {book.subtitle && (
                    <CardDescription className="text-lg italic mb-2">
                      {book.subtitle}
                    </CardDescription>
                  )}
                  <CardDescription className="text-lg">
                    par <strong>{book.main_author}</strong>
                    {book.secondary_author && ` et ${book.secondary_author}`}
                  </CardDescription>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <Badge variant="outline" className="text-xs sm:text-sm">MFN: {book.mfn}</Badge>
                    {book.isbn && <Badge variant="outline" className="text-xs sm:text-sm">ISBN: {book.isbn}</Badge>}
                  </div>
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
                      <p><strong>ID livre:</strong> 
                        <span className="font-mono bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded ml-2 text-xs">
                          {book.id}
                        </span>
                      </p>
                      <p><strong>MFN:</strong> 
                        <span className="font-mono bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded ml-2">
                          {book.mfn}
                        </span>
                      </p>
                      {book.isbn && (
                        <p><strong>ISBN:</strong> 
                          <span className="font-mono bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded ml-2">
                            {book.isbn}
                          </span>
                        </p>
                      )}
                      {book.language && (
                        <div><strong>Langue:</strong> 
                          <Badge variant="outline" className="ml-2">
                            {book.language === 'fr' ? 'Français' : 
                             book.language === 'en' ? 'Anglais' : 
                             book.language === 'es' ? 'Espagnol' : 
                             book.language === 'de' ? 'Allemand' : 
                             book.language === 'ar' ? 'Arabe' : book.language}
                          </Badge>
                        </div>
                      )}
                      {book.format && (
                        <div><strong>Format:</strong> 
                          <Badge variant="outline" className="ml-2">
                            {book.format === 'print' ? 'Imprimé' : 
                             book.format === 'digital' ? 'Numérique' : 
                             book.format === 'ebook' ? 'Livre électronique' :
                             book.format === 'audiobook' ? 'Livre audio' :
                             book.format === 'hardcover' ? 'Relié' :
                             book.format === 'paperback' ? 'Broché' :
                             book.format === 'pocket' ? 'Poche' :
                             book.format === 'large_print' ? 'Gros caractères' :
                             book.format === 'braille' ? 'Braille' :
                             book.format === 'multimedia' ? 'Multimédia' : book.format}
                          </Badge>
                        </div>
                      )}
                      {book.target_audience && (
                        <div><strong>Public cible:</strong> 
                          <Badge variant="outline" className="ml-2">
                            {book.target_audience === 'general' ? 'Grand public' : 
                             book.target_audience === 'beginner' ? 'Débutant' :
                             book.target_audience === 'intermediate' ? 'Intermédiaire' :
                             book.target_audience === 'advanced' ? 'Avancé' :
                             book.target_audience === 'children' ? 'Enfants' :
                             book.target_audience === 'young_adult' ? 'Jeunes adultes' :
                             book.target_audience === 'adult' ? 'Adultes' :
                             book.target_audience === 'professional' ? 'Professionnel' :
                             book.target_audience === 'academic' ? 'Académique' :
                             book.target_audience === 'researcher' ? 'Chercheurs' : book.target_audience}
                          </Badge>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Informations physiques */}
                  {(book.pages || book.dimensions || book.weight || book.condition) && (
                    <div>
                      <h3 className="text-lg font-semibold mb-4 flex items-center text-blue-600 dark:text-blue-400">
                        <BookOpen className="h-5 w-5 mr-2" />
                        Caractéristiques physiques
                      </h3>
                      <div className="space-y-2 text-sm">
                        {book.pages && <p><strong>Nombre de pages:</strong> {book.pages}</p>}
                        {book.dimensions && <p><strong>Dimensions:</strong> {book.dimensions}</p>}
                        {book.weight && <p><strong>Poids:</strong> {book.weight}g</p>}
                        {book.condition && (
                          <p><strong>État:</strong> 
                            <Badge 
                              variant={book.condition === 'excellent' ? 'default' : 
                                      book.condition === 'good' ? 'secondary' : 'destructive'} 
                              className="ml-2"
                            >
                              {book.condition === 'excellent' ? 'Excellent' :
                               book.condition === 'good' ? 'Bon' :
                               book.condition === 'fair' ? 'Correct' :
                               book.condition === 'poor' ? 'Mauvais' : book.condition}
                            </Badge>
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Informations de publication */}
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-semibold mb-4 flex items-center">
                      <Building className="h-5 w-5 mr-2 text-green-600" />
                      Informations de publication
                    </h3>
                    <div className="space-y-2 text-sm">
                      <p><strong>Titre:</strong> {book.title}</p>
                      {book.subtitle && <p><strong>Sous-titre:</strong> {book.subtitle}</p>}
                      <p><strong>Auteur principal:</strong> {book.main_author}</p>
                      {book.secondary_author && <p><strong>Auteur secondaire:</strong> {book.secondary_author}</p>}
                      {book.publisher && <p><strong>Éditeur:</strong> {book.publisher}</p>}
                      {book.publication_city && <p><strong>Ville d'édition:</strong> {book.publication_city}</p>}
                      {book.publication_year && <p><strong>Année d'édition:</strong> {book.publication_year}</p>}
                      {book.edition && <p><strong>Édition:</strong> {book.edition}</p>}
                      {book.parallel_title && <p><strong>Titre parallèle:</strong> {book.parallel_title}</p>}
                      {book.acquisition_mode && <p><strong>Mode d'acquisition:</strong> {book.acquisition_mode}</p>}
                      {book.price && <p><strong>Prix:</strong> {book.price.toLocaleString('fr-FR')} FCFA</p>}
                      {book.physical_location && <p><strong>Localisation physique:</strong> {book.physical_location}</p>}
                    </div>
                  </div>

                  <div>
                    <h3 className="text-lg font-semibold mb-4 flex items-center">
                      <User className="h-5 w-5 mr-2 text-green-600" />
                      Classification générale
                    </h3>
                    <div className="space-y-2 text-sm">
                      {book.domain && <p><strong>Domaine:</strong> {book.domain}</p>}
                      {book.collection && <p><strong>Collection:</strong> {book.collection}</p>}
                      {book.keywords && book.keywords.length > 0 && (
                        <div>
                          <strong>Mots-clés français:</strong>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {book.keywords.map((keyword, index) => (
                              <Badge key={index} className="text-xs bg-green-600 dark:bg-green-500 text-white border-green-700 dark:border-green-400 shadow-sm">
                                {keyword}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                      {book.keywords_en && (
                        <div>
                          <strong>Mots-clés anglais:</strong>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {(() => {
                              // Utiliser la fonction utilitaire pour une gestion sécurisée
                              const keywords = safeKeywordsToArray(book.keywords_en);

                              return keywords.map((keyword, index) => (
                                <Badge key={index} className="text-xs bg-green-600 dark:bg-green-500 text-white border-green-700 dark:border-green-400 shadow-sm">
                                  {keyword}
                                </Badge>
                              ));
                            })()}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Classification documentaire */}
                  {(book.dewey_classification || book.cdu_classification || (book.subject_headings && book.subject_headings.length > 0)) && (
                    <div>
                      <h3 className="text-lg font-semibold mb-4 flex items-center">
                        <BookOpen className="h-5 w-5 mr-2 text-orange-600" />
                        Classification documentaire
                      </h3>
                      <div className="space-y-2 text-sm">
                        {book.dewey_classification && (
                          <p><strong>Classification Dewey:</strong> {book.dewey_classification}</p>
                        )}
                        {book.cdu_classification && (
                          <p><strong>Classification CDU:</strong> {book.cdu_classification}</p>
                        )}
                        {book.subject_headings && book.subject_headings.length > 0 && (
                          <div>
                            <p className="font-semibold mb-2">Vedettes-matières:</p>
                            <div className="flex flex-wrap gap-1">
                              {book.subject_headings.map((heading, index) => (
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

                {/* Statistiques d'utilisation et gestion */}
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-semibold mb-4 flex items-center">
                      <Package className="h-5 w-5 mr-2 text-orange-600" />
                      Exemplaires et Disponibilité
                    </h3>
                    <div className="space-y-2 text-sm">
                      <p><strong>Total d'exemplaires:</strong> {book.total_copies}</p>
                      <p><strong>Exemplaires disponibles:</strong> 
                        <span className={book.available_copies > 0 ? 'text-green-600 dark:text-green-400 font-bold' : 'text-red-600 dark:text-red-400 font-bold'}>
                          {' '}{book.available_copies}
                        </span>
                      </p>
                      <p><strong>Exemplaires empruntés:</strong> {book.total_copies - book.available_copies}</p>
                      {book.current_loans !== undefined && (
                        <div><strong>Emprunts actuels:</strong> 
                          <Badge variant="outline" className="ml-2">
                            {book.current_loans}
                          </Badge>
                        </div>
                      )}
                      {book.current_reservations !== undefined && book.current_reservations > 0 && (
                        <div><strong>Réservations en cours:</strong> 
                          <Badge variant="secondary" className="ml-2 bg-yellow-100 text-yellow-800">
                            {book.current_reservations}
                          </Badge>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Statistiques d'utilisation */}
                  {(book.total_loans || book.popularity_score || book.last_borrowed_date) && (
                    <div>
                      <h3 className="text-lg font-semibold mb-4 flex items-center text-purple-600 dark:text-purple-400">
                        <User className="h-5 w-5 mr-2" />
                        Statistiques d'utilisation
                      </h3>
                      <div className="space-y-2 text-sm">
                        {book.total_loans !== undefined && (
                          <div><strong>Total des emprunts:</strong> 
                            <Badge variant="outline" className="ml-2">
                              {book.total_loans}
                            </Badge>
                          </div>
                        )}
                        {book.total_reservations !== undefined && (
                          <div><strong>Total des réservations:</strong> 
                            <Badge variant="outline" className="ml-2">
                              {book.total_reservations}
                            </Badge>
                          </div>
                        )}
                        {book.popularity_score !== undefined && (
                          <div><strong>Score de popularité:</strong> 
                            <Badge 
                              variant={book.popularity_score >= 80 ? 'default' : 
                                      book.popularity_score >= 50 ? 'secondary' : 'outline'} 
                              className="ml-2"
                            >
                              {book.popularity_score}%
                            </Badge>
                          </div>
                        )}
                        {book.last_borrowed_date && (
                          <p><strong>Dernier emprunt:</strong> {new Date(book.last_borrowed_date).toLocaleDateString('fr-FR')}</p>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Informations d'acquisition */}
                  <div>
                    <h3 className="text-lg font-semibold mb-4 flex items-center">
                      <FcfaIcon className="h-5 w-5 mr-2 text-green-600" />
                      Acquisition et Gestion
                    </h3>
                    <div className="space-y-2 text-sm">
                      <p><strong>Ajouté le:</strong> {new Date(book.created_at).toLocaleDateString('fr-FR')}</p>
                      {book.updated_at && (
                        <p><strong>Modifié le:</strong> {new Date(book.updated_at).toLocaleDateString('fr-FR')}</p>
                      )}
                      {book.notes && (
                        <div>
                          <p><strong>Notes:</strong></p>
                          <div className="bg-yellow-50 dark:bg-yellow-900/20 p-2 rounded border border-yellow-200 dark:border-yellow-800 mt-1">
                            <p className="text-xs text-yellow-800 dark:text-yellow-200">{book.notes}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Section résumé et abstract */}
              {(book.summary || book.abstract) && (
                <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {book.summary && (
                      <div>
                        <h3 className="text-lg font-semibold mb-3 flex items-center">
                          <FileText className="h-5 w-5 mr-2 text-green-600" />
                          Résumé
                        </h3>
                        <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-600">
                          <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed break-words overflow-wrap-anywhere whitespace-pre-wrap">
                            {book.summary}
                          </p>
                        </div>
                      </div>
                    )}

                    {book.abstract && (
                      <div>
                        <h3 className="text-lg font-semibold mb-3 flex items-center">
                          <BookOpen className="h-5 w-5 mr-2 text-green-600" />
                          Abstract
                        </h3>
                        <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-600">
                          <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed break-words overflow-wrap-anywhere whitespace-pre-wrap">
                            {book.abstract}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Section du document numérique - Pleine largeur */}
              {(book.document_path && book.document_path !== 'NULL' && book.document_path.trim() !== '') && (
                <div className="mt-8 p-5 bg-transparent dark:bg-gray-800 rounded-lg border border-green-200 dark:border-gray-600">
                  <h3 className="text-lg font-semibold mb-4 flex items-center text-green-800 dark:text-white">
                    <FileText className="h-5 w-5 mr-2" />
                    Document numérique
                  </h3>
                  <div className="space-y-4">
                    {/* Nom du fichier avec troncature */}
                    <div className="bg-gray-100 dark:bg-gray-700 p-4 rounded-md border border-gray-200 dark:border-gray-600 shadow-sm">
                      <p className="font-medium text-gray-900 dark:text-white text-sm break-all flex items-center">
                        <span className="text-green-600 dark:text-green-400 mr-2 text-base">📄</span>
                        {book.document_path ? book.document_path.split('/').pop() : 'Fichier non spécifié'}
                      </p>
                    </div>

                    {/* Informations du fichier */}
                    <div className="space-y-3 text-sm">
                      <div className="bg-gray-100 dark:bg-gray-700 p-3 rounded-md border border-gray-200 dark:border-gray-600">
                        <div className="flex items-center justify-between">
                          <span className="text-gray-600 dark:text-gray-300 font-medium">Type:</span>
                          <span className="font-semibold text-white bg-green-600 dark:bg-green-500 px-2 py-1 rounded text-xs shadow-sm">
                            {book.file_type || 'Non spécifié'}
                          </span>
                        </div>
                      </div>

                      {book.document_size && (
                        <div className="bg-gray-100 dark:bg-gray-700 p-3 rounded-md border border-gray-200 dark:border-gray-600">
                          <div className="flex items-center justify-between">
                            <span className="text-gray-600 dark:text-gray-300 font-medium">Taille:</span>
                            <span className="font-semibold text-white bg-gray-600 dark:bg-gray-500 px-2 py-1 rounded text-xs shadow-sm">
                              {(book.document_size / 1024 / 1024).toFixed(2)} MB
                            </span>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Bouton de téléchargement */}
                    {book.document_path && (
                      <div className="flex justify-center pt-3">
                        <Button
                          asChild
                          className="bg-green-600 hover:bg-green-700 dark:bg-green-700 dark:hover:bg-green-600 text-white border-0 shadow-md hover:shadow-lg transition-all duration-200 w-full sm:w-auto"
                        >
                          <a href={`/api/books/${book.id}/download`} target="_blank" rel="noopener noreferrer">
                            <Download className="h-4 w-4 mr-2" />
                            Télécharger le livre
                          </a>
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Section Livres Connexes */}
              {((book.related_books?.length ?? 0) > 0 || (book.same_author_books?.length ?? 0) > 0 || (book.same_domain_books?.length ?? 0) > 0) && (
                <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
                  <h3 className="text-lg font-semibold mb-4 flex items-center text-indigo-600 dark:text-indigo-400">
                    <BookOpen className="h-5 w-5 mr-2" />
                    Livres Connexes
                  </h3>
                  
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Livres du même auteur */}
                    {(book.same_author_books?.length ?? 0) > 0 && (
                      <div>
                        <h4 className="font-semibold text-gray-800 dark:text-gray-200 mb-3">
                          Du même auteur ({book.same_author_books?.length ?? 0})
                        </h4>
                        <div className="space-y-2">
                          {book.same_author_books?.slice(0, 3).map((relatedBook: any, index: number) => (
                            <div key={index} className="p-2 bg-gray-50 dark:bg-gray-800 rounded border">
                              <Link 
                                href={`/books/${relatedBook.id}`}
                                className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline"
                              >
                                {relatedBook.title}
                              </Link>
                              <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                                {relatedBook.publication_year}
                              </p>
                            </div>
                          ))}
                          {(book.same_author_books?.length ?? 0) > 3 && (
                            <p className="text-xs text-gray-500">
                              +{(book.same_author_books?.length ?? 0) - 3} autres livres
                            </p>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Livres du même domaine */}
                    {(book.same_domain_books?.length ?? 0) > 0 && (
                      <div>
                        <h4 className="font-semibold text-gray-800 dark:text-gray-200 mb-3">
                          Même domaine ({book.same_domain_books?.length ?? 0})
                        </h4>
                        <div className="space-y-2">
                          {book.same_domain_books?.slice(0, 3).map((relatedBook: any, index: number) => (
                            <div key={index} className="p-2 bg-gray-50 dark:bg-gray-800 rounded border">
                              <Link 
                                href={`/books/${relatedBook.id}`}
                                className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline"
                              >
                                {relatedBook.title}
                              </Link>
                              <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                                par {relatedBook.main_author}
                              </p>
                            </div>
                          ))}
                          {(book.same_domain_books?.length ?? 0) > 3 && (
                            <p className="text-xs text-gray-500">
                              +{(book.same_domain_books?.length ?? 0) - 3} autres livres
                            </p>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Livres connexes/recommandés */}
                    {(book.related_books?.length ?? 0) > 0 && (
                      <div>
                        <h4 className="font-semibold text-gray-800 dark:text-gray-200 mb-3">
                          Recommandés ({book.related_books?.length ?? 0})
                        </h4>
                        <div className="space-y-2">
                          {book.related_books?.slice(0, 3).map((relatedBook: any, index: number) => (
                            <div key={index} className="p-2 bg-gray-50 dark:bg-gray-800 rounded border">
                              <Link 
                                href={`/books/${relatedBook.id}`}
                                className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline"
                              >
                                {relatedBook.title}
                              </Link>
                              <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                                par {relatedBook.main_author}
                              </p>
                            </div>
                          ))}
                          {(book.related_books?.length ?? 0) > 3 && (
                            <p className="text-xs text-gray-500">
                              +{(book.related_books?.length ?? 0) - 3} autres livres
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
        title="Supprimer le livre"
        itemName={book?.title}
        itemType="livre"
        isLoading={deleting}
      />
    </ProtectedLayout>
  );
}
