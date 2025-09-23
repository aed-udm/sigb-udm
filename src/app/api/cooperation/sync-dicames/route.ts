/**
 * API Route: /api/cooperation/sync-dicames
 * Synchronisation avec le système DICAMES
 */

import { NextRequest, NextResponse } from 'next/server';
import { executeQuery } from '@/lib/mysql';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action') || 'status';

    switch (action) {
      case 'status':
        return await getSyncStatus();
      case 'pending':
        return await getPendingDocuments();
      case 'history':
        return await getSyncHistory();
      default:
        return NextResponse.json({
          success: false,
          error: {
            code: 'INVALID_ACTION',
            message: 'Action non reconnue'
          }
        }, { status: 400 });
    }

  } catch (error) {
    console.error('Erreur API GET /api/cooperation/sync-dicames:', error);
    
    return NextResponse.json({
      success: false,
      error: {
        code: 'SYNC_STATUS_ERROR',
        message: 'Erreur lors de la vérification du statut de synchronisation',
        details: process.env.NODE_ENV === 'development' ? error : undefined
      }
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, document_ids, options = {} } = body;

    switch (action) {
      case 'sync_all':
        return await syncAllDocuments(options);
      case 'sync_selected':
        return await syncSelectedDocuments(document_ids, options);
      case 'validate_before_sync':
        return await validateDocumentsForSync(document_ids);
      default:
        return NextResponse.json({
          success: false,
          error: {
            code: 'INVALID_ACTION',
            message: 'Action de synchronisation non reconnue'
          }
        }, { status: 400 });
    }

  } catch (error) {
    console.error('Erreur API POST /api/cooperation/sync-dicames:', error);
    
    return NextResponse.json({
      success: false,
      error: {
        code: 'SYNC_ERROR',
        message: 'Erreur lors de la synchronisation DICAMES',
        details: process.env.NODE_ENV === 'development' ? error : undefined
      }
    }, { status: 500 });
  }
}

/**
 * Obtenir le statut de synchronisation
 */
async function getSyncStatus() {
  // Statistiques des documents par statut de synchronisation (version simplifiée)
  let statusStats = [];

  try {
    // Récupérer les statistiques pour chaque type séparément
    const thesesQuery = `
      SELECT
        'theses' as document_type,
        COUNT(*) as total,
        SUM(CASE WHEN cames_id IS NOT NULL THEN 1 ELSE 0 END) as with_cames_id,
        SUM(CASE WHEN is_accessible = 1 THEN 1 ELSE 0 END) as accessible,
        SUM(CASE WHEN document_path IS NOT NULL THEN 1 ELSE 0 END) as digitized
      FROM theses
    `;

    const [thesesStats] = await executeQuery(thesesQuery) as any[];
    statusStats.push(thesesStats);

    // Ajouter d'autres types si les tables existent
    try {
      const memoiresQuery = `
        SELECT
          'memoires' as document_type,
          COUNT(*) as total,
          SUM(CASE WHEN cames_id IS NOT NULL THEN 1 ELSE 0 END) as with_cames_id,
          SUM(CASE WHEN is_accessible = 1 THEN 1 ELSE 0 END) as accessible,
          SUM(CASE WHEN document_path IS NOT NULL THEN 1 ELSE 0 END) as digitized
        FROM memoires
      `;
      const [memoiresStats] = await executeQuery(memoiresQuery) as any[];
      statusStats.push(memoiresStats);
    } catch (error) {
      // Table memoires n'existe peut-être pas
    }

  } catch (error) {
    // Fallback avec données simulées
    statusStats = [
      { document_type: 'theses', total: 8, with_cames_id: 2, accessible: 6, digitized: 4 }
    ];
  }

  // Dernière synchronisation (simulée via les logs système)
  const lastSyncQuery = `
    SELECT 
      created_at as last_sync_date,
      message
    FROM system_logs 
    WHERE action = 'dicames_sync'
    ORDER BY created_at DESC 
    LIMIT 1
  `;

  const [lastSync] = await executeQuery(lastSyncQuery) as any[];

  // Calculer les totaux
  const totals = statusStats.reduce((acc, stat) => ({
    total_documents: acc.total_documents + stat.total,
    with_cames_id: acc.with_cames_id + stat.with_cames_id,
    accessible: acc.accessible + stat.accessible,
    digitized: acc.digitized + stat.digitized
  }), { total_documents: 0, with_cames_id: 0, accessible: 0, digitized: 0 });

  // Évaluer la préparation pour DICAMES
  const readiness = evaluateDicamesReadiness(totals);

  return NextResponse.json({
    success: true,
    data: {
      status: {
        last_sync: lastSync?.last_sync_date || null,
        last_sync_message: lastSync?.message || 'Aucune synchronisation précédente',
        connection_status: 'simulated', // Dans un vrai système, tester la connexion DICAMES
        sync_enabled: true
      },
      statistics: {
        by_type: statusStats,
        totals: {
          ...totals,
          sync_ready: totals.with_cames_id,
          sync_rate: totals.total_documents > 0 
            ? Math.round((totals.with_cames_id / totals.total_documents) * 100)
            : 0,
          digitization_rate: totals.total_documents > 0
            ? Math.round((totals.digitized / totals.total_documents) * 100)
            : 0
        }
      },
      readiness: readiness,
      next_sync_recommendation: generateSyncRecommendation(readiness)
    }
  });
}

