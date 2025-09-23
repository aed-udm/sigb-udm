/**
 * API pour les thèses - SIGB UdM
 * Endpoint: /api/academic/theses
 */

import { NextRequest, NextResponse } from 'next/server';
import { executeQuery } from '@/lib/mysql';

// GET /api/academic/theses - Rechercher des thèses
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const limit = parseInt(searchParams.get('limit') || '10');
    const offset = parseInt(searchParams.get('offset') || '0');

    let query = `
      SELECT 
        id,
        title,
        main_author as author,
        student_id,
        director as supervisor,
        co_director as co_supervisor,
        target_degree as degree,
        specialty,
        defense_year,
        defense_date,
        university,
        faculty,
        department,
        available_copies,
        total_copies,
        status,
        is_accessible,
        created_at,
        updated_at
      FROM theses
      WHERE is_accessible = 1 AND status IN ('available', 'active')
    `;

    const params: any[] = [];

    if (search && search.trim() !== '') {
      query += ` AND (
        title LIKE ? OR 
        main_author LIKE ? OR 
        specialty LIKE ? OR 
        target_degree LIKE ?
      )`;
      const searchTerm = `%${search.trim()}%`;
      params.push(searchTerm, searchTerm, searchTerm, searchTerm);
    }

    query += ` ORDER BY created_at DESC LIMIT ? OFFSET ?`;
    params.push(limit, offset);

    const theses = await executeQuery(query, params) as any[];

    // Compter le total pour la pagination
    let countQuery = `
      SELECT COUNT(*) as total 
      FROM theses 
      WHERE is_accessible = 1 AND status IN ('available', 'active')
    `;
    const countParams: any[] = [];

    if (search && search.trim() !== '') {
      countQuery += ` AND (
        title LIKE ? OR 
        main_author LIKE ? OR 
        specialty LIKE ? OR 
        target_degree LIKE ?
      )`;
      const searchTerm = `%${search.trim()}%`;
      countParams.push(searchTerm, searchTerm, searchTerm, searchTerm);
    }

    const countResult = await executeQuery(countQuery, countParams) as any[];
    const total = countResult[0]?.total || 0;

    return NextResponse.json({
      success: true,
      data: theses,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total
      }
    });

  } catch (error) {
    console.error('Erreur lors de la récupération des thèses:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Erreur lors de la récupération des thèses',
        details: error instanceof Error ? error.message : 'Erreur inconnue'
      },
      { status: 500 }
    );
  }
}
