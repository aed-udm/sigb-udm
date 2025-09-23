"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion } from 'framer-motion';
import { FileText, Save, ArrowLeft, Plus, X, GraduationCap, Briefcase, BookOpen, Download, FileDown } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Combobox } from "@/components/ui/combobox";
import ProtectedLayout from "@/components/layout/protected-layout";
import { useToast } from "@/hooks/use-toast";
import { thesisSchema, type ThesisFormData as ZodThesisFormData } from "@/lib/validations";
import { FileUpload } from "@/components/ui/file-upload";
import { BilingualAbstract } from "@/components/forms/bilingual-abstract";
import { DocumentClassification } from "@/components/forms/document-classification";
import { PDFAValidator } from "@/components/forms/pdfa-validator";
import { safeKeywordsToArray, keywordsArrayToString, addKeywordSafely } from "@/lib/utils/keywords-utils";

// Use Zod-derived type for consistency
type ThesisFormData = ZodThesisFormData;

export default function NewThesisPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [keywords, setKeywords] = useState<string[]>([]);
  const [keywordsEn, setKeywordsEn] = useState<string[]>([]);
  const [newKeyword, setNewKeyword] = useState("");
  const [newKeywordEn, setNewKeywordEn] = useState("");
  const [documentType, setDocumentType] = useState<'these' | 'memoire' | 'rapport_stage'>('these');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadedFileInfo, setUploadedFileInfo] = useState<any>(null);

  // États pour les données de référence depuis la base de données
  const [specialties, setSpecialties] = useState<string[]>([]);
  const [degrees, setDegrees] = useState<string[]>([]);
  const [universities, setUniversities] = useState<string[]>([]);
  const [faculties, setFaculties] = useState<string[]>([]);
  const [loadingReferenceData, setLoadingReferenceData] = useState(true);

  // Fonction pour réinitialiser le formulaire selon le type de document
  const getInitialFormData = useCallback((docType: 'these' | 'memoire' | 'rapport_stage') => {
    const baseData = {
      main_author: "",
      director: "",
      co_director: "",
      title: "",
      target_degree: "",
      specialty: "",
      defense_year: new Date().getFullYear(),
      academic_year: `${new Date().getFullYear()}-${new Date().getFullYear() + 1}`,
      defense_date: "",
      pagination: "",
      summary: "",
      keywords: [],
      abstract: "",
      keywords_en: [],
      university: "Université des Montagnes",
      faculty: "",
      department: "",
      // Champs spécifiques aux mémoires
      co_supervisor: "",
      methodology: "",
      conclusion: "",
      grade: undefined,
      mention: undefined,
      // Champs spécifiques aux rapports de stage
      objectives: "",
      tasks_performed: "",
      skills_acquired: "",
      recommendations: "",
      company_name: "",
      company_address: "",
      company_sector: "",
      company_supervisor: "",
      student_id: "",
      stage_type: "Application" as const,
      // Champs de document
      document_path: "",
      file_type: "",
      document_size: 0,
      // Nouveaux champs pour les filtres avancés
      language: "fr" as const,
      institution: "Université des Montagnes",
      country: "Cameroun",
      access_rights: "open" as const,
      license: "CC-BY" as const,
      format: "print" as const,

      physical_location: "",
      status: "available" as const,
    };
    return baseData;
  }, []);

  const [formData, setFormData] = useState<Partial<ThesisFormData>>(getInitialFormData(documentType));

  // États pour la classification documentaire
  const [deweyClassification, setDeweyClassification] = useState("");
  const [cduClassification, setCduClassification] = useState("");
  const [subjectHeadings, setSubjectHeadings] = useState<string[]>([]);

  // Charger les données de référence depuis la base de données
  useEffect(() => {
    const loadReferenceData = async () => {
      try {
        setLoadingReferenceData(true);

        const [specialtiesRes, degreesRes, universitiesRes, facultiesRes] = await Promise.all([
          fetch('/api/reference-data/specialties'),
          fetch('/api/reference-data/degrees'),
          fetch('/api/reference-data/universities'),
          fetch('/api/reference-data/faculties')
        ]);

        if (specialtiesRes.ok) {
          const specialtiesData = await specialtiesRes.json();
          setSpecialties(specialtiesData.data || []);
        }

        if (degreesRes.ok) {
          const degreesData = await degreesRes.json();
          setDegrees(degreesData.data || []);
        }

        if (universitiesRes.ok) {
          const universitiesData = await universitiesRes.json();
          setUniversities(universitiesData.data || []);
        }

        if (facultiesRes.ok) {
          const facultiesData = await facultiesRes.json();
          setFaculties(facultiesData.data || []);
        }

      } catch (error) {
        console.error('Erreur lors du chargement des données de référence:', error);
        toast({
          title: "Avertissement",
          description: "Impossible de charger certaines données de référence",
          variant: "destructive",
        });
      } finally {
        setLoadingReferenceData(false);
      }
    };

    loadReferenceData();
  }, [toast]);

  const handleInputChange = (field: keyof ThesisFormData, value: any) => {
    setFormData((prev: Partial<ThesisFormData>) => ({
      ...prev,
      [field]: value
    }));
  };

  const handleFrenchKeywordAdd = () => {
    if (newKeyword.trim()) {
      const result = addKeywordSafely(keywords, newKeyword.trim());
      if (result.success) {
        setKeywords(result.keywords);
        handleInputChange("keywords", result.keywords);
        setNewKeyword("");
      }
    }
  };

  const handleFrenchKeywordRemove = (keyword: string) => {
    const updatedKeywords = keywords.filter(k => k !== keyword);
    setKeywords(updatedKeywords);
    handleInputChange("keywords", updatedKeywords);
  };

  const handleEnglishKeywordAdd = () => {
    if (newKeywordEn.trim()) {
      const result = addKeywordSafely(keywordsEn, newKeywordEn.trim());
      if (result.success) {
        setKeywordsEn(result.keywords);
        handleInputChange("keywords_en", keywordsArrayToString(result.keywords));
        setNewKeywordEn("");
      }
    }
  };

  const handleEnglishKeywordRemove = (keyword: string) => {
    const updatedKeywords = keywordsEn.filter(k => k !== keyword);
    setKeywordsEn(updatedKeywords);
    handleInputChange("keywords_en", keywordsArrayToString(updatedKeywords));
  };

  const addKeyword = (type: 'fr' | 'en') => {
    if (type === 'fr') {
      handleFrenchKeywordAdd();
    } else {
      handleEnglishKeywordAdd();
    }
  };

  const removeKeyword = (keyword: string, type: 'fr' | 'en') => {
    if (type === 'fr') {
      handleFrenchKeywordRemove(keyword);
    } else {
      handleEnglishKeywordRemove(keyword);
    }
  };

  const uploadFile = async (documentId: string): Promise<any> => {
    if (!selectedFile) return null;

    const uploadFormData = new FormData();
    uploadFormData.append('file', selectedFile);
    uploadFormData.append('type', documentType);
    uploadFormData.append('id', documentId);
    uploadFormData.append('replaceExisting', 'false');

    const uploadResponse = await fetch('/api/upload', {
      method: 'POST',
      body: uploadFormData,
    });

    if (uploadResponse.ok) {
      return await uploadResponse.json();
    }
    throw new Error('Erreur lors de l\'upload du fichier');
  };

  // Fonction utilitaire pour extraire le code numérique de la classification Dewey
  const extractDeweyCode = (classification: string): string => {
    if (!classification) return '';
    // Si c'est déjà un code numérique pur, le retourner tel quel
    if (/^\d{3}(\.\d+)?$/.test(classification)) {
      return classification;
    }
    // Sinon, extraire le code de "330 - Économie" -> "330"
    const match = classification.match(/^(\d{3}(?:\.\d+)?)/);
    return match ? match[1] : classification;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // Validation des mots-clés
      if (keywords.length < 3) {
        toast({
          title: "Erreur de validation",
          description: "Au moins 3 mots-clés français sont requis",
          variant: "destructive",
        });
        setIsLoading(false);
        return;
      }

      if (keywordsEn.length < 3) {
        toast({
          title: "Erreur de validation",
          description: "Au moins 3 mots-clés anglais sont requis",
          variant: "destructive",
        });
        setIsLoading(false);
        return;
      }

      const documentData = {
        ...formData,
        document_type: documentType,
        author: formData.main_author,
        supervisor: formData.director,
        co_supervisor: formData.co_director,
        degree: formData.target_degree,
        year: formData.defense_year,
        keywords,
        keywords_en: keywordsEn,
        dewey_classification: extractDeweyCode(deweyClassification),
        cdu_classification: cduClassification,
        subject_headings: subjectHeadings,
      };

      // Envoi à l'API unifiée
      const response = await fetch('/api/academic-documents', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(documentData),
      });

      if (response.ok) {
        const data = await response.json();
        const documentId = data.data.id;

        // Upload du fichier si présent
        if (selectedFile) {
          try {
            const uploadResult = await uploadFile(documentId);
            setUploadedFileInfo(uploadResult.data);

            await fetch(`/api/academic-documents/${documentId}`, {
              method: 'PUT',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                ...documentData,
                document_path: uploadResult.data.filePath,
                file_type: uploadResult.data.fileType,
                document_size: uploadResult.data.fileSize,
              }),
            });
          } catch (uploadError) {
            console.error('Erreur upload:', uploadError);
            toast({
              title: "Avertissement",
              description: "Document créé mais erreur lors de l'upload du fichier",
              variant: "destructive",
            });
          }
        }

        const docTypeLabel = documentType === 'these' ? 'Thèse' :
                           documentType === 'memoire' ? 'Mémoire' : 'Rapport de stage';
        toast({
          title: `${docTypeLabel} ajouté${documentType === 'these' ? 'e' : ''} avec succès`,
          description: `"${formData.title}" a été ajouté${documentType === 'these' ? 'e' : ''} à l'archive`,
        });

        // Redirection contextuelle selon le type de document
        switch (documentType) {
          case 'these':
            router.push('/theses');
            break;
          case 'memoire':
            router.push('/theses?type=memoire');
            break;
          case 'rapport_stage':
            router.push('/theses?type=rapport_stage');
            break;
          default:
            router.push('/theses');
        }

      } else {
        const errorData = await response.json();
        toast({
          title: "Erreur",
          description: errorData.error?.message || "Erreur lors de l'ajout du document",
          variant: "destructive",
        });
      }

    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message || "Erreur lors de l'ajout du document",
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
                    <GraduationCap className="h-6 w-6 sm:h-8 sm:w-8 text-green-600 drop-shadow-lg" />
                  </motion.div>
                  <div>
                    <motion.h1
                      className="text-xl sm:text-2xl md:text-3xl font-bold bg-gradient-to-r from-slate-800 via-green-600 to-slate-800 dark:from-slate-200 dark:via-green-400 dark:to-slate-200 bg-clip-text text-transparent"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.4, delay: 0.1 }}
                    >
                      Ajouter un Document Académique
                    </motion.h1>
                    <motion.p
                      className="text-sm sm:text-base text-gray-600 dark:text-gray-300 mt-1 font-medium"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.4, delay: 0.2 }}
                    >
                      Archiver une nouvelle thèse, mémoire ou rapport de stage
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
                <CardTitle className="text-2xl">Informations du Document Académique</CardTitle>
                <CardDescription className="text-base">
                  Remplissez tous les champs requis pour archiver le document
                </CardDescription>
              </CardHeader>
              <CardContent className="px-6 lg:px-12 pb-8">
                <form onSubmit={handleSubmit} className="space-y-8">
                  {/* Sélecteur de type de document */}
                  <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
                    <Label htmlFor="documentType">Type de document <span className="text-red-500">*</span></Label>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-3">
                      {[
                        { value: 'these', label: 'Thèse', icon: GraduationCap, color: 'blue' },
                        { value: 'memoire', label: 'Mémoire', icon: FileText, color: 'green' },
                        { value: 'rapport_stage', label: 'Rapport de stage', icon: Briefcase, color: 'gray' }
                      ].map((type) => (
                        <div
                          key={type.value}
                          onClick={() => {
                            const newDocType = type.value as 'these' | 'memoire' | 'rapport_stage';
                            setDocumentType(newDocType);
                            // Réinitialiser complètement le formulaire avec les données par défaut du nouveau type
                            setFormData(getInitialFormData(newDocType));
                            // Réinitialiser aussi les autres états
                            setKeywords([]);
                            setKeywordsEn([]);
                            setSelectedFile(null);
                            setUploadedFileInfo(null);
                            setDeweyClassification("");
                            setCduClassification("");
                            setSubjectHeadings([]);
                          }}
                          className={`cursor-pointer p-4 rounded-lg border-2 transition-all ${
                            documentType === type.value
                              ? type.color === 'blue' ? 'border-green-500 bg-green-600 dark:bg-green-500 shadow-md' :
                                type.color === 'green' ? 'border-green-500 bg-green-600 dark:bg-green-500 shadow-md' :
                                'border-gray-500 bg-gray-600 dark:bg-gray-500 shadow-md'
                              : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500 bg-white dark:bg-gray-800'
                          }`}
                        >
                          <div className="flex items-center space-x-3">
                            <type.icon className={`h-6 w-6 ${
                              documentType === type.value
                                ? 'text-white'
                                : type.color === 'blue' ? 'text-green-600 dark:text-green-400' :
                                  type.color === 'green' ? 'text-green-600 dark:text-green-400' :
                                  'text-gray-600 dark:text-gray-400'
                            }`} />
                            <span className={`font-medium ${
                              documentType === type.value
                                ? 'text-white'
                                : 'text-gray-800 dark:text-white'
                            }`}>
                              {type.label}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Titre */}
                  <div className="space-y-6">
                    <h3 className="text-xl font-semibold text-gray-900 dark:text-white border-b border-gray-200 dark:border-gray-700 pb-3">
                      Informations Principales
                    </h3>

                    <div>
                      <Label htmlFor="title" className="text-base font-medium">
                        Titre {documentType === 'these' ? 'de la thèse' :
                               documentType === 'memoire' ? 'du mémoire' : 'du rapport de stage'} <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id="title"
                        value={formData.title}
                        onChange={(e) => handleInputChange("title", e.target.value)}
                        placeholder={`Titre complet ${documentType === 'these' ? 'de la thèse' :
                                                     documentType === 'memoire' ? 'du mémoire' : 'du rapport de stage'}`}
                        className="h-12 text-base"
                        required
                      />
                    </div>
                  </div>

                  {/* Auteur et encadrement */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    <div>
                      <Label htmlFor="main_author">
                        {documentType === 'these' ? 'Auteur principal' :
                         documentType === 'memoire' ? 'Étudiant' : 'Étudiant'} <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id="main_author"
                        value={formData.main_author}
                        onChange={(e) => handleInputChange("main_author", e.target.value)}
                        placeholder={`Nom ${documentType === 'these' ? 'de l\'auteur' :
                                           documentType === 'memoire' ? 'de l\'étudiant' : 'de l\'étudiant'}`}
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="student_id_main">Matricule étudiant</Label>
                      <Input
                        id="student_id_main"
                        value={formData.student_id || ""}
                        onChange={(e) => handleInputChange("student_id", e.target.value)}
                        placeholder="Ex: 21A001"
                      />
                    </div>
                    <div>
                      <Label htmlFor="director">
                        {documentType === 'these' ? 'Directeur de thèse (Encadreur académique)' :
                         documentType === 'memoire' ? 'Superviseur (Encadreur académique - Enseignant)' : 'Encadreur en entreprise'} <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id="director"
                        value={formData.director}
                        onChange={(e) => handleInputChange("director", e.target.value)}
                        placeholder={`Nom ${documentType === 'these' ? 'du directeur de thèse' :
                                           documentType === 'memoire' ? 'de l\'encadreur' : 'du superviseur'}`}
                        required
                      />
                    </div>
                    {documentType === 'these' && (
                      <div>
                        <Label htmlFor="co_director">Co-directeur</Label>
                        <Input
                          id="co_director"
                          value={formData.co_director}
                          onChange={(e) => handleInputChange("co_director", e.target.value)}
                          placeholder="Nom du co-directeur (optionnel)"
                        />
                      </div>
                    )}
                    {documentType === 'rapport_stage' && (
                      <div>
                        <Label htmlFor="company">Entreprise/Organisme <span className="text-red-500">*</span></Label>
                        <Input
                          id="company"
                          value={formData.university}
                          onChange={(e) => handleInputChange("university", e.target.value)}
                          placeholder="Nom de l'entreprise ou organisme"
                          required
                        />
                      </div>
                    )}
                    {documentType === 'memoire' && (
                      <div>
                        <Label htmlFor="co_supervisor">Co-superviseur (Encadreur professionnel - Entreprise/Organisation)</Label>
                        <Input
                          id="co_supervisor"
                          value={formData.co_supervisor || ""}
                          onChange={(e) => handleInputChange("co_supervisor", e.target.value)}
                          placeholder="Nom du co-encadreur ou encadreur professionnel (optionnel)"
                        />
                      </div>
                    )}
                  </div>

                  {/* Diplôme et spécialité */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div>
                      <Combobox
                        label={documentType === 'these' ? 'Diplôme visé' :
                               documentType === 'memoire' ? 'Niveau d\'études' : 'Niveau de formation'}
                        placeholder="Sélectionner ou saisir un diplôme..."
                        value={formData.target_degree || ""}
                        onValueChange={(value) => handleInputChange("target_degree", value)}
                        options={degrees.filter(degree => {
                          if (documentType === 'these') {
                            return degree.includes('Doctorat') || degree.includes('PhD') || degree.includes('Master');
                          } else if (documentType === 'memoire') {
                            return degree.includes('Licence') || degree.includes('Master') || degree.includes('Ingénieur');
                          } else {
                            return degree.includes('Licence') || degree.includes('Master') || degree.includes('BTS') || degree.includes('DUT') || degree.includes('Ingénieur');
                          }
                        })}
                        allowCustom={true}
                        required={true}
                        disabled={loadingReferenceData}
                      />
                    </div>
                    <div>
                      <Combobox
                        label={documentType === 'these' ? 'Spécialité' :
                               documentType === 'memoire' ? 'Filière d\'études' : 'Domaine de stage'}
                        placeholder="Sélectionner ou saisir une spécialité..."
                        value={formData.specialty || ""}
                        onValueChange={(value) => handleInputChange("specialty", value)}
                        options={specialties}
                        allowCustom={true}
                        required={true}
                        disabled={loadingReferenceData}
                      />
                    </div>
                  </div>

                  {/* Département */}
                  <div>
                    <Label htmlFor="department">Département</Label>
                    <Input
                      id="department"
                      value={formData.department}
                      onChange={(e) => handleInputChange("department", e.target.value)}
                      placeholder="Nom du département"
                    />
                  </div>

                  {/* Université et faculté - Adaptatif selon le type */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <Combobox
                        label="Université"
                        placeholder="Sélectionner ou saisir une université..."
                        value={formData.university || ""}
                        onValueChange={(value) => handleInputChange("university", value)}
                        options={universities}
                        allowCustom={true}
                        required={true}
                        disabled={loadingReferenceData}
                      />
                    </div>
                    <div>
                      <Combobox
                        label="Faculté/École"
                        placeholder="Sélectionner ou saisir une faculté..."
                        value={formData.faculty || ""}
                        onValueChange={(value) => handleInputChange("faculty", value)}
                        options={faculties}
                        allowCustom={true}
                        required={true}
                        disabled={loadingReferenceData}
                      />
                    </div>
                  </div>

                  {/* Année, date de soutenance et pagination */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {documentType === 'these' ? (
                      <div>
                        <Label htmlFor="defense_year">Année de soutenance <span className="text-red-500">*</span></Label>
                        <Input
                          id="defense_year"
                          type="number"
                          value={formData.defense_year}
                          onChange={(e) => handleInputChange("defense_year", parseInt(e.target.value))}
                          min="1900"
                          max={new Date().getFullYear()}
                          required
                        />
                      </div>
                    ) : (
                      <div>
                        <Label htmlFor="academic_year_main">
                          Année de soutenance <span className="text-red-500">*</span>
                        </Label>
                        <Input
                          id="academic_year_main"
                          value={formData.academic_year || `${new Date().getFullYear()}-${new Date().getFullYear() + 1}`}
                          onChange={(e) => handleInputChange("academic_year", e.target.value)}
                          placeholder="Ex: 2023-2024"
                          required
                        />
                      </div>
                    )}
                    <div>
                      <Label htmlFor="defense_date">
                        Date de dépôt <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id="defense_date"
                        type="date"
                        value={formData.defense_date || ""}
                        onChange={(e) => handleInputChange("defense_date", e.target.value)}
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="pagination">Nombre de pages</Label>
                      <Input
                        id="pagination"
                        value={formData.pagination}
                        onChange={(e) => handleInputChange("pagination", e.target.value)}
                        placeholder="Ex: 245 pages"
                      />
                    </div>
                  </div>

                  {/* Champs spécifiques aux rapports de stage */}
                  {documentType === 'rapport_stage' && (
                    <div className="space-y-6">
                      <h3 className="text-xl font-semibold text-gray-900 dark:text-white border-b border-gray-200 dark:border-gray-700 pb-3">
                        Informations de Stage
                      </h3>
                      

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <Label htmlFor="student_id">Matricule étudiant</Label>
                          <Input
                            id="student_id"
                            value={formData.student_id || ""}
                            onChange={(e) => handleInputChange("student_id", e.target.value)}
                            placeholder="Ex: 21A001"
                          />
                        </div>
                        <div>
                          <Label htmlFor="stage_type">Type de stage <span className="text-red-500">*</span></Label>
                          <select
                            id="stage_type"
                            value={formData.stage_type || "Application"}
                            onChange={(e) => handleInputChange("stage_type", e.target.value)}
                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                            required
                          >
                            <option value="Application">Stage d'application</option>
                            <option value="Observation">Stage d'observation</option>
                            <option value="Perfectionnement">Stage de perfectionnement</option>
                            <option value="Pré-emploi">Stage pré-emploi</option>
                          </select>
                        </div>

                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div>
                          <Label htmlFor="company_supervisor">Encadreur en entreprise</Label>
                          <Input
                            id="company_supervisor"
                            value={formData.company_supervisor || ""}
                            onChange={(e) => handleInputChange("company_supervisor", e.target.value)}
                            placeholder="Nom de l'encadreur professionnel"
                          />
                        </div>
                        <div>
                          <Label htmlFor="company_address">Adresse de l'entreprise</Label>
                          <Input
                            id="company_address"
                            value={formData.company_address || ""}
                            onChange={(e) => handleInputChange("company_address", e.target.value)}
                            placeholder="Ex: Douala, Cameroun"
                          />
                        </div>
                        <div>
                          <Label htmlFor="company_sector">Secteur d'activité</Label>
                          <Input
                            id="company_sector"
                            value={formData.company_sector || ""}
                            onChange={(e) => handleInputChange("company_sector", e.target.value)}
                            placeholder="Ex: Informatique, Télécommunications"
                          />
                        </div>
                      </div>

                    </div>
                  )}

                  {/* Résumés bilingues */}
                  <div className="space-y-6">
                    <h3 className="text-xl font-semibold text-gray-900 dark:text-white border-b border-gray-200 dark:border-gray-700 pb-3">
                      Contenu et Description
                    </h3>

                    <BilingualAbstract
                      summaryFr={formData.summary || ""}
                      summaryEn={formData.abstract || ""}
                      onSummaryFrChange={(value) => handleInputChange("summary", value)}
                      onSummaryEnChange={(value) => handleInputChange("abstract", value)}
                      required={true}
                      minLength={100}
                      showCamesValidation={false}
                    />
                  </div>

                  {/* Abstract anglais supplémentaire pour les thèses */}


                  {/* Mots-clés bilingues */}
                  <div className="space-y-4">
                    <h4 className="text-lg font-semibold text-gray-900 dark:text-white">
                      Mots-clés (Conforme CAMES) <span className="text-red-500">*</span>
                    </h4>

                    {/* Mots-clés français */}
                    <div>
                      <Label htmlFor="keywords-fr">Mots-clés français</Label>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {keywords.map((keyword, index) => (
                          <Badge key={index} className="flex items-center gap-1 bg-green-100 text-blue-800 border-green-300 dark:bg-blue-800 dark:text-blue-100 dark:border-blue-600">
                            {keyword}
                            <button
                              type="button"
                              onClick={() => {
                                const updatedKeywords = keywords.filter((_, i) => i !== index);
                                setKeywords(updatedKeywords);
                                setFormData(prev => ({ ...prev, keywords: updatedKeywords }));
                              }}
                              className="ml-1 text-red-500 hover:text-red-700"
                            >
                              ×
                            </button>
                          </Badge>
                        ))}
                      </div>
                      <div className="flex gap-2 mt-2">
                        <Input
                          value={newKeyword}
                          onChange={(e) => setNewKeyword(e.target.value)}
                          placeholder="Ajouter un mot-clé français..."
                          onKeyPress={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              if (newKeyword.trim() && !keywords.includes(newKeyword.trim())) {
                                setKeywords([...keywords, newKeyword.trim()]);
                                setNewKeyword('');
                              }
                            }
                          }}
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            if (newKeyword.trim() && !keywords.includes(newKeyword.trim())) {
                              const updatedKeywords = [...keywords, newKeyword.trim()];
                              setKeywords(updatedKeywords);
                              setFormData(prev => ({ ...prev, keywords: updatedKeywords }));
                              setNewKeyword('');
                            }
                          }}
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                        Ajoutez des mots-clés pour décrire le contenu de votre document
                      </p>
                    </div>

                    {/* Mots-clés anglais */}
                    <div>
                      <Label htmlFor="keywords-en">Mots-clés anglais</Label>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {keywordsEn.map((keyword, index) => (
                          <Badge key={index} className="flex items-center gap-1 bg-green-100 text-blue-800 border-green-300 dark:bg-blue-800 dark:text-blue-100 dark:border-blue-600">
                            {keyword}
                            <button
                              type="button"
                              onClick={() => {
                                const updatedKeywords = keywordsEn.filter((_, i) => i !== index);
                                setKeywordsEn(updatedKeywords);
                                setFormData(prev => ({ ...prev, keywords_en: updatedKeywords }));
                              }}
                              className="ml-1 text-red-500 hover:text-red-700"
                            >
                              ×
                            </button>
                          </Badge>
                        ))}
                      </div>
                      <div className="flex gap-2 mt-2">
                        <Input
                          value={newKeywordEn}
                          onChange={(e) => setNewKeywordEn(e.target.value)}
                          placeholder="Ajouter un mot-clé anglais..."
                          onKeyPress={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              if (newKeywordEn.trim() && !keywordsEn.includes(newKeywordEn.trim())) {
                                const updatedKeywords = [...keywordsEn, newKeywordEn.trim()];
                                setKeywordsEn(updatedKeywords);
                                setFormData(prev => ({ ...prev, keywords_en: updatedKeywords }));
                                setNewKeywordEn('');
                              }
                            }
                          }}
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            if (newKeywordEn.trim() && !keywordsEn.includes(newKeywordEn.trim())) {
                              const updatedKeywords = [...keywordsEn, newKeywordEn.trim()];
                              setKeywordsEn(updatedKeywords);
                              setFormData(prev => ({ ...prev, keywords_en: updatedKeywords }));
                              setNewKeywordEn('');
                            }
                          }}
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                        Add keywords to describe your document content in English
                      </p>
                    </div>
                  </div>

                  {/* Champs spécifiques aux mémoires */}
                  {documentType === 'memoire' && (
                    <div className="space-y-6">
                      <h4 className="text-lg font-semibold text-gray-900 dark:text-white">
                        Informations Spécifiques au Mémoire
                      </h4>

                      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        <div>
                          <Label htmlFor="academic_year">Année de soutenance</Label>
                          <Input
                            id="academic_year"
                            value={formData.academic_year || ""}
                            onChange={(e) => handleInputChange("academic_year", e.target.value)}
                            placeholder="Ex: 2023-2024"
                          />
                        </div>
                        <div>
                          <Label htmlFor="methodology">Méthodologie</Label>
                          <Textarea
                            id="methodology"
                            value={formData.methodology || ""}
                            onChange={(e) => handleInputChange("methodology", e.target.value)}
                            placeholder="Méthodologie utilisée dans le mémoire..."
                            className="min-h-[80px]"
                          />
                        </div>
                        <div>
                          <Label htmlFor="conclusion">Conclusion</Label>
                          <Textarea
                            id="conclusion"
                            value={formData.conclusion || ""}
                            onChange={(e) => handleInputChange("conclusion", e.target.value)}
                            placeholder="Principales conclusions du mémoire..."
                            className="min-h-[80px]"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <div>
                          <Label htmlFor="grade">Note obtenue</Label>
                          <Input
                            id="grade"
                            type="number"
                            value={formData.grade || ""}
                            onChange={(e) => {
                              const value = e.target.value;
                              if (value === "" || value === null) {
                                handleInputChange("grade", undefined);
                              } else {
                                const numValue = parseFloat(value);
                                if (!isNaN(numValue)) {
                                  handleInputChange("grade", numValue);
                                }
                              }
                            }}
                            placeholder="Note sur 20"
                            min="0"
                            max="20"
                            step="0.1"
                          />
                        </div>
                        <div>
                          <Combobox
                            label="Mention"
                            placeholder="Sélectionner une mention..."
                            value={formData.mention || ""}
                            onValueChange={(value) => handleInputChange("mention", value)}
                            options={[
                              'Passable',
                              'Assez Bien',
                              'Bien',
                              'Très Bien',
                              'Excellent'
                            ]}
                            allowCustom={false}
                            required={false}
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Champs spécifiques aux rapports de stage */}
                  {documentType === 'rapport_stage' && (
                    <div className="space-y-6">
                      <h4 className="text-lg font-semibold text-gray-900 dark:text-white">
                        Informations Spécifiques au Rapport de Stage
                      </h4>

                      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        <div>
                          <Label htmlFor="academic_year_stage">Année de soutenance</Label>
                          <Input
                            id="academic_year_stage"
                            value={formData.academic_year || ""}
                            onChange={(e) => handleInputChange("academic_year", e.target.value)}
                            placeholder="Ex: 2023-2024"
                          />
                        </div>
                        <div>
                          <Label htmlFor="objectives">Objectifs du stage</Label>
                          <Textarea
                            id="objectives"
                            value={formData.objectives || ""}
                            onChange={(e) => handleInputChange("objectives", e.target.value)}
                            placeholder="Objectifs et missions du stage..."
                            className="min-h-[80px]"
                          />
                        </div>
                        <div>
                          <Label htmlFor="tasks_performed">Tâches réalisées</Label>
                          <Textarea
                            id="tasks_performed"
                            value={formData.tasks_performed || ""}
                            onChange={(e) => handleInputChange("tasks_performed", e.target.value)}
                            placeholder="Principales tâches et activités..."
                            className="min-h-[80px]"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <div>
                          <Label htmlFor="skills_acquired">Compétences acquises</Label>
                          <Textarea
                            id="skills_acquired"
                            value={formData.skills_acquired || ""}
                            onChange={(e) => handleInputChange("skills_acquired", e.target.value)}
                            placeholder="Compétences et apprentissages..."
                            className="min-h-[80px]"
                          />
                        </div>
                        <div>
                          <Label htmlFor="recommendations">Recommandations</Label>
                          <Textarea
                            id="recommendations"
                            value={formData.recommendations || ""}
                            onChange={(e) => handleInputChange("recommendations", e.target.value)}
                            placeholder="Recommandations et suggestions..."
                            className="min-h-[80px]"
                          />
                        </div>
                      </div>

                    </div>
                  )}

                  {/* Informations SIGB et Métadonnées */}
                  <div className="space-y-6">
                    <h3 className="text-xl font-semibold text-gray-900 dark:text-white border-b border-gray-200 dark:border-gray-700 pb-3">
                      Informations SIGB
                    </h3>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <Combobox
                          label="Langue"
                          placeholder="Sélectionner une langue..."
                          value={formData.language || ""}
                          onValueChange={(value) => handleInputChange("language", value)}
                          options={[
                            { value: "fr", label: "Français" },
                            { value: "en", label: "Anglais" },
                            { value: "both", label: "Bilingue (Fr/En)" }
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
                            { value: "pdf", label: "PDF" },
                            { value: "bound", label: "Relié" },
                            { value: "electronic", label: "Électronique" },
                            { value: "multimedia", label: "Multimédia" }
                          ]}
                          allowCustom={false}
                          required={true}
                        />
                      </div>


                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      <div>
                        <Label htmlFor="institution">Institution <span className="text-red-500">*</span></Label>
                        <Input
                          id="institution"
                          value={formData.institution}
                          onChange={(e) => handleInputChange("institution", e.target.value)}
                          placeholder="Université des Montagnes"
                          required
                        />
                      </div>

                      <div>
                        <Label htmlFor="country">Pays <span className="text-red-500">*</span></Label>
                        <Input
                          id="country"
                          value={formData.country}
                          onChange={(e) => handleInputChange("country", e.target.value)}
                          placeholder="Cameroun"
                          required
                        />
                      </div>

                      <div>
                        <Label htmlFor="physical_location">Localisation physique</Label>
                        <Input
                          id="physical_location"
                          value={formData.physical_location}
                          onChange={(e) => handleInputChange("physical_location", e.target.value)}
                          placeholder="Ex: Salle des thèses, Rayon A"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <Combobox
                          label="Droits d'accès"
                          placeholder="Sélectionner les droits..."
                          value={formData.access_rights || ""}
                          onValueChange={(value) => handleInputChange("access_rights", value)}
                          options={[
                            { value: "open", label: "Accès libre" },
                            { value: "restricted", label: "Accès restreint" },
                            { value: "embargo", label: "Embargo" }
                          ]}
                          allowCustom={false}
                          required={true}
                        />
                      </div>

                      <div>
                        <Combobox
                          label="Licence"
                          placeholder="Sélectionner une licence..."
                          value={formData.license || ""}
                          onValueChange={(value) => handleInputChange("license", value)}
                          options={[
                            { value: "CC-BY", label: "Creative Commons BY" },
                            { value: "CC-BY-SA", label: "Creative Commons BY-SA" },
                            { value: "All Rights Reserved", label: "Tous droits réservés" }
                          ]}
                          allowCustom={false}
                          required={true}
                        />
                      </div>
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
                  <PDFAValidator
                    label={`Document numérique ${documentType === 'these' ? 'de la thèse' :
                                                 documentType === 'memoire' ? 'du mémoire' : 'du rapport de stage'}`}
                    onFileSelect={setSelectedFile}
                    selectedFile={selectedFile}
                    uploadedFileInfo={uploadedFileInfo}
                    enableValidation={true}
                    dicamesCompliance={true}
                    required={true}
                  />

                  {/* Boutons d'action */}
                  <div className="flex justify-between items-center pt-6">
                    <div className="flex space-x-2">
                      
                    </div>
                    
                    <div className="flex space-x-4">
                      <Button type="button" variant="outline" asChild>
                        <Link href="/theses">Annuler</Link>
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
                            Ajouter {documentType === 'these' ? 'la thèse' :
                                     documentType === 'memoire' ? 'le mémoire' : 'le rapport'}
                          </>
                        )}
                      </Button>
                    </div>
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
