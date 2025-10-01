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
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  AlertTriangle,
  Calendar,
  BookOpen,
  User,
  CreditCard,
  X
} from "lucide-react";
import { FcfaIcon } from "./fcfa-icon";

interface UnpaidPenalty {
  id: string;
  amount_fcfa: number;
  description: string;
  penalty_date: string;
  related_loan_id: string;
  document_title: string;
}

interface UnpaidPenaltiesDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onPayPenalties: () => void;
  userName: string;
  userEmail: string;
  unpaidPenalties: UnpaidPenalty[];
  totalAmount: number;
  bookTitle: string; // Le livre qu'on essaie de retourner
}

export function UnpaidPenaltiesDialog({
  isOpen,
  onClose,
  onPayPenalties,
  userName,
  userEmail,
  unpaidPenalties,
  totalAmount,
  bookTitle
}: UnpaidPenaltiesDialogProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-red-600">
            <AlertTriangle className="h-5 w-5" />
            Retour bloqué - Pénalités impayées
          </DialogTitle>
          <DialogDescription>
            L'utilisateur doit régler ses pénalités avant de pouvoir retourner des livres.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Informations utilisateur */}
          <Card className="bg-gray-50 dark:bg-gray-800">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <User className="h-4 w-4" />
                Utilisateur
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="space-y-1">
                <p className="font-semibold text-gray-900 dark:text-gray-100">
                  {userName}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {userEmail}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Livre à retourner */}
          <Card className="bg-blue-50 dark:bg-blue-900/20">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <BookOpen className="h-4 w-4" />
                Livre à retourner
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <p className="font-semibold text-blue-900 dark:text-blue-100">
                {bookTitle}
              </p>
            </CardContent>
          </Card>

          {/* Résumé des pénalités */}
          <Card className="bg-red-50 dark:bg-red-900/20">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2 text-red-700 dark:text-red-300">
                <FcfaIcon className="h-4 w-4" />
                Pénalités impayées ({unpaidPenalties.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-red-700 dark:text-red-300">
                  Montant total à payer
                </span>
                <Badge variant="destructive" className="text-lg font-bold px-3 py-1">
                  {totalAmount.toLocaleString()} FCFA
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* Liste détaillée des pénalités */}
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100">
              Détail des pénalités :
            </h4>
            
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {unpaidPenalties.map((penalty, index) => (
                <Card key={penalty.id} className="border-l-4 border-l-red-500">
                  <CardContent className="p-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center gap-2">
                          <BookOpen className="h-3 w-3 text-gray-500" />
                          <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                            {penalty.document_title}
                          </span>
                        </div>
                        
                        <p className="text-xs text-gray-600 dark:text-gray-400">
                          {penalty.description}
                        </p>
                        
                        <div className="flex items-center gap-2">
                          <Calendar className="h-3 w-3 text-gray-400" />
                          <span className="text-xs text-gray-500">
                            {new Date(penalty.penalty_date).toLocaleDateString('fr-FR')}
                          </span>
                        </div>
                      </div>
                      
                      <Badge variant="destructive" className="ml-2">
                        {penalty.amount_fcfa.toLocaleString()} FCFA
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Message d'instruction */}
          <Card className="bg-yellow-50 dark:bg-yellow-900/20">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
                <div className="space-y-1">
                  <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                    Action requise
                  </p>
                  <p className="text-sm text-yellow-700 dark:text-yellow-300">
                    L'utilisateur doit régler toutes ses pénalités avant de pouvoir retourner ce livre. 
                    Utilisez le bouton "Enregistrer paiement" pour traiter le règlement.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <DialogFooter className="flex gap-2">
          <Button
            variant="outline"
            onClick={onClose}
            className="flex items-center gap-2"
          >
            <X className="h-4 w-4" />
            Fermer
          </Button>
          <Button
            onClick={onPayPenalties}
            className="bg-green-600 hover:bg-green-700 flex items-center gap-2"
          >
            <CreditCard className="h-4 w-4" />
            Enregistrer paiement
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
