/**
 * API pour obtenir les facettes disponibles pour la recherche
 * Conforme aux standards SIGB
 */

import { NextRequest, NextResponse } from 'next/server';
import { executeQuery } from '@/lib/mysql';

// GET /api/search/facets - Obtenir toutes les facettes disponibles
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'all';
    
    let facets: any = {};
    
    // Facettes pour les livres
    if (type === 'books' || type === 'all') {
      const [statusFacets] = await Promise.all([
        executeQuery(`
          SELECT status, COUNT(*) as count 
          FROM books 
          WHERE status IS NOT NULL 
          GROUP BY status 
          ORDER BY count DESC
        `),
      ]);
      
      const [audienceFacets] = await Promise.all([
        executeQuery(`
          SELECT target_audience, COUNT(*) as count 
          FROM books 
          WHERE target_audience IS NOT NULL 
          GROUP BY target_audience 
          ORDER BY count DESC
        `),
      ]);
      
      const [formatFacets] = await Promise.all([
        executeQuery(`
          SELECT format, COUNT(*) as count 
          FROM books 
          WHERE format IS NOT NULL 
          GROUP BY format 
          ORDER BY count DESC
        `),
      ]);
      
      const [languageFacets] = await Promise.all([
        executeQuery(`
          SELECT language, COUNT(*) as count 
          FROM books 
          WHERE language IS NOT NULL 
          GROUP BY language 
          ORDER BY count DESC
        `),
      ]);
      
      const [domainFacets] = await Promise.all([
        executeQuery(`
          SELECT domain, COUNT(*) as count 
          FROM books 
          WHERE domain IS NOT NULL AND domain != ''
          GROUP BY domain 
          ORDER BY count DESC
          LIMIT 20
        `),
      ]);
      
      facets.books = {
        status: (statusFacets as any[]).map(item => ({
          value: item.status,
          count: item.count,
          label: getFacetLabel('status', item.status)
        })),
        target_audience: (audienceFacets as any[]).map(item => ({
          value: item.target_audience,
          count: item.count,
          label: getFacetLabel('target_audience', item.target_audience)
        })),
        format: (formatFacets as any[]).map(item => ({
          value: item.format,
          count: item.count,
          label: getFacetLabel('format', item.format)
        })),
        language: (languageFacets as any[]).map(item => ({
          value: item.language,
          count: item.count,
          label: getLanguageLabel(item.language)
        })),
        domain: (domainFacets as any[]).map(item => ({
          value: item.domain,
          count: item.count,
          label: item.domain
        }))
      };
    }
    
    // Facettes pour les thèses
    if (type === 'theses' || type === 'all') {
      const [thesesStatusFacets] = await Promise.all([
        executeQuery(`
          SELECT status, COUNT(*) as count 
          FROM theses 
          WHERE status IS NOT NULL 
          GROUP BY status 
          ORDER BY count DESC
        `),
      ]);
      
      const [thesesAudienceFacets] = await Promise.all([
        executeQuery(`
          SELECT target_audience, COUNT(*) as count 
          FROM theses 
          WHERE target_audience IS NOT NULL 
          GROUP BY target_audience 
          ORDER BY count DESC
        `),
      ]);
      
      const [thesesYearFacets] = await Promise.all([
        executeQuery(`
          SELECT defense_year, COUNT(*) as count 
          FROM theses 
          WHERE defense_year IS NOT NULL 
          GROUP BY defense_year 
          ORDER BY defense_year DESC
          LIMIT 10
        `),
      ]);
      
      const [thesesDegreeFacets] = await Promise.all([
        executeQuery(`
          SELECT target_degree, COUNT(*) as count 
          FROM theses 
          WHERE target_degree IS NOT NULL AND target_degree != ''
          GROUP BY target_degree 
          ORDER BY count DESC
        `),
      ]);
      
      facets.theses = {
        status: (thesesStatusFacets as any[]).map(item => ({
          value: item.status,
          count: item.count,
          label: getFacetLabel('status', item.status)
        })),
        target_audience: (thesesAudienceFacets as any[]).map(item => ({
          value: item.target_audience,
          count: item.count,
          label: getFacetLabel('target_audience', item.target_audience)
        })),
        defense_year: (thesesYearFacets as any[]).map(item => ({
          value: item.defense_year,
          count: item.count,
          label: item.defense_year.toString()
        })),
        target_degree: (thesesDegreeFacets as any[]).map(item => ({
          value: item.target_degree,
          count: item.count,
          label: item.target_degree
        }))
      };
    }
    
    // Facettes pour les mémoires
    if (type === 'memoires' || type === 'all') {
      const [memoiresStatusFacets] = await Promise.all([
        executeQuery(`
          SELECT status, COUNT(*) as count 
          FROM memoires 
          WHERE status IS NOT NULL 
          GROUP BY status 
          ORDER BY count DESC
        `),
      ]);
      
      const [memoiresFacultyFacets] = await Promise.all([
        executeQuery(`
          SELECT faculty, COUNT(*) as count 
          FROM memoires 
          WHERE faculty IS NOT NULL AND faculty != ''
          GROUP BY faculty 
          ORDER BY count DESC
        `),
      ]);
      
      facets.memoires = {
        status: (memoiresStatusFacets as any[]).map(item => ({
          value: item.status,
          count: item.count,
          label: getFacetLabel('status', item.status)
        })),
        faculty: (memoiresFacultyFacets as any[]).map(item => ({
          value: item.faculty,
          count: item.count,
          label: item.faculty
        }))
      };
    }
    
    // Facettes pour les rapports de stage
    if (type === 'stage_reports' || type === 'all') {
      const [reportsStatusFacets] = await Promise.all([
        executeQuery(`
          SELECT status, COUNT(*) as count 
          FROM stage_reports 
          WHERE status IS NOT NULL 
          GROUP BY status 
          ORDER BY count DESC
        `),
      ]);
      
      const [reportsFacultyFacets] = await Promise.all([
        executeQuery(`
          SELECT faculty, COUNT(*) as count 
          FROM stage_reports 
          WHERE faculty IS NOT NULL AND faculty != ''
          GROUP BY faculty 
          ORDER BY count DESC
        `),
      ]);
      
      facets.stage_reports = {
        status: (reportsStatusFacets as any[]).map(item => ({
          value: item.status,
          count: item.count,
          label: getFacetLabel('status', item.status)
        })),
        faculty: (reportsFacultyFacets as any[]).map(item => ({
          value: item.faculty,
          count: item.count,
          label: item.faculty
        }))
      };
    }
    
    // Facettes pour les utilisateurs
    if (type === 'users' || type === 'all') {
      const [userCategoryFacets] = await Promise.all([
        executeQuery(`
          SELECT user_category, COUNT(*) as count 
          FROM users 
          WHERE user_category IS NOT NULL 
          GROUP BY user_category 
          ORDER BY count DESC
        `),
      ]);
      
      const [userLevelFacets] = await Promise.all([
        executeQuery(`
          SELECT study_level, COUNT(*) as count 
          FROM users 
          WHERE study_level IS NOT NULL 
          GROUP BY study_level 
          ORDER BY count DESC
        `),
      ]);
      
      const [userStatusFacets] = await Promise.all([
        executeQuery(`
          SELECT account_status, COUNT(*) as count 
          FROM users 
          WHERE account_status IS NOT NULL 
          GROUP BY account_status 
          ORDER BY count DESC
        `),
      ]);
      
      facets.users = {
        user_category: (userCategoryFacets as any[]).map(item => ({
          value: item.user_category,
          count: item.count,
          label: getFacetLabel('user_category', item.user_category)
        })),
        study_level: (userLevelFacets as any[]).map(item => ({
          value: item.study_level,
          count: item.count,
          label: item.study_level
        })),
        account_status: (userStatusFacets as any[]).map(item => ({
          value: item.account_status,
          count: item.count,
          label: getFacetLabel('account_status', item.account_status)
        }))
      };
    }
    
    // Facettes globales (langues et départements)
    const [languagesFacets] = await Promise.all([
      executeQuery(`
        SELECT code, name_fr, name_en 
        FROM supported_languages 
        WHERE is_active = 1 
        ORDER BY name_fr
      `),
    ]);
    
    const [departmentsFacets] = await Promise.all([
      executeQuery(`
        SELECT name, faculty, code 
        FROM departments 
        WHERE is_active = 1 
        ORDER BY faculty, name
      `),
    ]);
    
    facets.global = {
      languages: (languagesFacets as any[]).map(item => ({
        value: item.code,
        label: item.name_fr,
        label_en: item.name_en
      })),
      departments: (departmentsFacets as any[]).map(item => ({
        value: item.name,
        label: item.name,
        faculty: item.faculty,
        code: item.code
      }))
    };
    
    return NextResponse.json({
      facets,
      metadata: {
        type,
        generated_at: new Date().toISOString(),
        total_facet_groups: Object.keys(facets).length
      }
    });
    
  } catch (error) {
    console.error('Erreur récupération facettes:', error);
    return NextResponse.json(
      { 
        error: 'Erreur lors de la récupération des facettes',
        details: error instanceof Error ? error.message : 'Erreur inconnue'
      },
      { status: 500 }
    );
  }
}

