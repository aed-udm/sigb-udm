"use client"

import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Trash2, X } from "lucide-react";

interface DeleteConfirmationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title?: string;
  description?: string;
  itemName?: string;
  itemType?: string;
  isLoading?: boolean;
  variant?: 'default' | 'destructive';
}



// Dialogue général pour documents et autres éléments
export function DeleteConfirmationDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  itemName,
  itemType = 'élément',
  isLoading = false,
  variant = 'destructive'
}: DeleteConfirmationDialogProps) {
  const defaultTitle = title || `Supprimer ${itemType}`;
  const defaultDescription = description || 
    `Êtes-vous sûr de vouloir supprimer ${itemName ? `"${itemName}"` : `cet ${itemType}`} ? Cette action est irréversible.`;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2 text-red-600 dark:text-red-400">
            <AlertTriangle className="h-5 w-5" />
            <span>{defaultTitle}</span>
          </DialogTitle>
          <DialogDescription className="text-gray-600 dark:text-gray-300 mt-2">
            {defaultDescription}
          </DialogDescription>
        </DialogHeader>

        {itemName && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3 my-4">
            <div className="flex items-center space-x-2">
              <Trash2 className="h-4 w-4 text-red-500" />
              <span className="text-sm font-medium text-red-800 dark:text-red-200">
                {itemType} à supprimer :
              </span>
            </div>
            <p className="text-sm text-red-700 dark:text-red-300 mt-1 font-semibold">
              {itemName}
            </p>
          </div>
        )}

        {/* Badge d'avertissement uniforme */}
        <div className="flex justify-center my-4">
          <div className="inline-flex items-center px-4 py-2 rounded-full text-sm font-bold border bg-red-100 text-red-800 border-red-200 dark:bg-red-900 dark:text-red-300 dark:border-red-800 shadow-sm">
            <AlertTriangle className="h-4 w-4 mr-2" />
            Cette action est irréversible ! Souhaitez-vous continuer ?
          </div>
        </div>

        <DialogFooter className="flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2 space-y-2 space-y-reverse sm:space-y-0">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isLoading}
            className="w-full sm:w-auto"
          >
            <X className="h-4 w-4 mr-2" />
            Annuler
          </Button>
          <Button
            variant={variant}
            onClick={onConfirm}
            disabled={isLoading}
            className="w-full sm:w-auto bg-red-600 hover:bg-red-700 text-white border-red-600 hover:border-red-700"
          >
            {isLoading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Suppression...
              </>
            ) : (
              <>
                <Trash2 className="h-4 w-4 mr-2" />
                Supprimer définitivement
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Composant spécialisé pour la suppression d'utilisateurs
interface DeleteUserConfirmationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  user?: {
    id: string | number;
    full_name?: string;
    ad_username?: string;
    matricule?: string;
    role?: string;
    email?: string;
    department?: string;
    position?: string;
    is_active?: boolean;
    manual_role_override?: number;
    last_login?: string | null;
    last_sync?: string;
  } | null;
  isLoading?: boolean;
}

export function DeleteUserConfirmationDialog({
  isOpen,
  onClose,
  onConfirm,
  user,
  isLoading = false
}: DeleteUserConfirmationDialogProps) {
  if (!user) return null;

  const userName = user.full_name || user.ad_username;
  const isAdmin = user.role === 'admin';

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2 text-red-600 dark:text-red-400">
            <AlertTriangle className="h-5 w-5" />
            <span>Supprimer l'utilisateur</span>
          </DialogTitle>
          <DialogDescription className="text-gray-600 dark:text-gray-300 mt-2">
            Êtes-vous sûr de vouloir supprimer cet utilisateur du système ? Cette action est irréversible.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 my-4">
          {/* Informations utilisateur */}
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
            <div className="flex items-center space-x-2 mb-2">
              <Trash2 className="h-4 w-4 text-red-500" />
              <span className="text-sm font-medium text-red-800 dark:text-red-200">
                Utilisateur à supprimer :
              </span>
            </div>
            <div className="space-y-1">
              <p className="text-sm font-semibold text-red-700 dark:text-red-300">
                {userName}
              </p>
              {user.matricule && (
                <p className="text-xs text-red-600 dark:text-red-400">
                  Matricule: {user.matricule}
                </p>
              )}
              {user.email && (
                <p className="text-xs text-red-600 dark:text-red-400">
                  Email: {user.email}
                </p>
              )}
            </div>
          </div>

          {/* Avertissement spécial pour les administrateurs */}
          {isAdmin && (
            <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg p-4">
              <div className="flex items-start space-x-2">
                <AlertTriangle className="h-4 w-4 text-orange-500 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-orange-800 dark:text-orange-200">
                    Suppression d'un administrateur
                  </p>
                  <p className="text-xs text-orange-700 dark:text-orange-300 mt-1">
                    Vous supprimez un utilisateur avec des privilèges administrateur. 
                    Assurez-vous qu'il reste au moins un autre administrateur actif.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Badge d'avertissement uniforme */}
          <div className="flex justify-center">
            <div className="inline-flex items-center px-4 py-2 rounded-full text-sm font-bold border bg-red-100 text-red-800 border-red-200 dark:bg-red-900 dark:text-red-300 dark:border-red-800 shadow-sm">
              <AlertTriangle className="h-4 w-4 mr-2" />
              Cet utilisateur/étudiant sera supprimé définitivement
            </div>
          </div>
        </div>

        <DialogFooter className="flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2 space-y-2 space-y-reverse sm:space-y-0">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isLoading}
            className="w-full sm:w-auto"
          >
            <X className="h-4 w-4 mr-2" />
            Annuler
          </Button>
          <Button
            variant="destructive"
            onClick={onConfirm}
            disabled={isLoading}
            className="w-full sm:w-auto bg-red-600 hover:bg-red-700 text-white border-red-600 hover:border-red-700"
          >
            {isLoading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Suppression...
              </>
            ) : (
              <>
                <Trash2 className="h-4 w-4 mr-2" />
                Supprimer définitivement
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
