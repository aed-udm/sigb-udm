import { z } from 'zod'

// Book validation schema - Conforme aux standards bibliographiques internationaux
export const bookSchema = z.object({
  // Identifiants standardisés
  id: z.string().uuid().optional(),
  mfn: z.string().min(1, 'Le MFN est requis'),
  barcode: z.string().optional(),
  cames_id: z.string().optional(),
  local_id: z.string().optional(),
  handle: z.string().optional(),
  isbn: z.string().optional().refine((val) => !val || /^(?:\d{9}[\dX]|\d{13})$/.test(val.replace(/-/g, '')), {
    message: 'ISBN invalide (format: 978-2-1234-5678-9 ou 2-1234-5678-X)'
  }),
  title: z.string().min(1, 'Le titre est requis'),
  subtitle: z.string().optional(),
  parallel_title: z.string().optional(),
  main_author: z.string().min(1, 'L\'auteur principal est requis'),
  secondary_author: z.string().optional(),
  edition: z.string().optional(),
  publication_city: z.string().optional(),
  publisher: z.string().optional(),
  publication_year: z.number().int().min(1000).max(new Date().getFullYear()).optional(),
  acquisition_mode: z.string().optional(),
  price: z.number().min(0).optional(),
  domain: z.string().optional(),
  collection: z.string().optional(),
  summary: z.string().optional(),
  abstract: z.string().optional(),
  keywords: z.array(z.string()).optional(),
  keywords_en: z.union([
    z.array(z.string()),
    z.string()
  ]).optional().transform((val) => {
    // Convertir string en array si nécessaire
    if (typeof val === 'string') {
      return val.split(';').map(k => k.trim()).filter(k => k.length > 0);
    }
    return val;
  }),
  // Classification documentaire
  dewey_classification: z.string().optional().refine((val) => !val || /^\d{3}(\.\d+)?(\s*-\s*.+)?$/.test(val), {
    message: 'Classification Dewey invalide (format: 004, 004.6, ou 004 - Informatique)'
  }),
  cdu_classification: z.string().optional(),
  subject_headings: z.array(z.string()).optional(),
  // Gestion des exemplaires
  total_copies: z.number().int().min(1, 'Le nombre de copies doit être au moins 1'),
  available_copies: z.number().int().min(0),
  // Champs pour les fichiers numériques
  document_path: z.string().optional(),
  file_type: z.string().optional(),
  document_size: z.number().optional(),
  // Champs supplémentaires de la DB
  digital_versions: z.any().optional(), // JSON object
  has_digital_version: z.boolean().optional(),
  // Nouveaux champs pour les filtres avancés (déjà dans la DB)
  language: z.string().default('fr'),
  format: z.enum(['print','digital','ebook','audiobook','hardcover','paperback','pocket','large_print','braille','multimedia']).default('print'),
  target_audience: z.enum(['general','beginner','intermediate','advanced','children','young_adult','adult','professional','academic','researcher']).default('general'),
  physical_location: z.string().optional(),
  status: z.enum(['available','borrowed','reserved','lost','damaged','withdrawn','not_for_loan','in_transit','in_processing','missing']).default('available'),
  view_count: z.number().int().min(0).default(0),
})

export type BookFormData = z.infer<typeof bookSchema>

