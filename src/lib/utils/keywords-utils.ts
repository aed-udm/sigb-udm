/**
 * Utilitaires pour la gestion sécurisée des mots-clés
 * Évite les erreurs de type "split is not a function"
 */

/**
 * Convertit de manière sécurisée des mots-clés en tableau
 * Gère les cas où la valeur peut être null, undefined, string ou array
 */
export function safeKeywordsToArray(keywords: any): string[] {
  // Si c'est déjà un tableau, le traiter
  if (Array.isArray(keywords)) {
    const result: string[] = [];

    for (const item of keywords) {
      if (item && typeof item === 'string') {
        const trimmed = item.trim();
        if (trimmed.length > 0) {
          // Vérifier si l'élément contient des virgules (cas problématique)
          if (trimmed.includes(',')) {
            // Diviser et ajouter chaque partie
            const parts = trimmed.split(',').map(p => p.trim()).filter(p => p.length > 0);
            result.push(...parts);
          } else {
            result.push(trimmed);
          }
        }
      }
    }

    return result.filter(k => k !== 'null' && k !== 'undefined');
  }

  // Si c'est une chaîne de caractères
  if (keywords && typeof keywords === 'string') {
    // Essayer d'abord de parser comme JSON
    if (keywords.startsWith('[') || keywords.startsWith('{')) {
      try {
        const parsed = JSON.parse(keywords);
        if (Array.isArray(parsed)) {
          // Appel récursif pour traiter le tableau parsé
          return safeKeywordsToArray(parsed);
        }
      } catch (e) {
        console.warn('Erreur parsing JSON keywords:', e);
        // Continuer avec le parsing en chaîne
      }
    }

    // Parser comme chaîne délimitée
    return keywords
      .split(/[,;]/) // Diviser par virgule ou point-virgule
      .map(k => k.trim())
      .filter(k => k.length > 0 && k !== 'null' && k !== 'undefined');
  }

  // Dans tous les autres cas (null, undefined, number, etc.), retourner un tableau vide
  return [];
}

/**
 * Convertit un tableau de mots-clés en chaîne de caractères
 * Pour la sauvegarde en base de données
 */
export function keywordsArrayToString(keywords: string[]): string {
  if (!Array.isArray(keywords)) {
    return '';
  }
  
  return keywords
    .filter(k => k && typeof k === 'string' && k.trim().length > 0)
    .map(k => k.trim())
    .join(', ');
}

/**
 * Valide qu'un tableau de mots-clés respecte les exigences CAMES
 */
export function validateCamesKeywords(keywords: string[], minCount: number = 3): {
  isValid: boolean;
  count: number;
  errors: string[];
} {
  const cleanKeywords = safeKeywordsToArray(keywords);
  const errors: string[] = [];
  
  if (cleanKeywords.length < minCount) {
    errors.push(`Au moins ${minCount} mots-clés sont requis (${cleanKeywords.length} fournis)`);
  }
  
  // Vérifier la longueur des mots-clés
  const tooShort = cleanKeywords.filter(k => k.length < 2);
  if (tooShort.length > 0) {
    errors.push(`Certains mots-clés sont trop courts (minimum 2 caractères)`);
  }
  
  // Vérifier les doublons
  const duplicates = cleanKeywords.filter((k, index) => 
    cleanKeywords.indexOf(k.toLowerCase()) !== index
  );
  if (duplicates.length > 0) {
    errors.push(`Mots-clés en double détectés`);
  }
  
  return {
    isValid: errors.length === 0,
    count: cleanKeywords.length,
    errors
  };
}

/**
 * Normalise un mot-clé (supprime les espaces, met en forme)
 */
export function normalizeKeyword(keyword: string): string {
  if (!keyword || typeof keyword !== 'string') {
    return '';
  }
  
  return keyword
    .trim()
    .replace(/\s+/g, ' ') // Remplacer les espaces multiples par un seul
    .toLowerCase()
    .replace(/^\w/, c => c.toUpperCase()); // Première lettre en majuscule
}

/**
 * Ajoute un mot-clé à un tableau de manière sécurisée
 */
export function addKeywordSafely(
  keywords: string[], 
  newKeyword: string
): { success: boolean; keywords: string[]; error?: string } {
  const normalized = normalizeKeyword(newKeyword);
  
  if (!normalized) {
    return {
      success: false,
      keywords,
      error: 'Le mot-clé ne peut pas être vide'
    };
  }
  
  if (keywords.some(k => k.toLowerCase() === normalized.toLowerCase())) {
    return {
      success: false,
      keywords,
      error: 'Ce mot-clé existe déjà'
    };
  }
  
  return {
    success: true,
    keywords: [...keywords, normalized]
  };
}
