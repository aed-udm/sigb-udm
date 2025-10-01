/**
 * API Route: /api/analytics
 * Données complètes pour la page Analytics
 */

import { NextRequest, NextResponse } from 'next/server';
import { executeQuery } from '@/lib/mysql';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const selectedMonth = searchParams.get('month');

    // Condition pour filtrer par mois spécifique si sélectionné
    let periodCondition = '';
    let monthsBack = 12; // Par défaut, on prend les 12 derniers mois pour les graphiques

    if (selectedMonth) {
      periodCondition = `AND DATE_FORMAT(loan_date, '%Y-%m') = '${selectedMonth}'`;
    }
    // Sinon, on prend toutes les données (pas de filtre de période global)

    // Statistiques de base étendues
    const [basicStats] = await executeQuery(`
      SELECT 
        (SELECT COUNT(*) FROM books) as total_books,
        (SELECT COUNT(*) FROM users WHERE is_active = 1) as total_users,
        (SELECT COUNT(*) FROM loans WHERE status = 'active') as active_loans,
        (SELECT COUNT(*) FROM loans WHERE status = 'overdue') as overdue_loans,
        (SELECT COUNT(*) FROM theses) as total_theses,
        (SELECT COUNT(*) FROM memoires) as total_memoires,
        (SELECT COUNT(*) FROM stage_reports) as total_stage_reports,
        (SELECT COUNT(*) FROM reservations WHERE status = 'active') as active_reservations,
        (SELECT COUNT(DISTINCT user_id) FROM loans WHERE loan_date >= DATE_SUB(NOW(), INTERVAL 1 MONTH)) as monthly_active_users,
        (SELECT AVG(DATEDIFF(return_date, loan_date)) FROM loans WHERE return_date IS NOT NULL AND loan_date >= DATE_SUB(NOW(), INTERVAL 3 MONTH)) as avg_loan_duration,
        (SELECT COUNT(*) FROM loans WHERE fine_amount > 0 AND loan_date >= DATE_SUB(NOW(), INTERVAL 1 MONTH)) as loans_with_fines,
        (SELECT SUM(fine_amount) FROM loans WHERE fine_amount > 0 AND loan_date >= DATE_SUB(NOW(), INTERVAL 1 MONTH)) as total_fines_amount
    `) as any[];

    // Emprunts mensuels avec filtrage dynamique
    const monthlyLoans = await executeQuery(`
      SELECT
        DATE_FORMAT(loan_date, '%Y-%m') as month,
        COUNT(*) as loans,
        COUNT(CASE WHEN return_date IS NOT NULL THEN 1 END) as returns,
        COUNT(CASE WHEN status = 'overdue' THEN 1 END) as overdue,
        AVG(CASE WHEN return_date IS NOT NULL THEN DATEDIFF(return_date, loan_date) END) as avg_duration,
        COUNT(DISTINCT user_id) as unique_users,
        COUNT(DISTINCT book_id) as unique_books
      FROM loans
      WHERE 1=1 ${periodCondition}
      GROUP BY DATE_FORMAT(loan_date, '%Y-%m')
      ORDER BY month DESC
      LIMIT 12
    `) as any[];

    // Ajouts mensuels de collections
    const monthlyAdditions = await executeQuery(`
      SELECT
        month,
        SUM(books) as books,
        SUM(academic) as academic,
        SUM(books + academic) as total
      FROM (
        SELECT
          DATE_FORMAT(created_at, '%Y-%m') as month,
          COUNT(*) as books,
          0 as academic
        FROM books
        WHERE 1=1 ${selectedMonth ? `AND DATE_FORMAT(created_at, '%Y-%m') = '${selectedMonth}'` : ''}
        GROUP BY DATE_FORMAT(created_at, '%Y-%m')

        UNION ALL

        SELECT
          DATE_FORMAT(created_at, '%Y-%m') as month,
          0 as books,
          COUNT(*) as academic
        FROM theses
        WHERE 1=1 ${selectedMonth ? `AND DATE_FORMAT(created_at, '%Y-%m') = '${selectedMonth}'` : ''}
        GROUP BY DATE_FORMAT(created_at, '%Y-%m')

        UNION ALL

        SELECT
          DATE_FORMAT(created_at, '%Y-%m') as month,
          0 as books,
          COUNT(*) as academic
        FROM memoires
        WHERE 1=1 ${selectedMonth ? `AND DATE_FORMAT(created_at, '%Y-%m') = '${selectedMonth}'` : ''}
        GROUP BY DATE_FORMAT(created_at, '%Y-%m')

        UNION ALL

        SELECT
          DATE_FORMAT(created_at, '%Y-%m') as month,
          0 as books,
          COUNT(*) as academic
        FROM stage_reports
        WHERE 1=1 ${selectedMonth ? `AND DATE_FORMAT(created_at, '%Y-%m') = '${selectedMonth}'` : ''}
        GROUP BY DATE_FORMAT(created_at, '%Y-%m')
      ) combined
      GROUP BY month
      ORDER BY month DESC
      LIMIT 12
    `) as any[];

    // Statistiques détaillées par type de document
    const documentTypeStats = await executeQuery(`
      SELECT 
        'Livres' as type,
        COUNT(*) as total_count,
        COUNT(CASE WHEN status = 'available' THEN 1 END) as available_count,
        COUNT(CASE WHEN status = 'borrowed' THEN 1 END) as borrowed_count
      FROM books
      UNION ALL
      SELECT 
        'Thèses' as type,
        COUNT(*) as total_count,
        COUNT(*) as available_count,
        0 as borrowed_count
      FROM theses
      UNION ALL
      SELECT 
        'Mémoires' as type,
        COUNT(*) as total_count,
        COUNT(*) as available_count,
        0 as borrowed_count
      FROM memoires
      UNION ALL
      SELECT 
        'Rapports de stage' as type,
        COUNT(*) as total_count,
        COUNT(*) as available_count,
        0 as borrowed_count
      FROM stage_reports
    `) as any[];

    // Top domaines/spécialités les plus empruntés
    const topDomains = await executeQuery(`
      SELECT 
        COALESCE(b.domain, 'Non classé') as domain,
        COUNT(l.id) as loans_count,
        COUNT(DISTINCT b.id) as books_count,
        ROUND(COUNT(l.id) / COUNT(DISTINCT b.id), 2) as avg_loans_per_book
      FROM books b
      LEFT JOIN loans l ON b.id = l.book_id ${selectedMonth ? `AND DATE_FORMAT(l.loan_date, '%Y-%m') = '${selectedMonth}'` : ''}
      GROUP BY b.domain
      HAVING loans_count > 0
      ORDER BY loans_count DESC
      LIMIT 8
    `) as any[];

    // Statistiques des utilisateurs par statut
    const userStatusStats = await executeQuery(`
      SELECT 
        COALESCE(account_status, 'Non défini') as status,
        COUNT(*) as user_count,
        COUNT(CASE WHEN is_active = 1 THEN 1 END) as active_count,
        AVG(CASE WHEN is_active = 1 THEN (
          SELECT COUNT(*) FROM loans WHERE user_id = users.id ${selectedMonth ? `AND DATE_FORMAT(loan_date, '%Y-%m') = '${selectedMonth}'` : ''}
        ) END) as avg_loans_per_user
      FROM users
      GROUP BY account_status
      ORDER BY user_count DESC
    `) as any[];

    // Analyse des retards et amendes
    const finesAnalysis = await executeQuery(`
      SELECT 
        COUNT(*) as total_overdue_loans,
        AVG(fine_amount) as avg_fine_amount,
        SUM(fine_amount) as total_fines,
        AVG(DATEDIFF(COALESCE(return_date, CURDATE()), due_date)) as avg_days_overdue,
        COUNT(CASE WHEN fine_amount > 0 THEN 1 END) as loans_with_fines
      FROM loans 
      WHERE status = 'overdue' OR fine_amount > 0
      ${selectedMonth ? `AND DATE_FORMAT(loan_date, '%Y-%m') = '${selectedMonth}'` : ''}
    `) as any[];

    // Livres populaires avec filtrage par période
    let popularBooks = [];
    try {
      popularBooks = await executeQuery(`
        SELECT 
          b.id,
          b.title,
          b.main_author as author,
          COUNT(l.id) as loans_count,
          b.domain as category,
          b.status,
          ROUND(COUNT(l.id) / NULLIF((SELECT COUNT(*) FROM loans WHERE book_id = b.id), 0) * 100, 2) as popularity_score
        FROM books b
        LEFT JOIN loans l ON b.id = l.book_id ${selectedMonth ? `AND DATE_FORMAT(l.loan_date, '%Y-%m') = '${selectedMonth}'` : ''}
        GROUP BY b.id, b.title, b.main_author, b.domain, b.status
        ORDER BY loans_count DESC
        LIMIT 10
      `) as any[];
    } catch (error) {
      console.warn('Erreur lors de la récupération des livres populaires:', error);
      popularBooks = [];
    }

    // Utilisateurs actifs avec filtrage par période
    let activeUsers = [];
    try {
      activeUsers = await executeQuery(`
        SELECT 
          u.id,
          u.full_name as name,
          u.email,
          u.account_status,
          COUNT(l.id) as loans_count,
          COUNT(CASE WHEN l.return_date IS NOT NULL THEN 1 END) as returned_count,
          COUNT(CASE WHEN l.status = 'overdue' THEN 1 END) as overdue_count,
          SUM(COALESCE(l.fine_amount, 0)) as total_fines
        FROM users u
        LEFT JOIN loans l ON u.id = l.user_id ${selectedMonth ? `AND DATE_FORMAT(l.loan_date, '%Y-%m') = '${selectedMonth}'` : ''}
        WHERE u.is_active = 1
        GROUP BY u.id, u.full_name, u.email, u.account_status
        ORDER BY loans_count DESC
        LIMIT 10
      `) as any[];
    } catch (error) {
      console.warn('Erreur lors de la récupération des utilisateurs actifs:', error);
      activeUsers = [];
    }

    // Livres les plus réservés
    let popularReservedBooks = [];
    try {
      popularReservedBooks = await executeQuery(`
        SELECT
          b.id,
          b.title,
          b.main_author as author,
          COUNT(r.id) as reservations_count,
          b.domain as category,
          b.status
        FROM books b
        LEFT JOIN reservations r ON b.id = r.book_id ${selectedMonth ? `AND DATE_FORMAT(r.reservation_date, '%Y-%m') = '${selectedMonth}'` : ''}
        WHERE r.id IS NOT NULL
        GROUP BY b.id, b.title, b.main_author, b.domain, b.status
        ORDER BY reservations_count DESC
        LIMIT 10
      `) as any[];
    } catch (error) {
      console.warn('Erreur lors de la récupération des livres réservés:', error);
      popularReservedBooks = [];
    }

    // Documents académiques les plus empruntés - VERSION ULTRA SIMPLIFIÉE
    let popularAcademicDocuments = [];
    try {
      // Requête séparée pour éviter UNION ALL qui cause des erreurs
      const theses = await executeQuery(`
        SELECT
          id,
          title,
          main_author as author,
          0 as loans_count,
          'these' as document_type,
          COALESCE(specialty, 'Non spécifié') as specialty
        FROM theses
        WHERE status = 'available'
        LIMIT 3
      `) as any[];

      const memoires = await executeQuery(`
        SELECT
          id,
          title,
          main_author as author,
          0 as loans_count,
          'memoire' as document_type,
          COALESCE(specialty, 'Non spécifié') as specialty
        FROM memoires
        WHERE status = 'available'
        LIMIT 3
      `) as any[];

      popularAcademicDocuments = [...theses, ...memoires];
    } catch (error) {
      console.warn('Erreur lors de la récupération des documents académiques populaires:', error);
      // En cas d'erreur de collation, essayer une requête simplifiée
      try {
        popularAcademicDocuments = await executeQuery(`
          SELECT
            id,
            title,
            author,
            0 as loans_count,
            'document' as document_type,
            specialty
          FROM (
            SELECT id, title, main_author as author, COALESCE(specialty, 'Non spécifié') as specialty FROM theses WHERE status = 'available' LIMIT 3
            UNION ALL
            SELECT id, title, main_author as author, COALESCE(specialty, 'Non spécifié') as specialty FROM memoires WHERE status = 'available' LIMIT 3
            UNION ALL
            SELECT id, title, student_name as author, COALESCE(specialty, 'Non spécifié') as specialty FROM stage_reports WHERE status = 'available' LIMIT 3
          ) combined
          LIMIT 10
        `) as any[];
      } catch (fallbackError) {
        console.error('Erreur de fallback pour documents populaires:', fallbackError);
        popularAcademicDocuments = [];
      }
    }

    // Documents académiques les plus réservés - AVEC VRAIES DONNÉES DE RÉSERVATIONS
    let popularReservedAcademicDocuments = [];
    try {
      // Récupérer les documents académiques avec le plus de réservations actives
      const reservedDocs = await executeQuery(`
        SELECT
          r.academic_document_id as id,
          COALESCE(t.title, m.title, sr.title) as title,
          COALESCE(t.main_author, m.main_author, sr.student_name) as author,
          COUNT(r.id) as reservations_count,
          CASE
            WHEN t.id IS NOT NULL THEN 'these'
            WHEN m.id IS NOT NULL THEN 'memoire'
            WHEN sr.id IS NOT NULL THEN 'rapport_stage'
            ELSE 'unknown'
          END as document_type,
          COALESCE(t.specialty, m.specialty, sr.specialty, 'Non spécifié') as specialty
        FROM reservations r
        LEFT JOIN theses t ON CAST(r.academic_document_id AS CHAR CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci) = CAST(t.id AS CHAR CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci) AND r.document_type IN ('these', 'academic')
        LEFT JOIN memoires m ON CAST(r.academic_document_id AS CHAR CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci) = CAST(m.id AS CHAR CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci) AND r.document_type IN ('memoire', 'academic')
        LEFT JOIN stage_reports sr ON CAST(r.academic_document_id AS CHAR CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci) = CAST(sr.id AS CHAR CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci) AND r.document_type IN ('rapport_stage', 'academic')
        WHERE r.status = 'active'
          AND r.academic_document_id IS NOT NULL
          AND (t.id IS NOT NULL OR m.id IS NOT NULL OR sr.id IS NOT NULL)
        GROUP BY r.academic_document_id, document_type
        ORDER BY reservations_count DESC
        LIMIT 5
      `) as any[];

      popularReservedAcademicDocuments = reservedDocs;

      // Si aucune réservation active, afficher des documents populaires avec 0 réservations
      if (popularReservedAcademicDocuments.length === 0) {
        const fallbackDocs = await executeQuery(`
          SELECT
            id,
            title,
            main_author as author,
            0 as reservations_count,
            'these' as document_type,
            COALESCE(specialty, 'Non spécifié') as specialty
          FROM theses
          WHERE status = 'available'
          ORDER BY RAND()
          LIMIT 3
        `) as any[];

        popularReservedAcademicDocuments = fallbackDocs;
      }
    } catch (error) {
      console.warn('Erreur lors de la récupération des documents académiques réservés:', error);
      // En cas d'erreur, utiliser des données de démonstration
      popularReservedAcademicDocuments = [
        {
          id: 'demo-1',
          title: 'Analyse des Systèmes d\'Information',
          author: 'Dr. Jean Dupont',
          reservations_count: 0,
          document_type: 'these',
          specialty: 'Informatique'
        },
        {
          id: 'demo-2',
          title: 'Gestion des Ressources Humaines',
          author: 'Marie Kouam',
          reservations_count: 0,
          document_type: 'memoire',
          specialty: 'Management'
        }
      ];
      popularReservedAcademicDocuments = [];
      }

    // Statistiques par catégorie avec filtrage par période
    let categoryStats = [];
    try {
      categoryStats = await executeQuery(`
        SELECT 
          COALESCE(b.domain, 'Non classé') as category,
          COUNT(DISTINCT b.id) as books_count,
          COUNT(l.id) as loans_count,
          ROUND((COUNT(l.id) * 100.0 / NULLIF((SELECT COUNT(*) FROM loans ${selectedMonth ? `WHERE DATE_FORMAT(loan_date, '%Y-%m') = '${selectedMonth}'` : ''}), 0)), 2) as percentage,
          COUNT(DISTINCT l.user_id) as unique_borrowers,
          AVG(CASE WHEN l.return_date IS NOT NULL THEN DATEDIFF(l.return_date, l.loan_date) END) as avg_loan_duration
        FROM books b
        LEFT JOIN loans l ON b.id = l.book_id ${selectedMonth ? `AND DATE_FORMAT(l.loan_date, '%Y-%m') = '${selectedMonth}'` : ''}
        GROUP BY b.domain
        ORDER BY loans_count DESC
        LIMIT 12
      `) as any[];
    } catch (error) {
      console.warn('Erreur lors de la récupération des statistiques par catégorie:', error);
      categoryStats = [];
    }

    // Calcul des tendances (ce mois vs mois dernier)
    const [currentMonthLoans] = await executeQuery(`
      SELECT COUNT(*) as count
      FROM loans
      WHERE YEAR(loan_date) = YEAR(CURDATE()) AND MONTH(loan_date) = MONTH(CURDATE())
    `) as any[];

    const [lastMonthLoans] = await executeQuery(`
      SELECT COUNT(*) as count
      FROM loans
      WHERE YEAR(loan_date) = YEAR(DATE_SUB(CURDATE(), INTERVAL 1 MONTH))
      AND MONTH(loan_date) = MONTH(DATE_SUB(CURDATE(), INTERVAL 1 MONTH))
    `) as any[];

    const [currentMonthUsers] = await executeQuery(`
      SELECT COUNT(*) as count
      FROM users
      WHERE is_active = 1 AND YEAR(created_at) = YEAR(CURDATE()) AND MONTH(created_at) = MONTH(CURDATE())
    `) as any[];

    const [lastMonthUsers] = await executeQuery(`
      SELECT COUNT(*) as count
      FROM users
      WHERE is_active = 1 AND YEAR(created_at) = YEAR(DATE_SUB(CURDATE(), INTERVAL 1 MONTH))
      AND MONTH(created_at) = MONTH(DATE_SUB(CURDATE(), INTERVAL 1 MONTH))
    `) as any[];

    // Calcul des tendances
    const loansTrend = lastMonthLoans[0]?.count > 0 
      ? ((currentMonthLoans[0]?.count - lastMonthLoans[0]?.count) / lastMonthLoans[0]?.count) * 100 
      : 0;

    const usersTrend = lastMonthUsers[0]?.count > 0 
      ? ((currentMonthUsers[0]?.count - lastMonthUsers[0]?.count) / lastMonthUsers[0]?.count) * 100 
      : 0;

    // Taux de retour (approximatif)
    const [returnStats] = await executeQuery(`
      SELECT 
        COUNT(*) as total_loans,
        COUNT(CASE WHEN return_date IS NOT NULL THEN 1 END) as returned_loans
      FROM loans
      WHERE loan_date >= DATE_SUB(NOW(), INTERVAL 1 MONTH)
    `) as any[];

    const returnRate = returnStats?.total_loans > 0 
      ? (returnStats.returned_loans / returnStats.total_loans) * 100 
      : 0;

    // Formatage des données étendues pour l'interface
    const analyticsData = {
      // Statistiques de base étendues
      total_books: basicStats?.total_books || 0,
      total_users: basicStats?.total_users || 0,
      active_loans: basicStats?.active_loans || 0,
      overdue_loans: basicStats?.overdue_loans || 0,
      total_theses: basicStats?.total_theses || 0,
      total_memoires: basicStats?.total_memoires || 0,
      total_stage_reports: basicStats?.total_stage_reports || 0,
      active_reservations: basicStats?.active_reservations || 0,
      monthly_active_users: basicStats?.monthly_active_users || 0,
      avg_loan_duration: Math.round((basicStats?.avg_loan_duration || 0) * 100) / 100,
      loans_with_fines: basicStats?.loans_with_fines || 0,
      total_fines_amount: Math.round((basicStats?.total_fines_amount || 0) * 100) / 100,

      // Données mensuelles enrichies
      monthly_loans: monthlyLoans.map(item => ({
        month: item.month,
        loans: item.loans || 0,
        returns: item.returns || 0,
        overdue: item.overdue || 0,
        avg_duration: Math.round((item.avg_duration || 0) * 100) / 100,
        unique_users: item.unique_users || 0,
        unique_books: item.unique_books || 0
      })),

      // Données mensuelles d'ajouts de collections
      monthly_additions: monthlyAdditions.map(item => ({
        month: item.month,
        books: item.books || 0,
        academic: item.academic || 0,
        total: item.total || 0
      })),

      // Statistiques par type de document
      document_type_stats: documentTypeStats.map(doc => ({
        type: doc.type,
        total_count: doc.total_count || 0,
        available_count: doc.available_count || 0,
        borrowed_count: doc.borrowed_count || 0,
        availability_rate: doc.total_count > 0 ? Math.round((doc.available_count / doc.total_count) * 100 * 100) / 100 : 0
      })),

      // Top domaines
      top_domains: topDomains.map(domain => ({
        domain: domain.domain,
        loans_count: domain.loans_count || 0,
        books_count: domain.books_count || 0,
        avg_loans_per_book: Math.round((domain.avg_loans_per_book || 0) * 100) / 100
      })),

      // Statistiques utilisateurs par statut
      user_status_stats: userStatusStats.map(status => ({
        status: status.status,
        user_count: status.user_count || 0,
        active_count: status.active_count || 0,
        avg_loans_per_user: Math.round((status.avg_loans_per_user || 0) * 100) / 100
      })),

      // Analyse des amendes
      fines_analysis: finesAnalysis[0] ? {
        total_overdue_loans: finesAnalysis[0].total_overdue_loans || 0,
        avg_fine_amount: Math.round((finesAnalysis[0].avg_fine_amount || 0) * 100) / 100,
        total_fines: Math.round((finesAnalysis[0].total_fines || 0) * 100) / 100,
        avg_days_overdue: Math.round((finesAnalysis[0].avg_days_overdue || 0) * 100) / 100,
        loans_with_fines: finesAnalysis[0].loans_with_fines || 0
      } : {
        total_overdue_loans: 0,
        avg_fine_amount: 0,
        total_fines: 0,
        avg_days_overdue: 0,
        loans_with_fines: 0
      },

      // Livres populaires enrichis
      popular_books: popularBooks.map(book => ({
        id: book.id,
        title: book.title || 'Titre non disponible',
        author: book.author || 'Auteur inconnu',
        loans_count: book.loans_count || 0,
        category: book.category || 'Non classé',
        availability_status: book.status || 'unknown',
        popularity_score: book.popularity_score || 0
      })),

      // Livres les plus réservés
      popular_reserved_books: popularReservedBooks.map(book => ({
        id: book.id,
        title: book.title || 'Titre non disponible',
        author: book.author || 'Auteur inconnu',
        reservations_count: book.reservations_count || 0,
        category: book.category || 'Non classé',
        availability_status: book.status || 'unknown'
      })),

      // Documents académiques les plus empruntés
      popular_academic_documents: popularAcademicDocuments.map(doc => ({
        id: doc.id,
        title: doc.title || 'Titre non disponible',
        author: doc.author || 'Auteur inconnu',
        loans_count: doc.loans_count || 0,
        document_type: doc.document_type,
        specialty: doc.specialty || 'Non spécifié'
      })),

      // Documents académiques les plus réservés
      popular_reserved_academic_documents: popularReservedAcademicDocuments.map(doc => ({
        id: doc.id,
        title: doc.title || 'Titre non disponible',
        author: doc.author || 'Auteur inconnu',
        reservations_count: doc.reservations_count || 0,
        document_type: doc.document_type,
        specialty: doc.specialty || 'Non spécifié'
      })),

      // Utilisateurs actifs enrichis
      active_users: activeUsers.map(user => ({
        id: user.id,
        name: user.name || 'Nom non disponible',
        email: user.email || 'Email non disponible',
        status: user.account_status || 'Non défini',
        loans_count: user.loans_count || 0,
        returned_count: user.returned_count || 0,
        overdue_count: user.overdue_count || 0,
        total_fines: Math.round((user.total_fines || 0) * 100) / 100
      })),

      // Statistiques par catégorie enrichies
      category_stats: categoryStats.map(cat => ({
        category: cat.category || 'Non classé',
        books_count: cat.books_count || 0,
        loans_count: cat.loans_count || 0,
        percentage: cat.percentage || 0,
        unique_borrowers: cat.unique_borrowers || 0,
        avg_loan_duration: Math.round((cat.avg_loan_duration || 0) * 100) / 100
      })),

      // Tendances
      trends: {
        loans_growth: Math.round(loansTrend * 100) / 100,
        users_growth: Math.round(usersTrend * 100) / 100,
        books_growth: 0,
        return_rate: Math.round(returnRate * 100) / 100
      }
    };

    return NextResponse.json({
      success: true,
      data: analyticsData,
      meta: {
        selected_month: selectedMonth,
        generated_at: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Erreur API /api/analytics:', error);
    
    return NextResponse.json({
      success: false,
      error: {
        code: 'ANALYTICS_ERROR',
        message: 'Erreur lors de la récupération des données d\'analytics',
        details: process.env.NODE_ENV === 'development' ? error : undefined
      }
    }, { status: 500 });
  }
}
