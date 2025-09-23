/**
 * MARC21 (Machine-Readable Cataloging) Standard Implementation
 * Conforme aux spécifications de la Library of Congress
 */

export interface MARCControlField {
  tag: string;
  value: string;
  data?: string; // Propriété optionnelle pour compatibilité
}

export interface MARCSubfield {
  code: string;
  value: string;
  data?: string; // Propriété optionnelle pour compatibilité
}

export interface MARCDataField {
  tag: string;
  ind1: string;
  ind2: string;
  subfields: MARCSubfield[];
}

export interface MARCRecord {
  leader: string;
  controlFields: MARCControlField[];
  dataFields: MARCDataField[];
}

export interface MARC21Book {
  // Champs de contrôle
  recordNumber?: string; // 001
  controlNumber?: string; // 003
  dateTimeOfLatestTransaction?: string; // 005
  fixedLengthDataElements?: string; // 008
  
  // Numéros standards
  isbn?: string; // 020
  issn?: string; // 022
  lccn?: string; // 010
  
  // Informations principales
  mainEntry?: string; // 100
  title: string; // 245
  edition?: string; // 250
  publication?: {
    place?: string; // 260$a
    publisher?: string; // 260$b
    date?: string; // 260$c
  };
  
  // Description physique
  physicalDescription?: string; // 300
  
  // Notes
  generalNote?: string; // 500
  bibliography?: string; // 504
  summary?: string; // 520
  
  // Accès par sujets
  subjects?: string[]; // 650
  
  // Accès secondaires
  addedEntries?: string[]; // 700, 710, 711
}

/**
 * Convertit un livre de notre format vers MARC21
 */
export function bookToMARC21(book: any): MARCRecord {
  const currentDate = new Date().toISOString().slice(0, 19).replace(/[-:]/g, '').replace('T', '');
  
  // Leader (24 caractères)
  const leader = '00000nam a2200000 a 4500';
  
  const controlFields: MARCControlField[] = [
    { tag: '001', value: book.id?.toString() || '000000' },
    { tag: '003', value: 'UdM-CM' }, // Code de l'Université des Montagnes
    { tag: '005', value: currentDate },
    { tag: '008', value: generateField008(book) }
  ];
  
  const dataFields: MARCDataField[] = [];
  
  // ISBN (020) - Utiliser le vrai ISBN du livre
  if (book.isbn) {
    dataFields.push({
      tag: '020',
      ind1: ' ',
      ind2: ' ',
      subfields: [{ code: 'a', value: book.isbn }]
    });
  }
  
  // Auteur principal (100) - OBLIGATOIRE
  if (book.main_author) {
    dataFields.push({
      tag: '100',
      ind1: '1',
      ind2: ' ',
      subfields: [{ code: 'a', value: book.main_author }]
    });
  }
  
  // Titre (245)
  const titleSubfields: MARCSubfield[] = [
    { code: 'a', value: book.title }
  ];
  if (book.subtitle) {
    titleSubfields.push({ code: 'b', value: book.subtitle });
  }
  if (book.main_author) {
    titleSubfields.push({ code: 'c', value: book.main_author });
  }
  
  dataFields.push({
    tag: '245',
    ind1: book.main_author ? '1' : '0',
    ind2: '0',
    subfields: titleSubfields
  });
  
  // Édition (250)
  if (book.edition) {
    dataFields.push({
      tag: '250',
      ind1: ' ',
      ind2: ' ',
      subfields: [{ code: 'a', value: book.edition }]
    });
  }
  
  // Publication (260) - Utiliser les vraies données du livre
  const pubSubfields: MARCSubfield[] = [];
  if (book.publication_city) {
    pubSubfields.push({ code: 'a', value: book.publication_city });
  }
  if (book.publisher) {
    pubSubfields.push({ code: 'b', value: book.publisher });
  }
  if (book.publication_year) {
    pubSubfields.push({ code: 'c', value: book.publication_year.toString() });
  }

  if (pubSubfields.length > 0) {
    dataFields.push({
      tag: '260',
      ind1: ' ',
      ind2: ' ',
      subfields: pubSubfields
    });
  }
  
  // Résumé (520) - Utiliser summary (français) ou abstract (anglais)
  const resume = book.summary || book.abstract;
  if (resume) {
    dataFields.push({
      tag: '520',
      ind1: ' ',
      ind2: ' ',
      subfields: [{ code: 'a', value: resume }]
    });
  }
  
  // Sujets (650) - Domaine principal
  if (book.domain) {
    dataFields.push({
      tag: '650',
      ind1: ' ',
      ind2: '0',
      subfields: [{ code: 'a', value: book.domain }]
    });
  }

  // Mots-clés additionnels (650)
  if (book.keywords) {
    let keywords = [];
    if (Array.isArray(book.keywords)) {
      keywords = book.keywords;
    } else if (typeof book.keywords === 'string') {
      try {
        keywords = JSON.parse(book.keywords);
      } catch {
        keywords = [book.keywords];
      }
    }

    keywords.forEach((keyword: string) => {
      if (keyword && keyword.trim()) {
        dataFields.push({
          tag: '650',
          ind1: ' ',
          ind2: '7',
          subfields: [
            { code: 'a', value: keyword.trim() },
            { code: '2', value: 'local' }
          ]
        });
      }
    });
  }
  
  // Auteur secondaire (700)
  if (book.secondary_author) {
    dataFields.push({
      tag: '700',
      ind1: '1',
      ind2: ' ',
      subfields: [{ code: 'a', value: book.secondary_author }]
    });
  }
  
  return {
    leader,
    controlFields,
    dataFields
  };
}

