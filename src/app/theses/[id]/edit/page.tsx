"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion } from 'framer-motion';
import { ArrowLeft, Save, GraduationCap, FileText, Briefcase } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { DarkModeButton } from "@/components/ui/dark-mode-button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Combobox } from "@/components/ui/combobox";
import { Badge } from "@/components/ui/badge";
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

interface AcademicDocument {
  id: string;
  title: string;
  author: string;
  supervisor: string;
  degree: string;
  specialty?: string;
  year: number;
  defense_date?: string;
  document_type: 'these' | 'memoire' | 'rapport_stage';
  university?: string;
  faculty?: string;
  document_path?: string;
  file_type?: string;
  document_size?: number;
  is_accessible: boolean;
  created_at: string;
}

export default function EditDocumentPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const [document, setDocument] = useState<AcademicDocument | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [currentDocumentPath, setCurrentDocumentPath] = useState<string | null>(null);

  // États pour les composants CAMES
  const [frenchKeywords, setFrenchKeywords] = useState<string[]>([]);
  const [englishKeywords, setEnglishKeywords] = useState<string[]>([]);
  const [deweyClassification, setDeweyClassification] = useState("");
  const [cduClassification, setCduClassification] = useState("");
  const [subjectHeadings, setSubjectHeadings] = useState<string[]>([]);

  // États pour les données de référence
  const [specialties, setSpecialties] = useState<string[]>([]);
  const [degrees, setDegrees] = useState<string[]>([]);
  const [universities, setUniversities] = useState<string[]>([]);
  const [faculties, setFaculties] = useState<string[]>([]);

  // Données du formulaire
  // Type de document détecté
  const [documentType, setDocumentType] = useState<'these' | 'memoire' | 'rapport_stage'>('these');

  const [formData, setFormData] = useState<Partial<ThesisFormData>>({
    title: "",
    main_author: "",
    director: "",
    co_director: "",
    target_degree: "",
    specialty: "",
    defense_year: new Date().getFullYear(),
    academic_year: "",
    university: "",
    faculty: "",
    department: "",
    pagination: "",
    summary: "",
    abstract: "",
    keywords: [] as string[],
    keywords_en: [] as string[],
    // Champs spécifiques aux mémoires
    co_supervisor: "",
    methodology: "",
    conclusion: "",
    grade: undefined,
    mention: undefined,
    // Champs spécifiques aux rapports de stage
    student_id: "",
    stage_type: "Application",
    company_supervisor: "",
    company_address: "",
    company_sector: "",
    objectives: "",
    tasks_performed: "",
    skills_acquired: "",
    recommendations: "",
    stage_start_date: "",
    stage_end_date: "",

  });

  useEffect(() => {
    const fetchDocument = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/academic-documents/${params?.id}`);

        if (!response.ok) {
          throw new Error('Document non trouvé');
        }

        const data = await response.json();
        const doc = data.data;
        setDocument(doc);

        // Détecter le type de document
        setDocumentType(doc.document_type || 'these');

        // Remplir le formulaire avec les données existantes
        setFormData({
          title: doc.title || "",
          main_author: doc.main_author || doc.author || "",
          director: doc.director || doc.supervisor || "",
          co_director: doc.co_director || "",
          target_degree: doc.target_degree || doc.degree || "",
          specialty: doc.specialty || "",
          defense_year: doc.defense_year || doc.year || new Date().getFullYear(),
          academic_year: doc.academic_year || "",
          university: doc.university || "",
          faculty: doc.faculty || "",
          department: doc.department || "",
          pagination: doc.pagination || "",
          summary: doc.summary || "",
          abstract: doc.abstract || "",
          keywords: doc.keywords || [],
          keywords_en: doc.keywords_en || [],
          // Champs spécifiques aux mémoires
          co_supervisor: doc.co_supervisor || "",
          methodology: doc.methodology || "",
          conclusion: doc.conclusion || "",
          grade: doc.grade || undefined,
          mention: doc.mention || "",
          // Champs spécifiques aux rapports de stage
          student_id: doc.student_id || "",
          stage_type: doc.stage_type || "Application",
          company_supervisor: doc.company_supervisor || "",
          company_address: doc.company_address || "",
          company_sector: doc.company_sector || "",
          objectives: doc.objectives || "",
          tasks_performed: doc.tasks_performed || "",
          skills_acquired: doc.skills_acquired || "",
          recommendations: doc.recommendations || "",
          // Champs de document
          document_path: doc.document_path || "",
          document_size: doc.document_size || 0,
          // Champs SIGB
          language: doc.language || "fr",
          institution: doc.institution || "Université des Montagnes",
          country: doc.country || "Cameroun",
          access_rights: doc.access_rights || "open",
          license: doc.license || "CC-BY",
          format: doc.format || "print",

          physical_location: doc.physical_location || "",
          status: doc.status || "available",
        });

        // Charger les informations du fichier actuel
        setCurrentDocumentPath(doc.document_path || null);

        // Initialiser les données CAMES
        setFrenchKeywords(doc.keywords || []);
        setEnglishKeywords(doc.keywords_en || []);
        setDeweyClassification(doc.dewey_classification || "");
        setCduClassification(doc.cdu_classification || "");
        setSubjectHeadings(doc.subject_headings || []);

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
    };

    const loadReferenceData = async () => {
      try {
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
      }
    };

    if (params?.id) {
      fetchDocument();
      loadReferenceData();
    }
  }, [params?.id, toast]);

  const handleInputChange = (field: keyof ThesisFormData, value: any) => {
    setFormData((prev: Partial<ThesisFormData>) => ({
      ...prev,
      [field]: value
    }));
  };

  const uploadFile = async (documentId: string): Promise<any> => {
    if (!selectedFile) return null;

    const uploadFormData = new FormData();
    uploadFormData.append('file', selectedFile);
    uploadFormData.append('type', documentType);
    uploadFormData.append('id', documentId);

    // Si on modifie un document existant avec un fichier, indiquer qu'on remplace
    if (document?.document_path) {
      uploadFormData.append('replaceExisting', 'true');
      uploadFormData.append('existingFilePath', document.document_path);
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
      // Note: Les validations CAMES sont maintenant centralisées dans l'onglet "Conformité CAMES"

      let finalFormData: any = {
        ...formData,
        // Données CAMES
        keywords: frenchKeywords,
        keywords_en: englishKeywords,
        dewey_classification: deweyClassification,
        cdu_classification: cduClassification,
        subject_headings: subjectHeadings,
        // Conversion des types pour éviter les erreurs Zod
        defense_year: formData.defense_year ? parseInt(formData.defense_year.toString(), 10) : undefined,
        mention: formData.mention || undefined, // Éviter les chaînes vides
      };

      // Upload du fichier si un nouveau fichier est sélectionné
      if (selectedFile) {
        try {
          const uploadResult = await uploadFile(params?.id as string);
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

      // Nettoyage des données avant validation Zod
      // Supprimer les champs vides ou invalides pour éviter les erreurs
      if (!finalFormData.mention || finalFormData.mention === '') {
        delete finalFormData.mention;
      }
      
      if (!finalFormData.defense_year || isNaN(finalFormData.defense_year)) {
        delete finalFormData.defense_year;
      }

      // Validation des mots-clés - s'assurer qu'ils sont des tableaux
      if (!Array.isArray(finalFormData.keywords) || finalFormData.keywords.length < 3) {
        finalFormData.keywords = frenchKeywords.length >= 3 ? frenchKeywords : [];
      }
      
      if (!Array.isArray(finalFormData.keywords_en) || finalFormData.keywords_en.length < 3) {
        finalFormData.keywords_en = englishKeywords.length >= 3 ? englishKeywords : [];
      }

      // Ajouter explicitement le type de document académique
      finalFormData.document_type = documentType;

      // Validation avec Zod - utiliser partial() pour la modification
      // Mais vérifier les champs critiques CAMES
      if (!finalFormData.summary || finalFormData.summary.length < 100) {
        toast({
          title: "Erreur de validation CAMES",
          description: "Le résumé français doit contenir au moins 100 caractères",
          variant: "destructive",
        });
        return;
      }

      if (!finalFormData.abstract || finalFormData.abstract.length < 100) {
        toast({
          title: "Erreur de validation CAMES",
          description: "Le résumé anglais doit contenir au moins 100 caractères",
          variant: "destructive",
        });
        return;
      }

      // Nettoyage des données pour la validation Zod
      const cleanedData = {
        ...finalFormData,
        grade: finalFormData.grade === "" || finalFormData.grade === null ? undefined :
               typeof finalFormData.grade === 'string' ? parseFloat(finalFormData.grade) : finalFormData.grade,

        defense_year: finalFormData.defense_year === "" || finalFormData.defense_year === null ? undefined :
                     typeof finalFormData.defense_year === 'string' ? parseInt(finalFormData.defense_year) : finalFormData.defense_year
      };

      const validatedData = thesisSchema.partial().parse(cleanedData);

      console.log('🔄 MODIFICATION DOCUMENT - Données envoyées:', {
        id: params?.id,
        document_type: documentType,
        title: finalFormData.title,
        main_author: finalFormData.main_author,
        director: finalFormData.director,
        hasFile: !!selectedFile,
        timestamp: new Date().toISOString()
      });

      const response = await fetch(`/api/academic-documents/${params?.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(validatedData),
      });

      if (response.ok) {
        toast({
          title: "Succès",
          description: "Document mis à jour avec succès",
        });
        router.push(`/theses/${params?.id}`);
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || 'Erreur lors de la mise à jour');
      }

    } catch (error: any) {
      console.error('Erreur lors de la mise à jour:', error);

      // Gestion spécifique des erreurs de validation Zod
      if (error.name === 'ZodError') {
        const firstError = error.errors[0];
        toast({
          title: "Erreur de validation",
          description: `${firstError.path.join('.')}: ${firstError.message}`,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Erreur",
          description: error.message || "Erreur lors de la mise à jour du document",
          variant: "destructive",
        });
      }
    } finally {
      setSaving(false);
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
                  <Link href={`/theses/${document.id}`}>
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
                      Modifier {getDocumentTypeLabel()}
                    </motion.h1>
                    <motion.p
                      className="text-sm sm:text-base text-gray-600 dark:text-gray-300 mt-1 font-medium"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.4, delay: 0.2 }}
                    >
                      Mettre à jour les informations du document
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
                  <Link href={`/theses/${document.id}`}>
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
              <CardTitle>Informations du Document</CardTitle>
              <CardDescription>
                Modifiez les informations du {getDocumentTypeLabel().toLowerCase()}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Titre */}
                <div>
                  <Label htmlFor="title">Titre *</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => handleInputChange("title", e.target.value)}
                    placeholder="Titre du document"
                    required
                  />
                </div>

                {/* Auteur et encadrement - Adaptatif selon le type */}
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
                       documentType === 'memoire' ? 'Superviseur (Encadreur académique - Enseignant)' : 'Superviseur de stage (Encadreur académique)'} <span className="text-red-500">*</span>
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
                      <Label htmlFor="company">Entreprise/Organisme *</Label>
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

                {/* Diplôme et spécialité - Adaptatif selon le type */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div>
                    <Combobox
                      label={documentType === 'these' ? 'Diplôme visé *' :
                             documentType === 'memoire' ? 'Niveau d\'études *' : 'Niveau de formation *'}
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
                    />
                  </div>
                  <div>
                    <Combobox
                      label="Spécialité"
                      placeholder="Sélectionner ou saisir une spécialité..."
                      value={formData.specialty || ""}
                      onValueChange={(value) => handleInputChange("specialty", value)}
                      options={specialties}
                      allowCustom={true}
                      required={false}
                    />
                  </div>
                </div>

                {/* Université et faculté - Adaptatif selon le type */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <Combobox
                      label="Université *"
                      placeholder="Sélectionner ou saisir une université..."
                      value={formData.university || ""}
                      onValueChange={(value) => handleInputChange("university", value)}
                      options={universities}
                      allowCustom={true}
                      required={true}
                    />
                  </div>
                  <div>
                    <Combobox
                      label="Faculté/École *"
                      placeholder="Sélectionner ou saisir une faculté..."
                      value={formData.faculty || ""}
                      onValueChange={(value) => handleInputChange("faculty", value)}
                      options={faculties}
                      allowCustom={true}
                      required={true}
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
                      <Label htmlFor="academic_year_main">Année de soutenance <span className="text-red-500">*</span></Label>
                      <Input
                        id="academic_year_main"
                        value={formData.academic_year || ""}
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

                {/* Section Contenu et Description CAMES */}
                <div className="space-y-6">
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-white border-b border-gray-200 dark:border-gray-700 pb-3">
                    Contenu et Description (Conforme CAMES)
                  </h3>

                  {/* Résumés bilingues CAMES */}
                  <BilingualAbstract
                    summaryFr={formData.summary || ""}
                    summaryEn={formData.abstract || ""}
                    onSummaryFrChange={(value) => handleInputChange("summary", value)}
                    onSummaryEnChange={(value) => handleInputChange("abstract", value)}
                    required={true}
                    minLength={100}
                  />



                  {/* Mots-clés bilingues CAMES */}
                  <div className="space-y-4">
                    <h4 className="text-lg font-semibold text-gray-900 dark:text-white">
                      Mots-clés (Conforme CAMES) <span className="text-red-500">*</span>
                    </h4>

                    {/* Mots-clés français */}
                    <div>
                      <Label htmlFor="keywords-fr">Mots-clés français (minimum 3)</Label>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {frenchKeywords.map((keyword, index) => (
                          <Badge key={index} variant="secondary" className="flex items-center gap-1 bg-green-100 text-blue-800 border-green-300 dark:bg-green-800 dark:text-green-100 dark:border-green-600">
                            {keyword}
                            <button
                              type="button"
                              onClick={() => {
                              const updatedKeywords = frenchKeywords.filter((_, i) => i !== index);
                              setFrenchKeywords(updatedKeywords);
                              handleInputChange("keywords", updatedKeywords);
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
                          placeholder="Ajouter un mot-clé français..."
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              const value = e.currentTarget.value.trim();
                              if (value) {
                                const result = addKeywordSafely(frenchKeywords, value);
                                if (result.success) {
                                  setFrenchKeywords(result.keywords);
                                  handleInputChange("keywords", result.keywords);
                                  e.currentTarget.value = '';
                                }
                              }
                            }
                          }}
                        />
                      </div>
                      {frenchKeywords.length < 3 && (
                        <p className="text-sm text-red-600 mt-1">
                          Au moins 3 mots-clés français sont requis pour la conformité CAMES
                        </p>
                      )}
                    </div>

                    {/* Mots-clés anglais */}
                    <div>
                      <Label htmlFor="keywords-en">Mots-clés anglais (minimum 3)</Label>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {englishKeywords.map((keyword, index) => (
                          <Badge key={index} variant="secondary" className="flex items-center gap-1 bg-green-100 text-blue-800 border-green-300 dark:bg-green-800 dark:text-green-100 dark:border-green-600">
                            {keyword}
                            <button
                              type="button"
                              onClick={() => {
                              const updatedKeywords = englishKeywords.filter((_, i) => i !== index);
                              setEnglishKeywords(updatedKeywords);
                              handleInputChange("keywords_en", keywordsArrayToString(updatedKeywords));
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
                          placeholder="Ajouter un mot-clé anglais..."
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              const value = e.currentTarget.value.trim();
                              if (value) {
                                const result = addKeywordSafely(englishKeywords, value);
                                if (result.success) {
                                  setEnglishKeywords(result.keywords);
                                  handleInputChange("keywords_en", keywordsArrayToString(result.keywords));
                                  e.currentTarget.value = '';
                                }
                              }
                            }
                          }}
                        />
                      </div>
                      {englishKeywords.length < 3 && (
                        <p className="text-sm text-red-600 mt-1">
                          Au moins 3 mots-clés anglais sont requis pour la conformité CAMES
                        </p>
                      )}
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
                        Informations de Stage
                      </h4>

                      {/* Informations de base du stage */}
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
                          <Label htmlFor="stage_type">Type de stage</Label>
                          <select
                            id="stage_type"
                            value={formData.stage_type || "Application"}
                            onChange={(e) => handleInputChange("stage_type", e.target.value)}
                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            <option value="Application">Stage d'application</option>
                            <option value="Observation">Stage d'observation</option>
                            <option value="Perfectionnement">Stage de perfectionnement</option>
                            <option value="Pré-emploi">Stage pré-emploi</option>
                          </select>
                        </div>

                      </div>

                      {/* Informations entreprise et encadrement */}
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

                      <h5 className="text-md font-semibold text-gray-900 dark:text-white">
                        Contenu du Rapport
                      </h5>

                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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

                      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        <div>
                          <Label htmlFor="stage_start_date">Date de début</Label>
                          <Input
                            id="stage_start_date"
                            type="date"
                            value={formData.stage_start_date || ""}
                            onChange={(e) => handleInputChange("stage_start_date", e.target.value)}
                          />
                        </div>
                        <div>
                          <Label htmlFor="stage_end_date">Date de fin</Label>
                          <Input
                            id="stage_end_date"
                            type="date"
                            value={formData.stage_end_date || ""}
                            onChange={(e) => handleInputChange("stage_end_date", e.target.value)}
                          />
                        </div>

                      </div>
                    </div>
                  )}

                  {/* Classification documentaire CAMES */}
                  <DocumentClassification
                    deweyClassification={deweyClassification}
                    cduClassification={cduClassification}
                    subjectHeadings={subjectHeadings}
                    onDeweyChange={setDeweyClassification}
                    onCduChange={setCduClassification}
                    onSubjectHeadingsChange={setSubjectHeadings}
                  />
                </div>

                {/* Informations SIGB */}
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

                {/* Upload du document (validation CAMES déplacée vers l'onglet dédié) */}
                <PDFAValidator
                  label={`Document numérique ${document?.document_type === 'these' ? 'de la thèse' :
                                               document?.document_type === 'memoire' ? 'du mémoire' : 'du rapport de stage'}`}
                  onFileSelect={setSelectedFile}
                  selectedFile={selectedFile}
                  uploadedFileInfo={null}
                  enableValidation={false}
                  dicamesCompliance={false}
                  required={false}
                />

                {/* Affichage du fichier actuel */}
                {currentDocumentPath && !selectedFile && (
                  <div className="p-3 bg-green-50 dark:bg-green-800/90 border border-green-200 dark:border-green-800 rounded-lg">
                    <p className="text-sm text-blue-800 dark:text-green-200">
                      <strong>Fichier actuel :</strong> {currentDocumentPath.split('/').pop()}
                    </p>
                  </div>
                )}

                {/* Boutons */}
                <div className="flex justify-end space-x-4 pt-6">
                  <DarkModeButton asChild variant="outline" buttonType="nav">
                    <Link href={`/theses/${document.id}`}>
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
