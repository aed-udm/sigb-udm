/**
 * Dublin Core Metadata Standard Implementation
 * Conforme aux spécifications DCMI (Dublin Core Metadata Initiative)
 */

export interface DublinCoreMetadata {
  // Éléments de base Dublin Core (DC Terms)
  title: string;                    // dc:title
  creator?: string;                 // dc:creator
  subject?: string[];               // dc:subject
  description?: string;             // dc:description
  publisher?: string;               // dc:publisher
  contributor?: string;             // dc:contributor
  date?: string;                    // dc:date
  type: string;                     // dc:type
  format?: string;                  // dc:format
  identifier: string;               // dc:identifier
  source?: string;                  // dc:source
  language: string;                 // dc:language
  relation?: string;                // dc:relation
  coverage?: string;                // dc:coverage
  rights?: string;                  // dc:rights

  // Éléments qualifiés Dublin Core
  abstract?: string;                // dcterms:abstract
  accessRights?: string;            // dcterms:accessRights
  audience?: string;                // dcterms:audience
  available?: string;               // dcterms:available
  bibliographicCitation?: string;   // dcterms:bibliographicCitation
  conformsTo?: string;              // dcterms:conformsTo
  created?: string;                 // dcterms:created
  dateAccepted?: string;            // dcterms:dateAccepted
  dateCopyrighted?: string;         // dcterms:dateCopyrighted
  dateSubmitted?: string;           // dcterms:dateSubmitted
  educationLevel?: string;          // dcterms:educationLevel
  extent?: string;                  // dcterms:extent
  hasFormat?: string;               // dcterms:hasFormat
  hasPart?: string[];               // dcterms:hasPart
  hasVersion?: string;              // dcterms:hasVersion
  isFormatOf?: string;              // dcterms:isFormatOf
  isPartOf?: string;                // dcterms:isPartOf
  isReferencedBy?: string;          // dcterms:isReferencedBy
  isReplacedBy?: string;            // dcterms:isReplacedBy
  isRequiredBy?: string;            // dcterms:isRequiredBy
  issued?: string;                  // dcterms:issued
  isVersionOf?: string;             // dcterms:isVersionOf
  license?: string;                 // dcterms:license
  mediator?: string;                // dcterms:mediator
  medium?: string;                  // dcterms:medium
  modified?: string;                // dcterms:modified
  provenance?: string;              // dcterms:provenance
  references?: string;              // dcterms:references
  replaces?: string;                // dcterms:replaces
  requires?: string;                // dcterms:requires
  rightsHolder?: string;            // dcterms:rightsHolder
  spatial?: string;                 // dcterms:spatial
  tableOfContents?: string;         // dcterms:tableOfContents
  temporal?: string;                // dcterms:temporal
  valid?: string;                   // dcterms:valid
}

/**
 * Types de documents Dublin Core standardisés
 */
export const DC_TYPES = {
  COLLECTION: 'Collection',
  DATASET: 'Dataset',
  EVENT: 'Event',
  IMAGE: 'Image',
  INTERACTIVE_RESOURCE: 'InteractiveResource',
  MOVING_IMAGE: 'MovingImage',
  PHYSICAL_OBJECT: 'PhysicalObject',
  SERVICE: 'Service',
  SOFTWARE: 'Software',
  SOUND: 'Sound',
  STILL_IMAGE: 'StillImage',
  TEXT: 'Text'
} as const;

/**
 * Formats MIME standardisés
 */
export const DC_FORMATS = {
  PDF: 'application/pdf',
  HTML: 'text/html',
  XML: 'application/xml',
  JSON: 'application/json',
  EPUB: 'application/epub+zip',
  MOBI: 'application/x-mobipocket-ebook',
  DOC: 'application/msword',
  DOCX: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
} as const;

/**
 * Convertit un livre vers Dublin Core
 */
