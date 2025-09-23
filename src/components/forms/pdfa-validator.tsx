"use client";

import { useState, useEffect, useRef } from "react";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { FileCheck, AlertTriangle, CheckCircle, XCircle, RefreshCw, Shield, Upload, File, X } from "lucide-react";
import { PDFAValidationResult as ServicePDFAValidationResult, PDFArchivalService } from "@/lib/services/pdf-archival-service";

interface PDFAValidatorProps {
  file?: File | null;
  onValidationResult?: (result: ServicePDFAValidationResult) => void;
  autoValidate?: boolean;
  // Nouvelles props pour l'interface complète
  label?: string;
  onFileSelect?: (file: File | null) => void;
  selectedFile?: File | null;
  uploadedFileInfo?: any;
  enableValidation?: boolean;
  dicamesCompliance?: boolean;
  required?: boolean;
}

type PDFAValidationResult = ServicePDFAValidationResult;

export function PDFAValidator({
  file,
  onValidationResult,
  autoValidate = true,
  label = "Document numérique",
  onFileSelect,
  selectedFile,
  uploadedFileInfo,
  enableValidation = true,
  dicamesCompliance = true,
  required = false
}: PDFAValidatorProps) {
  const [isValidating, setIsValidating] = useState(false);
  const [validationResult, setValidationResult] = useState<ServicePDFAValidationResult | null>(null);
  const [progress, setProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Utiliser selectedFile si fourni, sinon file
  const currentFile = selectedFile || file;

  useEffect(() => {
    if (currentFile && autoValidate) {
      validatePDFAFile();
    }
  }, [currentFile, autoValidate]);

  // Fonction pour gérer la sélection de fichier
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] || null;
    if (onFileSelect) {
      onFileSelect(file);
    }
  };

  // Fonction pour ouvrir le sélecteur de fichier
  const openFileSelector = () => {
    fileInputRef.current?.click();
  };

  // Fonction pour supprimer le fichier sélectionné
  const removeFile = () => {
    if (onFileSelect) {
      onFileSelect(null);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const validatePDFAFile = async () => {
    if (!currentFile) return;

    setIsValidating(true);
    setProgress(0);

    try {
      // Simulation de validation PDF/A (à remplacer par une vraie validation)
      const result = await performRealPDFAValidation(currentFile);
      setValidationResult(result);
      if (onValidationResult) {
        onValidationResult(result);
      }
    } catch (error) {
      console.error('Erreur validation PDF/A:', error);
      const errorResult: PDFAValidationResult = {
        isValid: false,
        errors: [{
          code: 'VALIDATION_ERROR',
          message: 'Erreur lors de la validation du fichier',
          severity: 'critical',
          suggestion: 'Vérifier l\'intégrité du fichier'
        }],
        warnings: [],
        metadata: {
          hasXMPMetadata: false,
          fontsEmbedded: false,
          totalFonts: 0,
          embeddedFonts: 0,
          hasTransparency: false,
          hasJavaScript: false,
          hasEncryption: false,
          hasAnnotations: false,
          pageCount: 0,
          colorSpace: 'Unknown'
        },
        dicamesCompliance: {
          isCompliant: false,
          level: 'Non-compliant',
          score: 0,
          requirements: {
            maxFileSize: false,
            fontsEmbedded: false,
            noJavaScript: false,
            noEncryption: false,
            hasMetadata: false,
            validStructure: false
          },
          recommendations: ['Validation impossible']
        },
        validationDate: new Date().toISOString(),
        processingTime: 0
      };
      setValidationResult(errorResult);
      onValidationResult?.(errorResult);
    } finally {
      setIsValidating(false);
    }
  };

  const performRealPDFAValidation = async (file: File): Promise<PDFAValidationResult> => {
    // Convertir le fichier en Buffer pour la validation
    const arrayBuffer = await file.arrayBuffer();
    const fileBuffer = Buffer.from(arrayBuffer);
    
    // Utiliser le service de validation PDF/A réel
    return await PDFArchivalService.validatePDFA(fileBuffer, file.name);
  };

  const formatFileSize = (bytes: number): string => {
    const mb = bytes / 1024 / 1024;
    return `${mb.toFixed(1)} MB`;
  };

  // Interface d'upload si aucun fichier sélectionné
  if (!currentFile) {
    return (
      <div className="space-y-4">
        {label && (
          <Label className="text-sm font-medium">
            {label} {required && <span className="text-red-500">*</span>}
          </Label>
        )}

        <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-6 text-center hover:border-green-400 dark:hover:border-green-500 transition-colors">
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf"
            onChange={handleFileSelect}
            className="hidden"
          />

          <div className="space-y-4">
            <div className="flex justify-center">
              <Upload className="h-12 w-12 text-gray-400" />
            </div>

            <div className="space-y-2">
              <p className="text-sm font-medium text-gray-900 dark:text-white">
                Sélectionner un document PDF
              </p>
              <p className="text-xs text-gray-600 dark:text-gray-300">
                Format PDF/A recommandé pour l'archivage DICAMES
              </p>
            </div>

            <Button
              type="button"
              variant="outline"
              onClick={openFileSelector}
              className="bg-green-50 dark:bg-green-800/90 border-green-300 dark:border-green-700 hover:bg-green-100 dark:hover:bg-green-900/40"
            >
              <Upload className="h-4 w-4 mr-2" />
              Choisir un fichier
            </Button>
          </div>
        </div>

        {dicamesCompliance && (
          <div className="bg-green-50 dark:bg-green-800/90 p-3 rounded-lg">
            <div className="flex items-start space-x-2">
              <Shield className="h-4 w-4 text-purple-600 mt-0.5" />
              <div className="text-xs text-purple-700 dark:text-gray-300">
                <p className="font-medium">Conformité DICAMES requise</p>
                <p>Le document sera validé selon les standards d'archivage CAMES/DICAMES</p>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* En-tête */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Shield className="h-5 w-5 text-green-600" />
          <Label className="text-base font-semibold">
            {label || "Validation PDF/A"}
          </Label>
          {dicamesCompliance && (
            <Badge variant="outline" className="text-xs">
              DICAMES
            </Badge>
          )}
        </div>

        <div className="flex items-center space-x-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={validatePDFAFile}
            disabled={isValidating}
          >
            {isValidating ? (
              <RefreshCw className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <FileCheck className="h-4 w-4 mr-2" />
            )}
            {isValidating ? 'Validation...' : 'Valider'}
          </Button>

          {onFileSelect && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={removeFile}
              className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Informations du fichier */}
      <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center space-x-2">
            <File className="h-4 w-4 text-green-600" />
            <span className="font-medium text-sm">Fichier sélectionné</span>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="font-medium">Nom:</span> {currentFile.name}
          </div>
          <div>
            <span className="font-medium">Taille:</span> {formatFileSize(currentFile.size)}
          </div>
          <div>
            <span className="font-medium">Type:</span> {currentFile.type}
          </div>
          <div>
            <span className="font-medium">Limite DICAMES:</span> 50 MB
          </div>
        </div>
      </div>

      {/* Barre de progression */}
      {isValidating && (
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Validation en cours...</span>
            <span>{progress}%</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>
      )}

      {/* Résultats de validation */}
      {validationResult && !isValidating && (
        <div className="space-y-4">
          {/* Statut global */}
          <div className={`p-4 rounded-lg border ${
            validationResult.isValid 
              ? 'bg-green-50 border-green-200 dark:bg-green-800/90 dark:border-green-800'
              : 'bg-red-50 border-red-200 dark:bg-red-800/90 dark:border-red-800'
          }`}>
            <div className="flex items-center space-x-2">
              {validationResult.isValid ? (
                <CheckCircle className="h-5 w-5 text-green-600" />
              ) : (
                <XCircle className="h-5 w-5 text-red-600" />
              )}
              <div>
                <h3 className={`font-semibold ${
                  validationResult.isValid ? 'text-green-800 dark:text-green-200' : 'text-red-800 dark:text-red-200'
                }`}>
                  {validationResult.isValid ? 'Fichier conforme PDF/A' : 'Fichier non conforme PDF/A'}
                </h3>
                {validationResult.dicamesCompliance && (
                  <p className="text-sm text-green-700 dark:text-green-300">
                    Niveau détecté: {validationResult.dicamesCompliance.level}
                  </p>
                )}
                {validationResult.dicamesCompliance && (
                  <Badge variant={validationResult.dicamesCompliance.level.includes('3') ? 'default' : 'secondary'}>
                    {validationResult.dicamesCompliance.level}
                  </Badge>
                )}
              </div>
            </div>
          </div>

          {/* Erreurs */}
          {validationResult.errors.length > 0 && (
            <div className="space-y-2">
              <h4 className="font-medium text-red-800 dark:text-red-200 flex items-center">
                <XCircle className="h-4 w-4 mr-2" />
                Erreurs ({validationResult.errors.length})
              </h4>
              <ul className="space-y-1">
                {validationResult.errors.map((error, index) => (
                  <div key={index} className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                    <div className="font-medium text-red-800 dark:text-red-200">{error.code}</div>
                    <div className="text-red-700 dark:text-red-300">{error.message}</div>
                    <div className="text-sm text-red-600 dark:text-red-400 mt-1">{error.suggestion}</div>
                  </div>
                ))}
              </ul>
            </div>
          )}

          {/* Avertissements */}
          {validationResult.warnings.length > 0 && (
            <div className="space-y-2">
              <h4 className="font-medium text-orange-800 dark:text-gray-200 flex items-center">
                <AlertTriangle className="h-4 w-4 mr-2" />
                Avertissements ({validationResult.warnings.length})
              </h4>
              <ul className="space-y-1">
                {validationResult.warnings.map((warning, index) => (
                  <li key={index} className="text-sm text-orange-700 dark:text-gray-300 flex items-start">
                    <span className="w-2 h-2 bg-orange-500 rounded-full mt-2 mr-2 flex-shrink-0"></span>
                    <div>
                      <div className="font-medium">{warning.code}</div>
                      <div>{warning.message}</div>
                      <div className="text-xs text-orange-600 dark:text-orange-400 mt-1">{warning.recommendation}</div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}


          {/* Recommandations DICAMES */}
          <div className="bg-green-50 dark:bg-green-800/90 p-3 rounded-lg">
            <h4 className="font-medium text-green-800 dark:text-green-200 mb-2">
              Recommandations DICAMES
            </h4>
            <ul className="text-xs text-green-700 dark:text-green-300 space-y-1">
              <li>• Utilisez PDF/A-1b, PDF/A-2b ou PDF/A-3b pour l'archivage pérenne</li>
              <li>• Intégrez toutes les polices dans le document</li>
              <li>• Incluez les métadonnées complètes (titre, auteur, sujet)</li>
              <li>• Limitez la taille à 50 MB maximum</li>
              <li>• Évitez les éléments interactifs et la transparence pour PDF/A-1b</li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
