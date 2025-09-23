/**
 * API pour les rapports de stage - SIGB UdM
 * Endpoint: /api/academic/stage-reports (alias pour /api/academic/reports)
 */

import { NextRequest, NextResponse } from 'next/server';
import { executeQuery } from '@/lib/mysql';

// GET /api/academic/stage-reports - Rechercher des rapports de stage
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
        updated_at,
        'rapport_stage' as document_type
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

    // Ajouter les propriétés pour le système de statut unifié
    const processedReports = reports.map(report => ({
      ...report,
      availability_status: (report.available_copies > 0) ? 'disponible' : 'indisponible',
      is_borrowed: false, // À implémenter selon la logique métier
      is_reserved: false, // À implémenter selon la logique métier
      defense_year: report.defense_date ? new Date(report.defense_date).getFullYear() : null
    }));

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
      data: processedReports,
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

// POST /api/academic/stage-reports - Créer un nouveau rapport de stage
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    const {
      title,
      student_name,
      student_id,
      supervisor,
      company_name,
      stage_type,
      degree_level,
      field_of_study,
      specialty,
      academic_year,
      defense_date,
      university,
      faculty,
      department
    } = body;

    // Validation des champs requis
    if (!title || !student_name || !supervisor) {
      return NextResponse.json(
        { error: 'Champs requis manquants: title, student_name, supervisor' },
        { status: 400 }
      );
    }

    // Générer un ID unique
    const { v4: uuidv4 } = require('uuid');
    const id = uuidv4();

    const insertQuery = `
      INSERT INTO stage_reports (
        id, title, student_name, student_id, supervisor, company_name, stage_type,
        degree_level, field_of_study, specialty, academic_year, defense_date,
        university, faculty, department, status, is_accessible, available_copies, total_copies,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'available', 1, 1, 1, NOW(), NOW())
    `;

    const params = [
      id, title, student_name, student_id, supervisor, company_name, stage_type,
      degree_level, field_of_study, specialty, academic_year, defense_date,
      university, faculty, department
    ];

    await executeQuery(insertQuery, params);

    return NextResponse.json({
      success: true,
      message: 'Rapport de stage créé avec succès',
      data: { id }
    });

  } catch (error) {
    console.error('Erreur lors de la création du rapport de stage:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Erreur lors de la création du rapport de stage',
        details: error instanceof Error ? error.message : 'Erreur inconnue'
      },
      { status: 500 }
    );
  }
}
