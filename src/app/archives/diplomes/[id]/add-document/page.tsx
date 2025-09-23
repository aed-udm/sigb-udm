"use client";

import React, { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { motion } from 'framer-motion';
import { 
  FileText, 
  Save, 
  ArrowLeft, 
  Plus, 
  X, 
  GraduationCap, 
  Briefcase, 
  BookOpen, 
  Download,
  File,
  Upload,
  User,
  Calendar
} from "lucide-react";
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
import { FileUpload } from "@/components/ui/file-upload";

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

interface DocumentFormData {
  name: string;
  description: string;
  category: string;
  type: string;
  uploadDate: string;
  size: number;
  document_path: string;
  file_type: string;
  student_id: string;
  academic_year: string;
  keywords: string[];
  notes: string;
}

const documentCategories = [
  {
    id: "diplomes",
    name: "Diplômes",
    description: "Diplômes, certificats, attestations de réussite",
    icon: GraduationCap,
    color: "text-blue-600"
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

export default function AddDocumentPage() {
  const router = useRouter();
  const params = useParams();
  const studentId = params?.id as string;
  const { toast } = useToast();
  
  const [isLoading, setIsLoading] = useState(false);
  const [student, setStudent] = useState<Student | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [keywords, setKeywords] = useState<string[]>([]);
  const [newKeyword, setNewKeyword] = useState("");
  
  const [formData, setFormData] = useState<Partial<DocumentFormData>>({
    name: "",
    description: "",
    category: "",
    type: "",
    uploadDate: new Date().toISOString().split('T')[0],
    size: 0,
    document_path: "",
    file_type: "",
    student_id: studentId,
    academic_year: `${new Date().getFullYear()}-${new Date().getFullYear() + 1}`,
    keywords: [],
    notes: ""
  });

  // Charger les informations de l'étudiant
  useEffect(() => {
    if (studentId) {
      fetchStudentData();
    }
  }, [studentId]);

  const fetchStudentData = async () => {
    try {
      const response = await fetch(`/api/users/${studentId}`);
      if (response.ok) {
        const data = await response.json();
        setStudent(data.data);
      }
    } catch (error) {
      console.error('Erreur lors du chargement des données étudiant:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les informations de l'étudiant",
        variant: "destructive",
      });
    }
  };

  const handleInputChange = (field: keyof DocumentFormData, value: any) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value
    }));
  };

  const handleCategorySelect = (categoryId: string) => {
    setSelectedCategory(categoryId);
    handleInputChange("category", categoryId);
    
    const category = documentCategories.find(cat => cat.id === categoryId);
    if (category) {
      handleInputChange("type", category.name);
    }
  };

  const handleKeywordAdd = () => {
    if (newKeyword.trim() && !keywords.includes(newKeyword.trim())) {
      const updatedKeywords = [...keywords, newKeyword.trim()];
      setKeywords(updatedKeywords);
      handleInputChange("keywords", updatedKeywords);
      setNewKeyword("");
    }
  };

  const handleKeywordRemove = (keyword: string) => {
    const updatedKeywords = keywords.filter(k => k !== keyword);
    setKeywords(updatedKeywords);
    handleInputChange("keywords", updatedKeywords);
  };

  const handleFileSelect = (file: File | null) => {
    if (file) {
      setSelectedFile(file);
      handleInputChange("size", file.size);
      handleInputChange("file_type", file.type);
      
      // Si le nom du document n'est pas encore défini, utiliser le nom du fichier
      if (!formData.name) {
        const fileName = file.name.replace(/\.[^/.]+$/, ""); // Enlever l'extension
        handleInputChange("name", fileName);
      }
    } else {
      setSelectedFile(null);
      handleInputChange("size", 0);
      handleInputChange("file_type", "");
    }
  };

  const uploadFile = async (documentId: string): Promise<any> => {
    if (!selectedFile) return null;

    const uploadFormData = new FormData();
    uploadFormData.append('file', selectedFile);

    // Utiliser l'API spécialisée pour les documents d'archives
    const uploadResponse = await fetch(`/api/archives/documents/${documentId}/upload`, {
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
      // Validation
      if (!formData.name?.trim()) {
        toast({
          title: "Erreur de validation",
          description: "Le nom du document est requis",
          variant: "destructive",
        });
        setIsLoading(false);
        return;
      }

      if (!selectedCategory) {
        toast({
          title: "Erreur de validation",
          description: "Veuillez sélectionner une catégorie de document",
          variant: "destructive",
        });
        setIsLoading(false);
        return;
      }

      if (!selectedFile) {
        toast({
          title: "Erreur de validation",
          description: "Veuillez sélectionner un fichier à télécharger",
          variant: "destructive",
        });
        setIsLoading(false);
        return;
      }

      const documentData = {
        ...formData,
        student_id: studentId,
        category: selectedCategory,
        keywords,
        uploadDate: new Date().toISOString(),
      };

      // Créer le document dans la base de données
      const response = await fetch('/api/archives/documents', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(documentData),
      });

      if (response.ok) {
        const data = await response.json();
        const documentId = data.data.id;

        // Upload du fichier
        if (selectedFile) {
          try {
            const uploadResult = await uploadFile(documentId);
            console.log('✅ Upload réussi:', uploadResult);
            // L'API d'upload met déjà à jour le document automatiquement
            // Pas besoin de faire un PUT supplémentaire
          } catch (uploadError) {
            console.error('Erreur upload:', uploadError);
            toast({
              title: "Avertissement",
              description: "Document créé mais erreur lors de l'upload du fichier",
              variant: "destructive",
            });
          }
        }

        const categoryName = documentCategories.find(cat => cat.id === selectedCategory)?.name || 'Document';
        toast({
          title: "Document ajouté avec succès",
          description: `"${formData.name}" a été ajouté au dossier de ${student?.full_name}`,
        });

        // Redirection vers la page de détail de l'étudiant
        router.push(`/archives/diplomes/${studentId}`);

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
                  <Link href={`/archives/diplomes/${studentId}`}>
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Retour au dossier
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
                    <Upload className="h-6 w-6 sm:h-8 sm:w-8 text-green-600 drop-shadow-lg" />
                  </motion.div>
                  <div>
                    <motion.h1
                      className="text-xl sm:text-2xl md:text-3xl font-bold bg-gradient-to-r from-slate-800 via-green-600 to-slate-800 dark:from-slate-200 dark:via-green-400 dark:to-slate-200 bg-clip-text text-transparent"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.4, delay: 0.1 }}
                    >
                      Ajouter un Document
                    </motion.h1>
                    <motion.p
                      className="text-sm sm:text-base text-gray-600 dark:text-gray-300 mt-1 font-medium"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.4, delay: 0.2 }}
                    >
                      {student ? `Dossier de ${student.full_name}` : 'Chargement...'}
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
                <CardTitle className="text-2xl">Nouveau Document d'Archive</CardTitle>
                <CardDescription className="text-base">
                  Remplissez les informations du document à ajouter au dossier étudiant
                </CardDescription>
              </CardHeader>
              <CardContent className="px-6 lg:px-12 pb-8">
                <form onSubmit={handleSubmit} className="space-y-8">
                  {/* Sélecteur de catégorie de document */}
                  <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
                    <Label htmlFor="documentCategory">Catégorie de document <span className="text-red-500">*</span></Label>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-3">
                      {documentCategories.map((category) => (
                        <div
                          key={category.id}
                          onClick={() => handleCategorySelect(category.id)}
                          className={`cursor-pointer p-4 rounded-lg border-2 transition-all ${
                            selectedCategory === category.id
                              ? 'border-green-500 bg-green-600 dark:bg-green-500 shadow-md'
                              : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500 bg-white dark:bg-gray-800'
                          }`}
                        >
                          <div className="flex items-center space-x-3 mb-2">
                            <category.icon className={`h-6 w-6 ${
                              selectedCategory === category.id
                                ? 'text-white'
                                : category.color
                            }`} />
                            <span className={`font-medium ${
                              selectedCategory === category.id
                                ? 'text-white'
                                : 'text-gray-800 dark:text-white'
                            }`}>
                              {category.name}
                            </span>
                          </div>
                          <p className={`text-sm ${
                            selectedCategory === category.id
                              ? 'text-white/90'
                              : 'text-gray-600 dark:text-gray-400'
                          }`}>
                            {category.description}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Informations du document */}
                  <div className="space-y-6">
                    <h3 className="text-xl font-semibold text-gray-900 dark:text-white border-b border-gray-200 dark:border-gray-700 pb-3">
                      Informations du Document
                    </h3>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <Label htmlFor="name" className="text-base font-medium">
                          Nom du document <span className="text-red-500">*</span>
                        </Label>
                        <Input
                          id="name"
                          value={formData.name}
                          onChange={(e) => handleInputChange("name", e.target.value)}
                          placeholder="Nom descriptif du document"
                          className="h-12 text-base"
                          required
                        />
                      </div>
                      
                      <div>
                        <Label htmlFor="academic_year" className="text-base font-medium">
                          Année académique
                        </Label>
                        <Input
                          id="academic_year"
                          value={formData.academic_year}
                          onChange={(e) => handleInputChange("academic_year", e.target.value)}
                          placeholder="Ex: 2023-2024"
                          className="h-12 text-base"
                        />
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="description" className="text-base font-medium">
                        Description
                      </Label>
                      <Textarea
                        id="description"
                        value={formData.description}
                        onChange={(e) => handleInputChange("description", e.target.value)}
                        placeholder="Description détaillée du document (optionnel)"
                        className="min-h-[100px]"
                      />
                    </div>
                  </div>

                  {/* Upload de fichier */}
                  <div className="space-y-6">
                    <h3 className="text-xl font-semibold text-gray-900 dark:text-white border-b border-gray-200 dark:border-gray-700 pb-3">
                      Fichier Document
                    </h3>
                    
                    <div>
                      <Label className="text-base font-medium">
                        Sélectionner le fichier <span className="text-red-500">*</span>
                      </Label>
                      <FileUpload
                        label="Fichier du document"
                        accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                        maxSize={50}
                        onFileSelect={handleFileSelect}
                        selectedFile={selectedFile}
                        required={true}
                        description="Formats acceptés: PDF, Word, Images (JPG, PNG) - Taille max: 50MB"
                      />
                    </div>
                  </div>

                  {/* Mots-clés */}
                  <div className="space-y-6">
                    <h3 className="text-xl font-semibold text-gray-900 dark:text-white border-b border-gray-200 dark:border-gray-700 pb-3">
                      Mots-clés et Classification
                    </h3>
                    
                    <div>
                      <Label htmlFor="keywords" className="text-base font-medium">
                        Mots-clés
                      </Label>
                      <div className="flex space-x-2 mt-2">
                        <Input
                          value={newKeyword}
                          onChange={(e) => setNewKeyword(e.target.value)}
                          placeholder="Ajouter un mot-clé"
                          onKeyPress={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              handleKeywordAdd();
                            }
                          }}
                        />
                        <Button type="button" onClick={handleKeywordAdd} variant="outline">
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                      
                      {keywords.length > 0 && (
                        <div className="flex flex-wrap gap-2 mt-3">
                          {keywords.map((keyword, index) => (
                            <Badge key={index} variant="secondary" className="flex items-center space-x-1">
                              <span>{keyword}</span>
                              <button
                                type="button"
                                onClick={() => handleKeywordRemove(keyword)}
                                className="ml-1 hover:text-red-600"
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>

                    <div>
                      <Label htmlFor="notes" className="text-base font-medium">
                        Notes additionnelles
                      </Label>
                      <Textarea
                        id="notes"
                        value={formData.notes}
                        onChange={(e) => handleInputChange("notes", e.target.value)}
                        placeholder="Notes ou commentaires sur le document (optionnel)"
                        className="min-h-[80px]"
                      />
                    </div>
                  </div>

                  {/* Boutons d'action */}
                  <div className="flex flex-col sm:flex-row gap-4 pt-6 border-t border-gray-200 dark:border-gray-700">
                    <Button
                      type="submit"
                      disabled={isLoading}
                      className="bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white flex-1 sm:flex-none"
                    >
                      {isLoading ? (
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
                          Enregistrer le document
                        </>
                      )}
                    </Button>
                    
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => router.push(`/archives/diplomes/${studentId}`)}
                      className="flex-1 sm:flex-none"
                    >
                      Annuler
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
