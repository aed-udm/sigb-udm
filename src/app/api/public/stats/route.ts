import { NextRequest, NextResponse } from 'next/server';
import { executeQuery } from '@/lib/mysql';

/**
 * API publique pour récupérer les statistiques du catalogue
 * Utilisée par la page d'accueil
 */
export async function GET(request: NextRequest) {
  try {
    // Requêtes pour compter les documents publics de chaque type
    const queries = [
      {
        name: 'books',
        query: "SELECT COUNT(*) as count FROM books WHERE status IN ('available', 'active')"
      },
      {
        name: 'theses', 
        query: "SELECT COUNT(*) as count FROM theses WHERE status IN ('available', 'active') AND is_accessible = 1"
      },
      {
        name: 'memoires',
        query: "SELECT COUNT(*) as count FROM memoires WHERE status IN ('available', 'active') AND is_accessible = 1"
      },
      {
        name: 'stage_reports',
        query: "SELECT COUNT(*) as count FROM stage_reports WHERE status IN ('available', 'active') AND is_accessible = 1"
      }
    ];

    // Exécuter toutes les requêtes en parallèle
    const results = await Promise.all(
      queries.map(async ({ name, query }) => {
        try {
          const result = await executeQuery(query);
          return { 
            type: name, 
            count: (result as any[])[0]?.count || 0 
          };
        } catch (error) {
          console.error(`Erreur requête ${name}:`, error);
          return { 
            type: name, 
            count: 0 
          };
        }
      })
    );

    // Calculer le total
    const totalDocuments = results.reduce((sum, item) => sum + item.count, 0);

    // Statistiques de disponibilité
    const availabilityQueries = [
      {
        name: 'available',
        query: `
          SELECT 
            (SELECT COUNT(*) FROM books WHERE status = 'available' AND available_copies > 0) +
            (SELECT COUNT(*) FROM theses WHERE status = 'available' AND available_copies > 0 AND is_accessible = 1) +
            (SELECT COUNT(*) FROM memoires WHERE status = 'available' AND available_copies > 0 AND is_accessible = 1) +
            (SELECT COUNT(*) FROM stage_reports WHERE status = 'available' AND available_copies > 0 AND is_accessible = 1)
            as count
        `
      },
      {
        name: 'unavailable',
        query: `
          SELECT 
            (SELECT COUNT(*) FROM books WHERE status = 'available' AND available_copies = 0) +
            (SELECT COUNT(*) FROM theses WHERE status = 'available' AND available_copies = 0 AND is_accessible = 1) +
            (SELECT COUNT(*) FROM memoires WHERE status = 'available' AND available_copies = 0 AND is_accessible = 1) +
            (SELECT COUNT(*) FROM stage_reports WHERE status = 'available' AND available_copies = 0 AND is_accessible = 1)
            as count
        `
      }
    ];

    const availabilityResults = await Promise.all(
      availabilityQueries.map(async ({ name, query }) => {
        try {
          const result = await executeQuery(query);
          return { 
            type: name, 
            count: (result as any[])[0]?.count || 0 
          };
        } catch (error) {
          console.error(`Erreur requête disponibilité ${name}:`, error);
          return { 
            type: name, 
            count: 0 
          };
        }
      })
    );

    // Construire la réponse
    const stats = {
      documents: {
        total: totalDocuments,
        books: results.find(r => r.type === 'books')?.count || 0,
        theses: results.find(r => r.type === 'theses')?.count || 0,
        memoires: results.find(r => r.type === 'memoires')?.count || 0,
        stage_reports: results.find(r => r.type === 'stage_reports')?.count || 0
      },
      availability: {
        available: availabilityResults.find(r => r.type === 'available')?.count || 0,
        unavailable: availabilityResults.find(r => r.type === 'unavailable')?.count || 0
      }
    };

    return NextResponse.json({
      success: true,
      data: stats,
      message: 'Statistiques récupérées avec succès'
    });

  } catch (error) {
    console.error('Erreur API stats:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Erreur serveur lors de la récupération des statistiques',
        details: error instanceof Error ? error.message : 'Erreur inconnue'
      },
      { status: 500 }
    );
  }
}
