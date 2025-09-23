import { NextRequest, NextResponse } from 'next/server';
import { executeQuery } from '@/lib/mysql';

/**
 * API de Statistiques Unifiée
 * Remplace /stats/academic, /stats/overview, /stats/detailed, /stats/reservations
 * 
 * GET /api/stats?type=overview|academic|detailed|reservations&period=30d&start_date=...&end_date=...
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'overview';
    const period = searchParams.get('period') || '30d';
    const startDate = searchParams.get('start_date');
    const endDate = searchParams.get('end_date');

    switch (type) {
      case 'overview':
        return await getOverviewStats(period);
      
      case 'academic':
        return await getAcademicStats(period);
      
      case 'detailed':
        return await getDetailedStats(period);
      
      case 'reservations':
        return await getReservationsStats(period, startDate, endDate);
      
      default:
        return NextResponse.json(
          { error: 'Type de statistiques non supporté. Types disponibles: overview, academic, detailed, reservations' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Erreur API stats unifiée:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des statistiques' },
      { status: 500 }
    );
  }
}

/**
 * Statistiques générales (remplace /stats/overview)
 */
async function getOverviewStats(period: string) {
  try {
    // Statistiques générales
    const [generalStats] = await executeQuery(`
      SELECT 
        (SELECT COUNT(*) FROM books) as total_books,
        (SELECT COUNT(*) FROM users WHERE is_active = TRUE) as total_users,
        (SELECT COUNT(*) FROM loans) as total_loans,
        (SELECT COUNT(*) FROM theses) as total_theses,
        (SELECT COUNT(*) FROM memoires) as total_memoires,
        (SELECT COUNT(*) FROM reservations WHERE status = 'active') as active_reservations,
        (SELECT COUNT(*) FROM agents WHERE is_active = 1) as active_agents
    `) as Array<any>;

    // Tendances (ce mois vs mois dernier)
    const [currentMonthLoans] = await executeQuery(`
      SELECT COUNT(*) as count
      FROM loans
      WHERE YEAR(loan_date) = YEAR(CURDATE()) AND MONTH(loan_date) = MONTH(CURDATE())
    `) as Array<{count: number}>;

    const [lastMonthLoans] = await executeQuery(`
      SELECT COUNT(*) as count
      FROM loans
      WHERE YEAR(loan_date) = YEAR(DATE_SUB(CURDATE(), INTERVAL 1 MONTH))
      AND MONTH(loan_date) = MONTH(DATE_SUB(CURDATE(), INTERVAL 1 MONTH))
    `) as Array<{count: number}>;

    const [currentMonthUsers] = await executeQuery(`
      SELECT COUNT(*) as count
      FROM users
      WHERE is_active = TRUE AND YEAR(created_at) = YEAR(CURDATE()) AND MONTH(created_at) = MONTH(CURDATE())
    `) as Array<{count: number}>;

    const [lastMonthUsers] = await executeQuery(`
      SELECT COUNT(*) as count
      FROM users
      WHERE is_active = TRUE AND YEAR(created_at) = YEAR(DATE_SUB(CURDATE(), INTERVAL 1 MONTH))
      AND MONTH(created_at) = MONTH(DATE_SUB(CURDATE(), INTERVAL 1 MONTH))
    `) as Array<{count: number}>;

    // Calcul des tendances
    const loansTrend = lastMonthLoans[0]?.count > 0 
      ? ((currentMonthLoans[0]?.count - lastMonthLoans[0]?.count) / lastMonthLoans[0]?.count) * 100 
      : 0;

    const usersTrend = lastMonthUsers[0]?.count > 0 
      ? ((currentMonthUsers[0]?.count - lastMonthUsers[0]?.count) / lastMonthUsers[0]?.count) * 100 
      : 0;

    return NextResponse.json({
      type: 'overview',
      period,
      stats: generalStats,
      trends: {
        loans: {
          current: currentMonthLoans[0]?.count || 0,
          previous: lastMonthLoans[0]?.count || 0,
          trend: loansTrend
        },
        users: {
          current: currentMonthUsers[0]?.count || 0,
          previous: lastMonthUsers[0]?.count || 0,
          trend: usersTrend
        }
      }
    });
  } catch (error) {
    throw error;
  }
}

/**
 * Statistiques académiques (remplace /stats/academic)
 */
