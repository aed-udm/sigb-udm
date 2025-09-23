import { NextResponse } from 'next/server';
import { executeQuery } from '@/lib/mysql';

// GET /api/reference-data/degrees - Récupérer tous les diplômes/niveaux depuis la base de données
export async function GET() {
  try {

    // Récupérer les diplômes uniques depuis la vue academic_documents
    const rows = await executeQuery(`
      SELECT DISTINCT degree
      FROM academic_documents
      WHERE degree IS NOT NULL
        AND degree != ''
        AND degree != 'NULL'
      ORDER BY
        CASE
          WHEN degree LIKE '%Doctorat%' OR degree LIKE '%PhD%' THEN 1
          WHEN degree LIKE '%Master%' THEN 2
          WHEN degree LIKE '%Licence%' THEN 3
          WHEN degree LIKE '%BTS%' OR degree LIKE '%DUT%' THEN 4
          ELSE 5
        END,
        degree ASC
    `);

    const degrees = Array.isArray(rows) ? rows.map((row: any) => row.degree) : [];

    return NextResponse.json({
      success: true,
      data: degrees,
      total: degrees.length
    });

  } catch (error) {
    console.error('Error fetching degrees:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Erreur lors de la récupération des diplômes',
        details: error instanceof Error ? error.message : 'Erreur inconnue'
      },
      { status: 500 }
    );
  }
}
