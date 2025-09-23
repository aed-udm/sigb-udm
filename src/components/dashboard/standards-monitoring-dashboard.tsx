"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { 
  Activity, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  Database, 
  FileText, 
  Globe, 
  Search, 
  Shield, 
  TrendingUp,
  Zap,
  RefreshCw
} from 'lucide-react';
import { StandardsMetrics, MonitoringAlert } from '@/lib/services/standards-monitoring-service';

interface StandardsMonitoringDashboardProps {
  className?: string;
}

export function StandardsMonitoringDashboard({ className }: StandardsMonitoringDashboardProps) {
  const [metrics, setMetrics] = useState<StandardsMetrics | null>(null);
  const [alerts, setAlerts] = useState<MonitoringAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<string>('');

  const fetchMetrics = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/monitoring/standards');
      const data = await response.json();
      
      if (data.success) {
        setMetrics(data.data.metrics);
        setAlerts(data.data.alerts);
        setLastUpdated(data.data.lastUpdated);
      }
    } catch (error) {
      console.error('Erreur chargement métriques:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMetrics();
    
    // Actualiser toutes les 5 minutes
    const interval = setInterval(fetchMetrics, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const getStatusColor = (value: number, thresholds: { good: number; warning: number }) => {
    if (value >= thresholds.good) return 'text-green-600';
    if (value >= thresholds.warning) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getStatusBadge = (value: number, thresholds: { good: number; warning: number }) => {
    if (value >= thresholds.good) return <Badge variant="default" className="bg-green-100 text-green-800">Excellent</Badge>;
    if (value >= thresholds.warning) return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">Attention</Badge>;
    return <Badge variant="destructive">Critique</Badge>;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <RefreshCw className="h-8 w-8 animate-spin text-blue-600" />
        <span className="ml-2 text-lg">Chargement des métriques...</span>
      </div>
    );
  }

  if (!metrics) {
    return (
      <div className="text-center p-8">
        <AlertTriangle className="h-12 w-12 text-yellow-600 mx-auto mb-4" />
        <p className="text-lg text-gray-600">Impossible de charger les métriques</p>
        <Button onClick={fetchMetrics} className="mt-4">
          <RefreshCw className="h-4 w-4 mr-2" />
          Réessayer
        </Button>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header avec alertes */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
            Monitoring des Standards
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            Dernière mise à jour: {new Date(lastUpdated).toLocaleString('fr-FR')}
          </p>
        </div>
        
        <div className="flex items-center space-x-4">
          {alerts.length > 0 && (
            <Badge variant="destructive" className="animate-pulse">
              <AlertTriangle className="h-4 w-4 mr-1" />
              {alerts.length} alerte(s)
            </Badge>
          )}
          <Button onClick={fetchMetrics} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Actualiser
          </Button>
        </div>
      </div>

      {/* Vue d'ensemble */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Score Global</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {metrics.compliance.overallScore}%
            </div>
            <Progress value={metrics.compliance.overallScore} className="mt-2" />
            <p className="text-xs text-muted-foreground mt-2">
              Conformité aux standards
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">OAI-PMH</CardTitle>
            <Globe className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {metrics.oaiPmh.totalRequests}
            </div>
            <p className="text-xs text-muted-foreground">
              Requêtes (Taux succès: {Math.round((metrics.oaiPmh.successfulRequests / metrics.oaiPmh.totalRequests) * 100)}%)
            </p>
            <div className="mt-2">
              {getStatusBadge(
                Math.round((metrics.oaiPmh.successfulRequests / metrics.oaiPmh.totalRequests) * 100),
                { good: 95, warning: 90 }
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">PDF/A</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {metrics.pdfValidation.totalValidations}
            </div>
            <p className="text-xs text-muted-foreground">
              Validations (Succès: {Math.round((metrics.pdfValidation.successfulValidations / metrics.pdfValidation.totalValidations) * 100)}%)
            </p>
            <div className="mt-2">
              {getStatusBadge(
                Math.round((metrics.pdfValidation.successfulValidations / metrics.pdfValidation.totalValidations) * 100),
                { good: 80, warning: 70 }
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Performance</CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {Math.round(metrics.performance.averageResponseTime)}ms
            </div>
            <p className="text-xs text-muted-foreground">
              Temps de réponse moyen
            </p>
            <div className="mt-2">
              {getStatusBadge(
                metrics.performance.averageResponseTime <= 200 ? 100 : 
                metrics.performance.averageResponseTime <= 500 ? 80 : 50,
                { good: 95, warning: 80 }
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Onglets détaillés */}
      <Tabs defaultValue="oai-pmh" className="space-y-4">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="oai-pmh">OAI-PMH</TabsTrigger>
          <TabsTrigger value="pdf-validation">PDF/A</TabsTrigger>
          <TabsTrigger value="cames">CAMES</TabsTrigger>
          <TabsTrigger value="z3950">Z39.50</TabsTrigger>
          <TabsTrigger value="standards">Standards</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
        </TabsList>

        <TabsContent value="oai-pmh" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Globe className="h-5 w-5 mr-2" />
                  Métriques OAI-PMH
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between">
                  <span>Requêtes totales:</span>
                  <span className="font-semibold">{metrics.oaiPmh.totalRequests}</span>
                </div>
                <div className="flex justify-between">
                  <span>Succès:</span>
                  <span className="font-semibold text-green-600">{metrics.oaiPmh.successfulRequests}</span>
                </div>
                <div className="flex justify-between">
                  <span>Échecs:</span>
                  <span className="font-semibold text-red-600">{metrics.oaiPmh.failedRequests}</span>
                </div>
                <div className="flex justify-between">
                  <span>Temps de réponse:</span>
                  <span className="font-semibold">{Math.round(metrics.oaiPmh.averageResponseTime)}ms</span>
                </div>
                <div className="flex justify-between">
                  <span>Enregistrements moissonnés:</span>
                  <span className="font-semibold">{metrics.oaiPmh.harvestedRecords}</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Répartition par verbe</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {Object.entries(metrics.oaiPmh.requestsByVerb).map(([verb, count]) => (
                  <div key={verb} className="flex justify-between items-center">
                    <span className="text-sm">{verb}:</span>
                    <div className="flex items-center space-x-2">
                      <div className="w-20 bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-blue-600 h-2 rounded-full" 
                          style={{ width: `${(count / metrics.oaiPmh.totalRequests) * 100}%` }}
                        />
                      </div>
                      <span className="text-sm font-semibold w-8">{count}</span>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="pdf-validation" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Shield className="h-5 w-5 mr-2" />
                  Validation PDF/A
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between">
                  <span>Validations totales:</span>
                  <span className="font-semibold">{metrics.pdfValidation.totalValidations}</span>
                </div>
                <div className="flex justify-between">
                  <span>Succès:</span>
                  <span className="font-semibold text-green-600">{metrics.pdfValidation.successfulValidations}</span>
                </div>
                <div className="flex justify-between">
                  <span>Échecs:</span>
                  <span className="font-semibold text-red-600">{metrics.pdfValidation.failedValidations}</span>
                </div>
                <div className="flex justify-between">
                  <span>Temps moyen:</span>
                  <span className="font-semibold">{Math.round(metrics.pdfValidation.averageValidationTime)}ms</span>
                </div>
                <div className="flex justify-between">
                  <span>Prêts DICAMES:</span>
                  <span className="font-semibold text-blue-600">{metrics.pdfValidation.dicamesReadyDocuments}</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Erreurs communes</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {metrics.pdfValidation.commonErrors.slice(0, 5).map((error, index) => (
                  <div key={index} className="flex justify-between items-center">
                    <span className="text-sm truncate flex-1">{error.error}:</span>
                    <div className="flex items-center space-x-2 ml-2">
                      <Badge variant="outline" className="text-xs">
                        {error.percentage}%
                      </Badge>
                      <span className="text-sm font-semibold w-8">{error.count}</span>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="cames" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <FileText className="h-5 w-5 mr-2" />
                  Exports Pré-formatés DICAMES
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between">
                  <span>Exports totaux:</span>
                  <span className="font-semibold">{metrics.camesExport.totalExports}</span>
                </div>
                <div className="flex justify-between">
                  <span>Enregistrements exportés:</span>
                  <span className="font-semibold">{metrics.camesExport.exportedRecords}</span>
                </div>
                <div className="flex justify-between">
                  <span>Temps moyen:</span>
                  <span className="font-semibold">{Math.round(metrics.camesExport.averageExportTime)}ms</span>
                </div>
                <div className="flex justify-between">
                  <span>Dépôts institutionnels:</span>
                  <span className="font-semibold text-blue-600">{metrics.camesExport.institutionalDeposits}</span>
                </div>
                <div className="flex justify-between">
                  <span>Dépôts DICAMES:</span>
                  <span className="font-semibold text-green-600">{metrics.camesExport.dicamesDeposits}</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Formats d'export</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {Object.entries(metrics.camesExport.exportsByFormat).map(([format, count]) => (
                  <div key={format} className="flex justify-between items-center">
                    <span className="text-sm">{format}:</span>
                    <div className="flex items-center space-x-2">
                      <div className="w-20 bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-green-600 h-2 rounded-full" 
                          style={{ width: `${(count / metrics.camesExport.totalExports) * 100}%` }}
                        />
                      </div>
                      <span className="text-sm font-semibold w-8">{count}</span>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="z3950" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Search className="h-5 w-5 mr-2" />
                  Recherche Z39.50
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between">
                  <span>Recherches totales:</span>
                  <span className="font-semibold">{metrics.z3950.totalSearches}</span>
                </div>
                <div className="flex justify-between">
                  <span>Succès:</span>
                  <span className="font-semibold text-green-600">{metrics.z3950.successfulSearches}</span>
                </div>
                <div className="flex justify-between">
                  <span>Échecs:</span>
                  <span className="font-semibold text-red-600">{metrics.z3950.failedSearches}</span>
                </div>
                <div className="flex justify-between">
                  <span>Temps moyen:</span>
                  <span className="font-semibold">{Math.round(metrics.z3950.averageSearchTime)}ms</span>
                </div>
                <div className="flex justify-between">
                  <span>Enregistrements importés:</span>
                  <span className="font-semibold text-blue-600">{metrics.z3950.importedRecords}</span>
                </div>
                <div className="flex justify-between">
                  <span>Recherches fédérées:</span>
                  <span className="font-semibold text-purple-600">{metrics.z3950.federatedSearches}</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Serveurs utilisés</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {Object.entries(metrics.z3950.searchesByServer).map(([server, count]) => (
                  <div key={server} className="flex justify-between items-center">
                    <span className="text-sm">{server}:</span>
                    <div className="flex items-center space-x-2">
                      <div className="w-20 bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-purple-600 h-2 rounded-full" 
                          style={{ width: `${(count / metrics.z3950.totalSearches) * 100}%` }}
                        />
                      </div>
                      <span className="text-sm font-semibold w-8">{count}</span>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="standards" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Database className="h-5 w-5 mr-2" />
                  Dublin Core
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between">
                  <span>Enregistrements totaux:</span>
                  <span className="font-semibold">{metrics.dublinCore.totalRecords}</span>
                </div>
                <div className="flex justify-between">
                  <span>Valides:</span>
                  <span className="font-semibold text-green-600">{metrics.dublinCore.validRecords}</span>
                </div>
                <div className="flex justify-between">
                  <span>Bilingues:</span>
                  <span className="font-semibold text-blue-600">{metrics.dublinCore.bilingualRecords}</span>
                </div>
                <div className="flex justify-between">
                  <span>Exports XML:</span>
                  <span className="font-semibold">{metrics.dublinCore.xmlExports}</span>
                </div>
                <div className="flex justify-between">
                  <span>Exports JSON:</span>
                  <span className="font-semibold">{metrics.dublinCore.jsonExports}</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>MARC21</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between">
                  <span>Enregistrements totaux:</span>
                  <span className="font-semibold">{metrics.marc21.totalRecords}</span>
                </div>
                <div className="flex justify-between">
                  <span>Valides:</span>
                  <span className="font-semibold text-green-600">{metrics.marc21.validRecords}</span>
                </div>
                <div className="flex justify-between">
                  <span>Exports XML:</span>
                  <span className="font-semibold">{metrics.marc21.xmlExports}</span>
                </div>
                <div className="flex justify-between">
                  <span>Taille moyenne:</span>
                  <span className="font-semibold">{Math.round(metrics.marc21.averageRecordSize)} bytes</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="performance" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Activity className="h-5 w-5 mr-2" />
                  Système
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between">
                  <span>Uptime:</span>
                  <span className="font-semibold">{metrics.performance.systemUptime} jours</span>
                </div>
                <div className="flex justify-between">
                  <span>Mémoire:</span>
                  <span className="font-semibold">{Math.round(metrics.performance.memoryUsage)}%</span>
                </div>
                <div className="flex justify-between">
                  <span>Disque:</span>
                  <span className="font-semibold">{Math.round(metrics.performance.diskUsage)}%</span>
                </div>
                <div className="flex justify-between">
                  <span>Connexions DB:</span>
                  <span className="font-semibold">{metrics.performance.databaseConnections}</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Clock className="h-5 w-5 mr-2" />
                  Réponses
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between">
                  <span>Temps moyen:</span>
                  <span className="font-semibold">{Math.round(metrics.performance.averageResponseTime)}ms</span>
                </div>
                <div className="flex justify-between">
                  <span>Pic:</span>
                  <span className="font-semibold">{Math.round(metrics.performance.peakResponseTime)}ms</span>
                </div>
                <div className="flex justify-between">
                  <span>Req/sec:</span>
                  <span className="font-semibold">{Math.round(metrics.performance.requestsPerSecond)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Taux d'erreur:</span>
                  <span className="font-semibold">{metrics.performance.errorRate.toFixed(2)}%</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Tâches</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between">
                  <span>En cours:</span>
                  <span className="font-semibold text-blue-600">{metrics.performance.backgroundJobs.running}</span>
                </div>
                <div className="flex justify-between">
                  <span>En attente:</span>
                  <span className="font-semibold text-yellow-600">{metrics.performance.backgroundJobs.queued}</span>
                </div>
                <div className="flex justify-between">
                  <span>Échouées:</span>
                  <span className="font-semibold text-red-600">{metrics.performance.backgroundJobs.failed}</span>
                </div>
                <div className="flex justify-between">
                  <span>Cache hit:</span>
                  <span className="font-semibold text-green-600">{Math.round(metrics.performance.cacheHitRate)}%</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Alertes */}
      {alerts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <AlertTriangle className="h-5 w-5 mr-2 text-yellow-600" />
              Alertes Actives ({alerts.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {alerts.map((alert) => (
                <div 
                  key={alert.id} 
                  className={`p-3 rounded-lg border-l-4 ${
                    alert.type === 'error' ? 'border-red-500 bg-red-50' :
                    alert.type === 'warning' ? 'border-yellow-500 bg-yellow-50' :
                    'border-blue-500 bg-blue-50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Badge variant={alert.resolved ? "secondary" : "destructive"}>
                        {alert.service}
                      </Badge>
                      <span className="font-medium">{alert.message}</span>
                    </div>
                    <span className="text-sm text-gray-500">
                      {new Date(alert.timestamp).toLocaleString('fr-FR')}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 mt-1">{alert.details}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}