"use client";

import React, { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { Library, Eye, EyeOff, User, Lock, Server } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const { toast } = useToast();

  // Fonction pour effacer le cache d'authentification
  const clearAuthCache = () => {
    localStorage.removeItem("auth_token");
    localStorage.removeItem("isLoggedIn");
    localStorage.removeItem("currentUser");
    localStorage.removeItem("authMethod");
    
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
      });

      const result = await response.json();

      console.log('🔍 DEBUG LOGIN:');
      console.log('response.ok:', response.ok);
      console.log('response.status:', response.status);
      console.log('result:', result);
      console.log('result.success:', result.success);
      console.log('Condition (response.ok && result.success):', response.ok && result.success);

      if (response.ok && result.success) {
        // Stocker les informations d'authentification requises par ProtectedLayout
        localStorage.setItem("auth_token", result.token);
        localStorage.setItem("isLoggedIn", "true");
        localStorage.setItem("currentUser", JSON.stringify(result.user));
        localStorage.setItem("authMethod", "active_directory");

        toast({
          title: "Connexion Active Directory réussie",
          description: `Bienvenue ${result.user.fullName}`,
        });

        router.push("/dashboard");
      } else {
        // Si erreur 401, effacer le cache existant
        if (response.status === 401) {
          clearAuthCache();
        }
        
        toast({
          title: "Identifiants incorrects",
          description: "Vérifiez votre nom d'utilisateur et mot de passe Active Directory",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Erreur de connexion:', error);
      toast({
        title: "Erreur de connexion",
        description: "Impossible de contacter le serveur Active Directory. Vérifiez votre connexion réseau.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-gray-50 dark:from-gray-900 dark:via-gray-800 dark:to-green-900 flex items-center justify-center p-4">
      <motion.div
        initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.8 }}
        className="w-full max-w-md"
      >
        <Card className="shadow-2xl border-0 bg-white/95 dark:bg-gray-800/95 backdrop-blur-sm">
          <CardHeader className="text-center space-y-4">
            <div className="flex justify-center">
              <div className="p-3 bg-green-100 dark:bg-green-800/90 rounded-full">
                <Library className="h-8 w-8 text-green-600 dark:text-green-400" />
              </div>
            </div>
            <CardTitle className="text-2xl font-bold text-gray-900 dark:text-white">
              Connexion Active Directory
            </CardTitle>
            <CardDescription className="text-gray-700 dark:text-gray-200 font-medium">
              Utilisez vos identifiants institutionnels UdM
            </CardDescription>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="username" className="text-sm font-medium">
                  Nom d'utilisateur Active Directory
                </Label>
                <div className="relative">
                  <User className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    id="username"
                    type="text"
                    placeholder="administrator@udm.edu.cm"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="pl-10"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm font-medium">
                  Mot de passe
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Franck55"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10 pr-10"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-3 text-gray-600 dark:text-gray-300 hover:text-gray-700 dark:hover:text-gray-200"
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <input
                    id="remember"
                    type="checkbox"
                    className="rounded border-gray-300 text-green-600 focus:ring-green-500"
                  />
                  <Label htmlFor="remember" className="text-sm text-gray-700 dark:text-gray-200 font-medium">
                    Se souvenir de moi
                  </Label>
                </div>
                <Link
                  href="/auth/forgot-password"
                  className="text-sm text-green-600 hover:text-green-500 dark:text-green-400"
                >
                  Mot de passe oublié ?
                </Link>
              </div>

              <Button
                type="submit"
                className="w-full"
                disabled={isLoading}
              >
                {isLoading ? (
                  <div className="flex items-center space-x-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span>Connexion...</span>
                  </div>
                ) : (
                  "Se connecter"
                )}
              </Button>
              
            </form>


            {/* AD Connection Status */}
            <div className="mt-6 p-4 bg-green-50 dark:bg-green-800/90 rounded-lg border border-green-200 dark:border-green-700">
              <div className="flex items-center space-x-2 mb-3">
                <Server className="h-4 w-4 text-green-600 dark:text-green-400" />
                <h4 className="text-sm font-medium text-green-900 dark:text-green-100">
                  Authentification Active Directory UDM
                </h4>
              </div>
              <div className="text-xs text-green-700 dark:text-green-300 space-y-2">
                <div>
                  <p><strong> Domaine :</strong> UDM (udm.edu.cm)</p>
                  <p><strong> Formats acceptés :</strong></p>
                  <ul className="ml-4 mt-1 space-y-1">
                    <li>• utilisateur@udm.edu.cm</li>
                    <li>• UDM\utilisateur</li>
                    <li>• nom d'utilisateur simple</li>
                  </ul>
                </div>
              </div>
              <div className="mt-2 text-xs text-green-600 dark:text-green-400">
                <p>Connexion sécurisée au serveur Active Directory</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="mt-8 text-center">
          <Link
            href="/"
            className="text-sm text-gray-700 dark:text-gray-200 hover:text-gray-900 dark:hover:text-white font-medium"
          >
            ← Retour à l&apos;accueil
          </Link>
        </div>
      </motion.div>
    </div>
  );
}
