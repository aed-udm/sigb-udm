/**
 * API pour les rapports de stage - SIGB UdM
 * Endpoint: /api/academic/reports
 */

import { NextRequest, NextResponse } from 'next/server';
import { executeQuery } from '@/lib/mysql';

// GET /api/academic/reports - Rechercher des rapports de stage
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
        student_name as author,
        student_id,
        supervisor,
        company_supervisor,
        degree_level,
        field_of_study,
        specialty,
        academic_year,
        defense_date,
        university,
        faculty,
        department,
        company_name,
        company_address,
        company_sector,
        stage_duration,
        available_copies,
        total_copies,
        status,
        is_accessible,
        created_at,
        updated_at
      FROM stage_reports
      WHERE is_accessible = 1 AND status IN ('available', 'active')
    `;

    const params: any[] = [];

    if (search && search.trim() !== '') {
      query += ` AND (
        title LIKE ? OR 
        student_name LIKE ? OR 
        specialty LIKE ? OR 
        field_of_study LIKE ? OR
        company_name LIKE ?
      )`;
      const searchTerm = `%${search.trim()}%`;
      params.push(searchTerm, searchTerm, searchTerm, searchTerm, searchTerm);
    }

    query += ` ORDER BY created_at DESC LIMIT ? OFFSET ?`;
    params.push(limit, offset);

    const reports = await executeQuery(query, params) as any[];

    // Compter le total pour la pagination
    let countQuery = `
      SELECT COUNT(*) as total 
      FROM stage_reports 
      WHERE is_accessible = 1 AND status IN ('available', 'active')
    `;
    const countParams: any[] = [];

    if (search && search.trim() !== '') {
      countQuery += ` AND (
        title LIKE ? OR 
        student_name LIKE ? OR 
        specialty LIKE ? OR 
        field_of_study LIKE ? OR
        company_name LIKE ?
      )`;
      const searchTerm = `%${search.trim()}%`;
      countParams.push(searchTerm, searchTerm, searchTerm, searchTerm, searchTerm);
    }

    const countResult = await executeQuery(countQuery, countParams) as any[];
    const total = countResult[0]?.total || 0;

    return NextResponse.json({
      success: true,
      data: reports,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total
      }
    });

  } catch (error) {
    console.error('Erreur lors de la récupération des rapports de stage:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Erreur lors de la récupération des rapports de stage',
        details: error instanceof Error ? error.message : 'Erreur inconnue'
      },
      { status: 500 }
    );
  }
}
