/**
 * API Route: /api/admin/system-stats
 * Statistiques système détaillées pour l'administration
 */

import { NextRequest, NextResponse } from 'next/server';
import { executeQuery } from '@/lib/mysql';

export async function GET(request: NextRequest) {
  try {
    // Statistiques de la base de données
    const databaseStatsQuery = `
      SELECT 
        table_name,
        table_rows,
        ROUND(((data_length + index_length) / 1024 / 1024), 2) AS size_mb,
        ROUND((data_length / 1024 / 1024), 2) AS data_size_mb,
        ROUND((index_length / 1024 / 1024), 2) AS index_size_mb
      FROM information_schema.tables 
      WHERE table_schema = DATABASE()
      AND table_type = 'BASE TABLE'
      ORDER BY (data_length + index_length) DESC
    `;

    const databaseStats = await executeQuery(databaseStatsQuery) as any[];

    // Statistiques de performance
    const performanceStatsQuery = `
      SELECT 
        query_type,
        COUNT(*) as query_count,
        AVG(execution_time_ms) as avg_time,
        MIN(execution_time_ms) as min_time,
        MAX(execution_time_ms) as max_time,
        SUM(execution_time_ms) as total_time
      FROM query_performance_log 
      WHERE created_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
      GROUP BY query_type
      ORDER BY avg_time DESC
    `;

    const performanceStats = await executeQuery(performanceStatsQuery) as any[];

    // Statistiques d'utilisation
    const usageStatsQuery = `
      SELECT 
        DATE(created_at) as date,
        COUNT(*) as total_operations,
        SUM(CASE WHEN query_type = 'search' THEN 1 ELSE 0 END) as searches,
        SUM(CASE WHEN query_type = 'loan' THEN 1 ELSE 0 END) as loans,
        SUM(CASE WHEN query_type = 'reservation' THEN 1 ELSE 0 END) as reservations
      FROM query_performance_log 
      WHERE created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
      GROUP BY DATE(created_at)
      ORDER BY date DESC
    `;

    const usageStats = await executeQuery(usageStatsQuery) as any[];

    // Statistiques des erreurs système
    const errorStatsQuery = `
      SELECT 
        action,
        COUNT(*) as error_count,
        MAX(created_at) as last_occurrence
      FROM system_logs 
      WHERE message LIKE '%error%' OR message LIKE '%failed%'
      GROUP BY action
      ORDER BY error_count DESC
      LIMIT 10
    `;

    const errorStats = await executeQuery(errorStatsQuery) as any[];

    // Statistiques de stockage
    const storageStatsQuery = `
      SELECT 
        'books' as category,
        COUNT(*) as total_items,
        SUM(CASE WHEN document_path IS NOT NULL THEN 1 ELSE 0 END) as with_files,
        COALESCE(SUM(document_size), 0) as total_size_bytes
      FROM books
      
      UNION ALL
      
      SELECT 
        'theses' as category,
        COUNT(*) as total_items,
        SUM(CASE WHEN document_path IS NOT NULL THEN 1 ELSE 0 END) as with_files,
        COALESCE(SUM(document_size), 0) as total_size_bytes
      FROM theses
      
      UNION ALL
      
      SELECT 
        'memoires' as category,
        COUNT(*) as total_items,
        SUM(CASE WHEN document_path IS NOT NULL THEN 1 ELSE 0 END) as with_files,
        COALESCE(SUM(document_size), 0) as total_size_bytes
      FROM memoires
      
      UNION ALL
      
      SELECT 
        'stage_reports' as category,
        COUNT(*) as total_items,
        SUM(CASE WHEN document_path IS NOT NULL THEN 1 ELSE 0 END) as with_files,
        COALESCE(SUM(document_size), 0) as total_size_bytes
      FROM stage_reports
    `;

    const storageStats = await executeQuery(storageStatsQuery) as any[];

    // Statistiques de cache
    const cacheStatsQuery = `
      SELECT 
        COUNT(*) as total_entries,
        COUNT(CASE WHEN expires_at > NOW() THEN 1 END) as active_entries,
        COUNT(CASE WHEN expires_at <= NOW() THEN 1 END) as expired_entries,
        AVG(TIMESTAMPDIFF(SECOND, created_at, expires_at)) as avg_ttl_seconds
      FROM performance_cache
    `;

    const [cacheStats] = await executeQuery(cacheStatsQuery) as any[];

    // Calcul des totaux
    const totalDatabaseSize = databaseStats.reduce((sum, table) => sum + (table.size_mb || 0), 0);
    const totalStorageSize = storageStats.reduce((sum, cat) => sum + (cat.total_size_bytes || 0), 0);

    const response = {
      success: true,
      data: {
        database: {
          tables: databaseStats,
          total_size_mb: totalDatabaseSize,
          total_tables: databaseStats.length
        },
        performance: {
          queries: performanceStats,
          daily_usage: usageStats
        },
        storage: {
          categories: storageStats,
          total_size_bytes: totalStorageSize,
          total_size_mb: Math.round(totalStorageSize / 1024 / 1024 * 100) / 100
        },
        cache: cacheStats,
        errors: errorStats,
        system_info: {
          node_env: process.env.NODE_ENV,
          generated_at: new Date().toISOString(),
          uptime_hours: Math.round(process.uptime() / 3600 * 100) / 100
        }
      }
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('Erreur API /api/admin/system-stats:', error);
    
    return NextResponse.json({
      success: false,
      error: {
        code: 'SYSTEM_STATS_ERROR',
        message: 'Erreur lors du chargement des statistiques système',
        details: process.env.NODE_ENV === 'development' ? error : undefined
      }
    }, { status: 500 });
  }
}