// Academic document validation schema (unified for theses, memoires, stage reports)
// Conforme aux normes CAMES/DICAMES
export const thesisSchema = z.object({
  // Identifiants standardisés
  id: z.string().uuid().optional(),
  barcode: z.string().optional(),
  cames_id: z.string().optional(),
  local_id: z.string().optional(),
  handle: z.string().optional(),
  doi: z.string().optional(),
  main_author: z.string().min(1, 'L\'auteur principal est requis'),
  director: z.string().min(1, 'Le directeur/superviseur est requis'),
  co_director: z.string().optional(),
  co_supervisor: z.string().optional(),
  title: z.string().min(1, 'Le titre est requis'),
  target_degree: z.string().min(1, 'Le diplôme/niveau est requis'),
  specialty: z.string().optional(),
  defense_year: z.number().int().min(1900).max(new Date().getFullYear()),
  academic_year: z.string().optional(),
  defense_date: z.string().min(1, 'Date de dépôt requise (format YYYY-MM-DD)'),
  university: z.string().default('Université des Montagnes'),
  faculty: z.string().optional(),
  department: z.string().optional(),
  pagination: z.string().optional(),
  // Résumés bilingues obligatoires (CAMES)
  summary: z.string().min(100, 'Résumé français requis (minimum 100 caractères)'),
  abstract: z.string().min(100, 'Résumé anglais requis (minimum 100 caractères)'),
  keywords: z.array(z.string()).min(3, 'Au moins 3 mots-clés français requis'),
  keywords_en: z.array(z.string()).min(3, 'Au moins 3 mots-clés anglais requis'),
  // Métadonnées CAMES étendues
  institution: z.string().default('Université des Montagnes'),
  country: z.string().default('Cameroun'),
  language: z.enum(['fr', 'en', 'both']).default('fr'),
  // Classification documentaire
  dewey_classification: z.string().optional(),
  cdu_classification: z.string().optional(),
  subject_headings: z.array(z.string()).optional(),
  // Droits et accès
  access_rights: z.enum(['open', 'restricted', 'embargo']).default('open'),
  embargo_date: z.string().optional(),
  license: z.enum(['CC-BY', 'CC-BY-SA', 'All Rights Reserved']).default('CC-BY'),
  // Fichiers
  document_path: z.string().optional(),
  document_type: z.union([
    z.enum(['pdf', 'doc', 'docx']),
    z.enum(['these', 'memoire', 'rapport_stage'])
  ]).optional(),
  document_size: z.number().optional(),
  is_accessible: z.boolean().default(true),
  // Validation PDF/A pour DICAMES
  is_pdfa_compliant: z.boolean().default(false),
  // Nouveaux champs pour les filtres avancés (déjà dans la DB)
  format: z.enum(['print','digital','pdf','bound','electronic','multimedia']).default('print'),
  target_audience: z.enum(['undergraduate','graduate','postgraduate','researcher','professional','academic']).default('graduate'),
  physical_location: z.string().optional(),
  status: z.enum(['available','borrowed','reserved','lost','damaged','withdrawn','not_for_loan','in_transit','in_processing','missing']).default('available'),
  view_count: z.number().int().min(0).default(0),
  // Champs spécifiques aux mémoires (pour le formulaire unifié)
  methodology: z.string().optional(),
  conclusion: z.string().optional(),
  grade: z.number().min(0).max(20).optional(),
  mention: z.enum(['Passable','Assez Bien','Bien','Très Bien','Excellent']).optional(),
  // Champs spécifiques aux rapports de stage (pour le formulaire unifié)
  objectives: z.string().optional(),
  tasks_performed: z.string().optional(),
  skills_acquired: z.string().optional(),
  recommendations: z.string().optional(),
  stage_start_date: z.string().optional(),
  stage_end_date: z.string().optional(),
  stage_duration: z.number().optional(),
  company_name: z.string().optional(),
  company_address: z.string().optional(),
  company_sector: z.string().optional(),
  company_supervisor: z.string().optional(),
  student_id: z.string().optional(),
  stage_type: z.enum(['Observation','Application','Perfectionnement','Pré-emploi']).optional(),
})

export type ThesisFormData = z.infer<typeof thesisSchema>

// Memoire validation schema (basé sur thesisSchema mais avec des champs spécifiques)
export const memoireSchema = z.object({
  // Identifiants standardisés
  id: z.string().uuid().optional(),
  barcode: z.string().optional(),
  cames_id: z.string().optional(),
  local_id: z.string().optional(),
  handle: z.string().optional(),
  main_author: z.string().min(1, 'L\'auteur principal est requis'),
  supervisor: z.string().min(1, 'Le superviseur est requis'),
  co_supervisor: z.string().optional(),
  title: z.string().min(1, 'Le titre est requis'),
  degree_level: z.enum(['Licence','Master 1','Master 2','Ingénieur']).default('Master 1'),
  field_of_study: z.string().min(1, 'La filière d\'études est requise'),
  specialty: z.string().optional(),
  academic_year: z.string().optional(),
  defense_date: z.string().optional(),
  university: z.string().default('Université des Montagnes'),
  faculty: z.string().min(1, 'La faculté est requise'),
  department: z.string().optional(),
  pagination: z.string().optional(),
  summary: z.string().min(100, 'Résumé requis (minimum 100 caractères)'),
  keywords: z.array(z.string()).min(3, 'Au moins 3 mots-clés requis'),
  methodology: z.string().optional(),
  conclusion: z.string().optional(),
  grade: z.number().min(0).max(20).optional(),
  mention: z.enum(['Passable','Assez Bien','Bien','Très Bien','Excellent']).optional(),
  document_path: z.string().optional(),
  document_type: z.union([
    z.enum(['pdf', 'doc', 'docx']),
    z.enum(['these', 'memoire', 'rapport_stage'])
  ]).optional(),
  document_size: z.number().optional(),
  is_accessible: z.boolean().default(true),
  language: z.string().default('fr'),
  format: z.enum(['print','digital','pdf','bound','electronic','multimedia']).default('print'),
  target_audience: z.enum(['undergraduate','graduate','postgraduate','researcher','professional','academic']).default('graduate'),
  physical_location: z.string().optional(),
  status: z.enum(['available','borrowed','reserved','lost','damaged','withdrawn','not_for_loan','in_transit','in_processing','missing']).default('available'),
})