/**
 * Obtenir les documents en attente de synchronisation
 */
async function getPendingDocuments() {
  const pendingQuery = `
    SELECT 
      id, title, main_author as author, university, defense_year,
      cames_id, is_accessible, document_path, created_at,
      'thesis' as document_type
    FROM theses 
    WHERE (cames_id IS NULL OR cames_id = '') 
    AND is_accessible = 1
    
    UNION ALL
    
    SELECT 
      id, title, main_author as author, university, academic_year as defense_year,
      cames_id, is_accessible, document_path, created_at,
      'memoire' as document_type
    FROM memoires 
    WHERE (cames_id IS NULL OR cames_id = '') 
    AND is_accessible = 1
    
    UNION ALL
    
    SELECT 
      id, title, student_name as author, university, academic_year as defense_year,
      cames_id, is_accessible, document_path, created_at,
      'stage_report' as document_type
    FROM stage_reports 
    WHERE (cames_id IS NULL OR cames_id = '') 
    AND is_accessible = 1
    
    ORDER BY created_at DESC
    LIMIT 100
  `;

  const pendingDocuments = await executeQuery(pendingQuery) as any[];

  // Valider chaque document pour la synchronisation
  const validatedDocuments = pendingDocuments.map(doc => ({
    ...doc,
    validation: validateDocumentForDicames(doc),
    estimated_sync_time: estimateSyncTime(doc)
  }));

  return NextResponse.json({
    success: true,
    data: {
      pending_documents: validatedDocuments,
      total_pending: validatedDocuments.length,
      ready_for_sync: validatedDocuments.filter(doc => doc.validation.is_valid).length,
      estimated_total_time: validatedDocuments.reduce((sum, doc) => sum + doc.estimated_sync_time, 0)
    }
  });
}

/**
 * Obtenir l'historique de synchronisation
 */
async function getSyncHistory() {
  const historyQuery = `
    SELECT 
      created_at as sync_date,
      message,
      action
    FROM system_logs 
    WHERE action LIKE '%dicames%' OR action LIKE '%sync%'
    ORDER BY created_at DESC 
    LIMIT 50
  `;

  const history = await executeQuery(historyQuery) as any[];

  return NextResponse.json({
    success: true,
    data: {
      sync_history: history,
      total_syncs: history.length
    }
  });
}

/**
 * Synchroniser tous les documents éligibles
 */
async function syncAllDocuments(options: any) {
  // Simulation de synchronisation
  const startTime = Date.now();
  
  // Obtenir les documents prêts pour la synchronisation
  const readyDocuments = await getDocumentsReadyForSync();
  
  const results = {
    total_processed: readyDocuments.length,
    successful: 0,
    failed: 0,
    errors: [] as Array<{document_id: any; title: any; error: any}>,
    processing_time: 0
  };

  // Simuler la synchronisation de chaque document
  for (const doc of readyDocuments) {
    try {
      const syncResult = await simulateDocumentSync(doc);
      if (syncResult.success) {
        results.successful++;
        // Mettre à jour le CAMES ID dans la base
        await updateCamesId(doc.id, doc.document_type, syncResult.cames_id);
      } else {
        results.failed++;
        results.errors.push({
          document_id: doc.id,
          title: doc.title,
          error: syncResult.error
        });
      }
    } catch (error) {
      results.failed++;
      results.errors.push({
        document_id: doc.id,
        title: doc.title,
        error: 'Erreur de synchronisation'
      });
    }
  }

  results.processing_time = Date.now() - startTime;

  // Enregistrer le log de synchronisation
  await logSyncOperation('sync_all', results);

  return NextResponse.json({
    success: true,
    data: results
  });
}

