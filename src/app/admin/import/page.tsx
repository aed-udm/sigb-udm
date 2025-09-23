'use client';

import { useState, useRef, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import ProtectedLayout from '@/components/layout/protected-layout';
import { PageHeader } from '@/components/ui/page-header';
import { useToast } from '@/hooks/use-toast';
import { Upload, FileText, Download, AlertCircle, CheckCircle, ArrowLeft, Database, BookOpen, GraduationCap, Clipboard } from 'lucide-react';
import { useReliableFormRefresh } from '@/hooks';
import { Progress } from '@/components/ui/progress';
import { useRefresh } from '@/contexts/refresh-context';

interface ImportResult {
  success: boolean;
  total: number;
  imported: number;
  errors: Array<{
    row: number;
    field: string;
    message: string;
    data: any;
  }>;
  duplicates: number;
  message: string;
}

function ImportPageContent() {
  const searchParams = useSearchParams();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [documentType, setDocumentType] = useState<'book' | 'these' | 'memoire' | 'rapport_stage'>('book');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [previewData, setPreviewData] = useState<any[]>([]);
  const [showPreview, setShowPreview] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [columnMapping, setColumnMapping] = useState<Record<string, string>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const { performReliableRefresh } = useReliableFormRefresh();

  // Détecter le type de document depuis l'URL
  useEffect(() => {
    const typeParam = searchParams.get('type');
    if (typeParam) {
      // Mapper les paramètres URL vers les types de documents
      const typeMapping: Record<string, 'book' | 'these' | 'memoire' | 'rapport_stage'> = {
        'books': 'book',
        'theses': 'these',
        'memoires': 'memoire',
        'rapports': 'rapport_stage'
      };

      const mappedType = typeMapping[typeParam];
      if (mappedType) {
        setDocumentType(mappedType);
      }
    }
  }, [searchParams]);

  const documentTypeLabels = {
    book: 'Livres',
    these: 'Thèses',
    memoire: 'Mémoires',
    rapport_stage: 'Rapports de Stage'
  };

  // Titre contextuel selon le type de document
  const getPageTitle = () => {
    const typeParam = searchParams.get('type');
    if (typeParam) {
      const typeLabels: Record<string, string> = {
        'books': 'Import de Livres',
        'theses': 'Import de Documents Académiques',
        'memoires': 'Import de Mémoires',
        'rapports': 'Import de Rapports de Stage'
      };
      return typeLabels[typeParam] || 'Import Massif de Documents';
    }
    return 'Import Massif de Documents';
  };

  const getPageDescription = () => {
    const typeParam = searchParams.get('type');
    if (typeParam) {
      const descriptions: Record<string, string> = {
        'books': 'Importez votre collection de livres via fichiers CSV ou Excel',
        'theses': 'Importez vos thèses, mémoires et rapports de stage via fichiers CSV ou Excel',
        'memoires': 'Importez vos mémoires via fichiers CSV ou Excel',
        'rapports': 'Importez vos rapports de stage via fichiers CSV ou Excel'
      };
      return descriptions[typeParam] || 'Importez vos documents en masse via fichiers CSV ou Excel';
    }
    return 'Importez vos documents en masse via fichiers CSV ou Excel';
  };

  // Filtrer les types de documents selon le contexte
  const getAvailableDocumentTypes = () => {
    const typeParam = searchParams.get('type');

    const allTypes = [
      { value: 'book', label: 'Livres', icon: BookOpen, color: 'text-blue-600' },
      { value: 'these', label: 'Thèses', icon: GraduationCap, color: 'text-pink-600' },
      { value: 'memoire', label: 'Mémoires', icon: FileText, color: 'text-green-600' },
      { value: 'rapport_stage', label: 'Rapports de Stage', icon: Clipboard, color: 'text-gray-600' }
    ];

    if (typeParam === 'books') {
      // Depuis la page Livres : seul le type "Livres"
      return allTypes.filter(type => type.value === 'book');
    } else if (typeParam === 'theses') {
      // Depuis la page Thèses : les 3 types académiques
      return allTypes.filter(type => ['these', 'memoire', 'rapport_stage'].includes(type.value));
    }

    // Par défaut : tous les types
    return allTypes;
  };

  const requiredFields = {
    book: ['mfn', 'title', 'main_author', 'total_copies'],
    these: ['title', 'main_author', 'director', 'target_degree', 'defense_year'],
    memoire: ['title', 'main_author', 'director', 'target_degree', 'defense_year'],
    rapport_stage: ['title', 'main_author', 'director', 'target_degree', 'defense_year']
  };

  const optionalFields = {
    book: ['subtitle', 'secondary_author', 'publisher', 'publication_city', 'publication_year', 'edition', 'domain', 'collection', 'acquisition_mode', 'price', 'available_copies', 'summary', 'keywords'],
    these: ['co_director', 'specialty', 'university', 'faculty', 'department', 'pagination', 'summary', 'keywords', 'abstract', 'keywords_en'],
    memoire: ['co_director', 'specialty', 'university', 'faculty', 'department', 'pagination', 'summary', 'keywords', 'abstract', 'keywords_en'],
    rapport_stage: ['co_director', 'specialty', 'university', 'faculty', 'department', 'pagination', 'summary', 'keywords', 'abstract', 'keywords_en']
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Vérifier le type de fichier
    const allowedTypes = [
      'text/csv',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ];

    if (!allowedTypes.includes(file.type) && !file.name.endsWith('.csv') && !file.name.endsWith('.xlsx')) {
      toast({
        title: "Type de fichier non supporté",
        description: "Veuillez sélectionner un fichier CSV ou Excel (.xlsx)",
        variant: "destructive",
      });
      return;
    }

    setSelectedFile(file);
    setShowPreview(false);
    setImportResult(null);
  };

  const handlePreview = async () => {
    if (!selectedFile) return;

    setIsUploading(true);
    const formData = new FormData();
    formData.append('file', selectedFile);
    formData.append('document_type', documentType);
    formData.append('preview_only', 'true');

    try {
      const response = await fetch('/api/admin/import', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (response.ok) {
        setPreviewData(data.preview || []);
        setShowPreview(true);
        
        // Auto-mapping intelligent des colonnes
        if (data.headers) {
          const mapping: Record<string, string> = {};
          const headers = data.headers.map((h: string) => h.toLowerCase().trim());
          const originalHeaders = data.headers;

          // Fonction de correspondance intelligente
          const findBestMatch = (field: string): string | null => {
            const fieldLower = field.toLowerCase();

            // Correspondances spécifiques étendues
            const mappings: Record<string, string[]> = {
              'mfn': ['mfn', 'numero', 'number', 'id', 'identifiant'],
              'title': ['title', 'titre', 'nom', 'intitule', 'sujet'],
              'main_author': ['main_author', 'auteur_principal', 'auteur', 'author', 'candidat', 'etudiant'],
              'secondary_author': ['secondary_author', 'auteur_secondaire', 'co_auteur', 'coauteur'],
              'director': ['director', 'directeur', 'superviseur', 'encadreur', 'promoteur'],
              'co_director': ['co_director', 'co_directeur', 'codirecteur', 'co-directeur'],
              'publisher': ['publisher', 'editeur', 'maison_edition', 'edition'],
              'publication_year': ['publication_year', 'annee_publication', 'year', 'annee', 'date'],
              'publication_city': ['publication_city', 'ville_publication', 'ville', 'lieu'],
              'total_copies': ['total_copies', 'exemplaires_total', 'nombre_exemplaires', 'copies', 'exemplaires'],
              'available_copies': ['available_copies', 'exemplaires_disponibles', 'disponibles', 'dispo'],
              'target_degree': ['target_degree', 'diplome_vise', 'diplome', 'degree', 'niveau', 'grade'],
              'specialty': ['specialty', 'specialite', 'discipline', 'filiere', 'domaine'],
              'defense_year': ['defense_year', 'annee_soutenance', 'soutenance', 'defense', 'annee_defense'],
              'university': ['university', 'universite', 'etablissement', 'institution', 'univ'],
              'faculty': ['faculty', 'faculte', 'ecole', 'departement'],
              'department': ['department', 'departement', 'dept', 'service'],
              'domain': ['domain', 'domaine', 'secteur', 'champ'],
              'collection': ['collection', 'serie', 'ensemble'],
              'edition': ['edition', 'version', 'tirage'],
              'acquisition_mode': ['acquisition_mode', 'mode_acquisition', 'acquisition', 'provenance'],
              'price': ['price', 'prix', 'cout', 'montant', 'valeur'],
              'pagination': ['pagination', 'pages', 'nb_pages', 'nombre_pages'],
              'summary': ['summary', 'resume', 'description', 'abstract', 'synthese'],
              'keywords': ['keywords', 'mots_cles', 'tags', 'mots-cles', 'descripteurs'],
              'abstract': ['abstract', 'resume_en', 'abstract_en', 'summary_en'],
              'keywords_en': ['keywords_en', 'mots_cles_en', 'tags_en', 'keywords_english']
            };

            const fieldMappings = mappings[fieldLower] || [fieldLower];

            // 1. Correspondance exacte
            for (const mapping of fieldMappings) {
              const exactMatch = headers.findIndex((h: string) => h === mapping);
              if (exactMatch !== -1) {
                return originalHeaders[exactMatch];
              }
            }

            // 2. Correspondance par inclusion (contient le terme)
            for (const mapping of fieldMappings) {
              const includesMatch = headers.findIndex((h: string) => h.includes(mapping) || mapping.includes(h));
              if (includesMatch !== -1) {
                return originalHeaders[includesMatch];
              }
            }

            // 3. Correspondance par similarité (mots partiels)
            for (const mapping of fieldMappings) {
              const partialMatch = headers.findIndex((h: string) => {
                const words = h.split(/[_\s-]+/);
                const mappingWords = mapping.split(/[_\s-]+/);
                return words.some((word: string) => mappingWords.some((mWord: string) =>
                  word.includes(mWord) || mWord.includes(word)
                ));
              });
              if (partialMatch !== -1) {
                return originalHeaders[partialMatch];
              }
            }

            return null;
          };

          // Mapper d'abord les champs requis
          requiredFields[documentType].forEach(field => {
            const match = findBestMatch(field);
            if (match) {
              mapping[field] = match;
            }
          });

          // Puis les champs optionnels
          optionalFields[documentType].forEach(field => {
            const match = findBestMatch(field);
            if (match && !Object.values(mapping).includes(match)) { // Éviter les doublons
              mapping[field] = match;
            }
          });

          setColumnMapping(mapping);

          // Afficher un message de debug pour voir ce qui a été mappé
          console.log('🎯 Auto-mapping résultats:', mapping);
          console.log('📋 Headers disponibles:', originalHeaders);
          console.log('✅ Champs requis mappés:', requiredFields[documentType].filter(f => mapping[f]));
          console.log('❌ Champs requis manquants:', requiredFields[documentType].filter(f => !mapping[f]));

          // Message de succès pour l'auto-mapping
          const mappedRequired = requiredFields[documentType].filter(f => mapping[f]).length;
          const totalRequired = requiredFields[documentType].length;
          const mappedOptional = optionalFields[documentType].filter(f => mapping[f]).length;

          if (mappedRequired === totalRequired) {
            toast({
              title: "🎯 Auto-mapping réussi !",
              description: `Tous les champs requis (${mappedRequired}/${totalRequired}) et ${mappedOptional} champs optionnels ont été mappés automatiquement.`,
            });
          } else {
            toast({
              title: "⚠️ Auto-mapping partiel",
              description: `${mappedRequired}/${totalRequired} champs requis mappés. Veuillez compléter manuellement les champs manquants.`,
              variant: "destructive",
            });
          }
        }

        toast({
          title: "Prévisualisation générée",
          description: `${data.preview?.length || 0} lignes détectées`,
        });
      } else {
        throw new Error(data.error || 'Erreur lors de la prévisualisation');
      }
    } catch (error) {
      toast({
        title: "Erreur",
        description: error instanceof Error ? error.message : "Erreur lors de la prévisualisation",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleImport = async () => {
    if (!selectedFile || !showPreview) return;

    setIsUploading(true);
    setUploadProgress(0);

    const formData = new FormData();
    formData.append('file', selectedFile);
    formData.append('document_type', documentType);
    formData.append('column_mapping', JSON.stringify(columnMapping));

    try {
      const response = await fetch('/api/admin/import', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (response.ok) {
        setImportResult(data);
        setUploadProgress(100);
        
        if (data.errors?.length > 0) {
          toast({
            title: "Import terminé avec avertissements",
            description: `${data.imported}/${data.total} documents importés avec succès, ${data.errors.length} erreurs`,
            variant: "destructive",
          });
        } else {
          toast({
            title: "Import terminé",
            description: `${data.imported}/${data.total} documents importés avec succès`,
          });
        }

        // 🚀 RAFRAÎCHISSEMENT FIABLE - Notifier toutes les interfaces après import
        await performReliableRefresh(`Import ${documentType} (${data.imported} documents)`);
      } else {
        throw new Error(data.error || 'Erreur lors de l\'import');
      }
    } catch (error) {
      toast({
        title: "Erreur d'import",
        description: error instanceof Error ? error.message : "Erreur lors de l'import",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const downloadTemplate = () => {
    const templateFiles = {
      book: '/templates/books_template.csv',
      these: '/templates/theses_template.csv',
      memoire: '/templates/memoires_template.csv',
      rapport_stage: '/templates/rapports_stage_template.csv'
    };

    const templateUrl = templateFiles[documentType];
    const a = document.createElement('a');
    a.href = templateUrl;
    a.download = `template_${documentType}.csv`;
    a.click();
  };

  return (
    <ProtectedLayout>
      <div className="bg-gray-50 dark:bg-gray-900 min-h-screen">
        <PageHeader
          title={getPageTitle()}
          description={getPageDescription()}
          icon={Database}
          backHref="/dashboard"
          iconColor="text-green-600"
          actions={
            <div className="flex gap-2">
              <Button onClick={downloadTemplate} variant="outline">
                <Download className="h-4 w-4 mr-2" />
                Télécharger Template
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="bg-green-100 dark:bg-green-700 border border-green-300 dark:border-green-600 hover:bg-green-200 dark:hover:bg-green-600 hover:border-green-400 dark:hover:border-green-500 transition-all duration-200 font-medium text-green-700 dark:text-green-200"
              >
                Actualiser
              </Button>
            </div>
          }
        />

        <div className="container mx-auto px-3 sm:px-4 md:px-6 py-4 sm:py-6 md:py-7 lg:py-8">
          <motion.div
            initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.5 }}
            className="space-y-6"
          >

            {/* Sélection du type de document */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Database className="h-5 w-5" />
                  <span>Type de Document</span>
                </CardTitle>
                <CardDescription>
                  Choisissez le type de documents à importer
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className={`grid gap-4 ${getAvailableDocumentTypes().length === 1 ? 'grid-cols-1 max-w-xs mx-auto' : getAvailableDocumentTypes().length === 3 ? 'grid-cols-1 md:grid-cols-3' : 'grid-cols-2 md:grid-cols-4'}`}>
                  {getAvailableDocumentTypes().map((type) => (
                    <button
                      key={type.value}
                      type="button"
                      onClick={() => setDocumentType(type.value as any)}
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

            {/* Upload de fichier */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Upload className="h-5 w-5" />
                  <span>Sélection du Fichier</span>
                </CardTitle>
                <CardDescription>
                  Formats supportés : CSV, Excel (.xlsx)
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-8 text-center bg-gray-50 dark:bg-gray-800 hover:border-green-400 dark:hover:border-green-500 transition-all duration-300">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".csv,.xlsx"
                      onChange={handleFileSelect}
                      className="hidden"
                    />

                    {selectedFile ? (
                      <motion.div
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="space-y-3"
                      >
                        <div className="p-3 bg-green-100 dark:bg-green-800/90 rounded-full w-fit mx-auto">
                          <FileText className="h-12 w-12 text-green-600" />
                        </div>
                        <p className="font-semibold text-lg">{selectedFile.name}</p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                        </p>
                        <Button
                          variant="outline"
                          onClick={() => fileInputRef.current?.click()}
                        >
                          <Upload className="h-4 w-4 mr-2" />
                          Changer de fichier
                        </Button>
                      </motion.div>
                    ) : (
                      <div className="space-y-4">
                        <div className="p-4 bg-green-100 dark:bg-green-800/90 rounded-full w-fit mx-auto">
                          <Upload className="h-12 w-12 text-green-600" />
                        </div>
                        <div>
                          <p className="text-lg font-semibold text-gray-700 dark:text-gray-300">Glissez votre fichier ici</p>
                          <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">ou</p>
                        </div>
                        <Button
                          onClick={() => fileInputRef.current?.click()}
                        >
                          <FileText className="h-4 w-4 mr-2" />
                          Sélectionner un fichier
                        </Button>
                      </div>
                    )}
                  </div>

                  {selectedFile && !showPreview && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.2 }}
                    >
                      <Button
                        onClick={handlePreview}
                        disabled={isUploading}
                        className="w-full"
                      >
                        {isUploading ? (
                          <div className="flex items-center space-x-2">
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                            <span>Analyse en cours...</span>
                          </div>
                        ) : (
                          <>
                            <CheckCircle className="h-4 w-4 mr-2" />
                            Prévisualiser
                          </>
                        )}
                      </Button>
                    </motion.div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Prévisualisation et mapping */}
            {showPreview && (
              <motion.div
                initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.3 }}
              >
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <CheckCircle className="h-5 w-5" />
                        <span>Mapping des Colonnes</span>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                  // Relancer l'auto-mapping
                  if (previewData[0]) {
                    const headers = Object.keys(previewData[0]);

                    // Réutiliser la logique d'auto-mapping
                    const mapping: Record<string, string> = {};
                    const headersLower = headers.map((h: string) => h.toLowerCase().trim());

                    const findBestMatch = (field: string): string | null => {
                      const fieldLower = field.toLowerCase();

                      const mappings: Record<string, string[]> = {
                        'mfn': ['mfn', 'numero', 'number', 'id', 'identifiant'],
                        'title': ['title', 'titre', 'nom', 'intitule', 'sujet'],
                        'main_author': ['main_author', 'auteur_principal', 'auteur', 'author', 'candidat', 'etudiant'],
                        'secondary_author': ['secondary_author', 'auteur_secondaire', 'co_auteur', 'coauteur'],
                        'director': ['director', 'directeur', 'superviseur', 'encadreur', 'promoteur'],
                        'co_director': ['co_director', 'co_directeur', 'codirecteur', 'co-directeur'],
                        'publisher': ['publisher', 'editeur', 'maison_edition', 'edition'],
                        'publication_year': ['publication_year', 'annee_publication', 'year', 'annee', 'date'],
                        'publication_city': ['publication_city', 'ville_publication', 'ville', 'lieu'],
                        'total_copies': ['total_copies', 'exemplaires_total', 'nombre_exemplaires', 'copies', 'exemplaires'],
                        'available_copies': ['available_copies', 'exemplaires_disponibles', 'disponibles', 'dispo'],
                        'target_degree': ['target_degree', 'diplome_vise', 'diplome', 'degree', 'niveau', 'grade'],
                        'specialty': ['specialty', 'specialite', 'discipline', 'filiere', 'domaine'],
                        'defense_year': ['defense_year', 'annee_soutenance', 'soutenance', 'defense', 'annee_defense'],
                        'university': ['university', 'universite', 'etablissement', 'institution', 'univ'],
                        'faculty': ['faculty', 'faculte', 'ecole', 'departement'],
                        'department': ['department', 'departement', 'dept', 'service'],
                        'domain': ['domain', 'domaine', 'secteur', 'champ'],
                        'collection': ['collection', 'serie', 'ensemble'],
                        'edition': ['edition', 'version', 'tirage'],
                        'acquisition_mode': ['acquisition_mode', 'mode_acquisition', 'acquisition', 'provenance'],
                        'price': ['price', 'prix', 'cout', 'montant', 'valeur'],
                        'pagination': ['pagination', 'pages', 'nb_pages', 'nombre_pages'],
                        'summary': ['summary', 'resume', 'description', 'abstract', 'synthese'],
                        'keywords': ['keywords', 'mots_cles', 'tags', 'mots-cles', 'descripteurs'],
                        'abstract': ['abstract', 'resume_en', 'abstract_en', 'summary_en'],
                        'keywords_en': ['keywords_en', 'mots_cles_en', 'tags_en', 'keywords_english']
                      };

                      const fieldMappings = mappings[fieldLower] || [fieldLower];

                      for (const mapping of fieldMappings) {
                        const exactMatch = headersLower.findIndex((h: string) => h === mapping);
                        if (exactMatch !== -1) return headers[exactMatch];
                      }

                      for (const mapping of fieldMappings) {
                        const includesMatch = headersLower.findIndex((h: string) => h.includes(mapping) || mapping.includes(h));
                        if (includesMatch !== -1) return headers[includesMatch];
                      }

                      return null;
                    };

                    [...requiredFields[documentType], ...optionalFields[documentType]].forEach(field => {
                      const match = findBestMatch(field);
                      if (match && !Object.values(mapping).includes(match)) {
                        mapping[field] = match;
                      }
                    });

                    setColumnMapping(mapping);

                    const mappedRequired = requiredFields[documentType].filter(f => mapping[f]).length;
                    const totalRequired = requiredFields[documentType].length;

                    if (mappedRequired === totalRequired) {
                      toast({
                        title: "🔄 Auto-mapping relancé",
                        description: `${mappedRequired}/${totalRequired} champs requis mappés automatiquement.`,
                      });
                    } else {
                      toast({
                        title: "🔄 Auto-mapping partiel",
                        description: `${mappedRequired}/${totalRequired} champs requis mappés automatiquement.`,
                        variant: "destructive",
                      });
                    }
                  }
                }}
              >
                🎯 Auto-mapper
              </Button>
            </CardTitle>
            <CardDescription>
              Associez les colonnes de votre fichier aux champs requis. L'auto-mapping intelligent est activé par défaut.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Champs requis */}
              <div>
                <h4 className="font-medium mb-3 text-red-600">Champs Requis *</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {requiredFields[documentType].map((field) => (
                    <div key={field} className="space-y-2">
                      <Label htmlFor={field} className="text-red-700">
                        {field === 'mfn' ? 'MFN (Numéro du fichier maître)' :
                         field === 'title' ? 'Titre' :
                         field === 'main_author' ? 'Auteur Principal' :
                         field === 'director' ? 'Directeur/Superviseur' :
                         field === 'target_degree' ? 'Diplôme/Niveau Visé' :
                         field === 'defense_year' ? 'Année de Soutenance' :
                         field === 'total_copies' ? 'Nombre Total d\'Exemplaires' :
                         field} *
                      </Label>
                      <Select
                        value={columnMapping[field] || ''}
                        onValueChange={(value: string) => setColumnMapping(prev => ({ ...prev, [field]: value }))}
                      >
                        <SelectTrigger className={`${columnMapping[field] ? 'border-green-500 bg-green-50 dark:bg-green-800/90' : 'border-red-300 bg-red-50 dark:bg-red-800/90'}`}>
                          <SelectValue placeholder="⚠️ Champ requis - Sélectionner une colonne" />
                        </SelectTrigger>
                        <SelectContent>
                          {previewData[0] && Object.keys(previewData[0]).map((header) => (
                            <SelectItem key={header} value={header}>
                              {header}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  ))}
                </div>
              </div>

              {/* Champs optionnels */}
              <div>
                <h4 className="font-medium mb-3 text-green-600">Champs Optionnels</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {optionalFields[documentType].map((field) => (
                    <div key={field} className="space-y-2">
                      <Label htmlFor={field} className="text-green-700">
                        {field === 'subtitle' ? 'Sous-titre' :
                         field === 'secondary_author' ? 'Auteur Secondaire' :
                         field === 'co_director' ? 'Co-directeur' :
                         field === 'publisher' ? 'Éditeur' :
                         field === 'publication_year' ? 'Année de Publication' :
                         field === 'publication_city' ? 'Ville d\'Édition' :
                         field === 'available_copies' ? 'Exemplaires Disponibles' :
                         field === 'specialty' ? 'Spécialité/Discipline' :
                         field === 'university' ? 'Université' :
                         field === 'faculty' ? 'Faculté/École' :
                         field === 'department' ? 'Département' :
                         field === 'domain' ? 'Domaine Académique' :
                         field === 'collection' ? 'Collection' :
                         field === 'edition' ? 'Édition' :
                         field === 'acquisition_mode' ? 'Mode d\'Acquisition' :
                         field === 'price' ? 'Prix (FCFA)' :
                         field === 'pagination' ? 'Pagination' :
                         field === 'summary' ? 'Résumé' :
                         field === 'keywords' ? 'Mots-clés' :
                         field === 'abstract' ? 'Résumé en Anglais' :
                         field === 'keywords_en' ? 'Mots-clés en Anglais' :
                         field}
                      </Label>
                      <Select
                        value={columnMapping[field] || ''}
                        onValueChange={(value: string) => {
                          if (value === '__IGNORE__') {
                            setColumnMapping(prev => {
                              const newMapping = { ...prev };
                              delete newMapping[field];
                              return newMapping;
                            });
                          } else {
                            setColumnMapping(prev => ({ ...prev, [field]: value }));
                          }
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Optionnel - Sélectionner une colonne" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__IGNORE__">-- Ignorer ce champ --</SelectItem>
                          {previewData[0] && Object.keys(previewData[0]).map((header) => (
                            <SelectItem key={header} value={header}>
                              {header}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  ))}
                </div>
              </div>

              {/* Prévisualisation des données */}
              <div className="mt-6">
                <h4 className="font-medium mb-3">Prévisualisation (5 premières lignes)</h4>
                <div className="overflow-x-auto">
                  <table className="w-full border border-gray-200 dark:border-gray-700 rounded-lg">
                    <thead className="bg-gray-50 dark:bg-gray-800">
                      <tr>
                        {previewData[0] && Object.keys(previewData[0]).map((header) => (
                          <th key={header} className="px-4 py-2 text-left text-sm font-medium text-gray-900 dark:text-gray-100">
                            {header}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {previewData.slice(0, 5).map((row, index) => (
                        <tr key={index} className="border-t border-gray-200 dark:border-gray-700">
                          {Object.values(row).map((value: any, cellIndex) => (
                            <td key={cellIndex} className="px-4 py-2 text-sm text-gray-900 dark:text-gray-100">
                              {String(value).substring(0, 50)}
                              {String(value).length > 50 ? '...' : ''}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Validation des champs requis */}
              {(() => {
                const missingFields = requiredFields[documentType].filter(field => !columnMapping[field]);
                return missingFields.length > 0 && (
                  <div className="p-4 bg-yellow-50 dark:bg-yellow-800/90 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <AlertCircle className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
                      <span className="font-medium text-yellow-800 dark:text-yellow-200">Champs requis manquants</span>
                    </div>
                    <p className="text-sm text-yellow-700 dark:text-yellow-300">
                      Veuillez mapper les champs suivants avant de pouvoir importer :
                      <strong> {missingFields.map(field =>
                        field === 'title' ? 'Titre' :
                        field === 'main_author' ? 'Auteur Principal' :
                        field === 'director' ? 'Directeur/Superviseur' :
                        field === 'target_degree' ? 'Diplôme/Niveau Visé' :
                        field === 'defense_year' ? 'Année de Soutenance' :
                        field === 'mfn' ? 'MFN' :
                        field === 'total_copies' ? 'Nombre Total d\'Exemplaires' :
                        field
                      ).join(', ')}</strong>
                    </p>
                  </div>
                );
              })()}

              <div className="flex justify-end space-x-4">
                <Button
                  variant="outline"
                  onClick={() => setShowPreview(false)}
                >
                  Retour
                </Button>
                <Button
                  onClick={handleImport}
                  disabled={isUploading || !requiredFields[documentType].every(field => columnMapping[field])}
                >
                  {isUploading ? (
                    <div className="flex items-center space-x-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      <span>Import en cours...</span>
                    </div>
                  ) : (
                    <>
                      <Upload className="h-4 w-4 mr-2" />
                      Importer {previewData.length} documents
                    </>
                  )}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
              </motion.div>
            )}

      {/* Barre de progression */}
      {isUploading && uploadProgress > 0 && (
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Import en cours...</span>
                <span>{uploadProgress}%</span>
              </div>
              <Progress value={uploadProgress} />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Résultats d'import */}
      {importResult && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {importResult.success ? (
                <CheckCircle className="h-5 w-5 text-green-500" />
              ) : (
                <AlertCircle className="h-5 w-5 text-red-500" />
              )}
              Résultats de l'Import
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">{importResult.total}</div>
                  <div className="text-sm text-green-600">Total</div>
                </div>
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">{importResult.imported}</div>
                  <div className="text-sm text-green-600">Importés</div>
                </div>
                <div className="text-center p-4 bg-red-50 rounded-lg">
                  <div className="text-2xl font-bold text-red-600">{importResult.errors?.length || 0}</div>
                  <div className="text-sm text-red-600">Erreurs</div>
                </div>
                <div className="text-center p-4 bg-yellow-50 rounded-lg">
                  <div className="text-2xl font-bold text-yellow-600">{importResult.duplicates || 0}</div>
                  <div className="text-sm text-yellow-600">Doublons</div>
                </div>
              </div>

              {importResult.errors && importResult.errors.length > 0 && (
                <div className="mt-6">
                  <h4 className="font-medium mb-3 text-red-600">Erreurs détectées</h4>
                  <div className="max-h-60 overflow-y-auto space-y-2">
                    {importResult.errors.slice(0, 10).map((error, index) => (
                      <div key={index} className="p-3 bg-red-50 border border-red-200 rounded">
                        <div className="text-sm">
                          <strong>Ligne {error.row}:</strong> {error.message}
                        </div>
                        {error.field && (
                          <div className="text-xs text-red-600 mt-1">
                            Champ: {error.field}
                          </div>
                        )}
                      </div>
                    ))}
                    {importResult.errors.length > 10 && (
                      <div className="text-sm text-gray-500 text-center">
                        ... et {importResult.errors.length - 10} autres erreurs
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="flex justify-end">
                <Button
                  onClick={() => {
                    setSelectedFile(null);
                    setShowPreview(false);
                    setImportResult(null);
                    setColumnMapping({});
                  }}
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Nouvel Import
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
          </motion.div>
        </div>
      </div>
    </ProtectedLayout>
  );
}

export default function ImportPage() {
  return (
    <Suspense fallback={<div>Chargement...</div>}>
      <ImportPageContent />
    </Suspense>
  );
}