/**
 * Génère le champ 008 (Fixed-Length Data Elements)
 */
function generateField008(book: any): string {
  const currentYear = new Date().getFullYear().toString().slice(-2);
  const pubYear = book.publication_year ? book.publication_year.toString().slice(-4) : '    ';
  const language = book.language === 'fr' ? 'fre' : 'eng';
  
  // Format: 6 positions date + 1 type + 4 année pub + 4 lieu + 17 divers + 3 langue + 1 modifié + 1 source
  return `${currentYear}0101s${pubYear}    fr           000 0 ${language}  `;
}

/**
 * Convertit un enregistrement MARC21 vers notre format de livre
 */
export function marc21ToBook(marc: MARCRecord): any {
  const book: any = {};
  
  // Extraire les informations des champs de données
  marc.dataFields.forEach(field => {
    switch (field.tag) {
      case '020': // ISBN
        const isbnSubfield = field.subfields.find(sf => sf.code === 'a');
        if (isbnSubfield) book.isbn = isbnSubfield.value;
        break;
        
      case '100': // Auteur principal
        const authorSubfield = field.subfields.find(sf => sf.code === 'a');
        if (authorSubfield) book.main_author = authorSubfield.value;
        break;
        
      case '245': // Titre
        const titleSubfield = field.subfields.find(sf => sf.code === 'a');
        const subtitleSubfield = field.subfields.find(sf => sf.code === 'b');
        if (titleSubfield) book.title = titleSubfield.value;
        if (subtitleSubfield) book.subtitle = subtitleSubfield.value;
        break;
        
      case '250': // Édition
        const editionSubfield = field.subfields.find(sf => sf.code === 'a');
        if (editionSubfield) book.edition = editionSubfield.value;
        break;
        
      case '260': // Publication
        const placeSubfield = field.subfields.find(sf => sf.code === 'a');
        const publisherSubfield = field.subfields.find(sf => sf.code === 'b');
        const dateSubfield = field.subfields.find(sf => sf.code === 'c');
        if (placeSubfield) book.publication_city = placeSubfield.value;
        if (publisherSubfield) book.publisher = publisherSubfield.value;
        if (dateSubfield) {
          const year = parseInt(dateSubfield.value.replace(/\D/g, ''));
          if (!isNaN(year)) book.publication_year = year;
        }
        break;
        
      case '520': // Résumé
        const summarySubfield = field.subfields.find(sf => sf.code === 'a');
        if (summarySubfield) book.summary = summarySubfield.value;
        break;
        
      case '650': // Sujets
        const subjectSubfield = field.subfields.find(sf => sf.code === 'a');
        if (subjectSubfield) {
          if (!book.keywords) book.keywords = [];
          book.keywords.push(subjectSubfield.value);
        }
        break;
        
      case '700': // Auteur secondaire
        const secAuthorSubfield = field.subfields.find(sf => sf.code === 'a');
        if (secAuthorSubfield) book.secondary_author = secAuthorSubfield.value;
        break;
    }
  });
  
  return book;
}


