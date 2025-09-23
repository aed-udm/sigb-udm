"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useRefresh } from "@/contexts/refresh-context";
import { useSettings } from "@/hooks/use-settings";
import { motion } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Combobox } from "@/components/ui/combobox";
import ProtectedLayout from "@/components/layout/protected-layout";
import { PageHeader } from "@/components/ui/page-header";
import { useToast } from "@/hooks/use-toast";
import { reservationSchema, type ReservationFormData } from "@/lib/validations";
import { BookOpen, GraduationCap, FileText, Clipboard, Search, Scan, Clock, Save, User as UserIcon, X, ArrowLeft, Calendar, RefreshCw } from "lucide-react";
import Link from "next/link";
import { UserDetailsCard } from "@/components/ui/user-details-card";
import ReservationInfo from "@/components/reservations/reservation-info";

interface User {
  id: string;
  full_name: string;
  email: string;
  barcode: string;
  matricule?: string;
  phone?: string;
  address?: string;
  is_active: boolean;
  max_loans: number;
  max_reservations: number;
  created_at: string;
  updated_at: string;
}

interface Document {
  id: string;
  title: string;
  author: string;
  type: 'book' | 'these' | 'memoire' | 'rapport_stage';
  available_copies?: number;
  total_copies?: number;
  // Propriétés pour les livres
  mfn?: string;
  main_author?: string;
  publisher?: string;
  publication_year?: number;
  // Propriétés pour les documents académiques
  supervisor?: string;
  director?: string;
  degree?: string;
  target_degree?: string;
  specialty?: string;
  university?: string;
  faculty?: string;
  defense_year?: number;
  year?: number;
  document_type?: 'these' | 'memoire' | 'rapport_stage';
  created_at?: string;
}

