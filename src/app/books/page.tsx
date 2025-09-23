"use client";

import React, { useState, useEffect, useMemo, useCallback, memo } from "react";
import { useRefresh } from "@/contexts/refresh-context";
import { useReliableRefresh } from "@/hooks";
import { useAutoRefreshOnReturn } from "@/hooks/useAutoRefreshOnReturn";
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
  Database,
  FileText,
  Globe,
  Link2
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import ProtectedLayout from "@/components/layout/protected-layout";
import { useToast } from "@/hooks/use-toast";

import { motion } from 'framer-motion';
import { Z3950ImportDialog } from "@/components/z3950/z3950-import-dialog";
import { UnifiedStatCard } from "@/components/ui/instant-components";
import { DeleteConfirmationDialog } from "@/components/ui/delete-confirmation-dialog";

interface Book {
  id: string;
  mfn: string;
  title: string;
  main_author: string;
  publisher?: string;
  publication_year?: number;
  domain?: string;
  available_copies: number;
  total_copies: number;
  // Nouveaux champs SIGB
  status?: 'available' | 'borrowed' | 'reserved' | 'lost' | 'damaged' | 'withdrawn' | 'not_for_loan' | 'in_transit' | 'in_processing' | 'missing';
  target_audience?: 'general' | 'beginner' | 'intermediate' | 'advanced' | 'children' | 'young_adult' | 'adult' | 'professional' | 'academic' | 'researcher';
  format?: 'print' | 'digital' | 'ebook' | 'audiobook' | 'hardcover' | 'paperback' | 'pocket' | 'large_print' | 'braille' | 'multimedia';
  language?: string;
  physical_location?: string;
  view_count?: number;
}

// Composant ultra-léger pour les cartes de livres RESPONSIVE avec boutons à droite
const BookCard = memo(({ book, onDelete }: { book: Book; onDelete: (id: string, title: string) => void }) => (
  <motion.div
    initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
    transition={{ duration: 0.3 }}
    className="border border-gray-200 dark:border-gray-700 rounded-lg p-3 sm:p-4 hover:shadow-md transition-all duration-200 bg-white dark:bg-gray-800"
  >
    {/* Layout responsive : stack sur mobile, flex sur desktop */}
    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 sm:gap-4">
      {/* Contenu principal */}
      <div className="flex-1 min-w-0 space-y-3">
        {/* Header avec icône, titre et auteur */}
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 p-2 bg-blue-100 dark:bg-blue-800/90 rounded-lg">
            <BookOpen className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-sm sm:text-base text-gray-900 dark:text-white line-clamp-2 leading-tight">
              {book.title}
            </h3>
            <p className="text-xs sm:text-sm text-gray-700 dark:text-gray-200 mt-1">
              par <span className="font-medium">{book.main_author}</span>
            </p>
          </div>
        </div>

        {/* Informations principales - layout responsive */}
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4 text-xs sm:text-sm">
          <div>
            <p className="text-gray-700 dark:text-gray-200 text-xs uppercase tracking-wide">MFN</p>
            <p className="font-medium text-gray-900 dark:text-white truncate">{book.mfn}</p>
          </div>
          <div>
            <p className="text-gray-700 dark:text-gray-200 text-xs uppercase tracking-wide">Année</p>
            <p className="font-medium text-gray-900 dark:text-white">{book.publication_year || 'N/A'}</p>
          </div>
          <div className="sm:col-span-1 lg:col-span-1">
            <p className="text-gray-700 dark:text-gray-200 text-xs uppercase tracking-wide">Domaine</p>
            <p className="font-medium text-gray-900 dark:text-white truncate">{book.domain || 'Non renseigné'}</p>
          </div>
                    <div>
            <p className="text-gray-700 dark:text-gray-200 text-xs uppercase tracking-wide">Éditeur</p>
            <p className="font-medium text-gray-900 dark:text-white text-xs truncate">
              {book.publisher || 'Non renseigné'}
            </p>
          </div>
          <div className="sm:col-span-1 lg:col-span-1">
            <p className="text-gray-700 dark:text-gray-200 text-xs uppercase tracking-wide">Disponibilité</p>
            <div className="flex items-center gap-1 sm:gap-2">
              <div className={`w-2 h-2 rounded-full ${
                book.available_copies > 0 ? 'bg-green-500' : 'bg-red-500'
              }`} />
              <span className={`text-xs sm:text-sm font-bold ${
                book.available_copies > 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
              }`}>
                {book.available_copies}/{book.total_copies}
              </span>
            </div>
          </div>
        </div>

        {/* Éditeur - masqué sur très petit écran */}
        {book.publisher && (
          <p className="hidden sm:block text-sm text-gray-700 dark:text-gray-200">
            <span className="font-medium">Éditeur:</span> {book.publisher}
          </p>
        )}
      </div>

      {/* Boutons d'action - responsive */}
      <div className="flex sm:flex-col gap-2 sm:gap-2 flex-shrink-0 w-full sm:w-auto">
        {/* Sur mobile : boutons horizontaux, sur desktop : verticaux */}
        <Button asChild variant="ghost" size="sm" className="flex-1 sm:flex-none h-8 px-2 sm:px-3 text-xs sm:text-sm text-green-600 hover:text-green-700 hover:bg-green-50 dark:hover:bg-green-900/20">
          <Link href={`/books/${book.id}`}>
            <Eye className="h-3 w-3 sm:h-4 sm:w-4 sm:mr-2" />
            <span className="hidden sm:inline">Voir</span>
          </Link>
        </Button>
        <Button asChild variant="ghost" size="sm" className="flex-1 sm:flex-none h-8 px-2 sm:px-3 text-xs sm:text-sm text-gray-600 hover:text-gray-700 hover:bg-gray-50 dark:hover:bg-gray-900/20">
          <Link href={`/books/${book.id}/edit`}>
            <Edit className="h-3 w-3 sm:h-4 sm:w-4 sm:mr-2" />
            <span className="hidden sm:inline">Modifier</span>
          </Link>
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="flex-1 sm:flex-none h-8 px-2 sm:px-3 text-xs sm:text-sm text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
          onClick={() => onDelete(book.id, book.title)}
        >
          <Trash2 className="h-3 w-3 sm:h-4 sm:w-4 sm:mr-2" />
          <span className="hidden sm:inline">Supprimer</span>
        </Button>
      </div>
    </div>
  </motion.div>
));

