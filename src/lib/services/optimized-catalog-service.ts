/**
 * Service de catalogue optimisé pour 90 000+ documents
 * Utilise cache, pagination intelligente et requêtes optimisées
 */

import { executeQuery } from '@/lib/mysql';
import crypto from 'crypto';

export interface CatalogFilters {
  type?: 'all' | 'books' | 'theses' | 'memoires' | 'reports';
  search?: string;
  domain?: string;
  year?: string;
  availability?: 'all' | 'available' | 'unavailable' | 'borrowed' | 'reserved';
  language?: string;
  format?: string;
  level?: string;
  publisher?: string;
  classification?: string;
  page?: number;
  limit?: number;
}

export interface CatalogItem {
  // Identification commune
  id: string;
  type: 'book' | 'these' | 'memoire' | 'rapport_stage';

  // 📚 LIVRES - Informations essentielles
  title: string;
  subtitle?: string;
  main_author?: string;
  secondary_author?: string;
  publisher?: string;
  publication_year?: number;
  publication_city?: string;
  edition?: string;
  domain?: string;
  summary?: string;
  abstract?: string;
  status: string;

  // 🎓 THÈSES - Informations essentielles
  director?: string;
  co_director?: string;
  target_degree?: string;
  specialty?: string;
  university?: string;
  faculty?: string;
  defense_year?: number;

  // 📝 MÉMOIRES - Informations essentielles
  supervisor?: string;
  co_supervisor?: string;
  degree_level?: string;
  field_of_study?: string;
  defense_date?: string;

  // 📋 RAPPORTS DE STAGE - Informations essentielles
  student_name?: string;
  company_supervisor?: string;
  company_name?: string;
  stage_duration?: number;

  // Métadonnées système
  created_at: string;

  // Compatibilité ancienne interface
  author?: string; // Mapping intelligent selon le type
  degree_type?: string; // Mapping vers target_degree/degree_level
  pages?: string; // Toujours "N/A" maintenant
}

export interface CatalogResult {
  data: CatalogItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  cached: boolean;
  executionTime: number;
}

export class OptimizedCatalogService {
  private static readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
  private static readonly MAX_LIMIT = 100;
  private static readonly DEFAULT_LIMIT = 24;

  // 🔒 SÉCURITÉ : Tables autorisées dans le catalogue public
  private static readonly PUBLIC_TABLES = ['books', 'theses', 'memoires', 'stage_reports'];
  // ❌ INTERDIT : academic_documents_unified (documents privés des étudiants)

  /**
   * 🎯 Traitement simplifié des données essentielles
   */
  private static async processDocumentData(items: any[]): Promise<CatalogItem[]> {
    const processedItems = await Promise.all(items.map(async item => {
      // Formatage des dates pour affichage
      if (item.defense_date) {
        item.defense_date_formatted = new Date(item.defense_date).toLocaleDateString('fr-FR');
      }

      // Calcul automatique de la durée de stage si manquante (pour les rapports)
      if (item.type === 'rapport_stage' && item.stage_start_date && item.stage_end_date && !item.stage_duration) {
        const start = new Date(item.stage_start_date);
        const end = new Date(item.stage_end_date);
        item.stage_duration = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
      }

      // 🎯 CALCUL DES BADGES EMPRUNTÉ/RÉSERVÉ
      await this.calculateDocumentStatus(item);

      return item as CatalogItem;
    }));

    return processedItems;
  }

  /**
   * 🎯 Calcule le statut d'emprunt et de réservation d'un document
   */
  private static async calculateDocumentStatus(item: any): Promise<void> {
    try {
      // Initialiser les valeurs par défaut
      item.is_borrowed = false;
      item.is_reserved = false;
      item.availability_status = 'available'; // Nouveau champ pour le statut global

      // Déterminer le type de document et l'ID approprié
      const documentType = item.type;
      const documentId = item.id;

      if (!documentType || !documentId) {
        return; // Pas assez d'informations pour calculer le statut
      }

      // 🎯 VÉRIFICATION DES EMPRUNTS ACTIFS
      const documentField = documentType === 'book' ? 'book_id' : 'academic_document_id';
      const loanWhereClause = documentType === 'book'
        ? `${documentField} = ? AND status IN ('active', 'overdue')`
        : `${documentField} = ? AND document_type = ? AND status IN ('active', 'overdue')`;
      const loanParams = documentType === 'book' ? [documentId] : [documentId, documentType];

      const activeLoans = await executeQuery(`
        SELECT COUNT(*) as loan_count
        FROM loans
        WHERE ${loanWhereClause}
      `, loanParams) as Array<{ loan_count: number }>;

      item.is_borrowed = (activeLoans[0]?.loan_count || 0) > 0;

      // 🎯 VÉRIFICATION DES RÉSERVATIONS ACTIVES
      const reservationWhereClause = documentType === 'book'
        ? `${documentField} = ? AND status = 'active'`
        : `${documentField} = ? AND document_type = ? AND status = 'active'`;
      const reservationParams = documentType === 'book' ? [documentId] : [documentId, documentType];

      const activeReservations = await executeQuery(`
        SELECT COUNT(*) as reservation_count
        FROM reservations
        WHERE ${reservationWhereClause}
      `, reservationParams) as Array<{ reservation_count: number }>;

      item.is_reserved = (activeReservations[0]?.reservation_count || 0) > 0;

      // 🎯 CALCUL DU STATUT GLOBAL SELON LE TYPE DE DOCUMENT
      if (documentType === 'book') {
        // 📚 LIVRES : Statut basé sur les exemplaires disponibles
        // Tant qu'il y a des exemplaires disponibles, le livre est "disponible"
        if ((item.available_copies || 0) > 0) {
          item.availability_status = 'disponible';
        } else {
          item.availability_status = 'indisponible';
        }
      } else {
        // 🎓 DOCUMENTS UNIQUES (thèses, mémoires, rapports) : Statut basé sur emprunt/réservation
        // Un document unique emprunté OU réservé est INDISPONIBLE
        if (item.is_borrowed || item.is_reserved) {
          item.availability_status = 'indisponible';
        } else {
          item.availability_status = 'disponible';
        }
      }

    } catch (error) {
      console.error('Erreur lors du calcul du statut du document:', error);
      // Valeurs par défaut en cas d'erreur
      item.is_borrowed = false;
      item.is_reserved = false;
      item.availability_status = 'unknown';
    }
  }

