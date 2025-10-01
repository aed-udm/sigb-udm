"use client";

import { useState, useEffect } from "react";
import { motion } from 'framer-motion';
import {
  GraduationCap,
  ArrowLeft,
  Save,
  Upload,
  FileText,
  User,
  AlertCircle,
  CheckCircle,
  Loader2
} from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import ProtectedLayout from "@/components/layout/protected-layout";
import { useToast } from "@/hooks/use-toast";
import { FileUpload } from "@/components/ui/file-upload";
import { archiveDocumentSchema } from "@/lib/validations";

interface Student {
  id: string;
  full_name: string;
  email: string;
  matricule?: string;
  is_active: boolean;
}

interface Document {
  id: string;
  name: string;
  description?: string;
  category: string;
  file_type: string;
  file_size: number;
  document_path?: string;
  upload_date: string;
  student_id: string;
}

interface DocumentFormData {
  name: string;
  description: string;
  category: string;
}

// Catégories de documents
const documentCategories = [
  { id: "diplomes", name: "Diplômes", icon: GraduationCap },
  { id: "releves", name: "Relevés de Notes", icon: FileText },
  { id: "autres", name: "Autres Documents", icon: FileText }
];

export default function EditDocumentPage() {
  const params = useParams();
  const router = useRouter();
  const studentId = params?.id as string;
  const documentId = params?.documentId as string;
  const { toast } = useToast();

  const [student, setStudent] = useState<Student | null>(null);
  const [document, setDocument] = useState<Document | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const [formData, setFormData] = useState<DocumentFormData>({
    name: "",
    description: "",
    category: ""
  });

  useEffect(() => {
    if (studentId && documentId) {
      fetchData();
    }
  }, [studentId, documentId]);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Charger les données de l'étudiant et du document en parallèle
      const [studentResponse, documentResponse] = await Promise.all([
        fetch(`/api/users/${studentId}`),
        fetch(`/api/archives/documents/${documentId}`)
      ]);

      if (studentResponse.ok) {
        const studentData = await studentResponse.json();
        setStudent(studentData.data);
      }

      if (documentResponse.ok) {
        const documentData = await documentResponse.json();
        const doc = documentData.data;
        setDocument(doc);
        setFormData({
          name: doc.name || "",
          description: doc.description || "",
          category: doc.category || ""
        });
      } else {
        throw new Error('Document non trouvé');
      }
    } catch (error) {
      console.error('Erreur:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les données",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: keyof DocumentFormData, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleFileSelect = (file: File | null) => {
    setSelectedFile(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation côté client avec Zod
    try {
      const validationData = {
        student_id: studentId,
        name: formData.name.trim(),
        description: formData.description.trim(),
        category: formData.category
      };

      archiveDocumentSchema.parse(validationData);
    } catch (error: any) {
      const errorMessage = error.errors?.[0]?.message || "Données invalides";
      toast({
        title: "Erreur de validation",
        description: errorMessage,
        variant: "destructive",
      });
      return;
    }

    try {
      setSaving(true);

      // 1. Mettre à jour les métadonnées du document
      const updateData: any = {
        name: formData.name.trim(),
        description: formData.description.trim(),
      };

      // Si un nouveau fichier est sélectionné, ajouter les informations
      if (selectedFile) {
        updateData.file_type = selectedFile.type;
        updateData.file_size = selectedFile.size;
      }

      const updateResponse = await fetch(`/api/archives/documents/${documentId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateData),
      });

      if (!updateResponse.ok) {
        const errorData = await updateResponse.json();
        throw new Error(errorData.error?.message || 'Erreur lors de la mise à jour');
      }

      // 2. Upload du nouveau fichier si sélectionné
      if (selectedFile) {
        const formData = new FormData();
        formData.append('file', selectedFile);

        const uploadResponse = await fetch(`/api/archives/documents/${documentId}/upload`, {
          method: 'POST',
          body: formData,
        });

        if (!uploadResponse.ok) {
          const errorData = await uploadResponse.json();
          throw new Error(errorData.error?.message || 'Erreur lors de l\'upload du fichier');
        }
      }

      toast({
        title: "Succès",
        description: "Document mis à jour avec succès",
      });

      // Rediriger vers la page de détail de l'étudiant
      router.push(`/archives/diplomes/${studentId}`);

    } catch (error) {
      console.error('Erreur:', error);
      toast({
        title: "Erreur",
        description: "Impossible de mettre à jour le document",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const getCategoryName = (categoryId: string) => {
    const category = documentCategories.find(cat => cat.id === categoryId);
    return category?.name || categoryId;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  if (loading) {
    return (
      <ProtectedLayout>
        <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-gray-50 dark:from-gray-900 dark:via-gray-800 dark:to-green-900 flex items-center justify-center">
          <div className="text-center">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
              className="mb-4"
            >
              <GraduationCap className="h-12 w-12 text-green-600 mx-auto" />
            </motion.div>
            <span className="text-lg font-medium text-gray-600 dark:text-gray-300">
              Chargement...
            </span>
          </div>
        </div>
      </ProtectedLayout>
    );
  }

  if (!student || !document) {
    return (
      <ProtectedLayout>
        <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-gray-50 dark:from-gray-900 dark:via-gray-800 dark:to-green-900 flex items-center justify-center">
          <div className="text-center">
            <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              Document non trouvé
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Le document demandé n'existe pas ou n'est plus accessible.
            </p>
            <Button asChild>
              <Link href={`/archives/diplomes/${studentId}`}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Retour au dossier
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
        {/* Header avec glassmorphism */}
        <motion.div
          className="glass-nav shadow-lg border-b border-white/20 dark:border-gray-700/20 relative overflow-hidden bg-white/95 dark:bg-gray-900/95 backdrop-blur-md"
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.6 }}
        >
          <div className="absolute inset-0 bg-gradient-to-r from-green-500/5 via-transparent to-gray-500/5" />
          <div className="relative z-10 container mx-auto px-4 sm:px-6 py-4 sm:py-6 lg:py-8">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <motion.div
                initial={{ opacity: 0, x: -30 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6, delay: 0.2 }}
                className="flex items-center space-x-3 sm:space-x-4"
              >
                <Button variant="ghost" size="sm" asChild>
                  <Link href={`/archives/diplomes/${studentId}`} className="flex items-center">
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Retour au dossier
                  </Link>
                </Button>
                <FileText className="h-6 w-6 sm:h-8 sm:w-8 text-green-600 flex-shrink-0" />
                <div>
                  <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold bg-gradient-to-r from-slate-800 to-green-600 dark:from-slate-200 dark:to-green-400 bg-clip-text text-transparent">
                    Modifier le document
                  </h1>
                  <p className="text-sm sm:text-base text-gray-600 dark:text-gray-300 mt-1">
                    {student.full_name} - Service des Diplômes
                  </p>
                </div>
              </motion.div>
            </div>
          </div>
        </motion.div>

        <div className="container mx-auto px-4 py-4 sm:py-6 lg:py-8">
          <div className="max-w-4xl mx-auto">
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.1 }}
            >
              <Card className="bg-white/95 dark:bg-gray-800/95 backdrop-blur-xl border-0 shadow-lg">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-xl font-semibold text-gray-900 dark:text-white">
                        Informations du document
                      </CardTitle>
                      <CardDescription>
                        Modifiez les informations et remplacez le fichier si nécessaire
                      </CardDescription>
                    </div>
                    <Badge variant="outline" className="text-green-600 border-green-600">
                      {getCategoryName(document.category)}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Informations de base */}
                    <div className="space-y-4">
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
                        <Label htmlFor="description" className="text-base font-medium">
                          Description
                        </Label>
                        <Textarea
                          id="description"
                          value={formData.description}
                          onChange={(e) => handleInputChange("description", e.target.value)}
                          placeholder="Description détaillée du document (optionnel)"
                          className="min-h-[100px] text-base"
                          rows={4}
                        />
                      </div>
                    </div>

                    {/* Informations du fichier actuel */}
                    {document.document_path && (
                      <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                        <div className="flex items-center space-x-2 mb-3">
                          <CheckCircle className="h-5 w-5 text-green-600" />
                          <span className="font-medium text-green-800 dark:text-green-200">
                            Fichier actuel
                          </span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
                          <div>
                            <span className="text-gray-600 dark:text-gray-400">Type:</span>
                            <span className="ml-2 font-medium">{document.file_type || 'Non spécifié'}</span>
                          </div>
                          <div>
                            <span className="text-gray-600 dark:text-gray-400">Taille:</span>
                            <span className="ml-2 font-medium">{formatFileSize(document.file_size)}</span>
                          </div>
                          <div>
                            <span className="text-gray-600 dark:text-gray-400">Upload:</span>
                            <span className="ml-2 font-medium">
                              {new Date(document.upload_date).toLocaleDateString('fr-FR')}
                            </span>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Upload de nouveau fichier */}
                    <div className="space-y-4">
                      <Label className="text-base font-medium">
                        {document.document_path ? 'Remplacer le fichier (optionnel)' : 'Ajouter un fichier'}
                      </Label>
                      <FileUpload
                        label="Nouveau fichier"
                        accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                        maxSize={50}
                        onFileSelect={handleFileSelect}
                        selectedFile={selectedFile}
                        required={false}
                        description="Formats acceptés: PDF, Word, Images (JPG, PNG) - Taille max: 50MB"
                      />
                    </div>

                    {/* Boutons d'action */}
                    <div className="flex flex-col sm:flex-row gap-3 pt-6 border-t border-gray-200 dark:border-gray-700">
                      <Button
                        type="submit"
                        disabled={saving}
                        className="bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white flex-1 sm:flex-none"
                      >
                        {saving ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Enregistrement...
                          </>
                        ) : (
                          <>
                            <Save className="h-4 w-4 mr-2" />
                            Enregistrer les modifications
                          </>
                        )}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => router.push(`/archives/diplomes/${studentId}`)}
                        disabled={saving}
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
      </div>
    </ProtectedLayout>
  );
}