/**
 * Convertit un enregistrement MARC21 en XML
 */
export function marcToXML(marc: MARCRecord): string {
  let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
  xml += '<record xmlns="http://www.loc.gov/MARC21/slim">\n';
  xml += `  <leader>${marc.leader}</leader>\n`;
  
  // Champs de contrôle
  marc.controlFields.forEach(field => {
    xml += `  <controlfield tag="${field.tag}">${escapeXML(field.value)}</controlfield>\n`;
  });
  
  // Champs de données
  marc.dataFields.forEach(field => {
    xml += `  <datafield tag="${field.tag}" ind1="${field.ind1}" ind2="${field.ind2}">\n`;
    field.subfields.forEach(subfield => {
      xml += `    <subfield code="${subfield.code}">${escapeXML(subfield.value)}</subfield>\n`;
    });
    xml += '  </datafield>\n';
  });
  
  xml += '</record>';
  return xml;
}

/**
 * Échappe les caractères XML
 */
function escapeXML(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Valide un enregistrement MARC21
 */
export function validateMARCRecord(marc: MARCRecord): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  // Vérifier le leader
  if (!marc.leader || marc.leader.length !== 24) {
    errors.push('Le leader doit faire exactement 24 caractères');
  }
  
  // Vérifier les champs obligatoires
  const hasTitle = marc.dataFields.some(field => field.tag === '245');
  if (!hasTitle) {
    errors.push('Le champ titre (245) est obligatoire');
  }
  
  // Vérifier la structure des champs
  marc.dataFields.forEach(field => {
    if (!/^\d{3}$/.test(field.tag)) {
      errors.push(`Tag invalide: ${field.tag}`);
    }
    if (field.ind1.length !== 1 || field.ind2.length !== 1) {
      errors.push(`Indicateurs invalides pour le champ ${field.tag}`);
    }
  });
  
  return {
    valid: errors.length === 0,
    errors
  };
}
/**
 * Service MARC21 pour l'export et la validation
 */
export class MARC21Service {
  /**
   * Exporte des données vers XML MARC21
   */
  exportToXML(data: any): string {
    const marcRecord = this.convertToMARC21(data);
    return marcRecordToXML(marcRecord);
  }

  /**
   * Exporte des données vers JSON MARC21
   */
  exportToJSON(data: any): any {
    const marcRecord = this.convertToMARC21(data);
    return marcRecordToJSON(marcRecord);
  }

  /**
   * Convertit des données génériques vers MARC21
   */
  private convertToMARC21(data: any): MARCRecord {
    // Déterminer le type de document et utiliser la fonction appropriée
    const documentType = data.type || data.document_type || 'book';
    
    switch (documentType) {
      case 'thesis':
        return this.thesisToMARC21(data);
      case 'memoire':
        return this.memoireToMARC21(data);
      case 'stage_report':
        return this.stageReportToMARC21(data);
      case 'book':
      default:
        return this.bookToMARC21(data);
    }
  }

