"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { DeleteUserConfirmationDialog } from '@/components/ui/delete-confirmation-dialog';
import { InstantPageHeader } from "@/components/ui/instant-components";
import {
  Server,
  Users,
  RefreshCw,
  CheckCircle,
  AlertCircle,
  Clock,
  Shield,
  Database,
  Activity,
  UserCheck,
  UserX,
  Trash2,
  Crown,
  BookOpen,
  GraduationCap,
  Edit,
} from "lucide-react";

interface SyncStatus {
  total_users: number;
  active_users: number;
  recently_synced: number;
  last_sync_time: string;
  sync_health: 'healthy' | 'needs_sync';
}

interface RoleDistribution {
  admin: number;
  bibliothecaire: number;
  enregistrement: number;
  etudiant: number;
}

interface ADConfig {
  server: string;
  domain: string;
  mock_mode: boolean;
}

interface SyncedUser {
  id: string;
  ad_username: string;
  email: string;
  full_name: string;
  role: string;
  department: string;
  position: string;
  is_active: boolean;
  manual_role_override: number;
  last_login: string | null;
  last_sync: string;
}

interface FileServerStatus {
  connection_status: string;
  message: string;
  server_config: {
    host: string;
    port: string;
    protocol: string;
    base_path: string;
    mock_mode: boolean;
  };
}

interface ADStatus {
  connection_status: string;
  message: string;
  server_config: {
    server: string;
    domain: string;
    base_dn: string;
  };
}