/**
 * Obtenir le label d'une valeur de facette
 */
function getFacetLabel(field: string, value: string): string {
  const labels: { [key: string]: { [key: string]: string } } = {
    status: {
      'available': 'Disponible',
      'borrowed': 'Prêté',
      'reserved': 'Réservé',
      'lost': 'Perdu',
      'damaged': 'Endommagé',
      'withdrawn': 'Retiré',
      'not_for_loan': 'Pas de prêt',
      'in_transit': 'En transfert',
      'in_processing': 'En traitement',
      'missing': 'Manquant'
    },
    target_audience: {
      'general': 'Général',
      'beginner': 'Débutant',
      'intermediate': 'Intermédiaire',
      'advanced': 'Avancé',
      'children': 'Enfants',
      'young_adult': 'Jeunes adultes',
      'adult': 'Adultes',
      'professional': 'Professionnels',
      'academic': 'Académique',
      'researcher': 'Chercheurs',
      'undergraduate': 'Licence',
      'graduate': 'Master',
      'postgraduate': 'Doctorat'
    },
    format: {
      'print': 'Imprimé',
      'digital': 'Numérique',
      'ebook': 'Livre électronique',
      'audiobook': 'Livre audio',
      'hardcover': 'Relié',
      'paperback': 'Broché',
      'pocket': 'Poche',
      'large_print': 'Gros caractères',
      'braille': 'Braille',
      'multimedia': 'Multimédia',
      'pdf': 'PDF',
      'bound': 'Relié',
      'electronic': 'Électronique'
    },
    user_category: {
      'student': 'Étudiant',
      'teacher': 'Enseignant',
      'researcher': 'Chercheur',
      'staff': 'Personnel',
      'external': 'Externe',
      'guest': 'Invité',
      'alumni': 'Ancien étudiant',
      'visitor': 'Visiteur'
    },
    account_status: {
      'active': 'Actif',
      'suspended': 'Suspendu',
      'expired': 'Expiré',
      'blocked': 'Bloqué',
      'pending': 'En attente',
      'archived': 'Archivé'
    }
  };
  
  return labels[field]?.[value] || value;
}

/**
 * Obtenir le label d'une langue
 */
function getLanguageLabel(code: string): string {
  const languages: { [key: string]: string } = {
    'fr': 'Français',
    'en': 'Anglais',
    'es': 'Espagnol',
    'de': 'Allemand',
    'it': 'Italien',
    'pt': 'Portugais',
    'ar': 'Arabe',
    'zh': 'Chinois',
    'ja': 'Japonais',
    'ru': 'Russe'
  };
  
  return languages[code] || code;
}
