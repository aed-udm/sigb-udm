"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion } from 'framer-motion';
import { ArrowLeft, Save, BookOpen } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { DarkModeButton } from "@/components/ui/dark-mode-button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FileUpload } from "@/components/ui/file-upload";
import { BilingualAbstract } from "@/components/forms/bilingual-abstract";
import { DocumentClassification } from "@/components/forms/document-classification";
import { safeKeywordsToArray, keywordsArrayToString } from "@/lib/utils/keywords-utils";
import { academicDomains, acquisitionModes, publishers, cameroonCities, bookCollections } from "@/data/cameroon-data";
import { useToast } from "@/hooks/use-toast";
import { bookSchema, type BookFormData as ZodBookFormData } from "@/lib/validations";
import ProtectedLayout from "@/components/layout/protected-layout";
import { Combobox } from "@/components/ui/combobox";
import { Badge } from "@/components/ui/badge";

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
  keywords_en?: string; // Text field in DB
  dewey_classification?: string;
  cdu_classification?: string;
  subject_headings?: string[];
  total_copies: number;
  available_copies: number;
  document_path?: string;
  file_type?: string;
  document_size?: number;
  digital_versions?: any;
  has_digital_version?: boolean;
  language?: string;
  format?: string;
  target_audience?: string;
  physical_location?: string;
  status?: string;
}

// Use Zod-derived type for consistency
type BookFormData = ZodBookFormData;

