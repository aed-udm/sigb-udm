import { NextRequest, NextResponse } from 'next/server';
import { executeQuery } from '@/lib/mysql';
import mysql from 'mysql2/promise';

/**
 * API d'Administration Unifiée
 * Remplace /admin/penalties, /admin/settings, /admin/sidebar-stats, /admin/fix-inventory, /admin/migrate-isbn
 * 
 * GET /api/admin?action=penalties|settings|sidebar-stats|fix-inventory|migrate-isbn&...params
 * POST /api/admin?action=penalties|settings|fix-inventory|migrate-isbn&...params
 * PUT /api/admin?action=penalties|settings&...params
 */

// Configuration de la base de données
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'bibliotheque_cameroun',
  port: parseInt(process.env.DB_PORT || '3306'),
};

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');

    if (!action) {
      return NextResponse.json(
        { 
          error: 'Action requise',
          supportedActions: ['penalties', 'settings', 'sidebar-stats', 'fix-inventory', 'migrate-isbn']
        },
        { status: 400 }
      );
    }

    switch (action) {
      case 'penalties':
        return await getPenalties(searchParams);
      
      case 'settings':
        return await getSettings(searchParams);
      
      case 'sidebar-stats':
        return await getSidebarStats();
      
      case 'fix-inventory':
        return await getInventoryDiagnostic();
      
      case 'migrate-isbn':
        return await getISBNMigrationStatus();
      
      default:
        return NextResponse.json(
          { error: 'Action non supportée' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Erreur API admin unifiée (GET):', error);
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des données admin' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');
    const body = await request.json();

    if (!action) {
      return NextResponse.json(
        { error: 'Action requise' },
        { status: 400 }
      );
    }

    switch (action) {
      case 'penalties':
        return await createPenalties(body);
      
      case 'settings':
        return await createSettings(body);
      
      case 'fix-inventory':
        return await fixInventory();
      
      case 'migrate-isbn':
        return await migrateISBN();
      
      default:
        return NextResponse.json(
          { error: 'Action non supportée' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Erreur API admin unifiée (POST):', error);
    return NextResponse.json(
      { error: 'Erreur lors de la création/modification des données admin' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');
    const body = await request.json();

    if (!action) {
      return NextResponse.json(
        { error: 'Action requise' },
        { status: 400 }
      );
    }

    switch (action) {
      case 'penalties':
        return await updatePenalties(body);
      
      case 'settings':
        return await updateSettings(body);
      
      default:
        return NextResponse.json(
          { error: 'Action non supportée pour PUT' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Erreur API admin unifiée (PUT):', error);
    return NextResponse.json(
      { error: 'Erreur lors de la mise à jour des données admin' },
      { status: 500 }
    );
  }
}

/**
 * Gestion des pénalités
 */
async function getPenalties(searchParams: URLSearchParams) {
  const documentType = searchParams.get('document_type');

  let query = `
    SELECT 
      id, document_type, daily_rate, max_penalty, grace_period_days,
      is_active, created_at, updated_at
    FROM penalty_settings
  `;

  const params: any[] = [];

  if (documentType) {
    query += ' WHERE document_type = ?';
    params.push(documentType);
  }

  query += ' ORDER BY document_type';

  const settings = await executeQuery(query, params);

  const enrichedSettings = (settings as any[]).map(setting => ({
    ...setting,
    document_type_label: getDocumentTypeLabel(setting.document_type),
    daily_rate_formatted: `${setting.daily_rate?.toLocaleString() || '0'} FCFA`,
    max_penalty_formatted: `${setting.max_penalty?.toLocaleString() || '0'} FCFA`,
    grace_period_label: setting.grace_period_days === 0 
      ? 'Aucune période de grâce' 
      : `${setting.grace_period_days} jour${setting.grace_period_days > 1 ? 's' : ''}`
  }));

  return NextResponse.json({
    success: true,
    data: enrichedSettings,
    message: `${enrichedSettings.length} paramètre(s) de pénalité récupéré(s)`
  });
}

async function updatePenalties(body: any) {
  const { document_type, daily_rate, max_penalty, grace_period_days, is_active = true } = body;

  // Validation
  if (!document_type || daily_rate === undefined || max_penalty === undefined || grace_period_days === undefined) {
    return NextResponse.json(
      { 
        success: false, 
        error: 'Tous les champs sont requis: document_type, daily_rate, max_penalty, grace_period_days' 
      },
      { status: 400 }
    );
  }

  const validDocumentTypes = ['book', 'these', 'memoire', 'rapport_stage'];
  if (!validDocumentTypes.includes(document_type)) {
    return NextResponse.json(
      { 
        success: false, 
        error: `Type de document invalide. Types valides: ${validDocumentTypes.join(', ')}` 
      },
      { status: 400 }
    );
  }

  if (daily_rate < 0 || max_penalty < 0 || grace_period_days < 0) {
    return NextResponse.json(
      { 
        success: false, 
        error: 'Les valeurs numériques doivent être positives' 
      },
      { status: 400 }
    );
  }

  await executeQuery(`
    INSERT INTO penalty_settings (document_type, daily_rate, max_penalty, grace_period_days, is_active)
    VALUES (?, ?, ?, ?, ?)
    ON DUPLICATE KEY UPDATE
      daily_rate = VALUES(daily_rate),
      max_penalty = VALUES(max_penalty),
      grace_period_days = VALUES(grace_period_days),
      is_active = VALUES(is_active),
      updated_at = CURRENT_TIMESTAMP
  `, [document_type, daily_rate, max_penalty, grace_period_days, is_active]);

  return NextResponse.json({
    success: true,
    message: `Paramètres de pénalité mis à jour pour ${getDocumentTypeLabel(document_type)}`
  });
}

async function createPenalties(body: any) {
  const { settings } = body;

  if (!Array.isArray(settings) || settings.length === 0) {
    return NextResponse.json(
      { 
        success: false, 
        error: 'Un tableau de paramètres est requis' 
      },
      { status: 400 }
    );
  }

  const results = [];
  const errors = [];

  for (const setting of settings) {
    try {
      const { document_type, daily_rate, max_penalty, grace_period_days, is_active = true } = setting;

      await executeQuery(`
        INSERT INTO penalty_settings (document_type, daily_rate, max_penalty, grace_period_days, is_active)
        VALUES (?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
          daily_rate = VALUES(daily_rate),
          max_penalty = VALUES(max_penalty),
          grace_period_days = VALUES(grace_period_days),
          is_active = VALUES(is_active),
          updated_at = CURRENT_TIMESTAMP
      `, [document_type, daily_rate, max_penalty, grace_period_days, is_active]);

      results.push({
        document_type,
        status: 'success',
        message: `Paramètres mis à jour pour ${getDocumentTypeLabel(document_type)}`
      });

    } catch (error) {
      errors.push(`Erreur pour ${setting.document_type}: ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
    }
  }

  return NextResponse.json({
    success: errors.length === 0,
    results,
    errors,
    message: `${results.length} paramètre(s) traité(s), ${errors.length} erreur(s)`
  });
}

/**
 * Gestion des paramètres système
 */
async function getSettings(searchParams: URLSearchParams) {
  const category = searchParams.get('category');
  const isPublic = searchParams.get('public');

  let query = 'SELECT * FROM system_settings WHERE 1=1';
  const params: any[] = [];

  if (category) {
    query += ' AND category = ?';
    params.push(category);
  }

  if (isPublic !== null) {
    query += ' AND is_public = ?';
    params.push(isPublic === 'true');
  }

  query += ' ORDER BY category, key_name';

  const settings = await executeQuery(query, params);

  return NextResponse.json({
    success: true,
    data: settings,
    message: `${(settings as any[]).length} paramètre(s) récupéré(s)`
  });
}

async function updateSettings(body: any) {
  const { settings } = body;

  if (!Array.isArray(settings)) {
    return NextResponse.json(
      { error: 'Un tableau de paramètres est requis' },
      { status: 400 }
    );
  }

  for (const setting of settings) {
    const { key, value } = setting;
    await executeQuery(
      'UPDATE system_settings SET value = ?, updated_at = CURRENT_TIMESTAMP WHERE key_name = ?',
      [value, key]
    );
  }

  return NextResponse.json({
    success: true,
    message: `${settings.length} paramètre(s) mis à jour`
  });
}

async function createSettings(body: any) {
  const { key, value, type, category, description, is_public = false } = body;

  await executeQuery(`
    INSERT INTO system_settings (key_name, value, type, category, description, is_public)
    VALUES (?, ?, ?, ?, ?, ?)
    ON DUPLICATE KEY UPDATE
      value = VALUES(value),
      updated_at = CURRENT_TIMESTAMP
  `, [key, value, type, category, description, is_public]);

  return NextResponse.json({
    success: true,
    message: 'Paramètre créé/mis à jour avec succès'
  });
}

/**
 * Statistiques pour la sidebar
 */
async function getSidebarStats() {
  const sidebarStats = await executeQuery(`
    SELECT
      (SELECT COUNT(*) FROM loans WHERE status = 'overdue') as overdue_loans,
      (SELECT COUNT(*) FROM reservations WHERE status = 'active') as pending_reservations,
      (SELECT COUNT(*) FROM (
        SELECT id FROM books WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)
        UNION ALL
        SELECT id FROM theses WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)
        UNION ALL
        SELECT id FROM memoires WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)
        UNION ALL
        SELECT id FROM stage_reports WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)
      ) as new_docs) as new_documents,
      (SELECT COUNT(*) FROM users WHERE is_active = 1 AND created_at >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)) as new_users
  `);

  return NextResponse.json({
    success: true,
    data: (sidebarStats as any[])[0],
    message: 'Statistiques sidebar récupérées'
  });
}

/**
 * Diagnostic et correction d'inventaire
 */
async function getInventoryDiagnostic() {
  const bookInconsistencies = await executeQuery(`
    SELECT 
      b.id, b.title, b.total_copies, b.available_copies,
      COUNT(l.id) as active_loans, COUNT(r.id) as active_reservations,
      (b.total_copies - COUNT(l.id) - COUNT(r.id)) as should_be_available
    FROM books b
    LEFT JOIN loans l ON b.id = l.book_id AND l.status = 'active'
    LEFT JOIN reservations r ON b.id = r.book_id AND r.status = 'active'
    GROUP BY b.id, b.title, b.total_copies, b.available_copies
    HAVING b.available_copies != (b.total_copies - COUNT(l.id) - COUNT(r.id))
  `);

  return NextResponse.json({
    success: true,
    data: bookInconsistencies,
    count: (bookInconsistencies as any[]).length,
    message: `${(bookInconsistencies as any[]).length} incohérence(s) détectée(s)`
  });
}

async function fixInventory() {
  await executeQuery(`
    UPDATE books b
    SET available_copies = (
      b.total_copies - 
      COALESCE((SELECT COUNT(*) FROM loans l WHERE l.book_id = b.id AND l.status = 'active'), 0) -
      COALESCE((SELECT COUNT(*) FROM reservations r WHERE r.book_id = b.id AND r.status = 'active'), 0)
    )
    WHERE b.available_copies != (
      b.total_copies - 
      COALESCE((SELECT COUNT(*) FROM loans l WHERE l.book_id = b.id AND l.status = 'active'), 0) -
      COALESCE((SELECT COUNT(*) FROM reservations r WHERE r.book_id = b.id AND r.status = 'active'), 0)
    )
  `);

  return NextResponse.json({
    success: true,
    message: "Incohérences d'inventaire corrigées avec succès"
  });
}

/**
 * Migration ISBN
 */
async function getISBNMigrationStatus() {
  const connection = await mysql.createConnection(dbConfig);
  
  try {
    const [columns] = await connection.execute(`
      SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_DEFAULT
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'books' AND COLUMN_NAME = 'isbn'
    `, [dbConfig.database]);

    const exists = Array.isArray(columns) && columns.length > 0;

    return NextResponse.json({
      success: true,
      data: {
        isbn_column_exists: exists,
        column_info: exists ? columns[0] : null
      },
      message: exists ? 'Colonne ISBN existe' : 'Colonne ISBN n\'existe pas'
    });
  } finally {
    await connection.end();
  }
}

async function migrateISBN() {
  const connection = await mysql.createConnection(dbConfig);
  
  try {
    // Vérifier si la colonne existe déjà
    const [columns] = await connection.execute(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'books' AND COLUMN_NAME = 'isbn'
    `, [dbConfig.database]);
    
    if (Array.isArray(columns) && columns.length > 0) {
      return NextResponse.json({
        success: true,
        message: 'La colonne ISBN existe déjà',
        alreadyExists: true
      });
    }
    
    // Ajouter la colonne ISBN
    await connection.execute(`
      ALTER TABLE books 
      ADD COLUMN isbn VARCHAR(20) DEFAULT NULL COMMENT 'Numéro ISBN du livre' 
      AFTER keywords
    `);
    
    // Ajouter l'index
    await connection.execute(`
      ALTER TABLE books 
      ADD INDEX idx_books_isbn (isbn)
    `);
    
    return NextResponse.json({
      success: true,
      message: 'Migration ISBN terminée avec succès',
      details: {
        columnAdded: true,
        indexAdded: true
      }
    });
    
  } finally {
    await connection.end();
  }
}

/**
 * Utilitaires
 */
function getDocumentTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    'book': 'Livre',
    'these': 'Thèse',
    'memoire': 'Mémoire',
    'rapport_stage': 'Rapport de stage'
  };
  return labels[type] || type;
}
