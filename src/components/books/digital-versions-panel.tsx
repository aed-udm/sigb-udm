'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Globe } from "lucide-react";

interface DigitalVersionsPanelProps {
  bookId: string;
  bookTitle: string;
  bookAuthor: string;
}

export function DigitalVersionsPanel({
  bookId,
  bookTitle,
  bookAuthor
}: DigitalVersionsPanelProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Globe className="h-5 w-5" />
          Versions numériques
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-center py-8">
          <Globe className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400 mb-2">
            Service de versions numériques temporairement indisponible
          </p>
          <p className="text-sm text-gray-500">
            Cette fonctionnalité sera disponible prochainement
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