  /**
   * Valide un enregistrement MARC21
   */
  validate(data: any): { valid: boolean; errors: string[] } {
    const marcRecord = this.convertToMARC21(data);
    return this.validateMARCRecord(marcRecord);
  }

  /**
   * Convertit un livre vers MARC21
   */
  private bookToMARC21(data: any): MARCRecord {
    // Utiliser la fonction principale bookToMARC21 qui est correcte
    return bookToMARC21(data);
  }

  /**
   * Convertit une thèse vers MARC21
   */
  private thesisToMARC21(data: any): MARCRecord {
    const leader = '00000nam a2200000 a 4500';
    
    const controlFields: MARCControlField[] = [
      { tag: '001', value: data.id || 'UDM-TH-' + Date.now() },
      { tag: '003', value: 'UDM' },
      { tag: '005', value: new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + '.0' },
      { tag: '008', value: this.generateField008(data, 'thesis') }
    ];

    const dataFields: MARCDataField[] = [
      {
        tag: '100',
        ind1: '1',
        ind2: ' ',
        subfields: [{ code: 'a', value: data.author || data.auteur || 'Auteur inconnu' }]
      },
      {
        tag: '245',
        ind1: '1',
        ind2: '0',
        subfields: [
          { code: 'a', value: data.title || data.titre || 'Titre non spécifié' },
          { code: 'c', value: data.author || data.auteur || '' }
        ]
      },
      {
        tag: '502',
        ind1: ' ',
        ind2: ' ',
        subfields: [
          { code: 'a', value: `Thèse (${data.degree || data.diplome || 'Doctorat'})--Université des Montagnes, ${data.year || data.annee || new Date().getFullYear()}` }
        ]
      },
      {
        tag: '700',
        ind1: '1',
        ind2: ' ',
        subfields: [{ code: 'a', value: data.supervisor || data.directeur || 'Directeur non spécifié' }]
      }
    ];

    return { leader, controlFields, dataFields };
  }

  /**
   * Convertit un mémoire vers MARC21
   */
  private memoireToMARC21(data: any): MARCRecord {
    const leader = '00000nam a2200000 a 4500';
    
    const controlFields: MARCControlField[] = [
      { tag: '001', value: data.id || 'UDM-MEM-' + Date.now() },
      { tag: '003', value: 'UDM' },
      { tag: '005', value: new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + '.0' },
      { tag: '008', value: this.generateField008(data, 'memoire') }
    ];

    const dataFields: MARCDataField[] = [
      {
        tag: '100',
        ind1: '1',
        ind2: ' ',
        subfields: [{ code: 'a', value: data.author || data.auteur || 'Auteur inconnu' }]
      },
      {
        tag: '245',
        ind1: '1',
        ind2: '0',
        subfields: [
          { code: 'a', value: data.title || data.titre || 'Titre non spécifié' },
          { code: 'c', value: data.author || data.auteur || '' }
        ]
      },
      {
        tag: '502',
        ind1: ' ',
        ind2: ' ',
        subfields: [
          { code: 'a', value: `Mémoire (${data.degree || data.diplome || 'Master'})--Université des Montagnes, ${data.year || data.annee || new Date().getFullYear()}` }
        ]
      }
    ];

    return { leader, controlFields, dataFields };
  }

