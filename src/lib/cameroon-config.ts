// Configuration spécifique pour le Cameroun
export const cameroonConfig = {
  // Langues officielles
  languages: {
    primary: 'fr', // Français
    secondary: 'en', // Anglais
    supported: ['fr', 'en']
  },

  // Devises
  currency: {
    code: 'XAF',
    symbol: 'FCFA',
    name: 'Franc CFA',
    decimals: 0 // Le FCFA n'a pas de centimes
  },

  // Formats de date et heure
  dateFormat: {
    short: 'dd/MM/yyyy',
    long: 'dd MMMM yyyy',
    time: 'HH:mm',
    datetime: 'dd/MM/yyyy HH:mm'
  },

  // Numéros de téléphone camerounais
  phoneFormat: {
    pattern: /^(\+237|237)?[6-9]\d{8}$/,
    placeholder: '+237 6XX XX XX XX',
    example: '+237 677 123 456'
  },

  // Régions du Cameroun
  regions: [
    'Adamaoua',
    'Centre',
    'Est',
    'Extrême-Nord',
    'Littoral',
    'Nord',
    'Nord-Ouest',
    'Ouest',
    'Sud',
    'Sud-Ouest'
  ],

  // Villes principales
  cities: [
    'Yaoundé',
    'Douala',
    'Garoua',
    'Bamenda',
    'Maroua',
    'Bafoussam',
    'Ngaoundéré',
    'Bertoua',
    'Ebolowa',
    'Kumba',
    'Buea',
    'Limbe'
  ],

  // Universités et institutions académiques
  universities: [
    'Université de Yaoundé I',
    'Université de Yaoundé II',
    'Université de Douala',
    'Université de Dschang',
    'Université de Ngaoundéré',
    'Université de Buea',
    'Université de Bamenda',
    'Université de Maroua',
    'École Normale Supérieure de Yaoundé',
    'École Polytechnique de Yaoundé',
    'Institut Universitaire de Technologie',
    'Université Catholique d\'Afrique Centrale'
  ],

  // Domaines académiques populaires au Cameroun
  academicDomains: [
    'Informatique et Technologies',
    'Médecine et Sciences de la Santé',
    'Droit et Sciences Politiques',
    'Économie et Gestion',
    'Ingénierie et Sciences Appliquées',
    'Agriculture et Sciences Environnementales',
    'Lettres et Sciences Humaines',
    'Éducation et Formation',
    'Arts et Culture',
    'Sciences Sociales',
    'Mathématiques et Statistiques',
    'Physique et Chimie'
  ],

  // Configuration des emprunts adaptée au contexte camerounais
  loanSettings: {
    defaultDuration: 21, // 3 semaines (plus long pour tenir compte des distances)
    maxLoansStudent: 3,
    maxLoansTeacher: 5,
    maxLoansResearcher: 10,
    renewalPeriod: 14, // 2 semaines
    maxRenewals: 2,
    lateFeePerDay: 100, // 100 FCFA par jour de retard
    reservationDuration: 7 // 1 semaine de réservation
  },

  // Horaires d'ouverture typiques
  openingHours: {
    weekdays: {
      open: '07:30',
      close: '18:00'
    },
    saturday: {
      open: '08:00',
      close: '16:00'
    },
    sunday: {
      open: '09:00',
      close: '15:00'
    }
  },

  // Jours fériés camerounais (dates fixes)
  holidays: [
    { date: '01-01', name: 'Jour de l\'An' },
    { date: '02-11', name: 'Fête de la Jeunesse' },
    { date: '05-01', name: 'Fête du Travail' },
    { date: '05-20', name: 'Fête Nationale' },
    { date: '08-15', name: 'Assomption' },
    { date: '12-25', name: 'Noël' }
  ],

  // Configuration réseau (pour les zones avec connexion limitée)
  networkSettings: {
    offlineMode: true,
    syncInterval: 300000, // 5 minutes
    cacheSize: '50MB',
    compressionEnabled: true
  },

  // Formats de codes-barres adaptés
  barcodeFormats: {
    user: 'BIB{YYYY}{MM}{NNNN}', // BIB + année + mois + numéro séquentiel
    book: 'LIV{NNNNNN}', // LIV + 6 chiffres
    thesis: 'THE{YYYY}{NNN}' // THE + année + 3 chiffres
  },

  // Support multilingue pour les messages
  messages: {
    fr: {
      welcome: 'Bienvenue dans le système de gestion de bibliothèque',
      loanSuccess: 'Emprunt enregistré avec succès',
      returnSuccess: 'Retour effectué avec succès',
      loanLimit: 'Limite d\'emprunts atteinte',
      bookUnavailable: 'Livre non disponible',
      userNotFound: 'Utilisateur non trouvé'
    },
    en: {
      welcome: 'Welcome to the library management system',
      loanSuccess: 'Loan recorded successfully',
      returnSuccess: 'Return completed successfully',
      loanLimit: 'Loan limit reached',
      bookUnavailable: 'Book unavailable',
      userNotFound: 'User not found'
    }
  }
};