export default function ADSyncPage() {
  const [syncStatus, setSyncStatus] = useState<SyncStatus | null>(null);
  const [roleDistribution, setRoleDistribution] = useState<RoleDistribution | null>(null);
  const [adConfig, setAdConfig] = useState<ADConfig | null>(null);
  const [fileServerStatus, setFileServerStatus] = useState<FileServerStatus | null>({
    connection_status: 'testing',
    message: 'Test de connexion en cours...',
    server_config: {
      host: 'files.udm.edu.cm',
      port: '21',
      protocol: 'ftp',
      base_path: '/',
      mock_mode: false
    }
  });
  const [adStatus, setAdStatus] = useState<ADStatus | null>({
    connection_status: 'testing',
    message: 'Test de connexion en cours...',
    server_config: {
      server: 'ldap://ad.udm.edu.cm:389',
      domain: 'UDM',
      base_dn: 'DC=udm,DC=edu,DC=cm'
    }
  });
  const [syncedUsers, setSyncedUsers] = useState<SyncedUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isTestingFileServer, setIsTestingFileServer] = useState(false);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [isTestingNetwork, setIsTestingNetwork] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<SyncedUser | null>(null);
  const [isDeletingUser, setIsDeletingUser] = useState(false);
  const [isRefreshingStatus, setIsRefreshingStatus] = useState(false);
  const { toast } = useToast();

  // Fonction pour récupérer le token d'authentification
  const getAuthToken = () => {
    // Vérifier d'abord localStorage puis sessionStorage avec différentes clés
    const possibleKeys = ['auth_token', 'token', 'authToken'];
    
    for (const key of possibleKeys) {
      const token = localStorage.getItem(key) || sessionStorage.getItem(key);
      if (token) {
        return token;
      }
    }
    
    return null;
  };

  const fetchSyncStatus = async () => {
    try {
      setIsRefreshingStatus(true);
      const response = await fetch('/api/auth/sync');
      const result = await response.json();

      if (response.ok) {
        setSyncStatus(result.data.sync_status);
        setRoleDistribution(result.data.role_distribution);
        setAdConfig(result.data.ad_config);
        
        // Actualiser aussi les utilisateurs synchronisés
        await fetchSyncedUsers();
        
        toast({
          title: "Données actualisées",
          description: "Toutes les informations AD ont été mises à jour",
        });
      } else {
        toast({
          title: "Erreur",
          description: result.error?.message || "Impossible de récupérer le statut",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Erreur de connexion au serveur",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
      setIsRefreshingStatus(false);
    }
  };

  // Fonction pour récupérer les utilisateurs synchronisés
  const fetchSyncedUsers = async () => {
    setIsLoadingUsers(true);
    try {
      const token = getAuthToken();
      if (!token) {
        toast({
          title: "Erreur d'authentification",
          description: "Token d'authentification manquant. Veuillez vous reconnecter.",
          variant: "destructive",
        });
        return;
      }

      const response = await fetch('/api/admin/synced-users', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const result = await response.json();
        console.log('🔍 DEBUG fetchSyncedUsers - Réponse API:', result);
        
        // L'API retourne les utilisateurs dans result.data.users
        const users = result.data?.users || result.data || [];
        console.log('🔍 DEBUG fetchSyncedUsers - Utilisateurs extraits:', users);
        
        setSyncedUsers(Array.isArray(users) ? users : []);
      } else if (response.status === 401) {
        setSyncedUsers([]); // S'assurer que c'est un tableau vide
        toast({
          title: "Session expirée",
          description: "Votre session a expiré. Veuillez vous reconnecter.",
          variant: "destructive",
        });
      } else {
        setSyncedUsers([]); // S'assurer que c'est un tableau vide
        const result = await response.json();
        toast({
          title: "Erreur",
          description: result.error?.message || "Impossible de charger les utilisateurs",
          variant: "destructive",
        });
      }
    } catch (error) {
      setSyncedUsers([]); // S'assurer que c'est un tableau vide
      toast({
        title: "Erreur",
        description: "Erreur de connexion au serveur",
        variant: "destructive",
      });
    } finally {
      setIsLoadingUsers(false);
    }
  };

  const handleSync = async () => {
    // Vérifier d'abord la connexion AD
    if (adStatus?.connection_status !== 'connected') {
      toast({
        title: "Active Directory déconnecté",
        description: "Impossible de synchroniser. Veuillez d'abord tester la connexion AD.",
        variant: "destructive",
      });
      return;
    }

    setIsSyncing(true);

    try {
      const token = getAuthToken();
      if (!token) {
        toast({
          title: "Erreur d'authentification",
          description: "Token d'authentification manquant. Veuillez vous reconnecter.",
          variant: "destructive",
        });
        setIsSyncing(false);
        return;
      }

      const response = await fetch('/api/auth/sync', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      const result = await response.json();

      if (response.ok) {
        toast({
          title: "Synchronisation réussie",
          description: "Synchronisation AD terminée avec succès",
        });

        // Rafraîchir le statut et les utilisateurs
        await fetchSyncStatus();
        await fetchSyncedUsers();

        // Retester la connexion AD après synchronisation
        await testADConnection();
      } else {
        toast({
          title: "Erreur de synchronisation",
          description: result.error?.message || "Échec de la synchronisation AD",
          variant: "destructive",
        });

        // Retester la connexion AD en cas d'échec
        await testADConnection();
      }
    } catch (error) {
      toast({
        title: "Erreur de connexion",
        description: "Impossible de contacter le serveur de synchronisation AD",
        variant: "destructive",
      });

      // Retester la connexion AD en cas d'erreur de réseau
      await testADConnection();
    } finally {
      setIsSyncing(false);
    }
  };

  // Fonction pour mettre à jour le rôle d'un utilisateur
  const updateUserRole = async (userId: string, newRole: string) => {
    try {
      const token = getAuthToken();
      if (!token) {
        toast({
          title: "Erreur d'authentification",
          description: "Token d'authentification manquant. Veuillez vous reconnecter.",
          variant: "destructive",
        });
        return;
      }

      const response = await fetch('/api/admin/synced-users', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          role: newRole,
        }),
      });

      if (response.ok) {
        toast({
          title: "Rôle mis à jour",
          description: `Le rôle de l'utilisateur a été modifié avec succès.`,
        });
        
        // Rafraîchir la liste des utilisateurs
        await fetchSyncedUsers();
        await fetchSyncStatus(); // Pour mettre à jour la distribution des rôles
      } else if (response.status === 401) {
        toast({
          title: "Session expirée",
          description: "Votre session a expiré. Veuillez vous reconnecter.",
          variant: "destructive",
        });
      } else {
        const result = await response.json();
        toast({
          title: "Erreur",
          description: result.error?.message || "Impossible de mettre à jour le rôle",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Erreur de connexion au serveur",
        variant: "destructive",
      });
    }
  };

  // Fonction pour initier la suppression d'un utilisateur
  const handleDeleteUser = (user: SyncedUser) => {
    setUserToDelete(user);
    setDeleteDialogOpen(true);
  };

  // Fonction pour confirmer la suppression d'un utilisateur
  const confirmDeleteUser = async () => {
    if (!userToDelete) return;

    setIsDeletingUser(true);
    try {
      const token = getAuthToken();
      if (!token) {
        toast({
          title: "Erreur d'authentification",
          description: "Token d'authentification manquant. Veuillez vous reconnecter.",
          variant: "destructive",
        });
        return;
      }

      const response = await fetch(`/api/admin/synced-users/${userToDelete.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        toast({
          title: "Utilisateur supprimé",
          description: `${userToDelete.full_name} a été supprimé avec succès.`,
        });
        
        // Rafraîchir les données
        await fetchSyncedUsers();
        await fetchSyncStatus();
        
        // Fermer le dialog
        setDeleteDialogOpen(false);
        setUserToDelete(null);
      } else if (response.status === 401) {
        toast({
          title: "Session expirée",
          description: "Votre session a expiré. Veuillez vous reconnecter.",
          variant: "destructive",
        });
      } else {
        const result = await response.json();
        toast({
          title: "Erreur de suppression",
          description: result.error?.message || "Impossible de supprimer l'utilisateur",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Erreur de connexion au serveur",
        variant: "destructive",
      });
    } finally {
      setIsDeletingUser(false);
    }
  };



  const testADConnection = async () => {
    try {
      setIsTestingNetwork(true);
      const response = await fetch('/api/admin/ad-test');
      const result = await response.json();

      if (response.ok && result.success) {
        const tests = result.data.tests;
        const ldapTest = tests.find((test: any) => test.name === 'Connexion LDAP');
        const dbTest = tests.find((test: any) => test.name === 'Utilisateurs synchronisés');

        if (ldapTest?.status === 'success') {
          setAdStatus({
            connection_status: 'connected',
            message: `Connexion Active Directory fonctionnelle. ${ldapTest.message}`,
            server_config: {
              server: 'ldap://ad.udm.edu.cm:389',
              domain: 'UDM',
              base_dn: 'DC=udm,DC=edu,DC=cm'
            }
          });
          toast({
            title: "Test AD réussi",
            description: `Connexion Active Directory fonctionnelle. ${ldapTest.message}. Base: ${dbTest?.message || 'N/A'}`,
            variant: "default",
          });
        } else {
          setAdStatus({
            connection_status: 'disconnected',
            message: ldapTest?.message || "Impossible de se connecter au serveur Active Directory",
            server_config: {
              server: 'ldap://ad.udm.edu.cm:389',
              domain: 'UDM',
              base_dn: 'DC=udm,DC=edu,DC=cm'
            }
          });
          toast({
            title: "Test AD échoué",
            description: ldapTest?.message || "Impossible de se connecter au serveur Active Directory",
            variant: "destructive",
          });
        }
      } else {
        setAdStatus({
          connection_status: 'disconnected',
          message: result.error?.message || "Erreur lors du test AD",
          server_config: {
            server: 'ldap://ad.udm.edu.cm:389',
            domain: 'UDM',
            base_dn: 'DC=udm,DC=edu,DC=cm'
          }
        });
        toast({
          title: "Erreur",
          description: result.error?.message || "Erreur lors du test AD",
          variant: "destructive",
        });
      }
    } catch (error) {
      setAdStatus({
        connection_status: 'disconnected',
        message: "Erreur de connexion au serveur AD",
        server_config: {
          server: 'ldap://ad.udm.edu.cm:389',
          domain: 'UDM',
          base_dn: 'DC=udm,DC=edu,DC=cm'
        }
      });
      toast({
        title: "Erreur",
        description: "Erreur de connexion au serveur AD",
        variant: "destructive",
      });
    } finally {
      setIsTestingNetwork(false);
    }
  };

  const testFileServer = async () => {
    setIsTestingFileServer(true);

    try {
      const response = await fetch('/api/admin/file-server-test');
      const result = await response.json();

      if (response.ok && result.success) {
        setFileServerStatus(result.data);
        toast({
          title: "Test serveur de fichiers réussi",
          description: result.data.message,
        });
      } else {
        setFileServerStatus({
          connection_status: 'disconnected',
          message: result.error?.message || "Échec du test de connexion",
          server_config: {
            host: 'files.udm.edu.cm',
            port: '21',
            protocol: 'ftp',
            base_path: '/',
            mock_mode: false
          }
        });
        toast({
          title: "Erreur test serveur de fichiers",
          description: result.error?.message || "Échec du test de connexion",
          variant: "destructive",
        });
      }
    } catch (error) {
      setFileServerStatus({
        connection_status: 'disconnected',
        message: "Impossible de tester le serveur de fichiers",
        server_config: {
          host: 'files.udm.edu.cm',
          port: '21',
          protocol: 'ftp',
          base_path: '/',
          mock_mode: false
        }
      });
      toast({
        title: "Erreur",
        description: "Impossible de tester le serveur de fichiers",
        variant: "destructive",
      });
    } finally {
      setIsTestingFileServer(false);
    }
  };

  useEffect(() => {
    fetchSyncStatus();
    testFileServer();
    testADConnection();
    fetchSyncedUsers();
  }, []);

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-gray-50 dark:from-gray-900 dark:via-gray-800 dark:to-green-900">
      <InstantPageHeader
        title="Synchronisation Active Directory"
        subtitle="Gestion de la synchronisation des utilisateurs avec Active Directory"
        icon={Server}
        actions={
          <Button
            onClick={handleSync}
            disabled={isSyncing || adStatus?.connection_status !== 'connected'}
            className="flex items-center space-x-2"
            variant={adStatus?.connection_status === 'connected' ? 'default' : 'secondary'}
          >
            <RefreshCw className={`h-4 w-4 ${isSyncing ? 'animate-spin' : ''}`} />
            <span>
              {isSyncing
                ? 'Synchronisation...'
                : adStatus?.connection_status === 'connected'
                  ? 'Synchroniser'
                  : 'AD Déconnecté'
              }
            </span>
          </Button>
        }
      />

      <div className="container mx-auto px-4 py-6 lg:py-8 space-y-6">



      {/* Configuration AD et Serveur de Fichiers - Alignés sur la même ligne */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Configuration Active Directory */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Server className="h-5 w-5" />
              <span>Configuration Active Directory</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-4">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Serveur</p>
                <p className="text-lg font-semibold">{adConfig?.server || 'ldap://ad.udm.edu.cm:389'}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Domaine</p>
                <p className="text-lg font-semibold">{adConfig?.domain || 'UDM'}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Base DN</p>
                <p className="text-lg font-semibold">DC=udm,DC=edu,DC=cm</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Statut</p>
                <div className="flex items-center space-x-2">
                  <Badge variant={
                    adStatus?.connection_status === 'connected' ? "default" :
                    adStatus?.connection_status === 'testing' ? "secondary" :
                    "destructive"
                  }>
                    {adStatus?.connection_status === 'connected' ? 'Connecté' :
                     adStatus?.connection_status === 'testing' ? 'Test...' :
                     'Déconnecté'}
                  </Badge>
                  {adStatus?.connection_status === 'connected' && (
                    <div className="flex items-center space-x-1">
                      <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                      <span className="text-xs text-green-600 font-medium">LIVE</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Message de statut */}
            {adStatus && (
              <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  {adStatus.message}
                </p>
              </div>
            )}



            {/* Bouton de test de connexion AD */}
            <div className="mt-4">
              <Button
                onClick={testADConnection}
                disabled={isTestingNetwork}
                variant="outline"
                size="sm"
              >
                <Server className={`h-4 w-4 mr-2 ${isTestingNetwork ? 'animate-spin' : ''}`} />
                {isTestingNetwork ? 'Test en cours...' : 'Tester la connexion'}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Configuration Serveur de Fichiers UdM */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Database className="h-5 w-5" />
              <span>Serveur de Fichiers UdM</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-4">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Serveur</p>
                <p className="text-lg font-semibold">files.udm.edu.cm</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Protocole</p>
                <p className="text-lg font-semibold">FTP</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Port</p>
                <p className="text-lg font-semibold">21</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Statut</p>
                <div className="flex items-center space-x-2">
                  <Badge variant={
                    fileServerStatus?.connection_status === 'connected' ? "default" :
                    fileServerStatus?.connection_status === 'testing' ? "secondary" :
                    "destructive"
                  }>
                    {fileServerStatus?.connection_status === 'connected' ? 'Connecté' :
                     fileServerStatus?.connection_status === 'testing' ? 'Test...' :
                     'Déconnecté'}
                  </Badge>
                  {fileServerStatus?.connection_status === 'connected' && (
                    <div className="flex items-center space-x-1">
                      <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                      <span className="text-xs text-green-600 font-medium">LIVE</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Message de statut */}
            {fileServerStatus && (
              <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  {fileServerStatus.connection_status === 'connected'
                    ? 'Connexion FTP réussie - Serveur de fichiers opérationnel'
                    : fileServerStatus.connection_status === 'testing'
                    ? 'Test de connexion en cours...'
                    : 'Échec de connexion FTP'
                  }
                </p>
              </div>
            )}

            {/* Bouton de test */}
            <div className="mt-4">
              <Button
                onClick={testFileServer}
                disabled={isTestingFileServer}
                variant="outline"
                size="sm"
              >
                <Database className={`h-4 w-4 mr-2 ${isTestingFileServer ? 'animate-spin' : ''}`} />
                {isTestingFileServer ? 'Test en cours...' : 'Tester la connexion'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Statut de synchronisation */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Activity className="h-5 w-5" />
            <span>Statut de synchronisation</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="flex items-center justify-center space-x-2 mb-2">
                <Users className="h-5 w-5 text-blue-600" />
                <span className="text-2xl font-bold">
                  {syncedUsers.filter(user => !['Guest', 'krbtgt', 'bibliotheque-service'].includes(user.ad_username)).length}
                </span>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-300">Utilisateurs réels</p>
            </div>

            <div className="text-center">
              <div className="flex items-center justify-center space-x-2 mb-2">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <span className="text-2xl font-bold">
                  {syncedUsers.filter(user =>
                    !['Guest', 'krbtgt', 'bibliotheque-service'].includes(user.ad_username) &&
                    user.is_active
                  ).length}
                </span>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-300">Utilisateurs actifs</p>
            </div>
            
            <div className="text-center">
              <div className="flex items-center justify-center space-x-2 mb-2">
                <Clock className="h-5 w-5 text-orange-600" />
                <span className="text-2xl font-bold">
                  {syncedUsers.filter(user =>
                    !['Guest', 'krbtgt', 'bibliotheque-service'].includes(user.ad_username) &&
                    user.last_sync &&
                    new Date(user.last_sync) > new Date(Date.now() - 24 * 60 * 60 * 1000)
                  ).length}
                </span>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-300">Sync récente (24h)</p>
            </div>
            
            <div className="text-center">
              <div className="flex items-center justify-center space-x-2 mb-2">
                {adStatus?.connection_status === 'connected' ? (
                  <CheckCircle className="h-5 w-5 text-green-600" />
                ) : (
                  <AlertCircle className="h-5 w-5 text-red-600" />
                )}
                <Badge variant={adStatus?.connection_status === 'connected' ? "default" : "destructive"}>
                  {adStatus?.connection_status === 'connected' ? 'Sain' : 'Attention'}
                </Badge>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-300">État de santé</p>
            </div>
          </div>
          
          {syncStatus?.last_sync_time && (
            <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <p className="text-sm text-gray-600 dark:text-gray-300">
                Dernière synchronisation : {new Date(syncStatus.last_sync_time).toLocaleString('fr-FR')}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Distribution des rôles */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Shield className="h-5 w-5" />
            <span>Distribution des rôles</span>
          </CardTitle>
          <CardDescription>
            Répartition des utilisateurs synchronisés par rôle
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">{roleDistribution?.admin || 0}</div>
              <p className="text-sm text-gray-600 dark:text-gray-300">Administrateurs</p>
            </div>
            
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">{roleDistribution?.bibliothecaire || 0}</div>
              <p className="text-sm text-gray-600 dark:text-gray-300">Bibliothécaires</p>
            </div>
            

            
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">{roleDistribution?.enregistrement || 0}</div>
              <p className="text-sm text-gray-600 dark:text-gray-300">Enregistrement</p>
            </div>
            
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{roleDistribution?.etudiant || 0}</div>
              <p className="text-sm text-gray-600 dark:text-gray-300">Étudiants</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Liste des utilisateurs synchronisés */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Users className="h-5 w-5" />
              <span>Utilisateurs Synchronisés</span>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                onClick={handleSync}
                disabled={isSyncing || adStatus?.connection_status !== 'connected'}
                variant={adStatus?.connection_status === 'connected' ? 'default' : 'secondary'}
                size="sm"
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${isSyncing ? 'animate-spin' : ''}`} />
                {isSyncing
                  ? 'Synchronisation...'
                  : adStatus?.connection_status === 'connected'
                    ? (adConfig?.mock_mode ? 'Synchronisation (Test)' : 'Synchronisation AD UdM')
                    : 'AD Déconnecté'
                }
              </Button>
              <Button
                onClick={fetchSyncStatus}
                disabled={isRefreshingStatus || isLoadingUsers}
                variant="outline"
                size="sm"
                className="bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
              >
                {isRefreshingStatus ? (
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4 mr-2" />
                )}
                {isRefreshingStatus ? 'Actualisation...' : 'Actualiser'}
              </Button>
              <Button
                onClick={fetchSyncedUsers}
                disabled={isLoadingUsers}
                variant="outline"
                size="sm"
              >
                <Users className={`h-4 w-4 mr-2 ${isLoadingUsers ? 'animate-spin' : ''}`} />
                Charger les utilisateurs
              </Button>
            </div>
          </CardTitle>
          <CardDescription>
            Gestion des utilisateurs synchronisés depuis Active Directory
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoadingUsers ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
            </div>
          ) : !Array.isArray(syncedUsers) || syncedUsers.length === 0 ? (
            <div className="text-center py-8">
              <UserX className="h-12 w-12 mx-auto text-gray-400 mb-4" />
              <p className="text-gray-500">Aucun utilisateur synchronisé</p>
              <Button onClick={handleSync} className="mt-4" size="sm">
                <RefreshCw className="h-4 w-4 mr-2" />
                Lancer une synchronisation
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {syncedUsers
                .filter(user => !['Guest', 'krbtgt', 'bibliotheque-service'].includes(user.ad_username))
                .map((user) => (
                <div key={user.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center space-x-4">
                    <div className="flex-shrink-0">
                      {user.role === 'admin' ? (
                        <Crown className="h-8 w-8 text-red-600" />
                      ) : user.role === 'bibliothecaire' ? (
                        <BookOpen className="h-8 w-8 text-purple-600" />
                      ) : user.role === 'etudiant' ? (
                        <GraduationCap className="h-8 w-8 text-green-600" />
                      ) : (
                        <UserCheck className="h-8 w-8 text-blue-600" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2">
                        <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                          {user.full_name}
                        </p>
                        <Badge variant={user.is_active ? "default" : "secondary"}>
                          {user.is_active ? 'Actif' : 'Inactif'}
                        </Badge>
                        {user.manual_role_override === 1 && (
                          <Badge variant="outline">
                            <Edit className="h-3 w-3 mr-1" />
                            Modifié
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-gray-500 truncate">
                        {user.email} • {user.ad_username}
                      </p>
                      <div className="flex items-center space-x-4 mt-1">
                        <span className="text-xs text-gray-400">
                          {user.department} • {user.position}
                        </span>
                        {user.last_login && (
                          <span className="text-xs text-gray-400">
                            Dernière connexion: {new Date(user.last_login).toLocaleDateString('fr-FR')}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Select
                      value={user.role}
                      onValueChange={(newRole) => updateUserRole(user.id, newRole)}
                    >
                      <SelectTrigger className="w-40">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="admin">Administrateur</SelectItem>
                        <SelectItem value="bibliothecaire">Bibliothécaire</SelectItem>

                        <SelectItem value="enregistrement">Enregistrement</SelectItem>
                        <SelectItem value="etudiant">Étudiant</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button
                      onClick={() => handleDeleteUser(user)}
                      variant="outline"
                      size="sm"
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>


      {/* Dialog de confirmation de suppression */}
      <DeleteUserConfirmationDialog
        isOpen={deleteDialogOpen}
        onClose={() => {
          setDeleteDialogOpen(false);
          setUserToDelete(null);
        }}
        onConfirm={confirmDeleteUser}
        user={userToDelete}
        isLoading={isDeletingUser}
      />
      </div>
    </div>
  );
}
