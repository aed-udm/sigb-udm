"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";
import { Shield, AlertTriangle } from "lucide-react";
import ProtectedLayout from "@/components/layout/protected-layout";

interface AdminLayoutProps {
  children: React.ReactNode;
}

export default function AdminADSyncLayout({ children }: AdminLayoutProps) {
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    const checkAdminAccess = async () => {
      try {
        // Vérifier l'authentification
        const isLoggedIn = localStorage.getItem("isLoggedIn");
        const currentUser = localStorage.getItem("currentUser");
        const authMethod = localStorage.getItem("authMethod");

        if (!isLoggedIn || !currentUser || authMethod !== "active_directory") {
          router.push("/auth/login");
          return;
        }

        const user = JSON.parse(currentUser);
        
        // Vérifier le rôle administrateur
        if (user.role !== 'admin') {
          toast({
            title: "Accès refusé",
            description: "Cette interface est réservée aux administrateurs",
            variant: "destructive",
          });
          router.push("/dashboard");
          return;
        }

        // Vérifier le token côté serveur
        const token = localStorage.getItem('auth_token');
        if (!token) {
          router.push('/auth/login');
          return;
        }

        const response = await fetch('/api/auth/verify', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ token }),
        });
        
        if (!response.ok) {
          throw new Error('Erreur de vérification du token');
        }
        
        const result = await response.json();

        if (result.user.role !== 'admin') {
          toast({
            title: "Session expirée",
            description: "Veuillez vous reconnecter",
            variant: "destructive",
          });
          router.push("/auth/login");
          return;
        }

        setIsAuthorized(true);

      } catch (error) {
        console.error('Erreur vérification accès admin:', error);
        toast({
          title: "Erreur d'authentification",
          description: "Impossible de vérifier les permissions",
          variant: "destructive",
        });
        router.push("/auth/login");
      }
    };

    checkAdminAccess();
  }, [router, toast]);

  // Loading state
  if (isAuthorized === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <div className="flex items-center space-x-2 text-gray-600 dark:text-gray-400">
            <Shield className="h-4 w-4" />
            <span>Vérification des permissions administrateur...</span>
          </div>
        </div>
      </div>
    );
  }

  // Access denied (shouldn't reach here due to redirects, but safety net)
  if (!isAuthorized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center space-y-4">
          <AlertTriangle className="h-12 w-12 text-red-500 mx-auto" />
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              Accès refusé
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              Cette interface est réservée aux administrateurs
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Authorized access - Wrap dans ProtectedLayout pour maintenir la sidebar
  return (
    <ProtectedLayout>
      {children}
    </ProtectedLayout>
  );
}
