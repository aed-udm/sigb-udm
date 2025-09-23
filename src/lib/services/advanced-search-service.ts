/**
 * Service de recherche avancée conforme aux standards SIGB
 * Compatible avec Koha, PMB, Evergreen
 */

import { executeQuery } from '@/lib/mysql';
import { SearchFormData, SearchResultData, FacetData } from '@/lib/validations';

export interface SearchFilters {
  // Filtres textuels
  query?: string;
  author?: string;
  title?: string;
  
  // Filtres énumérés
  status?: string;
  target_audience?: string;
  format?: string;
  language?: string;
  
  // Filtres spécifiques
  domain?: string;
  dewey_classification?: string;
  publisher?: string;
  isbn?: string;
  
  // Filtres académiques
  year?: number;
  year_min?: number;
  year_max?: number;
  degree?: string;
  university?: string;
  faculty?: string;
  specialty?: string;
  supervisor?: string;
  director?: string;

  // Filtres spécifiques rapports de stage
  company?: string;
  company_name?: string;
  company_supervisor?: string;

  // Filtres utilisateurs
  user_category?: string;
  study_level?: string;
  department?: string;
  account_status?: string;
  
  // Filtres booléens
  has_digital_version?: boolean;
  is_accessible?: boolean;
  is_active?: boolean;
  
  // Filtres de date
  created_after?: string;
  created_before?: string;
  
  // Localisation
  physical_location?: string;
  institution?: string;
}

export interface SearchOptions {
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
  page?: number;
  limit?: number;
  include_facets?: boolean;
  facets?: string[];
}

export class AdvancedSearchService {
  
  /**
   * Recherche unifiée multi-types conforme SIGB
   */
  static async searchAll(
    filters: SearchFilters,
    options: SearchOptions = {}
  ): Promise<SearchResultData> {
    const startTime = Date.now();
    
    const {
      sort_by = 'relevance',
      sort_order = 'desc',
      page = 1,
      limit = 20,
      include_facets = false,
      facets = []
    } = options;
    
    try {
      // Recherche dans tous les types de documents
      const [booksResults, thesesResults, memoiresResults, reportsResults] = await Promise.all([
        this.searchBooks(filters, { ...options, include_facets: false }),
        this.searchTheses(filters, { ...options, include_facets: false }),
        this.searchMemoires(filters, { ...options, include_facets: false }),
        this.searchStageReports(filters, { ...options, include_facets: false })
      ]);
      
      // Combiner les résultats
      const allResults = [
        ...booksResults.data.map(item => ({ ...item, document_type: 'book' })),
        ...thesesResults.data.map(item => ({ ...item, document_type: 'thesis' })),
        ...memoiresResults.data.map(item => ({ ...item, document_type: 'memoire' })),
        ...reportsResults.data.map(item => ({ ...item, document_type: 'stage_report' }))
      ];
      
      // Tri global
      const sortedResults = this.sortResults(allResults, sort_by, sort_order);
      
      // Pagination
      const total = sortedResults.length;
      const startIndex = (page - 1) * limit;
      const paginatedResults = sortedResults.slice(startIndex, startIndex + limit);
      
      // Calcul des facettes si demandé
      let facetResults: FacetData[] = [];
      if (include_facets && facets.length > 0) {
        facetResults = await this.calculateFacets(allResults, facets);
      }
      
      const queryTime = Date.now() - startTime;
      
      return {
        data: paginatedResults,
        total,
        page,
        limit,
        total_pages: Math.ceil(total / limit),
        facets: facetResults,
        query_time: queryTime
      };
      
    } catch (error) {
      console.error('Erreur recherche unifiée:', error);
      throw new Error('Erreur lors de la recherche');
    }
  }
  
