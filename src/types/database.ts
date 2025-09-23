// Types pour les réponses de base de données MySQL

export interface DatabaseBook {
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
  price?: number;
  domain?: string;
  collection?: string;
  summary?: string;
  abstract?: string;
  keywords?: string; // JSON string
  keywords_en?: string; // JSON string
  dewey_classification?: string;
  cdu_classification?: string;
  subject_headings?: string; // JSON string
  document_path?: string;
  file_type?: string;
  document_size?: number;
  digital_versions?: string; // JSON string
  has_digital_version?: boolean;
  available_copies: number;
  total_copies: number;
  created_at: string;
  updated_at: string;
}

export interface DatabaseUser {
  id: string;
  email: string;
  full_name: string;
  barcode: string;
  phone?: string;
  address?: string;
  is_active: boolean;
  max_loans: number;
  max_reservations: number;
  created_at: string;
  updated_at: string;
}

export interface DatabaseLoan {
  id: string;
  user_id: string;
  book_id: string;
  loan_date: string;
  due_date: string;
  return_date?: string;
  status: 'active' | 'overdue' | 'returned';
  created_at: string;
  updated_at: string;
}

export interface DatabaseThesis {
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
  keywords?: string; // JSON string
  abstract?: string;
  keywords_en?: string; // JSON string
  document_path?: string;
  document_type?: 'pdf' | 'doc' | 'docx';
  document_size?: number;
  is_accessible: boolean;
  created_at: string;
  updated_at: string;
}

// Types pour les jointures
export interface LoanWithDetails extends DatabaseLoan {
  user_name: string;
  user_email: string;
  user_barcode: string;
  book_title: string;
  book_author: string;
  book_mfn: string;
  academic_title?: string;
  academic_author?: string;
  academic_degree?: string;
  days_overdue?: number;
  effective_days_overdue?: number;
  has_unpaid_penalties?: number; // 1 si l'utilisateur a des pénalités impayées, 0 sinon
}

export interface UserWithLoans extends DatabaseUser {
  active_loans_count?: number;
  total_loans_count?: number;
}

export interface DatabaseReservation {
  id: string;
  user_id: string;
  book_id?: string;
  academic_document_id?: string;
  document_type: 'book' | 'these' | 'memoire' | 'rapport_stage';
  reservation_date: string;
  expiry_date: string;
  status: 'active' | 'fulfilled' | 'expired' | 'cancelled';
  priority_order: number;
  notification_sent: boolean;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface ReservationWithDetails extends DatabaseReservation {
  user_name: string;
  user_email: string;
  user_barcode: string;
  book_title?: string;
  book_author?: string;
  book_mfn?: string;
  academic_title?: string;
  academic_author?: string;
  academic_degree?: string;
  days_until_expiry: number;
  priority?: string;
}

// Types pour les requêtes de mise à jour
export type UpdateFields = Record<string, unknown>;
export type QueryParams = unknown[];

// Types pour CAMES/DICAMES
export interface DublinCoreMetadata {
  title: string;
  creator: string;
  subject?: string[];
  description?: string;
  publisher?: string;
  contributor?: string;
  date?: string;
  type: string;
  format: string;
  identifier: string;
  source?: string;
  language: string;
  relation?: string;
  coverage?: string;
  rights: string;
  // Éléments qualifiés DCTERMS
  abstract?: string;
  bibliographicCitation?: string;
  created?: string;
  educationLevel?: string;
  extent?: string;
  issued?: string;
  modified?: string;
  spatial?: string;
  audience?: string;
}

export interface DicamesDocument {
  metadata: DublinCoreMetadata & {
    // Extensions CAMES spécifiques
    'dicames:institution': string;
    'dicames:country': string;
    'dicames:discipline': string;
    'dicames:degree': string;
    'dicames:supervisor': string;
    'dicames:coSupervisor'?: string;
    'dicames:defenseDate'?: string;
    'dicames:faculty'?: string;
    'dicames:department'?: string;
    'dicames:keywords_fr'?: string[];
    'dicames:keywords_en'?: string[];
    'dicames:abstract_fr'?: string;
    'dicames:abstract_en'?: string;
  };
  files: {
    primary: {
      filename: string;
      format: string;
      size: number;
      checksum: string;
      url?: string;
    };
    supplementary?: Array<{
      filename: string;
      format: string;
      size: number;
      description?: string;
    }>;
  };
  access: {
    level: 'open' | 'restricted' | 'embargo';
    embargoDate?: string;
    conditions?: string;
  };
}

export interface OaiPmhRecord {
  identifier: string;
  datestamp: string;
  setSpec: string;
  metadata: DublinCoreMetadata | DicamesDocument['metadata'];
  about?: string;
}

// Types pour les résultats de requêtes MySQL
export type QueryResult<T = any> = T[];

// Types pour les statistiques
export interface LibraryStats {
  total_books: number;
  total_users: number;
  total_loans: number;
  total_theses: number;
  total_memoires: number;
  total_stage_reports: number;
  active_loans: number;
  overdue_loans: number;
  available_books: number;
  active_users: number;
}

// Types unifiés pour les documents
export type DocumentType = 'book' | 'these' | 'memoire' | 'rapport_stage';
export type AcademicDocumentType = 'these' | 'memoire' | 'rapport_stage';

// Types pour les formats d'export
export type ExportFormat = 'marc21-xml' | 'dublin-core-xml' | 'dublin-core-json' | 'json-ld' | 'csv' | 'json';

// Types pour les rôles utilisateurs
export type UserRole = 'admin' | 'bibliothecaire' | 'enregistrement' | 'user';

// Types pour les statuts
export type LoanStatus = 'active' | 'returned' | 'overdue' | 'lost';
export type ReservationStatus = 'active' | 'fulfilled' | 'expired' | 'cancelled';
export type DocumentStatus = 'available' | 'borrowed' | 'reserved' | 'maintenance' | 'lost';