export default function NewReservationPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { notifyReservationChange, notifyBookChange } = useRefresh();
  const { settings, isLoading: settingsLoading } = useSettings();
  const [isLoading, setIsLoading] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [userSearch, setUserSearch] = useState("");
  const [documentSearch, setDocumentSearch] = useState("");
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [showDocumentDropdown, setShowDocumentDropdown] = useState(false);
  const [documentType, setDocumentType] = useState<'book' | 'these' | 'memoire' | 'rapport_stage'>('book');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [selectedDocuments, setSelectedDocuments] = useState<Document[]>([]);
  const [userBarcode, setUserBarcode] = useState("");
  const [bookBarcode, setBookBarcode] = useState("");
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [loadingDocuments, setLoadingDocuments] = useState(false);
  const [expiryDate, setExpiryDate] = useState('');
  const [notes, setNotes] = useState("");

  // Charger les utilisateurs - CORRIGÉ pour correspondre aux emprunts
  const fetchUsers = async (search: string = "") => {
    try {
      setLoadingUsers(true);
      const response = await fetch(`/api/users?search=${encodeURIComponent(search)}&active=true&limit=10`);
      if (response.ok) {
        const data = await response.json();
        setUsers(data.data || []);
      }
    } catch (error) {
      console.error('Erreur lors du chargement des utilisateurs:', error);
    } finally {
      setLoadingUsers(false);
    }
  };

  // Recherche utilisateur par code-barres ou matricule
  const handleUserBarcodeSearch = async () => {
    if (!userBarcode.trim()) return;

    try {
      setLoadingUsers(true);
      
      // Essayer d'abord par code-barres
      let response = await fetch(`/api/users/barcode/${encodeURIComponent(userBarcode)}`);
      
      // Si pas trouvé par code-barres, essayer par matricule
      if (!response.ok) {
        response = await fetch(`/api/users?search=${encodeURIComponent(userBarcode)}&matricule=true`);
      }
      
      if (response.ok) {
        const data = await response.json();
        let user = data.data;
        
        // Si c'est un tableau (recherche par matricule), prendre le premier
        if (Array.isArray(user)) {
          user = user.find(u => u.matricule === userBarcode) || user[0];
        }
        
        if (user) {
          setSelectedUser(user);
          setUserSearch(user.full_name);
          setUserBarcode("");
          toast({
            title: "Utilisateur trouvé",
            description: `${user.full_name} sélectionné`,
          });
        } else {
          toast({
            title: "Utilisateur non trouvé",
            description: "Aucun utilisateur avec ce code-barres ou matricule",
            variant: "destructive",
          });
        }
      } else {
        toast({
          title: "Utilisateur non trouvé",
          description: "Aucun utilisateur avec ce code-barres ou matricule",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Erreur lors de la recherche",
        variant: "destructive",
      });
    } finally {
      setLoadingUsers(false);
    }
  };

  // Recherche livre par code-barres
  const handleBookBarcodeSearch = async () => {
    if (!bookBarcode.trim()) return;

    try {
      setLoadingDocuments(true);
      const response = await fetch(`/api/books?search=${encodeURIComponent(bookBarcode)}`);

      if (response.ok) {
        const data = await response.json();
        const book = data.data.find((b: any) => b.mfn === bookBarcode);

        if (book) {
          const document = {
            id: book.id,
            title: book.title,
            author: book.main_author,
            type: 'book' as const,
            available_copies: book.available_copies,
            mfn: book.mfn
          };
          setSelectedDocuments([document]);
          setBookBarcode("");
          toast({
            title: "Livre trouvé",
            description: `${book.title} par ${book.main_author}`,
          });
        } else {
          toast({
            title: "Livre non trouvé",
            description: "Aucun livre trouvé avec ce code-barres",
            variant: "destructive",
          });
        }
      }
    } catch (error) {
      console.error('Erreur lors de la recherche:', error);
      toast({
        title: "Erreur",
        description: "Erreur lors de la recherche",
        variant: "destructive",
      });
    } finally {
      setLoadingDocuments(false);
    }
  };

  // Charger les documents selon le type sélectionné
  const fetchDocuments = async (search: string = "") => {
    try {
      setLoadingDocuments(true);
      let response;
      let url = '';

      if (documentType === 'book') {
        url = `/api/books?search=${encodeURIComponent(search)}&limit=10`;
        response = await fetch(url);
      } else if (documentType === 'these') {
        url = `/api/academic/theses?search=${encodeURIComponent(search)}&limit=10`;
        response = await fetch(url);
      } else if (documentType === 'memoire') {
        url = `/api/academic/memoires?search=${encodeURIComponent(search)}&limit=10`;
        response = await fetch(url);
      } else {
        url = `/api/academic/stage-reports?search=${encodeURIComponent(search)}&limit=10`;
        response = await fetch(url);
      }

      console.log('🔍 Recherche documents:', url);
      console.log('📡 Réponse API:', response.status, response.statusText);

      if (response.ok) {
        const data = await response.json();
        console.log('📚 Données reçues:', data);
        
        const documents = (data.data || []).map((item: any) => ({
          id: item.id,
          title: item.title,
          author: documentType === 'book' ? item.main_author :
                  documentType === 'rapport_stage' ? item.student_name : item.main_author,
          type: documentType,
          available_copies: item.available_copies,
          mfn: item.mfn,
          degree: item.target_degree || item.degree_type,
          supervisor: item.director || item.supervisor,
          university: item.university
        }));
        
        console.log('📋 Documents traités:', documents);
        setDocuments(documents);
      } else {
        console.error('❌ Erreur API:', response.status, await response.text());
      }
    } catch (error) {
      console.error('❌ Erreur lors du chargement des documents:', error);
    } finally {
      setLoadingDocuments(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  // Initialiser la date d'expiration avec les paramètres système
  useEffect(() => {
    if (!settingsLoading && settings) {
      const defaultDays = settings.general.default_reservation_duration_days;
      const defaultDate = new Date(Date.now() + defaultDays * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      setExpiryDate(defaultDate);
    }
  }, [settings, settingsLoading]);

  useEffect(() => {
    if (userSearch.length >= 2) {
      fetchUsers(userSearch);
    } else {
      setUsers([]);
    }
  }, [userSearch]);

  useEffect(() => {
    if (documentSearch.length >= 2) {
      fetchDocuments(documentSearch);
    }
  }, [documentSearch, documentType]);

  // Recharger les documents quand le type change
  useEffect(() => {
    setSelectedDocuments([]);
    setDocumentSearch("");
    setDocuments([]);
  }, [documentType]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    // Debug: Afficher l'état actuel
    console.log('🔍 DEBUG - État de la réservation:');
    console.log('selectedUser:', selectedUser);
    console.log('selectedDocuments:', selectedDocuments);
    console.log('documentType:', documentType);
    console.log('documents disponibles:', documents);

    try {
      if (!selectedUser) {
        console.log('❌ Utilisateur manquant');
        toast({
          title: "Utilisateur manquant",
          description: "Veuillez sélectionner un utilisateur",
          variant: "destructive",
        });
        setIsLoading(false);
        return;
      }

      if (selectedDocuments.length === 0) {
        console.log('❌ Documents manquants - aucun document sélectionné');
        console.log('Documents disponibles dans la liste:', documents.length);
        toast({
          title: "Documents manquants",
          description: `Veuillez sélectionner au moins un ${documentType === 'book' ? 'livre' : documentType === 'these' ? 'thèse' : documentType === 'memoire' ? 'mémoire' : 'rapport de stage'}. Cliquez sur un ou plusieurs documents dans la liste de recherche.`,
          variant: "destructive",
        });
        setIsLoading(false);
        return;
      }

      // Créer une réservation pour chaque document sélectionné
      const reservationPromises = selectedDocuments.map(async (document) => {
        const requestBody: any = {
          user_id: selectedUser.id,
          document_type: documentType,
          expiry_date: expiryDate,
          notes: notes.trim() || undefined,
        };

        if (documentType === 'book') {
          requestBody.book_id = document.id;
        } else {
          requestBody.academic_document_id = document.id;
        }

        const response = await fetch('/api/reservations', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestBody),
        });

        return { response, document };
      });

      const results = await Promise.all(reservationPromises);
      
      let successCount = 0;
      let errorMessages: string[] = [];

      for (const { response, document } of results) {
        if (response.ok) {
          successCount++;
        } else {
          const errorData = await response.json();
          
          // Gérer spécifiquement l'erreur de document disponible
          if (errorData.error?.code === 'DOCUMENT_AVAILABLE') {
            errorMessages.push(`"${document.title}" est disponible pour emprunt immédiat`);
          } else {
            errorMessages.push(`Erreur pour "${document.title}": ${errorData.error?.message || 'Erreur inconnue'}`);
          }
        }
      }

      // Afficher le résultat global
      if (successCount > 0) {
        toast({
          title: `${successCount} réservation${successCount > 1 ? 's' : ''} créée${successCount > 1 ? 's' : ''}`,
          description: `${successCount} document${successCount > 1 ? 's' : ''} réservé${successCount > 1 ? 's' : ''} pour ${selectedUser.full_name}`,
        });

        // Notifier les autres interfaces que les données ont changé
        notifyReservationChange();
        notifyBookChange();
      }

      if (errorMessages.length > 0) {
        toast({
          title: `${errorMessages.length} erreur${errorMessages.length > 1 ? 's' : ''}`,
          description: errorMessages.join('. '),
          variant: "destructive",
        });
      }

      if (successCount > 0) {
        router.push('/reservations');
      }
    } catch (error: any) {
      console.error('Erreur:', error);
      toast({
        title: "Erreur",
        description: error.message || "Impossible de créer la réservation",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
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

          <div className="relative z-10 container mx-auto px-3 sm:px-4 md:px-6 py-4 sm:py-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
              <div className="flex items-center space-x-3 sm:space-x-4">
                <Button variant="ghost" size="sm" asChild>
                  <Link href="/reservations">
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
                    <Calendar className="h-6 w-6 sm:h-8 sm:w-8 text-green-600 drop-shadow-lg" />
                  </motion.div>
                  <div>
                    <motion.h1
                      className="text-xl sm:text-2xl md:text-3xl font-bold bg-gradient-to-r from-slate-800 via-green-600 to-slate-800 dark:from-slate-200 dark:via-green-400 dark:to-slate-200 bg-clip-text text-transparent"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.4, delay: 0.1 }}
                    >
                      Nouvelle Réservation
                    </motion.h1>
                    <motion.p
                      className="text-sm sm:text-base text-gray-600 dark:text-gray-300 mt-1 font-medium"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.4, delay: 0.2 }}
                    >
                      Créer une nouvelle demande de réservation de document
                    </motion.p>
                  </div>
                </div>
              </div>
              
              {/* Bouton Actualiser */}
              <motion.div
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="w-full sm:w-auto"
              >
                <Button
                  onClick={() => window.location.reload()}
                  variant="outline"
                  size="sm"
                  className="w-full sm:w-auto bg-green-100 dark:bg-green-700 border border-green-300 dark:border-green-600 hover:bg-green-200 dark:hover:bg-green-600 hover:border-green-400 dark:hover:border-green-500 transition-all duration-200 font-medium text-green-700 dark:text-green-200 text-xs sm:text-sm"
                >
                  <RefreshCw className="h-3 w-3 sm:h-4 sm:w-4 mr-2" />
                  Actualiser
                </Button>
              </motion.div>
            </div>
          </div>
        </motion.div>

        <div className="max-w-full mx-4 lg:mx-8 py-4 sm:py-6 md:py-7 lg:py-8">
          <motion.div
            initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.5 }}
          >
            {/* Information sur les réservations */}
            <ReservationInfo />

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Sélection du type de document */}
              <Card>
                <CardHeader>
                  <CardTitle>Type de Document</CardTitle>
                  <CardDescription>
                    Choisissez le type de document à réserver
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {[
                      { value: 'book', label: 'Livre', icon: BookOpen, color: 'text-blue-600' },
                      { value: 'these', label: 'Thèse', icon: GraduationCap, color: 'text-pink-600' },
                      { value: 'memoire', label: 'Mémoire', icon: FileText, color: 'text-green-600' },
                      { value: 'rapport_stage', label: 'Rapport de Stage', icon: Clipboard, color: 'text-gray-600' }
                    ].map((type) => (
                      <button
                        key={type.value}
                        type="button"
                        onClick={() => {
                          setDocumentType(type.value as any);
                          setSelectedDocuments([]);
                          setDocumentSearch("");
                        }}
                        className={`p-4 border-2 rounded-lg text-center transition-all hover:shadow-md ${
                          documentType === type.value
                            ? 'border-green-500 bg-green-600 dark:bg-green-500 shadow-md'
                            : 'border-gray-200 hover:border-gray-300 bg-white dark:bg-gray-800'
                        }`}
                      >
                        <div className="flex justify-center mb-3">
                          <type.icon className={`h-8 w-8 ${
                            documentType === type.value
                              ? 'text-white'
                              : `${type.color} dark:${type.color.replace('text-', 'text-').replace('-600', '-400')}`
                          }`} />
                        </div>
                        <div className={`font-medium text-sm ${
                          documentType === type.value
                            ? 'text-white'
                            : 'text-gray-800 dark:text-white'
                        }`}>{type.label}</div>
                      </button>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Sélection de l'utilisateur */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <UserIcon className="h-5 w-5" />
                      <span>Sélectionner l'Utilisateur</span>
                    </CardTitle>
                    <CardDescription>
                      Recherchez par nom, email ou scannez le code-barres
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Scan code-barres utilisateur */}
                    <div>
                      <Label>Scanner le code-barres utilisateur ou saisir le matricule</Label>
                      <div className="flex space-x-2">
                        <Input
                          placeholder="Code-barres ou matricule utilisateur"
                          value={userBarcode}
                          onChange={(e) => setUserBarcode(e.target.value)}
                          onKeyPress={(e) => e.key === "Enter" && (e.preventDefault(), handleUserBarcodeSearch())}
                        />
                        <Button type="button" onClick={handleUserBarcodeSearch} size="sm">
                          <Scan className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    {/* Recherche utilisateur */}
                    <div>
                      <Label>Ou rechercher par nom/email</Label>
                      <div className="relative">
                        <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                        <Input
                          placeholder="Nom, email..."
                          value={userSearch}
                          onChange={(e) => setUserSearch(e.target.value)}
                          className="pl-10"
                        />
                      </div>
                    </div>

                    {/* Liste des utilisateurs */}
                    {userSearch && (
                      <div className="max-h-48 overflow-y-auto space-y-2">
                        {loadingUsers ? (
                          <div className="p-3 text-center text-gray-500">
                            Recherche en cours...
                          </div>
                        ) : users.length > 0 ? (
                          users.map(user => (
                            <div
                              key={user.id}
                              onClick={() => setSelectedUser(user)}
                              className="p-3 border rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                            >
                              <div className="flex items-start space-x-3">
                                <div className="flex-shrink-0 mt-1">
                                  <UserIcon className="h-5 w-5 text-green-600" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="font-medium text-gray-900 dark:text-white truncate">{user.full_name}</p>
                                  <p className="text-sm text-gray-600 dark:text-gray-300 truncate">{user.email}</p>
                                  <p className="text-xs text-gray-400">
                                    {user.matricule || user.barcode} • Max: {user.max_loans} emprunts • Max: {user.max_reservations} réservations
                                  </p>
                                </div>
                              </div>
                            </div>
                          ))
                        ) : userSearch.length >= 2 ? (
                          <div className="p-3 text-center text-gray-500">
                            Aucun utilisateur trouvé
                          </div>
                        ) : (
                          <div className="p-3 text-center text-gray-500">
                            Tapez au moins 2 caractères pour rechercher
                          </div>
                        )}
                      </div>
                    )}

                    {/* Utilisateur sélectionné avec détails complets */}
                    {selectedUser && (
                      <UserDetailsCard
                        userId={selectedUser.id}
                        onUserStatusChange={(canBorrow, canReserve) => {
                          // Optionnel: gérer les changements de statut
                          console.log('Statut utilisateur:', { canBorrow, canReserve });
                        }}
                      />
                    )}
                  </CardContent>
                </Card>

                {/* Sélection du document */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      {documentType === 'book' && <BookOpen className="h-5 w-5" />}
                      {documentType === 'these' && <GraduationCap className="h-5 w-5" />}
                      {documentType === 'memoire' && <FileText className="h-5 w-5" />}
                      {documentType === 'rapport_stage' && <Clipboard className="h-5 w-5" />}
                      <span>
                        Sélectionner {
                          documentType === 'book' ? 'le Livre' :
                          documentType === 'these' ? 'la Thèse' :
                          documentType === 'memoire' ? 'le Mémoire' :
                          'le Rapport de Stage'
                        }
                      </span>
                    </CardTitle>
                    <CardDescription>
                      Recherchez par titre, auteur ou directeur
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Scan code-barres livre */}
                    {documentType === 'book' && (
                      <div>
                        <Label>Scanner le code-barres livre</Label>
                        <div className="flex space-x-2">
                          <Input
                            placeholder="Code-barres livre (MFN)"
                            value={bookBarcode}
                            onChange={(e) => setBookBarcode(e.target.value)}
                            onKeyPress={(e) => e.key === "Enter" && handleBookBarcodeSearch()}
                          />
                          <Button type="button" onClick={handleBookBarcodeSearch} size="sm">
                            <Scan className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    )}

                    {/* Recherche document */}
                    <div>
                      <Label>
                        {documentType === 'book' ? "Ou rechercher par titre/auteur" : "Rechercher par titre/auteur/directeur"}
                      </Label>
                      <div className="relative">
                        <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                        <Input
                          placeholder={
                            documentType === 'book' ? "Titre, auteur..." :
                            documentType === 'these' ? "Titre, auteur, directeur..." :
                            documentType === 'memoire' ? "Titre, auteur, superviseur..." :
                            "Titre, étudiant, superviseur..."
                          }
                          value={documentSearch}
                          onChange={(e) => setDocumentSearch(e.target.value)}
                          className="pl-10"
                        />
                      </div>
                    </div>

                    {/* Liste des documents */}
                    {documentSearch && documents.length > 0 && (
                      <div className="max-h-48 overflow-y-auto space-y-2 border border-gray-200 rounded-lg p-2 bg-white dark:bg-gray-800">
                        {loadingDocuments ? (
                          <div className="p-3 text-center text-gray-500">
                            Recherche en cours...
                          </div>
                        ) : (
                          documents.map(doc => (
                            <div
                              key={doc.id}
                              onClick={(e) => {
                                e.stopPropagation();
                                console.log('📚 CLIC SUR DOCUMENT:', doc);
                                const isSelected = selectedDocuments.some(d => d.id === doc.id);
                                if (isSelected) {
                                  // Désélectionner
                                  setSelectedDocuments(prev => prev.filter(d => d.id !== doc.id));
                                  toast({
                                    title: "Document désélectionné",
                                    description: `"${doc.title}" retiré de la sélection`,
                                  });
                                } else {
                                  // Sélectionner (ajouter à la liste)
                                  setSelectedDocuments(prev => [...prev, doc]);
                                  toast({
                                    title: "Document ajouté",
                                    description: `"${doc.title}" ajouté à la sélection`,
                                  });
                                }
                              }}
                              className="p-3 border-2 border-blue-200 rounded-lg cursor-pointer hover:bg-blue-50/30 hover:border-blue-300 dark:hover:bg-gray-800/30 transition-all duration-200 shadow-sm hover:shadow-md"
                            >
                              <div className="flex items-start space-x-3">
                                <div className="flex-shrink-0 mt-1">
                                  {documentType === 'book' && <BookOpen className="h-5 w-5 text-blue-600" />}
                                  {documentType === 'these' && <GraduationCap className="h-5 w-5 text-purple-600" />}
                                  {documentType === 'memoire' && <FileText className="h-5 w-5 text-green-600" />}
                                  {documentType === 'rapport_stage' && <Clipboard className="h-5 w-5 text-orange-600" />}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="font-medium text-gray-900 dark:text-white truncate">{doc.title}</p>
                                  <p className="text-sm text-gray-600 dark:text-gray-300">{doc.author}</p>
                                  <div className="flex items-center space-x-2 mt-1">
                                    <span className="text-xs text-gray-500">
                                      {doc.mfn || doc.degree}
                                    </span>
                                    {doc.available_copies !== undefined && (
                                      doc.available_copies > 0 ? (
                                        <Badge variant="default">
                                          {doc.available_copies} disponible{doc.available_copies > 1 ? 's' : ''}
                                        </Badge>
                                      ) : (
                                        <Badge variant="destructive">
                                          Non disponible
                                        </Badge>
                                      )
                                    )}
                                  </div>
                                  {doc.university && (
                                    <p className="text-xs text-gray-400 mt-1">{doc.university}</p>
                                  )}
                                </div>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    )}

                    {/* Messages d'état pour la recherche */}
                    {documentSearch && documents.length === 0 && !loadingDocuments && (
                      <div className="p-3 text-center text-gray-500 border border-gray-200 rounded-lg">
                        {documentSearch.length >= 2 ? "Aucun document trouvé" : "Tapez au moins 2 caractères pour rechercher"}
                      </div>
                    )}

                    {/* Document sélectionné */}
                    {selectedDocuments.length > 0 && (
                      <div className="space-y-3">
                        <h4 className="font-semibold text-gray-900 dark:text-white">
                          {selectedDocuments.length} document{selectedDocuments.length > 1 ? 's' : ''} sélectionné{selectedDocuments.length > 1 ? 's' : ''}
                        </h4>
                        {selectedDocuments.map((document, index) => (
                          <div key={document.id} className="p-4 bg-green-50 dark:bg-green-800/90 rounded-lg border border-green-200 dark:border-green-800">
                            <div className="flex items-start space-x-3">
                              <div className="flex-shrink-0">
                                <div className="p-2 bg-green-100 dark:bg-green-800/90 rounded-full">
                                  {documentType === 'book' && <BookOpen className="h-5 w-5 text-green-600 dark:text-green-400" />}
                                  {documentType === 'these' && <GraduationCap className="h-5 w-5 text-green-600 dark:text-green-400" />}
                                  {documentType === 'memoire' && <FileText className="h-5 w-5 text-green-600 dark:text-green-400" />}
                                  {documentType === 'rapport_stage' && <Clipboard className="h-5 w-5 text-green-600 dark:text-green-400" />}
                                </div>
                              </div>
                              <div className="flex-1">
                                <div className="flex items-start justify-between">
                                  <div className="flex-1">
                                    <p className="text-green-800 dark:text-green-200 font-medium">{document.title}</p>
                                    <p className="text-sm text-green-600 dark:text-green-300">
                                      {document.author} • {document.mfn || document.degree}
                                    </p>
                                    {document.supervisor && (
                                      <p className="text-sm text-green-600 dark:text-green-300">
                                        Superviseur: {document.supervisor}
                                      </p>
                                    )}
                                    {document.university && (
                                      <p className="text-sm text-green-600 dark:text-green-300">
                                        {document.university}
                                      </p>
                                    )}
                                    {document.available_copies !== undefined && (
                                      <div className="mt-2">
                                        {document.available_copies > 0 ? (
                                          <Badge variant="default">
                                            {document.available_copies} exemplaire{document.available_copies > 1 ? 's' : ''} disponible{document.available_copies > 1 ? 's' : ''}
                                          </Badge>
                                        ) : (
                                          <Badge variant="destructive">
                                            Non disponible
                                          </Badge>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setSelectedDocuments(prev => prev.filter(d => d.id !== document.id));
                                      toast({
                                        title: "Document retiré",
                                        description: `"${document.title}" retiré de la sélection`,
                                      });
                                    }}
                                    className="ml-3 p-1 text-red-500 hover:text-red-700 hover:bg-red-100 rounded-full transition-colors"
                                  >
                                    <X className="h-4 w-4" />
                                  </button>
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Informations de la réservation */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Clock className="h-5 w-5" />
                    <span>Informations de la Réservation</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="expiry_date">Date d'expiration <span className="text-red-500">*</span></Label>
                      <Input
                        id="expiry_date"
                        type="date"
                        value={expiryDate}
                        onChange={(e) => setExpiryDate(e.target.value)}
                        min={new Date().toISOString().split('T')[0]}
                        required
                      />
                    </div>
                    <div className="flex items-end">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          const days = settings.general.default_reservation_duration_days;
                          setExpiryDate(new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);
                        }}
                      >
                        Durée standard ({settings.general.default_reservation_duration_days} jours)
                      </Button>
                    </div>
                  </div>

                  <div className="mt-4">
                    <Label htmlFor="notes">Notes (optionnel)</Label>
                    <textarea
                      id="notes"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Notes ou commentaires sur la réservation..."
                      className="w-full h-24 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Boutons d'action */}
              <div className="flex justify-end space-x-4">
                <Button type="button" variant="outline" asChild>
                  <Link href="/reservations">Annuler</Link>
                </Button>
                <Button type="submit" disabled={isLoading || !selectedUser || selectedDocuments.length === 0}>
                  {isLoading ? (
                    <div className="flex items-center space-x-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      <span>Création en cours...</span>
                    </div>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      Créer la réservation
                    </>
                  )}
                </Button>
              </div>
            </form>
          </motion.div>
        </div>
      </div>
    </ProtectedLayout>
  );
}