  /**
   * Recherche dans les livres avec filtres SIGB
   */
  static async searchBooks(
    filters: SearchFilters,
    options: SearchOptions = {}
  ): Promise<SearchResultData> {
    const { page = 1, limit = 20, sort_by = 'title', sort_order = 'asc' } = options;
    
    let whereConditions: string[] = [];
    let queryParams: any[] = [];
    
    // Construction des conditions WHERE
    if (filters.query) {
      whereConditions.push('(title LIKE ? OR main_author LIKE ? OR publisher LIKE ? OR summary LIKE ?)');
      const searchTerm = `%${filters.query}%`;
      queryParams.push(searchTerm, searchTerm, searchTerm, searchTerm);
    }
    
    if (filters.author) {
      whereConditions.push('main_author LIKE ?');
      queryParams.push(`%${filters.author}%`);
    }
    
    if (filters.title) {
      whereConditions.push('title LIKE ?');
      queryParams.push(`%${filters.title}%`);
    }
    
    if (filters.status) {
      whereConditions.push('status = ?');
      queryParams.push(filters.status);
    }
    
    if (filters.target_audience) {
      whereConditions.push('target_audience = ?');
      queryParams.push(filters.target_audience);
    }
    
    if (filters.format) {
      whereConditions.push('format = ?');
      queryParams.push(filters.format);
    }
    
    if (filters.language) {
      whereConditions.push('language = ?');
      queryParams.push(filters.language);
    }
    
    if (filters.domain) {
      whereConditions.push('domain LIKE ?');
      queryParams.push(`%${filters.domain}%`);
    }
    
    if (filters.dewey_classification) {
      whereConditions.push('dewey_classification LIKE ?');
      queryParams.push(`${filters.dewey_classification}%`);
    }
    
    if (filters.publisher) {
      whereConditions.push('publisher LIKE ?');
      queryParams.push(`%${filters.publisher}%`);
    }
    
    if (filters.isbn) {
      whereConditions.push('isbn = ?');
      queryParams.push(filters.isbn);
    }
    
    if (filters.has_digital_version !== undefined) {
      whereConditions.push('has_digital_version = ?');
      queryParams.push(filters.has_digital_version);
    }
    
    if (filters.physical_location) {
      whereConditions.push('physical_location LIKE ?');
      queryParams.push(`%${filters.physical_location}%`);
    }
    
    if (filters.created_after) {
      whereConditions.push('created_at >= ?');
      queryParams.push(filters.created_after);
    }
    
    if (filters.created_before) {
      whereConditions.push('created_at <= ?');
      queryParams.push(filters.created_before);
    }
    
    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';
    
    // Construction de l'ORDER BY
    let orderBy = 'ORDER BY ';
    switch (sort_by) {
      case 'title':
        orderBy += 'title';
        break;
      case 'author':
        orderBy += 'main_author';
        break;
      case 'date':
        orderBy += 'publication_year';
        break;
      case 'popularity':
        orderBy += 'view_count';
        break;
      case 'created_at':
        orderBy += 'created_at';
        break;
      default:
        orderBy += 'title';
    }
    orderBy += ` ${sort_order.toUpperCase()}`;
    
    // Requête principale
    const query = `
      SELECT 
        id, title, main_author, publisher, publication_year, isbn,
        domain, dewey_classification, summary, status, target_audience,
        format, language, physical_location, view_count, has_digital_version,
        created_at, updated_at
      FROM books
      ${whereClause}
      ${orderBy}
      LIMIT ? OFFSET ?
    `;
    
    const offset = (page - 1) * limit;
    const rows = await executeQuery(query, [...queryParams, limit, offset]);
    
    // Requête pour le total
    const countQuery = `SELECT COUNT(*) as total FROM books ${whereClause}`;
    const countRows = await executeQuery(countQuery, queryParams);
    const total = (countRows as any)[0].total;
    
    return {
      data: rows as any[],
      total,
      page,
      limit,
      total_pages: Math.ceil(total / limit)
    };
  }
  
