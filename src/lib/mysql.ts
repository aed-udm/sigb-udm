import mysql from 'mysql2/promise';
import { XCircle } from "lucide-react";
import { safeKeywordsToArray } from './utils/keywords-utils';
import type { QueryResult } from '@/types/database';

// 🔧 SOLUTION DÉFINITIVE COLLATION : Configuration MySQL avec collation forcée
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3306'),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'bibliotheque_cameroun',
  charset: 'utf8mb4',
  timezone: '+01:00', // Timezone du Cameroun (WAT - West Africa Time)
  // Configuration du pool de connexions optimisée (options valides uniquement)
  connectionLimit: 20, // Limite raisonnable
  queueLimit: 0,
  waitForConnections: true,
  idleTimeout: 300000, // 5 minutes
  maxIdle: 5, // Connexions inactives maximum
};

// Pool de connexions MySQL
let pool: mysql.Pool | null = null;

// Fonction pour créer le pool de connexions
export const createPool = () => {
  if (!pool) {
    pool = mysql.createPool(dbConfig);
  }
  return pool;
};

// Fonction pour obtenir une connexion avec collation forcée
export const getConnection = async () => {
  const connectionPool = createPool();
  const connection = await connectionPool.getConnection();

  // 🔧 FORCER LA COLLATION pour cette session
  await connection.execute("SET collation_connection = 'utf8mb4_general_ci'");
  await connection.execute("SET collation_database = 'utf8mb4_general_ci'");
  await connection.execute("SET collation_server = 'utf8mb4_general_ci'");

  return connection;
};

// Fonction pour exécuter une requête
export const executeQuery = async <T = any>(query: string, params: any[] = []): Promise<QueryResult<T>> => {
  const connection = await getConnection();
  try {
    const [results] = await connection.execute(query, params);
    return results as QueryResult<T>;
  } finally {
    connection.release();
  }
};

