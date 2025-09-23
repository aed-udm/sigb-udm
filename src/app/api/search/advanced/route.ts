/**
 * API de recherche avancée conforme aux standards SIGB
 * Compatible avec Koha, PMB, Evergreen
 */

import { NextRequest, NextResponse } from 'next/server';
import { AdvancedSearchService, SearchFilters, SearchOptions } from '@/lib/services/advanced-search-service';
import { searchSchema } from '@/lib/validations';

// GET /api/search/advanced - Recherche avancée multi-critères
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    // Extraction des paramètres de recherche
    const query = searchParams.get('query') || '';
    const type = searchParams.get('type') || 'all';
    
    // Filtres de documents
    const filters: SearchFilters = {
      query,
      author: searchParams.get('author') || undefined,
      title: searchParams.get('title') || undefined,
      status: searchParams.get('status') || undefined,
      target_audience: searchParams.get('target_audience') || undefined,
      format: searchParams.get('format') || undefined,
      language: searchParams.get('language') || undefined,
      
      // Filtres spécifiques livres
      domain: searchParams.get('domain') || undefined,
      dewey_classification: searchParams.get('dewey_classification') || undefined,
      publisher: searchParams.get('publisher') || undefined,
      isbn: searchParams.get('isbn') || undefined,
      
      // Filtres académiques
      year: searchParams.get('year') ? parseInt(searchParams.get('year')!) : undefined,
      year_min: searchParams.get('year_min') ? parseInt(searchParams.get('year_min')!) : undefined,
      year_max: searchParams.get('year_max') ? parseInt(searchParams.get('year_max')!) : undefined,
      degree: searchParams.get('degree') || undefined,
      university: searchParams.get('university') || undefined,
      faculty: searchParams.get('faculty') || undefined,
      specialty: searchParams.get('specialty') || undefined,
      supervisor: searchParams.get('supervisor') || undefined,
      director: searchParams.get('director') || undefined,
      
      // Filtres rapports de stage
      company: searchParams.get('company') || undefined,
      company_name: searchParams.get('company_name') || undefined,
      company_supervisor: searchParams.get('company_supervisor') || undefined,
      
      // Filtres utilisateurs
      user_category: searchParams.get('user_category') || undefined,
      study_level: searchParams.get('study_level') || undefined,
      department: searchParams.get('department') || undefined,
      account_status: searchParams.get('account_status') || undefined,
      
      // Filtres booléens
      has_digital_version: searchParams.get('has_digital_version') === 'true' ? true : 
                          searchParams.get('has_digital_version') === 'false' ? false : undefined,
      is_accessible: searchParams.get('is_accessible') === 'true' ? true : 
                    searchParams.get('is_accessible') === 'false' ? false : undefined,
      is_active: searchParams.get('is_active') === 'true' ? true : 
                searchParams.get('is_active') === 'false' ? false : undefined,
      
      // Filtres de localisation
      physical_location: searchParams.get('physical_location') || undefined,
      institution: searchParams.get('institution') || undefined,
      
      // Filtres de date
      created_after: searchParams.get('created_after') || undefined,
      created_before: searchParams.get('created_before') || undefined,
    };
    
    // Options de recherche
    const options: SearchOptions = {
      sort_by: searchParams.get('sort_by') || 'relevance',
      sort_order: (searchParams.get('sort_order') as 'asc' | 'desc') || 'desc',
      page: parseInt(searchParams.get('page') || '1'),
      limit: Math.min(parseInt(searchParams.get('limit') || '20'), 100),
      include_facets: searchParams.get('include_facets') === 'true',
      facets: searchParams.get('facets')?.split(',') || []
    };
    
    let results;
    
    // Recherche selon le type
    switch (type) {
      case 'books':
        results = await AdvancedSearchService.searchBooks(filters, options);
        break;
      case 'theses':
        results = await AdvancedSearchService.searchTheses(filters, options);
        break;
      case 'memoires':
        results = await AdvancedSearchService.searchMemoires(filters, options);
        break;
      case 'stage_reports':
        results = await AdvancedSearchService.searchStageReports(filters, options);
        break;
      case 'users':
        results = await AdvancedSearchService.searchUsers(filters, options);
        break;
      case 'all':
      default:
        results = await AdvancedSearchService.searchAll(filters, options);
        break;
    }
    
    // Ajouter des métadonnées de recherche
    const response = {
      ...results,
      search_metadata: {
        query,
        type,
        filters_applied: Object.keys(filters).filter(key => filters[key as keyof SearchFilters] !== undefined).length,
        search_time: results.query_time || 0,
        timestamp: new Date().toISOString()
      }
    };
    
    return NextResponse.json(response);
    
  } catch (error) {
    console.error('Erreur recherche avancée:', error);
    return NextResponse.json(
      { 
        error: 'Erreur lors de la recherche avancée',
        details: error instanceof Error ? error.message : 'Erreur inconnue'
      },
      { status: 500 }
    );
  }
}

