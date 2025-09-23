"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { 
  Server, 
  Shield, 
  Clock, 
  RefreshCw, 
  CheckCircle, 
  AlertTriangle,
  User
} from "lucide-react";

interface ADStatusProps {
  user: {
    id: string;
    ad_username: string;
    email: string;
    full_name: string;
    role: string;
    department?: string;
    position?: string;
    last_sync: string;
    sync_status?: 'recent' | 'outdated';
  };
}

export function ADStatusCard({ user }: ADStatusProps) {
  const [syncStatus, setSyncStatus] = useState<any>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const { toast } = useToast();

  const fetchSyncStatus = async () => {
    try {
      const response = await fetch('/api/auth/sync');
      const result = await response.json();

      if (response.ok) {
        setSyncStatus(result.data);
      }
    } catch (error) {
      console.error('Erreur récupération statut AD:', error);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    
    try {
      const response = await fetch('/api/auth/verify');
      const result = await response.json();

      if (response.ok) {
        toast({
          title: "Statut actualisé",
          description: "Informations Active Directory mises à jour",
        });
        
        // Recharger la page pour mettre à jour les données utilisateur
        window.location.reload();
      } else {
        toast({
          title: "Erreur",
          description: "Impossible d'actualiser le statut",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Erreur de connexion",
        variant: "destructive",
      });
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    if (user.role === 'admin') {
      fetchSyncStatus();
    }
  }, [user.role]);

  const lastSyncDate = new Date(user.last_sync);
  const isRecentSync = (Date.now() - lastSyncDate.getTime()) < (24 * 60 * 60 * 1000); // 24h

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Server className="h-5 w-5 text-blue-600" />
          <span>Statut Active Directory</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Informations utilisateur */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <div className="flex items-center space-x-2 mb-2">
              <User className="h-4 w-4 text-gray-500" />
              <span className="text-sm font-medium">Utilisateur AD</span>
            </div>
            <p className="text-lg font-semibold">{user.ad_username}</p>
            <p className="text-sm text-gray-600">{user.email}</p>
          </div>
          
          <div>
            <div className="flex items-center space-x-2 mb-2">
              <Shield className="h-4 w-4 text-gray-500" />
              <span className="text-sm font-medium">Rôle</span>
            </div>
            <Badge variant="default" className="text-sm">
              {user.role}
            </Badge>
            {user.department && (
              <p className="text-sm text-gray-600 mt-1">{user.department}</p>
            )}
          </div>
        </div>

        {/* Statut de synchronisation */}
        <div className="border-t pt-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center space-x-2">
              <Clock className="h-4 w-4 text-gray-500" />
              <span className="text-sm font-medium">Dernière synchronisation</span>
            </div>
            
            <Button
              onClick={handleRefresh}
              disabled={isRefreshing}
              size="sm"
              variant="outline"
            >
              <RefreshCw className={`h-4 w-4 mr-1 ${isRefreshing ? 'animate-spin' : ''}`} />
              Actualiser
            </Button>
          </div>
          
          <div className="flex items-center space-x-2">
            {isRecentSync ? (
              <CheckCircle className="h-4 w-4 text-green-600" />
            ) : (
              <AlertTriangle className="h-4 w-4 text-orange-600" />
            )}
            <span className="text-sm">
              {lastSyncDate.toLocaleString('fr-FR')}
            </span>
            <Badge variant={isRecentSync ? "default" : "secondary"}>
              {isRecentSync ? 'Récent' : 'Ancien'}
            </Badge>
          </div>
        </div>

        {/* Statut global pour les administrateurs */}
        {user.role === 'admin' && syncStatus && (
          <div className="border-t pt-4">
            <h4 className="text-sm font-medium mb-3">Statut global de synchronisation</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="text-center">
                <div className="text-lg font-bold text-blue-600">
                  {syncStatus.sync_status?.total_users || 0}
                </div>
                <div className="text-xs text-gray-600">Total</div>
              </div>
              
              <div className="text-center">
                <div className="text-lg font-bold text-green-600">
                  {syncStatus.sync_status?.active_users || 0}
                </div>
                <div className="text-xs text-gray-600">Actifs</div>
              </div>
              
              <div className="text-center">
                <div className="text-lg font-bold text-orange-600">
                  {syncStatus.sync_status?.recently_synced || 0}
                </div>
                <div className="text-xs text-gray-600">Sync 24h</div>
              </div>
              
              <div className="text-center">
                <Badge 
                  variant={syncStatus.sync_status?.sync_health === 'healthy' ? "default" : "destructive"}
                  className="text-xs"
                >
                  {syncStatus.sync_status?.sync_health === 'healthy' ? 'Sain' : 'Attention'}
                </Badge>
              </div>
            </div>
          </div>
        )}

        {/* Mode de développement */}
        {syncStatus?.ad_config?.mock_mode && (
          <div className="border-t pt-4">
            <div className="flex items-center space-x-2 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
              <AlertTriangle className="h-4 w-4 text-yellow-600" />
              <span className="text-sm text-yellow-700 dark:text-yellow-300">
                Mode simulation Active Directory activé (développement)
              </span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
