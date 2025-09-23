/**
 * API pour les mémoires - SIGB UdM
 * Endpoint: /api/academic/memoires
 */

import { NextRequest, NextResponse } from 'next/server';
import { executeQuery } from '@/lib/mysql';

// GET /api/academic/memoires - Rechercher des mémoires
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
        supervisor,
        co_supervisor,
        degree_level,
        field_of_study,
        specialty,
        academic_year,
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
      FROM memoires
      WHERE is_accessible = 1 AND status IN ('available', 'active')
    `;

    const params: any[] = [];

    if (search && search.trim() !== '') {
      query += ` AND (
        title LIKE ? OR 
        main_author LIKE ? OR 
        specialty LIKE ? OR 
        field_of_study LIKE ?
      )`;
      const searchTerm = `%${search.trim()}%`;
      params.push(searchTerm, searchTerm, searchTerm, searchTerm);
    }

    query += ` ORDER BY created_at DESC LIMIT ? OFFSET ?`;
    params.push(limit, offset);

    const memoires = await executeQuery(query, params) as any[];

    // Compter le total pour la pagination
    let countQuery = `
      SELECT COUNT(*) as total 
      FROM memoires 
      WHERE is_accessible = 1 AND status IN ('available', 'active')
    `;
    const countParams: any[] = [];

    if (search && search.trim() !== '') {
      countQuery += ` AND (
        title LIKE ? OR 
        main_author LIKE ? OR 
        specialty LIKE ? OR 
        field_of_study LIKE ?
      )`;
      const searchTerm = `%${search.trim()}%`;
      countParams.push(searchTerm, searchTerm, searchTerm, searchTerm);
    }

    const countResult = await executeQuery(countQuery, countParams) as any[];
    const total = countResult[0]?.total || 0;

    return NextResponse.json({
      success: true,
      data: memoires,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total
      }
    });

  } catch (error) {
    console.error('Erreur lors de la récupération des mémoires:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Erreur lors de la récupération des mémoires',
        details: error instanceof Error ? error.message : 'Erreur inconnue'
      },
      { status: 500 }
    );
  }
}