  /**
   * Recherche optimisée dans le catalogue avec cache
   */
  static async searchCatalog(filters: CatalogFilters): Promise<CatalogResult> {
    const startTime = Date.now();
    
    // Normaliser les filtres
    const normalizedFilters = this.normalizeFilters(filters);
    
    // Générer une clé de cache
    const cacheKey = this.generateCacheKey(normalizedFilters);
    
    // 🎯 DÉSACTIVER LE CACHE pour le filtrage par disponibilité (temporaire)
    const hasAvailabilityFilter = normalizedFilters.availability && normalizedFilters.availability !== 'all';

    // Vérifier le cache seulement si pas de filtrage par disponibilité
    if (!hasAvailabilityFilter) {
      const cachedResult = await this.getCachedResult(cacheKey);
      if (cachedResult) {
        return {
          ...cachedResult,
          cached: true,
          executionTime: Date.now() - startTime
        };
      }
    }

    // Exécuter la recherche
    const result = await this.executeSearch(normalizedFilters);
    
    // Mettre en cache le résultat seulement si pas de filtrage par disponibilité
    if (!hasAvailabilityFilter) {
      await this.cacheResult(cacheKey, result, normalizedFilters);
    }
    
    return {
      ...result,
      cached: false,
      executionTime: Date.now() - startTime
    };
  }

  /**
   * Normaliser et valider les filtres
   */
  private static normalizeFilters(filters: CatalogFilters): CatalogFilters {
    return {
      type: filters.type || 'all',
      search: filters.search?.trim() || '',
      domain: filters.domain && filters.domain !== 'all' ? filters.domain : '',
      year: filters.year && filters.year !== 'all' ? filters.year : '',
      availability: filters.availability || 'all',
      language: filters.language && filters.language !== 'all' ? filters.language : '',
      format: filters.format && filters.format !== 'all' ? filters.format : '',
      level: filters.level && filters.level !== 'all' ? filters.level : '',
      publisher: filters.publisher && filters.publisher !== 'all' ? filters.publisher : '',
      classification: filters.classification && filters.classification !== 'all' ? filters.classification : '',
      page: Math.max(1, filters.page || 1),
      limit: Math.min(this.MAX_LIMIT, Math.max(1, filters.limit || this.DEFAULT_LIMIT))
    };
  }

  /**
   * Générer une clé de cache unique
   */
  private static generateCacheKey(filters: CatalogFilters): string {
    const keyData = JSON.stringify(filters);
    return crypto.createHash('md5').update(keyData).digest('hex');
  }

  /**
   * Récupérer un résultat du cache
   */
  private static async getCachedResult(cacheKey: string): Promise<CatalogResult | null> {
    try {
      const cacheRows = await executeQuery(`
        SELECT results, total_count, created_at
        FROM catalog_search_cache 
        WHERE search_hash = ? AND expires_at > NOW()
      `, [cacheKey]) as any[];

      if (cacheRows.length > 0) {
        // Incrémenter le compteur de hits
        await executeQuery(`
          UPDATE catalog_search_cache 
          SET hit_count = hit_count + 1 
          WHERE search_hash = ?
        `, [cacheKey]);

        const cached = cacheRows[0];
        const results = JSON.parse(cached.results);
        
        return {
          data: results.data,
          total: cached.total_count,
          page: results.page,
          limit: results.limit,
          totalPages: Math.ceil(cached.total_count / results.limit),
          cached: true,
          executionTime: 0
        };
      }
    } catch (error) {
      console.warn('Erreur lecture cache:', error);
    }
    
    return null;
  }

