import { NextRequest, NextResponse } from 'next/server';
import { executeQuery } from '@/lib/mysql';

// API unifiée pour toutes les données de référence
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');

    if (!type) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Type de données requis',
          availableTypes: ['faculties', 'specialties', 'universities', 'degrees']
        },
        { status: 400 }
      );
    }

    let query = '';
    let fieldName = '';

    switch (type) {
      case 'faculties':
        fieldName = 'faculty';
        query = `
          SELECT DISTINCT faculty as value
          FROM academic_documents
          WHERE faculty IS NOT NULL
            AND faculty != ''
            AND faculty != 'NULL'
            AND faculty != 'Faculté par défaut'
          ORDER BY faculty ASC
        `;
        break;

      case 'specialties':
        fieldName = 'specialty';
        query = `
          SELECT DISTINCT specialty as value
          FROM academic_documents
          WHERE specialty IS NOT NULL
            AND specialty != ''
            AND specialty != 'NULL'
          ORDER BY specialty ASC
        `;
        break;

      case 'universities':
        fieldName = 'university';
        query = `
          SELECT DISTINCT university as value
          FROM academic_documents
          WHERE university IS NOT NULL
            AND university != ''
            AND university != 'NULL'
            AND university != 'Université par défaut'
          ORDER BY university ASC
        `;
        break;

      case 'degrees':
        fieldName = 'target_degree';
        query = `
          SELECT DISTINCT target_degree as value
          FROM academic_documents
          WHERE target_degree IS NOT NULL
            AND target_degree != ''
            AND target_degree != 'NULL'
          ORDER BY target_degree ASC
        `;
        break;

      default:
        return NextResponse.json(
          { 
            success: false,
            error: `Type '${type}' non supporté`,
            availableTypes: ['faculties', 'specialties', 'universities', 'degrees']
          },
          { status: 400 }
        );
    }

    const rows = await executeQuery(query);
    const data = Array.isArray(rows) ? rows.map((row: any) => row.value) : [];

    return NextResponse.json({
      success: true,
      type,
      data,
      total: data.length
    });

  } catch (error) {
    console.error(`Error fetching reference data:`, error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Erreur lors de la récupération des données de référence',
        details: error instanceof Error ? error.message : 'Erreur inconnue'
      },
      { status: 500 }
    );
  }
}
