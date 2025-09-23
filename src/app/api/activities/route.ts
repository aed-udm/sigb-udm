import { NextRequest, NextResponse } from 'next/server';
import { executeQuery } from '@/lib/mysql';

// GET /api/activities - Récupérer les activités récentes depuis MySQL
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '10');

    // Récupérer les emprunts récents avec informations utilisateur et livre
    const recentLoans = await executeQuery(`
      SELECT
        l.id,
        l.loan_date,
        l.return_date,
        l.status,
        u.full_name as user_name,
        b.title as book_title
      FROM loans l
      JOIN users u ON l.user_id COLLATE utf8mb4_unicode_ci = u.id COLLATE utf8mb4_unicode_ci
      JOIN books b ON l.book_id = b.id
      ORDER BY l.loan_date DESC
      LIMIT ?
    `, [Math.floor(limit / 2)]) as Array<{
      id: string;
      loan_date: string;
      return_date: string | null;
      status: string;
      user_name: string;
      book_title: string;
    }>;

    // Récupérer les nouveaux utilisateurs récents
    const recentUsers = await executeQuery(`
      SELECT id, full_name, created_at
      FROM users
      ORDER BY created_at DESC
      LIMIT ?
    `, [Math.floor(limit / 4)]) as Array<{
      id: string;
      full_name: string;
      created_at: string;
    }>;

    // Créer les activités à partir des données réelles
    const activities: Array<{
      type: string;
      user: string;
      book: string | null;
      time: string;
      date: string;
    }> = [];

    // Ajouter les emprunts récents avec calcul de temps correct
    if (recentLoans) {
      recentLoans.forEach((loan) => {
        if (loan.status === 'returned' && loan.return_date) {
          // Pour les retours, utiliser la date de retour
          const returnTimeAgo = getTimeAgo(loan.return_date);
          activities.push({
            type: 'return',
            user: loan.user_name,
            book: loan.book_title,
            time: returnTimeAgo,
            date: loan.return_date
          });
        } else if (loan.status === 'overdue') {
          // Pour les retards, utiliser la date d'emprunt
          const loanTimeAgo = getTimeAgo(loan.loan_date);
          activities.push({
            type: 'overdue',
            user: loan.user_name,
            book: loan.book_title,
            time: loanTimeAgo,
            date: loan.loan_date
          });
        } else {
          // Pour les emprunts actifs, utiliser la date d'emprunt
          const loanTimeAgo = getTimeAgo(loan.loan_date);
          activities.push({
            type: 'loan',
            user: loan.user_name,
            book: loan.book_title,
            time: loanTimeAgo,
            date: loan.loan_date
          });
        }
      });
    }

    // Ajouter les nouveaux utilisateurs avec calcul de temps correct
    if (recentUsers) {
      recentUsers.forEach((user) => {
        const userTimeAgo = getTimeAgo(user.created_at);

        activities.push({
          type: 'new_user',
          user: user.full_name,
          book: null,
          time: userTimeAgo,
          date: user.created_at
        });
      });
    }

    // Trier toutes les activités par date (plus récent en premier)
    activities.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    // Limiter au nombre demandé
    const limitedActivities = activities.slice(0, limit);

    const response = {
      data: limitedActivities,
      meta: {
        total: limitedActivities.length,
        limit,
        generated_at: new Date().toISOString()
      }
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error fetching activities:', error);
    return NextResponse.json(
      { error: { code: 'FETCH_ERROR', message: 'Erreur lors de la récupération des activités' } },
      { status: 500 }
    );
  }
}

// Fonction utilitaire pour calculer le temps écoulé - CORRIGÉE
function getTimeAgo(date: Date | string): string {
  // Normaliser la date d'entrée
  let inputDate: Date;

  if (typeof date === 'string') {
    // Gérer les formats de date MySQL (YYYY-MM-DD HH:MM:SS ou YYYY-MM-DD)
    inputDate = new Date(date);
  } else {
    inputDate = new Date(date);
  }

  // Vérifier si la date est valide
  if (isNaN(inputDate.getTime())) {
    return "Date invalide";
  }

  // Utiliser UTC pour éviter les problèmes de fuseau horaire
  const now = new Date();
  const nowUTC = new Date(now.getTime() + (now.getTimezoneOffset() * 60000));
  const inputUTC = new Date(inputDate.getTime() + (inputDate.getTimezoneOffset() * 60000));

  const diffInMs = nowUTC.getTime() - inputUTC.getTime();

  // Gérer les dates futures (erreur de données)
  if (diffInMs < 0) {
    return "À l'instant";
  }

  // Calculs précis avec Math.floor pour éviter les arrondis
  const diffInSeconds = Math.floor(diffInMs / 1000);
  const diffInMinutes = Math.floor(diffInSeconds / 60);
  const diffInHours = Math.floor(diffInMinutes / 60);
  const diffInDays = Math.floor(diffInHours / 24);
  const diffInWeeks = Math.floor(diffInDays / 7);
  const diffInMonths = Math.floor(diffInDays / 30);
  const diffInYears = Math.floor(diffInDays / 365);

  // Retourner le format le plus approprié
  if (diffInSeconds < 60) {
    return "À l'instant";
  } else if (diffInMinutes < 60) {
    return `Il y a ${diffInMinutes} minute${diffInMinutes > 1 ? 's' : ''}`;
  } else if (diffInHours < 24) {
    return `Il y a ${diffInHours} heure${diffInHours > 1 ? 's' : ''}`;
  } else if (diffInDays === 1) {
    return 'Il y a 1 jour';
  } else if (diffInDays < 7) {
    return `Il y a ${diffInDays} jour${diffInDays > 1 ? 's' : ''}`;
  } else if (diffInWeeks < 4) {
    return `Il y a ${diffInWeeks} semaine${diffInWeeks > 1 ? 's' : ''}`;
  } else if (diffInMonths < 12) {
    return `Il y a ${diffInMonths} mois`;
  } else {
    return `Il y a ${diffInYears} an${diffInYears > 1 ? 's' : ''}`;
  }
}
