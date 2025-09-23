import { NextRequest, NextResponse } from 'next/server';
import { getAcademicDocuments } from '@/lib/mysql';

// GET /api/academic-documents/available - Récupérer les documents académiques disponibles pour l'emprunt
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || undefined;
    const document_type = searchParams.get('document_type') as 'these' | 'memoire' | 'rapport_stage' | undefined;
    const university = searchParams.get('university') || undefined;
    const year = searchParams.get('year') ? parseInt(searchParams.get('year')!) : undefined;

    const documents = await getAcademicDocuments({
      search,
      document_type,
      university,
      year,
      available_only: true // Seulement les documents disponibles
    });

    return NextResponse.json({
      data: documents,
      total: documents.length
    });
  } catch (error) {
    console.error('Erreur lors de la récupération des documents académiques:', error);
    return NextResponse.json(
      { 
        error: { 
          code: 'DATABASE_ERROR', 
          message: 'Erreur lors de la récupération des documents académiques' 
        } 
      },
      { status: 500 }
    );
  }
}