  /**
   * Recherche dans les thèses avec filtres SIGB
   */
  static async searchTheses(
    filters: SearchFilters,
    options: SearchOptions = {}
  ): Promise<SearchResultData> {
    const { page = 1, limit = 20, sort_by = 'title', sort_order = 'asc' } = options;
    
    let whereConditions: string[] = [];
    let queryParams: any[] = [];
    
    // Construction des conditions WHERE
    if (filters.query) {
      whereConditions.push('(title LIKE ? OR main_author LIKE ? OR director LIKE ? OR abstract LIKE ?)');
      const searchTerm = `%${filters.query}%`;
      queryParams.push(searchTerm, searchTerm, searchTerm, searchTerm);
    }
    
    if (filters.author) {
      whereConditions.push('main_author LIKE ?');
      queryParams.push(`%${filters.author}%`);
    }
    
    if (filters.director) {
      whereConditions.push('director LIKE ?');
      queryParams.push(`%${filters.director}%`);
    }
    
    if (filters.status) {
      whereConditions.push('status = ?');
      queryParams.push(filters.status);
    }
    
    if (filters.target_audience) {
      whereConditions.push('target_audience = ?');
      queryParams.push(filters.target_audience);
    }
    
    if (filters.format) {
      whereConditions.push('format = ?');
      queryParams.push(filters.format);
    }
    
    if (filters.language) {
      whereConditions.push('language = ?');
      queryParams.push(filters.language);
    }
    
    if (filters.degree) {
      whereConditions.push('target_degree LIKE ?');
      queryParams.push(`%${filters.degree}%`);
    }
    
    if (filters.university) {
      whereConditions.push('university LIKE ?');
      queryParams.push(`%${filters.university}%`);
    }
    
    if (filters.year) {
      whereConditions.push('defense_year = ?');
      queryParams.push(filters.year);
    }
    
    if (filters.year_min) {
      whereConditions.push('defense_year >= ?');
      queryParams.push(filters.year_min);
    }
    
    if (filters.year_max) {
      whereConditions.push('defense_year <= ?');
      queryParams.push(filters.year_max);
    }
    
    if (filters.is_accessible !== undefined) {
      whereConditions.push('is_accessible = ?');
      queryParams.push(filters.is_accessible);
    }
    
    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';
    
    // Construction de l'ORDER BY
    let orderBy = 'ORDER BY ';
    switch (sort_by) {
      case 'title':
        orderBy += 'title';
        break;
      case 'author':
        orderBy += 'main_author';
        break;
      case 'date':
        orderBy += 'defense_year';
        break;
      case 'popularity':
        orderBy += 'view_count';
        break;
      case 'created_at':
        orderBy += 'created_at';
        break;
      default:
        orderBy += 'defense_year DESC, title';
    }
    orderBy += ` ${sort_order.toUpperCase()}`;
    
    // Requête principale
    const query = `
      SELECT 
        id, title, main_author, director, target_degree, university,
        defense_year, abstract, keywords, status, target_audience,
        format, language, physical_location, view_count, is_accessible,
        created_at, updated_at
      FROM theses
      ${whereClause}
      ${orderBy}
      LIMIT ? OFFSET ?
    `;
    
    const offset = (page - 1) * limit;
    const rows = await executeQuery(query, [...queryParams, limit, offset]);
    
    // Requête pour le total
    const countQuery = `SELECT COUNT(*) as total FROM theses ${whereClause}`;
    const countRows = await executeQuery(countQuery, queryParams);
    const total = (countRows as any)[0].total;
    
    return {
      data: rows as any[],
      total,
      page,
      limit,
      total_pages: Math.ceil(total / limit)
    };
  }

