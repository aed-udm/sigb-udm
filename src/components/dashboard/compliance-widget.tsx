'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Shield, CheckCircle, AlertTriangle, ExternalLink, RefreshCw } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import Link from 'next/link';

interface ComplianceStatus {
  score: number;
  level: 'basic' | 'standard' | 'advanced' | 'excellent';
  working_features: number;
  total_features: number;
  last_check: string;
}

export function ComplianceWidget() {
  const [compliance, setCompliance] = useState<ComplianceStatus | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkCompliance();
  }, []);

  const checkCompliance = async () => {
    setLoading(true);
    try {
      // Test rapide des endpoints critiques CAMES
      const criticalEndpoints = [
        '/api/oai-pmh?verb=Identify',
        '/api/security/encryption-status',
        '/api/security/access-control',
        '/api/validation/pdfa',
        '/api/cames/export',
        '/api/cooperation/sync-dicames'
      ];

      let workingCount = 0;
      
      for (const endpoint of criticalEndpoints) {
        try {
          const response = await fetch(endpoint);
          if (response.ok) {
            workingCount++;
          }
        } catch (error) {
          // Endpoint non accessible
        }
      }

      const score = Math.round((workingCount / criticalEndpoints.length) * 100);
      let level: 'basic' | 'standard' | 'advanced' | 'excellent' = 'basic';
      
      if (score >= 95) level = 'excellent';
      else if (score >= 85) level = 'advanced';
      else if (score >= 70) level = 'standard';

      setCompliance({
        score,
        level,
        working_features: workingCount,
        total_features: criticalEndpoints.length,
        last_check: new Date().toISOString()
      });
    } catch (error) {
      console.error('Erreur vérification conformité:', error);
    } finally {
      setLoading(false);
    }
  };

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'excellent': return 'text-green-600 bg-green-100 dark:bg-green-800/90';
      case 'advanced': return 'text-green-600 bg-green-100 dark:bg-green-800/90';
      case 'standard': return 'text-yellow-600 bg-yellow-100 dark:bg-yellow-800/90';
      default: return 'text-red-600 bg-red-100 dark:bg-red-800/90';
    }
  };

  const getLevelText = (level: string) => {
    switch (level) {
      case 'excellent': return '🟢 EXCELLENT';
      case 'advanced': return '🟢 TRÈS BON';
      case 'standard': return '🟡 BON';
      default: return '🔴 CRITIQUE';
    }
  };

  const getLevelIcon = (level: string) => {
    switch (level) {
      case 'excellent':
      case 'advanced':
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'standard':
        return <AlertTriangle className="h-5 w-5 text-yellow-600" />;
      default:
        return <AlertTriangle className="h-5 w-5 text-red-600" />;
    }
  };

  if (loading) {
    return (
      <Card className="glass-card border-0 shadow-lg">
        <CardHeader className="pb-4">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-lg bg-green-100 dark:bg-green-800/90">
              <Shield className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <CardTitle className="text-lg">Standards DICAMES</CardTitle>
              <CardDescription>Vérification en cours...</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="h-6 w-6 animate-spin text-green-600" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <motion.div
      initial={{ y: 20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      <Card className="glass-card border-0 shadow-lg hover:shadow-xl transition-shadow">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2 rounded-lg bg-green-100 dark:bg-green-800/90">
                <Shield className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <CardTitle className="text-lg">Standards DICAMES</CardTitle>
                <CardDescription>
                  Validation et préparation d'exports DICAMES
                </CardDescription>
              </div>
            </div>
            {compliance && getLevelIcon(compliance.level)}
          </div>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {compliance && (
            <>
              {/* Score principal */}
              <div className="text-center space-y-2">
                <div className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-green-600 to-green-700">
                  {compliance.score}%
                </div>
                <Badge className={`text-sm px-3 py-1 ${getLevelColor(compliance.level)}`}>
                  {getLevelText(compliance.level)}
                </Badge>
              </div>

              {/* Barre de progression */}
              <div className="space-y-2">
                <div className="flex justify-between text-sm text-gray-600 dark:text-gray-300">
                  <span>Fonctionnalités</span>
                  <span>{compliance.working_features}/{compliance.total_features}</span>
                </div>
                <Progress value={compliance.score} className="h-2" />
              </div>

              {/* Message de statut */}
              <div className="text-center">
                {compliance.level === 'excellent' && (
                  <p className="text-sm text-green-600 dark:text-green-400 font-medium">
                    🎉 Conformité parfaite !
                  </p>
                )}
                {compliance.level === 'advanced' && (
                  <p className="text-sm text-green-600 dark:text-green-400 font-medium">
                    ✨ Très bonne conformité
                  </p>
                )}
                {compliance.level === 'standard' && (
                  <p className="text-sm text-yellow-600 dark:text-yellow-400 font-medium">
                    ⚠️ Conformité acceptable
                  </p>
                )}
                {compliance.level === 'basic' && (
                  <p className="text-sm text-red-600 dark:text-red-400 font-medium">
                    🚨 Action requise
                  </p>
                )}
              </div>

              {/* Actions */}
              <div className="flex space-x-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={checkCompliance}
                  className="flex-1"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Actualiser
                </Button>
                
                <Link href="/admin/compliance" className="flex-1">
                  <Button size="sm" className="w-full bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800">
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Détails
                  </Button>
                </Link>
              </div>

              {/* Dernière vérification */}
              <p className="text-xs text-gray-600 dark:text-gray-300 text-center">
                Dernière vérification : {new Date(compliance.last_check).toLocaleTimeString('fr-FR')}
              </p>
            </>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