export function bookToDublinCore(book: any): DublinCoreMetadata {
  // Traitement des mots-clés
  let subjects = [];
  if (book.keywords) {
    if (Array.isArray(book.keywords)) {
      subjects = book.keywords;
    } else if (typeof book.keywords === 'string') {
      try {
        subjects = JSON.parse(book.keywords);
      } catch {
        subjects = [book.keywords];
      }
    }
  }
  if (book.domain && !subjects.includes(book.domain)) {
    subjects.push(book.domain);
  }

  return {
    title: book.title || 'Titre non spécifié',
    creator: book.main_author,
    subject: subjects.length > 0 ? subjects : undefined,
    description: book.summary || book.abstract || 'Résumé non disponible',
    publisher: book.publisher || 'Université des Montagnes',
    contributor: book.secondary_author,
    date: book.publication_year ? book.publication_year.toString() : new Date().getFullYear().toString(),
    type: DC_TYPES.TEXT,
    format: 'text/plain',
    identifier: book.isbn || book.id?.toString() || 'ID-' + Date.now(),
    language: book.language || 'fr',
    coverage: book.publication_city || 'Bangangté',
    rights: 'Tous droits réservés',

    // Éléments qualifiés
    abstract: book.abstract || book.summary || 'Résumé non disponible',
    bibliographicCitation: generateCitation(book),
    created: book.created_at || new Date().toISOString(),
    extent: book.pagination,
    issued: book.publication_year ? book.publication_year.toString() : new Date().getFullYear().toString(),
    modified: book.updated_at || new Date().toISOString(),
    spatial: 'Cameroun'
  };
}

/**
 * Convertit une thèse vers Dublin Core
 */
export function thesisToDublinCore(thesis: any): DublinCoreMetadata {
  return {
    title: thesis.title,
    creator: thesis.main_author,
    subject: Array.isArray(thesis.keywords) ? thesis.keywords : (thesis.specialty ? [thesis.specialty] : []),
    description: thesis.summary,
    publisher: thesis.university,
    contributor: thesis.director,
    date: thesis.defense_year ? thesis.defense_year.toString() : undefined,
    type: DC_TYPES.TEXT,
    format: 'application/pdf', // Les thèses sont souvent en PDF
    identifier: thesis.id?.toString() || '',
    language: 'fr',
    coverage: thesis.university,
    rights: 'Usage académique uniquement',

    // Éléments qualifiés
    abstract: thesis.summary,
    bibliographicCitation: generateThesisCitation(thesis),
    created: thesis.created_at,
    educationLevel: thesis.target_degree,
    extent: thesis.pagination,
    issued: thesis.defense_date || (thesis.defense_year ? thesis.defense_year.toString() : undefined),
    modified: thesis.updated_at,
    spatial: 'Cameroun',
    audience: 'Chercheurs, Étudiants'
  };
}

/**
 * Convertit un mémoire vers Dublin Core
 */
export function memoireToDublinCore(memoire: any): DublinCoreMetadata {
  return {
    title: memoire.title,
    creator: memoire.main_author,
    subject: Array.isArray(memoire.keywords) ? memoire.keywords : (memoire.specialty ? [memoire.specialty] : []),
    description: memoire.summary,
    publisher: memoire.university,
    contributor: memoire.supervisor,
    date: memoire.defense_date ? new Date(memoire.defense_date).getFullYear().toString() : undefined,
    type: DC_TYPES.TEXT,
    format: 'application/pdf',
    identifier: memoire.id?.toString() || '',
    language: 'fr',
    coverage: memoire.university,
    rights: 'Usage académique uniquement',

    // Éléments qualifiés
    abstract: memoire.summary,
    bibliographicCitation: generateMemoireCitation(memoire),
    created: memoire.created_at,
    educationLevel: memoire.degree_level,
    extent: memoire.pagination,
    issued: memoire.defense_date,
    modified: memoire.updated_at,
    spatial: 'Cameroun',
    audience: 'Étudiants, Professionnels'
  };
}

/**
 * Convertit un rapport de stage vers Dublin Core
 */
export function stageReportToDublinCore(stageReport: any): DublinCoreMetadata {
  return {
    title: stageReport.title,
    creator: stageReport.student_name,
    subject: Array.isArray(stageReport.keywords) ? stageReport.keywords : (stageReport.field_of_study ? [stageReport.field_of_study] : []),
    description: stageReport.summary || stageReport.objectives,
    publisher: stageReport.company_name,
    contributor: stageReport.supervisor,
    date: stageReport.defense_date ? new Date(stageReport.defense_date).getFullYear().toString() :
      (stageReport.academic_year ? stageReport.academic_year : undefined),
    type: DC_TYPES.TEXT,
    format: 'application/pdf',
    identifier: stageReport.id?.toString() || '',
    language: 'fr',
    coverage: stageReport.university,
    rights: 'Usage académique uniquement',
    relation: stageReport.company_name,
    source: stageReport.university,
    // Extensions Dublin Core
    audience: 'Étudiants, Professionnels, Entreprises',
    extent: stageReport.pagination,
    issued: stageReport.stage_start_date,
    modified: stageReport.updated_at,
    spatial: 'Cameroun',
    // Champs spécifiques aux stages
    educationLevel: stageReport.degree_level
  };
}

