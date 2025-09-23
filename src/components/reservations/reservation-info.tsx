'use client';

import { Info, BookOpen, Clock } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

export function ReservationInfo() {
  return (
    <Alert className="mb-6 border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950">
      <Info className="h-4 w-4 text-green-600 dark:text-green-400" />
      <AlertTitle className="text-green-800 dark:text-green-200">
        À propos des réservations
      </AlertTitle>
      <AlertDescription className="text-green-700 dark:text-green-300 space-y-2">
        <div className="flex items-start gap-2">
          <BookOpen className="h-4 w-4 mt-0.5 flex-shrink-0" />
          <div>
            <strong>Emprunt direct :</strong> Si des exemplaires sont disponibles, 
            empruntez directement le document dans la section "Emprunts".
          </div>
        </div>
        <div className="flex items-start gap-2">
          <Clock className="h-4 w-4 mt-0.5 flex-shrink-0" />
          <div>
            <strong>Réservation :</strong> Uniquement possible quand tous les exemplaires 
            sont empruntés. Vous serez notifié dès qu'un exemplaire sera disponible.
          </div>
        </div>
      </AlertDescription>
    </Alert>
  );
}

export default ReservationInfo;
