"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from 'framer-motion';
import { BookOpen, Save, ArrowLeft, Plus, X, Search } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Combobox } from "@/components/ui/combobox";
import { Badge } from "@/components/ui/badge";
import ProtectedLayout from "@/components/layout/protected-layout";
import { useToast } from "@/hooks/use-toast";
import { bookSchema, type BookFormData as ZodBookFormData } from "@/lib/validations";
import { academicDomains, publishers, cameroonCities, acquisitionModes, bookCollections } from "@/data/cameroon-data";
import { keywordsArrayToString, safeKeywordsToArray } from "@/lib/utils/keywords-utils";
import { FileUpload } from "@/components/ui/file-upload";
import { BilingualAbstract } from "@/components/forms/bilingual-abstract";
import { DocumentClassification } from "@/components/forms/document-classification";

export default function NewBookPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadedFileInfo, setUploadedFileInfo] = useState<any>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [showSearchResults, setShowSearchResults] = useState(false);

  // États pour les métadonnées de base
  const [frenchKeywords, setFrenchKeywords] = useState<string[]>([]);
  const [englishKeywords, setEnglishKeywords] = useState<string[]>([]);
  const [deweyClassification, setDeweyClassification] = useState("");
  const [cduClassification, setCduClassification] = useState("");
  const [subjectHeadings, setSubjectHeadings] = useState<string[]>([]);

  const [formData, setFormData] = useState<Partial<ZodBookFormData>>({
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
    acquisition_mode: "",
    price: 0,
    domain: "",
    collection: "",
    summary: "",
    abstract: "",
    keywords: [],
    total_copies: 1,
    available_copies: 1,
    document_path: "",
    file_type: "",
    document_size: 0,
    // Nouveaux champs pour les filtres avancés
    language: "fr",
    format: "print",
    target_audience: "general",
    physical_location: "",
    status: "available",
  });

  const handleInputChange = (field: keyof ZodBookFormData, value: any) => {
    setFormData((prev: Partial<ZodBookFormData>) => ({
      ...prev,
      [field]: value
    }));
  };

  // Fonction de recherche Z39.50
  const searchZ3950 = async (query: string, type: 'isbn' | 'title' | 'author' = 'title') => {
    if (!query.trim()) return;
    
    setIsSearching(true);
    setShowSearchResults(false);
    
    try {
      const response = await fetch(`/api/z3950/search?query=${encodeURIComponent(query)}&type=${type}&server=BNF_API`);
      const data = await response.json();
      
      if (data.success && data.results?.books) {
        setSearchResults(data.results.books);
        setShowSearchResults(true);
        toast({
          title: "Recherche terminée",
          description: `${data.results.books.length} résultat(s) trouvé(s)`,
        });
      } else {
        setSearchResults([]);
        toast({
          title: "Aucun résultat",
          description: "Aucun livre trouvé pour cette recherche",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Erreur recherche Z39.50:', error);
      toast({
        title: "Erreur de recherche",
        description: "Impossible de rechercher dans les catalogues externes",
        variant: "destructive",
      });
    } finally {
      setIsSearching(false);
    }
  };

  // Fonction pour importer les données d'un livre trouvé
  const importBookData = (book: any) => {
    setFormData((prev: Partial<ZodBookFormData>) => ({
      ...prev,
      title: book.title || prev.title,
      main_author: book.main_author || prev.main_author,
      isbn: book.isbn || prev.isbn,
      publisher: book.publisher || prev.publisher,
      publication_year: book.publication_year || prev.publication_year,
      publication_city: book.publication_city || prev.publication_city,
      summary: book.summary || prev.summary,
    }));
    
    setShowSearchResults(false);
    toast({
      title: "Données importées",
      description: `Les informations de "${book.title}" ont été importées`,
    });
  };



  const uploadFile = async (bookId: string): Promise<any> => {
    if (!selectedFile) return null;

    const uploadFormData = new FormData();
    uploadFormData.append('file', selectedFile);
    uploadFormData.append('type', 'book');
    uploadFormData.append('id', bookId);

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
    setIsLoading(true);

    try {
      // Validation de base des mots-clés
      if (frenchKeywords.length === 0) {
        toast({
          title: "Mots-clés requis",
          description: "Au moins un mot-clé français est requis",
          variant: "destructive",
        });
        setIsLoading(false);
        return;
      }
      // Préparer les données avec les métadonnées de base
      const dataWithMetadata = {
        ...formData,
        // Métadonnées de base
        keywords: frenchKeywords, // Array pour les mots-clés français
        keywords_en: keywordsArrayToString(englishKeywords), // String pour les mots-clés anglais
        dewey_classification: deweyClassification,
        cdu_classification: cduClassification,
        subject_headings: subjectHeadings
      };

      // Validation avec Zod
      const validatedData = bookSchema.parse(dataWithMetadata);

      // Envoi à l'API pour créer le livre
      const response = await fetch('/api/books', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(validatedData),
      });

      if (response.ok) {
        const data = await response.json();
        const bookId = data.data.id;

        // Upload du fichier si présent
        if (selectedFile) {
          try {
            const uploadResult = await uploadFile(bookId);
            setUploadedFileInfo(uploadResult.data);

            // Mettre à jour le livre avec les informations du fichier
            await fetch(`/api/books/${bookId}`, {
              method: 'PUT',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                ...validatedData,
                document_path: uploadResult.data.filePath,
                file_type: uploadResult.data.fileType,
                document_size: uploadResult.data.fileSize,
              }),
            });

            console.log('Fichier uploadé et sauvegardé:', uploadResult.data.filePath);
          } catch (uploadError) {
            console.error('Erreur upload:', uploadError);
            toast({
              title: "Avertissement",
              description: "Livre créé mais erreur lors de l'upload du fichier",
              variant: "destructive",
            });
          }
        }

        toast({
          title: "Livre ajouté avec succès",
          description: `"${validatedData.title}" a été ajouté au catalogue`,
        });
        router.push("/books");
      } else {
        const errorData = await response.json();
        toast({
          title: "Erreur",
          description: errorData.error?.message || "Erreur lors de l'ajout du livre",
          variant: "destructive",
        });
      }

    } catch (error: any) {
      if (error.name === 'ZodError') {
        toast({
          title: "Erreur de validation",
          description: error.errors?.[0]?.message || "Veuillez vérifier les données saisies",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Erreur",
          description: "Erreur lors de l'ajout du livre",
          variant: "destructive",
        });
      }
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
                      Ajouter un Livre
                    </motion.h1>
                    <motion.p
                      className="text-sm sm:text-base text-gray-600 dark:text-gray-300 mt-1 font-medium"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.4, delay: 0.2 }}
                    >
                      Cataloguer un nouveau livre dans la bibliothèque
                    </motion.p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        <div className="container mx-auto px-3 sm:px-4 md:px-6 py-4 sm:py-6 md:py-7 lg:py-8">
          <motion.div
            initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.5 }}
          >
            <Card className="max-w-full mx-4 lg:mx-8">
              <CardHeader className="pb-8">
                <CardTitle className="text-2xl">Informations du Livre</CardTitle>
                <CardDescription className="text-base">
                  Remplissez tous les champs requis pour ajouter le livre au catalogue
                </CardDescription>
              </CardHeader>
              <CardContent className="px-6 lg:px-12 pb-8">
                <form onSubmit={handleSubmit} className="space-y-8">
                  {/* Informations de base */}
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

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
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
                            { value: "it", label: "Italien" },
                            { value: "pt", label: "Portugais" },
                            { value: "ar", label: "Arabe" },
                            { value: "zh", label: "Chinois" },
                            { value: "ja", label: "Japonais" },
                            { value: "ru", label: "Russe" },
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
                            { value: "ebook", label: "Livre électronique" },
                            { value: "audiobook", label: "Livre audio" },
                            { value: "hardcover", label: "Relié" },
                            { value: "paperback", label: "Broché" },
                            { value: "pocket", label: "Poche" },
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
                            { value: "professional", label: "Professionnel" },
                            { value: "academic", label: "Académique" },
                            { value: "researcher", label: "Chercheurs" }
                          ]}
                          allowCustom={false}
                          required={true}
                        />
                      </div>

                      <div>
                        <Label htmlFor="physical_location">Localisation physique</Label>
                        <Input
                          id="physical_location"
                          value={formData.physical_location}
                          onChange={(e) => handleInputChange("physical_location", e.target.value)}
                          placeholder="Ex: Rayon A, Section 1"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Section Contenu et Description */}
                  <div className="space-y-6">
                    <h3 className="text-xl font-semibold text-gray-900 dark:text-white border-b border-gray-200 dark:border-gray-700 pb-3">
                      Contenu et Description
                    </h3>

                    {/* Résumés bilingues */}
                    <BilingualAbstract
                      summaryFr={formData.summary || ""}
                      summaryEn={formData.abstract || ""}
                      onSummaryFrChange={(value) => handleInputChange("summary", value)}
                      onSummaryEnChange={(value) => handleInputChange("abstract", value)}
                      required={false}
                      minLength={50}
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
                          {frenchKeywords.map((keyword, index) => (
                            <Badge key={index} className="flex items-center gap-1 bg-green-100 text-green-800 border-green-300 dark:bg-green-800 dark:text-green-100 dark:border-green-600">
                              {keyword}
                              <button
                                type="button"
                                onClick={() => setFrenchKeywords(frenchKeywords.filter((_, i) => i !== index))}
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
                          {englishKeywords.map((keyword, index) => (
                            <Badge key={index} className="flex items-center gap-1 bg-gray-100 text-gray-800 border-gray-300 dark:bg-gray-800 dark:text-gray-100 dark:border-gray-600">
                              {keyword}
                              <button
                                type="button"
                                onClick={() => setEnglishKeywords(englishKeywords.filter((_, i) => i !== index))}
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
                  </div>

                  {/* Upload du document */}
                  <div className="space-y-6">
                    <h3 className="text-xl font-semibold text-gray-900 dark:text-white border-b border-gray-200 dark:border-gray-700 pb-3">
                      Document Numérique
                    </h3>

                    <FileUpload
                      label="Document numérique du livre (PDF)"
                      onFileSelect={setSelectedFile}
                      selectedFile={selectedFile}
                      accept=".pdf"
                      required={false}
                    />
                  </div>


                  {/* Boutons d'action */}
                  <div className="flex justify-between items-center pt-6">
                    <Button type="button" variant="outline" asChild>
                      <Link href="/books">Annuler</Link>
                    </Button>
                    <Button type="submit" disabled={isLoading}>
                      {isLoading ? (
                        <div className="flex items-center space-x-2">
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                          <span>Ajout en cours...</span>
                        </div>
                      ) : (
                        <>
                          <Save className="h-4 w-4 mr-2" />
                          Ajouter le livre
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