export type MemoireFormData = z.infer<typeof memoireSchema>

// Stage Report validation schema
export const stageReportSchema = z.object({
  // Identifiants standardisés
  id: z.string().uuid().optional(),
  barcode: z.string().optional(),
  cames_id: z.string().optional(),
  local_id: z.string().optional(),
  handle: z.string().optional(),
  student_name: z.string().min(1, 'Le nom de l\'étudiant est requis'),
  student_id: z.string().optional(),
  supervisor: z.string().optional(),
  company_supervisor: z.string().optional(),
  title: z.string().min(1, 'Le titre est requis'),
  company_name: z.string().min(1, 'Le nom de l\'entreprise est requis'),
  company_address: z.string().optional(),
  company_sector: z.string().optional(),
  stage_type: z.enum(['Observation','Application','Perfectionnement','Pré-emploi']).default('Application'),
  degree_level: z.enum(['Licence 1','Licence 2','Licence 3','Master 1','Master 2','Ingénieur']).default('Licence 3'),
  field_of_study: z.string().min(1, 'La filière d\'études est requise'),
  specialty: z.string().optional(),
  academic_year: z.string().optional(),
  stage_start_date: z.string().min(1, 'La date de début est requise'),
  stage_end_date: z.string().min(1, 'La date de fin est requise'),
  stage_duration: z.number().optional(),
  defense_date: z.string().optional(),
  university: z.string().default('Université des Montagnes'),
  faculty: z.string().min(1, 'La faculté est requise'),
  department: z.string().optional(),
  pagination: z.string().optional(),
  summary: z.string().min(100, 'Résumé requis (minimum 100 caractères)'),
  objectives: z.string().optional(),
  tasks_performed: z.string().optional(),
  skills_acquired: z.string().optional(),
  recommendations: z.string().optional(),
  keywords: z.array(z.string()).min(3, 'Au moins 3 mots-clés requis'),
  document_path: z.string().optional(),
  document_type: z.union([
    z.enum(['pdf', 'doc', 'docx']),
    z.enum(['these', 'memoire', 'rapport_stage'])
  ]).optional(),
  document_size: z.number().optional(),
  is_accessible: z.boolean().default(true),
  language: z.string().default('fr'),
  format: z.enum(['print','digital','pdf','bound','electronic','multimedia']).default('print'),
  target_audience: z.enum(['undergraduate','graduate','professional','academic']).default('undergraduate'),
  physical_location: z.string().optional(),
  status: z.enum(['available','borrowed','reserved','lost','damaged','withdrawn','not_for_loan','in_transit','in_processing','missing']).default('available'),
})

export type StageReportFormData = z.infer<typeof stageReportSchema>

// User validation schema
export const userSchema = z.object({
  // Identifiants standardisés
  id: z.string().uuid().optional(),
  barcode: z.string().optional(),
  cames_id: z.string().optional(),
  local_id: z.string().optional(),
  handle: z.string().optional(),
  email: z.string().email('Email invalide').optional(),
  full_name: z.string().min(1, 'Le nom complet est requis'),
  matricule: z.string().min(1, 'Le matricule est obligatoire').refine((matricule) => {
    return /^[A-Z0-9]{6,20}$/.test(matricule);
  }, 'Format de matricule invalide (6-20 caractères alphanumériques)'),
  phone: z.string().min(1, 'Le téléphone est obligatoire').refine((phone) => {
    // Validation du format téléphone camerounais: +237 6XX XXX XXX
    return /^(\+237|237)?[6-9]\d{8}$/.test(phone.replace(/\s/g, ''));
  }, 'Format de téléphone camerounais invalide (+237 6XX XXX XXX)'),
  address: z.string().optional(),
  is_active: z.boolean().default(true),
  max_loans: z.number().int().min(1).max(10).default(3),
  max_reservations: z.number().int().min(1).max(10).default(3),
  // Champs pour le PDF académique (optionnels lors de la création)
  academic_documents_pdf_path: z.string().optional(),
  academic_pdf_file_type: z.string().optional(),
  academic_pdf_file_size: z.number().optional(),
  // Nouveaux champs pour les filtres avancés (déjà dans la DB)
  faculty: z.string().optional(),
  user_category: z.enum(['student','teacher','researcher','staff','external','guest','alumni','visitor']).default('student'),
  study_level: z.enum(['L1','L2','L3','M1','M2','PhD','PostDoc','Professor','Researcher','Staff','Other']).optional(),
  department: z.string().optional(),
  account_status: z.enum(['active','suspended','expired','blocked','pending','archived']).default('active'),
  suspension_reason: z.string().optional(),
  expiry_date: z.string().optional(),
  institution: z.string().optional(),
})

