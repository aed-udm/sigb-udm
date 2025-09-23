import { NextResponse } from 'next/server';
import { executeQuery } from '@/lib/mysql';
import { OptimizedCatalogService } from '@/lib/services/optimized-catalog-service';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);

  // 🔒 SÉCURITÉ CRITIQUE : Vérifier qu'aucun document académique privé n'est demandé
  const requestedType = searchParams.get('type');
  const FORBIDDEN_TYPES = ['academic', 'academic-documents', 'academic_documents', 'student-documents'];

  if (FORBIDDEN_TYPES.includes(requestedType || '')) {
    return NextResponse.json({
      success: false,
      error: {
        code: 'FORBIDDEN_DOCUMENT_TYPE',
        message: 'Les documents académiques privés ne sont pas accessibles via le catalogue public'
      }
    }, { status: 403 });
  }

  // Extraire tous les paramètres de filtre (SEULEMENT pour documents publics)
  const filters = {
    type: (searchParams.get('type') || 'all') as any,
    search: searchParams.get('search') || '',
    domain: searchParams.get('domain') || 'all',
    year: searchParams.get('year') || 'all',
    availability: (searchParams.get('availability') || 'all') as 'all' | 'available' | 'unavailable' | 'borrowed' | 'reserved',
    language: searchParams.get('language') || 'all',
    format: searchParams.get('format') || 'all',
    level: searchParams.get('level') || 'all',
    publisher: searchParams.get('publisher') || 'all',
    classification: searchParams.get('classification') || 'all',
    page: parseInt(searchParams.get('page') || '1'),
    limit: parseInt(searchParams.get('limit') || '24')
  };

  try {
    // Utiliser le service optimisé
    const result = await OptimizedCatalogService.searchCatalog(filters);

    return NextResponse.json({
      success: true,
      data: result.data,
      total: result.total,
      page: result.page,
      limit: result.limit,
      totalPages: result.totalPages,
      type: filters.type,
      cached: result.cached,
      executionTime: result.executionTime,
      performance: {
        cached: result.cached,
        executionTimeMs: result.executionTime,
        itemsPerPage: result.limit,
        message: result.cached ? 'Résultat mis en cache' : 'Requête exécutée'
      }
    });

  } catch (error) {
    console.error('Erreur lors de la récupération du catalogue:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Erreur lors de la récupération du catalogue',
        details: error instanceof Error ? error.message : 'Erreur inconnue'
      },
      { status: 500 }
    );
  }
}
