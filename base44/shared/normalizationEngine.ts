/**
 * GESCOP - Normalization Engine
 * 
 * Etape 3 du Pipeline SǸmantique (Phase 1)
 * Rle : Prendre une valeur brute et la formater proprement en fonction de son type dǸtectǸ.
 * Exemples : 
 * - Convertir "1 250,50 $" ou "1,250.50" en float (1250.5)
 * - Harmoniser les formats de dates
 * - Mettre les textes en minuscules/sans accents pour les ǸnumǸrations
 */

import { ColumnProfile } from './dataProfiler.ts';

export function normalizeValue(rawValue: any, inferredType: ColumnProfile['inferredType']): any {
  if (rawValue === null || rawValue === undefined || rawValue === '') {
    return null;
  }

  const strValue = String(rawValue).trim();

  switch (inferredType) {
    case 'currency':
    case 'decimal':
    case 'percentage': {
      // Nettoyage des symboles ($ , % etc) et des espaces
      let cleanStr = strValue.replace(/[^\d.,-]/g, '');
      // GǸrer les virgules/points (1 200,50 -> 1200.50)
      // Si la virgule est  la fin (ex: 12,50), c'est srement une dǸcimale
      if (cleanStr.match(/,\d{1,2}$/)) {
        cleanStr = cleanStr.replace(/\./g, '').replace(',', '.');
      } else {
        cleanStr = cleanStr.replace(/,/g, '');
      }
      
      const num = parseFloat(cleanStr);
      if (isNaN(num)) return null;
      
      // Si c'est un pourcentage (ex: "50%"), on le convertit souvent en 0.50 ou on le garde en 50, selon la norme.
      // Pour l'instant on garde la valeur absolue extraite.
      return num;
    }

    case 'integer': {
      const cleanStr = strValue.replace(/[^\d-]/g, '');
      const num = parseInt(cleanStr, 10);
      return isNaN(num) ? null : num;
    }

    case 'date': {
      // Tente de parser la date. Si a choue, on retourne null.
      const d = new Date(strValue);
      if (isNaN(d.getTime())) return null;
      return d.toISOString();
    }

    case 'boolean': {
      const lower = strValue.toLowerCase();
      if (['true', '1', 'oui', 'yes', 'vrai'].includes(lower)) return true;
      if (['false', '0', 'non', 'no', 'faux'].includes(lower)) return false;
      return null;
    }

    case 'email':
      return strValue.toLowerCase();

    case 'string':
    default:
      // Optionnel : on pourrait normaliser les caractres spǸciaux
      return strValue;
  }
}

/**
 * Normalise toute une ligne de donnǸes brutes.
 */
export function normalizeRow(rawRow: Record<string, any>, profiles: Record<string, ColumnProfile>): Record<string, any> {
  const normalizedRow: Record<string, any> = {};
  
  for (const [key, rawValue] of Object.entries(rawRow)) {
    const profile = profiles[key];
    if (profile) {
      normalizedRow[key] = normalizeValue(rawValue, profile.inferredType);
    } else {
      normalizedRow[key] = rawValue;
    }
  }
  
  return normalizedRow;
}

