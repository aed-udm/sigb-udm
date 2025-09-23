"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Sidebar } from "./sidebar";
import { Toaster } from "@/components/ui/toaster";
import { useNavigationRefresh } from "@/hooks";
import { RefreshDebugPanel } from "@/components/debug/refresh-indicator";

interface ProtectedLayoutProps {
  children: React.ReactNode;
}

export default function ProtectedLayout({ children }: ProtectedLayoutProps) {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const router = useRouter();

  // Hook pour rafraîchir automatiquement lors de la navigation
  useNavigationRefresh();

  useEffect(() => {
    const checkAuth = () => {
      // Vérifier si nous sommes côté client
      if (typeof window === 'undefined') {
        return;
      }

      const isLoggedIn = localStorage.getItem("isLoggedIn");
      const currentUser = localStorage.getItem("currentUser");
      const authMethod = localStorage.getItem("authMethod");

      if (!isLoggedIn || isLoggedIn !== "true" || !currentUser || authMethod !== "active_directory") {
        router.push("/auth/login");
        return;
      }
      setIsAuthenticated(true);
    };

    checkAuth();
  }, [router]);

  // Affichage du loading pendant la vérification
  if (isAuthenticated === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Vérification de l'authentification...</p>
        </div>
      </div>
    );
  }

  // Affichage du layout protégé avec Sidebar
  return (
    <Sidebar>
      {children}
      <Toaster />
      <RefreshDebugPanel />
    </Sidebar>
  );
}