  /**
   * Convertit un rapport de stage vers MARC21
   */
  private stageReportToMARC21(data: any): MARCRecord {
    const leader = '00000nam a2200000 a 4500';
    
    const controlFields: MARCControlField[] = [
      { tag: '001', value: data.id || 'UDM-STAGE-' + Date.now() },
      { tag: '003', value: 'UDM' },
      { tag: '005', value: new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + '.0' },
      { tag: '008', value: this.generateField008(data, 'stage_report') }
    ];

    const dataFields: MARCDataField[] = [
      {
        tag: '100',
        ind1: '1',
        ind2: ' ',
        subfields: [{ code: 'a', value: data.author || data.auteur || 'Auteur inconnu' }]
      },
      {
        tag: '245',
        ind1: '1',
        ind2: '0',
        subfields: [
          { code: 'a', value: data.title || data.titre || 'Titre non spécifié' },
          { code: 'c', value: data.author || data.auteur || '' }
        ]
      },
      {
        tag: '500',
        ind1: ' ',
        ind2: ' ',
        subfields: [
          { code: 'a', value: `Rapport de stage--${data.company || data.entreprise || 'Entreprise non spécifiée'}, ${data.year || data.annee || new Date().getFullYear()}` }
        ]
      }
    ];

    return { leader, controlFields, dataFields };
  }

  /**
   * Génère le champ 008 selon le type de document
   */
  private generateField008(data: any, type: string): string {
    const currentDate = new Date().toISOString().slice(2, 10).replace(/-/g, '');
    const pubYear = data.year || data.annee || new Date().getFullYear().toString();
    const lang = data.language || data.langue || 'fre';
    
    // Format de base : 6 positions date + 1 type + 4 année + 15 positions fixes + 3 langue + 1 modifié + 1 source
    let field008 = currentDate; // 6 positions
    field008 += 's'; // 1 position - type de date
    field008 += pubYear.padEnd(4, ' '); // 4 positions - année
    field008 += '    '; // 4 positions - lieu de publication
    field008 += '|||||||||||'; // 11 positions - divers
    field008 += lang; // 3 positions - langue
    field008 += ' '; // 1 position - enregistrement modifié
    field008 += 'd'; // 1 position - source de catalogage
    
    return field008.substring(0, 40); // Limiter à 40 caractères
  }

  /**
   * Valide un enregistrement MARC21
   */
  private validateMARCRecord(marc: MARCRecord): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Vérifier le leader
    if (!marc.leader || marc.leader.length !== 24) {
      errors.push('Leader doit faire exactement 24 caractères');
    }

    // Vérifier les champs obligatoires
    const hasTitle = marc.dataFields.some(field => field.tag === '245');
    if (!hasTitle) {
      errors.push('Champ 245 (titre) obligatoire manquant');
    }

    // Vérifier la structure des champs
    marc.controlFields.forEach(field => {
      if (!field.tag || !field.value) {
        errors.push(`Champ de contrôle ${field.tag} invalide`);
      }
    });

    marc.dataFields.forEach(field => {
      if (!field.tag || !field.subfields || field.subfields.length === 0) {
        errors.push(`Champ de données ${field.tag} invalide`);
      }
    });

    return {
      valid: errors.length === 0,
      errors
    };
  }
}

/**
 * Convertit un enregistrement MARC21 en XML
 */
export function marcRecordToXML(marc: MARCRecord): string {
  let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
  xml += '<record xmlns="http://www.loc.gov/MARC21/slim">\n';
  
  // Leader
  xml += `  <leader>${marc.leader}</leader>\n`;
  
  // Champs de contrôle (001-009)
  marc.controlFields.forEach(field => {
    xml += `  <controlfield tag="${field.tag}">${escapeXML(field.value || '')}</controlfield>\n`;
  });
  
  // Champs de données (010-999)
  marc.dataFields.forEach(field => {
    xml += `  <datafield tag="${field.tag}" ind1="${field.ind1}" ind2="${field.ind2}">\n`;
    field.subfields.forEach(subfield => {
      xml += `    <subfield code="${subfield.code}">${escapeXML(subfield.value || '')}</subfield>\n`;
    });
    xml += '  </datafield>\n';
  });
  
  xml += '</record>';
  return xml;
}

/**
 * Convertit un enregistrement MARC21 en JSON
 */
export function marcRecordToJSON(marc: MARCRecord): any {
  return {
    leader: marc.leader,
    controlFields: marc.controlFields,
    dataFields: marc.dataFields
  };
}

