/**
 * API Route: /api/reservations/stats
 * Statistiques simples des réservations pour la page principale
 */

import { NextResponse } from 'next/server';
import { executeQuery } from '@/lib/mysql';
import { logAction } from '@/lib/system-logger';

export async function GET() {
  try {
    // Statistiques des réservations
    const statsQuery = `
      SELECT 
        COUNT(*) as total_reservations,
        COUNT(CASE WHEN status = 'active' THEN 1 END) as active_reservations,
        COUNT(CASE WHEN status = 'fulfilled' THEN 1 END) as fulfilled_reservations,
        COUNT(CASE WHEN status = 'cancelled' THEN 1 END) as cancelled_reservations,
        COUNT(CASE WHEN status = 'expired' OR (status = 'active' AND expiry_date < CURDATE()) THEN 1 END) as expired_reservations
      FROM reservations
    `;

    const result = await executeQuery(statsQuery) as any[];
    const stats = result[0];

    // Log successful stats retrieval
    await logAction({
      action: 'reservations_stats_retrieved',
      message: 'Statistiques des réservations récupérées avec succès',
      level: 'info',
      context: {
        stats: stats,
        timestamp: new Date().toISOString()
      }
    });

    return NextResponse.json({
      success: true,
      stats: {
        total_reservations: parseInt(stats.total_reservations) || 0,
        active_reservations: parseInt(stats.active_reservations) || 0,
        fulfilled_reservations: parseInt(stats.fulfilled_reservations) || 0,
        cancelled_reservations: parseInt(stats.cancelled_reservations) || 0,
        expired_reservations: parseInt(stats.expired_reservations) || 0
      }
    });

  } catch (error) {
    console.error('Erreur API /api/reservations/stats:', error);
    
    // Log error
    await logAction({
      action: 'reservations_stats_error',
      message: 'Erreur lors de la récupération des statistiques des réservations',
      level: 'error',
      context: {
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        timestamp: new Date().toISOString()
      }
    });
    
    return NextResponse.json({
      success: false,
      error: {
        code: 'RESERVATIONS_STATS_ERROR',
        message: 'Erreur lors de la récupération des statistiques',
        details: process.env.NODE_ENV === 'development' ? error : undefined
      }
    }, { status: 500 });
  }
}
