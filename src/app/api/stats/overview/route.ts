/**
 * API Route: /api/stats/overview
 * Statistiques générales du système avec vue library_stats
 */

import { NextRequest, NextResponse } from 'next/server';
import { executeQuery } from '@/lib/mysql';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || '1month';

    // Statistiques générales depuis la vue library_stats
    const [libraryStats] = await executeQuery('SELECT * FROM library_stats') as any[];

    // Récupérer les utilisateurs actifs pour le dashboard
    const [activeUsersResult] = await executeQuery('SELECT COUNT(*) as active_users FROM users WHERE is_active = 1') as any[];

    // Récupérer les réservations actives
    const [activeReservationsResult] = await executeQuery('SELECT COUNT(*) as active_reservations FROM reservations WHERE status = "active"') as any[];

    // Mapper les données pour correspondre à l'interface HomeStats
    const mappedStats = {
      total_books: libraryStats?.total_books || 0,
      total_users: activeUsersResult?.active_users || 0, // Utilisateurs actifs seulement
      active_loans: libraryStats?.active_loans || 0,
      active_reservations: activeReservationsResult?.active_reservations || 0, // NOUVEAU: Réservations actives
      total_theses: libraryStats?.total_theses || 0,
      total_memoires: libraryStats?.total_memoires || 0,
      total_stage_reports: libraryStats?.total_reports || 0 // CORRECTION: total_reports au lieu de total_stage_reports
    };

    // Statistiques par période
    const periodStats = await getPeriodStats(period);

    // Tendances
    const trends = await getTrends(period);

    return NextResponse.json({
      success: true,
      data: mappedStats, // Retourner directement les stats mappées
      meta: {
        period_stats: periodStats,
        trends: trends,
        period: period,
        generated_at: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Erreur API /api/stats/overview:', error);
    
    return NextResponse.json({
      success: false,
      error: {
        code: 'STATS_OVERVIEW_ERROR',
        message: 'Erreur lors de la récupération des statistiques générales',
        details: process.env.NODE_ENV === 'development' ? error : undefined
      }
    }, { status: 500 });
  }
}

async function getPeriodStats(period: string) {
  const periodMap: { [key: string]: number } = {
    '1day': 1,
    '1week': 7,
    '1month': 30,
    '3months': 90,
    '6months': 180,
    '1year': 365
  };

  const days = periodMap[period] || 30;

  try {
    const stats = await executeQuery(`
      SELECT
        (SELECT COUNT(*) FROM loans WHERE loan_date >= DATE_SUB(NOW(), INTERVAL ? DAY)) as loans_period,
        (SELECT COUNT(*) FROM reservations WHERE reservation_date >= DATE_SUB(NOW(), INTERVAL ? DAY)) as reservations_period,
        (SELECT COUNT(*) FROM penalties WHERE penalty_date >= DATE_SUB(NOW(), INTERVAL ? DAY)) as penalties_period,
        (SELECT COUNT(*) FROM recent_activities WHERE created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)) as activities_period
    `, [days, days, days, days]) as any[];

    return stats[0];
  } catch (error) {
    console.error('Erreur getPeriodStats:', error);
    return {
      loans_period: 0,
      reservations_period: 0,
      penalties_period: 0,
      activities_period: 0
    };
  }
}

async function getTrends(period: string) {
  const days = period === '1week' ? 7 : period === '1month' ? 30 : 30;

  try {
    const trends = await executeQuery(`
      SELECT
        DATE(created_at) as date,
        COUNT(*) as count,
        activity_type as action_type
      FROM recent_activities
      WHERE created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
      GROUP BY DATE(created_at), activity_type
      ORDER BY date DESC
      LIMIT 50
    `, [days]) as any[];

    return trends;
  } catch (error) {
    console.error('Erreur getTrends:', error);
    // Retourner des données par défaut en cas d'erreur
    return [
      { date: new Date().toISOString().split('T')[0], count: 0, action_type: 'system' }
    ];
  }
}