/**
 * Génère une citation bibliographique pour un livre
 */
function generateCitation(book: any): string {
  let citation = '';

  if (book.main_author) {
    citation += book.main_author + '. ';
  }

  const title = book.title || 'Titre non spécifié';
  citation += `"${title}"`;

  if (book.subtitle) {
    citation += `: ${book.subtitle}`;
  }

  citation += '. ';

  if (book.edition) {
    citation += book.edition + '. ';
  }

  if (book.publication_city) {
    citation += book.publication_city + ': ';
  }

  if (book.publisher) {
    citation += book.publisher + ', ';
  }

  if (book.publication_year) {
    citation += book.publication_year + '.';
  }

  return citation;

  return citation.trim();
}

/**
 * Génère une citation bibliographique pour une thèse
 */
function generateThesisCitation(thesis: any): string {
  let citation = '';

  if (thesis.main_author) {
    citation += thesis.main_author + '. ';
  }

  citation += `"${thesis.title}". `;

  if (thesis.target_degree) {
    citation += thesis.target_degree + ', ';
  }

  if (thesis.university) {
    citation += thesis.university + ', ';
  }

  if (thesis.defense_year) {
    citation += thesis.defense_year + '.';
  }

  return citation.trim();
}

/**
 * Génère une citation bibliographique pour un mémoire
 */
function generateMemoireCitation(memoire: any): string {
  let citation = '';

  if (memoire.main_author) {
    citation += memoire.main_author + '. ';
  }

  citation += `"${memoire.title}". `;

  if (memoire.degree_level) {
    citation += memoire.degree_level + ', ';
  }

  if (memoire.university) {
    citation += memoire.university + ', ';
  }

  if (memoire.defense_date) {
    const year = new Date(memoire.defense_date).getFullYear();
    citation += year + '.';
  }

  return citation.trim();
}

/**
 * Convertit Dublin Core en XML
 */
export function dublinCoreToXML(dc: DublinCoreMetadata): string {
  let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
  xml += '<metadata xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/">\n';

  // Éléments de base
  xml += `  <dc:title>${escapeXML(dc.title)}</dc:title>\n`;
  if (dc.creator) xml += `  <dc:creator>${escapeXML(dc.creator)}</dc:creator>\n`;
  if (dc.subject) {
    const subjects = Array.isArray(dc.subject) ? dc.subject : [dc.subject];
    subjects.forEach(subject => {
      xml += `  <dc:subject>${escapeXML(subject)}</dc:subject>\n`;
    });
  }
  if (dc.description) xml += `  <dc:description>${escapeXML(dc.description)}</dc:description>\n`;
  if (dc.publisher) xml += `  <dc:publisher>${escapeXML(dc.publisher)}</dc:publisher>\n`;
  if (dc.contributor) xml += `  <dc:contributor>${escapeXML(dc.contributor)}</dc:contributor>\n`;
  if (dc.date) xml += `  <dc:date>${escapeXML(dc.date)}</dc:date>\n`;
  xml += `  <dc:type>${escapeXML(dc.type)}</dc:type>\n`;
  if (dc.format) xml += `  <dc:format>${escapeXML(dc.format)}</dc:format>\n`;
  xml += `  <dc:identifier>${escapeXML(dc.identifier)}</dc:identifier>\n`;
  if (dc.source) xml += `  <dc:source>${escapeXML(dc.source)}</dc:source>\n`;
  xml += `  <dc:language>${escapeXML(dc.language)}</dc:language>\n`;
  if (dc.relation) xml += `  <dc:relation>${escapeXML(dc.relation)}</dc:relation>\n`;
  if (dc.coverage) xml += `  <dc:coverage>${escapeXML(dc.coverage)}</dc:coverage>\n`;
  if (dc.rights) xml += `  <dc:rights>${escapeXML(dc.rights)}</dc:rights>\n`;

  // Éléments qualifiés
  if (dc.abstract) xml += `  <dcterms:abstract>${escapeXML(dc.abstract)}</dcterms:abstract>\n`;
  if (dc.bibliographicCitation) xml += `  <dcterms:bibliographicCitation>${escapeXML(dc.bibliographicCitation)}</dcterms:bibliographicCitation>\n`;
  if (dc.created) xml += `  <dcterms:created>${escapeXML(dc.created)}</dcterms:created>\n`;
  if (dc.educationLevel) xml += `  <dcterms:educationLevel>${escapeXML(dc.educationLevel)}</dcterms:educationLevel>\n`;
  if (dc.extent) xml += `  <dcterms:extent>${escapeXML(dc.extent)}</dcterms:extent>\n`;
  if (dc.issued) xml += `  <dcterms:issued>${escapeXML(dc.issued)}</dcterms:issued>\n`;
  if (dc.modified) xml += `  <dcterms:modified>${escapeXML(dc.modified)}</dcterms:modified>\n`;
  if (dc.spatial) xml += `  <dcterms:spatial>${escapeXML(dc.spatial)}</dcterms:spatial>\n`;
  if (dc.audience) xml += `  <dcterms:audience>${escapeXML(dc.audience)}</dcterms:audience>\n`;

  xml += '</metadata>';
  return xml;
}

