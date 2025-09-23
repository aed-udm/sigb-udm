"use client";

import { useState, useRef } from "react";
import { motion } from 'framer-motion';
import { Upload, File, X, CheckCircle, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

interface FileUploadProps {
  label: string;
  accept?: string;
  maxSize?: number; // en MB
  onFileSelect: (file: File | null) => void;
  currentFile?: File | null;
  selectedFile?: File | null; // Alias pour compatibilité
  required?: boolean;
  description?: string;
  variant?: 'default' | 'simple'; // Nouveau: support des deux styles
}

export function FileUpload({
  label,
  accept = ".pdf,.doc,.docx",
  maxSize = 10,
  onFileSelect,
  currentFile,
  selectedFile,
  required = false,
  description,
  variant = 'default'
}: FileUploadProps) {
  // Support des deux props pour compatibilité
  const file = currentFile || selectedFile;
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateFile = (file: File): string | null => {
    // Vérifier la taille
    if (file.size > maxSize * 1024 * 1024) {
      return `Le fichier est trop volumineux. Taille maximum: ${maxSize}MB`;
    }

    // Vérifier le type de fichier
    const allowedTypes = accept.split(',').map(type => type.trim());
    const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();
    
    if (!allowedTypes.includes(fileExtension)) {
      return `Type de fichier non autorisé. Types acceptés: ${accept}`;
    }

    return null;
  };

  const handleFileSelect = (file: File) => {
    const validationError = validateFile(file);
    if (validationError) {
      setError(validationError);
      return;
    }

    setError(null);
    onFileSelect(file);
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileSelect(e.target.files[0]);
    }
  };

  const removeFile = () => {
    setError(null);
    onFileSelect(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="space-y-2">
      <Label className="text-sm font-medium">
        {label} {required && <span className="text-red-500">*</span>}
      </Label>
      
      {description && (
        <p className="text-sm text-gray-600 dark:text-gray-400">{description}</p>
      )}

      <div className="space-y-4">
        {/* Zone de drop */}
        <motion.div
          className={`
            relative border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors
            ${dragActive
              ? 'border-green-500 bg-green-50 dark:bg-green-800/90'
              : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'
            }
            ${error ? 'border-red-500 bg-red-50 dark:bg-red-800/90' : ''}
          `}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept={accept}
            onChange={handleInputChange}
            className="hidden"
          />

          <div className="space-y-2">
            <Upload className="h-8 w-8 mx-auto text-gray-400" />
            <div>
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Cliquez pour sélectionner ou glissez-déposez
              </p>
              <p className="text-xs text-gray-600 dark:text-gray-300">
                {accept} • Max {maxSize}MB
              </p>
            </div>
          </div>
        </motion.div>

        {/* Fichier sélectionné */}
        {file && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-800/90 border border-green-200 dark:border-green-800 rounded-lg"
          >
            <div className="flex items-center space-x-3">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <div>
                <p className="text-sm font-medium text-green-800 dark:text-green-200">
                  {file.name}
                </p>
                <p className="text-xs text-green-600 dark:text-green-400">
                  {formatFileSize(file.size)}
                </p>
              </div>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={removeFile}
              className="text-green-600 hover:text-green-800 dark:text-green-400 dark:hover:text-green-200"
            >
              <X className="h-4 w-4" />
            </Button>
          </motion.div>
        )}

        {/* Erreur */}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center space-x-2 p-3 bg-red-50 dark:bg-red-800/90 border border-red-200 dark:border-red-800 rounded-lg"
          >
            <AlertCircle className="h-5 w-5 text-red-600" />
            <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
          </motion.div>
        )}
      </div>
    </div>
  );
}