export type UserFormData = z.infer<typeof userSchema>

// Loan validation schema
export const loanSchema = z.object({
  user_id: z.string().uuid('ID utilisateur invalide'),
  book_id: z.string().uuid('ID livre invalide').optional(),
  academic_document_id: z.string().uuid('ID document académique invalide').optional(),
  document_type: z.enum(['book', 'these', 'memoire', 'rapport_stage']).default('book'),
  loan_date: z.string().optional(),
  due_date: z.string().min(1, 'La date de retour est requise'),
}).refine(
  (data) => data.book_id || data.academic_document_id,
  {
    message: "Un livre ou un document académique doit être spécifié",
    path: ["book_id"]
  }
).refine(
  (data) => !(data.book_id && data.academic_document_id),
  {
    message: "Seul un livre OU un document académique peut être emprunté à la fois",
    path: ["academic_document_id"]
  }
)

export type LoanFormData = z.infer<typeof loanSchema>

// Reservation validation schema
export const reservationSchema = z.object({
  user_id: z.string().uuid('ID utilisateur invalide'),
  book_id: z.string().uuid('ID livre invalide').optional(),
  academic_document_id: z.string().uuid('ID document académique invalide').optional(),
  document_type: z.enum(['book', 'these', 'memoire', 'rapport_stage']).default('book'),
  reservation_date: z.string().optional(),
  expiry_date: z.string().optional(), // Optionnel car calculé automatiquement si non fourni
  notes: z.string().optional(),
}).refine(
  (data) => data.book_id || data.academic_document_id,
  {
    message: "Un livre ou un document académique doit être spécifié",
    path: ["book_id"]
  }
).refine(
  (data) => !(data.book_id && data.academic_document_id),
  {
    message: "Seul un livre OU un document académique peut être réservé à la fois",
    path: ["academic_document_id"]
  }
)

export type ReservationFormData = z.infer<typeof reservationSchema>

// CAMES/DICAMES Export validation schema
export const dicamesExportSchema = z.object({
  document_ids: z.array(z.string().uuid('ID document invalide')),
  document_type: z.enum(['thesis', 'memoir', 'internship_report']),
  export_format: z.enum(['dublin_core_xml', 'oai_pmh', 'pdf_archive']).default('dublin_core_xml'),
  include_files: z.boolean().default(true),
  validate_pdfa: z.boolean().default(true),
  target_repository: z.enum(['dicames', 'local', 'partner']).default('dicames'),
  metadata_language: z.enum(['fr', 'en', 'both']).default('both'),
  compression: z.boolean().default(false)
})

export type DicamesExportFormData = z.infer<typeof dicamesExportSchema>

// OAI-PMH Request validation schema
export const oaiPmhRequestSchema = z.object({
  verb: z.enum(['Identify', 'ListMetadataFormats', 'ListSets', 'ListIdentifiers', 'ListRecords', 'GetRecord']),
  identifier: z.string().optional(),
  metadataPrefix: z.enum(['oai_dc', 'dicames']).optional(),
  from: z.string().datetime().optional(),
  until: z.string().datetime().optional(),
  set: z.enum(['these', 'memoires', 'rapport_stage', 'books']).optional(),
  resumptionToken: z.string().optional()
})

export type OaiPmhRequestData = z.infer<typeof oaiPmhRequestSchema>

