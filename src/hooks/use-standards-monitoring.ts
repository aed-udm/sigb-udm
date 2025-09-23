import { useState, useEffect, useCallback } from 'react';
import { StandardsMetrics, MonitoringAlert } from '@/lib/services/standards-monitoring-service';

interface UseStandardsMonitoringOptions {
  autoRefresh?: boolean;
  refreshInterval?: number; // en millisecondes
}

interface UseStandardsMonitoringReturn {
  metrics: StandardsMetrics | null;
  alerts: MonitoringAlert[];
  loading: boolean;
  error: string | null;
  lastUpdated: string | null;
  refresh: () => Promise<void>;
  recordMetric: (service: string, metric: string, value: number, metadata?: Record<string, any>) => Promise<void>;
}

export function useStandardsMonitoring(options: UseStandardsMonitoringOptions = {}): UseStandardsMonitoringReturn {
  const { autoRefresh = true, refreshInterval = 5 * 60 * 1000 } = options; // 5 minutes par défaut
  
  const [metrics, setMetrics] = useState<StandardsMetrics | null>(null);
  const [alerts, setAlerts] = useState<MonitoringAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  const fetchMetrics = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch('/api/monitoring/standards');
      const data = await response.json();
      
      if (data.success) {
        setMetrics(data.data.metrics);
        setAlerts(data.data.alerts);
        setLastUpdated(data.data.lastUpdated);
      } else {
        setError(data.error?.message || 'Erreur lors du chargement des métriques');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur de connexion');
      console.error('Erreur chargement métriques:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const recordMetric = useCallback(async (
    service: string, 
    metric: string, 
    value: number, 
    metadata?: Record<string, any>
  ) => {
    try {
      const response = await fetch('/api/monitoring/standards', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          service,
          metric,
          value,
          metadata
        })
      });

      const data = await response.json();
      
      if (!data.success) {
        console.error('Erreur enregistrement métrique:', data.error);
      } else {
        // Actualiser les métriques après enregistrement
        await fetchMetrics();
      }
    } catch (err) {
      console.error('Erreur enregistrement métrique:', err);
    }
  }, [fetchMetrics]);

  // Chargement initial
  useEffect(() => {
    fetchMetrics();
  }, [fetchMetrics]);

  // Auto-refresh
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(fetchMetrics, refreshInterval);
    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval, fetchMetrics]);

  return {
    metrics,
    alerts,
    loading,
    error,
    lastUpdated,
    refresh: fetchMetrics,
    recordMetric
  };
}

/**
 * Hook spécialisé pour surveiller un service spécifique
 */
export function useServiceMonitoring(service: string) {
  const [serviceMetrics, setServiceMetrics] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchServiceMetrics = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(`/api/monitoring/standards?service=${service}`);
      const data = await response.json();
      
      if (data.success) {
        setServiceMetrics(data.data.metrics);
      } else {
        setError(data.error?.message || `Erreur lors du chargement des métriques ${service}`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur de connexion');
      console.error(`Erreur chargement métriques ${service}:`, err);
    } finally {
      setLoading(false);
    }
  }, [service]);

  useEffect(() => {
    fetchServiceMetrics();
  }, [fetchServiceMetrics]);

  return {
    metrics: serviceMetrics,
    loading,
    error,
    refresh: fetchServiceMetrics
  };
}

/**
 * Hook pour surveiller les alertes uniquement
 */
export function useMonitoringAlerts() {
  const { alerts, loading, error, refresh } = useStandardsMonitoring({ autoRefresh: true, refreshInterval: 2 * 60 * 1000 }); // 2 minutes
  
  const criticalAlerts = alerts.filter(alert => alert.severity === 'critical' && !alert.resolved);
  const highAlerts = alerts.filter(alert => alert.severity === 'high' && !alert.resolved);
  const activeAlerts = alerts.filter(alert => !alert.resolved);
  
  return {
    alerts,
    criticalAlerts,
    highAlerts,
    activeAlerts,
    totalAlerts: alerts.length,
    criticalCount: criticalAlerts.length,
    highCount: highAlerts.length,
    activeCount: activeAlerts.length,
    loading,
    error,
    refresh
  };
}

/**
 * Hook pour les métriques de performance système
 */
export function usePerformanceMetrics() {
  const { metrics, loading, error, refresh } = useStandardsMonitoring({ 
    autoRefresh: true, 
    refreshInterval: 30 * 1000 // 30 secondes pour les métriques de performance
  });
  
  const performance = metrics?.performance;
  
  // Calculer les statuts de santé
  const systemHealth = {
    overall: 'good' as 'good' | 'warning' | 'critical',
    responseTime: performance?.averageResponseTime || 0,
    errorRate: performance?.errorRate || 0,
    memoryUsage: performance?.memoryUsage || 0,
    uptime: performance?.systemUptime || 0
  };
  
  if (performance) {
    if (performance.averageResponseTime > 1000 || performance.errorRate > 5 || performance.memoryUsage > 90) {
      systemHealth.overall = 'critical';
    } else if (performance.averageResponseTime > 500 || performance.errorRate > 2 || performance.memoryUsage > 80) {
      systemHealth.overall = 'warning';
    }
  }
  
  return {
    performance,
    systemHealth,
    loading,
    error,
    refresh
  };
}

/**
 * Hook pour les métriques de conformité
 */
export function useComplianceMetrics() {
  const { metrics, loading, error, refresh } = useStandardsMonitoring();
  
  const compliance = metrics?.compliance;
  
  const complianceStatus = {
    level: 'basic' as 'critical' | 'basic' | 'standard' | 'advanced' | 'excellent',
    score: compliance?.overallScore || 0,
    camesReady: compliance?.documentsReady.camesReady || 0,
    dicamesReady: compliance?.documentsReady.dicamesReady || 0,
    oaiReady: compliance?.documentsReady.oaiReady || 0
  };
  
  if (compliance) {
    if (compliance.overallScore >= 95) complianceStatus.level = 'excellent';
    else if (compliance.overallScore >= 85) complianceStatus.level = 'advanced';
    else if (compliance.overallScore >= 70) complianceStatus.level = 'standard';
    else if (compliance.overallScore >= 50) complianceStatus.level = 'basic';
    else complianceStatus.level = 'critical';
  }
  
  return {
    compliance,
    complianceStatus,
    loading,
    error,
    refresh
  };
}