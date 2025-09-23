/**
 * API pour les analytics avancées - SIGB UdM
 * Endpoint: /api/analytics/advanced
 */

import { NextRequest, NextResponse } from 'next/server';
import { executeQuery } from '@/lib/mysql';

// GET /api/analytics/advanced - Récupérer les statistiques avancées
export async function GET(request: NextRequest) {
  try {
    console.log('📊 Récupération des analytics avancées...');

    // Statistiques de performance
    const performanceStats = await getPerformanceStats();
    
    // Statistiques d'utilisation
    const usageStats = await getUsageStats();
    
    // Statistiques de collection
    const collectionStats = await getCollectionStats();
    
    // Métriques de qualité
    const qualityMetrics = await getQualityMetrics();

    const advancedAnalytics = {
      performance: performanceStats,
      usage: usageStats,
      collection: collectionStats,
      quality: qualityMetrics,
      generated_at: new Date().toISOString()
    };

    return NextResponse.json({
      success: true,
      data: advancedAnalytics,
      message: 'Analytics avancées récupérées avec succès'
    });

  } catch (error) {
    console.error('❌ Erreur analytics avancées:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Erreur lors de la récupération des analytics avancées',
      details: error instanceof Error ? error.message : 'Erreur inconnue'
    }, { status: 500 });
  }
}

async function getPerformanceStats() {
  try {
    // Temps de réponse moyen des emprunts
    const loanPerformance = await executeQuery(`
      SELECT 
        AVG(TIMESTAMPDIFF(SECOND, created_at, updated_at)) as avg_processing_time,
        COUNT(*) as total_processed
      FROM loans 
      WHERE status IN ('active', 'returned')
      AND created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
    `) as any[];

    // Performance des réservations
    const reservationPerformance = await executeQuery(`
      SELECT 
        AVG(TIMESTAMPDIFF(HOUR, created_at, fulfilled_at)) as avg_fulfillment_hours,
        COUNT(*) as total_fulfilled
      FROM reservations 
      WHERE status = 'fulfilled'
      AND created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
    `) as any[];

    return {
      loan_processing: {
        avg_time_seconds: loanPerformance[0]?.avg_processing_time || 0,
        total_processed: loanPerformance[0]?.total_processed || 0
      },
      reservation_fulfillment: {
        avg_time_hours: reservationPerformance[0]?.avg_fulfillment_hours || 0,
        total_fulfilled: reservationPerformance[0]?.total_fulfilled || 0
      }
    };
  } catch (error) {
    console.error('Erreur performance stats:', error);
    return {
      loan_processing: { avg_time_seconds: 0, total_processed: 0 },
      reservation_fulfillment: { avg_time_hours: 0, total_fulfilled: 0 }
    };
  }
}

async function getUsageStats() {
  try {
    // Utilisation par heure
    const hourlyUsage = await executeQuery(`
      SELECT 
        HOUR(created_at) as hour,
        COUNT(*) as activity_count
      FROM loans 
      WHERE created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
      GROUP BY HOUR(created_at)
      ORDER BY hour
    `) as any[];

    // Utilisation par jour de la semaine
    const weeklyUsage = await executeQuery(`
      SELECT 
        DAYNAME(created_at) as day_name,
        COUNT(*) as activity_count
      FROM loans 
      WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
      GROUP BY DAYNAME(created_at), DAYOFWEEK(created_at)
      ORDER BY DAYOFWEEK(created_at)
    `) as any[];

    return {
      hourly_distribution: hourlyUsage,
      weekly_distribution: weeklyUsage,
      peak_hour: hourlyUsage.reduce((max, curr) => 
        curr.activity_count > max.activity_count ? curr : max, 
        { hour: 0, activity_count: 0 }
      )
    };
  } catch (error) {
    console.error('Erreur usage stats:', error);
    return {
      hourly_distribution: [],
      weekly_distribution: [],
      peak_hour: { hour: 0, activity_count: 0 }
    };
  }
}

