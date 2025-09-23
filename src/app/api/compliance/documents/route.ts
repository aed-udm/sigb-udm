import { NextRequest, NextResponse } from 'next/server';
import mysql from 'mysql2/promise';

// Configuration de la base de données - utilisation directe de root
const dbConfig = {
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'bibliotheque_cameroun',
  charset: 'utf8mb4',
  connectTimeout: 60000,
};

// Interface pour les documents de conformité
interface ComplianceDocument {
  id: string;
  title: string;
  author: string;
  type: 'thesis' | 'memoir' | 'report';
  status: 'compliant' | 'pending' | 'failed' | 'draft';
  camesScore: number;
  dicamesReady: boolean;
  lastValidation: string;
  issues: string[];
  year: number;
  university?: string;
  faculty?: string;
  specialty?: string;
  hasFile: boolean;
  fileSize?: number;
  fileType?: string;
  keywords?: string[];
  summary?: string;
}

// Fonction pour calculer le score CAMES basé sur les critères
function calculateCamesScore(document: any): number {
  let score = 0;
  
  // Titre présent et non vide (20 points)
  if (document.title && document.title.trim().length > 10) {
    score += 20;
  }
  
  // Auteur présent (15 points)
  if (document.author && document.author.trim().length > 2) {
    score += 15;
  }
  
  // Spécialité/domaine défini (15 points)
  if (document.specialty || document.field_of_study) {
    score += 15;
  }
  
  // Université définie (10 points)
  if (document.university) {
    score += 10;
  }
  
  // Faculté définie (10 points)
  if (document.faculty) {
    score += 10;
  }
  
  // Résumé présent (15 points)
  if (document.summary && document.summary.length > 50) {
    score += 15;
  }
  
  // Mots-clés présents (10 points)
  if (document.keywords) {
    try {
      const keywords = JSON.parse(document.keywords);
      if (Array.isArray(keywords) && keywords.length >= 3) {
        score += 10;
      }
    } catch (e) {
      // Ignore JSON parse errors
    }
  }
  
  // Fichier PDF disponible (5 points)
  if (document.document_path && document.document_type === 'pdf') {
    score += 5;
  }
  
  return Math.min(score, 100); // Maximum 100
}

// Fonction pour déterminer le statut de conformité
function getComplianceStatus(score: number): 'compliant' | 'pending' | 'failed' | 'draft' {
  if (score >= 85) return 'compliant';
  if (score >= 70) return 'pending';
  if (score >= 50) return 'failed';
  return 'draft';
}