// Fonction pour exécuter une transaction
export const executeTransaction = async (queries: { query: string; params?: any[] }[]) => {
  const connection = await getConnection();
  try {
    await connection.beginTransaction();
    
    const results = [];
    for (const { query, params = [] } of queries) {
      const [result] = await connection.execute(query, params);
      results.push(result);
    }
    
    await connection.commit();
    return results;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

// Types TypeScript pour la base de données
export interface Book {
  id: string;
  mfn: string;
  title: string;
  subtitle?: string;
  parallel_title?: string;
  main_author: string;
  secondary_author?: string;
  edition?: string;
  publication_city?: string;
  publisher?: string;
  publication_year?: number;
  acquisition_mode?: string;
  price?: number; // Prix en FCFA (centimes)
  domain?: string;
  collection?: string;
  summary?: string;
  abstract?: string;
  keywords?: string[]; // JSON array
  keywords_en?: string[]; // Parsed from text field in DB
  isbn?: string;
  dewey_classification?: string;
  cdu_classification?: string;
  subject_headings?: string[]; // JSON array
  available_copies: number;
  total_copies: number;
  document_path?: string;
  file_type?: string;
  document_size?: number;
  digital_versions?: any; // JSON object
  has_digital_version?: boolean;
  created_at: string;
  updated_at: string;
}

export interface Thesis {
  id: string;
  main_author: string;
  director: string;
  co_director?: string;
  title: string;
  target_degree: string;
  specialty?: string;
  defense_year?: number;
  defense_date?: string;
  university?: string;
  faculty?: string;
  department?: string;
  pagination?: string;
  summary?: string;
  keywords?: string[];
  abstract?: string;
  keywords_en?: string[];
  document_path?: string;
  document_type?: 'pdf' | 'doc' | 'docx';
  document_size?: number;
  is_accessible: boolean;
  created_at: string;
  updated_at: string;
}

export interface Memoire {
  id: string;
  main_author: string;
  supervisor: string;
  co_supervisor?: string;
  title: string;
  degree_level: 'Licence' | 'Master 1' | 'Master 2' | 'Ingénieur';
  field_of_study: string;
  specialty?: string;
  academic_year?: string;
  defense_date?: string;
  university: string;
  faculty: string;
  department?: string;
  pagination?: string;
  summary?: string;
  keywords?: string[];
  methodology?: string;
  conclusion?: string;
  document_path?: string;
  document_type?: 'pdf' | 'doc' | 'docx';
  document_size?: number;
  is_accessible: boolean;
  grade?: number;
  mention?: 'Passable' | 'Assez Bien' | 'Bien' | 'Très Bien' | 'Excellent';
  created_at: string;
  updated_at: string;
}

export interface StageReport {
  id: string;
  student_name: string;
  student_id?: string;
  supervisor?: string;
  company_supervisor?: string;
  title: string;
  company_name: string;
  company_address?: string;
  company_sector?: string;
  stage_type: 'Observation' | 'Application' | 'Perfectionnement' | 'Pré-emploi';
  degree_level: 'Licence 1' | 'Licence 2' | 'Licence 3' | 'Master 1' | 'Master 2' | 'Ingénieur';
  field_of_study: string;
  specialty?: string;
  academic_year?: string;
  stage_start_date: string;
  stage_end_date: string;
  stage_duration?: number;
  defense_date?: string;
  university: string;
  faculty: string;
  department?: string;
  pagination?: string;
  summary?: string;
  objectives?: string;
  tasks_performed?: string;
  skills_acquired?: string;
  recommendations?: string;
  keywords?: string[];
  document_path?: string;
  document_type?: 'pdf' | 'doc' | 'docx';
  document_size?: number;
  is_accessible: boolean;
  grade?: number;
  mention?: 'Passable' | 'Assez Bien' | 'Bien' | 'Très Bien' | 'Excellent';
  created_at: string;
  updated_at: string;
}

export interface AcademicDocument {
  document_type: 'these' | 'memoire' | 'rapport_stage';
  id: string;
  title: string;
  author: string;
  supervisor: string;
  degree: string;
  specialty?: string;
  year?: number;
  defense_date?: string;
  university?: string;
  faculty?: string;
  document_path?: string;
  file_type?: 'pdf' | 'doc' | 'docx';
  document_size?: number;
  is_accessible: boolean;
  available_copies: number;
  total_copies: number;
  created_at: string;
}

export interface User {
  id: string;
  email: string;
  full_name: string;
  barcode: string;
  matricule?: string;
  phone?: string;
  address?: string;
  is_active: boolean;
  max_loans: number;
  created_at: string;
  updated_at: string;
  // Champs pour les documents académiques PDF
  academic_documents_pdf_path?: string;
  academic_pdf_file_type?: string;
  academic_pdf_file_size?: number;
  academic_pdf_uploaded_at?: string;
}

export interface Loan {
  id: string;
  user_id: string;
  book_id?: string;
  academic_document_id?: string;
  document_type: 'book' | 'these' | 'memoire' | 'rapport_stage';
  loan_date: string;
  due_date: string;
  return_date?: string;
  status: 'active' | 'returned' | 'overdue';
  created_at: string;
  updated_at: string;
  // Champs pour les pénalités
  fine_amount?: number;
  fine_paid?: boolean;
  fine_calculated_date?: string;
  daily_fine_rate?: number;
}

export interface LoanWithDetails {
  id: string;
  user_id: string;
  book_id?: string;
  academic_document_id?: string;
  document_type: 'book' | 'these' | 'memoire' | 'rapport_stage';
  loan_date: string;
  due_date: string;
  return_date?: string;
  status: 'active' | 'returned' | 'overdue';
  created_at: string;
  updated_at: string;
  user_name: string;
  user_email: string;
  user_barcode: string;
  // Informations du livre (si c'est un livre)
  book_title?: string;
  book_author?: string;
  book_mfn?: string;
  // Informations du document académique (si c'est un document académique)
  academic_title?: string;
  academic_author?: string;
  academic_degree?: string;
  days_overdue: number;
  effective_days_overdue: number;
  // Champs pour les pénalités
  fine_amount?: number;
  fine_paid?: boolean;
  fine_calculated_date?: string;
  daily_fine_rate?: number;
}

export interface LibraryStats {
  total_books: number;
  total_copies: number;
  available_copies: number;
  active_users: number;
  active_loans: number;
  overdue_loans: number;
  total_theses: number;
  total_memoires: number;
  total_stage_reports: number;
  theses_with_documents: number;
  memoires_with_documents: number;
  stage_reports_with_documents: number;
}

export interface UniversityStats {
  university: string;
  theses_count: number;
  memoires_count: number;
  stage_reports_count: number;
  total_documents: number;
  documents_with_files: number;
  digitization_rate: number;
}

// Fonctions utilitaires pour les requêtes courantes

// Livres - Version corrigée pour forcer la recompilation
export const getBooks = async (filters?: {
  search?: string;
  domain?: string;
  available_only?: boolean;
  has_digital_version?: boolean;
}): Promise<Book[]> => {
  // 🚨 CORRECTION CRITIQUE : Calcul unifié de la disponibilité
  let query = `
    SELECT
      b.*,
      COALESCE(active_loans.loan_count, 0) as current_loans,
      COALESCE(active_reservations.reservation_count, 0) as current_reservations,
      GREATEST(0, b.total_copies - COALESCE(active_loans.loan_count, 0) - COALESCE(active_reservations.reservation_count, 0)) as calculated_available_copies
    FROM books b
    LEFT JOIN (
      SELECT book_id, COUNT(*) as loan_count
      FROM loans
      WHERE status IN ('active', 'overdue')
      GROUP BY book_id
    ) active_loans ON b.id = active_loans.book_id
    LEFT JOIN (
      SELECT book_id, COUNT(*) as reservation_count
      FROM reservations
      WHERE status = 'active'
      GROUP BY book_id
    ) active_reservations ON b.id = active_reservations.book_id
    WHERE 1=1
  `;
  const params: any[] = [];

  if (filters?.search) {
    query += ' AND (b.title LIKE ? OR b.main_author LIKE ? OR b.mfn LIKE ?)';
    const searchTerm = `%${filters.search}%`;
    params.push(searchTerm, searchTerm, searchTerm);
  }

  if (filters?.domain) {
    query += ' AND b.domain = ?';
    params.push(filters.domain);
  }

  // 🚨 FILTRE CRITIQUE : Utiliser la même logique que le calcul
  if (filters?.available_only) {
    query += ' HAVING calculated_available_copies > 0';
  }

  if (filters?.has_digital_version !== undefined) {
    query += ' AND b.has_digital_version = ?';
    params.push(filters.has_digital_version);
  }

  query += ' ORDER BY b.title';

  const results = await executeQuery(query, params) as Book[];

  return results.map(book => ({
    ...book,
    keywords: book.keywords ? JSON.parse(book.keywords as any) : [],
    subject_headings: book.subject_headings ? JSON.parse(book.subject_headings as any) : [],
    digital_versions: book.digital_versions ?
      (typeof book.digital_versions === 'string' ?
        JSON.parse(book.digital_versions) :
        book.digital_versions) :
      null,
    has_digital_version: Boolean(book.has_digital_version),
    // 🚨 UTILISER LA VALEUR CALCULÉE
    available_copies: (book as any).calculated_available_copies
  }));
};

export const getBookById = async (id: string): Promise<Book | null> => {
  const results = await executeQuery(`
    SELECT
      b.*,
      COALESCE(active_loans.loan_count, 0) as current_loans,
      COALESCE(active_reservations.reservation_count, 0) as current_reservations,
      GREATEST(0, b.total_copies - COALESCE(active_loans.loan_count, 0) - COALESCE(active_reservations.reservation_count, 0)) as calculated_available_copies
    FROM books b
    LEFT JOIN (
      SELECT book_id, COUNT(*) as loan_count
      FROM loans
      WHERE status IN ('active', 'overdue')
      GROUP BY book_id
    ) active_loans ON b.id = active_loans.book_id
    LEFT JOIN (
      SELECT book_id, COUNT(*) as reservation_count
      FROM reservations
      WHERE status = 'active'
      GROUP BY book_id
    ) active_reservations ON b.id = active_reservations.book_id
    WHERE b.id = ?
  `, [id]) as Book[];

  if (results.length === 0) return null;

  const book = results[0];
  return {
    ...book,
    // Parsing des champs JSON
    keywords: book.keywords ? JSON.parse(book.keywords as any) : [],
    keywords_en: safeKeywordsToArray(book.keywords_en),
    subject_headings: book.subject_headings ? JSON.parse(book.subject_headings as any) : [],
    digital_versions: book.digital_versions ?
      (typeof book.digital_versions === 'string' ?
        JSON.parse(book.digital_versions) :
        book.digital_versions) :
      null,
    // Conversion des booléens
    has_digital_version: Boolean(book.has_digital_version),
    // Nettoyage des champs texte
    document_path: book.document_path === 'NULL' || book.document_path === '' ? undefined : book.document_path,
    // Utilisation de la valeur calculée pour available_copies
    available_copies: (book as any).calculated_available_copies || book.available_copies
  };
};

// Utilisateurs
export const getUsers = async (filters?: {
  search?: string;
  active_only?: boolean;
  matricule?: string;
}): Promise<User[]> => {
  let query = 'SELECT * FROM users WHERE 1=1';
  const params: any[] = [];

  if (filters?.matricule) {
    // Recherche spécifique par matricule
    query += ' AND matricule = ?';
    params.push(filters.matricule);
  } else if (filters?.search) {
    // Recherche générale incluant le matricule
    query += ' AND (full_name LIKE ? OR email LIKE ? OR barcode LIKE ? OR matricule LIKE ?)';
    const searchTerm = `%${filters.search}%`;
    params.push(searchTerm, searchTerm, searchTerm, searchTerm);
  }

  if (filters?.active_only) {
    query += ' AND is_active = TRUE';
  }

  query += ' ORDER BY full_name';

  return await executeQuery(query, params) as User[];
};

export const getUserById = async (id: string): Promise<User | null> => {
  const results = await executeQuery('SELECT * FROM users WHERE id = ?', [id]) as User[];
  return results.length > 0 ? results[0] : null;
};

// Fonction utilitaire pour mettre à jour automatiquement les statuts en retard
const updateOverdueLoansInDB = async (): Promise<void> => {
  try {
    await executeQuery(`
      UPDATE loans
      SET status = 'overdue', updated_at = CURRENT_TIMESTAMP
      WHERE status = 'active'
      AND due_date < CURDATE()
      AND return_date IS NULL
    `);
  } catch (error) {
    console.error('[XCircle] Erreur lors de la mise à jour automatique des emprunts en retard:', error);
  }
};

// Emprunts
export const getLoans = async (filters?: {
  user_id?: string;
  book_id?: string;
  academic_document_id?: string;
  document_type?: 'book' | 'these' | 'memoire' | 'rapport_stage';
  status?: string;
}): Promise<LoanWithDetails[]> => {
  // IMPORTANT: Mettre à jour automatiquement les statuts en retard avant de récupérer les données
  await updateOverdueLoansInDB();
  let query = `
    SELECT
      l.*,
      u.full_name as user_name,
      u.email as user_email,
      u.matricule as user_barcode,
      -- Informations du livre (si c'est un livre)
      CASE WHEN l.document_type = 'book' THEN b.title ELSE NULL END as book_title,
      CASE WHEN l.document_type = 'book' THEN b.main_author ELSE NULL END as book_author,
      CASE WHEN l.document_type = 'book' THEN b.mfn ELSE NULL END as book_mfn,
      -- Informations du document académique (si c'est un document académique)
      CASE
          WHEN l.document_type = 'these' THEN t.title
          WHEN l.document_type = 'memoire' THEN m.title
          WHEN l.document_type = 'rapport_stage' THEN s.title
          ELSE NULL
      END as academic_title,
      CASE
          WHEN l.document_type = 'these' THEN t.main_author
          WHEN l.document_type = 'memoire' THEN m.main_author
          WHEN l.document_type = 'rapport_stage' THEN s.student_name
          ELSE NULL
      END as academic_author,
      CASE
          WHEN l.document_type = 'these' THEN t.target_degree
          WHEN l.document_type = 'memoire' THEN m.degree_level
          WHEN l.document_type = 'rapport_stage' THEN s.degree_level
          ELSE NULL
      END as academic_degree,
      DATEDIFF(CURDATE(), l.due_date) as days_overdue,
      -- Calcul des jours de retard effectifs (après période de grâce)
      GREATEST(0, DATEDIFF(CURDATE(), l.due_date) - COALESCE(ps.grace_period_days, 1)) as effective_days_overdue,
      -- 🎯 VÉRIFICATION CRITIQUE : Pénalités impayées pour cet utilisateur
      CASE
        WHEN EXISTS (
          SELECT 1 FROM penalties p
          WHERE p.user_id COLLATE utf8mb4_unicode_ci = l.user_id COLLATE utf8mb4_unicode_ci
            AND p.status IN ('unpaid', 'partial')
            AND (p.amount_fcfa - COALESCE((
              SELECT SUM(pp.amount_paid)
              FROM penalty_payments pp
              WHERE pp.penalty_id COLLATE utf8mb4_unicode_ci = p.id COLLATE utf8mb4_unicode_ci
            ), 0)) > 0
        ) THEN 1
        ELSE 0
      END as has_unpaid_penalties
    FROM loans l
    LEFT JOIN users u ON l.user_id COLLATE utf8mb4_unicode_ci = u.id COLLATE utf8mb4_unicode_ci
    LEFT JOIN books b ON l.book_id COLLATE utf8mb4_unicode_ci = b.id COLLATE utf8mb4_unicode_ci AND l.document_type = 'book'
    LEFT JOIN theses t ON l.academic_document_id COLLATE utf8mb4_unicode_ci = t.id COLLATE utf8mb4_unicode_ci AND l.document_type = 'these'
    LEFT JOIN memoires m ON l.academic_document_id COLLATE utf8mb4_unicode_ci = m.id COLLATE utf8mb4_unicode_ci AND l.document_type = 'memoire'
    LEFT JOIN stage_reports s ON l.academic_document_id COLLATE utf8mb4_unicode_ci = s.id COLLATE utf8mb4_unicode_ci AND l.document_type = 'rapport_stage'
    LEFT JOIN penalty_settings ps ON ps.document_type COLLATE utf8mb4_unicode_ci = COALESCE(l.document_type, 'book') COLLATE utf8mb4_unicode_ci AND ps.is_active = 1
    WHERE 1=1
  `;
  const params: any[] = [];

  if (filters?.user_id) {
    query += ' AND l.user_id = ?';
    params.push(filters.user_id);
  }

  if (filters?.book_id) {
    query += ' AND l.book_id = ?';
    params.push(filters.book_id);
  }

  if (filters?.academic_document_id) {
    query += ' AND l.academic_document_id = ?';
    params.push(filters.academic_document_id);
  }

  if (filters?.document_type) {
    query += ' AND l.document_type = ?';
    params.push(filters.document_type);
  }

  if (filters?.status) {
    query += ' AND l.status = ?';
    params.push(filters.status);
  }

  query += ' ORDER BY l.created_at DESC';

  const results = await executeQuery(query, params) as any[];

  return results.map(row => ({
    id: row.id,
    user_id: row.user_id,
    book_id: row.book_id,
    academic_document_id: row.academic_document_id,
    document_type: row.document_type || 'book',
    loan_date: row.loan_date,
    due_date: row.due_date,
    return_date: row.return_date,
    status: row.status,
    created_at: row.created_at,
    updated_at: row.updated_at,
    user_name: row.user_name || '',
    user_email: row.user_email || '',
    user_barcode: row.user_barcode || '',
    book_title: row.book_title || '',
    book_author: row.book_author || '',
    book_mfn: row.book_mfn || '',
    academic_title: row.academic_title || '',
    academic_author: row.academic_author || '',
    academic_degree: row.academic_degree || '',
    days_overdue: row.days_overdue || 0,
    effective_days_overdue: row.effective_days_overdue || 0,
    // Champs de pénalités
    fine_amount: row.fine_amount ? parseFloat(row.fine_amount) : 0,
    fine_paid: Boolean(row.fine_paid),
    fine_calculated_date: row.fine_calculated_date,
    daily_fine_rate: row.daily_fine_rate ? parseFloat(row.daily_fine_rate) : 0
  }));
};

// Thèses
export const getTheses = async (filters?: {
  search?: string;
  degree?: string;
  year?: number;
  university?: string;
}): Promise<Thesis[]> => {
  let query = 'SELECT * FROM theses WHERE 1=1';
  const params: any[] = [];

  if (filters?.search) {
    query += ' AND (title LIKE ? OR main_author LIKE ? OR director LIKE ?)';
    const searchTerm = `%${filters.search}%`;
    params.push(searchTerm, searchTerm, searchTerm);
  }

  if (filters?.degree) {
    query += ' AND target_degree = ?';
    params.push(filters.degree);
  }

  if (filters?.year) {
    query += ' AND defense_year = ?';
    params.push(filters.year);
  }

  if (filters?.university) {
    query += ' AND university LIKE ?';
    params.push(`%${filters.university}%`);
  }

  query += ' ORDER BY defense_year DESC, title';

  const results = await executeQuery(query, params) as Thesis[];
  return results.map(thesis => ({
    ...thesis,
    keywords: thesis.keywords ? JSON.parse(thesis.keywords as any) : [],
    keywords_en: thesis.keywords_en ? JSON.parse(thesis.keywords_en as any) : []
  }));
};

export const getThesisById = async (id: string): Promise<Thesis | null> => {
  const results = await executeQuery(`
    SELECT
      t.*,
      COALESCE(active_loans.loan_count, 0) as current_loans,
      COALESCE(active_reservations.reservation_count, 0) as current_reservations,
      GREATEST(0, 1 - COALESCE(active_loans.loan_count, 0) - COALESCE(active_reservations.reservation_count, 0)) as calculated_available_copies,
      CASE
        WHEN GREATEST(0, 1 - COALESCE(active_loans.loan_count, 0) - COALESCE(active_reservations.reservation_count, 0)) > 0 THEN 'available'
        WHEN COALESCE(active_loans.loan_count, 0) > 0 THEN 'borrowed'
        WHEN COALESCE(active_reservations.reservation_count, 0) > 0 THEN 'reserved'
        ELSE 'unavailable'
      END as calculated_status
    FROM theses t
    LEFT JOIN (
      SELECT academic_document_id, COUNT(*) as loan_count
      FROM loans
      WHERE status IN ('active', 'overdue') AND document_type = 'these'
      GROUP BY academic_document_id
    ) active_loans ON CAST(t.id AS CHAR CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci) = active_loans.academic_document_id
    LEFT JOIN (
      SELECT academic_document_id, COUNT(*) as reservation_count
      FROM reservations
      WHERE status = 'active' AND document_type = 'these'
      GROUP BY academic_document_id
    ) active_reservations ON CAST(t.id AS CHAR CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci) = active_reservations.academic_document_id
    WHERE t.id = ?
  `, [id]) as Thesis[];

  if (results.length === 0) return null;

  const thesis = results[0];
  return {
    ...thesis,
    keywords: thesis.keywords ? JSON.parse(thesis.keywords as any) : [],
    keywords_en: thesis.keywords_en ? JSON.parse(thesis.keywords_en as any) : [],
    // Clean up 'NULL' string values
    document_path: thesis.document_path === 'NULL' ? undefined : thesis.document_path,
    // Utiliser les valeurs calculées
    available_copies: (thesis as any).calculated_available_copies,
    status: (thesis as any).calculated_status
  };
};

// Mémoires
export const getMemoires = async (filters?: {
  search?: string;
  degree_level?: string;
  field?: string;
  university?: string;
  year?: string;
}): Promise<Memoire[]> => {
  let query = 'SELECT * FROM memoires WHERE 1=1';
  const params: any[] = [];

  if (filters?.search) {
    query += ' AND (title LIKE ? OR main_author LIKE ? OR supervisor LIKE ?)';
    const searchTerm = `%${filters.search}%`;
    params.push(searchTerm, searchTerm, searchTerm);
  }

  if (filters?.degree_level) {
    query += ' AND degree_level = ?';
    params.push(filters.degree_level);
  }

  if (filters?.field) {
    query += ' AND field_of_study LIKE ?';
    params.push(`%${filters.field}%`);
  }

  if (filters?.university) {
    query += ' AND university LIKE ?';
    params.push(`%${filters.university}%`);
  }

  if (filters?.year) {
    query += ' AND academic_year = ?';
    params.push(filters.year);
  }

  query += ' ORDER BY defense_date DESC, title';

  const results = await executeQuery(query, params) as Memoire[];
  return results.map(memoire => ({
    ...memoire,
    keywords: memoire.keywords ? JSON.parse(memoire.keywords as any) : []
  }));
};

export const getMemoireById = async (id: string): Promise<Memoire | null> => {
  const results = await executeQuery(`
    SELECT
      m.*,
      COALESCE(active_loans.loan_count, 0) as current_loans,
      COALESCE(active_reservations.reservation_count, 0) as current_reservations,
      GREATEST(0, 1 - COALESCE(active_loans.loan_count, 0) - COALESCE(active_reservations.reservation_count, 0)) as calculated_available_copies,
      CASE
        WHEN GREATEST(0, 1 - COALESCE(active_loans.loan_count, 0) - COALESCE(active_reservations.reservation_count, 0)) > 0 THEN 'available'
        WHEN COALESCE(active_loans.loan_count, 0) > 0 THEN 'borrowed'
        WHEN COALESCE(active_reservations.reservation_count, 0) > 0 THEN 'reserved'
        ELSE 'unavailable'
      END as calculated_status
    FROM memoires m
    LEFT JOIN (
      SELECT academic_document_id, COUNT(*) as loan_count
      FROM loans
      WHERE status IN ('active', 'overdue') AND document_type = 'memoire'
      GROUP BY academic_document_id
    ) active_loans ON CAST(m.id AS CHAR CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci) = active_loans.academic_document_id
    LEFT JOIN (
      SELECT academic_document_id, COUNT(*) as reservation_count
      FROM reservations
      WHERE status = 'active' AND document_type = 'memoire'
      GROUP BY academic_document_id
    ) active_reservations ON CAST(m.id AS CHAR CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci) = active_reservations.academic_document_id
    WHERE m.id = ?
  `, [id]) as Memoire[];

  if (results.length === 0) return null;

  const memoire = results[0];
  return {
    ...memoire,
    keywords: memoire.keywords ? JSON.parse(memoire.keywords as any) : [],
    // Clean up 'NULL' string values
    document_path: memoire.document_path === 'NULL' ? undefined : memoire.document_path,
    // Utiliser les valeurs calculées
    available_copies: (memoire as any).calculated_available_copies,
    status: (memoire as any).calculated_status
  };
};

// Rapports de stage
export const getStageReports = async (filters?: {
  search?: string;
  stage_type?: string;
  degree_level?: string;
  field?: string;
  university?: string;
  company?: string;
  year?: string;
}): Promise<StageReport[]> => {
  let query = 'SELECT * FROM stage_reports WHERE 1=1';
  const params: any[] = [];

  if (filters?.search) {
    query += ' AND (title LIKE ? OR student_name LIKE ? OR company_name LIKE ?)';
    const searchTerm = `%${filters.search}%`;
    params.push(searchTerm, searchTerm, searchTerm);
  }

  if (filters?.stage_type) {
    query += ' AND stage_type = ?';
    params.push(filters.stage_type);
  }

  if (filters?.degree_level) {
    query += ' AND degree_level = ?';
    params.push(filters.degree_level);
  }

  if (filters?.field) {
    query += ' AND field_of_study LIKE ?';
    params.push(`%${filters.field}%`);
  }

  if (filters?.university) {
    query += ' AND university LIKE ?';
    params.push(`%${filters.university}%`);
  }

  if (filters?.company) {
    query += ' AND company_name LIKE ?';
    params.push(`%${filters.company}%`);
  }

  if (filters?.year) {
    query += ' AND academic_year = ?';
    params.push(filters.year);
  }

  query += ' ORDER BY defense_date DESC, stage_end_date DESC, title';

  const results = await executeQuery(query, params) as StageReport[];
  return results.map(report => ({
    ...report,
    keywords: report.keywords ? JSON.parse(report.keywords as any) : []
  }));
};

export const getStageReportById = async (id: string): Promise<StageReport | null> => {
  const results = await executeQuery(`
    SELECT
      s.*,
      COALESCE(active_loans.loan_count, 0) as current_loans,
      COALESCE(active_reservations.reservation_count, 0) as current_reservations,
      GREATEST(0, 1 - COALESCE(active_loans.loan_count, 0) - COALESCE(active_reservations.reservation_count, 0)) as calculated_available_copies,
      CASE
        WHEN GREATEST(0, 1 - COALESCE(active_loans.loan_count, 0) - COALESCE(active_reservations.reservation_count, 0)) > 0 THEN 'available'
        WHEN COALESCE(active_loans.loan_count, 0) > 0 THEN 'borrowed'
        WHEN COALESCE(active_reservations.reservation_count, 0) > 0 THEN 'reserved'
        ELSE 'unavailable'
      END as calculated_status
    FROM stage_reports s
    LEFT JOIN (
      SELECT academic_document_id, COUNT(*) as loan_count
      FROM loans
      WHERE status IN ('active', 'overdue') AND document_type = 'rapport_stage'
      GROUP BY academic_document_id
    ) active_loans ON CAST(s.id AS CHAR CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci) = active_loans.academic_document_id
    LEFT JOIN (
      SELECT academic_document_id, COUNT(*) as reservation_count
      FROM reservations
      WHERE status = 'active' AND document_type = 'rapport_stage'
      GROUP BY academic_document_id
    ) active_reservations ON CAST(s.id AS CHAR CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci) = active_reservations.academic_document_id
    WHERE s.id = ?
  `, [id]) as StageReport[];

  if (results.length === 0) return null;

  const report = results[0];
  return {
    ...report,
    keywords: report.keywords ? JSON.parse(report.keywords as any) : [],
    // Clean up 'NULL' string values
    document_path: report.document_path === 'NULL' ? undefined : report.document_path,
    // Utiliser les valeurs calculées
    available_copies: (report as any).calculated_available_copies,
    status: (report as any).calculated_status
  };
};

// Documents académiques (requête directe pour éviter les problèmes de collation)
export const getAcademicDocuments = async (filters?: {
  search?: string;
  document_type?: 'these' | 'memoire' | 'rapport_stage';
  university?: string;
  year?: number;
  has_file?: boolean;
  available_only?: boolean;
}): Promise<AcademicDocument[]> => {
  const results: AcademicDocument[] = [];

  // Construire les requêtes pour chaque type de document
  const queries: { type: string; query: string; params: any[] }[] = [];

  if (!filters?.document_type || filters.document_type === 'these') {
    let theseQuery = `
      SELECT
        'these' as document_type,
        id,
        title,
        main_author as author,
        director as supervisor,
        target_degree as degree,
        specialty,
        defense_year as year,
        defense_date,
        university,
        faculty,
        document_path,
        document_type as file_type,
        document_size,
        is_accessible,
        available_copies,
        total_copies,
        created_at
      FROM theses WHERE 1=1
    `;
    const theseParams: any[] = [];

    if (filters?.search) {
      theseQuery += ' AND (title LIKE ? OR main_author LIKE ? OR director LIKE ?)';
      const searchTerm = `%${filters.search}%`;
      theseParams.push(searchTerm, searchTerm, searchTerm);
    }

    if (filters?.university) {
      theseQuery += ' AND university LIKE ?';
      theseParams.push(`%${filters.university}%`);
    }

    if (filters?.year) {
      theseQuery += ' AND defense_year = ?';
      theseParams.push(filters.year);
    }

    if (filters?.has_file !== undefined) {
      if (filters.has_file) {
        theseQuery += ' AND document_path IS NOT NULL';
      } else {
        theseQuery += ' AND document_path IS NULL';
      }
    }

    if (filters?.available_only) {
      theseQuery += ' AND available_copies > 0';
    }

    queries.push({ type: 'these', query: theseQuery, params: theseParams });
  }

  if (!filters?.document_type || filters.document_type === 'memoire') {
    let memoireQuery = `
      SELECT
        'memoire' as document_type,
        id,
        title,
        main_author as author,
        supervisor,
        degree_level as degree,
        specialty,
        academic_year as year,
        defense_date,
        university,
        faculty,
        document_path,
        document_type as file_type,
        document_size,
        is_accessible,
        available_copies,
        total_copies,
        created_at
      FROM memoires WHERE 1=1
    `;
    const memoireParams: any[] = [];

    if (filters?.search) {
      memoireQuery += ' AND (title LIKE ? OR main_author LIKE ? OR supervisor LIKE ?)';
      const searchTerm = `%${filters.search}%`;
      memoireParams.push(searchTerm, searchTerm, searchTerm);
    }

    if (filters?.university) {
      memoireQuery += ' AND university LIKE ?';
      memoireParams.push(`%${filters.university}%`);
    }

    if (filters?.year) {
      memoireQuery += ' AND YEAR(defense_date) = ?';
      memoireParams.push(filters.year);
    }

    if (filters?.has_file !== undefined) {
      if (filters.has_file) {
        memoireQuery += ' AND document_path IS NOT NULL';
      } else {
        memoireQuery += ' AND document_path IS NULL';
      }
    }

    if (filters?.available_only) {
      memoireQuery += ' AND available_copies > 0';
    }

    queries.push({ type: 'memoire', query: memoireQuery, params: memoireParams });
  }

  if (!filters?.document_type || filters.document_type === 'rapport_stage') {
    let stageQuery = `
      SELECT
        'rapport_stage' as document_type,
        id,
        title,
        student_name as author,
        supervisor,
        degree_level as degree,
        specialty,
        academic_year as year,
        defense_date,
        university,
        faculty,
        document_path,
        document_type as file_type,
        document_size,
        is_accessible,
        available_copies,
        total_copies,
        created_at,
        updated_at
      FROM stage_reports WHERE 1=1
    `;
    const stageParams: any[] = [];

    if (filters?.search) {
      stageQuery += ' AND (title LIKE ? OR student_name LIKE ? OR supervisor LIKE ?)';
      const searchTerm = `%${filters.search}%`;
      stageParams.push(searchTerm, searchTerm, searchTerm);
    }

    if (filters?.university) {
      stageQuery += ' AND university LIKE ?';
      stageParams.push(`%${filters.university}%`);
    }

    if (filters?.year) {
      stageQuery += ' AND YEAR(defense_date) = ?';
      stageParams.push(filters.year);
    }

    if (filters?.has_file !== undefined) {
      if (filters.has_file) {
        stageQuery += ' AND document_path IS NOT NULL';
      } else {
        stageQuery += ' AND document_path IS NULL';
      }
    }

    if (filters?.available_only) {
      stageQuery += ' AND available_copies > 0';
    }

    queries.push({ type: 'rapport_stage', query: stageQuery, params: stageParams });
  }

  // Exécuter toutes les requêtes
  for (const { query, params } of queries) {
    const queryResults = await executeQuery(query, params) as any[];
    results.push(...queryResults);
  }

  // Trier par date de création (plus récent en premier)
  results.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  return results;
};

// Statistiques par université
export const getUniversityStats = async (): Promise<UniversityStats[]> => {
  return await executeQuery('SELECT * FROM university_stats') as UniversityStats[];
};

// Statistiques
export const getLibraryStats = async (): Promise<LibraryStats> => {
  try {
    // Mettre à jour automatiquement les statuts en retard avant de calculer les statistiques
    await updateOverdueLoansInDB();

    // Calculer toutes les statistiques en parallèle pour optimiser les performances
    const [
      booksCount,
      usersCount,
      thesesCount,
      memoiresCount,
      stageReportsCount,
      activeLoansCount,
      overdueLoansCount,
      copiesStats,
      thesesWithDocs,
      memoiresWithDocs,
      stageReportsWithDocs
    ] = await Promise.all([
      executeQuery('SELECT COUNT(*) as count FROM books'),
      executeQuery('SELECT COUNT(*) as count FROM users WHERE is_active = TRUE'),
      executeQuery('SELECT COUNT(*) as count FROM theses'),
      executeQuery('SELECT COUNT(*) as count FROM memoires'),
      executeQuery('SELECT COUNT(*) as count FROM stage_reports'),
      executeQuery('SELECT COUNT(*) as count FROM loans WHERE status = ?', ['active']),
      executeQuery('SELECT COUNT(*) as count FROM loans WHERE status = ?', ['overdue']),
      executeQuery('SELECT SUM(total_copies) as total, SUM(available_copies) as available FROM books'),
      executeQuery('SELECT COUNT(*) as count FROM theses WHERE document_path IS NOT NULL AND document_path != ""'),
      executeQuery('SELECT COUNT(*) as count FROM memoires WHERE document_path IS NOT NULL AND document_path != ""'),
      executeQuery('SELECT COUNT(*) as count FROM stage_reports WHERE document_path IS NOT NULL AND document_path != ""')
    ]);

    // Extraire les résultats avec gestion des valeurs nulles
    const books = (booksCount as any[])[0]?.count || 0;
    const users = (usersCount as any[])[0]?.count || 0;
    const theses = (thesesCount as any[])[0]?.count || 0;
    const memoires = (memoiresCount as any[])[0]?.count || 0;
    const stageReports = (stageReportsCount as any[])[0]?.count || 0;
    const activeLoans = (activeLoansCount as any[])[0]?.count || 0;
    const overdueLoans = (overdueLoansCount as any[])[0]?.count || 0;
    const copies = (copiesStats as any[])[0] || { total: 0, available: 0 };
    const thesesDocs = (thesesWithDocs as any[])[0]?.count || 0;
    const memoiresDocs = (memoiresWithDocs as any[])[0]?.count || 0;
    const stageReportsDocs = (stageReportsWithDocs as any[])[0]?.count || 0;

    return {
      total_books: books,
      total_copies: copies.total || 0,
      available_copies: copies.available || 0,
      active_users: users,
      active_loans: activeLoans,
      overdue_loans: overdueLoans,
      total_theses: theses,
      total_memoires: memoires,
      total_stage_reports: stageReports,
      theses_with_documents: thesesDocs,
      memoires_with_documents: memoiresDocs,
      stage_reports_with_documents: stageReportsDocs
    };
  } catch (error) {
    console.error('[XCircle] Erreur lors du calcul des statistiques:', error);
    // Retourner des valeurs par défaut en cas d'erreur
    return {
      total_books: 0,
      total_copies: 0,
      available_copies: 0,
      active_users: 0,
      active_loans: 0,
      overdue_loans: 0,
      total_theses: 0,
      total_memoires: 0,
      total_stage_reports: 0,
      theses_with_documents: 0,
      memoires_with_documents: 0,
      stage_reports_with_documents: 0
    };
  }
};

// Fonction pour tester la connexion
export const testConnection = async (): Promise<boolean> => {
  try {
    await executeQuery('SELECT 1');
    return true;
  } catch (error) {
    console.error('Erreur de connexion MySQL:', error);
    return false;
  }
};

// Fonction pour fermer le pool de connexions
export const closePool = async () => {
  if (pool) {
    await pool.end();
    pool = null;
  }
};


// Fonction pour forcer la recréation du pool (utile après changement de config)
export const resetPool = () => {
  if (pool) {
    pool.end();
    pool = null;
  }
  return createPool();
};



export default {
  executeQuery,
  executeTransaction,
  getBooks,
  getBookById,
  getUsers,
  getUserById,
  getLoans,
  getTheses,
  getThesisById,
  getMemoires,
  getMemoireById,
  getStageReports,
  getStageReportById,
  getAcademicDocuments,
  getUniversityStats,
  getLibraryStats,
  testConnection,
  closePool
};
