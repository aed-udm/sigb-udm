"use client";

import { useState } from "react";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, CheckCircle, Clipboard, Globe } from "lucide-react";

interface BilingualAbstractProps {
  summaryFr: string;
  summaryEn: string;
  onSummaryFrChange: (value: string) => void;
  onSummaryEnChange: (value: string) => void;
  required?: boolean;
  minLength?: number;
  showCamesValidation?: boolean; // Nouveau prop pour contrôler l'affichage des vérifications CAMES
}

export function BilingualAbstract({
  summaryFr,
  summaryEn,
  onSummaryFrChange,
  onSummaryEnChange,
  required = true,
  minLength = 100,
  showCamesValidation = true // Par défaut, afficher les vérifications (pour l'onglet Conformité)
}: BilingualAbstractProps) {
  const [activeTab, setActiveTab] = useState<'fr' | 'en'>('fr');

  const frWordCount = summaryFr.trim().split(/\s+/).filter(word => word.length > 0).length;
  const enWordCount = summaryEn.trim().split(/\s+/).filter(word => word.length > 0).length;
  const frCharCount = summaryFr.length;
  const enCharCount = summaryEn.length;

  const isFrValid = frCharCount >= minLength;
  const isEnValid = enCharCount >= minLength;

  return (
    <div className="space-y-4">
      {/* En-tête */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Globe className="h-5 w-5 text-green-600" />
          <Label className="text-base font-semibold">
            Résumé bilingue {required && <span className="text-red-500">*</span>}
          </Label>
          {showCamesValidation && (
            <Badge variant="outline" className="text-xs">
              Norme CAMES
            </Badge>
          )}
        </div>
        
        {/* Indicateurs de validation */}
        <div className="flex items-center space-x-2">
          <div className="flex items-center space-x-1">
            {isFrValid ? (
              <CheckCircle className="h-4 w-4 text-green-500" />
            ) : (
              <AlertCircle className="h-4 w-4 text-red-500" />
            )}
            <span className="text-xs text-gray-600">FR</span>
          </div>
          <div className="flex items-center space-x-1">
            {isEnValid ? (
              <CheckCircle className="h-4 w-4 text-green-500" />
            ) : (
              <AlertCircle className="h-4 w-4 text-red-500" />
            )}
            <span className="text-xs text-gray-600">EN</span>
          </div>
        </div>
      </div>

      {/* Onglets de langue */}
      <div className="flex space-x-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-lg">
        <button
          type="button"
          onClick={() => setActiveTab('fr')}
          className={`flex-1 px-3 py-2 text-sm font-medium rounded-md transition-colors ${
            activeTab === 'fr'
              ? 'bg-white dark:bg-gray-700 text-green-600 shadow-sm'
              : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
          }`}
        >
          🇫🇷 Français
          {!isFrValid && <AlertCircle className="inline h-3 w-3 ml-1 text-red-500" />}
          {isFrValid && <CheckCircle className="inline h-3 w-3 ml-1 text-green-500" />}
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('en')}
          className={`flex-1 px-3 py-2 text-sm font-medium rounded-md transition-colors ${
            activeTab === 'en'
              ? 'bg-white dark:bg-gray-700 text-green-600 shadow-sm'
              : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
          }`}
        >
          🇬🇧 English
          {!isEnValid && <AlertCircle className="inline h-3 w-3 ml-1 text-red-500" />}
          {isEnValid && <CheckCircle className="inline h-3 w-3 ml-1 text-green-500" />}
        </button>
      </div>

      {/* Zone de saisie française */}
      {activeTab === 'fr' && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="summary_fr" className="text-sm font-medium">
              Résumé en français {required && <span className="text-red-500">*</span>}
            </Label>
            <div className="text-xs text-gray-500">
              {frCharCount}/{minLength} caractères • {frWordCount} mots
            </div>
          </div>
          <Textarea
            id="summary_fr"
            value={summaryFr}
            onChange={(e) => onSummaryFrChange(e.target.value)}
            placeholder="Rédigez un résumé détaillé en français (minimum 100 caractères)..."
            className={`h-32 ${
              required && frCharCount > 0 && !isFrValid
                ? 'border-red-500 focus:border-red-500'
                : isFrValid
                ? 'border-green-500 focus:border-green-500'
                : ''
            }`}
            required={required}
          />
          {showCamesValidation && required && frCharCount > 0 && !isFrValid && (
            <p className="text-xs text-red-500 flex items-center">
              <AlertCircle className="h-3 w-3 mr-1" />
              Minimum {minLength} caractères requis pour la conformité CAMES
            </p>
          )}
          {showCamesValidation && isFrValid && (
            <p className="text-xs text-green-600 flex items-center">
              <CheckCircle className="h-3 w-3 mr-1" />
              Résumé français conforme aux normes CAMES
            </p>
          )}
          {!showCamesValidation && required && frCharCount > 0 && frCharCount < minLength && (
            <p className="text-xs text-orange-600 flex items-center">
              <AlertCircle className="h-3 w-3 mr-1" />
              Recommandé : minimum {minLength} caractères
            </p>
          )}
        </div>
      )}

      {/* Zone de saisie anglaise */}
      {activeTab === 'en' && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="summary_en" className="text-sm font-medium">
              Abstract in English {required && <span className="text-red-500">*</span>}
            </Label>
            <div className="text-xs text-gray-500">
              {enCharCount}/{minLength} characters • {enWordCount} words
            </div>
          </div>
          <Textarea
            id="summary_en"
            value={summaryEn}
            onChange={(e) => onSummaryEnChange(e.target.value)}
            placeholder="Write a detailed abstract in English (minimum 100 characters)..."
            className={`h-32 ${
              required && enCharCount > 0 && !isEnValid
                ? 'border-red-500 focus:border-red-500'
                : isEnValid
                ? 'border-green-500 focus:border-green-500'
                : ''
            }`}
            required={required}
          />
          {showCamesValidation && required && enCharCount > 0 && !isEnValid && (
            <p className="text-xs text-red-500 flex items-center">
              <AlertCircle className="h-3 w-3 mr-1" />
              Minimum {minLength} characters required for CAMES compliance
            </p>
          )}
          {showCamesValidation && isEnValid && (
            <p className="text-xs text-green-600 flex items-center">
              <CheckCircle className="h-3 w-3 mr-1" />
              English abstract compliant with CAMES standards
            </p>
          )}
          {!showCamesValidation && enCharCount > 0 && enCharCount < minLength && (
            <p className="text-xs text-orange-600 flex items-center">
              <AlertCircle className="h-3 w-3 mr-1" />
              Recommended: minimum {minLength} characters
            </p>
          )}
        </div>
      )}

      {/* Résumé de conformité - Affiché seulement si showCamesValidation est true */}
      {showCamesValidation && (
        <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium text-gray-700 dark:text-gray-300">
              Conformité CAMES/DICAMES
            </span>
            <div className="flex items-center space-x-2">
              {isFrValid && isEnValid ? (
                <>
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span className="text-green-600 font-medium">Conforme</span>
                </>
              ) : (
                <>
                  <AlertCircle className="h-4 w-4 text-orange-500" />
                  <span className="text-orange-600 font-medium">
                    {isFrValid || isEnValid ? 'Partiellement conforme' : 'Non conforme'}
                  </span>
                </>
              )}
            </div>
          </div>

          {required && (!isFrValid || !isEnValid) && (
            <div className="mt-2 text-xs text-gray-600 dark:text-gray-400">
              <p><Clipboard className="h-4 w-4" /> Exigences CAMES :</p>
              <ul className="list-disc list-inside mt-1 space-y-1">
                <li className={isFrValid ? 'text-green-600' : 'text-red-600'}>
                  Résumé français (min. {minLength} caractères)
                </li>
                <li className={isEnValid ? 'text-green-600' : 'text-red-600'}>
                  Abstract anglais (min. {minLength} caractères)
                </li>
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default BilingualAbstract;
