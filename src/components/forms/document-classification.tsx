"use client";

import { useState } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Combobox } from "@/components/ui/combobox";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { BookOpen, Search, Plus, X, Info, FileText } from "lucide-react";
// import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface DocumentClassificationProps {
  deweyClassification: string;
  cduClassification: string;
  subjectHeadings: string[];
  onDeweyChange: (value: string) => void;
  onCduChange: (value: string) => void;
  onSubjectHeadingsChange: (headings: string[]) => void;
}

// Classifications Dewey courantes pour documents académiques
const COMMON_DEWEY = [
  { code: "004", label: "004 - Informatique" },
  { code: "330", label: "330 - Économie" },
  { code: "370", label: "370 - Éducation" },
  { code: "610", label: "610 - Médecine" },
  { code: "620", label: "620 - Ingénierie" },
  { code: "796", label: "796 - Sports et loisirs" },
  { code: "340", label: "340 - Droit" },
  { code: "150", label: "150 - Psychologie" },
  { code: "300", label: "300 - Sciences sociales" },
  { code: "500", label: "500 - Sciences pures" }
];

// Vedettes-matières courantes pour le Cameroun
const CAMEROON_SUBJECTS = [
  "Agriculture tropicale",
  "Développement rural",
  "Économie africaine",
  "Éducation au Cameroun",
  "Santé publique",
  "Technologies de l'information",
  "Gestion des entreprises",
  "Langues camerounaises",
  "Histoire du Cameroun",
  "Géographie du Cameroun"
];

