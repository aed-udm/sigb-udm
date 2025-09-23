/**
 * API Route: /api/analytics/reservations
 * Analyses avancées des réservations
 */

import { NextRequest, NextResponse } from 'next/server';
import { executeQuery } from '@/lib/mysql';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || '6months';
    const groupBy = searchParams.get('groupBy') || 'month';

    // Statistiques des réservations depuis analytics_reservations
    const reservationStats = await getReservationAnalytics(period, groupBy);

    // Analyse des temps d'attente
    const waitTimeAnalysis = await getWaitTimeAnalysis(period);

    // Analyse par catégorie
    const categoryAnalysis = await getCategoryAnalysis(period);

    // Tendances mensuelles
    const monthlyTrends = await getMonthlyTrends(period);

    return NextResponse.json({
      success: true,
      data: {
        reservation_stats: reservationStats,
        wait_time_analysis: waitTimeAnalysis,
        category_analysis: categoryAnalysis,
        monthly_trends: monthlyTrends,
        period: period,
        group_by: groupBy,
        generated_at: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Erreur API /api/analytics/reservations:', error);
    
    return NextResponse.json({
      success: false,
      error: {
        code: 'ANALYTICS_RESERVATIONS_ERROR',
        message: 'Erreur lors de l\'analyse des réservations',
        details: process.env.NODE_ENV === 'development' ? error : undefined
      }
    }, { status: 500 });
  }
}

async function getReservationAnalytics(period: string, groupBy: string) {
  const periodDays = getPeriodDays(period);
  
  const stats = await executeQuery(`
    SELECT 
      COUNT(*) as total_reservations,
      COUNT(CASE WHEN status = 'fulfilled' THEN 1 END) as fulfilled_reservations,
      COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_reservations,
      COUNT(CASE WHEN status = 'cancelled' THEN 1 END) as cancelled_reservations,
      AVG(wait_time_days) as avg_wait_time,
      MAX(wait_time_days) as max_wait_time,
      MIN(wait_time_days) as min_wait_time
    FROM analytics_reservations 
    WHERE reservation_date >= DATE_SUB(NOW(), INTERVAL ${periodDays} DAY)
  `) as any[];

  return stats[0];
}

async function getWaitTimeAnalysis(period: string) {
  const periodDays = getPeriodDays(period);

  const analysis = await executeQuery(`
    SELECT 
      book_category,
      COUNT(*) as total_reservations,
      AVG(wait_time_days) as avg_wait_time,
      COUNT(CASE WHEN wait_time_days <= 3 THEN 1 END) as quick_fulfillment,
      COUNT(CASE WHEN wait_time_days > 7 THEN 1 END) as slow_fulfillment
    FROM analytics_reservations 
    WHERE reservation_date >= DATE_SUB(NOW(), INTERVAL ${periodDays} DAY)
    AND status = 'fulfilled'
    GROUP BY book_category
    ORDER BY avg_wait_time ASC
  `) as any[];

  return analysis;
}

async function getCategoryAnalysis(period: string) {
  const periodDays = getPeriodDays(period);

  const analysis = await executeQuery(`
    SELECT 
      book_category,
      user_category,
      COUNT(*) as reservation_count,
      AVG(wait_time_days) as avg_wait_time,
      (COUNT(*) * 100.0 / (SELECT COUNT(*) FROM analytics_reservations WHERE reservation_date >= DATE_SUB(NOW(), INTERVAL ${periodDays} DAY))) as percentage
    FROM analytics_reservations 
    WHERE reservation_date >= DATE_SUB(NOW(), INTERVAL ${periodDays} DAY)
    GROUP BY book_category, user_category
    ORDER BY reservation_count DESC
  `) as any[];

  return analysis;
}

async function getMonthlyTrends(period: string) {
  const periodDays = getPeriodDays(period);

  const trends = await executeQuery(`
    SELECT 
      month_year,
      COUNT(*) as total_reservations,
      COUNT(CASE WHEN status = 'fulfilled' THEN 1 END) as fulfilled,
      AVG(wait_time_days) as avg_wait_time
    FROM analytics_reservations 
    WHERE reservation_date >= DATE_SUB(NOW(), INTERVAL ${periodDays} DAY)
    GROUP BY month_year
    ORDER BY month_year DESC
  `) as any[];

  return trends;
}

function getPeriodDays(period: string): number {
  const periodMap = {
    '1month': 30,
    '3months': 90,
    '6months': 180,
    '1year': 365
  };
  return periodMap[period] || 180;
}