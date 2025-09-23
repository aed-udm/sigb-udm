'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Building2,
  FileText,
  Upload,
  Download,
  Users,
  Globe,
  CheckCircle,
  Clock,
  XCircle,
  ArrowUpDown,
  Database,
  Share2
} from 'lucide-react';
import { UnifiedStatCard } from '@/components/ui/instant-components';
import { motion } from 'framer-motion';
import { useToast } from "@/hooks/use-toast";
import { useReliableFormRefresh } from "@/hooks";
import ProtectedLayout from '@/components/layout/protected-layout';

interface ExchangeStats {
  outgoing: { requests: number; approved: number; completed: number };
  incoming: { requests: number; approved: number; completed: number };
  partnerships: { active: number; total: number };
  catalog: { shared: number; received: number };
}

interface PartnerUniversity {
  id: string;
  name: string;
  code: string;
  city: string;
  type: 'public' | 'private';
  status: 'active' | 'inactive';
  lastSync?: string;
}

export default function CooperationPage() {
  const [stats, setStats] = useState<ExchangeStats | null>(null);
  const [partners, setPartners] = useState<PartnerUniversity[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("partners");
  const { toast } = useToast();
  const { performReliableRefresh } = useReliableFormRefresh();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      // Simuler le chargement des données
      setStats({
        outgoing: { requests: 45, approved: 38, completed: 35 },
        incoming: { requests: 23, approved: 20, completed: 18 },
        partnerships: { active: 8, total: 12 },
        catalog: { shared: 1250, received: 3400 }
      });

      setPartners([
        { id: 'uy1', name: 'Université de Yaoundé I', code: 'UY1', city: 'Yaoundé', type: 'public', status: 'active', lastSync: '2024-06-20' },
        { id: 'uy2', name: 'Université de Yaoundé II', code: 'UY2', city: 'Yaoundé', type: 'public', status: 'active', lastSync: '2024-06-19' },
        { id: 'udla', name: 'Université de Douala', code: 'UDLA', city: 'Douala', type: 'public', status: 'active', lastSync: '2024-06-18' },
        { id: 'uds', name: 'Université de Dschang', code: 'UDS', city: 'Dschang', type: 'public', status: 'active' },
        { id: 'ub', name: 'Université de Buea', code: 'UB', city: 'Buea', type: 'public', status: 'inactive' }
      ]);

    } catch (error) {
      console.error('Erreur chargement données:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSyncDicames = async () => {
    try {
      setLoading(true);
      // Appeler le service de synchronisation
      console.log('Synchronisation DICAMES...');
      // await InterlibraryExchangeService.syncWithDicames();
      await new Promise(resolve => setTimeout(resolve, 2000)); // Simulation

      toast({
        title: "Synchronisation réussie",
        description: "Synchronisation DICAMES terminée avec succès !",
      });

      // 🚀 RAFRAÎCHISSEMENT FIABLE - Notifier toutes les interfaces
      await performReliableRefresh('Synchronisation DICAMES');
    } catch (error) {
      alert('Erreur lors de la synchronisation DICAMES');
    } finally {
      setLoading(false);
    }
  };

  const handleShareCatalog = async () => {
    try {
      setLoading(true);
      console.log('Partage du catalogue...');
      // await InterlibraryExchangeService.shareCatalogWithPartners();
      await new Promise(resolve => setTimeout(resolve, 1500)); // Simulation

      toast({
        title: "Partage réussi",
        description: "Catalogue partagé avec les partenaires !",
      });

      // 🚀 RAFRAÎCHISSEMENT FIABLE - Notifier toutes les interfaces
      await performReliableRefresh('Partage catalogue');
    } catch (error) {
      alert('Erreur lors du partage du catalogue');
    } finally {
      setLoading(false);
    }
  };

  if (loading && !stats) {
    return (
      <ProtectedLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
            <p>Chargement de la coopération documentaire...</p>
          </div>
        </div>
      </ProtectedLayout>
    );
  }

  return (
    <ProtectedLayout>
      <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-gray-50 dark:from-gray-900 dark:via-gray-800 dark:to-green-900 relative overflow-hidden">
        {/* Header professionnel avec glassmorphism - Style uniforme */}
        <motion.div
          className="glass-nav shadow-lg border-b border-white/20 dark:border-gray-700/20 relative overflow-hidden bg-white/95 dark:bg-gray-900/95 backdrop-blur-md"
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.6 }}
        >
          {/* Effet glassmorphism background */}
          <div className="absolute inset-0 bg-gradient-to-r from-green-500/5 via-transparent to-gray-500/5" />
          <div className="relative z-10 container mx-auto px-4 sm:px-6 py-4 sm:py-6 lg:py-8">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <motion.div
                initial={{ opacity: 0, x: -30 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6, delay: 0.2 }}
                className="flex items-center space-x-3 sm:space-x-4"
              >
                <Building2 className="h-6 w-6 sm:h-8 sm:w-8 text-green-600 flex-shrink-0" />
                <div>
                  <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold bg-gradient-to-r from-slate-800 to-green-600 dark:from-slate-200 dark:to-green-400 bg-clip-text text-transparent">
                    Coopération Documentaire
                  </h1>
                  <p className="text-sm sm:text-base lg:text-lg text-gray-600 dark:text-gray-300 mt-1 sm:mt-2 font-medium">
                    Échanges inter-bibliothèques et normes CAMES/DICAMES
                  </p>
                </div>
              </motion.div>
              <div className="flex gap-3">
                <Button
                  onClick={handleSyncDicames}
                  disabled={loading}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <Database className="w-4 h-4 mr-2" />
                  Sync DICAMES
                </Button>
                <Button
                  onClick={handleShareCatalog}
                  disabled={loading}
                  variant="outline"
                >
                  <Share2 className="w-4 h-4 mr-2" />
                  Partager Catalogue
                </Button>
              </div>
            </div>
          </div>
        </motion.div>

        <div className="container mx-auto px-4 py-8 space-y-6">
          {/* Statistiques avec composant unifié */}
      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6">
          {[
            {
              value: stats.outgoing.requests,
              label: "Demandes Sortantes",
              icon: Upload,
              gradient: "from-green-500 to-green-600",
              color: "green"
            },
            {
              value: stats.incoming.requests,
              label: "Demandes Entrantes",
              icon: Download,
              gradient: "from-green-500 to-green-600",
              color: "green"
            },
            {
              value: stats.partnerships.active,
              label: "Partenariats",
              icon: Building2,
              gradient: "from-gray-500 to-gray-600",
              color: "gray"
            },
            {
              value: stats.catalog.shared,
              label: "Catalogue Partagé",
              icon: ArrowUpDown,
              gradient: "from-gray-600 to-gray-700",
              color: "orange"
            }
          ].map((stat, index) => (
            <motion.div
              key={stat.label}
              initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              whileHover={{
                y: -5,
                scale: 1.02,
                transition: { duration: 0.2 }
              }}
            >
              <UnifiedStatCard stat={stat} index={index} />
            </motion.div>
          ))}
        </div>
      )}

      {/* Onglets principaux */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <div className="modern-tabs">
          <div
            className={`modern-tab ${activeTab === 'partners' ? 'active' : ''}`}
            onClick={() => setActiveTab('partners')}
          >
            Partenaires
          </div>
          <div
            className={`modern-tab ${activeTab === 'requests' ? 'active' : ''}`}
            onClick={() => setActiveTab('requests')}
          >
            Demandes
          </div>
          <div
            className={`modern-tab ${activeTab === 'catalog' ? 'active' : ''}`}
            onClick={() => setActiveTab('catalog')}
          >
            Catalogue
          </div>
          <div
            className={`modern-tab ${activeTab === 'dicames' ? 'active' : ''}`}
            onClick={() => setActiveTab('dicames')}
          >
            DICAMES
          </div>
        </div>

        {/* Onglet Partenaires */}
        <TabsContent value="partners">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="w-5 h-5" />
                Universités Partenaires
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4">
                {partners.map((partner) => (
                  <div 
                    key={partner.id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-green-100 dark:bg-green-900 rounded-lg flex items-center justify-center">
                        <Building2 className="w-6 h-6 text-green-600" />
                      </div>
                      <div>
                        <h3 className="font-semibold">{partner.name}</h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {partner.code} • {partner.city}
                        </p>
                        {partner.lastSync && (
                          <p className="text-xs text-gray-500">
                            Dernière sync: {partner.lastSync}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge 
                        variant={partner.type === 'public' ? 'default' : 'secondary'}
                      >
                        {partner.type === 'public' ? 'Public' : 'Privé'}
                      </Badge>
                      <Badge 
                        variant={partner.status === 'active' ? 'default' : 'destructive'}
                      >
                        {partner.status === 'active' ? (
                          <CheckCircle className="w-3 h-3 mr-1" />
                        ) : (
                          <XCircle className="w-3 h-3 mr-1" />
                        )}
                        {partner.status === 'active' ? 'Actif' : 'Inactif'}
                      </Badge>
                      <Button size="sm" variant="outline">
                        Gérer
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Onglet Demandes */}
        <TabsContent value="requests">
          <div className="grid gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  Demandes d'Échange Récentes
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Exemple de demandes */}
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <h4 className="font-medium">Thèse: Intelligence Artificielle en Médecine</h4>
                      <p className="text-sm text-gray-600">Demandé par: Université de Yaoundé I</p>
                      <p className="text-xs text-gray-500">Il y a 2 heures</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">
                        <Clock className="w-3 h-3 mr-1" />
                        En attente
                      </Badge>
                      <Button size="sm">Traiter</Button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <h4 className="font-medium">Mémoire: Gestion des Ressources Hydriques</h4>
                      <p className="text-sm text-gray-600">Demandé à: Université de Douala</p>
                      <p className="text-xs text-gray-500">Hier</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="default">
                        <CheckCircle className="w-3 h-3 mr-1" />
                        Approuvé
                      </Badge>
                      <Button size="sm" variant="outline">Voir</Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Onglet Catalogue */}
        <TabsContent value="catalog">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="w-5 h-5" />
                Partage de Catalogue
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="text-center p-6 border rounded-lg">
                    <h3 className="text-2xl font-bold text-green-600">1,250</h3>
                    <p className="text-sm text-gray-600">Documents partagés</p>
                  </div>
                  <div className="text-center p-6 border rounded-lg">
                    <h3 className="text-2xl font-bold text-green-600">3,400</h3>
                    <p className="text-sm text-gray-600">Documents reçus</p>
                  </div>
                  <div className="text-center p-6 border rounded-lg">
                    <h3 className="text-2xl font-bold text-purple-600">8</h3>
                    <p className="text-sm text-gray-600">Catalogues connectés</p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <Button onClick={handleShareCatalog} disabled={loading}>
                    <Share2 className="w-4 h-4 mr-2" />
                    Partager Catalogue Complet
                  </Button>
                  <Button variant="outline">
                    <Download className="w-4 h-4 mr-2" />
                    Importer Catalogues
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Onglet DICAMES */}
        <TabsContent value="dicames">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="w-5 h-5" />
                Intégration DICAMES
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="bg-green-50 dark:bg-green-800/90 p-4 rounded-lg">
                  <h3 className="font-semibold text-blue-900 dark:text-green-100 mb-2">
                    Archive Scientifique Ouverte du CAMES
                  </h3>
                  <p className="text-blue-800 dark:text-green-200 text-sm">
                    DICAMES est la plateforme officielle pour le dépôt et l'échange 
                    de thèses, mémoires et publications scientifiques en Afrique francophone.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-semibold mb-3">Documents UDM dans DICAMES</h4>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span>Thèses</span>
                        <Badge>45</Badge>
                      </div>
                      <div className="flex justify-between">
                        <span>Mémoires</span>
                        <Badge>128</Badge>
                      </div>
                      <div className="flex justify-between">
                        <span>Rapports de stage</span>
                        <Badge>67</Badge>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-semibold mb-3">Dernière Synchronisation</h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                      20 juin 2024 à 14:30
                    </p>
                    <Button onClick={handleSyncDicames} disabled={loading} className="w-full">
                      <Database className="w-4 h-4 mr-2" />
                      Synchroniser Maintenant
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
        </div>
      </div>
    </ProtectedLayout>
  );
}