export default function EditBookPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const [book, setBook] = useState<Book | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [currentDocumentPath, setCurrentDocumentPath] = useState<string | null>(null);

  // États pour les métadonnées
  const [frenchKeywords, setFrenchKeywords] = useState<string[]>([]);
  const [englishKeywords, setEnglishKeywords] = useState<string[]>([]);
  const [deweyClassification, setDeweyClassification] = useState("");
  const [cduClassification, setCduClassification] = useState("");
  const [subjectHeadings, setSubjectHeadings] = useState<string[]>([]);

  // Données du formulaire
  const [formData, setFormData] = useState<Partial<BookFormData>>({
    mfn: "",
    isbn: "",
    title: "",
    subtitle: "",
    parallel_title: "",
    main_author: "",
    secondary_author: "",
    edition: "",
    publication_city: "",
    publisher: "",
    publication_year: new Date().getFullYear(),
    acquisition_mode: "Achat",
    price: 0,
    domain: "",
    collection: "",
    summary: "",
    abstract: "",
    keywords: [] as string[],
    total_copies: 1,
    available_copies: 1,
    document_path: "",
    file_type: "",
    document_size: 0,
  });

  useEffect(() => {
    const fetchBook = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/books/${params.id}`);

        if (!response.ok) {
          throw new Error('Livre non trouvé');
        }

        const data = await response.json();
        const bookData = data.data;
        setBook(bookData);
        
        // Initialiser le formulaire avec les données du livre
        setFormData({
          mfn: bookData.mfn || "",
          isbn: bookData.isbn || "",
          title: bookData.title || "",
          subtitle: bookData.subtitle || "",
          parallel_title: bookData.parallel_title || "",
          main_author: bookData.main_author || "",
          secondary_author: bookData.secondary_author || "",
          edition: bookData.edition || "",
          publication_city: bookData.publication_city || "",
          publisher: bookData.publisher || "",
          publication_year: bookData.publication_year || new Date().getFullYear(),
          acquisition_mode: bookData.acquisition_mode || "",
          price: bookData.price || 0,
          domain: bookData.domain || "",
          collection: bookData.collection || "",
          summary: bookData.summary || "",
          abstract: bookData.abstract || "",
          keywords: safeKeywordsToArray(bookData.keywords),
          keywords_en: typeof bookData.keywords_en === 'string' ? bookData.keywords_en : "",
          dewey_classification: bookData.dewey_classification || "",
          cdu_classification: bookData.cdu_classification || "",
          subject_headings: bookData.subject_headings || [],
          total_copies: bookData.total_copies || 1,
          available_copies: bookData.available_copies || 1,
          document_path: bookData.document_path || "",
          file_type: bookData.file_type || "",
          document_size: bookData.document_size || 0,
          // Champs SIGB
          language: bookData.language || "fr",
          format: bookData.format || "print",
          target_audience: bookData.target_audience || "general",
          physical_location: bookData.physical_location || "",
          status: bookData.status || "available",
        });

        // Charger les informations du fichier actuel
        setCurrentDocumentPath(bookData.document_path || null);

        // Initialiser les métadonnées avec gestion sécurisée
        setFrenchKeywords(safeKeywordsToArray(bookData.keywords));
        setEnglishKeywords(safeKeywordsToArray(bookData.keywords_en));
        setDeweyClassification(bookData.dewey_classification || "");
        setCduClassification(bookData.cdu_classification || "");
        setSubjectHeadings(bookData.subject_headings || []);

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
    };

    if (params.id) {
      fetchBook();
    }
  }, [params.id, toast]);

  const handleInputChange = (field: keyof BookFormData, value: any) => {
    setFormData((prev: Partial<BookFormData>) => ({
      ...prev,
      [field]: value
    }));
  };

  const uploadFile = async (bookId: string): Promise<any> => {
    if (!selectedFile) return null;

    const uploadFormData = new FormData();
    uploadFormData.append('file', selectedFile);
    uploadFormData.append('type', 'book');
    uploadFormData.append('id', bookId);
    uploadFormData.append('replaceExisting', 'true');
    if (currentDocumentPath) {
      uploadFormData.append('existingFilePath', currentDocumentPath);
    }

    const uploadResponse = await fetch('/api/upload', {
      method: 'POST',
      body: uploadFormData,
    });

    if (uploadResponse.ok) {
      return await uploadResponse.json();
    }
    throw new Error('Erreur lors de l\'upload du fichier');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      // Validation des mots-clés
      if (frenchKeywords.length === 0) {
        toast({
          title: "Mots-clés requis",
          description: "Au moins un mot-clé français est requis",
          variant: "destructive",
        });
        setSaving(false);
        return;
      }
      let finalFormData = {
        ...formData,
        // Métadonnées
        keywords: frenchKeywords, // Array pour les mots-clés français
        keywords_en: keywordsArrayToString(englishKeywords), // String pour les mots-clés anglais
        dewey_classification: deweyClassification,
        cdu_classification: cduClassification,
        subject_headings: subjectHeadings
      };

      // Upload du fichier si un nouveau fichier est sélectionné
      if (selectedFile) {
        try {
          const uploadResult = await uploadFile(params.id as string);
          finalFormData = {
            ...finalFormData,
            document_path: uploadResult.data.filePath,
            file_type: uploadResult.data.fileType,
            document_size: uploadResult.data.fileSize,
          };
          console.log('Nouveau fichier uploadé:', uploadResult.data.filePath);
        } catch (uploadError) {
          console.error('Erreur upload:', uploadError);
          toast({
            title: "Avertissement",
            description: "Erreur lors de l'upload du fichier, mais les autres modifications seront sauvegardées",
            variant: "destructive",
          });
        }
      }

      // Validation avec Zod
      const validatedData = bookSchema.parse(finalFormData);

      const response = await fetch(`/api/books/${params.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(validatedData),
      });

      if (response.ok) {
        toast({
          title: "Succès",
          description: "Livre mis à jour avec succès",
        });
        router.push(`/books/${params.id}`);
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || 'Erreur lors de la mise à jour');
      }

    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message || "Erreur lors de la mise à jour du livre",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
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
        <div className="container mx-auto px-4 py-8">
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
                  <Link href={`/books/${book.id}`}>
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
                      Modifier le Livre
                    </motion.h1>
                    <motion.p
                      className="text-sm sm:text-base text-gray-600 dark:text-gray-300 mt-1 font-medium"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.4, delay: 0.2 }}
                    >
                      Mettre à jour les informations du livre
                    </motion.p>
                  </div>
                </div>
              </div>

              <motion.div
                initial={{ opacity: 0, x: 30 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6, delay: 0.3 }}
              >
                <DarkModeButton asChild variant="outline" buttonType="nav">
                  <Link href={`/books/${book.id}`}>
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Annuler
                  </Link>
                </DarkModeButton>
              </motion.div>
            </div>
          </div>
        </motion.div>

        <div className="container mx-auto px-4 py-8">

        {/* Formulaire */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          <Card className="max-w-full mx-4 lg:mx-8">
            <CardHeader>
              <CardTitle>Informations du Livre</CardTitle>
              <CardDescription>
                Modifiez les informations du livre dans le catalogue
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Informations de base - Harmonisé avec création */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  <div>
                    <Label htmlFor="mfn">MFN (Numéro du fichier maître) *</Label>
                    <Input
                      id="mfn"
                      value={formData.mfn}
                      onChange={(e) => handleInputChange("mfn", e.target.value)}
                      placeholder="Ex: MFN001"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="isbn">ISBN</Label>
                    <Input
                      id="isbn"
                      value={formData.isbn}
                      onChange={(e) => handleInputChange("isbn", e.target.value)}
                      placeholder="Ex: 978-2-1234-5678-9"
                    />
                  </div>
                  <div>
                    <Combobox
                      label="Domaine académique"
                      placeholder="Sélectionner ou saisir un domaine..."
                      value={formData.domain || ""}
                      onValueChange={(value) => handleInputChange("domain", value)}
                      options={academicDomains}
                      allowCustom={true}
                      required={true}
                    />
                  </div>
                </div>

                <div className="space-y-6">
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-white border-b border-gray-200 dark:border-gray-700 pb-3">
                    Informations Bibliographiques
                  </h3>

                  <div>
                    <Label htmlFor="title" className="text-base font-medium">Titre *</Label>
                    <Input
                      id="title"
                      value={formData.title}
                      onChange={(e) => handleInputChange("title", e.target.value)}
                      placeholder="Titre du livre"
                      className="h-12 text-base"
                      required
                    />
                  </div>
                </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div>
                      <Label htmlFor="subtitle" className="text-base font-medium">Sous-titre</Label>
                      <Input
                        id="subtitle"
                        value={formData.subtitle}
                        onChange={(e) => handleInputChange("subtitle", e.target.value)}
                        placeholder="Sous-titre du livre"
                        className="h-12 text-base"
                      />
                    </div>
                    <div>
                      <Label htmlFor="parallel_title" className="text-base font-medium">Titre parallèle</Label>
                      <Input
                        id="parallel_title"
                        value={formData.parallel_title}
                        onChange={(e) => handleInputChange("parallel_title", e.target.value)}
                        placeholder="Titre dans une autre langue"
                        className="h-12 text-base"
                      />
                    </div>
                  </div>

                {/* Auteurs */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div>
                    <Label htmlFor="main_author">Auteur principal *</Label>
                    <Input
                      id="main_author"
                      value={formData.main_author}
                      onChange={(e) => handleInputChange("main_author", e.target.value)}
                      placeholder="Nom de l'auteur principal"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="secondary_author">Auteur secondaire</Label>
                    <Input
                      id="secondary_author"
                      value={formData.secondary_author}
                      onChange={(e) => handleInputChange("secondary_author", e.target.value)}
                      placeholder="Nom de l'auteur secondaire"
                    />
                  </div>
                </div>

                {/* Publication */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <Combobox
                      label="Éditeur"
                      placeholder="Sélectionner ou saisir un éditeur..."
                      value={formData.publisher || ""}
                      onValueChange={(value) => handleInputChange("publisher", value)}
                      options={publishers}
                      allowCustom={true}
                      required={true}
                    />
                  </div>
                  <div>
                    <Combobox
                      label="Ville d'édition"
                      placeholder="Sélectionner ou saisir une ville..."
                      value={formData.publication_city || ""}
                      onValueChange={(value) => handleInputChange("publication_city", value)}
                      options={cameroonCities}
                      allowCustom={true}
                      required={true}
                    />
                  </div>
                  <div>
                    <Label htmlFor="publication_year">Année d'édition</Label>
                    <Input
                      id="publication_year"
                      type="number"
                      value={formData.publication_year}
                      onChange={(e) => handleInputChange("publication_year", parseInt(e.target.value))}
                      min="1000"
                      max={new Date().getFullYear()}
                      placeholder="Année"
                    />
                  </div>
                </div>



                {/* Autres informations */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                  <div>
                    <Label htmlFor="edition">Édition</Label>
                    <Input
                      id="edition"
                      value={formData.edition}
                      onChange={(e) => handleInputChange("edition", e.target.value)}
                      placeholder="Ex: 1ère édition"
                    />
                  </div>
                  <div>
                    <Combobox
                      label="Mode d'acquisition"
                      placeholder="Sélectionner ou saisir un mode..."
                      value={formData.acquisition_mode || ""}
                      onValueChange={(value) => handleInputChange("acquisition_mode", value)}
                      options={acquisitionModes}
                      allowCustom={true}
                      required={true}
                    />
                  </div>
                  <div>
                    <Combobox
                      label="Collection"
                      placeholder="Sélectionner ou saisir une collection..."
                      value={formData.collection || ""}
                      onValueChange={(value) => handleInputChange("collection", value)}
                      options={bookCollections}
                      allowCustom={true}
                      required={false}
                    />
                  </div>
                  <div>
                    <Label htmlFor="price">Prix (FCFA)</Label>
                    <Input
                      id="price"
                      type="number"
                      step="0.01"
                      value={formData.price}
                      onChange={(e) => handleInputChange("price", parseFloat(e.target.value))}
                      min="0"
                      placeholder="Prix en FCFA"
                    />
                  </div>
                </div>

                {/* Copies */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <div>
                    <Label htmlFor="total_copies">Nombre total d'exemplaires *</Label>
                    <Input
                      id="total_copies"
                      type="number"
                      value={formData.total_copies}
                      onChange={(e) => {
                        const total = parseInt(e.target.value);
                        handleInputChange("total_copies", total);
                        handleInputChange("available_copies", total);
                      }}
                      min="1"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="available_copies">Exemplaires disponibles *</Label>
                    <Input
                      id="available_copies"
                      type="number"
                      value={formData.available_copies}
                      onChange={(e) => handleInputChange("available_copies", parseInt(e.target.value))}
                      min="0"
                      max={formData.total_copies}
                      required
                    />
                  </div>
                </div>

                {/* Informations SIGB */}
                <div className="space-y-6">
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-white border-b border-gray-200 dark:border-gray-700 pb-3">
                    Informations SIGB
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <div>
                      <Combobox
                        label="Langue"
                        placeholder="Sélectionner une langue..."
                        value={formData.language || ""}
                        onValueChange={(value) => handleInputChange("language", value)}
                        options={[
                          { value: "fr", label: "Français" },
                          { value: "en", label: "Anglais" },
                          { value: "es", label: "Espagnol" },
                          { value: "de", label: "Allemand" },
                          { value: "ar", label: "Arabe" },
                          { value: "other", label: "Autre" }
                        ]}
                        allowCustom={false}
                        required={true}
                      />
                    </div>

                    <div>
                      <Combobox
                        label="Format"
                        placeholder="Sélectionner un format..."
                        value={formData.format || ""}
                        onValueChange={(value) => handleInputChange("format", value)}
                        options={[
                          { value: "print", label: "Imprimé" },
                          { value: "digital", label: "Numérique" },
                          { value: "ebook", label: "E-book" },
                          { value: "audiobook", label: "Livre audio" },
                          { value: "hardcover", label: "Relié" },
                          { value: "paperback", label: "Broché" },
                          { value: "pocket", label: "Format poche" },
                          { value: "large_print", label: "Gros caractères" },
                          { value: "braille", label: "Braille" },
                          { value: "multimedia", label: "Multimédia" }
                        ]}
                        allowCustom={false}
                        required={true}
                      />
                    </div>

                    <div>
                      <Combobox
                        label="Public cible"
                        placeholder="Sélectionner un public..."
                        value={formData.target_audience || ""}
                        onValueChange={(value) => handleInputChange("target_audience", value)}
                        options={[
                          { value: "general", label: "Grand public" },
                          { value: "beginner", label: "Débutant" },
                          { value: "intermediate", label: "Intermédiaire" },
                          { value: "advanced", label: "Avancé" },
                          { value: "children", label: "Enfants" },
                          { value: "young_adult", label: "Jeunes adultes" },
                          { value: "adult", label: "Adultes" },
                          { value: "professional", label: "Professionnels" },
                          { value: "academic", label: "Académique" },
                          { value: "researcher", label: "Chercheurs" }
                        ]}
                        allowCustom={false}
                        required={true}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-6">
                    <div>
                      <Label htmlFor="physical_location">Localisation physique</Label>
                      <Input
                        id="physical_location"
                        value={formData.physical_location || ""}
                        onChange={(e) => handleInputChange("physical_location", e.target.value)}
                        placeholder="Ex: Salle de lecture, Rayon A, Étage 2"
                      />
                    </div>
                  </div>
                </div>

                {/* Résumés bilingues */}
                <BilingualAbstract
                  summaryFr={formData.summary || ""}
                  summaryEn={formData.abstract || ""}
                  onSummaryFrChange={(value) => handleInputChange("summary", value)}
                  onSummaryEnChange={(value) => handleInputChange("abstract", value)}
                  required={true}
                  minLength={100}
                  showCamesValidation={false}
                />

                {/* Mots-clés bilingues */}
                <div className="space-y-4">
                  <h4 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Mots-clés <span className="text-red-500">*</span>
                  </h4>

                  {/* Mots-clés français */}
                  <div>
                    <Label htmlFor="keywords-fr">Mots-clés français (minimum 3)</Label>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {frenchKeywords.map((keyword: string, index: number) => (
                        <Badge key={index} variant="secondary" className="flex items-center gap-1 bg-green-100 text-green-800 border-green-300 dark:bg-green-800 dark:text-green-100 dark:border-green-600">
                          {keyword}
                          <button
                            type="button"
                            onClick={() => setFrenchKeywords(frenchKeywords.filter((_: string, i: number) => i !== index))}
                            className="ml-1 text-red-500 hover:text-red-700"
                          >
                            ×
                          </button>
                        </Badge>
                      ))}
                    </div>
                    <div className="flex gap-2 mt-2">
                      <Input
                        placeholder="Ajouter un mot-clé français..."
                        onKeyPress={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            const value = e.currentTarget.value.trim();
                            if (value && !frenchKeywords.includes(value)) {
                              setFrenchKeywords([...frenchKeywords, value]);
                              e.currentTarget.value = '';
                            }
                          }
                        }}
                      />
                    </div>
                    {frenchKeywords.length === 0 && (
                      <p className="text-sm text-red-600 mt-1">
                        Au moins un mot-clé français est requis
                      </p>
                    )}
                  </div>

                  {/* Mots-clés anglais */}
                  <div>
                    <Label htmlFor="keywords-en">Mots-clés anglais (minimum 3)</Label>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {englishKeywords.map((keyword: string, index: number) => (
                        <Badge key={index} variant="secondary" className="flex items-center gap-1 bg-gray-100 text-gray-800 border-gray-300 dark:bg-gray-800 dark:text-gray-100 dark:border-gray-600">
                          {keyword}
                          <button
                            type="button"
                            onClick={() => setEnglishKeywords(englishKeywords.filter((_: string, i: number) => i !== index))}
                            className="ml-1 text-red-500 hover:text-red-700"
                          >
                            ×
                          </button>
                        </Badge>
                      ))}
                    </div>
                    <div className="flex gap-2 mt-2">
                      <Input
                        placeholder="Ajouter un mot-clé anglais..."
                        onKeyPress={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            const value = e.currentTarget.value.trim();
                            if (value && !englishKeywords.includes(value)) {
                              setEnglishKeywords([...englishKeywords, value]);
                              e.currentTarget.value = '';
                            }
                          }
                        }}
                      />
                    </div>
                    {englishKeywords.length === 0 && (
                      <p className="text-sm text-orange-600 mt-1">
                        Mots-clés anglais recommandés pour une meilleure visibilité
                      </p>
                    )}
                  </div>
                </div>

                {/* Classification documentaire */}
                <DocumentClassification
                  deweyClassification={deweyClassification}
                  cduClassification={cduClassification}
                  subjectHeadings={subjectHeadings}
                  onDeweyChange={setDeweyClassification}
                  onCduChange={setCduClassification}
                  onSubjectHeadingsChange={setSubjectHeadings}
                />

                {/* Upload du document */}
                <FileUpload
                  label="Document numérique du livre (PDF)"
                  onFileSelect={setSelectedFile}
                  selectedFile={selectedFile}
                  accept=".pdf"
                  required={false}
                />

                {/* Affichage du fichier actuel */}
                {currentDocumentPath && !selectedFile && (
                  <div className="p-3 bg-green-50 dark:bg-green-800/90 border border-green-200 dark:border-green-800 rounded-lg">
                    <p className="text-sm text-green-800 dark:text-green-200">
                      <strong>Fichier actuel :</strong> {currentDocumentPath.split('/').pop()}
                    </p>
                  </div>
                )}


                {/* Boutons */}
                <div className="flex justify-end space-x-4 pt-6">
                  <DarkModeButton asChild variant="outline" buttonType="nav">
                    <Link href={`/books/${book.id}`}>
                      Annuler
                    </Link>
                  </DarkModeButton>
                  <Button type="submit" disabled={saving} className="bg-green-600 hover:bg-green-700 text-white">
                    {saving ? (
                      <>
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                          className="mr-2"
                        >
                          <Save className="h-4 w-4" />
                        </motion.div>
                        Enregistrement...
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4 mr-2" />
                        Enregistrer les modifications
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </motion.div>
        </div>
      </div>
    </ProtectedLayout>
  );
}