// Search validation schema - SIGB Standards Compliant
export const searchSchema = z.object({
  query: z.string().optional(),
  type: z.enum(['books', 'these', 'memoires', 'rapport_stage', 'users', 'loans', 'all']).optional(),
  filters: z.object({
    // Filtres communs documents
    author: z.string().optional(),
    title: z.string().optional(),
    status: z.enum(['available', 'borrowed', 'reserved', 'lost', 'damaged', 'withdrawn', 'not_for_loan', 'in_transit', 'in_processing', 'missing']).optional(),
    target_audience: z.enum(['general', 'beginner', 'intermediate', 'advanced', 'children', 'young_adult', 'adult', 'professional', 'academic', 'researcher', 'undergraduate', 'graduate', 'postgraduate']).optional(),
    format: z.enum(['print', 'digital', 'ebook', 'audiobook', 'hardcover', 'paperback', 'pocket', 'large_print', 'braille', 'multimedia', 'pdf', 'bound', 'electronic']).optional(),
    language: z.string().optional(),

    // Filtres spécifiques livres
    domain: z.string().optional(),
    dewey_classification: z.string().optional(),
    publisher: z.string().optional(),
    isbn: z.string().optional(),

    // Filtres spécifiques documents académiques
    year: z.number().optional(),
    year_min: z.number().optional(),
    year_max: z.number().optional(),
    degree: z.string().optional(),
    university: z.string().optional(),
    faculty: z.string().optional(),
    specialty: z.string().optional(),
    supervisor: z.string().optional(),
    director: z.string().optional(),

    // Filtres spécifiques rapports de stage
    company: z.string().optional(),
    company_supervisor: z.string().optional(),

    // Filtres utilisateurs
    user_category: z.enum(['student', 'teacher', 'researcher', 'staff', 'external', 'guest', 'alumni', 'visitor']).optional(),
    study_level: z.enum(['L1', 'L2', 'L3', 'M1', 'M2', 'PhD', 'PostDoc', 'Professor', 'Researcher', 'Staff', 'Other']).optional(),
    department: z.string().optional(),
    account_status: z.enum(['active', 'suspended', 'expired', 'blocked', 'pending', 'archived']).optional(),

    // Filtres de localisation
    physical_location: z.string().optional(),
    institution: z.string().optional(),

    // Filtres de popularité et date
    view_count_min: z.number().optional(),
    created_after: z.string().optional(),
    created_before: z.string().optional(),

    // Filtres booléens
    has_digital_version: z.boolean().optional(),
    is_accessible: z.boolean().optional(),
    is_active: z.boolean().optional(),
  }).optional(),

  // Options de recherche
  sort_by: z.enum(['relevance', 'title', 'author', 'date', 'popularity', 'created_at']).optional(),
  sort_order: z.enum(['asc', 'desc']).optional(),
  page: z.number().min(1).optional(),
  limit: z.number().min(1).max(100).optional(),

  // Recherche facettée
  facets: z.array(z.enum(['status', 'target_audience', 'format', 'language', 'domain', 'year', 'user_category', 'study_level', 'department'])).optional(),
  include_facets: z.boolean().optional(),
})

export type SearchFormData = z.infer<typeof searchSchema>

// Schéma pour les résultats de recherche facettée
export const facetSchema = z.object({
  field: z.string(),
  values: z.array(z.object({
    value: z.string(),
    count: z.number(),
    label: z.string().optional(),
  })),
})

export type FacetData = z.infer<typeof facetSchema>

// Schéma pour les résultats de recherche
export const searchResultSchema = z.object({
  data: z.array(z.any()),
  total: z.number(),
  page: z.number(),
  limit: z.number(),
  total_pages: z.number(),
  facets: z.array(facetSchema).optional(),
  query_time: z.number().optional(),
  suggestions: z.array(z.string()).optional(),
})

export type SearchResultData = z.infer<typeof searchResultSchema>

// Authentication validation schemas
export const loginSchema = z.object({
  email: z.string().email('Email invalide'),
  password: z.string().min(6, 'Le mot de passe doit contenir au moins 6 caractères'),
})

export type LoginFormData = z.infer<typeof loginSchema>

export const registerSchema = z.object({
  email: z.string().email('Email invalide'),
  password: z.string().min(6, 'Le mot de passe doit contenir au moins 6 caractères'),
  confirmPassword: z.string(),
  full_name: z.string().min(1, 'Le nom complet est requis'),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Les mots de passe ne correspondent pas",
  path: ["confirmPassword"],
})

export type RegisterFormData = z.infer<typeof registerSchema>

// Settings validation schema
export const settingsSchema = z.object({
  app_name: z.string().min(1, 'Le nom de l\'application est requis'),
  loan_duration_days: z.number().int().min(1).max(365).default(21), // 21 jours pour le Cameroun
  max_loans_per_user: z.number().int().min(1).max(20).default(3),
  late_fee_per_day: z.number().min(0).default(100), // 100 FCFA par jour
  email_notifications: z.boolean().default(true),
  sms_notifications: z.boolean().default(false),
})

export type SettingsFormData = z.infer<typeof settingsSchema>