/**
 * Convertit Dublin Core en JSON-LD
 */
export function dublinCoreToJSONLD(dc: DublinCoreMetadata): any {
  return {
    "@context": {
      "dc": "http://purl.org/dc/elements/1.1/",
      "dcterms": "http://purl.org/dc/terms/"
    },
    "dc:title": dc.title,
    "dc:creator": dc.creator,
    "dc:subject": dc.subject,
    "dc:description": dc.description,
    "dc:publisher": dc.publisher,
    "dc:contributor": dc.contributor,
    "dc:date": dc.date,
    "dc:type": dc.type,
    "dc:format": dc.format,
    "dc:identifier": dc.identifier,
    "dc:source": dc.source,
    "dc:language": dc.language,
    "dc:relation": dc.relation,
    "dc:coverage": dc.coverage,
    "dc:rights": dc.rights,
    "dcterms:abstract": dc.abstract,
    "dcterms:bibliographicCitation": dc.bibliographicCitation,
    "dcterms:created": dc.created,
    "dcterms:educationLevel": dc.educationLevel,
    "dcterms:extent": dc.extent,
    "dcterms:issued": dc.issued,
    "dcterms:modified": dc.modified,
    "dcterms:spatial": dc.spatial,
    "dcterms:audience": dc.audience
  };
}

/**
 * Échappe les caractères XML
 */
function escapeXML(str: string | undefined | null): string {
  if (!str) return '';
  return str.toString()
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Valide les métadonnées Dublin Core
 */
export function validateDublinCore(dc: DublinCoreMetadata): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Champs obligatoires
  if (!dc.title || dc.title.trim() === '') {
    errors.push('Le titre est obligatoire');
  }

  if (!dc.identifier || dc.identifier.trim() === '') {
    errors.push('L\'identifiant est obligatoire');
  }

  if (!dc.type || dc.type.trim() === '') {
    errors.push('Le type est obligatoire');
  }

  if (!dc.language || dc.language.trim() === '') {
    errors.push('La langue est obligatoire');
  }

  // Validation du format de date
  if (dc.date && !/^\d{4}(-\d{2}(-\d{2})?)?$/.test(dc.date)) {
    errors.push('Le format de date doit être YYYY, YYYY-MM ou YYYY-MM-DD');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}
/**
 * Service Dublin Core pour l'export et la validation
 */
export class DublinCoreService {
  /**
   * Exporte des données vers XML Dublin Core
   */
  exportToXML(data: any): string {
    const dcMetadata = this.convertToDublinCore(data);
    return dublinCoreToXML(dcMetadata);
  }

  /**
   * Exporte des données vers JSON Dublin Core
   */
  exportToJSON(data: any): any {
    const dcMetadata = this.convertToDublinCore(data);
    return dublinCoreToJSONLD(dcMetadata);
  }

  /**
   * Convertit des données génériques vers Dublin Core
   */
  private convertToDublinCore(data: any): DublinCoreMetadata {
    // Détection automatique du type de document
    if (data.defense_date || data.target_degree) {
      return thesisToDublinCore(data);
    } else if (data.degree_level || data.supervisor) {
      return memoireToDublinCore(data);
    } else if (data.company_name || data.stage_start_date) {
      return stageReportToDublinCore(data);
    } else {
      return bookToDublinCore(data);
    }
  }

  /**
   * Valide des métadonnées Dublin Core
   */
  validate(data: any): { valid: boolean; errors: string[] } {
    const dcMetadata = this.convertToDublinCore(data);
    return validateDublinCore(dcMetadata);
  }
}