BookCard.displayName = "BookCard";

export default function BooksPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedDomain, setSelectedDomain] = useState("");
  const [selectedAuthor, setSelectedAuthor] = useState("");
  const [selectedPublisher, setSelectedPublisher] = useState("");
  const [selectedYear, setSelectedYear] = useState("");
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showStandardsExport, setShowStandardsExport] = useState(false);
  const { toast } = useToast();
  const { subscribe } = useRefresh();

  // États pour le dialogue de suppression
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [bookToDelete, setBookToDelete] = useState<{ id: string; title: string } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Fonction pour charger les livres depuis l'API
  const fetchBooks = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/books');

      if (!response.ok) {
        throw new Error('Erreur lors du chargement des livres');
      }

      const data = await response.json();
      setBooks(data.data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue');
      toast({
        title: "Erreur",
        description: "Impossible de charger les livres",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  // 🎯 NOUVEAU : Hook pour rafraîchissement automatique après retour
  useAutoRefreshOnReturn();

  // Système de rafraîchissement avec debouncing pour éviter trop de requêtes
  const { debouncedRefresh } = useReliableRefresh({
    onRefresh: fetchBooks,
    fallbackDelay: 2000
  });

  // Charger les livres au montage et s'abonner aux changements
  useEffect(() => {
    fetchBooks();

    // S'abonner aux changements d'emprunts et de réservations avec debouncing
    const unsubscribeLoan = subscribe('loans', debouncedRefresh);
    const unsubscribeReservation = subscribe('reservations', debouncedRefresh);

    return () => {
      unsubscribeLoan();
      unsubscribeReservation();
    };
  }, [fetchBooks, subscribe, debouncedRefresh]);

  // Mémoisation des domaines pour éviter les recalculs
  const domains = useMemo(() =>
    [...new Set(books.map(book => book.domain).filter(Boolean))],
    [books]
  );

  // Mémoisation des autres filtres
  const authors = useMemo(() =>
    [...new Set(books.map(book => book.main_author).filter(Boolean))].sort(),
    [books]
  );

  const publishers = useMemo(() =>
    [...new Set(books.map(book => book.publisher).filter(Boolean))].sort(),
    [books]
  );

  const years = useMemo(() =>
    [...new Set(books.map(book => book.publication_year).filter(Boolean))].sort((a, b) => (b as number) - (a as number)),
    [books]
  );

  // Mémoisation du filtrage des livres
  const filteredBooks = useMemo(() => {
    return books.filter(book => {
      const matchesSearch = book.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           book.main_author.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           book.mfn.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesDomain = !selectedDomain || book.domain === selectedDomain;
      const matchesAuthor = !selectedAuthor || book.main_author === selectedAuthor;
      const matchesPublisher = !selectedPublisher || book.publisher === selectedPublisher;
      const matchesYear = !selectedYear || book.publication_year?.toString() === selectedYear;

      return matchesSearch && matchesDomain && matchesAuthor && matchesPublisher && matchesYear;
    });
  }, [books, searchTerm, selectedDomain, selectedAuthor, selectedPublisher, selectedYear]);

  // Fonction pour ouvrir le dialogue de suppression
  const handleDelete = (bookId: string, bookTitle: string) => {
    setBookToDelete({ id: bookId, title: bookTitle });
    setDeleteDialogOpen(true);
  };

  // Fonction pour confirmer la suppression
  const confirmDelete = async () => {
    if (!bookToDelete) return;

    try {
      setIsDeleting(true);
      const response = await fetch(`/api/books/${bookToDelete.id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        toast({
          title: "Succès",
          description: "Livre supprimé avec succès",
        });

        // 🚀 RAFRAÎCHISSEMENT FIABLE - Mise à jour immédiate + notifications
        debouncedRefresh();

        // Fermer le dialogue
        setDeleteDialogOpen(false);
        setBookToDelete(null);
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
      setIsDeleting(false);
    }
  };

  // Fonction pour exporter les livres en PDF
  const handleExport = async () => {
    try {
      const params = new URLSearchParams();
      params.append('format', 'pdf');

      if (searchTerm) params.append('search', searchTerm);
      if (selectedDomain) params.append('domain', selectedDomain);

      const response = await fetch(`/api/books/export?${params.toString()}`);

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
          description: `${filteredBooks.length} livres préparés pour impression/sauvegarde PDF`,
        });
      } else {
        throw new Error('Erreur lors de l\'export');
      }
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible d'exporter les livres en PDF",
        variant: "destructive",
      });
    }
  };

  // Mémoisation des statistiques
  const stats = useMemo(() => [
    {
      value: books.length,
      label: "Total livres",
      color: "green",
      icon: BookOpen,
      gradient: "from-green-500 to-green-600"
    },
    {
      value: books.filter(b => b.available_copies > 0).length,
      label: "Disponibles",
      color: "green",
      icon: Award,
      gradient: "from-green-500 to-green-600"
    },
    {
      value: books.filter(b => b.available_copies === 0).length,
      label: "Indisponibles",
      color: "yellow",
      icon: TrendingUp,
      gradient: "from-yellow-500 to-yellow-600"
    },
    {
      value: books.reduce((sum, book) => sum + book.total_copies, 0),
      label: "Total exemplaires",
      color: "red",
      icon: Star,
      gradient: "from-red-500 to-red-600"
    }
  ], [books]);

  // Callbacks optimisés
  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  }, []);

  const handleDomainChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedDomain(e.target.value);
  }, []);

  // Fermer le menu d'export standards quand on clique ailleurs
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (showStandardsExport) {
        const target = event.target as Element;
        if (!target.closest('[data-standards-export]')) {
          setShowStandardsExport(false);
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showStandardsExport]);

  return (
    <ProtectedLayout>
      <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-gray-50 dark:from-gray-900 dark:via-gray-800 dark:to-green-900 relative">
        {/* Header professionnel avec glassmorphism - Style identique à la page des thèses */}
        <motion.div
          className="glass-nav shadow-lg border-b border-white/20 dark:border-gray-700/20 relative bg-white/95 dark:bg-gray-900/95 backdrop-blur-md"
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
                  <BookOpen className="h-12 w-12 text-blue-600 drop-shadow-lg" />
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
                    className="absolute -inset-2"
                  >
                    <Star className="h-4 w-4 text-green-500 absolute top-0 right-0" />
                    <Award className="h-3 w-3 text-gray-500 absolute bottom-0 left-0" />
                  </motion.div>
                </motion.div>

                <div>
                  <motion.h1
                    className="text-xl sm:text-2xl md:text-3xl lg:text-4xl xl:text-5xl font-bold bg-gradient-to-r from-slate-800 via-green-600 to-slate-800 dark:from-slate-200 dark:via-green-400 dark:to-slate-200 bg-clip-text text-transparent"
                    initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
                    transition={{ duration: 0.8, delay: 0.4 }}
                  >
                    Gestion des Livres
                  </motion.h1>
                  <motion.div
                    className="text-lg text-gray-600 dark:text-gray-500 dark:text-gray-300mt-2 font-medium"
                    initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
                    transition={{ duration: 0.8, delay: 0.6 }}
                  >
                    Cataloguez et gérez votre collection avec efficacité
                    <motion.span
                      animate={{ scale: [1, 1.1, 1] }}
                      transition={{ duration: 3, repeat: Infinity }}
                      className="inline-block ml-3"
                    >
                      <BookOpen className="h-5 w-5 text-amber-500 inline" />
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
                    <span className="ml-1">({filteredBooks.length})</span>
                  </Button>
                </motion.div>

                <div className="relative z-[200]" data-standards-export>
                  <motion.div
                    whileHover={{
                      scale: 1.02,
                      boxShadow: "0 10px 30px rgba(100, 116, 139, 0.3)"
                    }}
                    whileTap={{ scale: 0.98 }}
                    className="w-full sm:w-auto"
                  >
                    <Button
                      size="sm"
                      variant="outline"
                      className="w-full sm:w-auto text-xs sm:text-sm bg-gray-50 dark:bg-gray-800/90 border-gray-300 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-900/40 font-semibold"
                      onClick={() => setShowStandardsExport(!showStandardsExport)}
                    >
                      <Database className="h-4 w-4 sm:h-5 sm:w-5 mr-1 sm:mr-2" />
                      <span className="hidden sm:inline">Export Standards</span>
                      <span className="sm:hidden">Std</span>
                    </Button>
                  </motion.div>

                  {showStandardsExport && (
                    <div className="fixed top-auto right-auto mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl z-[300] min-w-[220px] max-h-[300px] overflow-y-auto"
                         style={{
                           position: 'absolute',
                           top: '100%',
                           right: '0',
                           transform: 'translateY(4px)'
                         }}>
                      <div className="p-2 space-y-1">
                        <div className="px-3 py-2 text-xs font-semibold text-gray-700 dark:text-gray-200 uppercase tracking-wide border-b border-gray-200 dark:border-gray-700">
                          Formats Standards
                        </div>
                        <Link
                          href={`/api/export/standards?format=marc21-xml&documentType=book&limit=1000`}
                          target="_blank"
                          className="block px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 rounded flex items-center gap-2"
                          onClick={() => setShowStandardsExport(false)}
                        >
                          <FileText className="h-4 w-4 text-blue-600" /> <span>MARC21 XML</span>
                        </Link>
                        <Link
                          href={`/api/export/standards?format=dublin-core-xml&documentType=book&limit=1000`}
                          target="_blank"
                          className="block px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 rounded flex items-center gap-2"
                          onClick={() => setShowStandardsExport(false)}
                        >
                          <Globe className="h-4 w-4 text-green-600" /> <span>Dublin Core XML</span>
                        </Link>

                        <Link
                          href={`/api/export/standards?format=marc21-json&documentType=book&limit=1000`}
                          target="_blank"
                          className="block px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 rounded flex items-center gap-2"
                          onClick={() => setShowStandardsExport(false)}
                        >
                          <Link2 className="h-4 w-4 text-purple-600" /> <span>MARC21 JSON</span>
                        </Link>
                        <Link
                          href={`/api/export/standards?format=dublin-core-json&documentType=book&limit=1000`}
                          target="_blank"
                          className="block px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 rounded flex items-center gap-2"
                          onClick={() => setShowStandardsExport(false)}
                        >
                          <FileText className="h-4 w-4 text-orange-600" /> <span>Dublin Core JSON</span>
                        </Link>
                      </div>
                    </div>
                  )}
                </div>

                <motion.div
                  whileHover={{
                    scale: 1.02,
                    boxShadow: "0 10px 30px rgba(34, 197, 94, 0.3)"
                  }}
                  whileTap={{ scale: 0.98 }}
                  className="w-full sm:w-auto"
                >
                  <Button asChild size="sm" className="w-full sm:w-auto bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white font-semibold shadow-lg text-xs sm:text-sm">
                    <Link href="/admin/import?type=books" className="flex items-center justify-center">
                      <motion.span
                        animate={{ y: [0, -2, 0] }}
                        transition={{ duration: 2, repeat: Infinity }}
                        className="flex items-center"
                      >
                        <FileUp className="h-4 w-4 sm:h-5 sm:w-5 mr-1 sm:mr-2" />
                        <span className="hidden sm:inline">Importer CSV</span>
                        <span className="sm:hidden">CSV</span>
                      </motion.span>
                    </Link>
                  </Button>
                </motion.div>

                <Z3950ImportDialog
                  onImportSuccess={(book) => {
                    // Rafraîchir la liste des livres
                    fetchBooks();
                    toast({
                      title: "Import automatique réussi",
                      description: `Le livre "${book.title}" a été ajouté`,
                    });
                  }}
                  trigger={
                    <motion.div
                      whileHover={{
                        scale: 1.02,
                        boxShadow: "0 10px 30px rgba(100, 116, 139, 0.3)"
                      }}
                      whileTap={{ scale: 0.98 }}
                      className="w-full sm:w-auto"
                    >
                      <Button size="sm" variant="outline" className="w-full sm:w-auto bg-gray-50 dark:bg-gray-800/90 border-gray-300 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-900/40 text-xs sm:text-sm font-semibold">
                        <Database className="h-4 w-4 sm:h-5 sm:w-5 mr-1 sm:mr-2" />
                        <span className="hidden sm:inline">Import Auto Z39.50</span>
                        <span className="sm:hidden">Auto</span>
                      </Button>
                    </motion.div>
                  }
                />

                <motion.div
                  whileHover={{
                    scale: 1.02,
                    boxShadow: "0 10px 30px rgba(34, 197, 94, 0.3)"
                  }}
                  whileTap={{ scale: 0.98 }}
                  className="w-full sm:w-auto"
                >
                  <Button asChild size="sm" className="w-full sm:w-auto bg-gradient-to-r from-slate-800 to-green-600 hover:from-slate-900 hover:to-green-700 text-white font-semibold shadow-lg text-xs sm:text-sm">
                    <Link href="/books/new" className="flex items-center justify-center">
                      <motion.span
                        animate={{ x: [0, 2, 0] }}
                        transition={{ duration: 3, repeat: Infinity }}
                        className="flex items-center"
                      >
                        <Plus className="h-4 w-4 sm:h-5 sm:w-5 mr-1 sm:mr-2" />
                        <span className="hidden sm:inline">Ajouter un livre</span>
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
                    onClick={fetchBooks}
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
                    placeholder="Titre, auteur, MFN..."
                    value={searchTerm}
                    onChange={handleSearchChange}
                    className="pl-10 text-sm"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="domain" className="text-sm">Domaine</Label>
                <select
                  id="domain"
                  value={selectedDomain}
                  onChange={handleDomainChange}
                  className="w-full h-9 sm:h-10 px-3 mt-1 rounded-md border border-gray-300 bg-white text-sm ring-offset-white focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 dark:ring-offset-gray-900 dark:focus:ring-green-400"
                >
                  <option value="" className="bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100">Tous les domaines</option>
                  {domains.map(domain => (
                    <option key={domain} value={domain} className="bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100">{domain}</option>
                  ))}
                </select>
              </div>
              <div>
                <Label htmlFor="author" className="text-sm">Auteur</Label>
                <select
                  id="author"
                  value={selectedAuthor}
                  onChange={(e) => setSelectedAuthor(e.target.value)}
                  className="w-full h-9 sm:h-10 px-3 mt-1 rounded-md border border-gray-300 bg-white text-sm ring-offset-white focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 dark:ring-offset-gray-900 dark:focus:ring-green-400"
                >
                  <option value="" className="bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100">Tous les auteurs</option>
                  {authors.map(author => (
                    <option key={author} value={author} className="bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100">{author}</option>
                  ))}
                </select>
              </div>
              <div>
                <Label htmlFor="publisher" className="text-sm">Éditeur</Label>
                <select
                  id="publisher"
                  value={selectedPublisher}
                  onChange={(e) => setSelectedPublisher(e.target.value)}
                  className="w-full h-9 sm:h-10 px-3 mt-1 rounded-md border border-gray-300 bg-white text-sm ring-offset-white focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 dark:ring-offset-gray-900 dark:focus:ring-green-400"
                >
                  <option value="" className="bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100">Tous les éditeurs</option>
                  {publishers.map(publisher => (
                    <option key={publisher} value={publisher} className="bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100">{publisher}</option>
                  ))}
                </select>
              </div>
              <div>
                <Label htmlFor="year" className="text-sm">Année de publication</Label>
                <select
                  id="year"
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(e.target.value)}
                  className="w-full h-9 sm:h-10 px-3 mt-1 rounded-md border border-gray-300 bg-white text-sm ring-offset-white focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 dark:ring-offset-gray-900 dark:focus:ring-green-400"
                >
                  <option value="" className="bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100">Toutes les années</option>
                  {years.map(year => (
                    <option key={year} value={year} className="bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100">{year}</option>
                  ))}
                </select>
              </div>

            </div>
          </CardContent>
        </Card>

        {/* Stats avec composant unifié RESPONSIVE */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6 mb-4 sm:mb-6 lg:mb-8">
          {stats.map((stat, index) => (
            <motion.div
              key={stat.label}
              initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.1 * (index + 1) }}
              whileHover={{ y: -2, transition: { duration: 0.2 } }}
            >
              <UnifiedStatCard stat={stat} />
            </motion.div>
          ))}
        </div>

        {/* Books List RESPONSIVE */}
        <Card>
          <CardHeader className="pb-3 sm:pb-6">
            <CardTitle className="text-base sm:text-lg lg:text-xl">
              Liste des Livres ({filteredBooks.length})
            </CardTitle>
            <CardDescription className="text-sm">
              Gérez votre collection de livres
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-6 sm:py-8">
                <Loader2 className="h-6 w-6 sm:h-8 sm:w-8 animate-spin text-green-600" />
                <span className="ml-2 text-sm sm:text-base text-gray-600 dark:text-gray-300">
                  Chargement des livres...
                </span>
              </div>
            ) : error ? (
              <div className="text-center py-6 sm:py-8">
                <p className="text-red-600 dark:text-red-400 text-sm sm:text-base mb-4">{error}</p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.location.reload()}
                >
                  Réessayer
                </Button>
              </div>
            ) : filteredBooks.length === 0 ? (
              <div className="text-center py-6 sm:py-8">
                <p className="text-gray-600 dark:text-gray-500 dark:text-gray-300text-sm sm:text-base">
                  Aucun livre trouvé
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3 sm:gap-4">
                {filteredBooks.map((book) => (
                  <BookCard
                    key={book.id}
                    book={book}
                    onDelete={handleDelete}
                  />
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
        setBookToDelete(null);
      }}
      onConfirm={confirmDelete}
      title="Supprimer le livre"
      itemName={bookToDelete?.title}
      itemType="livre"
      isLoading={isDeleting}
    />
    </ProtectedLayout>
  );
}
