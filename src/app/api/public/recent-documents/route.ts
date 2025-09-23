import { NextRequest, NextResponse } from 'next/server';
import { executeQuery } from '@/lib/mysql';

/**
 * API publique pour récupérer les documents récents
 * Utilisée par la page d'accueil
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '8');

    console.log('API recent-documents appelée avec limit:', limit);

    // Requête UNION simplifiée qui fonctionne
    const query = `
      (
        SELECT 'book' as type, id, title, subtitle,
               main_author, secondary_author, main_author as author,
               publisher, publication_year, publication_city, edition,
               domain, summary, abstract, status, created_at,
               available_copies, total_copies,
               -- Compatibilité
               domain as degree_type, 'N/A' as pages, publication_year as defense_year,
               NULL as university, NULL as faculty
        FROM books
        WHERE status = 'available'
      )
      UNION ALL
      (
        SELECT 'these' as type, id, title, NULL as subtitle,
               main_author, NULL as secondary_author, main_author as author,
               NULL as publisher, defense_year as publication_year, NULL as publication_city, NULL as edition,
               specialty as domain, summary, abstract, status, created_at,
               available_copies, total_copies,
               -- Compatibilité
               target_degree as degree_type, 'N/A' as pages, defense_year,
               university, faculty
        FROM theses
        WHERE status = 'available' AND is_accessible = 1
      )
      UNION ALL
      (
        SELECT 'memoire' as type, id, title, NULL as subtitle,
               main_author, NULL as secondary_author, main_author as author,
               NULL as publisher, YEAR(defense_date) as publication_year, NULL as publication_city, NULL as edition,
               field_of_study as domain, summary, abstract, status, created_at,
               available_copies, total_copies,
               -- Compatibilité
               degree_level as degree_type, 'N/A' as pages, YEAR(defense_date) as defense_year,
               university, faculty
        FROM memoires
        WHERE status = 'available' AND is_accessible = 1
      )
      UNION ALL
      (
        SELECT 'rapport_stage' as type, id, title, NULL as subtitle,
               student_name as main_author, NULL as secondary_author, student_name as author,
               NULL as publisher, YEAR(stage_end_date) as publication_year, NULL as publication_city, NULL as edition,
               field_of_study as domain, summary, abstract, status, created_at,
               available_copies, total_copies,
               -- Compatibilité
               'Stage' as degree_type, 'N/A' as pages, YEAR(stage_end_date) as defense_year,
               company_name as university, NULL as faculty
        FROM stage_reports
        WHERE status = 'available' AND is_accessible = 1
      )
      ORDER BY created_at DESC
      LIMIT ?
    `;

    const result = await executeQuery(query, [limit]);
    const documents = result as any[];

    console.log(`Résultat: ${documents.length} documents trouvés`);

    // Retourner les documents avec toutes les informations
    return NextResponse.json({
      success: true,
      data: documents,
      total: documents.length,
      message: `${documents.length} documents récents récupérés`
    });

  } catch (error) {
    console.error('Erreur API recent-documents:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Erreur serveur lors de la récupération des documents récents',
        details: error instanceof Error ? error.message : 'Erreur inconnue'
      },
      { status: 500 }
    );
  }
}