  /**
   * Exécuter la recherche optimisée
   */
  private static async executeSearch(filters: CatalogFilters): Promise<Omit<CatalogResult, 'cached' | 'executionTime'>> {
    const { type, search, domain, year, availability, page, limit } = filters;
    const offset = (page! - 1) * limit!;

    // 🔒 SÉCURITÉ : Exclure les documents académiques privés des étudiants
    // Les documents académiques (academic_documents_unified) ne doivent JAMAIS apparaître dans le catalogue public

    // 🎯 CORRECTION MAJEURE : Pour le filtrage par disponibilité, récupérer plus de données
    let adjustedFilters = { ...filters };
    let needsAvailabilityFilter = filters.availability && filters.availability !== 'all';

    if (needsAvailabilityFilter) {
      // Récupérer plus de données pour permettre le filtrage
      adjustedFilters.limit = Math.max(filters.limit! * 5, 100); // 5x plus de données
      adjustedFilters.page = 1; // Commencer à la page 1
    }

    // Construire la requête selon le type
    let result: Omit<CatalogResult, 'cached' | 'executionTime'>;

    if (type === 'books') {
      result = await this.searchBooks(adjustedFilters, 0); // offset 0 pour récupérer depuis le début
    } else if (type === 'theses') {
      result = await this.searchTheses(adjustedFilters, 0);
    } else if (type === 'memoires') {
      result = await this.searchMemoires(adjustedFilters, 0);
    } else if (type === 'reports') {
      result = await this.searchReports(adjustedFilters, 0);
    } else {
      result = await this.searchAll(adjustedFilters, 0);
    }

    // 🎯 FILTRAGE PAR DISPONIBILITÉ (après calcul du statut dans processItems)
    if (needsAvailabilityFilter) {
      result = await this.applyAvailabilityFilter(result, filters.availability!, filters);
    }

    return result;
  }

  /**
   * 🎯 Appliquer le filtrage par disponibilité après calcul du statut
   */
  private static async applyAvailabilityFilter(
    result: Omit<CatalogResult, 'cached' | 'executionTime'>,
    availability: string,
    originalFilters: CatalogFilters
  ): Promise<Omit<CatalogResult, 'cached' | 'executionTime'>> {

    let filteredData = result.data;

    switch (availability) {
      case 'available':
        filteredData = result.data.filter(item => item.availability_status === 'disponible');
        break;
      case 'unavailable':
        filteredData = result.data.filter(item => item.availability_status === 'indisponible');
        break;
      case 'borrowed':
        filteredData = result.data.filter(item => item.is_borrowed === true);
        break;
      case 'reserved':
        filteredData = result.data.filter(item => item.is_reserved === true);
        break;
      default:
        // 'all' ou valeur inconnue - pas de filtrage
        break;
    }

    // 🎯 CORRECTION IMPORTANTE : Utiliser la pagination des filtres originaux
    const totalFiltered = filteredData.length;
    const limit = originalFilters.limit || 24;
    const page = originalFilters.page || 1;
    const offset = (page - 1) * limit;

    // Appliquer la pagination sur les données filtrées
    const paginatedData = filteredData.slice(offset, offset + limit);

    return {
      ...result,
      data: paginatedData,
      total: totalFiltered,
      totalPages: Math.ceil(totalFiltered / limit),
      page: page,
      limit: limit
    };
  }