  /**
   * Recherche dans les mémoires avec filtres SIGB
   */
  static async searchMemoires(
    filters: SearchFilters,
    options: SearchOptions = {}
  ): Promise<SearchResultData> {
    const { page = 1, limit = 20, sort_by = 'title', sort_order = 'asc' } = options;

    let whereConditions: string[] = [];
    let queryParams: any[] = [];

    // Construction similaire aux thèses
    if (filters.query) {
      whereConditions.push('(title LIKE ? OR main_author LIKE ? OR supervisor LIKE ? OR summary LIKE ?)');
      const searchTerm = `%${filters.query}%`;
      queryParams.push(searchTerm, searchTerm, searchTerm, searchTerm);
    }

    if (filters.author) {
      whereConditions.push('main_author LIKE ?');
      queryParams.push(`%${filters.author}%`);
    }

    if (filters.supervisor) {
      whereConditions.push('supervisor LIKE ?');
      queryParams.push(`%${filters.supervisor}%`);
    }

    if (filters.status) {
      whereConditions.push('status = ?');
      queryParams.push(filters.status);
    }

    if (filters.target_audience) {
      whereConditions.push('target_audience = ?');
      queryParams.push(filters.target_audience);
    }

    if (filters.format) {
      whereConditions.push('format = ?');
      queryParams.push(filters.format);
    }

    if (filters.language) {
      whereConditions.push('language = ?');
      queryParams.push(filters.language);
    }

    if (filters.university) {
      whereConditions.push('university LIKE ?');
      queryParams.push(`%${filters.university}%`);
    }

    if (filters.faculty) {
      whereConditions.push('faculty LIKE ?');
      queryParams.push(`%${filters.faculty}%`);
    }

    if (filters.year) {
      whereConditions.push('academic_year LIKE ?');
      queryParams.push(`%${filters.year}%`);
    }

    if (filters.is_accessible !== undefined) {
      whereConditions.push('is_accessible = ?');
      queryParams.push(filters.is_accessible);
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    let orderBy = 'ORDER BY ';
    switch (sort_by) {
      case 'title':
        orderBy += 'title';
        break;
      case 'author':
        orderBy += 'main_author';
        break;
      case 'date':
        orderBy += 'academic_year';
        break;
      case 'popularity':
        orderBy += 'view_count';
        break;
      case 'created_at':
        orderBy += 'created_at';
        break;
      default:
        orderBy += 'academic_year DESC, title';
    }
    orderBy += ` ${sort_order.toUpperCase()}`;

    const query = `
      SELECT
        id, title, main_author, supervisor, university, faculty,
        academic_year, summary, keywords, status, target_audience,
        format, language, physical_location, view_count, is_accessible,
        created_at, updated_at
      FROM memoires
      ${whereClause}
      ${orderBy}
      LIMIT ? OFFSET ?
    `;

    const offset = (page - 1) * limit;
    const rows = await executeQuery(query, [...queryParams, limit, offset]);

    const countQuery = `SELECT COUNT(*) as total FROM memoires ${whereClause}`;
    const countRows = await executeQuery(countQuery, queryParams);
    const total = (countRows as any)[0].total;

    return {
      data: rows as any[],
      total,
      page,
      limit,
      total_pages: Math.ceil(total / limit)
    };
  }

  /**
   * Recherche dans les rapports de stage avec filtres SIGB
   */
  static async searchStageReports(
    filters: SearchFilters,
    options: SearchOptions = {}
  ): Promise<SearchResultData> {
    const { page = 1, limit = 20, sort_by = 'title', sort_order = 'asc' } = options;

    let whereConditions: string[] = [];
    let queryParams: any[] = [];

    if (filters.query) {
      whereConditions.push('(title LIKE ? OR student_name LIKE ? OR supervisor LIKE ? OR company_supervisor LIKE ? OR summary LIKE ?)');
      const searchTerm = `%${filters.query}%`;
      queryParams.push(searchTerm, searchTerm, searchTerm, searchTerm, searchTerm);
    }

    if (filters.author) {
      whereConditions.push('student_name LIKE ?');
      queryParams.push(`%${filters.author}%`);
    }

    if (filters.supervisor) {
      whereConditions.push('(supervisor LIKE ? OR company_supervisor LIKE ?)');
      queryParams.push(`%${filters.supervisor}%`, `%${filters.supervisor}%`);
    }

    if (filters.company) {
      whereConditions.push('company_name LIKE ?');
      queryParams.push(`%${filters.company}%`);
    }

    if (filters.status) {
      whereConditions.push('status = ?');
      queryParams.push(filters.status);
    }

    if (filters.target_audience) {
      whereConditions.push('target_audience = ?');
      queryParams.push(filters.target_audience);
    }

    if (filters.format) {
      whereConditions.push('format = ?');
      queryParams.push(filters.format);
    }

    if (filters.language) {
      whereConditions.push('language = ?');
      queryParams.push(filters.language);
    }

    if (filters.faculty) {
      whereConditions.push('faculty LIKE ?');
      queryParams.push(`%${filters.faculty}%`);
    }

    if (filters.year) {
      whereConditions.push('academic_year LIKE ?');
      queryParams.push(`%${filters.year}%`);
    }

    if (filters.is_accessible !== undefined) {
      whereConditions.push('is_accessible = ?');
      queryParams.push(filters.is_accessible);
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    let orderBy = 'ORDER BY ';
    switch (sort_by) {
      case 'title':
        orderBy += 'title';
        break;
      case 'author':
        orderBy += 'student_name';
        break;
      case 'date':
        orderBy += 'academic_year';
        break;
      case 'popularity':
        orderBy += 'view_count';
        break;
      case 'created_at':
        orderBy += 'created_at';
        break;
      default:
        orderBy += 'academic_year DESC, title';
    }
    orderBy += ` ${sort_order.toUpperCase()}`;

    const query = `
      SELECT
        id, title, student_name as main_author, supervisor, company_supervisor,
        company_name, faculty, academic_year, summary, keywords, status,
        target_audience, format, language, physical_location, view_count,
        is_accessible, created_at, updated_at
      FROM stage_reports
      ${whereClause}
      ${orderBy}
      LIMIT ? OFFSET ?
    `;

    const offset = (page - 1) * limit;
    const rows = await executeQuery(query, [...queryParams, limit, offset]);

    const countQuery = `SELECT COUNT(*) as total FROM stage_reports ${whereClause}`;
    const countRows = await executeQuery(countQuery, queryParams);
    const total = (countRows as any)[0].total;

    return {
      data: rows as any[],
      total,
      page,
      limit,
      total_pages: Math.ceil(total / limit)
    };
  }

  /**
   * Recherche dans les utilisateurs avec filtres SIGB
   */
  static async searchUsers(
    filters: SearchFilters,
    options: SearchOptions = {}
  ): Promise<SearchResultData> {
    const { page = 1, limit = 20, sort_by = 'full_name', sort_order = 'asc' } = options;

    let whereConditions: string[] = [];
    let queryParams: any[] = [];

    if (filters.query) {
      whereConditions.push('(full_name LIKE ? OR email LIKE ? OR matricule LIKE ?)');
      const searchTerm = `%${filters.query}%`;
      queryParams.push(searchTerm, searchTerm, searchTerm);
    }

    if (filters.user_category) {
      whereConditions.push('user_category = ?');
      queryParams.push(filters.user_category);
    }

    if (filters.study_level) {
      whereConditions.push('study_level = ?');
      queryParams.push(filters.study_level);
    }

    if (filters.department) {
      whereConditions.push('department LIKE ?');
      queryParams.push(`%${filters.department}%`);
    }


    if (filters.account_status) {
      whereConditions.push('account_status = ?');
      queryParams.push(filters.account_status);
    }

    if (filters.is_active !== undefined) {
      whereConditions.push('is_active = ?');
      queryParams.push(filters.is_active);
    }

    if (filters.institution) {
      whereConditions.push('institution LIKE ?');
      queryParams.push(`%${filters.institution}%`);
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    let orderBy = 'ORDER BY ';
    switch (sort_by) {
      case 'full_name':
        orderBy += 'full_name';
        break;
      case 'email':
        orderBy += 'email';
        break;
      case 'created_at':
        orderBy += 'created_at';
        break;
      default:
        orderBy += 'full_name';
    }
    orderBy += ` ${sort_order.toUpperCase()}`;

    const query = `
      SELECT
        id, full_name, email, matricule, phone, address,
        user_category, study_level, department, faculty,
        account_status, institution,
        is_active, max_loans, max_reservations,
        created_at, updated_at
      FROM users
      ${whereClause}
      ${orderBy}
      LIMIT ? OFFSET ?
    `;

    const offset = (page - 1) * limit;
    const rows = await executeQuery(query, [...queryParams, limit, offset]);

    const countQuery = `SELECT COUNT(*) as total FROM users ${whereClause}`;
    const countRows = await executeQuery(countQuery, queryParams);
    const total = (countRows as any)[0].total;

    return {
      data: rows as any[],
      total,
      page,
      limit,
      total_pages: Math.ceil(total / limit)
    };
  }

  /**
   * Calcul des facettes pour la recherche facettée
   */
  static async calculateFacets(results: any[], facetFields: string[]): Promise<FacetData[]> {
    const facets: FacetData[] = [];

    for (const field of facetFields) {
      const facetCounts: { [key: string]: number } = {};

      // Compter les occurrences
      results.forEach(item => {
        const value = item[field];
        if (value !== null && value !== undefined && value !== '') {
          facetCounts[value] = (facetCounts[value] || 0) + 1;
        }
      });

      // Convertir en format facette
      const facetValues = Object.entries(facetCounts)
        .map(([value, count]) => ({
          value,
          count,
          label: this.getFacetLabel(field, value)
        }))
        .sort((a, b) => b.count - a.count);

      if (facetValues.length > 0) {
        facets.push({
          field,
          values: facetValues
        });
      }
    }

    return facets;
  }

  /**
   * Obtenir le label d'une valeur de facette
   */
  static getFacetLabel(field: string, value: string): string {
    const labels: { [key: string]: { [key: string]: string } } = {
      status: {
        'available': 'Disponible',
        'borrowed': 'Prêté',
        'reserved': 'Réservé',
        'lost': 'Perdu',
        'damaged': 'Endommagé',
        'withdrawn': 'Retiré',
        'not_for_loan': 'Pas de prêt',
        'in_transit': 'En transfert',
        'in_processing': 'En traitement',
        'missing': 'Manquant'
      },
      target_audience: {
        'general': 'Général',
        'beginner': 'Débutant',
        'intermediate': 'Intermédiaire',
        'advanced': 'Avancé',
        'children': 'Enfants',
        'young_adult': 'Jeunes adultes',
        'adult': 'Adultes',
        'professional': 'Professionnels',
        'academic': 'Académique',
        'researcher': 'Chercheurs',
        'undergraduate': 'Licence',
        'graduate': 'Master',
        'postgraduate': 'Doctorat'
      },
      format: {
        'print': 'Imprimé',
        'digital': 'Numérique',
        'ebook': 'Livre électronique',
        'audiobook': 'Livre audio',
        'hardcover': 'Relié',
        'paperback': 'Broché',
        'pocket': 'Poche',
        'large_print': 'Gros caractères',
        'braille': 'Braille',
        'multimedia': 'Multimédia',
        'pdf': 'PDF',
        'bound': 'Relié',
        'electronic': 'Électronique'
      },
      user_category: {
        'student': 'Étudiant',
        'teacher': 'Enseignant',
        'researcher': 'Chercheur',
        'staff': 'Personnel',
        'external': 'Externe',
        'guest': 'Invité',
        'alumni': 'Ancien étudiant',
        'visitor': 'Visiteur'
      }
    };

    return labels[field]?.[value] || value;
  }

  /**
   * Tri des résultats
   */
  static sortResults(results: any[], sortBy: string, sortOrder: string): any[] {
    return results.sort((a, b) => {
      let aValue = a[sortBy];
      let bValue = b[sortBy];

      // Gestion des valeurs nulles
      if (aValue === null || aValue === undefined) aValue = '';
      if (bValue === null || bValue === undefined) bValue = '';

      // Tri numérique pour certains champs
      if (['view_count', 'publication_year', 'defense_year'].includes(sortBy)) {
        aValue = Number(aValue) || 0;
        bValue = Number(bValue) || 0;
      }

      let comparison = 0;
      if (aValue > bValue) {
        comparison = 1;
      } else if (aValue < bValue) {
        comparison = -1;
      }

      return sortOrder === 'desc' ? -comparison : comparison;
    });
  }
}
