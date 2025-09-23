/**
 * API pour les statistiques des archives étudiants - SIGB UdM
 * Endpoint: /api/archives/students-stats
 */

import { NextRequest, NextResponse } from 'next/server';
import { executeQuery } from '@/lib/mysql';

// GET /api/archives/students-stats - Récupérer les statistiques des archives étudiants
export async function GET(request: NextRequest) {
  try {
    console.log('📊 Récupération des statistiques des archives étudiants...');

    // Statistiques générales des documents académiques
    const generalStats = await getGeneralArchiveStats();
    
    // Statistiques par type de document
    const documentTypeStats = await getDocumentTypeStats();
    
    // Statistiques par année académique
    const yearlyStats = await getYearlyStats();
    
    // Statistiques par faculté/département
    const departmentStats = await getDepartmentStats();

    const archiveStats = {
      general: generalStats,
      by_document_type: documentTypeStats,
      by_academic_year: yearlyStats,
      by_department: departmentStats,
      generated_at: new Date().toISOString()
    };

    return NextResponse.json({
      success: true,
      data: archiveStats,
      total_documents: generalStats.total_documents,
      message: 'Statistiques des archives étudiants récupérées avec succès'
    });

  } catch (error) {
    console.error('❌ Erreur archives students stats:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Erreur lors de la récupération des statistiques des archives',
      details: error instanceof Error ? error.message : 'Erreur inconnue'
    }, { status: 500 });
  }
}

async function getGeneralArchiveStats() {
  try {
    // Compter tous les documents académiques
    const thesesCount = await executeQuery(`
      SELECT COUNT(*) as count FROM theses WHERE is_accessible = 1
    `) as any[];

    const memoiresCount = await executeQuery(`
      SELECT COUNT(*) as count FROM memoires WHERE is_accessible = 1
    `) as any[];

    const reportsCount = await executeQuery(`
      SELECT COUNT(*) as count FROM stage_reports WHERE is_accessible = 1
    `) as any[];

    const academicDocsCount = await executeQuery(`
      SELECT COUNT(*) as count FROM academic_documents WHERE is_accessible = 1
    `) as any[];

    const totalTheses = thesesCount[0]?.count || 0;
    const totalMemoires = memoiresCount[0]?.count || 0;
    const totalReports = reportsCount[0]?.count || 0;
    const totalAcademicDocs = academicDocsCount[0]?.count || 0;

    const totalDocuments = totalTheses + totalMemoires + totalReports + totalAcademicDocs;

    // Statistiques d'accès récent
    const recentAccess = await executeQuery(`
      SELECT COUNT(*) as recent_access_count
      FROM loans 
      WHERE document_type IN ('academic', 'these', 'memoire', 'rapport_stage')
      AND created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
    `) as any[];

    return {
      total_documents: totalDocuments,
      total_theses: totalTheses,
      total_memoires: totalMemoires,
      total_stage_reports: totalReports,
      total_academic_documents: totalAcademicDocs,
      recent_access_count: recentAccess[0]?.recent_access_count || 0,
      last_updated: new Date().toISOString()
    };
  } catch (error) {
    console.error('Erreur general archive stats:', error);
    return {
      total_documents: 0,
      total_theses: 0,
      total_memoires: 0,
      total_stage_reports: 0,
      total_academic_documents: 0,
      recent_access_count: 0,
      last_updated: new Date().toISOString()
    };
  }
}

