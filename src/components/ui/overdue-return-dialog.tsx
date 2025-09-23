"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Clock, DollarSign, User, BookOpen } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface OverdueReturnDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  bookTitle: string;
  userName: string;
  daysLate: number;
  estimatedPenalty: number;
  isLoading?: boolean;
}

export function OverdueReturnDialog({
  isOpen,
  onClose,
  onConfirm,
  bookTitle,
  userName,
  daysLate,
  estimatedPenalty,
  isLoading = false
}: OverdueReturnDialogProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-red-600">
            <AlertTriangle className="h-5 w-5" />
            Retour en retard
          </DialogTitle>
          <DialogDescription>
            Ce document est en retard. Une pénalité sera automatiquement appliquée.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Informations du document */}
          <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg space-y-3">
            <div className="flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-gray-500" />
              <span className="font-medium text-sm">Document</span>
            </div>
            <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
              {bookTitle}
            </p>
            
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-gray-500" />
              <span className="font-medium text-sm">Emprunteur</span>
            </div>
            <p className="text-sm text-gray-700 dark:text-gray-300">
              {userName}
            </p>
          </div>

          {/* Informations sur le retard */}
          <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-lg space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-red-500" />
                <span className="font-medium text-sm text-red-700 dark:text-red-300">
                  Retard
                </span>
              </div>
              <Badge variant="destructive">
                {daysLate} jour{daysLate > 1 ? 's' : ''}
              </Badge>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-red-500" />
                <span className="font-medium text-sm text-red-700 dark:text-red-300">
                  Pénalité estimée
                </span>
              </div>
              <Badge variant="destructive" className="font-bold">
                {estimatedPenalty.toLocaleString()} FCFA
              </Badge>
            </div>
          </div>

          {/* Avertissement */}
          <div className="bg-yellow-50 dark:bg-yellow-900/20 p-3 rounded-lg">
            <p className="text-sm text-yellow-800 dark:text-yellow-200">
              <strong>⚠️ Attention :</strong> La pénalité sera automatiquement créée et devra être réglée par l'emprunteur.
            </p>
          </div>
        </div>

        <DialogFooter className="flex gap-2">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isLoading}
          >
            Annuler
          </Button>
          <Button
            variant="destructive"
            onClick={onConfirm}
            disabled={isLoading}
            className="bg-red-600 hover:bg-red-700"
          >
            {isLoading ? "Traitement..." : "Confirmer le retour"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