// POST /api/search/advanced - Recherche avancée avec body JSON
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validation avec Zod
    const validatedData = searchSchema.parse(body);
    
    const { query, type = 'all', filters = {}, sort_by, sort_order, page, limit, facets, include_facets } = validatedData;
    
    // Conversion des filtres
    const searchFilters: SearchFilters = {
      query,
      ...filters
    };
    
    const searchOptions: SearchOptions = {
      sort_by: sort_by || 'relevance',
      sort_order: sort_order || 'desc',
      page: page || 1,
      limit: Math.min(limit || 20, 100),
      include_facets: include_facets || false,
      facets: facets || []
    };
    
    let results;
    
    // Recherche selon le type
    switch (type) {
      case 'books':
        results = await AdvancedSearchService.searchBooks(searchFilters, searchOptions);
        break;
      case 'theses':
        results = await AdvancedSearchService.searchTheses(searchFilters, searchOptions);
        break;
      case 'memoires':
        results = await AdvancedSearchService.searchMemoires(searchFilters, searchOptions);
        break;
      case 'stage_reports':
        results = await AdvancedSearchService.searchStageReports(searchFilters, searchOptions);
        break;
      case 'users':
        results = await AdvancedSearchService.searchUsers(searchFilters, searchOptions);
        break;
      case 'all':
      default:
        results = await AdvancedSearchService.searchAll(searchFilters, searchOptions);
        break;
    }
    
    // Ajouter des métadonnées de recherche
    const response = {
      ...results,
      search_metadata: {
        query,
        type,
        filters_applied: Object.keys(searchFilters).filter(key => searchFilters[key as keyof SearchFilters] !== undefined).length,
        search_time: results.query_time || 0,
        timestamp: new Date().toISOString(),
        request_method: 'POST'
      }
    };
    
    return NextResponse.json(response);
    
  } catch (error) {
    console.error('Erreur recherche avancée POST:', error);
    
    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json(
        { 
          error: 'Données de recherche invalides',
          details: error.message
        },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { 
        error: 'Erreur lors de la recherche avancée',
        details: error instanceof Error ? error.message : 'Erreur inconnue'
      },
      { status: 500 }
    );
  }
}

// OPTIONS /api/search/advanced - Métadonnées de l'API
export async function OPTIONS() {
  return NextResponse.json({
    methods: ['GET', 'POST'],
    description: 'API de recherche avancée conforme aux standards SIGB',
    version: '1.0.0',
    standards: ['Koha', 'PMB', 'Evergreen'],
    supported_types: ['books', 'theses', 'memoires', 'stage_reports', 'users', 'all'],
    supported_filters: {
      common: ['query', 'author', 'title', 'status', 'target_audience', 'format', 'language'],
      books: ['domain', 'dewey_classification', 'publisher', 'isbn', 'has_digital_version'],
      academic: ['year', 'year_min', 'year_max', 'degree', 'university', 'faculty', 'specialty', 'supervisor', 'director', 'is_accessible'],
      stage_reports: ['company', 'company_name', 'company_supervisor'],
      users: ['user_category', 'study_level', 'department', 'account_status', 'is_active'],
      location: ['physical_location', 'institution'],
      date: ['created_after', 'created_before']
    },
    supported_sort: ['relevance', 'title', 'author', 'date', 'popularity', 'created_at'],
    facets_available: ['status', 'target_audience', 'format', 'language', 'domain', 'year', 'user_category', 'study_level', 'department'],
    max_results_per_page: 100,
    default_page_size: 20
  });
}
