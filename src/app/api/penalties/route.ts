/**
 * API pour les pénalités - SIGB UdM
 * Endpoint: /api/penalties
 */

import { NextRequest, NextResponse } from 'next/server';
import { executeQuery } from '@/lib/mysql';

// GET /api/penalties - Récupérer la liste des pénalités
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '10');
    const offset = parseInt(searchParams.get('offset') || '0');
    const status = searchParams.get('status') || '';

    let query = `
      SELECT 
        p.id,
        p.user_id,
        p.loan_id,
        p.amount,
        p.reason,
        p.status,
        p.created_at,
        p.paid_at,
        u.full_name as user_name,
        u.email as user_email,
        l.document_title,
        l.due_date
      FROM penalties p
      LEFT JOIN users u ON p.user_id = u.id
      LEFT JOIN loans l ON p.loan_id = l.id
      WHERE 1=1
    `;

    const params: any[] = [];

    if (status) {
      query += ` AND p.status = ?`;
      params.push(status);
    }

    query += ` ORDER BY p.created_at DESC LIMIT ? OFFSET ?`;
    params.push(limit, offset);

    const penalties = await executeQuery(query, params) as any[];

    // Compter le total
    let countQuery = `
      SELECT COUNT(*) as total 
      FROM penalties p
      WHERE 1=1
    `;
    const countParams: any[] = [];

    if (status) {
      countQuery += ` AND p.status = ?`;
      countParams.push(status);
    }

    const countResult = await executeQuery(countQuery, countParams) as any[];
    const total = countResult[0]?.total || 0;

    return NextResponse.json({
      success: true,
      data: penalties,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total
      }
    });

  } catch (error) {
    console.error('Erreur lors de la récupération des pénalités:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Erreur lors de la récupération des pénalités',
        details: error instanceof Error ? error.message : 'Erreur inconnue'
      },
      { status: 500 }
    );
  }
}

// POST /api/penalties - Créer une nouvelle pénalité
export async function POST(request: NextRequest) {
  try {
    const { user_id, loan_id, amount, reason } = await request.json();

    if (!user_id || !amount || !reason) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Paramètres requis: user_id, amount, reason'
        },
        { status: 400 }
      );
    }

    const query = `
      INSERT INTO penalties (user_id, loan_id, amount, reason, status, created_at)
      VALUES (?, ?, ?, ?, 'unpaid', NOW())
    `;

    const result = await executeQuery(query, [user_id, loan_id, amount, reason]) as any;

    return NextResponse.json({
      success: true,
      data: {
        id: result.insertId,
        user_id,
        loan_id,
        amount,
        reason,
        status: 'unpaid',
        created_at: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Erreur lors de la création de la pénalité:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Erreur lors de la création de la pénalité',
        details: error instanceof Error ? error.message : 'Erreur inconnue'
      },
      { status: 500 }
    );
  }
}
