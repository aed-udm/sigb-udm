"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useRefresh } from "@/contexts/refresh-context";
import { motion } from 'framer-motion';
import { Calendar, Save, ArrowLeft, Search, User, BookOpen, Scan, GraduationCap, FileText, Clipboard, Clock, RefreshCw, X } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import ProtectedLayout from "@/components/layout/protected-layout";
import { PageHeader } from "@/components/ui/page-header";
import { useToast } from "@/hooks/use-toast";
import { calculateDueDateCameroonSync } from "@/lib/utils";
// Import conditionnel pour éviter les erreurs côté client
// import { getDefaultUserSettings } from "@/lib/system-settings";
import { UserDetailsCard } from "@/components/ui/user-details-card";

interface User {
  id: string;
  full_name: string;
  email: string;
  barcode: string;
  max_loans: number;
  max_reservations: number;
  is_active: boolean;
}

interface Book {
  id: string;
  title: string;
  main_author: string;
  mfn: string;
  available_copies: number;
}

interface AcademicDocument {
  id: string;
  title: string;
  author: string;
  supervisor: string;
  degree: string;
  document_type: 'these' | 'memoire' | 'rapport_stage';
  available_copies: number;
  university?: string;
  year?: number;
}

export default function NewLoanPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { notifyLoanChange, notifyBookChange } = useRefresh();
  const [isLoading, setIsLoading] = useState(false);

  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [selectedBooks, setSelectedBooks] = useState<Book[]>([]);
  const [selectedAcademicDocuments, setSelectedAcademicDocuments] = useState<AcademicDocument[]>([]);
  const [documentType, setDocumentType] = useState<'book' | 'these' | 'memoire' | 'rapport_stage'>('book');
  const [loanType, setLoanType] = useState<'loan' | 'reading_room'>('loan');
  const [readingLocation, setReadingLocation] = useState('Salle de lecture principale');
  const [userSearch, setUserSearch] = useState("");
  const [bookSearch, setBookSearch] = useState("");
  const [academicSearch, setAcademicSearch] = useState("");
  const [userBarcode, setUserBarcode] = useState("");
  const [bookBarcode, setBookBarcode] = useState("");
  const [dueDate, setDueDate] = useState('');
  const [defaultLoanDuration, setDefaultLoanDuration] = useState(21);

  // États pour les données depuis l'API
  const [users, setUsers] = useState<User[]>([]);
  const [books, setBooks] = useState<Book[]>([]);
  const [academicDocuments, setAcademicDocuments] = useState<AcademicDocument[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [loadingBooks, setLoadingBooks] = useState(false);
  const [loadingAcademicDocuments, setLoadingAcademicDocuments] = useState(false);

  // Charger les paramètres par défaut au démarrage via API
  useEffect(() => {
    const loadDefaultSettings = async () => {
      try {
        const response = await fetch('/api/admin/settings?category=loans');
        if (response.ok) {
          const data = await response.json();
          const loanSettings = data.data.settings.loans || [];
          const defaultDurationSetting = loanSettings.find((s: any) => s.key === 'default_loan_duration');
          const duration = defaultDurationSetting?.value || 21;
          
          setDefaultLoanDuration(duration);
          setDueDate(calculateDueDateCameroonSync(new Date(), duration).toISOString().split('T')[0]);
        } else {
          throw new Error('Impossible de charger les paramètres');
        }
      } catch (error) {
        console.error('Erreur lors du chargement des paramètres par défaut:', error);
        setDefaultLoanDuration(21);
        setDueDate(calculateDueDateCameroonSync(new Date(), 21).toISOString().split('T')[0]);
      }
    };
    
    loadDefaultSettings();
  }, []);

  // Charger les usagers quand on commence à chercher
  useEffect(() => {
    if (userSearch.length >= 2) {
      const fetchUsers = async () => {
        try {
          setLoadingUsers(true);
          const response = await fetch(`/api/users?search=${encodeURIComponent(userSearch)}&active=true`);
          if (response.ok) {
            const data = await response.json();
            setUsers(data.data || []);
          }
        } catch (error) {
          console.error('Erreur lors du chargement des usagers:', error);
        } finally {
          setLoadingUsers(false);
        }
      };
      fetchUsers();
    } else {
      setUsers([]);
    }
  }, [userSearch]);

  // Charger les livres quand on commence à chercher
  useEffect(() => {
    if (documentType === 'book' && bookSearch.length >= 2) {
      const fetchBooks = async () => {
        try {
          setLoadingBooks(true);
          const response = await fetch(`/api/books?search=${encodeURIComponent(bookSearch)}&available=true`);
          if (response.ok) {
            const data = await response.json();
            setBooks(data.data || []);
          }
        } catch (error) {
          console.error('Erreur lors du chargement des livres:', error);
        } finally {
          setLoadingBooks(false);
        }
      };
      fetchBooks();
    } else {
      setBooks([]);
    }
  }, [bookSearch, documentType]);

  // Charger les documents académiques quand on commence à chercher
  useEffect(() => {
    if (documentType !== 'book' && academicSearch.length >= 2) {
      const fetchAcademicDocuments = async () => {
        try {
          setLoadingAcademicDocuments(true);
          console.log(`🔍 Recherche de documents: ${documentType} avec terme: "${academicSearch}"`);

          const url = `/api/academic-documents/available?search=${encodeURIComponent(academicSearch)}&document_type=${documentType}`;
          console.log(`📡 URL de l'API: ${url}`);

          const response = await fetch(url);
          console.log(`📊 Statut de la réponse: ${response.status}`);

          if (response.ok) {
            const data = await response.json();
            console.log(`✅ Données reçues:`, data);
            setAcademicDocuments(data.data || []);
          } else {
            const errorData = await response.text();
            console.error(`❌ Erreur API (${response.status}):`, errorData);
            setAcademicDocuments([]);
            toast({
              title: "Erreur de recherche",
              description: `Impossible de charger les documents (${response.status})`,
              variant: "destructive",
            });
          }
        } catch (error) {
          console.error('❌ Erreur lors du chargement des documents académiques:', error);
          setAcademicDocuments([]);
          toast({
            title: "Erreur de connexion",
            description: "Impossible de se connecter au serveur",
            variant: "destructive",
          });
        } finally {
          setLoadingAcademicDocuments(false);
        }
      };
      fetchAcademicDocuments();
    } else {
      setAcademicDocuments([]);
    }
  }, [academicSearch, documentType]);

  const handleUserBarcodeSearch = async () => {
    if (!userBarcode.trim()) return;

    try {
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
        description: "Erreur lors de la recherche de l'utilisateur",
        variant: "destructive",
      });
    }
  };

  const handleBookBarcodeSearch = async () => {
    if (!bookBarcode.trim()) return;

    try {
      const response = await fetch(`/api/books?search=${encodeURIComponent(bookBarcode)}`);
      if (response.ok) {
        const data = await response.json();
        const book = data.data.find((b: Book) => b.mfn === bookBarcode);

        if (book) {
          if (book.available_copies > 0) {
            setSelectedBooks([book]);
            setBookBarcode("");
            toast({
              title: "Livre trouvé",
              description: `"${book.title}" sélectionné`,
            });
          } else {
            // Vérifier s'il y a des réservations pour ce livre
            const checkReservations = async () => {
              try {
                const reservationResponse = await fetch(`/api/reservations?book_id=${book.id}&status=active`);
                if (reservationResponse.ok) {
                  const reservationData = await reservationResponse.json();
                  const reservationsCount = reservationData.data?.length || 0;

                  const message = reservationsCount > 0
                    ? `Ce livre n'a plus d'exemplaires disponibles. ${reservationsCount} réservation(s) en attente. Faites une réservation pour vous mettre en file d'attente.`
                    : "Ce livre n'a plus d'exemplaires disponibles. Faites une réservation pour être notifié quand il sera disponible.";

                  toast({
                    title: "Livre indisponible",
                    description: message,
                    variant: "destructive",
                  });
                }
              } catch (error) {
                toast({
                  title: "Livre indisponible",
                  description: "Ce livre n'a plus d'exemplaires disponibles",
                  variant: "destructive",
                });
              }
            };
            checkReservations();
          }
        } else {
          toast({
            title: "Livre non trouvé",
            description: "Aucun livre trouvé avec ce code-barres",
            variant: "destructive",
          });
        }
      } else {
        toast({
          title: "Livre non trouvé",
          description: "Aucun livre trouvé avec ce code-barres",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Erreur lors de la recherche du livre",
        variant: "destructive",
      });
    }
  };

  // Fonction pour créer une réservation rapide
  const handleQuickReservation = async (documentTitle: string, documentId: string, documentType: string) => {
    if (!selectedUser) {
      toast({
        title: "Utilisateur requis",
        description: "Veuillez d'abord sélectionner un utilisateur pour faire une réservation",
        variant: "destructive",
      });
      return;
    }

    try {
      const requestBody: any = {
        user_id: selectedUser.id,
        document_type: documentType,
        expiry_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // +7 jours
        notes: `Réservation créée depuis l'interface d'emprunt`
      };

      if (documentType === 'book') {
        requestBody.book_id = documentId;
      } else {
        requestBody.academic_document_id = documentId;
      }

      const response = await fetch('/api/reservations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (response.ok) {
        const data = await response.json();
        toast({
          title: "✅ Réservation créée",
          description: `"${documentTitle}" réservé pour ${selectedUser.full_name}. Vous serez notifié quand il sera disponible.`,
        });

        // Rediriger vers les réservations
        router.push("/reservations");
      } else {
        const errorData = await response.json();
        toast({
          title: "Erreur de réservation",
          description: errorData.error?.message || "Impossible de créer la réservation",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Erreur lors de la création de la réservation",
        variant: "destructive",
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedUser || (documentType === 'book' && selectedBooks.length === 0) || (documentType !== 'book' && selectedAcademicDocuments.length === 0)) {
      toast({
        title: "Informations manquantes",
        description: "Veuillez sélectionner un utilisateur et au moins un document",
        variant: "destructive",
      });
      return;
    }

    // Validation spécifique pour la lecture sur place
    if (loanType === 'reading_room' && !readingLocation.trim()) {
      toast({
        title: "Erreur",
        description: "Veuillez spécifier le lieu de consultation",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      if (loanType === 'reading_room') {
        // Créer des consultations sur place
        const consultationPromises: Promise<{response: Response, document: any}>[] = [];

        if (documentType === 'book') {
          selectedBooks.forEach(book => {
            const requestBody = {
              user_id: selectedUser.id,
              document_type: documentType,
              book_id: book.id,
              reading_location: readingLocation,
            };
            consultationPromises.push(fetch('/api/reading-room', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(requestBody),
            }).then(response => ({ response, document: book })));
          });
        } else {
          selectedAcademicDocuments.forEach(doc => {
            const requestBody = {
              user_id: selectedUser.id,
              document_type: documentType,
              academic_document_id: doc.id,
              reading_location: readingLocation,
            };
            consultationPromises.push(fetch('/api/reading-room', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(requestBody),
            }).then(response => ({ response, document: doc })));
          });
        }

        const results = await Promise.all(consultationPromises);

        let successCount = 0;
        let errorMessages: string[] = [];

        for (const { response, document } of results) {
          if (response.ok) {
            successCount++;
          } else {
            const errorData = await response.json();
            errorMessages.push(`Erreur pour "${document.title}": ${errorData.error?.message || 'Erreur inconnue'}`);
          }
        }

        // Afficher le résultat global pour les consultations
        if (successCount > 0) {
          toast({
            title: "Consultation(s) enregistrée(s)",
            description: `${successCount} consultation(s) sur place enregistrée(s) avec succès${errorMessages.length > 0 ? ` (${errorMessages.length} erreur(s))` : ''}`,
          });

          // Rediriger vers la page des consultations (ou emprunts avec filtre)
          router.push("/loans?type=reading_room");
        } else {
          toast({
            title: "Erreur",
            description: errorMessages.join('\n') || "Erreur lors de l'enregistrement des consultations",
            variant: "destructive",
          });
        }

      } else {
        // Créer des emprunts classiques
        const loanPromises: Promise<{response: Response, document: any}>[] = [];

        if (documentType === 'book') {
          selectedBooks.forEach(book => {
            const requestBody = {
              user_id: selectedUser.id,
              document_type: documentType,
              due_date: dueDate,
              book_id: book.id,
            };
            loanPromises.push(fetch('/api/loans', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(requestBody),
            }).then(response => ({ response, document: book })));
          });
        } else {
          selectedAcademicDocuments.forEach(doc => {
            const requestBody = {
              user_id: selectedUser.id,
              document_type: documentType,
              due_date: dueDate,
              academic_document_id: doc.id,
            };
            loanPromises.push(fetch('/api/loans', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(requestBody),
            }).then(response => ({ response, document: doc })));
          });
        }

        const results = await Promise.all(loanPromises);
      
      let successCount = 0;
      let errorMessages: string[] = [];

      for (const { response, document } of results) {
        if (response.ok) {
          successCount++;
        } else {
          const errorData = await response.json();
          errorMessages.push(`Erreur pour "${document.title}": ${errorData.error?.message || 'Erreur inconnue'}`);
        }
      }

      // Afficher le résultat global
      if (successCount > 0) {
        toast({
          title: `${successCount} emprunt${successCount > 1 ? 's' : ''} enregistré${successCount > 1 ? 's' : ''}`,
          description: `${successCount} document${successCount > 1 ? 's' : ''} emprunté${successCount > 1 ? 's' : ''} par ${selectedUser.full_name}`,
        });

        // Notifier les autres interfaces que les données ont changé
        notifyLoanChange();
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
        router.push('/loans');
      }
      } // Fermeture du bloc else
    } catch (error: any) {
      console.error('Erreur:', error);
      toast({
        title: "Erreur",
        description: error.message || "Impossible de créer l'emprunt",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ProtectedLayout>
      <div className="bg-gray-50 dark:bg-gray-900 min-h-screen">
        <PageHeader
          title="Nouvel Emprunt"
          description="Enregistrer un nouvel emprunt de document"
          icon={Calendar}
          backHref="/loans"
          iconColor="text-green-600"
          actions={
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
          }
        />

        <div className="max-w-full mx-4 lg:mx-8 py-4 sm:py-6 md:py-7 lg:py-8">
          <motion.div
            initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.5 }}
          >
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Sélection du type de document */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Clock className="h-5 w-5" />
                    <span>Type de Document</span>
                  </CardTitle>
                  <CardDescription>
                    Choisissez le type de document à emprunter
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {[
                      { value: 'book', label: 'Livre', icon: BookOpen, color: 'text-blue-600' },
                      { value: 'these', label: 'Thèse', icon: GraduationCap, color: 'text-purple-600' },
                      { value: 'memoire', label: 'Mémoire', icon: FileText, color: 'text-green-600' },
                      { value: 'rapport_stage', label: 'Rapport de Stage', icon: Clipboard, color: 'text-orange-600' }
                    ].map((type) => (
                      <button
                        key={type.value}
                        type="button"
                        onClick={() => {
                          setDocumentType(type.value as any);
                          setSelectedBooks([]);
                          setSelectedAcademicDocuments([]);
                          setBookSearch("");
                          setAcademicSearch("");
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
                      <User className="h-5 w-5" />
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
                              className="p-3 border rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700"
                            >
                              <p className="font-medium">{user.full_name}</p>
                              <p className="text-sm text-gray-500">{user.email}</p>
                              <p className="text-xs text-gray-400">
                                {user.matricule} • Max: {user.max_loans} emprunts
                              </p>
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
                      {documentType === 'book'
                        ? "Recherchez par titre, auteur ou scannez le code-barres"
                        : "Recherchez par titre, auteur ou directeur"
                      }
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Scan code-barres livre (seulement pour les livres) */}
                    {documentType === 'book' && (
                      <div>
                        <Label>Scanner le code-barres livre</Label>
                        <div className="flex space-x-2">
                          <Input
                            placeholder="Code-barres livre (MFN)"
                            value={bookBarcode}
                            onChange={(e) => setBookBarcode(e.target.value)}
                            onKeyPress={(e) => e.key === "Enter" && (e.preventDefault(), handleBookBarcodeSearch())}
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
                          value={documentType === 'book' ? bookSearch : academicSearch}
                          onChange={(e) => documentType === 'book' ? setBookSearch(e.target.value) : setAcademicSearch(e.target.value)}
                          className="pl-10"
                        />
                      </div>
                    </div>

                    {/* Liste des documents */}
                    {(documentType === 'book' ? bookSearch : academicSearch) && (
                      <div className="max-h-48 overflow-y-auto space-y-2">
                        {(documentType === 'book' ? loadingBooks : loadingAcademicDocuments) ? (
                          <div className="p-3 text-center text-gray-500">
                            Recherche en cours...
                          </div>
                        ) : documentType === 'book' ? (
                          books.length > 0 ? (
                            books.map(book => (
                              <div
                                key={book.id}
                                onClick={() => {
                                  if (book.available_copies > 0) {
                                    const isSelected = selectedBooks.some(b => b.id === book.id);
                                    if (isSelected) {
                                      setSelectedBooks(prev => prev.filter(b => b.id !== book.id));
                                    } else {
                                      setSelectedBooks(prev => [...prev, book]);
                                    }
                                  }
                                }}
                                className={`p-3 border rounded-lg cursor-pointer ${
                                  book.available_copies > 0
                                    ? 'hover:bg-gray-50 dark:hover:bg-gray-700'
                                    : 'opacity-50 cursor-not-allowed'
                                }`}
                              >
                                <p className="font-medium">{book.title}</p>
                                <p className="text-sm text-gray-500">{book.main_author}</p>
                                <p className="text-xs text-gray-400">
                                  {book.mfn} • {book.available_copies} disponible(s)
                                </p>
                              </div>
                            ))
                          ) : bookSearch.length >= 2 ? (
                            <div className="p-3 text-center text-gray-500">
                              Aucun livre trouvé
                            </div>
                          ) : (
                            <div className="p-3 text-center text-gray-500">
                              Tapez au moins 2 caractères pour rechercher
                            </div>
                          )
                        ) : (
                          academicDocuments.length > 0 ? (
                            academicDocuments.map(doc => (
                              <div
                                key={doc.id}
                                onClick={() => {
                                  if (doc.available_copies > 0) {
                                    const isSelected = selectedAcademicDocuments.some(d => d.id === doc.id);
                                    if (isSelected) {
                                      setSelectedAcademicDocuments(prev => prev.filter(d => d.id !== doc.id));
                                    } else {
                                      setSelectedAcademicDocuments(prev => [...prev, doc]);
                                    }
                                  }
                                }}
                                className={`p-3 border rounded-lg cursor-pointer ${
                                  doc.available_copies > 0
                                    ? 'hover:bg-gray-50 dark:hover:bg-gray-700'
                                    : 'opacity-50 cursor-not-allowed'
                                }`}
                              >
                                <p className="font-medium">{doc.title}</p>
                                <p className="text-sm text-gray-500">{doc.author}</p>
                                <p className="text-xs text-gray-400">
                                  {doc.degree} • {doc.available_copies} disponible(s)
                                </p>
                                {doc.university && (
                                  <p className="text-xs text-gray-400">{doc.university}</p>
                                )}
                              </div>
                            ))
                          ) : academicSearch.length >= 2 ? (
                            <div className="p-3 text-center text-gray-500">
                              Aucun document trouvé
                            </div>
                          ) : (
                            <div className="p-3 text-center text-gray-500">
                              Tapez au moins 2 caractères pour rechercher
                            </div>
                          )
                        )}
                      </div>
                    )}

                    {/* Documents sélectionnés */}
                    {(selectedBooks.length > 0 || selectedAcademicDocuments.length > 0) && (
                      <div className="space-y-3">
                        <h4 className="font-semibold text-gray-900 dark:text-white">
                          {documentType === 'book' 
                            ? `${selectedBooks.length} livre${selectedBooks.length > 1 ? 's' : ''} sélectionné${selectedBooks.length > 1 ? 's' : ''}`
                            : `${selectedAcademicDocuments.length} document${selectedAcademicDocuments.length > 1 ? 's' : ''} sélectionné${selectedAcademicDocuments.length > 1 ? 's' : ''}`
                          }
                        </h4>
                        {documentType === 'book' && selectedBooks.map((book, index) => (
                          <div key={book.id} className="p-4 bg-green-50 dark:bg-green-800/90 rounded-lg border border-green-200 dark:border-green-700">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <p className="text-green-800 dark:text-green-200 font-medium">{book.title}</p>
                                <p className="text-sm text-green-600 dark:text-green-300">
                                  {book.main_author} • {book.mfn}
                                </p>
                                <p className="text-sm text-green-600 dark:text-green-300">
                                  {book.available_copies} exemplaire(s) disponible(s)
                                </p>
                              </div>
                              <button
                                type="button"
                                onClick={() => setSelectedBooks(prev => prev.filter(b => b.id !== book.id))}
                                className="ml-3 p-1 text-red-500 hover:text-red-700 hover:bg-red-100 rounded-full transition-colors"
                              >
                                <X className="h-4 w-4" />
                              </button>
                            </div>
                          </div>
                        ))}
                        {documentType !== 'book' && selectedAcademicDocuments.map((doc, index) => (
                          <div key={doc.id} className="p-4 bg-green-50 dark:bg-green-800/90 rounded-lg border border-green-200 dark:border-green-700">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <p className="text-green-800 dark:text-green-200 font-medium">{doc.title}</p>
                                <p className="text-sm text-green-600 dark:text-green-300">
                                  {doc.author} • {doc.degree}
                                </p>
                                {doc.supervisor && (
                                  <p className="text-sm text-green-600 dark:text-green-300">
                                    Superviseur: {doc.supervisor}
                                  </p>
                                )}
                                {doc.university && (
                                  <p className="text-sm text-green-600 dark:text-green-300">
                                    {doc.university}
                                  </p>
                                )}
                              </div>
                              <button
                                type="button"
                                onClick={() => setSelectedAcademicDocuments(prev => prev.filter(d => d.id !== doc.id))}
                                className="ml-3 p-1 text-red-500 hover:text-red-700 hover:bg-red-100 rounded-full transition-colors"
                              >
                                <X className="h-4 w-4" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Informations de l'emprunt */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Calendar className="h-5 w-5" />
                    <span>{loanType === 'reading_room' ? 'Informations de Consultation' : 'Informations de l\'Emprunt'}</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {/* Type d'opération */}
                  <div className="mb-6">
                    <Label className="text-base font-medium">Type d'opération</Label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                      <div
                        className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                          loanType === 'loan'
                            ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                            : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                        }`}
                        onClick={() => setLoanType('loan')}
                      >
                        <div className="flex items-center space-x-3">
                          <div className={`w-4 h-4 rounded-full border-2 ${
                            loanType === 'loan' ? 'border-green-500 bg-green-500' : 'border-gray-300 dark:border-gray-600'
                          }`}>
                            {loanType === 'loan' && <div className="w-2 h-2 bg-white rounded-full mx-auto mt-0.5"></div>}
                          </div>
                          <div>
                            <h4 className="font-medium text-gray-900 dark:text-white">Emprunt à domicile</h4>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                              L'usager emporte le document chez lui
                            </p>
                          </div>
                        </div>
                      </div>

                      <div
                        className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                          loanType === 'reading_room'
                            ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                            : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                        }`}
                        onClick={() => setLoanType('reading_room')}
                      >
                        <div className="flex items-center space-x-3">
                          <div className={`w-4 h-4 rounded-full border-2 ${
                            loanType === 'reading_room' ? 'border-green-500 bg-green-500' : 'border-gray-300 dark:border-gray-600'
                          }`}>
                            {loanType === 'reading_room' && <div className="w-2 h-2 bg-white rounded-full mx-auto mt-0.5"></div>}
                          </div>
                          <div>
                            <h4 className="font-medium text-gray-900 dark:text-white">Lecture sur place</h4>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                              Consultation en salle de lecture uniquement
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {loanType === 'reading_room' ? (
                    /* Informations pour la lecture sur place */
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="consultation_date">Date de consultation</Label>
                        <Input
                          id="consultation_date"
                          type="date"
                          value={new Date().toISOString().split('T')[0]}
                          disabled
                        />
                      </div>
                      <div>
                        <Label htmlFor="reading_location">Lieu de consultation</Label>
                        <Select value={readingLocation} onValueChange={setReadingLocation}>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Sélectionner un lieu" />
                          </SelectTrigger>
                          <SelectContent className="z-50">
                            <SelectItem value="Salle de lecture principale">Salle de lecture principale</SelectItem>
                            <SelectItem value="Salle de recherche">Salle de recherche</SelectItem>
                            <SelectItem value="Salle des périodiques">Salle des périodiques</SelectItem>
                            <SelectItem value="Salle des thèses">Salle des thèses</SelectItem>
                            <SelectItem value="Bureau du bibliothécaire">Bureau du bibliothécaire</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  ) : (
                    /* Informations pour l'emprunt classique */
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <Label htmlFor="loan_date">Date d'emprunt</Label>
                      <Input
                        id="loan_date"
                        type="date"
                        value={new Date().toISOString().split('T')[0]}
                        disabled
                      />
                    </div>
                    <div>
                      <Label htmlFor="due_date">Date de retour prévue</Label>
                      <Input
                        id="due_date"
                        type="date"
                        value={dueDate}
                        onChange={(e) => setDueDate(e.target.value)}
                        min={new Date().toISOString().split('T')[0]}
                      />
                    </div>
                    <div className="flex items-end">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setDueDate(calculateDueDateCameroonSync(new Date(), defaultLoanDuration).toISOString().split('T')[0])}
                      >
                        Durée standard ({defaultLoanDuration} jours)
                      </Button>
                    </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Boutons d'action */}
              <div className="flex justify-end space-x-4">
                <Button type="button" variant="outline" asChild>
                  <Link href="/loans">Annuler</Link>
                </Button>
                <Button type="submit" disabled={isLoading || !selectedUser || (documentType === 'book' && selectedBooks.length === 0) || (documentType !== 'book' && selectedAcademicDocuments.length === 0)}>
                  {isLoading ? (
                    <div className="flex items-center space-x-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      <span>Enregistrement...</span>
                    </div>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      {loanType === 'reading_room' ? 'Enregistrer la consultation' : 'Enregistrer l\'emprunt'}
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