async function getAcademicStats(period: string) {
  try {
    // Statistiques générales des documents académiques
    const [academicStats] = await executeQuery(`
      SELECT 
        (SELECT COUNT(*) FROM theses) as total_theses,
        (SELECT COUNT(*) FROM memoires) as total_memoires,
        (SELECT COUNT(*) FROM stage_reports) as total_stage_reports,
        (SELECT COUNT(*) FROM theses WHERE document_path IS NOT NULL) as theses_with_files,
        (SELECT COUNT(*) FROM memoires WHERE document_path IS NOT NULL) as memoires_with_files,
        (SELECT COUNT(*) FROM stage_reports WHERE document_path IS NOT NULL) as stage_reports_with_files
    `) as Array<any>;

    // Statistiques par université pour les thèses
    const thesesByUniversity = await executeQuery(`
      SELECT 
        university,
        COUNT(*) as count
      FROM theses
      GROUP BY university
      ORDER BY count DESC
      LIMIT 10
    `);

    // Statistiques par spécialité pour les mémoires
    const memoiresBySpecialty = await executeQuery(`
      SELECT 
        specialty,
        COUNT(*) as count
      FROM memoires
      GROUP BY specialty
      ORDER BY count DESC
      LIMIT 10
    `);

    // Évolution par année
    const evolutionByYear = await executeQuery(`
      SELECT 
        YEAR(defense_date) as year,
        COUNT(CASE WHEN 'theses' THEN 1 END) as theses_count,
        COUNT(CASE WHEN 'memoires' THEN 1 END) as memoires_count
      FROM (
        SELECT defense_date, 'theses' as type FROM theses WHERE defense_date IS NOT NULL
        UNION ALL
        SELECT defense_date, 'memoires' as type FROM memoires WHERE defense_date IS NOT NULL
      ) as combined
      GROUP BY YEAR(defense_date)
      ORDER BY year DESC
      LIMIT 5
    `);

    return NextResponse.json({
      type: 'academic',
      period,
      stats: academicStats,
      byUniversity: thesesByUniversity,
      bySpecialty: memoiresBySpecialty,
      evolution: evolutionByYear
    });
  } catch (error) {
    throw error;
  }
}

/**
 * Statistiques détaillées (remplace /stats/detailed)
 */
async function getDetailedStats(period: string) {
  try {
    // Statistiques générales
    const [generalStats] = await executeQuery(`
      SELECT 
        (SELECT COUNT(*) FROM books) as total_books,
        (SELECT COUNT(*) FROM users) as total_users,
        (SELECT COUNT(*) FROM loans) as total_loans,
        (SELECT COUNT(*) FROM theses) as total_theses,
        (SELECT COUNT(*) FROM memoires) as total_memoires,
        (SELECT COUNT(*) FROM agents WHERE is_active = 1) as active_agents
    `) as Array<any>;

    // Top 5 des livres les plus empruntés
    const topBooks = await executeQuery(`
      SELECT 
        b.id,
        b.title,
        b.main_author,
        COUNT(l.id) as loan_count
      FROM books b
      LEFT JOIN loans l ON b.id = l.book_id
      GROUP BY b.id, b.title, b.main_author
      ORDER BY loan_count DESC
      LIMIT 5
    `);

    // Top 5 des utilisateurs les plus actifs
    const topUsers = await executeQuery(`
      SELECT 
        u.id,
        u.first_name,
        u.last_name,
        COUNT(l.id) as loan_count
      FROM users u
      LEFT JOIN loans l ON u.id = l.user_id
      WHERE u.is_active = TRUE
      GROUP BY u.id, u.first_name, u.last_name
      ORDER BY loan_count DESC
      LIMIT 5
    `);

    // Statistiques par domaine
    const statsByDomain = await executeQuery(`
      SELECT 
        domain,
        COUNT(*) as count
      FROM books
      WHERE domain IS NOT NULL AND domain != ''
      GROUP BY domain
      ORDER BY count DESC
      LIMIT 10
    `);

    return NextResponse.json({
      type: 'detailed',
      period,
      stats: generalStats,
      topBooks,
      topUsers,
      byDomain: statsByDomain
    });
  } catch (error) {
    throw error;
  }
}

/**
 * Statistiques des réservations (remplace /stats/reservations)
 */
async function getReservationsStats(period: string, startDate?: string | null, endDate?: string | null) {
  try {
    // Statistiques générales des réservations
    const [reservationStats] = await executeQuery(`
      SELECT 
        COUNT(CASE WHEN status = 'active' THEN 1 END) as active_reservations,
        COUNT(CASE WHEN status = 'fulfilled' THEN 1 END) as fulfilled_reservations,
        COUNT(CASE WHEN status = 'expired' THEN 1 END) as expired_reservations,
        COUNT(CASE WHEN status = 'cancelled' THEN 1 END) as cancelled_reservations,
        COUNT(*) as total_reservations,
        COUNT(CASE WHEN document_type = 'book' THEN 1 END) as book_reservations,
        COUNT(CASE WHEN document_type = 'thesis' THEN 1 END) as thesis_reservations,
        COUNT(CASE WHEN document_type = 'memoire' THEN 1 END) as memoire_reservations
      FROM reservations
      ${startDate && endDate ? `WHERE created_at BETWEEN '${startDate}' AND '${endDate}'` : ''}
    `) as Array<any>;

    // Évolution des réservations par jour (derniers 30 jours)
    const dailyReservations = await executeQuery(`
      SELECT 
        DATE(created_at) as date,
        COUNT(*) as count
      FROM reservations
      WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
      GROUP BY DATE(created_at)
      ORDER BY date DESC
    `);

    // Top des documents les plus réservés
    const topReservedDocuments = await executeQuery(`
      SELECT 
        document_id,
        document_type,
        COUNT(*) as reservation_count
      FROM reservations
      GROUP BY document_id, document_type
      ORDER BY reservation_count DESC
      LIMIT 10
    `);

    return NextResponse.json({
      type: 'reservations',
      period,
      stats: reservationStats,
      dailyEvolution: dailyReservations,
      topReserved: topReservedDocuments
    });
  } catch (error) {
    throw error;
  }
}