// Utilitaires pour le contexte camerounais
export const cameroonUtils = {
  // Formater un prix en FCFA
  formatPrice: (amount: number): string => {
    return new Intl.NumberFormat('fr-CM', {
      style: 'currency',
      currency: 'XAF',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  },

  // Valider un numéro de téléphone camerounais
  validatePhone: (phone: string): boolean => {
    return cameroonConfig.phoneFormat.pattern.test(phone);
  },

  // Formater un numéro de téléphone
  formatPhone: (phone: string): string => {
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.startsWith('237')) {
      const number = cleaned.substring(3);
      return `+237 ${number.substring(0, 3)} ${number.substring(3, 5)} ${number.substring(5, 7)} ${number.substring(7)}`;
    }
    if (cleaned.length === 9) {
      return `+237 ${cleaned.substring(0, 3)} ${cleaned.substring(3, 5)} ${cleaned.substring(5, 7)} ${cleaned.substring(7)}`;
    }
    return phone;
  },

  // Générer un code-barres selon le format camerounais
  generateBarcode: (type: 'user' | 'book' | 'thesis' | 'memoire' | 'stage_report', sequence?: number): string => {
    const now = new Date();
    const year = now.getFullYear();
    const month = (now.getMonth() + 1).toString().padStart(2, '0');
    const seq = sequence || Math.floor(Math.random() * 9999);

    switch (type) {
      case 'user':
        return `BIB${year}${month}${seq.toString().padStart(4, '0')}`;
      case 'book':
        return `LIV${seq.toString().padStart(6, '0')}`;
      case 'these':
        return `THE${year}${seq.toString().padStart(3, '0')}`;
      case 'memoire':
        return `MEM${year}${seq.toString().padStart(3, '0')}`;
      case 'rapport_stage':
        return `RAP${year}${seq.toString().padStart(3, '0')}`;
      default:
        return `BIB${year}${month}${seq.toString().padStart(4, '0')}`;
    }
  },

  // Calculer les frais de retard en FCFA
  calculateLateFee: (daysLate: number): number => {
    return daysLate * cameroonConfig.loanSettings.lateFeePerDay;
  },

  // Vérifier si c'est un jour férié
  isHoliday: (date: Date): boolean => {
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    const dateStr = `${month}-${day}`;
    
    return cameroonConfig.holidays.some(holiday => holiday.date === dateStr);
  },

  // Calculer la date de retour en tenant compte des jours fériés
  calculateDueDate: (loanDate: Date, duration: number = cameroonConfig.loanSettings.defaultDuration): Date => {
    const dueDate = new Date(loanDate);
    let daysAdded = 0;
    
    while (daysAdded < duration) {
      dueDate.setDate(dueDate.getDate() + 1);
      
      // Skip weekends and holidays
      if (dueDate.getDay() !== 0 && dueDate.getDay() !== 6 && !cameroonUtils.isHoliday(dueDate)) {
        daysAdded++;
      }
    }
    
    return dueDate;
  }
};

export default cameroonConfig;
