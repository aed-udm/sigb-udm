'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  FileText,
  CheckCircle,
  XCircle,
  Clock,
  Search,
  Filter,
  Download,
  Info,
  ExternalLink,
  Activity,
  BarChart3,
  Users,
  Shield,
  AlertCircle
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import ProtectedLayout from '@/components/layout/protected-layout';
import { UnifiedStatCard, InstantPageHeader } from '@/components/ui/instant-components';

interface ComplianceStats {
  totalDocuments: number;
  validDocuments: number;
  totalAcademicDocuments: number;
  invalidDocuments: number;
  validationRate: number;
}

interface ComplianceDocument {
  id: string;
  title: string;
  author: string;
  type: 'thesis' | 'memoir' | 'report';
  status: 'valid' | 'invalid' | 'pending';
  year: number;
  university: string;
  validationDate?: string;
  issues: string[];
}

export default function CompliancePage() {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);

  // Récupération des données réelles depuis l'API
  const [stats, setStats] = useState<ComplianceStats>({
    totalDocuments: 0,
    validDocuments: 0,
    totalAcademicDocuments: 0,
    invalidDocuments: 0,
    validationRate: 0
  });

  const [documents, setDocuments] = useState<ComplianceDocument[]>([]);

  useEffect(() => {
    const fetchComplianceData = async () => {
      try {
        setLoading(true);
        
        // Récupération des statistiques de conformité
        const statsResponse = await fetch('/api/compliance/stats');
        if (statsResponse.ok) {
          const statsData = await statsResponse.json();
          if (statsData.success && statsData.data && statsData.data.overview) {
            setStats({
              totalDocuments: statsData.data.overview.total_documents || 0,
              validDocuments: statsData.data.overview.cames_compliant || 0,
              totalAcademicDocuments: statsData.data.overview.total_academic_documents || 0,
              invalidDocuments: statsData.data.overview.failed_validation || 0,
              validationRate: statsData.data.overview.overall_score || 0
            });
          }
        }

        // Récupération des documents avec leur statut de conformité
        const docsResponse = await fetch('/api/compliance/documents');
        if (docsResponse.ok) {
          const docsData = await docsResponse.json();
          if (docsData.success && docsData.data && docsData.data.documents) {
            setDocuments(docsData.data.documents);
          } else {
            setDocuments([]);
          }
        }
      } catch (error) {
        console.error('Erreur lors du chargement des données de conformité:', error);
        toast({
          title: "Erreur",
          description: "Impossible de charger les données de conformité",
          variant: "destructive"
        });
      } finally {
        setLoading(false);
      }
    };

    fetchComplianceData();
  }, [toast]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'valid':
        return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400';
      case 'invalid':
        return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400';
      case 'pending':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'valid':
        return <CheckCircle className="h-4 w-4" />;
      case 'invalid':
        return <XCircle className="h-4 w-4" />;
      case 'pending':
        return <Clock className="h-4 w-4" />;
      default:
        return <AlertCircle className="h-4 w-4" />;
    }
  };

  const handleManualExport = async () => {
    try {
      toast({
        title: "Génération Collection DICAMES",
        description: "Préparation des métadonnées de tous les documents académiques...",
        duration: 3000
      });

      // Export Dublin Core XML pour tous les documents académiques SEULEMENT (thèses, mémoires, rapports - PAS les livres)
      const dublinCoreResponse = await fetch('/api/export/standards?format=dublin-core-xml&documentType=academic&limit=100');
      if (dublinCoreResponse.ok) {
        const blob = await dublinCoreResponse.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'UdM-DICAMES-Collection-DublinCore.xml';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);

        // Export MARC21 XML également
        setTimeout(async () => {
          const marc21Response = await fetch('/api/export/standards?format=marc21-xml&documentType=academic&limit=100');
          if (marc21Response.ok) {
            const marc21Blob = await marc21Response.blob();
            const marc21Url = window.URL.createObjectURL(marc21Blob);
            const marc21Link = document.createElement('a');
            marc21Link.href = marc21Url;
            marc21Link.download = 'UdM-DICAMES-Collection-MARC21.xml';
            document.body.appendChild(marc21Link);
            marc21Link.click();
            document.body.removeChild(marc21Link);
            window.URL.revokeObjectURL(marc21Url);

            toast({
              title: "Collection DICAMES Générée",
              description: "Fichiers Dublin Core et MARC21 prêts pour soumission à dicames.online",
              duration: 5000
            });
          }
        }, 1000);
      } else {
        throw new Error('Erreur lors de l\'export');
      }
    } catch (error) {
      console.error('Erreur export:', error);
      toast({
        title: "Erreur Génération",
        description: "Impossible de générer la collection. Vérifiez que des documents académiques existent.",
        variant: "destructive",
        duration: 5000
      });
    }
  };

  const filteredDocuments = documents.filter((doc: ComplianceDocument) => {
    const matchesSearch = doc.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         doc.author.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  const handleExportDocument = async (documentId: string, documentType: string) => {
    try {
      toast({
        title: "Export Métadonnées",
        description: "Génération des métadonnées Dublin Core pour ce document...",
        duration: 2000
      });

      // Export Dublin Core pour le document spécifique
      const response = await fetch(`/api/export/standards?format=dublin-core-xml&documentId=${documentId}&documentType=${documentType}`);
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `UdM-Document-${documentId}-DublinCore.xml`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);

        toast({
          title: "Métadonnées Exportées",
          description: "Fichier Dublin Core prêt pour validation DICAMES.",
          duration: 3000
        });
      } else {
        throw new Error('Erreur lors de l\'export');
      }
    } catch (error) {
      console.error('Erreur export document:', error);
      toast({
        title: "Erreur Export",
        description: "Impossible d'exporter les métadonnées de ce document.",
        variant: "destructive",
        duration: 3000
      });
    }
  };

  return (
    <ProtectedLayout>
      <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-gray-50 dark:from-gray-900 dark:via-gray-800 dark:to-green-900">
        {/* Header uniforme avec le système */}
        <InstantPageHeader
          title="Conformité DICAMES"
          subtitle="Validation et préparation manuelle des documents académiques"
          icon={CheckCircle}
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

        <div className="container mx-auto px-4 py-8 space-y-8">

          {/* Statistiques de conformité */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <UnifiedStatCard
              stat={{
                value: (stats.totalDocuments || 0).toString(),
                label: "Total Documents",
                icon: FileText,
                gradient: "from-green-500 to-green-600"
              }}
              className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-900/30"
            />
            <UnifiedStatCard
              stat={{
                value: (stats.validDocuments || 0).toString(),
                label: "Documents Valides",
                icon: CheckCircle,
                gradient: "from-green-600 to-green-700"
              }}
              className="bg-gradient-to-br from-green-100 to-green-200 dark:from-green-800/20 dark:to-green-700/30"
            />
            <UnifiedStatCard
              stat={{
                value: (stats.totalAcademicDocuments || 0).toString(),
                label: "Total Documents Académiques",
                icon: Clock,
                gradient: "from-green-500 to-green-600"
              }}
              className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-800/20 dark:to-green-700/30"
            />
            <UnifiedStatCard
              stat={{
                value: `${stats.validationRate || 0}%`,
                label: "Taux de Conformité",
                icon: BarChart3,
                gradient: "from-green-700 to-gray-600"
              }}
              className="bg-gradient-to-br from-white to-gray-50 dark:from-gray-700/20 dark:to-gray-600/30"
            />
          </div>

          {/* Processus de conformité */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="space-y-6"
          >
            <Card className="bg-white/95 dark:bg-gray-800/95 backdrop-blur-xl border-0 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Info className="h-5 w-5 text-blue-500" />
                  <span>Processus de Conformité DICAMES</span>
                </CardTitle>
                <CardDescription>
                  Validation et préparation manuelle des documents pour soumission DICAMES
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="bg-green-50 dark:bg-green-900/20 p-6 rounded-lg border border-green-200 dark:border-green-800">
                  <div className="flex items-start space-x-4">
                    <div className="p-2 bg-green-100 dark:bg-green-800 rounded-lg">
                      <Info className="h-6 w-6 text-green-600 dark:text-green-400" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold text-green-800 dark:text-green-200 mb-3 text-lg">
                        Préparation pour DICAMES
                      </h4>
                      <p className="text-green-700 dark:text-green-300 mb-4 leading-relaxed">
                        <strong>DICAMES</strong> est l'archive scientifique officielle du CAMES pour la conservation et diffusion
                        des travaux académiques (thèses, mémoires, rapports de stage) de l'espace CAMES. Cette interface prépare
                        vos documents académiques pour soumission. La validation finale est effectuée par les experts vérificateurs du CAMES.
                      </p>

                      <div className="space-y-3">
                        <div>
                          <h5 className="font-medium text-green-800 dark:text-green-200 mb-2">Processus de soumission :</h5>
                          <ol className="text-green-700 dark:text-green-300 text-sm space-y-1 list-decimal list-inside">
                            <li>Validation locale des métadonnées par l'université</li>
                            <li>Export de la collection complète au format standard</li>
                            <li>Soumission manuelle sur la plateforme dicames.online</li>
                            <li>Validation finale par les experts vérificateurs CAMES</li>
                            <li>Publication officielle dans l'archive DICAMES</li>
                          </ol>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>



                <div className="flex flex-col sm:flex-row gap-4">
                  <Button
                    onClick={handleManualExport}
                    className="bg-green-600 hover:bg-green-700 text-white font-medium px-6 py-2.5"
                    size="lg"
                  >
                    <Download className="h-5 w-5 mr-2" />
                    Générer Collection Complète DICAMES
                  </Button>
                  <Button variant="outline" asChild className="border-green-300 text-green-700 hover:bg-green-50">
                    <a href="https://dicames.online" target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Accéder à DICAMES
                    </a>
                  </Button>
                </div>
              </CardContent>
            </Card>





            {/* Liste des documents */}
            <Card className="bg-white/95 dark:bg-gray-800/95 backdrop-blur-xl border-0 shadow-lg">
              <CardHeader>
                <CardTitle>Documents Académiques</CardTitle>
                <CardDescription>
                  Documents avec leur statut de validation DICAMES
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col md:flex-row gap-4 mb-6">
                  <div className="flex-1">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                      <Input
                        placeholder="Rechercher par titre ou auteur..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                  </div>

                </div>

                <div className="space-y-4">
                  {filteredDocuments.map((doc) => (
                    <div key={doc.id} className="p-4 border rounded-lg bg-gray-50 dark:bg-gray-800/50">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h3 className="font-medium text-gray-900 dark:text-gray-100">
                            {doc.title}
                          </h3>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            {doc.author} • {doc.year}
                          </p>
                          <div className="mt-2">
                            <Badge variant="outline">
                              {doc.type === 'thesis' && 'Thèse'}
                              {doc.type === 'memoir' && 'Mémoire'}
                              {doc.type === 'report' && 'Rapport'}
                            </Badge>
                          </div>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleExportDocument(doc.id, doc.type)}
                          className="border-green-300 text-green-700 hover:bg-green-50"
                        >
                          <Download className="h-4 w-4 mr-1" />
                          Métadonnées
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    </ProtectedLayout>
  );
}
