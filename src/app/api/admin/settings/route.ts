/**
 * API Route: /api/admin/settings
 * Gestion des paramètres système
 */

import { NextRequest, NextResponse } from 'next/server';
import { executeQuery } from '@/lib/mysql';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');

    let query = `
      SELECT 
        setting_key,
        setting_value,
        setting_type,
        category,
        description,
        is_public
      FROM system_settings
    `;

    const params: any[] = [];

    if (category) {
      query += ' WHERE category = ?';
      params.push(category);
    }

    query += ' ORDER BY category, setting_key';

    const settings = await executeQuery(query, params) as any[];

    // Grouper par catégorie
    const groupedSettings = settings.reduce((acc, setting) => {
      const cat = setting.category || 'general';
      if (!acc[cat]) {
        acc[cat] = [];
      }
      acc[cat].push({
        key: setting.setting_key,
        value: parseSettingValue(setting.setting_value, setting.setting_type),
        type: setting.setting_type,
        description: setting.description,
        is_public: setting.is_public
      });
      return acc;
    }, {});

    return NextResponse.json({
      success: true,
      data: {
        settings: groupedSettings,
        categories: Object.keys(groupedSettings)
      }
    });

  } catch (error) {
    console.error('Erreur API GET /api/admin/settings:', error);
    
    return NextResponse.json({
      success: false,
      error: {
        code: 'SETTINGS_GET_ERROR',
        message: 'Erreur lors du chargement des paramètres',
        details: process.env.NODE_ENV === 'development' ? error : undefined
      }
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { settings } = body;

    if (!settings || !Array.isArray(settings)) {
      return NextResponse.json({
        success: false,
        error: {
          code: 'INVALID_INPUT',
          message: 'Format de données invalide'
        }
      }, { status: 400 });
    }

    // Mettre à jour chaque paramètre
    const updatePromises = settings.map(async (setting: any) => {
      const { key, value, type, category, description, is_public } = setting;

      const query = `
        INSERT INTO system_settings (
          id, setting_key, setting_value, setting_type, category, description, is_public, created_at, updated_at
        ) VALUES (
          UUID(), ?, ?, ?, ?, ?, ?, NOW(), NOW()
        ) ON DUPLICATE KEY UPDATE
          setting_value = VALUES(setting_value),
          setting_type = VALUES(setting_type),
          category = VALUES(category),
          description = VALUES(description),
          is_public = VALUES(is_public),
          updated_at = NOW()
      `;

      const stringValue = typeof value === 'object' ? JSON.stringify(value) : String(value);

      return executeQuery(query, [
        key,
        stringValue,
        type || 'string',
        category || 'general',
        description || null,
        is_public || false
      ]);
    });

    await Promise.all(updatePromises);

    return NextResponse.json({
      success: true,
      message: 'Paramètres mis à jour avec succès'
    });

  } catch (error) {
    console.error('Erreur API POST /api/admin/settings:', error);
    
    return NextResponse.json({
      success: false,
      error: {
        code: 'SETTINGS_UPDATE_ERROR',
        message: 'Erreur lors de la mise à jour des paramètres',
        details: process.env.NODE_ENV === 'development' ? error : undefined
      }
    }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { key, value, type, category, description, is_public } = body;

    if (!key) {
      return NextResponse.json({
        success: false,
        error: {
          code: 'MISSING_KEY',
          message: 'Clé de paramètre requise'
        }
      }, { status: 400 });
    }

    const query = `
      UPDATE system_settings 
      SET 
        setting_value = ?,
        setting_type = COALESCE(?, setting_type),
        category = COALESCE(?, category),
        description = COALESCE(?, description),
        is_public = COALESCE(?, is_public),
        updated_at = NOW()
      WHERE setting_key = ?
    `;

    const stringValue = typeof value === 'object' ? JSON.stringify(value) : String(value);

    const result = await executeQuery(query, [
      stringValue,
      type,
      category,
      description,
      is_public,
      key
    ]);

    if ((result as any).affectedRows === 0) {
      return NextResponse.json({
        success: false,
        error: {
          code: 'SETTING_NOT_FOUND',
          message: 'Paramètre non trouvé'
        }
      }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: 'Paramètre mis à jour avec succès'
    });

  } catch (error) {
    console.error('Erreur API PUT /api/admin/settings:', error);
    
    return NextResponse.json({
      success: false,
      error: {
        code: 'SETTING_UPDATE_ERROR',
        message: 'Erreur lors de la mise à jour du paramètre',
        details: process.env.NODE_ENV === 'development' ? error : undefined
      }
    }, { status: 500 });
  }
}

/**
 * Parser la valeur d'un paramètre selon son type
 */
function parseSettingValue(value: string, type: string): any {
  if (!value) return null;

  switch (type) {
    case 'boolean':
      return value === 'true' || value === '1';
    case 'number':
      return parseFloat(value);
    case 'integer':
      return parseInt(value, 10);
    case 'json':
      try {
        return JSON.parse(value);
      } catch {
        return value;
      }
    case 'array':
      try {
        return JSON.parse(value);
      } catch {
        return value.split(',').map(s => s.trim());
      }
    default:
      return value;
  }
}
