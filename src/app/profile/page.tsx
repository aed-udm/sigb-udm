"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DarkModeButton } from "@/components/ui/dark-mode-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import ProtectedLayout from "@/components/layout/protected-layout";
import { InstantPageHeader } from "@/components/ui/instant-components";
import { useToast } from "@/hooks/use-toast";

import { useAuthToken } from "@/hooks/use-auth-token";
import { useRefresh } from "@/contexts/refresh-context";

import { useReliableFormRefresh, useReliableRefresh } from "@/hooks";
import {
  User,
  MapPin,
  Calendar,
  Shield,
  Save,
  Edit,
  Clock
} from "lucide-react";

interface UserProfile {
  id: string;
  username: string;
  full_name: string;
  email: string;
  phone?: string;
  office?: string;
  manager?: string;
  role: string;
  department?: string;
  position?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  last_login?: string;
  ad_info: {
    groups: string[];
    last_sync?: string;
  };
}

export default function ProfilePage() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const { subscribe } = useRefresh();
  const { performReliableRefresh } = useReliableFormRefresh();
  const { isLoading: authLoading } = useAuthToken();

  const loadProfile = useCallback(async () => {
    try {
      setLoading(true);

      // Récupérer les valeurs actuelles directement
      const currentToken = localStorage.getItem('auth_token');
      const currentIsLoggedIn = localStorage.getItem('isLoggedIn');

      console.log('🔍 [loadProfile] Début du chargement:', {
        hasToken: !!currentToken,
        isLoggedIn: currentIsLoggedIn,
        tokenLength: currentToken?.length || 0
      });

      if (!currentToken || currentIsLoggedIn !== 'true') {
        console.log('❌ [loadProfile] Utilisateur non authentifié');
        toast({
          title: "Non authentifié",
          description: "Redirection vers la page de connexion...",
          variant: "destructive",
        });
        window.location.href = '/auth/login';
        return;
      }

      const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${currentToken}`
      };
      console.log('🔑 [loadProfile] Headers générés');

      // Récupérer les données depuis l'API
      console.log('🌐 [loadProfile] Appel API /api/profile avec headers:', headers);

      const response = await fetch('/api/profile', {
        method: 'GET',
        headers: headers
      });

      console.log('📡 [loadProfile] Réponse API:', {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok
      });

      if (!response.ok) {
        if (response.status === 401) {
          console.log('❌ [loadProfile] Session expirée (401)');
          toast({
            title: "Session expirée",
            description: "Veuillez vous reconnecter",
            variant: "destructive",
          });
          return;
        }
        console.log(`❌ [loadProfile] Erreur HTTP ${response.status}`);
        throw new Error(`Erreur ${response.status}`);
      }

      const result = await response.json();
      console.log('📄 [loadProfile] Données reçues:', result);

      if (result.success) {
        setProfile(result.data);
      } else {
        throw new Error(result.error?.message || 'Erreur inconnue');
      }
    } catch (error) {
      console.error('Erreur chargement profil:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger le profil",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, []); // Pas de dépendances pour éviter la boucle infinie

  // Système de rafraîchissement avec debouncing
  const { debouncedRefresh } = useReliableRefresh({
    onRefresh: loadProfile,
    fallbackDelay: 2000
  });

  // Charger le profil au montage et s'abonner aux changements
  useEffect(() => {
    // Attendre que l'authentification soit prête
    if (authLoading) {
      console.log('⏳ [useEffect] Attente fin du chargement auth...');
      return;
    }

    console.log('🚀 [useEffect] Lancement loadProfile');
    loadProfile();

    // S'abonner aux changements d'utilisateurs avec debouncing
    const unsubscribeUser = subscribe('users', debouncedRefresh);

    return () => {
      unsubscribeUser();
    };
  }, [authLoading]); // Seulement authLoading pour éviter la boucle

  const handleSaveProfile = async () => {
    const currentToken = localStorage.getItem('auth_token');
    if (!profile || !currentToken) return;

    try {
      setSaving(true);

      // Envoyer les modifications à l'API
      const response = await fetch('/api/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${currentToken}`
        },
        body: JSON.stringify({
          full_name: profile.full_name,
          phone: profile.phone,
          office: profile.office
        })
      });

      if (!response.ok) {
        if (response.status === 401) {
          toast({
            title: "Session expirée",
            description: "Veuillez vous reconnecter",
            variant: "destructive",
          });
          return;
        }
        throw new Error(`Erreur ${response.status}`);
      }

      const result = await response.json();

      if (result.success) {
        toast({
          title: "Profil mis à jour",
          description: "Vos informations ont été sauvegardées avec succès",
        });

        // Recharger le profil pour avoir les données à jour
        await loadProfile();

        // 🚀 RAFRAÎCHISSEMENT FIABLE - Notifier les autres interfaces
        await performReliableRefresh('Mise à jour profil');

        setIsEditing(false);
      } else {
        throw new Error(result.error?.message || 'Erreur inconnue');
      }
    } catch (error) {
      console.error('Erreur sauvegarde profil:', error);
      toast({
        title: "Erreur",
        description: "Impossible de sauvegarder le profil",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };



  const getRoleColor = (userRole: string) => {
    switch (userRole) {
      case 'admin': return 'bg-red-100 text-red-800 dark:bg-red-800/90 dark:text-red-300';
      case 'bibliothecaire': return 'bg-green-100 text-green-800 dark:bg-green-800/90 dark:text-green-300';
      case 'enregistrement': return 'bg-purple-100 text-purple-800 dark:bg-purple-800/90 dark:text-purple-300';
      case 'etudiant': return 'bg-blue-100 text-blue-800 dark:bg-blue-800/90 dark:text-blue-300';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-800/90 dark:text-gray-300';
    }
  };

  const getRoleLabel = (userRole: string) => {
    switch (userRole) {
      case 'admin': return 'Administrateur Système';
      case 'bibliothecaire': return 'Bibliothécaire';
      case 'enregistrement': return 'Agent d\'Enregistrement et Circulation';
      case 'etudiant': return 'Étudiant';
      default: return 'Utilisateur';
    }
  };

  if (loading) {
    return (
      <ProtectedLayout>
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
            <p className="text-gray-600 dark:text-gray-400">Chargement du profil...</p>
          </div>
        </div>
      </ProtectedLayout>
    );
  }

  if (!profile) {
    return (
      <ProtectedLayout>
        <div className="text-center py-12">
          <p className="text-red-600 dark:text-red-400">Erreur lors du chargement du profil</p>
        </div>
      </ProtectedLayout>
    );
  }

  return (
    <ProtectedLayout>
      <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-gray-50 dark:from-gray-900 dark:via-gray-800 dark:to-green-900">
        <InstantPageHeader
          title="Mon Profil"
          subtitle="Gérez vos informations personnelles et paramètres de compte"
          icon={User}
          actions={
            <div className="flex gap-2">
              <Button
                onClick={loadProfile}
                variant="outline"
                size="sm"
                className="bg-green-100 dark:bg-green-700 border border-green-300 dark:border-green-600 hover:bg-green-200 dark:hover:bg-green-600 hover:border-green-400 dark:hover:border-green-500 transition-all duration-200 font-medium text-green-700 dark:text-green-200"
              >
                Actualiser
              </Button>
              {!isEditing ? (
                <DarkModeButton onClick={() => setIsEditing(true)} buttonType="action">
                  <Edit className="h-4 w-4 mr-2" />
                  Modifier
                </DarkModeButton>
              ) : (
                <>
                  <DarkModeButton
                    variant="outline"
                    onClick={() => setIsEditing(false)}
                    buttonType="nav"
                  >
                    Annuler
                  </DarkModeButton>
                  <Button onClick={handleSaveProfile} disabled={saving}>
                    <Save className="h-4 w-4 mr-2" />
                    {saving ? "Sauvegarde..." : "Sauvegarder"}
                  </Button>
                </>
              )}
            </div>
          }
        />

        <div className="container mx-auto px-4 py-8 space-y-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Carte de profil principal */}
            <div className="lg:col-span-2 space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <User className="h-5 w-5 text-green-600" />
                    Informations Personnelles
                  </CardTitle>
                  <CardDescription>
                    Vos informations de base et coordonnées
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="full_name">Nom complet</Label>
                      <Input
                        id="full_name"
                        value={profile.full_name}
                        onChange={(e) => setProfile({ ...profile, full_name: e.target.value })}
                        disabled={!isEditing}
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        value={profile.email}
                        disabled={true} // Email non modifiable (vient d'AD)
                        className="mt-1 bg-gray-50 dark:bg-gray-800"
                        title="Email synchronisé depuis Active Directory (non modifiable)"
                      />
                    </div>
                    <div>
                      <Label htmlFor="username">Nom d'utilisateur</Label>
                      <Input
                        id="username"
                        value={profile.username}
                        disabled={true} // Username non modifiable (vient d'AD)
                        className="mt-1 bg-gray-50 dark:bg-gray-800"
                        title="Nom d'utilisateur Active Directory (non modifiable)"
                      />
                    </div>
                    <div>
                      <Label htmlFor="phone">Téléphone</Label>
                      <Input
                        id="phone"
                        value={profile.phone || ''}
                        onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                        disabled={!isEditing}
                        className="mt-1"
                        placeholder="Ex: +237 6XX XXX XXX"
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="office">Bureau</Label>
                    <Input
                      id="office"
                      value={profile.office || ''}
                      onChange={(e) => setProfile({ ...profile, office: e.target.value })}
                      disabled={!isEditing}
                      className="mt-1"
                      placeholder="Ex: Bureau 205, Bâtiment A"
                    />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Sidebar avec informations du rôle */}
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="h-5 w-5 text-green-600" />
                    Informations du Poste
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label className="text-sm text-gray-600 dark:text-gray-400">Rôle</Label>
                    <div className={`mt-1 px-3 py-2 rounded-lg font-medium text-sm ${getRoleColor(profile.role)}`}>
                      {getRoleLabel(profile.role)}
                    </div>
                  </div>
                  {profile.position && (
                    <div>
                      <Label className="text-sm text-gray-600 dark:text-gray-400">Poste</Label>
                      <div className="mt-1 flex items-center gap-2 text-sm">
                        <User className="h-4 w-4 text-gray-500" />
                        {profile.position}
                      </div>
                    </div>
                  )}
                  <div>
                    <Label className="text-sm text-gray-600 dark:text-gray-400">Département</Label>
                    <div className="mt-1 flex items-center gap-2 text-sm">
                      <MapPin className="h-4 w-4 text-gray-500" />
                      {profile.department || 'Non renseigné'}
                    </div>
                  </div>
                  <div>
                    <Label className="text-sm text-gray-600 dark:text-gray-400">Compte créé</Label>
                    <div className="mt-1 flex items-center gap-2 text-sm">
                      <Calendar className="h-4 w-4 text-gray-500" />
                      {new Date(profile.created_at).toLocaleDateString('fr-FR')}
                    </div>
                  </div>
                  {profile.last_login && (
                    <div>
                      <Label className="text-sm text-gray-600 dark:text-gray-400">Dernière connexion</Label>
                      <div className="mt-1 flex items-center gap-2 text-sm">
                        <Clock className="h-4 w-4 text-gray-500" />
                        {new Date(profile.last_login).toLocaleDateString('fr-FR')} à {new Date(profile.last_login).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  )}
                  <div>
                    <Label className="text-sm text-gray-600 dark:text-gray-400">Statut</Label>
                    <div className="mt-1 flex items-center gap-2 text-sm">
                      <div className={`h-2 w-2 rounded-full ${profile.is_active ? 'bg-green-500' : 'bg-red-500'}`}></div>
                      {profile.is_active ? 'Actif' : 'Inactif'}
                    </div>
                  </div>
                </CardContent>
              </Card>



              {/* Information Active Directory */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="h-5 w-5 text-green-600" />
                    Authentification Active Directory
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label className="text-sm text-gray-600 dark:text-gray-400">Type de compte</Label>
                    <div className="mt-1">
                      <Badge variant="info" className="text-sm">
                        <Shield className="h-3 w-3 mr-1" />
                        Active Directory
                      </Badge>
                    </div>
                  </div>
                  <div>
                    <Label className="text-sm text-gray-600 dark:text-gray-400">Gestion du mot de passe</Label>
                    <div className="mt-1 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-lg">
                      <p className="text-sm text-green-800 dark:text-green-200">
                        <strong>Géré par Active Directory</strong>
                      </p>
                      <p className="text-xs text-green-700 dark:text-green-300 mt-1">
                        Pour modifier votre mot de passe, contactez votre administrateur système ou utilisez les outils Windows de votre organisation.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>


        </div>
      </div>
    </ProtectedLayout>
  );
}
