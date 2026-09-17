/**
 * GESCOP - Data Profiler
 * 
 * Etape 1 du Pipeline SǸmantique (Phase 1)
 * Rle : Analyser un jeu de donnǸes brut pour dǸduire le type de chaque colonne
 * et extraire des statistiques basiques sans essayer de comprendre le sens mǸtier.
 */

export type ColumnProfile = {
  columnName: string;
  inferredType: 'integer' | 'decimal' | 'currency' | 'percentage' | 'date' | 'boolean' | 'string' | 'email' | 'unknown';
  nullCount: number;
  totalCount: number;
  uniqueValues: number;
  sampleValues: any[];
};

export type DatasetProfile = {
  rowCount: number;
  columns: Record<string, ColumnProfile>;
};

/**
 * Analyse un tableau d'objets (Raw Data) et retourne un profilage complet.
 */
export function profileData(rows: Record<string, any>[]): DatasetProfile {
  if (!rows || rows.length === 0) return { rowCount: 0, columns: {} };

  const columns: Record<string, ColumnProfile> = {};
  const headers = Object.keys(rows[0]);

  // Initialisation
  for (const header of headers) {
    columns[header] = {
      columnName: header,
      inferredType: 'unknown',
      nullCount: 0,
      totalCount: rows.length,
      uniqueValues: 0,
      sampleValues: []
    };
  }

  // Collecte et analyse
  for (const header of headers) {
    const values = rows.map(r => r[header]);
    const nonNullValues = values.filter(v => v !== null && v !== undefined && v !== '');
    
    columns[header].nullCount = rows.length - nonNullValues.length;
    columns[header].uniqueValues = new Set(nonNullValues).size;
    columns[header].sampleValues = nonNullValues.slice(0, 5); // Garder 5 valeurs pour le Semantic Matcher

    columns[header].inferredType = inferColumnType(nonNullValues);
  }

  return {
    rowCount: rows.length,
    columns
  };
}

/**
 * DǸduit le type de donnǸe le plus probable pour une colonne donnǸe.
 * DÉduit le type de donnÉe le plus probable pour une colonne donnÉe.
 */
function inferColumnType(values: any[]): ColumnProfile['inferredType'] {
  if (values.length === 0) return 'unknown';

  let isInteger = true;
  let isDecimal = true;
  let isBoolean = true;
  let isDate = true;
  let isEmail = true;
  
  const currencyRegex = /^[\$€£]?\s*-?[\d\s]+([.,]\d+)?\s*[\$€£]?$/;
  let isCurrency = true;

  const percentRegex = /^-?[\d\s]+([.,]\d+)?\s*%$/;
  let isPercentage = true;

  for (const val of values.slice(0, 50)) { // Échantillonnage sur 50 valeurs
    const str = String(val).trim();
    // Enlever les espaces pour le test numerique standard
    const numClean = str.replace(/\s/g, '').replace(',', '.').replace(/[^\d.-]/g, '');
    const num = Number(numClean);

    if (isInteger && (!Number.isInteger(num) || isNaN(num))) isInteger = false;
    if (isDecimal && isNaN(num)) isDecimal = false;
    if (isBoolean && !['true', 'false', '0', '1', 'oui', 'non', 'yes', 'no'].includes(str.toLowerCase())) isBoolean = false;
    if (isDate && isNaN(Date.parse(str))) isDate = false;
    if (isEmail && !/^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/.test(str)) isEmail = false;
    if (isCurrency && !currencyRegex.test(str)) isCurrency = false;
    if (isPercentage && !percentRegex.test(str)) isPercentage = false;
    
    // Un simple entier "12" ne doit pas tre une currency par dǸfaut s'il n'y a pas de symbole
    if (isCurrency && (!currencyRegex.test(str) || !str.match(/[\$€£]/))) isCurrency = false;
    if (isPercentage && (!percentRegex.test(str) || !str.includes('%'))) isPercentage = false;
  }

  if (isPercentage) return 'percentage';
  if (isCurrency) return 'currency';
  if (isInteger) return 'integer';
  if (isDecimal) return 'decimal';
  if (isDate) return 'date';
  if (isEmail) return 'email';
  if (isBoolean) return 'boolean';

  return 'string';
}
