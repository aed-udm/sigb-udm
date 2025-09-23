import { NextResponse } from 'next/server';
import { executeQuery } from '@/lib/mysql';

export async function GET() {
  try {
    // Récupérer tous les domaines uniques des livres
    const bookDomains = await executeQuery(`
      SELECT DISTINCT domain 
      FROM books 
      WHERE domain IS NOT NULL AND domain != '' AND status IN ('available', 'active')
      ORDER BY domain ASC
    `) as any[];

    // Récupérer tous les domaines/spécialités des documents académiques
    const academicDomains = await executeQuery(`
      SELECT DISTINCT CAST(specialty AS CHAR CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci) as domain FROM theses WHERE specialty IS NOT NULL AND specialty != '' AND status IN ('available', 'active') AND is_accessible = 1
      UNION
      SELECT DISTINCT CAST(field_of_study AS CHAR CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci) as domain FROM memoires WHERE field_of_study IS NOT NULL AND field_of_study != '' AND status IN ('available', 'active') AND is_accessible = 1
      UNION
      SELECT DISTINCT CAST(field_of_study AS CHAR CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci) as domain FROM stage_reports WHERE field_of_study IS NOT NULL AND field_of_study != '' AND status IN ('available', 'active') AND is_accessible = 1
      ORDER BY domain ASC
    `) as any[];

    // Récupérer toutes les années uniques
    const bookYears = await executeQuery(`
      SELECT DISTINCT publication_year as year 
      FROM books 
      WHERE publication_year IS NOT NULL AND status IN ('available', 'active')
      ORDER BY year DESC
    `) as any[];

    const academicYears = await executeQuery(`
      SELECT DISTINCT defense_year as year FROM theses WHERE defense_year IS NOT NULL AND status IN ('available', 'active') AND is_accessible = 1
      UNION
      SELECT DISTINCT YEAR(defense_date) as year FROM memoires WHERE defense_date IS NOT NULL AND status IN ('available', 'active') AND is_accessible = 1
      UNION
      SELECT DISTINCT YEAR(stage_end_date) as year FROM stage_reports WHERE stage_end_date IS NOT NULL AND status IN ('available', 'active') AND is_accessible = 1
      ORDER BY year DESC
    `) as any[];

    // Récupérer toutes les langues uniques
    const languages = await executeQuery(`
      SELECT DISTINCT CAST(language AS CHAR CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci) as language
      FROM books
      WHERE language IS NOT NULL AND language != '' AND status IN ('available', 'active')
      UNION
      SELECT DISTINCT CAST(language AS CHAR CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci) as language
      FROM theses
      WHERE language IS NOT NULL AND language != '' AND status IN ('available', 'active') AND is_accessible = 1
      UNION
      SELECT DISTINCT CAST(language AS CHAR CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci) as language
      FROM memoires
      WHERE language IS NOT NULL AND language != '' AND status IN ('available', 'active') AND is_accessible = 1
      UNION
      SELECT DISTINCT CAST(language AS CHAR CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci) as language
      FROM stage_reports
      WHERE language IS NOT NULL AND language != '' AND status IN ('available', 'active') AND is_accessible = 1
      ORDER BY language ASC
    `) as any[];

    // Récupérer tous les formats uniques
    const formats = await executeQuery(`
      SELECT DISTINCT format 
      FROM books 
      WHERE format IS NOT NULL AND format != '' AND status IN ('available', 'active')
      ORDER BY format ASC
    `) as any[];

    // Récupérer tous les niveaux uniques
    const levels = await executeQuery(`
      SELECT DISTINCT CAST(target_degree AS CHAR CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci) as level
      FROM theses
      WHERE target_degree IS NOT NULL AND target_degree != '' AND status IN ('available', 'active') AND is_accessible = 1
      UNION
      SELECT DISTINCT CAST(degree_level AS CHAR CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci) as level
      FROM memoires
      WHERE degree_level IS NOT NULL AND degree_level != '' AND status IN ('available', 'active') AND is_accessible = 1
      UNION
      SELECT DISTINCT CAST(degree_level AS CHAR CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci) as level
      FROM stage_reports
      WHERE degree_level IS NOT NULL AND degree_level != '' AND status IN ('available', 'active') AND is_accessible = 1
      ORDER BY level ASC
    `) as any[];

    // Récupérer tous les éditeurs uniques
    const publishers = await executeQuery(`
      SELECT DISTINCT publisher 
      FROM books 
      WHERE publisher IS NOT NULL AND publisher != '' AND status IN ('available', 'active')
      ORDER BY publisher ASC
    `) as any[];

    // Combiner et dédupliquer les domaines
    const allDomains = [...new Set([
      ...bookDomains.map(d => d.domain),
      ...academicDomains.map(d => d.domain)
    ])].sort();

    // Combiner et dédupliquer les années
    const allYears = [...new Set([
      ...bookYears.map(y => y.year),
      ...academicYears.map(y => y.year)
    ])].sort((a, b) => b - a);

    return NextResponse.json({
      success: true,
      data: {
        domains: allDomains,
        years: allYears,
        languages: languages.map(l => l.language),
        formats: formats.map(f => f.format),
        levels: levels.map(l => l.level),
        publishers: publishers.map(p => p.publisher)
      }
    });

  } catch (error) {
    console.error('Erreur lors de la récupération des filtres:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Erreur lors de la récupération des filtres',
        details: error instanceof Error ? error.message : 'Erreur inconnue'
      },
      { status: 500 }
    );
  }
}
