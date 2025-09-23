'use client';

import { AlertTriangle, Home, RefreshCw } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function Error500() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white dark:from-gray-900 dark:to-gray-800 flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center">
        {/* Icon */}
        <div className="mb-8">
          <div className="mx-auto w-20 h-20 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center">
            <AlertTriangle className="w-10 h-10 text-red-600 dark:text-red-400" />
          </div>
        </div>

        {/* Content */}
        <div className="space-y-4">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-gray-100">
            500
          </h1>
          <h2 className="text-xl font-semibold text-gray-700 dark:text-gray-300">
            Erreur Interne du Serveur
          </h2>
          <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
            Une erreur inattendue s'est produite sur nos serveurs. 
            Nos équipes techniques ont été notifiées et travaillent 
            à résoudre le problème.
          </p>
        </div>

        {/* Actions */}
        <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
          <Button
            onClick={() => window.location.reload()}
            variant="default"
            className="bg-green-600 hover:bg-green-700 text-white"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Réessayer
          </Button>
          
          <Link href="/">
            <Button variant="outline" className="w-full sm:w-auto">
              <Home className="w-4 h-4 mr-2" />
              Accueil
            </Button>
          </Link>
        </div>

        {/* Additional Info */}
        <div className="mt-8 text-sm text-gray-500 dark:text-gray-400">
          <p>
            Si le problème persiste, contactez l'administrateur système.
          </p>
        </div>
      </div>
    </div>
  );
}