// Fonction pour identifier les problèmes
function getIssues(document: any, score: number): string[] {
  const issues: string[] = [];
  
  if (!document.title || document.title.trim().length <= 10) {
    issues.push('Titre trop court ou manquant');
  }
  
  if (!document.summary || document.summary.length <= 50) {
    issues.push('Résumé manquant ou insuffisant');
  }
  
  if (!document.keywords) {
    issues.push('Mots-clés manquants');
  } else {
    try {
      const keywords = JSON.parse(document.keywords);
      if (!Array.isArray(keywords) || keywords.length < 3) {
        issues.push('Nombre insuffisant de mots-clés (minimum 3)');
      }
    } catch (e) {
      issues.push('Format des mots-clés invalide');
    }
  }
  
  if (!document.university) {
    issues.push('Université non spécifiée');
  }
  
  if (!document.faculty) {
    issues.push('Faculté non spécifiée');
  }
  
  if (!document.document_path) {
    issues.push('Document PDF manquant');
  } else if (document.document_type !== 'pdf') {
    issues.push('Format PDF requis pour DICAMES');
  }
  
  if (!document.specialty && !document.field_of_study) {
    issues.push('Spécialité/domaine d\'étude non défini');
  }
  
  return issues;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const type = searchParams.get('type') || 'all';
    const status = searchParams.get('status') || 'all';
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    // Connexion à la base de données
    const connection = await mysql.createConnection(dbConfig);

    try {
      const documents: ComplianceDocument[] = [];

      // Requête pour les thèses
      if (type === 'all' || type === 'thesis') {
        const [thesesRows] = await connection.execute(`
          SELECT 
            id, title, main_author as author, target_degree as degree,
            specialty, defense_year as year, university, faculty,
            summary, keywords, document_path, document_type, document_size,
            created_at, updated_at
          FROM theses 
          WHERE (title LIKE ? OR main_author LIKE ?)
          ORDER BY created_at DESC
          LIMIT ? OFFSET ?
        `, [`%${search}%`, `%${search}%`, limit, offset]);

        for (const row of thesesRows as any[]) {
          const score = calculateCamesScore(row);
          const complianceStatus = getComplianceStatus(score);
          const issues = getIssues(row, score);
          
          if (status === 'all' || status === complianceStatus) {
            documents.push({
              id: row.id,
              title: row.title,
              author: row.author,
              type: 'thesis',
              status: complianceStatus,
              camesScore: score,
              dicamesReady: score >= 85 && issues.length === 0,
              lastValidation: row.updated_at,
              issues: issues,
              year: row.year || new Date().getFullYear(),
              university: row.university,
              faculty: row.faculty,
              specialty: row.specialty,
              hasFile: !!row.document_path,
              fileSize: row.document_size,
              fileType: row.document_type,
              keywords: row.keywords ? JSON.parse(row.keywords) : [],
              summary: row.summary
            });
          }
        }
      }

      // Requête pour les mémoires
      if (type === 'all' || type === 'memoir') {
        const [memoiresRows] = await connection.execute(`
          SELECT 
            id, title, main_author as author, degree_level as degree,
            specialty, field_of_study, academic_year, university, faculty,
            summary, keywords, document_path, document_type, document_size,
            created_at, updated_at, defense_date
          FROM memoires 
          WHERE (title LIKE ? OR main_author LIKE ?)
          ORDER BY created_at DESC
          LIMIT ? OFFSET ?
        `, [`%${search}%`, `%${search}%`, limit, offset]);

        for (const row of memoiresRows as any[]) {
          const score = calculateCamesScore({
            ...row,
            specialty: row.specialty || row.field_of_study
          });
          const complianceStatus = getComplianceStatus(score);
          const issues = getIssues({
            ...row,
            specialty: row.specialty || row.field_of_study
          }, score);
          
          if (status === 'all' || status === complianceStatus) {
            documents.push({
              id: row.id,
              title: row.title,
              author: row.author,
              type: 'memoir',
              status: complianceStatus,
              camesScore: score,
              dicamesReady: score >= 85 && issues.length === 0,
              lastValidation: row.updated_at,
              issues: issues,
              year: row.academic_year ? parseInt(row.academic_year.split('-')[0]) : new Date().getFullYear(),
              university: row.university,
              faculty: row.faculty,
              specialty: row.specialty || row.field_of_study,
              hasFile: !!row.document_path,
              fileSize: row.document_size,
              fileType: row.document_type,
              keywords: row.keywords ? JSON.parse(row.keywords) : [],
              summary: row.summary
            });
          }
        }
      }

      // Requête pour les rapports de stage
      if (type === 'all' || type === 'report') {
        const [reportsRows] = await connection.execute(`
          SELECT 
            id, title, student_name as author, degree_level as degree,
            specialty, field_of_study, academic_year, university, faculty,
            summary, keywords, document_path, document_type, document_size,
            created_at, updated_at
          FROM stage_reports 
          WHERE (title LIKE ? OR student_name LIKE ?)
          ORDER BY created_at DESC
          LIMIT ? OFFSET ?
        `, [`%${search}%`, `%${search}%`, limit, offset]);

        for (const row of reportsRows as any[]) {
          const score = calculateCamesScore({
            ...row,
            specialty: row.specialty || row.field_of_study
          });
          const complianceStatus = getComplianceStatus(score);
          const issues = getIssues({
            ...row,
            specialty: row.specialty || row.field_of_study
          }, score);
          
          if (status === 'all' || status === complianceStatus) {
            documents.push({
              id: row.id,
              title: row.title,
              author: row.author,
              type: 'report',
              status: complianceStatus,
              camesScore: score,
              dicamesReady: score >= 85 && issues.length === 0,
              lastValidation: row.updated_at,
              issues: issues,
              year: row.academic_year ? parseInt(row.academic_year.split('-')[0]) : new Date().getFullYear(),
              university: row.university,
              faculty: row.faculty,
              specialty: row.specialty || row.field_of_study,
              hasFile: !!row.document_path,
              fileSize: row.document_size,
              fileType: row.document_type,
              keywords: row.keywords ? JSON.parse(row.keywords) : [],
              summary: row.summary
            });
          }
        }
      }

      // Statistiques globales
      const [statsRows] = await connection.execute(`
        SELECT 
          (SELECT COUNT(*) FROM theses) + 
          (SELECT COUNT(*) FROM memoires) + 
          (SELECT COUNT(*) FROM stage_reports) as total_documents,
          
          (SELECT COUNT(*) FROM theses WHERE document_path IS NOT NULL) + 
          (SELECT COUNT(*) FROM memoires WHERE document_path IS NOT NULL) + 
          (SELECT COUNT(*) FROM stage_reports WHERE document_path IS NOT NULL) as documents_with_files
      `);

      const stats = (statsRows as any[])[0] || {};
      const totalDocs = documents.length;
      const compliantDocs = documents.filter(d => d.status === 'compliant').length;
      const dicamesReady = documents.filter(d => d.dicamesReady).length;
      const overallScore = totalDocs > 0 ? Math.round((compliantDocs / totalDocs) * 100) : 0;

      await connection.end();

      return NextResponse.json({
        success: true,
        data: {
          documents: documents,
          stats: {
            total_documents: stats?.total_documents,
            cames_compliant: compliantDocs,
            dicames_ready: dicamesReady,
            pending_validation: documents.filter(d => d.status === 'pending').length,
            failed_validation: documents.filter(d => d.status === 'failed').length,
            overall_score: overallScore,
            documents_with_files: stats.documents_with_files
          },
          pagination: {
            total: totalDocs,
            limit: limit,
            offset: offset,
            hasMore: totalDocs === limit
          }
        }
      });

    } finally {
      await connection.end();
    }

  } catch (error) {
    console.error('Erreur lors de la récupération des documents de conformité:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Erreur lors de la récupération des documents de conformité',
        details: error instanceof Error ? error.message : 'Erreur inconnue'
      },
      { status: 500 }
    );
  }
}
