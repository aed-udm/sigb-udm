'use client';

import { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import ProtectedLayout from '@/components/layout/protected-layout';
import { InstantPageHeader } from '@/components/ui/instant-components';
import { getStatusColor } from '@/lib/utils';

// Désactiver le prerendering pour cette page
export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { 
  Globe, 
  Database, 
  FileText, 
  Download, 
  Upload, 
  CheckCircle, 
  AlertCircle,
  BookOpen,
  Settings,
  Zap
} from 'lucide-react';

export default function StandardsPage() {
  const [activeTab, setActiveTab] = useState('overview');
  const [migrationStatus, setMigrationStatus] = useState<any>(null);
  const [migrating, setMigrating] = useState(false);
  const { toast } = useToast();

  // Vérifier l'état de la migration au chargement
  useEffect(() => {
    checkMigrationStatus();
  }, []);

  const checkMigrationStatus = async () => {
    try {
      const response = await fetch('/api/admin/migrate-isbn');
      const data = await response.json();
      if (data.success) {
        setMigrationStatus(data.status);
      }
    } catch (error) {
      console.error('Erreur vérification migration:', error);
    }
  };

  const runMigration = async () => {
    setMigrating(true);
    try {
      const response = await fetch('/api/admin/migrate-isbn', {
        method: 'POST',
      });
      const data = await response.json();

      if (data.success) {
        toast({
          title: "Migration réussie",
          description: data.message,
        });
        await checkMigrationStatus();
      } else {
        toast({
          title: "Erreur de migration",
          description: data.error,
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Erreur lors de la migration",
        variant: "destructive",
      });
    } finally {
      setMigrating(false);
    }
  };

  const standards = [
    {
      name: 'MARC21',
      status: 'implemented',
      description: 'Format standard pour l\'échange de notices bibliographiques',
      features: ['Export XML', 'Import automatique', 'Validation'],
      icon: FileText,
      color: 'green'
    },
    {
      name: 'Dublin Core',
      status: 'implemented',
      description: 'Métadonnées standardisées pour les ressources numériques',
      features: ['Export XML', 'Export JSON-LD', 'Validation'],
      icon: Globe,
      color: 'green'
    },
    {
      name: 'Z39.50',
      status: 'implemented',
      description: 'Protocole de recherche et récupération d\'informations',
      features: ['Recherche BNF', 'Import automatique', 'Serveurs multiples'],
      icon: Database,
      color: 'purple'
    },
    {
      name: 'OAI-PMH',
      status: 'planned',
      description: 'Protocole de moissonnage de métadonnées',
      features: ['Moissonnage', 'Exposition', 'Synchronisation'],
      icon: Upload,
      color: 'orange'
    },
    {
      name: 'SEDA',
      status: 'planned',
      description: 'Standard d\'échange de données pour l\'archivage',
      features: ['Archivage numérique', 'Pérennisation', 'Conformité'],
      icon: Settings,
      color: 'red'
    }
  ];

  const exportFormats = [
    {
      format: 'MARC21 XML',
      endpoint: '/api/export/standards?format=marc21-xml&type=book',
      description: 'Export au format MARC21 XML standard',
      icon: '📄'
    },
    {
      format: 'Dublin Core XML',
      endpoint: '/api/export/standards?format=dublin-core-xml&type=book',
      description: 'Export en métadonnées Dublin Core XML',
      icon: '🌐'
    },
    {
      format: 'JSON-LD',
      endpoint: '/api/export/standards?format=json-ld&type=book',
      description: 'Export en JSON-LD pour le web sémantique',
      icon: '🔗'
    },
    {
      format: 'Dublin Core JSON',
      endpoint: '/api/export/standards?format=dublin-core-json&type=book',
      description: 'Export en métadonnées Dublin Core JSON',
      icon: '📋'
    }
  ];

  const z3950Servers = [
    {
      name: 'Bibliothèque nationale de France',
      code: 'BNF',
      host: 'z3950.bnf.fr:2211',
      database: 'BN-OPALE-PLUS',
      flag: '🇫🇷'
    },
    {
      name: 'WorldCat (OCLC)',
      code: 'WORLDCAT',
      host: 'zcat.oclc.org:210',
      database: 'OLUCWorldCat',
      flag: '🌍'
    },
    {
      name: 'Library of Congress',
      code: 'LOC',
      host: 'z3950.loc.gov:7090',
      database: 'Voyager',
      flag: '🇺🇸'
    },
    {
      name: 'SUDOC (France)',
      code: 'SUDOC',
      host: 'www.sudoc.abes.fr:210',
      database: 'SUDOC',
      flag: '🇫🇷'
    }
  ];

  const getStatusBadge = (status: string) => {
    const statusLabels = {
      'implemented': '✅ Implémenté',
      'planned': '🚧 Planifié',
      'development': '⚡ En développement'
    };

    const label = statusLabels[status as keyof typeof statusLabels] || '❓ Inconnu';

    return <Badge className={getStatusColor(status, 'badge')}>{label}</Badge>;
  };

  return (
    <ProtectedLayout>
      <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-gray-50 dark:from-gray-900 dark:via-gray-800 dark:to-purple-900">
        <InstantPageHeader
          title="Standards Bibliographiques"
          subtitle="Conformité aux normes internationales d'échange et de catalogage"
          icon={Globe}
          actions={
            <Button
              variant="outline"
              size="sm"
              className="bg-white/95 dark:bg-gray-800/95 backdrop-blur-sm border border-gray-300 dark:border-gray-600 hover:border-green-400 dark:hover:border-green-500 font-medium text-gray-700 dark:text-gray-300"
            >
              Actualiser
            </Button>
          }
        />

        <div className="container mx-auto px-4 py-6 lg:py-8">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <div className="modern-tabs">
              <div
                className={`modern-tab ${activeTab === 'overview' ? 'active' : ''}`}
                onClick={() => setActiveTab('overview')}
              >
                Vue d'ensemble
              </div>
              <div
                className={`modern-tab ${activeTab === 'export' ? 'active' : ''}`}
                onClick={() => setActiveTab('export')}
              >
                Export
              </div>
              <div
                className={`modern-tab ${activeTab === 'z3950' ? 'active' : ''}`}
                onClick={() => setActiveTab('z3950')}
              >
                Z39.50
              </div>
              <div
                className={`modern-tab ${activeTab === 'roadmap' ? 'active' : ''}`}
                onClick={() => setActiveTab('roadmap')}
              >
                Roadmap
              </div>
            </div>

            {/* Vue d'ensemble */}
            <TabsContent value="overview" className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {standards.map((standard) => (
                  <Card key={standard.name} className="hover:shadow-lg transition-shadow">
                    <CardHeader className="pb-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-lg bg-${standard.color}-100 dark:bg-${standard.color}-900/20`}>
                            <standard.icon className={`h-5 w-5 text-${standard.color}-600`} />
                          </div>
                          <CardTitle className="text-lg">{standard.name}</CardTitle>
                        </div>
                        {getStatusBadge(standard.status)}
                      </div>
                      <CardDescription>{standard.description}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Fonctionnalités :</p>
                        <div className="flex flex-wrap gap-1">
                          {standard.features.map((feature) => (
                            <Badge key={feature} variant="outline" className="text-xs">
                              {feature}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Migration ISBN */}
              {migrationStatus && !migrationStatus.isbnColumnExists && (
                <Card className="border-orange-200 bg-orange-50 dark:bg-gray-800/85">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <AlertCircle className="h-5 w-5 text-orange-600" />
                      Migration requise
                    </CardTitle>
                    <CardDescription>
                      La colonne ISBN doit être ajoutée à la base de données pour utiliser pleinement les standards bibliographiques.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          Cette migration ajoutera la colonne ISBN à la table des livres et permettra l'import Z39.50.
                        </p>
                      </div>
                      <Button
                        onClick={runMigration}
                        disabled={migrating}
                        className="bg-orange-600 hover:bg-orange-700"
                      >
                        {migrating ? (
                          <>
                            <Settings className="h-4 w-4 mr-2 animate-spin" />
                            Migration...
                          </>
                        ) : (
                          <>
                            <Settings className="h-4 w-4 mr-2" />
                            Exécuter la migration
                          </>
                        )}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}

              <Card className="border-green-200 bg-green-50 dark:bg-blue-800/85">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    Configuration pour vraies données
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="p-4 bg-white dark:bg-gray-800 rounded-lg border">
                      <h4 className="font-semibold text-green-600 mb-2">🌍 Sources de données réelles configurées</h4>
                      <ul className="space-y-1 text-sm">
                        <li>• <strong>BNF</strong> - Bibliothèque nationale de France (API SRU)</li>
                        <li>• <strong>WorldCat</strong> - Catalogue mondial OCLC (clé API requise)</li>
                        <li>• <strong>SUDOC</strong> - Catalogues universitaires français</li>
                        <li>• <strong>Library of Congress</strong> - Catalogues américains</li>
                      </ul>
                    </div>
                    <div className="p-4 bg-green-50 dark:bg-green-800/85 rounded-lg border border-green-200">
                      <h4 className="font-semibold text-green-600 mb-2">✅ Données de test supprimées</h4>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Le système utilise maintenant exclusivement de vraies données bibliographiques.
                        Utilisez les imports Z39.50 ou CSV avec de vrais ISBN pour ajouter des livres.
                      </p>
                    </div>
                    <div className="p-4 bg-yellow-50 dark:bg-yellow-800/85 rounded-lg border border-yellow-200">
                      <h4 className="font-semibold text-yellow-600 mb-2">📚 Exemples d'ISBN pour tester</h4>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-sm">
                        <div className="font-mono bg-white dark:bg-gray-700 p-2 rounded border">
                          9782070413119<br />
                          <span className="text-xs text-gray-500">L'Étranger - Camus</span>
                        </div>
                        <div className="font-mono bg-white dark:bg-gray-700 p-2 rounded border">
                          9782070360024<br />
                          <span className="text-xs text-gray-500">Le Petit Prince</span>
                        </div>
                        <div className="font-mono bg-white dark:bg-gray-700 p-2 rounded border">
                          9782253004226<br />
                          <span className="text-xs text-gray-500">Les Misérables</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    Standards implémentés
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <h4 className="font-semibold text-green-600 mb-2">✅ Formats d'export</h4>
                      <ul className="space-y-1 text-sm">
                        <li>• MARC21 XML - Standard international</li>
                        <li>• Dublin Core XML - Métadonnées web</li>
                        <li>• JSON-LD - Web sémantique</li>
                        <li>• Dublin Core JSON - Format moderne</li>
                      </ul>
                    </div>
                    <div>
                      <h4 className="font-semibold text-green-600 mb-2">🔍 Import automatique</h4>
                      <ul className="space-y-1 text-sm">
                        <li>• Z39.50 - Recherche par ISBN réel</li>
                        <li>• API BNF - Catalogue français</li>
                        <li>• API WorldCat - Catalogue mondial</li>
                        <li>• Validation automatique des métadonnées</li>
                      </ul>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Export */}
            <TabsContent value="export" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Download className="h-5 w-5" />
                    Formats d'export disponibles
                  </CardTitle>
                  <CardDescription>
                    Exportez vos données dans les formats standards internationaux
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {exportFormats.map((format) => (
                      <Card key={format.format} className="border-2 hover:border-green-300 transition-colors">
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                              <span className="text-2xl">{format.icon}</span>
                              <h4 className="font-semibold">{format.format}</h4>
                            </div>
                            <Button size="sm" asChild>
                              <a href={format.endpoint} target="_blank" rel="noopener noreferrer">
                                <Download className="h-4 w-4 mr-1" />
                                Export
                              </a>
                            </Button>
                          </div>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            {format.description}
                          </p>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Z39.50 */}
            <TabsContent value="z3950" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Database className="h-5 w-5" />
                    Serveurs Z39.50 configurés
                  </CardTitle>
                  <CardDescription>
                    Serveurs de catalogage bibliographique disponibles pour l'import automatique
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {z3950Servers.map((server) => (
                      <Card key={server.code} className="border-l-4 border-l-blue-500">
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <span className="text-2xl">{server.flag}</span>
                              <div>
                                <h4 className="font-semibold">{server.name}</h4>
                                <p className="text-sm text-gray-600 dark:text-gray-400">
                                  {server.host} / {server.database}
                                </p>
                              </div>
                            </div>
                            <Badge variant="outline">{server.code}</Badge>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Utilisation Z39.50</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 bg-green-100 dark:bg-green-800/90 rounded-full flex items-center justify-center flex-shrink-0">
                        <span className="text-sm font-bold text-green-600">1</span>
                      </div>
                      <div>
                        <h4 className="font-semibold">Recherche par ISBN</h4>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          Utilisez le bouton "Z39.50" dans la page des livres pour rechercher automatiquement par ISBN
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 bg-green-100 dark:bg-green-800/90 rounded-full flex items-center justify-center flex-shrink-0">
                        <span className="text-sm font-bold text-green-600">2</span>
                      </div>
                      <div>
                        <h4 className="font-semibold">Prévisualisation</h4>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          Vérifiez les données importées avant de les sauvegarder dans votre catalogue
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 bg-green-100 dark:bg-green-800/90 rounded-full flex items-center justify-center flex-shrink-0">
                        <span className="text-sm font-bold text-green-600">3</span>
                      </div>
                      <div>
                        <h4 className="font-semibold">Import automatique</h4>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          Les métadonnées sont automatiquement converties au format de votre bibliothèque
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Roadmap */}
            <TabsContent value="roadmap" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Zap className="h-5 w-5" />
                    Feuille de route des standards
                  </CardTitle>
                  <CardDescription>
                    Développement progressif de la conformité aux standards internationaux
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    <div className="border-l-4 border-l-green-500 pl-4">
                      <h4 className="font-semibold text-green-600">✅ Phase 1 : Standards de base (Terminé)</h4>
                      <ul className="mt-2 space-y-1 text-sm">
                        <li>• MARC21 - Export et import</li>
                        <li>• Dublin Core - Métadonnées complètes</li>
                        <li>• Z39.50 - Import automatique</li>
                        <li>• JSON-LD - Web sémantique</li>
                      </ul>
                    </div>

                    <div className="border-l-4 border-l-blue-500 pl-4">
                      <h4 className="font-semibold text-green-600">🚧 Phase 2 : Protocoles d'échange (En cours)</h4>
                      <ul className="mt-2 space-y-1 text-sm">
                        <li>• OAI-PMH - Moissonnage de métadonnées</li>
                        <li>• SRU - Recherche standardisée</li>
                        <li>• UNIMARC - Format français</li>
                        <li>• API REST complète</li>
                      </ul>
                    </div>

                    <div className="border-l-4 border-l-orange-500 pl-4">
                      <h4 className="font-semibold text-orange-600">📋 Phase 3 : Standards avancés (Planifié)</h4>
                      <ul className="mt-2 space-y-1 text-sm">
                        <li>• SEDA - Archivage numérique</li>
                        <li>• EAD - Description archivistique</li>
                        <li>• MODS - Métadonnées descriptives</li>
                        <li>• RDF/SPARQL - Web sémantique avancé</li>
                      </ul>
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
