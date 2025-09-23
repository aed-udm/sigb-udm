'use client';

import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, User, LogOut, Shield, RefreshCw, Settings, Users, BookOpen, FileText, BarChart3 } from 'lucide-react';
import { useState } from 'react';

export function AuthStatus() {
  const { user, isLoading, isAuthenticated, logout, hasPermission, syncAD } = useAuth();
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<string | null>(null);

  const handleSyncAD = async () => {
    setIsSyncing(true);
    setSyncResult(null);
    
    const result = await syncAD();
    
    if (result.success) {
      setSyncResult(`✅ Synchronisation réussie: ${result.stats?.newUsers || 0} nouveaux, ${result.stats?.updatedUsers || 0} mis à jour`);
    } else {
      setSyncResult(`❌ Erreur: ${result.error}`);
    }
    
    setIsSyncing(false);
    
    // Effacer le message après 5 secondes
    setTimeout(() => setSyncResult(null), 5000);
  };

  if (isLoading) {
    return (
      <Card className="w-full max-w-md">
        <CardContent className="flex items-center justify-center p-6">
          <Loader2 className="h-6 w-6 animate-spin mr-2" />
          <span>Vérification de l'authentification...</span>
        </CardContent>
      </Card>
    );
  }

  if (!isAuthenticated || !user) {
    return (
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="flex items-center">
            <Shield className="h-5 w-5 mr-2" />
            Non connecté
          </CardTitle>
          <CardDescription>
            Vous devez vous connecter avec vos identifiants Active Directory
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild className="w-full">
            <a href="/auth/login">Se connecter</a>
          </Button>
        </CardContent>
      </Card>
    );
  }

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'admin': return 'destructive';
      case 'bibliothecaire': return 'default';
      case 'circulation': return 'secondary';
      case 'enregistrement': return 'outline';
      default: return 'secondary';
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'admin': return 'Administrateur';
      case 'bibliothecaire': return 'Bibliothécaire';
      case 'circulation': return 'Circulation';
      case 'enregistrement': return 'Enregistrement';
      case 'etudiant': return 'Étudiant';
      default: return role;
    }
  };

  return (
    <div className="w-full max-w-4xl space-y-6">
      {/* Carte principale d'authentification */}
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center">
            <User className="h-5 w-5 mr-2" />
            Connecté - Session Active Directory
          </CardTitle>
          <CardDescription>
            Authentification réussie avec permissions granulaires
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Nom :</span>
                <span className="text-sm">{user.fullName}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Email :</span>
                <span className="text-sm">{user.email}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Utilisateur :</span>
                <span className="text-sm font-mono">{user.username}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Rôle :</span>
                <Badge>
                  {getRoleLabel(user.role)}
                </Badge>
              </div>
            </div>
            <div className="space-y-2">
              {user.department && (
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Département :</span>
                  <span className="text-sm">{user.department}</span>
                </div>
              )}
              {user.position && (
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Poste :</span>
                  <span className="text-sm">{user.position}</span>
                </div>
              )}
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Statut :</span>
                <Badge>
                  {user.isActive ? 'Actif' : 'Inactif'}
                </Badge>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 pt-4">
            <Button 
              onClick={logout} 
              variant="outline" 
              size="sm"
            >
              <LogOut className="h-4 w-4 mr-2" />
              Se déconnecter
            </Button>

            {hasPermission('system', 'sync_ad') && (
              <Button 
                onClick={handleSyncAD}
                variant="outline" 
                size="sm"
                disabled={isSyncing}
              >
                {isSyncing ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4 mr-2" />
                )}
                Synchroniser AD
              </Button>
            )}
          </div>

          {syncResult && (
            <div className="mt-4 p-3 rounded-lg bg-gray-50 dark:bg-gray-800">
              <p className="text-sm">{syncResult}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Carte des permissions */}
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center">
            <Settings className="h-5 w-5 mr-2" />
            Permissions et Accès
          </CardTitle>
          <CardDescription>
            Fonctionnalités disponibles selon votre rôle
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Gestion des livres */}
            <div className="space-y-2">
              <div className="flex items-center font-medium text-sm">
                <BookOpen className="h-4 w-4 mr-2 text-blue-600" />
                Livres
              </div>
              <div className="space-y-1 text-xs">
                <div className="flex justify-between">
                  <span>Consulter</span>
                  <Badge className="text-xs">
                    {hasPermission('books', 'view') ? '✓' : '✗'}
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span>Créer</span>
                  <Badge className="text-xs">
                    {hasPermission('books', 'create') ? '✓' : '✗'}
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span>Modifier</span>
                  <Badge className="text-xs">
                    {hasPermission('books', 'edit') ? '✓' : '✗'}
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span>Supprimer</span>
                  <Badge className="text-xs">
                    {hasPermission('books', 'delete') ? '✓' : '✗'}
                  </Badge>
                </div>
              </div>
            </div>

            {/* Gestion des utilisateurs */}
            <div className="space-y-2">
              <div className="flex items-center font-medium text-sm">
                <Users className="h-4 w-4 mr-2 text-green-600" />
                Utilisateurs
              </div>
              <div className="space-y-1 text-xs">
                <div className="flex justify-between">
                  <span>Consulter</span>
                  <Badge className="text-xs">
                    {hasPermission('users', 'view') ? '✓' : '✗'}
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span>Créer</span>
                  <Badge className="text-xs">
                    {hasPermission('users', 'create') ? '✓' : '✗'}
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span>Modifier</span>
                  <Badge className="text-xs">
                    {hasPermission('users', 'edit') ? '✓' : '✗'}
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span>Gérer rôles</span>
                  <Badge className="text-xs">
                    {hasPermission('users', 'manage_roles') ? '✓' : '✗'}
                  </Badge>
                </div>
              </div>
            </div>

            {/* Documents académiques */}
            <div className="space-y-2">
              <div className="flex items-center font-medium text-sm">
                <FileText className="h-4 w-4 mr-2 text-purple-600" />
                Documents
              </div>
              <div className="space-y-1 text-xs">
                <div className="flex justify-between">
                  <span>Consulter</span>
                  <Badge className="text-xs">
                    {hasPermission('academic_documents', 'view') ? '✓' : '✗'}
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span>Créer</span>
                  <Badge className="text-xs">
                    {hasPermission('academic_documents', 'create') ? '✓' : '✗'}
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span>Télécharger</span>
                  <Badge className="text-xs">
                    {hasPermission('academic_documents', 'upload') ? '✓' : '✗'}
                  </Badge>
                </div>
              </div>
            </div>

            {/* Administration système */}
            <div className="space-y-2">
              <div className="flex items-center font-medium text-sm">
                <BarChart3 className="h-4 w-4 mr-2 text-orange-600" />
                Système
              </div>
              <div className="space-y-1 text-xs">
                <div className="flex justify-between">
                  <span>Statistiques</span>
                  <Badge className="text-xs">
                    {hasPermission('system', 'view_stats') ? '✓' : '✗'}
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span>Paramètres</span>
                  <Badge className="text-xs">
                    {hasPermission('system', 'manage_settings') ? '✓' : '✗'}
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span>Sync AD</span>
                  <Badge className="text-xs">
                    {hasPermission('system', 'sync_ad') ? '✓' : '✗'}
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span>Logs</span>
                  <Badge className="text-xs">
                    {hasPermission('system', 'view_logs') ? '✓' : '✗'}
                  </Badge>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}