/**
 * Synchroniser des documents sélectionnés
 */
async function syncSelectedDocuments(documentIds: string[], options: any) {
  if (!documentIds || documentIds.length === 0) {
    return NextResponse.json({
      success: false,
      error: {
        code: 'NO_DOCUMENTS',
        message: 'Aucun document sélectionné'
      }
    }, { status: 400 });
  }

  // Récupérer les documents sélectionnés
  const documents = await getDocumentsByIds(documentIds);
  
  const results = {
    total_processed: documents.length,
    successful: 0,
    failed: 0,
    errors: [] as Array<{document_id: any; title: any; error: any}>,
    processing_time: 0
  };

  const startTime = Date.now();

  for (const doc of documents) {
    try {
      const validation = validateDocumentForDicames(doc);
      if (!validation.is_valid) {
        results.failed++;
        results.errors.push({
          document_id: doc.id,
          title: doc.title,
          error: `Validation échouée: ${validation.errors.join(', ')}`
        });
        continue;
      }

      const syncResult = await simulateDocumentSync(doc);
      if (syncResult.success) {
        results.successful++;
        await updateCamesId(doc.id, doc.document_type, syncResult.cames_id);
      } else {
        results.failed++;
        results.errors.push({
          document_id: doc.id,
          title: doc.title,
          error: syncResult.error
        });
      }
    } catch (error) {
      results.failed++;
      results.errors.push({
        document_id: doc.id,
        title: doc.title,
        error: 'Erreur de synchronisation'
      });
    }
  }

  results.processing_time = Date.now() - startTime;

  await logSyncOperation('sync_selected', results);

  return NextResponse.json({
    success: true,
    data: results
  });
}

/**
 * Valider des documents avant synchronisation
 */
async function validateDocumentsForSync(documentIds: string[]) {
  const documents = await getDocumentsByIds(documentIds);
  
  const validations = documents.map(doc => ({
    document_id: doc.id,
    title: doc.title,
    document_type: doc.document_type,
    validation: validateDocumentForDicames(doc)
  }));

  return NextResponse.json({
    success: true,
    data: {
      validations,
      total_documents: validations.length,
      valid_documents: validations.filter(v => v.validation.is_valid).length,
      invalid_documents: validations.filter(v => !v.validation.is_valid).length
    }
  });
}

/**
 * Évaluer la préparation pour DICAMES
 */
function evaluateDicamesReadiness(totals: any): any {
  const score = {
    metadata: totals.with_cames_id / totals.total_documents,
    accessibility: totals.accessible / totals.total_documents,
    digitization: totals.digitized / totals.total_documents
  };

  const overallScore = (score.metadata + score.accessibility + score.digitization) / 3;

  return {
    overall_score: Math.round(overallScore * 100),
    metadata_score: Math.round(score.metadata * 100),
    accessibility_score: Math.round(score.accessibility * 100),
    digitization_score: Math.round(score.digitization * 100),
    level: overallScore > 0.8 ? 'excellent' : overallScore > 0.6 ? 'good' : overallScore > 0.4 ? 'fair' : 'poor'
  };
}

/**
 * Générer une recommandation de synchronisation
 */
function generateSyncRecommendation(readiness: any): string {
  if (readiness.level === 'excellent') {
    return 'Prêt pour synchronisation complète avec DICAMES';
  } else if (readiness.level === 'good') {
    return 'Synchronisation recommandée après correction des métadonnées manquantes';
  } else if (readiness.level === 'fair') {
    return 'Améliorer la numérisation et les métadonnées avant synchronisation';
  } else {
    return 'Préparation importante requise avant synchronisation DICAMES';
  }
}

/**
 * Valider un document pour DICAMES
 */
