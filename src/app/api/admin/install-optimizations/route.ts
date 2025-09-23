import { NextRequest, NextResponse } from 'next/server';
import { executeQuery } from '@/lib/mysql';

/**
 * POST /api/admin/install-optimizations - Installer les optimisations manquantes
 */
export async function POST(request: NextRequest) {
  try {
    console.log('🚀 Installation des optimisations manquantes...');
    
    const results = {
      cache_table: false,
      stats_view: false,
      indexes_verified: 0,
      errors: [] as string[]
    };

    // 1. Créer la table de cache
    try {
      await executeQuery(`
        CREATE TABLE IF NOT EXISTS catalog_search_cache (
          id INT AUTO_INCREMENT PRIMARY KEY,
          search_hash VARCHAR(64) UNIQUE NOT NULL,
          search_params JSON NOT NULL,
          results JSON NOT NULL,
          total_count INT NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          expires_at TIMESTAMP NOT NULL,
          hit_count INT DEFAULT 1,
          INDEX idx_search_hash (search_hash),
          INDEX idx_expires (expires_at),
          INDEX idx_hit_count (hit_count DESC)
        )
      `);
      results.cache_table = true;
      console.log('✅ Table de cache créée');
    } catch (error) {
      results.errors.push(`Erreur table cache: ${error}`);
      console.error('❌ Erreur table cache:', error);
    }

    // 2. Créer la vue des statistiques
    try {
      await executeQuery(`DROP VIEW IF EXISTS catalog_stats`);
      await executeQuery(`
        CREATE VIEW catalog_stats AS
        SELECT 
          'books' as type,
          COUNT(*) as total_count,
          SUM(CASE WHEN available_copies > 0 THEN 1 ELSE 0 END) as available_count,
          MAX(created_at) as last_updated
        FROM books WHERE status = 'active'
        UNION ALL
        SELECT 
          'theses' as type,
          COUNT(*) as total_count,
          SUM(CASE WHEN available_copies > 0 THEN 1 ELSE 0 END) as available_count,
          MAX(created_at) as last_updated
        FROM theses WHERE status = 'active'
        UNION ALL
        SELECT 
          'memoires' as type,
          COUNT(*) as total_count,
          SUM(CASE WHEN available_copies > 0 THEN 1 ELSE 0 END) as available_count,
          MAX(created_at) as last_updated
        FROM memoires WHERE status = 'active'
        UNION ALL
        SELECT 
          'stage_reports' as type,
          COUNT(*) as total_count,
          SUM(CASE WHEN available_copies > 0 THEN 1 ELSE 0 END) as available_count,
          MAX(created_at) as last_updated
        FROM stage_reports WHERE status = 'active'
      `);
      results.stats_view = true;
      console.log('✅ Vue des statistiques créée');
    } catch (error) {
      results.errors.push(`Erreur vue stats: ${error}`);
      console.error('❌ Erreur vue stats:', error);
    }

    // 3. Vérifier les index existants
    try {
      const indexes = await executeQuery(`
        SELECT TABLE_NAME, INDEX_NAME, COLUMN_NAME 
        FROM INFORMATION_SCHEMA.STATISTICS 
        WHERE TABLE_SCHEMA = DATABASE() AND INDEX_NAME LIKE 'idx_%'
        ORDER BY TABLE_NAME, INDEX_NAME
      `) as any[];
      
      results.indexes_verified = indexes.length;
      console.log(`✅ ${indexes.length} index d'optimisation vérifiés`);
    } catch (error) {
      results.errors.push(`Erreur vérification index: ${error}`);
    }

    // 4. Analyser les tables pour optimiser les statistiques
    const tables = ['books', 'theses', 'memoires', 'stage_reports'];
    for (const table of tables) {
      try {
        await executeQuery(`ANALYZE TABLE ${table}`);
        console.log(`✅ Table ${table} analysée`);
      } catch (error) {
        results.errors.push(`Erreur analyse ${table}: ${error}`);
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        optimizations_installed: {
          cache_table: results.cache_table,
          stats_view: results.stats_view,
          indexes_count: results.indexes_verified
        },
        errors: results.errors,
        message: 'Optimisations installées avec succès',
        next_steps: [
          'Tester l\'API du catalogue optimisée',
          'Vérifier les performances de recherche',
          'Monitorer le cache des recherches'
        ]
      }
    });

  } catch (error) {
    console.error('Erreur installation optimisations:', error);
    return NextResponse.json({
      success: false,
      error: {
        code: 'OPTIMIZATION_INSTALL_ERROR',
        message: 'Erreur lors de l\'installation des optimisations',
        details: error instanceof Error ? error.message : 'Erreur inconnue'
      }
    }, { status: 500 });
  }
}

/**
 * GET /api/admin/install-optimizations - Vérifier le statut des optimisations
 */
export async function GET(request: NextRequest) {
  try {
    const status = {
      cache_table_exists: false,
      stats_view_exists: false,
      indexes_count: 0,
      database_size: 0,
      performance_metrics: {}
    };

    // Vérifier la table de cache
    try {
      const cacheCheck = await executeQuery(`
        SELECT COUNT(*) as count 
        FROM INFORMATION_SCHEMA.TABLES 
        WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'catalog_search_cache'
      `) as any[];
      status.cache_table_exists = cacheCheck[0].count > 0;
    } catch (error) {
      console.error('Erreur vérification table cache:', error);
    }

    // Vérifier la vue des statistiques
    try {
      const viewCheck = await executeQuery(`
        SELECT COUNT(*) as count 
        FROM INFORMATION_SCHEMA.VIEWS 
        WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'catalog_stats'
      `) as any[];
      status.stats_view_exists = viewCheck[0].count > 0;
    } catch (error) {
      console.error('Erreur vérification vue stats:', error);
    }

    // Compter les index d'optimisation
    try {
      const indexes = await executeQuery(`
        SELECT COUNT(*) as count
        FROM INFORMATION_SCHEMA.STATISTICS 
        WHERE TABLE_SCHEMA = DATABASE() AND INDEX_NAME LIKE 'idx_%'
      `) as any[];
      status.indexes_count = indexes[0].count;
    } catch (error) {
      console.error('Erreur comptage index:', error);
    }

    // Taille de la base de données
    try {
      const sizeCheck = await executeQuery(`
        SELECT 
          SUM(data_length + index_length) / 1024 / 1024 as size_mb
        FROM INFORMATION_SCHEMA.TABLES 
        WHERE TABLE_SCHEMA = DATABASE()
      `) as any[];
      status.database_size = Math.round(sizeCheck[0].size_mb || 0);
    } catch (error) {
      console.error('Erreur taille BD:', error);
    }

    return NextResponse.json({
      success: true,
      data: status
    });

  } catch (error) {
    console.error('Erreur vérification optimisations:', error);
    return NextResponse.json({
      success: false,
      error: {
        code: 'OPTIMIZATION_CHECK_ERROR',
        message: 'Erreur lors de la vérification des optimisations'
      }
    }, { status: 500 });
  }
}