async function getDocumentTypeStats() {
  try {
    const stats = [];

    // Statistiques des thèses
    const thesesStats = await executeQuery(`
      SELECT 
        'these' as document_type,
        COUNT(*) as total_count,
        COUNT(CASE WHEN status = 'available' THEN 1 END) as available_count,
        COUNT(CASE WHEN defense_date >= DATE_SUB(NOW(), INTERVAL 1 YEAR) THEN 1 END) as recent_count
      FROM theses 
      WHERE is_accessible = 1
    `) as any[];

    // Statistiques des mémoires
    const memoiresStats = await executeQuery(`
      SELECT 
        'memoire' as document_type,
        COUNT(*) as total_count,
        COUNT(CASE WHEN status = 'available' THEN 1 END) as available_count,
        COUNT(CASE WHEN defense_date >= DATE_SUB(NOW(), INTERVAL 1 YEAR) THEN 1 END) as recent_count
      FROM memoires 
      WHERE is_accessible = 1
    `) as any[];

    // Statistiques des rapports de stage
    const reportsStats = await executeQuery(`
      SELECT 
        'rapport_stage' as document_type,
        COUNT(*) as total_count,
        COUNT(CASE WHEN status = 'available' THEN 1 END) as available_count,
        COUNT(CASE WHEN defense_date >= DATE_SUB(NOW(), INTERVAL 1 YEAR) THEN 1 END) as recent_count
      FROM stage_reports 
      WHERE is_accessible = 1
    `) as any[];

    stats.push(...thesesStats, ...memoiresStats, ...reportsStats);

    return stats.map(stat => ({
      document_type: stat.document_type,
      total_count: stat.total_count || 0,
      available_count: stat.available_count || 0,
      recent_count: stat.recent_count || 0,
      availability_rate: stat.total_count > 0 ? 
        Math.round((stat.available_count / stat.total_count) * 100) : 0
    }));
  } catch (error) {
    console.error('Erreur document type stats:', error);
    return [
      { document_type: 'these', total_count: 0, available_count: 0, recent_count: 0, availability_rate: 0 },
      { document_type: 'memoire', total_count: 0, available_count: 0, recent_count: 0, availability_rate: 0 },
      { document_type: 'rapport_stage', total_count: 0, available_count: 0, recent_count: 0, availability_rate: 0 }
    ];
  }
}

async function getYearlyStats() {
  try {
    // Statistiques par année académique pour tous les types de documents
    const yearlyData = await executeQuery(`
      SELECT 
        academic_year,
        COUNT(*) as document_count,
        'these' as document_type
      FROM theses 
      WHERE is_accessible = 1 AND academic_year IS NOT NULL
      GROUP BY academic_year
      
      UNION ALL
      
      SELECT 
        academic_year,
        COUNT(*) as document_count,
        'memoire' as document_type
      FROM memoires 
      WHERE is_accessible = 1 AND academic_year IS NOT NULL
      GROUP BY academic_year
      
      UNION ALL
      
      SELECT 
        academic_year,
        COUNT(*) as document_count,
        'rapport_stage' as document_type
      FROM stage_reports 
      WHERE is_accessible = 1 AND academic_year IS NOT NULL
      GROUP BY academic_year
      
      ORDER BY academic_year DESC
      LIMIT 10
    `) as any[];

    // Grouper par année académique
    const yearlyGrouped = yearlyData.reduce((acc: any, curr: any) => {
      const year = curr.academic_year;
      if (!acc[year]) {
        acc[year] = { academic_year: year, total_documents: 0, by_type: {} };
      }
      acc[year].total_documents += curr.document_count;
      acc[year].by_type[curr.document_type] = curr.document_count;
      return acc;
    }, {});

    return Object.values(yearlyGrouped);
  } catch (error) {
    console.error('Erreur yearly stats:', error);
    return [];
  }
}

async function getDepartmentStats() {
  try {
    // Statistiques par département/faculté
    const departmentData = await executeQuery(`
      SELECT 
        COALESCE(department, faculty, 'Non spécifié') as department_name,
        COUNT(*) as document_count,
        'these' as document_type
      FROM theses 
      WHERE is_accessible = 1
      GROUP BY COALESCE(department, faculty, 'Non spécifié')
      
      UNION ALL
      
      SELECT 
        COALESCE(department, faculty, 'Non spécifié') as department_name,
        COUNT(*) as document_count,
        'memoire' as document_type
      FROM memoires 
      WHERE is_accessible = 1
      GROUP BY COALESCE(department, faculty, 'Non spécifié')
      
      UNION ALL
      
      SELECT 
        COALESCE(department, faculty, 'Non spécifié') as department_name,
        COUNT(*) as document_count,
        'rapport_stage' as document_type
      FROM stage_reports 
      WHERE is_accessible = 1
      GROUP BY COALESCE(department, faculty, 'Non spécifié')
      
      ORDER BY document_count DESC
    `) as any[];

    // Grouper par département
    const departmentGrouped = departmentData.reduce((acc: any, curr: any) => {
      const dept = curr.department_name;
      if (!acc[dept]) {
        acc[dept] = { department_name: dept, total_documents: 0, by_type: {} };
      }
      acc[dept].total_documents += curr.document_count;
      acc[dept].by_type[curr.document_type] = curr.document_count;
      return acc;
    }, {});

    return Object.values(departmentGrouped);
  } catch (error) {
    console.error('Erreur department stats:', error);
    return [];
  }
}