  /**
   * Recherche optimisée dans les livres
   */
  private static async searchBooks(filters: CatalogFilters, offset: number): Promise<Omit<CatalogResult, 'cached' | 'executionTime'>> {
    const { search, domain, year, availability, language, format, publisher, classification, limit } = filters;
    
    // 🔒 SÉCURITÉ : Seulement les livres publics (la table books n'a pas is_accessible)
    let whereConditions: string[] = ["status IN ('available', 'active')"];
    let queryParams: any[] = [];

    // Conditions de recherche optimisées
    if (search) {
      whereConditions.push('(title LIKE ? OR main_author LIKE ? OR domain LIKE ?)');
      const searchTerm = `%${search}%`;
      queryParams.push(searchTerm, searchTerm, searchTerm);
    }

    if (domain && domain !== 'all') {
      whereConditions.push('domain LIKE ?');
      queryParams.push(`%${domain}%`);
    }

    if (year && year !== 'all') {
      whereConditions.push('publication_year = ?');
      queryParams.push(parseInt(year));
    }

    // 🎯 SUPPRESSION : Le filtrage par disponibilité se fait maintenant après traitement
    // La logique de filtrage SQL avec available_copies ne fonctionne pas car c'est un champ calculé

    // Filtres supplémentaires pour les livres
    if (language) {
      whereConditions.push('language = ?');
      queryParams.push(language);
    }

    if (format) {
      whereConditions.push('format = ?');
      queryParams.push(format);
    }

    if (publisher) {
      whereConditions.push('publisher LIKE ?');
      queryParams.push(`%${publisher}%`);
    }

    if (classification) {
      whereConditions.push('(dewey_classification LIKE ? OR cdu_classification LIKE ?)');
      queryParams.push(`%${classification}%`, `%${classification}%`);
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    // Requête principale optimisée avec calcul correct de la disponibilité
    const query = `
      SELECT
        'book' as type, 'book' as doc_type, b.id, b.title, b.subtitle,
        b.main_author, b.secondary_author, b.main_author as author,
        b.publisher, b.publication_year, b.publication_city, b.edition,
        b.domain, b.summary, b.abstract, b.status, b.created_at,
        b.total_copies,
        GREATEST(0, b.total_copies - COALESCE(active_loans.loan_count, 0) - COALESCE(active_reservations.reservation_count, 0)) as available_copies,
        -- Compatibilité
        b.domain as degree_type, 'N/A' as pages, b.publication_year as defense_year,
        NULL as university, NULL as faculty
      FROM books b
      LEFT JOIN (
        SELECT book_id, COUNT(*) as loan_count
        FROM loans
        WHERE status IN ('active', 'overdue') AND document_type = 'book'
        GROUP BY book_id
      ) active_loans ON b.id = active_loans.book_id
      LEFT JOIN (
        SELECT book_id, COUNT(*) as reservation_count
        FROM reservations
        WHERE status = 'active' AND document_type = 'book'
        GROUP BY book_id
      ) active_reservations ON b.id = active_reservations.book_id
      ${whereClause}
      ORDER BY b.created_at DESC, b.id DESC
      LIMIT ? OFFSET ?
    `;

    // Requête de comptage optimisée
    const countQuery = `
      SELECT COUNT(*) as total 
      FROM books b
      LEFT JOIN (
        SELECT book_id, COUNT(*) as loan_count
        FROM loans
        WHERE status IN ('active', 'overdue') AND document_type = 'book'
        GROUP BY book_id
      ) active_loans ON b.id = active_loans.book_id
      LEFT JOIN (
        SELECT book_id, COUNT(*) as reservation_count
        FROM reservations
        WHERE status = 'active' AND document_type = 'book'
        GROUP BY book_id
      ) active_reservations ON b.id = active_reservations.book_id
      ${whereClause}
    `;

    // Exécution parallèle des requêtes
    const [results, countResults] = await Promise.all([
      executeQuery(query, [...queryParams, limit, offset]),
      executeQuery(countQuery, queryParams)
    ]);

    const total = (countResults as any[])[0].total;

    return {
      data: await this.processDocumentData(results as any[]),
      total,
      page: filters.page!,
      limit: filters.limit!,
      totalPages: Math.ceil(total / filters.limit!)
    };
  }

  /**
   * Recherche optimisée dans les thèses
   */
  private static async searchTheses(filters: CatalogFilters, offset: number): Promise<Omit<CatalogResult, 'cached' | 'executionTime'>> {
    const { search, domain, year, availability, language, format, level, limit } = filters;
    
    // 🔒 SÉCURITÉ : Seulement les thèses publiques (pas les documents académiques privés)
    let whereConditions: string[] = ["status IN ('available', 'active')", "is_accessible = 1"];
    let queryParams: any[] = [];

    if (search) {
      whereConditions.push('(title LIKE ? OR main_author LIKE ? OR university LIKE ?)');
      const searchTerm = `%${search}%`;
      queryParams.push(searchTerm, searchTerm, searchTerm);
    }

    if (domain && domain !== 'all') {
      whereConditions.push('(specialty LIKE ? OR target_degree LIKE ?)');
      queryParams.push(`%${domain}%`, `%${domain}%`);
    }

    if (year && year !== 'all') {
      whereConditions.push('defense_year = ?');
      queryParams.push(parseInt(year));
    }

    // 🎯 SUPPRESSION : Le filtrage par disponibilité se fait maintenant après traitement

    // Filtres supplémentaires pour les thèses
    if (language) {
      whereConditions.push('language = ?');
      queryParams.push(language);
    }

    if (format) {
      whereConditions.push('format = ?');
      queryParams.push(format);
    }

    if (level) {
      whereConditions.push('target_degree LIKE ?');
      queryParams.push(`%${level}%`);
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    const query = `
      SELECT
        'these' as type, 'thesis' as doc_type, id, title, summary, abstract,
        main_author, director, co_director, main_author as author,
        target_degree, specialty, defense_year,
        university, faculty, status, created_at,
        available_copies, total_copies,
        -- Compatibilité
        COALESCE(target_degree, 'Non spécifié') as degree_type, 'N/A' as pages,
        NULL as publisher, NULL as publication_year
      FROM theses
      ${whereClause}
      ORDER BY created_at DESC, id DESC
      LIMIT ? OFFSET ?
    `;

    const countQuery = `SELECT COUNT(*) as total FROM theses ${whereClause}`;

    const [results, countResults] = await Promise.all([
      executeQuery(query, [...queryParams, limit, offset]),
      executeQuery(countQuery, queryParams)
    ]);

    const total = (countResults as any[])[0].total;

    return {
      data: await this.processDocumentData(results as any[]),
      total,
      page: filters.page!,
      limit: filters.limit!,
      totalPages: Math.ceil(total / filters.limit!)
    };
  }

  /**
   * Recherche optimisée dans les mémoires
   */
  private static async searchMemoires(filters: CatalogFilters, offset: number): Promise<Omit<CatalogResult, 'cached' | 'executionTime'>> {
    // Implémentation similaire aux thèses
    const { search, domain, year, availability, language, format, level, limit } = filters;
    
    // 🔒 SÉCURITÉ : Seulement les mémoires publics (pas les documents académiques privés)
    let whereConditions: string[] = ["status IN ('available', 'active')", "is_accessible = 1"];
    let queryParams: any[] = [];

    if (search) {
      whereConditions.push('(title LIKE ? OR main_author LIKE ? OR university LIKE ?)');
      const searchTerm = `%${search}%`;
      queryParams.push(searchTerm, searchTerm, searchTerm);
    }

    if (domain && domain !== 'all') {
      whereConditions.push('field_of_study LIKE ?');
      queryParams.push(`%${domain}%`);
    }

    if (year && year !== 'all') {
      whereConditions.push('academic_year LIKE ?');
      queryParams.push(`%${year}%`);
    }

    // 🎯 SUPPRESSION : Le filtrage par disponibilité se fait maintenant après traitement

    // Filtres supplémentaires pour les mémoires
    if (language) {
      whereConditions.push('language = ?');
      queryParams.push(language);
    }

    if (format) {
      whereConditions.push('format = ?');
      queryParams.push(format);
    }

    if (level) {
      whereConditions.push('degree_level LIKE ?');
      queryParams.push(`%${level}%`);
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    const query = `
      SELECT
        'memoire' as type, 'memoir' as doc_type, id, title, summary, abstract,
        main_author, supervisor, co_supervisor, main_author as author,
        degree_level, field_of_study, specialty, defense_date,
        university, faculty, status, created_at,
        available_copies, total_copies,
        -- Compatibilité
        COALESCE(degree_level, 'Non spécifié') as degree_type, 'N/A' as pages,
        YEAR(defense_date) as defense_year, supervisor as director,
        NULL as publisher, NULL as publication_year
      FROM memoires
      ${whereClause}
      ORDER BY created_at DESC, id DESC
      LIMIT ? OFFSET ?
    `;

    const countQuery = `SELECT COUNT(*) as total FROM memoires ${whereClause}`;

    const [results, countResults] = await Promise.all([
      executeQuery(query, [...queryParams, limit, offset]),
      executeQuery(countQuery, queryParams)
    ]);

    const total = (countResults as any[])[0].total;

    return {
      data: await this.processDocumentData(results as any[]),
      total,
      page: filters.page!,
      limit: filters.limit!,
      totalPages: Math.ceil(total / filters.limit!)
    };
  }

  /**
   * Recherche dans les rapports de stage
   */
  private static async searchReports(filters: CatalogFilters, offset: number): Promise<Omit<CatalogResult, 'cached' | 'executionTime'>> {
    // Implémentation pour les rapports de stage
    const { search, domain, year, availability, language, format, level, limit } = filters;
    
    // 🔒 SÉCURITÉ : Seulement les rapports publics (pas les documents académiques privés)
    let whereConditions: string[] = ["status IN ('available', 'active')", "is_accessible = 1"];
    let queryParams: any[] = [];

    if (search) {
      whereConditions.push('(title LIKE ? OR student_name LIKE ? OR company_name LIKE ?)');
      const searchTerm = `%${search}%`;
      queryParams.push(searchTerm, searchTerm, searchTerm);
    }

    if (domain && domain !== 'all') {
      whereConditions.push('field_of_study LIKE ?');
      queryParams.push(`%${domain}%`);
    }

    if (year && year !== 'all') {
      whereConditions.push('YEAR(stage_end_date) = ?');
      queryParams.push(parseInt(year));
    }

    // 🎯 SUPPRESSION : Le filtrage par disponibilité se fait maintenant après traitement

    // Filtres supplémentaires pour les rapports
    if (language) {
      whereConditions.push('language = ?');
      queryParams.push(language);
    }

    if (format) {
      whereConditions.push('format = ?');
      queryParams.push(format);
    }

    if (level) {
      whereConditions.push('degree_level LIKE ?');
      queryParams.push(`%${level}%`);
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    const query = `
      SELECT
        'rapport_stage' as type, 'report' as doc_type, id, title, summary, abstract,
        student_name, supervisor, company_supervisor, student_name as author,
        degree_level, field_of_study, specialty, defense_date,
        company_name, stage_duration, university, faculty, status, created_at,
        available_copies, total_copies,
        -- Compatibilité
        COALESCE(degree_level, 'Stage') as degree_type, 'N/A' as pages,
        YEAR(stage_end_date) as defense_year, supervisor as director,
        company_name as university, NULL as publisher, NULL as publication_year
      FROM stage_reports
      ${whereClause}
      ORDER BY created_at DESC, id DESC
      LIMIT ? OFFSET ?
    `;

    const countQuery = `SELECT COUNT(*) as total FROM stage_reports ${whereClause}`;

    const [results, countResults] = await Promise.all([
      executeQuery(query, [...queryParams, limit, offset]),
      executeQuery(countQuery, queryParams)
    ]);

    const total = (countResults as any[])[0].total;

    return {
      data: await this.processDocumentData(results as any[]),
      total,
      page: filters.page!,
      limit: filters.limit!,
      totalPages: Math.ceil(total / filters.limit!)
    };
  }

  /**
   * Recherche unifiée (plus lente, à éviter pour gros volumes)
   */
  private static async searchAll(filters: CatalogFilters, offset: number): Promise<Omit<CatalogResult, 'cached' | 'executionTime'>> {
    // Pour 90k+ documents, recommander de choisir un type spécifique
    console.warn('Recherche "all" sur gros volume - considérer filtrer par type');

    // 🔧 CORRECTION PAGINATION : Utiliser une approche UNION pour une pagination correcte
    const { search, domain, year, availability, language, format, level, publisher, classification, limit, page } = filters;
    const limitedLimit = Math.min(limit!, 50); // Limiter à 50 pour "all"

    // Calculer l'offset correct
    const correctOffset = ((page || 1) - 1) * limitedLimit;

    // 🚀 NOUVELLE APPROCHE : Requête UNION avec ORDER BY et LIMIT/OFFSET corrects
    // Conditions de recherche et filtres spécifiques par table
    let bookConditions = ["status IN ('available', 'active')"];
    let theseConditions = ["status IN ('available', 'active')", "is_accessible = 1"];
    let memoireConditions = ["status IN ('available', 'active')", "is_accessible = 1"];
    let reportConditions = ["status IN ('available', 'active')", "is_accessible = 1"];

    // Recherche textuelle
    if (search) {
      bookConditions.push(`(title LIKE '%${search}%' OR main_author LIKE '%${search}%' OR domain LIKE '%${search}%')`);
      theseConditions.push(`(title LIKE '%${search}%' OR main_author LIKE '%${search}%' OR university LIKE '%${search}%')`);
      memoireConditions.push(`(title LIKE '%${search}%' OR main_author LIKE '%${search}%' OR university LIKE '%${search}%')`);
      reportConditions.push(`(title LIKE '%${search}%' OR student_name LIKE '%${search}%' OR company_name LIKE '%${search}%')`);
    }

    // Filtre domaine
    if (domain && domain !== 'all') {
      bookConditions.push(`domain LIKE '%${domain}%'`);
      theseConditions.push(`(specialty LIKE '%${domain}%' OR target_degree LIKE '%${domain}%')`);
      memoireConditions.push(`field_of_study LIKE '%${domain}%'`);
      reportConditions.push(`field_of_study LIKE '%${domain}%'`);
    }

    // Filtre année
    if (year && year !== 'all') {
      bookConditions.push(`publication_year = ${parseInt(year)}`);
      theseConditions.push(`defense_year = ${parseInt(year)}`);
      memoireConditions.push(`YEAR(defense_date) = ${parseInt(year)}`);
      reportConditions.push(`YEAR(stage_end_date) = ${parseInt(year)}`);
    }

    // Filtre langue
    if (language && language !== 'all') {
      bookConditions.push(`language = '${language}'`);
      theseConditions.push(`language = '${language}'`);
      memoireConditions.push(`language = '${language}'`);
      reportConditions.push(`language = '${language}'`);
    }

    // 🎯 SUPPRESSION : Le filtrage par disponibilité se fait maintenant après traitement

    // Filtre format
    if (format && format !== 'all') {
      bookConditions.push(`format = '${format}'`);
      theseConditions.push(`format = '${format}'`);
      memoireConditions.push(`format = '${format}'`);
      reportConditions.push(`format = '${format}'`);
    }

    // Construire les conditions WHERE
    const bookSearchCondition = bookConditions.length > 1 ? `AND ${bookConditions.slice(1).join(' AND ')}` : '';
    const theseSearchCondition = theseConditions.length > 1 ? `AND ${theseConditions.slice(1).join(' AND ')}` : '';
    const memoireSearchCondition = memoireConditions.length > 1 ? `AND ${memoireConditions.slice(1).join(' AND ')}` : '';
    const reportSearchCondition = reportConditions.length > 1 ? `AND ${reportConditions.slice(1).join(' AND ')}` : '';

    // 🎯 REQUÊTE UNION AVEC COLLATION FORCÉE UNIFORME
    const unionQuery = `
      (
        SELECT 'book' as type, 'book' as doc_type,
               CAST(b.id AS CHAR CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci) as id,
               CAST(b.title AS CHAR CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci) as title,
               CAST(b.main_author AS CHAR CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci) as author,
               CAST(COALESCE(b.summary, '') AS CHAR CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci) as summary,
               CAST(COALESCE(b.abstract, '') AS CHAR CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci) as abstract,
               CAST(b.status AS CHAR CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci) as status,
               b.created_at,
               GREATEST(0, b.total_copies - COALESCE(active_loans.loan_count, 0) - COALESCE(active_reservations.reservation_count, 0)) as available_copies,
               b.total_copies,
               CAST(COALESCE(b.subtitle, '') AS CHAR CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci) as subtitle,
               CAST(COALESCE(b.secondary_author, '') AS CHAR CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci) as secondary_author,
               CAST(COALESCE(b.publisher, '') AS CHAR CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci) as publisher,
               b.publication_year,
               CAST(COALESCE(b.publication_city, '') AS CHAR CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci) as publication_city,
               CAST(COALESCE(b.edition, '') AS CHAR CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci) as edition,
               CAST(COALESCE(b.domain, '') AS CHAR CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci) as domain,
               CAST('' AS CHAR CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci) as director,
               CAST('' AS CHAR CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci) as co_director,
               CAST('' AS CHAR CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci) as target_degree,
               CAST('' AS CHAR CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci) as supervisor,
               CAST('' AS CHAR CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci) as co_supervisor,
               CAST('' AS CHAR CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci) as degree_level,
               CAST('' AS CHAR CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci) as field_of_study,
               CAST('' AS CHAR CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci) as specialty,
               CAST('' AS CHAR CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci) as student_name,
               CAST('' AS CHAR CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci) as company_supervisor,
               CAST('' AS CHAR CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci) as company_name,
               CAST('' AS CHAR CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci) as stage_duration,
               CAST('' AS CHAR CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci) as university,
               CAST('' AS CHAR CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci) as faculty,
               NULL as defense_date, NULL as defense_year
        FROM books b
        LEFT JOIN (
          SELECT book_id, COUNT(*) as loan_count
          FROM loans
          WHERE status IN ('active', 'overdue') AND document_type = 'book'
          GROUP BY book_id
        ) active_loans ON b.id = active_loans.book_id
        LEFT JOIN (
          SELECT book_id, COUNT(*) as reservation_count
          FROM reservations
          WHERE status = 'active' AND document_type = 'book'
          GROUP BY book_id
        ) active_reservations ON b.id = active_reservations.book_id
        WHERE b.status IN ('available', 'active') ${bookSearchCondition}
      )
      UNION ALL
      (
        SELECT 'these' as type, 'thesis' as doc_type,
               CAST(id AS CHAR CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci) as id,
               CAST(title AS CHAR CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci) as title,
               CAST(main_author AS CHAR CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci) as author,
               CAST(COALESCE(summary, '') AS CHAR CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci) as summary,
               CAST(COALESCE(abstract, '') AS CHAR CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci) as abstract,
               CAST(status AS CHAR CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci) as status,
               created_at,
               available_copies, total_copies,
               CAST('' AS CHAR CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci) as subtitle,
               CAST('' AS CHAR CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci) as secondary_author,
               CAST('' AS CHAR CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci) as publisher,
               defense_year as publication_year,
               CAST('' AS CHAR CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci) as publication_city,
               CAST('' AS CHAR CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci) as edition,
               CAST(COALESCE(specialty, '') AS CHAR CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci) as domain,
               CAST(COALESCE(director, '') AS CHAR CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci) as director,
               CAST(COALESCE(co_director, '') AS CHAR CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci) as co_director,
               CAST(COALESCE(target_degree, '') AS CHAR CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci) as target_degree,
               CAST('' AS CHAR CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci) as supervisor,
               CAST('' AS CHAR CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci) as co_supervisor,
               CAST('' AS CHAR CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci) as degree_level,
               CAST('' AS CHAR CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci) as field_of_study,
               CAST(COALESCE(specialty, '') AS CHAR CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci) as specialty,
               CAST('' AS CHAR CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci) as student_name,
               CAST('' AS CHAR CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci) as company_supervisor,
               CAST('' AS CHAR CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci) as company_name,
               CAST('' AS CHAR CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci) as stage_duration,
               CAST(COALESCE(university, '') AS CHAR CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci) as university,
               CAST(COALESCE(faculty, '') AS CHAR CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci) as faculty,
               NULL as defense_date, defense_year
        FROM theses
        WHERE status IN ('available', 'active') AND is_accessible = 1 ${theseSearchCondition}
      )
      UNION ALL
      (
        SELECT 'memoire' as type, 'memoir' as doc_type,
               CAST(id AS CHAR CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci) as id,
               CAST(title AS CHAR CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci) as title,
               CAST(main_author AS CHAR CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci) as author,
               CAST(COALESCE(summary, '') AS CHAR CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci) as summary,
               CAST(COALESCE(abstract, '') AS CHAR CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci) as abstract,
               CAST(status AS CHAR CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci) as status,
               created_at,
               available_copies, total_copies,
               CAST('' AS CHAR CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci) as subtitle,
               CAST('' AS CHAR CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci) as secondary_author,
               CAST('' AS CHAR CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci) as publisher,
               YEAR(defense_date) as publication_year,
               CAST('' AS CHAR CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci) as publication_city,
               CAST('' AS CHAR CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci) as edition,
               CAST(COALESCE(field_of_study, '') AS CHAR CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci) as domain,
               CAST('' AS CHAR CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci) as director,
               CAST('' AS CHAR CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci) as co_director,
               CAST('' AS CHAR CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci) as target_degree,
               CAST(COALESCE(supervisor, '') AS CHAR CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci) as supervisor,
               CAST(COALESCE(co_supervisor, '') AS CHAR CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci) as co_supervisor,
               CAST(COALESCE(degree_level, '') AS CHAR CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci) as degree_level,
               CAST(COALESCE(field_of_study, '') AS CHAR CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci) as field_of_study,
               CAST(COALESCE(specialty, '') AS CHAR CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci) as specialty,
               CAST('' AS CHAR CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci) as student_name,
               CAST('' AS CHAR CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci) as company_supervisor,
               CAST('' AS CHAR CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci) as company_name,
               CAST('' AS CHAR CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci) as stage_duration,
               CAST(COALESCE(university, '') AS CHAR CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci) as university,
               CAST(COALESCE(faculty, '') AS CHAR CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci) as faculty,
               defense_date, YEAR(defense_date) as defense_year
        FROM memoires
        WHERE status IN ('available', 'active') AND is_accessible = 1 ${memoireSearchCondition}
      )
      UNION ALL
      (
        SELECT 'rapport_stage' as type, 'report' as doc_type,
               CAST(id AS CHAR CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci) as id,
               CAST(title AS CHAR CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci) as title,
               CAST(student_name AS CHAR CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci) as author,
               CAST(COALESCE(summary, '') AS CHAR CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci) as summary,
               CAST(COALESCE(abstract, '') AS CHAR CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci) as abstract,
               CAST(status AS CHAR CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci) as status,
               created_at,
               available_copies, total_copies,
               CAST('' AS CHAR CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci) as subtitle,
               CAST('' AS CHAR CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci) as secondary_author,
               CAST('' AS CHAR CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci) as publisher,
               YEAR(stage_end_date) as publication_year,
               CAST('' AS CHAR CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci) as publication_city,
               CAST('' AS CHAR CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci) as edition,
               CAST(COALESCE(field_of_study, '') AS CHAR CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci) as domain,
               CAST('' AS CHAR CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci) as director,
               CAST('' AS CHAR CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci) as co_director,
               CAST('' AS CHAR CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci) as target_degree,
               CAST(COALESCE(supervisor, '') AS CHAR CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci) as supervisor,
               CAST('' AS CHAR CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci) as co_supervisor,
               CAST(COALESCE(degree_level, '') AS CHAR CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci) as degree_level,
               CAST(COALESCE(field_of_study, '') AS CHAR CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci) as field_of_study,
               CAST(COALESCE(specialty, '') AS CHAR CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci) as specialty,
               CAST(student_name AS CHAR CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci) as student_name,
               CAST(COALESCE(company_supervisor, '') AS CHAR CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci) as company_supervisor,
               CAST(COALESCE(company_name, '') AS CHAR CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci) as company_name,
               CAST(COALESCE(stage_duration, '') AS CHAR CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci) as stage_duration,
               CAST(COALESCE(university, '') AS CHAR CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci) as university,
               CAST(COALESCE(faculty, '') AS CHAR CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci) as faculty,
               NULL as defense_date, YEAR(stage_end_date) as defense_year
        FROM stage_reports
        WHERE status IN ('available', 'active') AND is_accessible = 1 ${reportSearchCondition}
      )
      ORDER BY created_at DESC, id DESC
      LIMIT ? OFFSET ?
    `;

    // Compter le total avec CAST pour éviter les conflits de collation
    const countQuery = `
      SELECT COUNT(*) as total FROM (
        SELECT CAST(id AS CHAR CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci) as id FROM books WHERE status IN ('available', 'active') ${bookSearchCondition}
        UNION ALL
        SELECT CAST(id AS CHAR CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci) as id FROM theses WHERE status IN ('available', 'active') AND is_accessible = 1 ${theseSearchCondition}
        UNION ALL
        SELECT CAST(id AS CHAR CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci) as id FROM memoires WHERE status IN ('available', 'active') AND is_accessible = 1 ${memoireSearchCondition}
        UNION ALL
        SELECT CAST(id AS CHAR CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci) as id FROM stage_reports WHERE status IN ('available', 'active') AND is_accessible = 1 ${reportSearchCondition}
      ) as combined
    `;

    const [dataResults, countResults] = await Promise.all([
      executeQuery(unionQuery, [limitedLimit, correctOffset]),
      executeQuery(countQuery, [])
    ]);

    const total = countResults[0]?.total || 0;

    return {
      data: await this.processDocumentData(dataResults),
      total: total,
      page: filters.page!,
      limit: limitedLimit,
      totalPages: Math.ceil(total / limitedLimit)
    };
  }

  /**
   * Mettre en cache un résultat
   */
  private static async cacheResult(cacheKey: string, result: any, filters: CatalogFilters): Promise<void> {
    try {
      const expiresAt = new Date(Date.now() + this.CACHE_DURATION);
      
      await executeQuery(`
        INSERT INTO catalog_search_cache 
        (search_hash, search_params, results, total_count, expires_at)
        VALUES (?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
        results = VALUES(results),
        total_count = VALUES(total_count),
        expires_at = VALUES(expires_at),
        hit_count = hit_count + 1
      `, [
        cacheKey,
        JSON.stringify(filters),
        JSON.stringify(result),
        result.total,
        expiresAt
      ]);
    } catch (error) {
      console.warn('Erreur mise en cache:', error);
    }
  }

  /**
   * Obtenir les statistiques du catalogue
   */
  static async getCatalogStats(): Promise<any> {
    try {
      const stats = await executeQuery(`
        SELECT type, total_count, available_count, last_updated
        FROM catalog_stats
      `) as any[];

      return stats.reduce((acc, stat) => {
        acc[stat.type] = {
          total: stat.total_count,
          available: stat.available_count,
          lastUpdated: stat.last_updated
        };
        return acc;
      }, {});
    } catch (error) {
      console.error('Erreur récupération stats:', error);
      return {};
    }
  }
}
