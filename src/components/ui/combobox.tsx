"use client";

import { useState, useRef, useEffect } from "react";
import { Check, ChevronDown, Plus, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface ComboboxOption {
  value: string;
  label: string;
}

interface ComboboxProps {
  label?: string;
  placeholder?: string;
  value: string;
  onValueChange: (value: string) => void;
  options: string[] | ComboboxOption[];
  onAddOption?: (option: string) => void;
  allowCustom?: boolean;
  required?: boolean;
  disabled?: boolean;
  className?: string;
  emptyMessage?: string;
}

export function Combobox({
  label,
  placeholder = "Sélectionner ou saisir...",
  value,
  onValueChange,
  options,
  onAddOption,
  allowCustom = true,
  required = false,
  disabled = false,
  className,
  emptyMessage = "Aucune option trouvée"
}: ComboboxProps) {
  const [open, setOpen] = useState(false);
  const [inputValue, setInputValue] = useState(value);
  const [customInput, setCustomInput] = useState("");
  const [showCustomInput, setShowCustomInput] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Fonctions utilitaires pour gérer les deux types d'options
  const isObjectOption = (option: string | ComboboxOption): option is ComboboxOption => {
    return typeof option === 'object' && 'value' in option && 'label' in option;
  };

  const getOptionValue = (option: string | ComboboxOption): string => {
    return isObjectOption(option) ? option.value : option;
  };

  const getOptionLabel = (option: string | ComboboxOption): string => {
    return isObjectOption(option) ? option.label : option;
  };

  const getDisplayValue = (val: string): string => {
    const option = options.find(opt => getOptionValue(opt) === val);
    return option ? getOptionLabel(option) : val;
  };

  // Synchroniser inputValue avec value
  useEffect(() => {
    setInputValue(getDisplayValue(value));
  }, [value, options]);

  // Fermer le dropdown si on clique à l'extérieur
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
        setShowCustomInput(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Filtrer les options selon la saisie
  const filteredOptions = options.filter(option => {
    const label = getOptionLabel(option);
    return label.toLowerCase().includes(inputValue.toLowerCase());
  });

  const handleInputChange = (newValue: string) => {
    setInputValue(newValue);
    // Si c'est une saisie libre, on passe la valeur directement
    // Sinon, on cherche la valeur correspondante
    const matchingOption = options.find(opt => getOptionLabel(opt) === newValue);
    if (matchingOption) {
      onValueChange(getOptionValue(matchingOption));
    } else if (allowCustom) {
      onValueChange(newValue);
    }
    setOpen(true);
  };

  const handleSelectOption = (option: string | ComboboxOption) => {
    const optionValue = getOptionValue(option);
    const optionLabel = getOptionLabel(option);
    setInputValue(optionLabel);
    onValueChange(optionValue);
    setOpen(false);
    setShowCustomInput(false);
  };

  const handleAddCustomOption = () => {
    if (customInput.trim() && !options.some(opt => getOptionValue(opt) === customInput.trim())) {
      const newOption = customInput.trim();
      if (onAddOption) {
        onAddOption(newOption);
      }
      setInputValue(newOption);
      onValueChange(newOption);
      setCustomInput("");
      setShowCustomInput(false);
      setOpen(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && allowCustom && inputValue && !options.some(opt => typeof opt === 'string' ? opt === inputValue : opt.value === inputValue)) {
      e.preventDefault();
      if (onAddOption) {
        onAddOption(inputValue);
      }
      setOpen(false);
    } else if (e.key === "Escape") {
      setOpen(false);
      setShowCustomInput(false);
    }
  };

  return (
    <div className={cn("relative", className)}>
      {label && (
        <Label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
          {label} {required && <span className="text-red-500">*</span>}
        </Label>
      )}
      
      <div className="relative">
        <Input
          ref={inputRef}
          value={inputValue}
          onChange={(e) => handleInputChange(e.target.value)}
          onFocus={() => setOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          required={required}
          disabled={disabled}
          className="pr-10"
        />
        
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
          onClick={() => setOpen(!open)}
          disabled={disabled}
        >
          <ChevronDown className={cn(
            "h-4 w-4 text-gray-500 transition-transform",
            open && "rotate-180"
          )} />
        </Button>
      </div>

      {/* Dropdown */}
      {open && (
        <div
          ref={dropdownRef}
          className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md shadow-lg max-h-60 overflow-auto"
        >
          {/* Options filtrées */}
          {filteredOptions.length > 0 ? (
            <div className="py-1">
              {filteredOptions.map((option, index) => {
                const optionValue = getOptionValue(option);
                const optionLabel = getOptionLabel(option);
                return (
                  <button
                    key={index}
                    type="button"
                    className={cn(
                      "w-full px-3 py-2 text-left text-sm text-gray-900 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center justify-between",
                      value === optionValue && "bg-green-50 dark:bg-green-800/90 text-green-600 dark:text-green-400"
                    )}
                    onClick={() => handleSelectOption(option)}
                  >
                    <span>{optionLabel}</span>
                    {value === optionValue && (
                      <Check className="h-4 w-4 text-green-600 dark:text-green-400" />
                    )}
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="py-2 px-3 text-sm text-gray-600 dark:text-gray-300">
              {emptyMessage}
            </div>
          )}

          {/* Option pour ajouter une valeur personnalisée */}
          {allowCustom && inputValue && !options.some(opt => getOptionLabel(opt) === inputValue) && inputValue.trim().length > 0 && (
            <div className="border-t border-gray-200 dark:border-gray-700">
              <button
                type="button"
                className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center text-green-600 dark:text-green-400"
                onClick={() => {
                  const newOption = inputValue.trim();
                  if (onAddOption) {
                    onAddOption(newOption);
                  }
                  setInputValue(newOption);
                  onValueChange(newOption);
                  setOpen(false);
                }}
              >
                <Plus className="h-4 w-4 mr-2" />
                Ajouter "{inputValue}"
              </button>
            </div>
          )}

          {/* Zone de saisie personnalisée */}
          {allowCustom && (
            <div className="border-t border-gray-200 dark:border-gray-700">
              {!showCustomInput ? (
                <button
                  type="button"
                  className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center text-green-600 dark:text-green-400"
                  onClick={() => setShowCustomInput(true)}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Ajouter une nouvelle option
                </button>
              ) : (
                <div className="p-3 space-y-2">
                  <div className="flex items-center space-x-2">
                    <Input
                      value={customInput}
                      onChange={(e) => setCustomInput(e.target.value)}
                      placeholder="Nouvelle option..."
                      className="flex-1 h-8 text-sm"
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          handleAddCustomOption();
                        }
                      }}
                      autoFocus
                    />
                    <Button
                      type="button"
                      size="sm"
                      onClick={handleAddCustomOption}
                      disabled={!customInput.trim()}
                      className="h-8 px-2"
                    >
                      <Check className="h-3 w-3" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setShowCustomInput(false);
                        setCustomInput("");
                      }}
                      className="h-8 px-2"
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                  <p className="text-xs text-gray-600 dark:text-gray-300">
                    Appuyez sur Entrée ou cliquez sur ✓ pour ajouter
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