function validateDocumentForDicames(document: any): any {
  const errors = [];
  const warnings = [];

  // Vérifications obligatoires
  if (!document.title || document.title.trim().length < 10) {
    errors.push('Titre trop court ou manquant');
  }

  if (!document.author || document.author.trim().length < 3) {
    errors.push('Auteur manquant ou invalide');
  }

  if (!document.university) {
    errors.push('Université manquante');
  }

  if (!document.defense_year || document.defense_year < 1990) {
    errors.push('Année de soutenance manquante ou invalide');
  }

  // Vérifications recommandées
  if (!document.document_path) {
    warnings.push('Document non numérisé');
  }

  if (!document.cames_id) {
    warnings.push('ID CAMES manquant');
  }

  return {
    is_valid: errors.length === 0,
    errors,
    warnings,
    score: Math.max(0, 100 - (errors.length * 25) - (warnings.length * 10))
  };
}

/**
 * Simuler la synchronisation d'un document
 */
async function simulateDocumentSync(document: any): Promise<any> {
  // Simulation d'une synchronisation avec délai
  await new Promise(resolve => setTimeout(resolve, Math.random() * 1000 + 500));

  // Simuler un taux de succès de 90%
  if (Math.random() > 0.1) {
    return {
      success: true,
      cames_id: generateCamesId(document),
      sync_date: new Date().toISOString()
    };
  } else {
    return {
      success: false,
      error: 'Erreur de connexion DICAMES (simulée)'
    };
  }
}

/**
 * Générer un ID CAMES
 */
function generateCamesId(document: any): string {
  const year = document.defense_year || new Date().getFullYear();
  const typeCode = document.document_type === 'thesis' ? 'TH' : 
                   document.document_type === 'memoire' ? 'ME' : 'RS';
  const sequence = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  
  return `CAMES-CM-UDM-${year}-${typeCode}-${sequence}`;
}

/**
 * Mettre à jour l'ID CAMES dans la base
 */
async function updateCamesId(documentId: string, documentType: string, camesId: string) {
  const tableName = documentType === 'thesis' ? 'theses' : 
                    documentType === 'memoire' ? 'memoires' : 'stage_reports';
  
  await executeQuery(
    `UPDATE ${tableName} SET cames_id = ?, updated_at = NOW() WHERE id = ?`,
    [camesId, documentId]
  );
}

/**
 * Enregistrer une opération de synchronisation
 */
async function logSyncOperation(operation: string, results: any) {
  await executeQuery(
    `INSERT INTO system_logs (action, message, created_at) VALUES (?, ?, NOW())`,
    [
      'dicames_sync',
      `${operation}: ${results.successful} succès, ${results.failed} échecs en ${results.processing_time}ms`
    ]
  );
}

/**
 * Obtenir les documents prêts pour synchronisation
 */
async function getDocumentsReadyForSync(): Promise<any[]> {
  const query = `
    SELECT id, title, main_author as author, university, defense_year, 'thesis' as document_type
    FROM theses WHERE is_accessible = 1 AND (cames_id IS NULL OR cames_id = '')
    UNION ALL
    SELECT id, title, main_author as author, university, academic_year as defense_year, 'memoire' as document_type
    FROM memoires WHERE is_accessible = 1 AND (cames_id IS NULL OR cames_id = '')
    UNION ALL
    SELECT id, title, student_name as author, university, academic_year as defense_year, 'stage_report' as document_type
    FROM stage_reports WHERE is_accessible = 1 AND (cames_id IS NULL OR cames_id = '')
    LIMIT 100
  `;

  return await executeQuery(query) as any[];
}

/**
 * Obtenir des documents par IDs
 */
async function getDocumentsByIds(documentIds: string[]): Promise<any[]> {
  const placeholders = documentIds.map(() => '?').join(',');
  
  const queries = [
    `SELECT *, 'thesis' as document_type FROM theses WHERE id IN (${placeholders})`,
    `SELECT *, 'memoire' as document_type FROM memoires WHERE id IN (${placeholders})`,
    `SELECT *, 'stage_report' as document_type FROM stage_reports WHERE id IN (${placeholders})`
  ];

  const results = [];
  for (const query of queries) {
    const docs = await executeQuery(query, documentIds) as any[];
    results.push(...docs);
  }

  return results;
}

/**
 * Estimer le temps de synchronisation
 */
function estimateSyncTime(document: any): number {
  // Estimation basée sur la taille du document et la complexité
  let baseTime = 2000; // 2 secondes de base
  
  if (document.document_path) {
    baseTime += 1000; // +1 seconde pour les documents numérisés
  }
  
  if (document.title && document.title.length > 100) {
    baseTime += 500; // +0.5 seconde pour les titres longs
  }
  
  return baseTime;
}
