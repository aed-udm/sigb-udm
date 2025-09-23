import Link from 'next/link';
import { Home } from 'lucide-react';

// Désactiver le prerendering pour cette page
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default function NotFound() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-gray-50 dark:from-gray-900 dark:via-gray-800 dark:to-green-900 flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center">
        <div className="mb-8">
          <h1 className="text-9xl font-bold text-green-600 dark:text-green-400 mb-4">404</h1>
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-2">
            Page non trouvée
          </h2>
          <p className="text-gray-600 dark:text-gray-300">
            La page que vous recherchez n'existe pas ou a été déplacée.
          </p>
        </div>
        
        <div className="space-y-4">
          <Link 
            href="/"
            className="inline-flex items-center justify-center w-full h-10 px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-medium rounded-md transition-colors duration-150"
          >
            <Home className="h-4 w-4 mr-2" />
            Retour à l'accueil
          </Link>
        </div>
      </div>
    </div>
  );
}
