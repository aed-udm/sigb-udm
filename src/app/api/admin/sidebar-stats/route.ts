/**
 * API Route: /api/admin/sidebar-stats
 * Statistiques pour la sidebar d'administration
 */

import { NextRequest, NextResponse } from 'next/server';
import { executeQuery } from '@/lib/mysql';

export async function GET(request: NextRequest) {
  try {
    // Statistiques principales pour la sidebar
    const mainStatsQuery = `
      SELECT 
        (SELECT COUNT(*) FROM books) as total_books,
        (SELECT COUNT(*) FROM books WHERE available_copies > 0) as available_books,
        (SELECT COUNT(*) FROM users WHERE is_active = 1) as active_users,
        (SELECT COUNT(*) FROM loans WHERE status = 'active') as active_loans,
        (SELECT COUNT(*) FROM loans l
         LEFT JOIN penalty_settings ps ON ps.document_type COLLATE utf8mb4_unicode_ci = COALESCE(l.document_type, 'book') COLLATE utf8mb4_unicode_ci AND ps.is_active = 1
         WHERE l.status = 'overdue'
         AND GREATEST(0, DATEDIFF(CURDATE(), l.due_date) - COALESCE(ps.grace_period_days, 1)) > 0) as overdue_loans,
        (SELECT COUNT(*) FROM reservations WHERE status = 'active') as active_reservations,
        (SELECT COUNT(*) FROM penalties WHERE status = 'unpaid') as unpaid_penalties,
        (SELECT COALESCE(SUM(amount_fcfa), 0) FROM penalties WHERE status = 'unpaid') as total_unpaid_amount
    `;

    const [mainStats] = await executeQuery(mainStatsQuery) as any[];

    // Statistiques des documents académiques
    const academicStatsQuery = `
      SELECT 
        (SELECT COUNT(*) FROM theses) as total_theses,
        (SELECT COUNT(*) FROM memoires) as total_memoires,
        (SELECT COUNT(*) FROM stage_reports) as total_stage_reports,
        (SELECT COUNT(*) FROM theses WHERE is_accessible = 1) as accessible_theses,
        (SELECT COUNT(*) FROM memoires WHERE is_accessible = 1) as accessible_memoires,
        (SELECT COUNT(*) FROM stage_reports WHERE is_accessible = 1) as accessible_stage_reports
    `;

    const [academicStats] = await executeQuery(academicStatsQuery) as any[];

    // Activités récentes (dernières 24h)
    const recentActivitiesQuery = `
      SELECT 
        'loan' as type,
        COUNT(*) as count
      FROM loans 
      WHERE created_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
      
      UNION ALL
      
      SELECT 
        'return' as type,
        COUNT(*) as count
      FROM loans 
      WHERE return_date >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
      
      UNION ALL
      
      SELECT 
        'reservation' as type,
        COUNT(*) as count
      FROM reservations 
      WHERE created_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
      
      UNION ALL
      
      SELECT 
        'new_user' as type,
        COUNT(*) as count
      FROM users 
      WHERE created_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
    `;

    const recentActivities = await executeQuery(recentActivitiesQuery) as any[];

    // Alertes système
    const alertsQuery = `
      SELECT 
        'overdue_loans' as alert_type,
        COUNT(*) as count,
        'warning' as severity
      FROM loans 
      WHERE status = 'overdue' AND due_date < DATE_SUB(NOW(), INTERVAL 7 DAY)
      
      UNION ALL
      
      SELECT 
        'expired_reservations' as alert_type,
        COUNT(*) as count,
        'info' as severity
      FROM reservations 
      WHERE status = 'expired'
      
      UNION ALL
      
      SELECT 
        'high_penalties' as alert_type,
        COUNT(*) as count,
        'error' as severity
      FROM penalties 
      WHERE status = 'unpaid' AND amount_fcfa > 5000
    `;

    const alerts = await executeQuery(alertsQuery) as any[];

    // Performance du système (requêtes récentes)
    const performanceQuery = `
      SELECT 
        AVG(execution_time_ms) as avg_response_time,
        COUNT(*) as total_queries,
        MAX(execution_time_ms) as max_response_time
      FROM query_performance_log 
      WHERE created_at >= DATE_SUB(NOW(), INTERVAL 1 HOUR)
    `;

    const [performance] = await executeQuery(performanceQuery) as any[];

    const response = {
      success: true,
      data: {
        main_stats: mainStats,
        academic_stats: academicStats,
        recent_activities: recentActivities.reduce((acc, activity) => {
          acc[activity.type] = activity.count;
          return acc;
        }, {}),
        alerts: alerts.filter(alert => alert.count > 0),
        performance: performance || { avg_response_time: 0, total_queries: 0, max_response_time: 0 },
        generated_at: new Date().toISOString()
      }
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('Erreur API /api/admin/sidebar-stats:', error);
    
    return NextResponse.json({
      success: false,
      error: {
        code: 'SIDEBAR_STATS_ERROR',
        message: 'Erreur lors du chargement des statistiques de la sidebar',
        details: process.env.NODE_ENV === 'development' ? error : undefined
      }
    }, { status: 500 });
  }
}