export function DocumentClassification({
  deweyClassification,
  cduClassification,
  subjectHeadings,
  onDeweyChange,
  onCduChange,
  onSubjectHeadingsChange
}: DocumentClassificationProps) {
  const [newSubject, setNewSubject] = useState("");
  const [showDeweyHelp, setShowDeweyHelp] = useState(false);

  const addSubjectHeading = () => {
    if (newSubject.trim() && !subjectHeadings.includes(newSubject.trim())) {
      onSubjectHeadingsChange([...subjectHeadings, newSubject.trim()]);
      setNewSubject("");
    }
  };

  const removeSubjectHeading = (subject: string) => {
    onSubjectHeadingsChange(subjectHeadings.filter(s => s !== subject));
  };

  const addCommonSubject = (subject: string) => {
    if (!subjectHeadings.includes(subject)) {
      onSubjectHeadingsChange([...subjectHeadings, subject]);
    }
  };

  const validateDewey = (value: string): boolean => {
    if (!value.trim()) return false;

    // Format numérique pur : 330, 004.6, 796.332
    const numericFormat = /^\d{3}(\.\d+)?$/.test(value);

    // Format avec description : "330 - Économie", "004.6 - Informatique"
    const descriptiveFormat = /^\d{3}(\.\d+)?\s*-\s*.+$/.test(value);

    return numericFormat || descriptiveFormat;
  };

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="flex items-center space-x-2">
        <BookOpen className="h-5 w-5 text-gray-600" />
        <Label className="text-base font-semibold">Classification documentaire</Label>
        <Badge variant="outline" className="text-xs">
          Standards internationaux
        </Badge>
      </div>

      {/* Classification Dewey */}
      <div className="space-y-3">
        <div className="flex items-center space-x-2">
          <Label htmlFor="dewey" className="text-sm font-medium">
            Classification Dewey
          </Label>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setShowDeweyHelp(!showDeweyHelp)}
            title="Format: 3 chiffres + décimales optionnelles (ex: 004.6)"
          >
            <Info className="h-3 w-3" />
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Input
              id="dewey"
              value={deweyClassification}
              onChange={(e) => onDeweyChange(e.target.value)}
              placeholder="Ex: 004.6"
              className={
                deweyClassification && !validateDewey(deweyClassification)
                  ? 'border-red-500'
                  : deweyClassification && validateDewey(deweyClassification)
                  ? 'border-green-500'
                  : ''
              }
            />
            {deweyClassification && !validateDewey(deweyClassification) && (
              <p className="text-xs text-red-500 mt-1">
                Format invalide (ex: 330, 004.6, ou "330 - Économie")
              </p>
            )}
          </div>

          <Combobox
            placeholder="Choisir une classification courante..."
            value={deweyClassification}
            onValueChange={onDeweyChange}
            options={COMMON_DEWEY.map(item => item.label)}
            onAddOption={(newClassification) => {
              // Accepter la classification complète (avec ou sans description)
              if (validateDewey(newClassification)) {
                onDeweyChange(newClassification);
              }
            }}
            allowCustom={true}
            emptyMessage="Aucune classification trouvée"
          />
        </div>

        {showDeweyHelp && (
          <div className="bg-green-50 dark:bg-green-800/90 p-3 rounded-lg text-sm">
            <h4 className="font-medium text-blue-800 dark:text-green-200 mb-2">
              Guide Classification Dewey
            </h4>
            <div className="grid grid-cols-2 gap-2 text-green-700 dark:text-green-300">
              <div>000-099: Informatique, information</div>
              <div>100-199: Philosophie, psychologie</div>
              <div>200-299: Religion</div>
              <div>300-399: Sciences sociales</div>
              <div>400-499: Langues</div>
              <div>500-599: Sciences pures</div>
              <div>600-699: Sciences appliquées</div>
              <div>700-799: Arts, loisirs, sports</div>
              <div>800-899: Littérature</div>
              <div>900-999: Histoire, géographie</div>
            </div>
          </div>
        )}
      </div>

      {/* Classification CDU */}
      <div className="space-y-2">
        <Label htmlFor="cdu" className="text-sm font-medium">
          Classification CDU (Classification Décimale Universelle)
        </Label>
        <Input
          id="cdu"
          value={cduClassification}
          onChange={(e) => onCduChange(e.target.value)}
          placeholder="Ex: 004.4'273"
        />
        <p className="text-xs text-gray-500">
          Optionnel - Utilisé dans certaines bibliothèques européennes et africaines
        </p>
      </div>

      {/* Vedettes-matières */}
      <div className="space-y-3">
        <Label className="text-sm font-medium">Vedettes-matières</Label>
        
        {/* Ajout de nouvelle vedette */}
        <div className="flex space-x-2">
          <Input
            value={newSubject}
            onChange={(e) => setNewSubject(e.target.value)}
            placeholder="Ajouter une vedette-matière"
            onKeyPress={(e) => e.key === "Enter" && (e.preventDefault(), addSubjectHeading())}
          />
          <Button type="button" onClick={addSubjectHeading} size="sm">
            <Plus className="h-4 w-4" />
          </Button>
        </div>

        {/* Vedettes courantes pour le Cameroun */}
        <div className="space-y-2">
          <p className="text-xs text-gray-600">Vedettes courantes pour le Cameroun :</p>
          <div className="flex flex-wrap gap-2">
            {CAMEROON_SUBJECTS.map((subject) => (
              <Button
                key={subject}
                type="button"
                variant="outline"
                size="sm"
                onClick={() => addCommonSubject(subject)}
                className="text-xs h-7"
                disabled={subjectHeadings.includes(subject)}
              >
                {subject}
              </Button>
            ))}
          </div>
        </div>

        {/* Vedettes sélectionnées */}
        {subjectHeadings.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs text-gray-600 dark:text-gray-400">Vedettes sélectionnées :</p>
            <div className="flex flex-wrap gap-2">
              {subjectHeadings.map((subject, index) => (
                <span
                  key={index}
                  className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 dark:bg-green-800 text-green-800 dark:text-green-100 border border-green-300 dark:border-green-600 shadow-sm"
                >
                  {subject}
                  <button
                    type="button"
                    onClick={() => removeSubjectHeading(subject)}
                    className="ml-2 text-green-600 dark:text-green-300 hover:text-green-800 dark:hover:text-green-100 focus:outline-none"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Résumé de classification */}
      <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg">
        <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Résumé de classification
        </h4>
        <div className="space-y-1 text-xs text-gray-600 dark:text-gray-400">
          <div>
            <strong>Dewey:</strong> {deweyClassification || "Non spécifiée"}
            {deweyClassification && validateDewey(deweyClassification) && (
              <Badge variant="outline" className="ml-2 text-xs">Valide</Badge>
            )}
          </div>
          <div>
            <strong>CDU:</strong> {cduClassification || "Non spécifiée"}
          </div>
          <div>
            <strong>Vedettes:</strong> {subjectHeadings.length} sélectionnée(s)
          </div>
        </div>
      </div>
    </div>
  );
}

// Composant d'affichage en lecture seule pour les pages de détails
interface DocumentClassificationDisplayProps {
  deweyClassification?: string;
  cduClassification?: string;
  subjectHeadings?: string[];
}

export function DocumentClassificationDisplay({
  deweyClassification,
  cduClassification,
  subjectHeadings = []
}: DocumentClassificationDisplayProps) {
  const validateDewey = (dewey: string): boolean => {
    return /^\d{3}(\.\d+)?$/.test(dewey);
  };

  // Si aucune classification n'est disponible
  if (!deweyClassification && !cduClassification && subjectHeadings.length === 0) {
    return (
      <div className="space-y-4">
        <div className="flex items-center space-x-2">
          <FileText className="h-5 w-5 text-green-600" />
          <h3 className="text-lg font-semibold">Classification Documentaire</h3>
          <Badge variant="outline" className="text-xs">
            Standards internationaux
          </Badge>
        </div>
        <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-600">
          <p className="text-sm text-gray-600 dark:text-gray-400 italic">
            Aucune classification documentaire disponible pour ce document.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center space-x-2">
        <FileText className="h-5 w-5 text-green-600" />
        <h3 className="text-lg font-semibold">Classification Documentaire</h3>
        <Badge variant="outline" className="text-xs">
          Standards internationaux
        </Badge>
      </div>

      <div className="space-y-4">
        {/* Classification Dewey */}
        {deweyClassification && (
          <div className="bg-green-50 dark:bg-green-800/90 p-4 rounded-lg border border-green-200 dark:border-green-800">
            <div className="flex items-center justify-between mb-2">
              <Label className="text-sm font-medium text-green-800 dark:text-green-200">
                Classification Dewey
              </Label>
              {validateDewey(deweyClassification) && (
                <Badge variant="outline" className="text-xs text-green-600 border-green-600">
                  Valide
                </Badge>
              )}
            </div>
            <p className="text-lg font-mono text-green-900 dark:text-green-100">
              {deweyClassification}
            </p>
            {!validateDewey(deweyClassification) && (
              <p className="text-xs text-red-500 mt-1">
                Format non standard
              </p>
            )}
          </div>
        )}

        {/* Classification CDU */}
        {cduClassification && (
          <div className="bg-gray-50 dark:bg-gray-800/90 p-4 rounded-lg border border-gray-200 dark:border-gray-800">
            <Label className="text-sm font-medium text-gray-800 dark:text-gray-200 block mb-2">
              Classification CDU (Classification Décimale Universelle)
            </Label>
            <p className="text-lg font-mono text-gray-900 dark:text-gray-100">
              {cduClassification}
            </p>
          </div>
        )}

        {/* Vedettes-matières */}
        {subjectHeadings.length > 0 && (
          <div className="bg-green-50 dark:bg-green-800/90 p-4 rounded-lg border border-green-200 dark:border-green-800">
            <Label className="text-sm font-medium text-green-800 dark:text-green-200 block mb-3">
              Vedettes-matières ({subjectHeadings.length})
            </Label>
            <div className="flex flex-wrap gap-2">
              {subjectHeadings.map((subject, index) => (
                <Badge
                  key={index}
                  variant="secondary"
                  className="bg-green-100 dark:bg-green-800 text-green-800 dark:text-green-100 border border-green-300 dark:border-green-600"
                >
                  {subject}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Résumé de classification */}
        <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg border border-gray-200 dark:border-gray-600">
          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Résumé de classification
          </h4>
          <div className="space-y-1 text-xs text-gray-600 dark:text-gray-400">
            <div>
              <strong>Dewey:</strong> {deweyClassification || "Non spécifiée"}
              {deweyClassification && validateDewey(deweyClassification) && (
                <Badge variant="outline" className="ml-2 text-xs">Valide</Badge>
              )}
            </div>
            <div>
              <strong>CDU:</strong> {cduClassification || "Non spécifiée"}
            </div>
            <div>
              <strong>Vedettes:</strong> {subjectHeadings.length} sélectionnée(s)
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