async function getCollectionStats() {
  try {
    // Statistiques de croissance de la collection
    const growthStats = await executeQuery(`
      SELECT 
        DATE_FORMAT(created_at, '%Y-%m') as month,
        COUNT(*) as new_items
      FROM (
        SELECT created_at FROM books
        UNION ALL
        SELECT created_at FROM theses
        UNION ALL
        SELECT created_at FROM memoires
        UNION ALL
        SELECT created_at FROM stage_reports
      ) as all_documents
      WHERE created_at >= DATE_SUB(NOW(), INTERVAL 12 MONTH)
      GROUP BY DATE_FORMAT(created_at, '%Y-%m')
      ORDER BY month DESC
      LIMIT 12
    `) as any[];

    // Taux d'utilisation par type
    const utilizationRates = await executeQuery(`
      SELECT 
        'books' as document_type,
        COUNT(DISTINCT b.id) as total_items,
        COUNT(DISTINCT l.document_id) as borrowed_items,
        ROUND((COUNT(DISTINCT l.document_id) / COUNT(DISTINCT b.id)) * 100, 2) as utilization_rate
      FROM books b
      LEFT JOIN loans l ON b.id = l.document_id AND l.document_type = 'book'
      UNION ALL
      SELECT 
        'academic' as document_type,
        COUNT(DISTINCT ad.id) as total_items,
        COUNT(DISTINCT l.document_id) as borrowed_items,
        ROUND((COUNT(DISTINCT l.document_id) / COUNT(DISTINCT ad.id)) * 100, 2) as utilization_rate
      FROM academic_documents ad
      LEFT JOIN loans l ON ad.id = l.document_id AND l.document_type = 'academic'
    `) as any[];

    return {
      growth_trend: growthStats,
      utilization_rates: utilizationRates,
      total_growth_last_year: growthStats.reduce((sum, month) => sum + (month.new_items || 0), 0)
    };
  } catch (error) {
    console.error('Erreur collection stats:', error);
    return {
      growth_trend: [],
      utilization_rates: [],
      total_growth_last_year: 0
    };
  }
}

async function getQualityMetrics() {
  try {
    // Métriques de qualité des données
    const dataQuality = await executeQuery(`
      SELECT 
        'books' as table_name,
        COUNT(*) as total_records,
        COUNT(CASE WHEN title IS NOT NULL AND title != '' THEN 1 END) as complete_titles,
        COUNT(CASE WHEN author IS NOT NULL AND author != '' THEN 1 END) as complete_authors,
        COUNT(CASE WHEN isbn IS NOT NULL AND isbn != '' THEN 1 END) as complete_isbn
      FROM books
      UNION ALL
      SELECT 
        'users' as table_name,
        COUNT(*) as total_records,
        COUNT(CASE WHEN full_name IS NOT NULL AND full_name != '' THEN 1 END) as complete_names,
        COUNT(CASE WHEN email IS NOT NULL AND email != '' THEN 1 END) as complete_emails,
        COUNT(CASE WHEN phone IS NOT NULL AND phone != '' THEN 1 END) as complete_phones
      FROM users
    `) as any[];

    // Métriques de service
    const serviceMetrics = await executeQuery(`
      SELECT 
        COUNT(CASE WHEN status = 'overdue' THEN 1 END) as overdue_loans,
        COUNT(CASE WHEN status = 'active' THEN 1 END) as active_loans,
        AVG(DATEDIFF(COALESCE(return_date, NOW()), loan_date)) as avg_loan_duration,
        COUNT(CASE WHEN DATEDIFF(COALESCE(return_date, NOW()), due_date) > 0 THEN 1 END) as late_returns
      FROM loans
      WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
    `) as any[];

    return {
      data_completeness: dataQuality,
      service_quality: serviceMetrics[0] || {
        overdue_loans: 0,
        active_loans: 0,
        avg_loan_duration: 0,
        late_returns: 0
      },
      quality_score: calculateQualityScore(dataQuality, serviceMetrics[0])
    };
  } catch (error) {
    console.error('Erreur quality metrics:', error);
    return {
      data_completeness: [],
      service_quality: {
        overdue_loans: 0,
        active_loans: 0,
        avg_loan_duration: 0,
        late_returns: 0
      },
      quality_score: 85
    };
  }
}

function calculateQualityScore(dataQuality: any[], serviceMetrics: any) {
  try {
    // Score basé sur la complétude des données (50%)
    let dataScore = 0;
    if (dataQuality.length > 0) {
      const booksData = dataQuality.find(d => d.table_name === 'books');
      if (booksData && booksData.total_records > 0) {
        const completeness = (
          (booksData.complete_titles / booksData.total_records) +
          (booksData.complete_authors / booksData.total_records)
        ) / 2;
        dataScore = completeness * 50;
      }
    }

    // Score basé sur la qualité de service (50%)
    let serviceScore = 50;
    if (serviceMetrics) {
      const totalLoans = (serviceMetrics.active_loans || 0) + (serviceMetrics.overdue_loans || 0);
      if (totalLoans > 0) {
        const overdueRate = (serviceMetrics.overdue_loans || 0) / totalLoans;
        serviceScore = Math.max(0, 50 - (overdueRate * 50));
      }
    }

    return Math.round(dataScore + serviceScore);
  } catch (error) {
    return 85; // Score par défaut
  }
}
