/**
 * API Route: /api/admin/penalties
 * Gestion des pénalités par type de document
 */

import { NextRequest, NextResponse } from 'next/server';
import { executeQuery } from '@/lib/mysql';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const documentType = searchParams.get('document_type');

    let query = `
      SELECT 
        id,
        document_type,
        daily_rate,
        max_penalty,
        grace_period_days,
        is_active,
        created_at,
        updated_at
      FROM penalty_settings
    `;

    const params: any[] = [];

    if (documentType) {
      query += ' WHERE document_type = ?';
      params.push(documentType);
    }

    query += ' ORDER BY document_type';

    const penalties = await executeQuery(query, params) as any[];

    // Si aucune donnée, retourner les paramètres par défaut
    if (penalties.length === 0) {
      const defaultPenalties = [
        {
          id: '1',
          document_type: 'book',
          daily_rate: 100,
          max_penalty: 5000,
          grace_period_days: 1,
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        {
          id: '2',
          document_type: 'these',
          daily_rate: 200,
          max_penalty: 10000,
          grace_period_days: 2,
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        {
          id: '3',
          document_type: 'memoire',
          daily_rate: 150,
          max_penalty: 7500,
          grace_period_days: 1,
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        {
          id: '4',
          document_type: 'rapport_stage',
          daily_rate: 100,
          max_penalty: 5000,
          grace_period_days: 1,
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      ];

      return NextResponse.json({
        success: true,
        data: documentType ? defaultPenalties.find(p => p.document_type === documentType) : defaultPenalties,
        message: 'Paramètres par défaut retournés (table vide)'
      });
    }

    return NextResponse.json({
      success: true,
      data: documentType ? penalties[0] : penalties
    });

  } catch (error) {
    console.error('Erreur API GET /api/admin/penalties:', error);
    
    return NextResponse.json({
      success: false,
      error: {
        code: 'PENALTIES_GET_ERROR',
        message: 'Erreur lors du chargement des pénalités',
        details: process.env.NODE_ENV === 'development' ? error : undefined
      }
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { document_type, daily_rate, max_penalty, grace_period_days, is_active = true } = body;

    if (!document_type || daily_rate === undefined) {
      return NextResponse.json({
        success: false,
        error: {
          code: 'INVALID_INPUT',
          message: 'Type de document et taux journalier requis'
        }
      }, { status: 400 });
    }

    const query = `
      INSERT INTO penalty_settings (
        id, document_type, daily_rate, max_penalty, grace_period_days, is_active, created_at, updated_at
      ) VALUES (
        ?, ?, ?, ?, ?, ?, NOW(), NOW()
      ) ON DUPLICATE KEY UPDATE
        daily_rate = VALUES(daily_rate),
        max_penalty = VALUES(max_penalty),
        grace_period_days = VALUES(grace_period_days),
        is_active = VALUES(is_active),
        updated_at = NOW()
    `;

    // Générer un ID simple pour la compatibilité
    const id = Date.now().toString();

    await executeQuery(query, [
      id,
      document_type,
      daily_rate,
      max_penalty || 0,
      grace_period_days || 0,
      is_active
    ]);

    return NextResponse.json({
      success: true,
      message: 'Paramètres de pénalité mis à jour avec succès'
    });

  } catch (error) {
    console.error('Erreur API POST /api/admin/penalties:', error);
    
    return NextResponse.json({
      success: false,
      error: {
        code: 'PENALTIES_UPDATE_ERROR',
        message: 'Erreur lors de la mise à jour des pénalités',
        details: process.env.NODE_ENV === 'development' ? error : undefined
      }
    }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, document_type, daily_rate, max_penalty, grace_period_days, is_active } = body;

    if (!id && !document_type) {
      return NextResponse.json({
        success: false,
        error: {
          code: 'MISSING_IDENTIFIER',
          message: 'ID ou type de document requis'
        }
      }, { status: 400 });
    }

    let query = `
      UPDATE penalty_settings 
      SET 
        daily_rate = COALESCE(?, daily_rate),
        max_penalty = COALESCE(?, max_penalty),
        grace_period_days = COALESCE(?, grace_period_days),
        is_active = COALESCE(?, is_active),
        updated_at = NOW()
    `;

    const params = [daily_rate, max_penalty, grace_period_days, is_active];

    if (id) {
      query += ' WHERE id = ?';
      params.push(id);
    } else {
      query += ' WHERE document_type = ?';
      params.push(document_type);
    }

    const result = await executeQuery(query, params);

    if ((result as any).affectedRows === 0) {
      return NextResponse.json({
        success: false,
        error: {
          code: 'PENALTY_NOT_FOUND',
          message: 'Paramètre de pénalité non trouvé'
        }
      }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: 'Paramètre de pénalité mis à jour avec succès'
    });

  } catch (error) {
    console.error('Erreur API PUT /api/admin/penalties:', error);
    
    return NextResponse.json({
      success: false,
      error: {
        code: 'PENALTY_UPDATE_ERROR',
        message: 'Erreur lors de la mise à jour du paramètre',
        details: process.env.NODE_ENV === 'development' ? error : undefined
      }
    }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const documentType = searchParams.get('document_type');

    if (!id && !documentType) {
      return NextResponse.json({
        success: false,
        error: {
          code: 'MISSING_IDENTIFIER',
          message: 'ID ou type de document requis'
        }
      }, { status: 400 });
    }

    let query = 'DELETE FROM penalty_settings WHERE ';
    let param;

    if (id) {
      query += 'id = ?';
      param = id;
    } else {
      query += 'document_type = ?';
      param = documentType;
    }

    const result = await executeQuery(query, [param]);

    if ((result as any).affectedRows === 0) {
      return NextResponse.json({
        success: false,
        error: {
          code: 'PENALTY_NOT_FOUND',
          message: 'Paramètre de pénalité non trouvé'
        }
      }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: 'Paramètre de pénalité supprimé avec succès'
    });

  } catch (error) {
    console.error('Erreur API DELETE /api/admin/penalties:', error);
    
    return NextResponse.json({
      success: false,
      error: {
        code: 'PENALTY_DELETE_ERROR',
        message: 'Erreur lors de la suppression du paramètre',
        details: process.env.NODE_ENV === 'development' ? error : undefined
      }
    }, { status: 500 });
  }
}
