import { stripAccents, FIELD_ALIASES, cleCanonique, ALIAS_CANONIQUES } from '../importUtils.ts';
import { ENTITY_SCHEMAS } from '../entitySchemas.ts';

// Local Semantic Types & Economic Roles
const ECONOMIC_ROLES = {
  FLOW: 'FLOW',
  STOCK: 'STOCK',
  IDENTIFIER: 'IDENTIFIER',
  CATEGORY: 'CATEGORY',
  DATE: 'DATE',
  METRIC: 'METRIC',
} as const;

export interface MappingMemoryEntry {
  columnName: string;           // normalized without accents
  sourceContext: string;        // normalized sheet/entity name
  siblingSignature: string;     // sorted sibling columns joined by '|'
  resolvedCanonicalKey: string;
  resolvedSemanticType: string;
  confirmedBy: 'user' | 'auto';
  usageCount: number;
  lastUsed: string;             // ISO date
  confidence: number;
}

export interface ColumnRecognitionParams {
  columnName: string;          // Raw column header from the file
  sheetName: string;           // Sheet or file name
  sampleValues: unknown[];     // First 20-30 values from the column
  siblingColumns: string[];    // Other column headers in the same sheet
  entityHint?: string;         // Entity detected by sheetDetect (if any)
  mappingMemory?: MappingMemoryEntry[];  // Past user-confirmed mappings
}

export interface ColumnRecognition {
  canonicalKey: string;        // e.g. 'expense_amount'
  semanticType: string;        // e.g. 'expense'
  economicRole: string;        // e.g. 'FLOW'
  confidence: number;          // 0.0 - 1.0
  justification: string[];     // Array of reasons explaining the recognition
  alternatives: Array<{ canonicalKey: string; semanticType: string; confidence: number }>;
  requiresValidation: boolean; // true if confidence < 0.60
}

export interface SheetRecognitionParams {
  sheetName: string;
  headers: string[];
  sampleRows: Record<string, unknown>[];  // First 20-30 rows
  entityHint?: string;
  mappingMemory?: MappingMemoryEntry[];
}

const WEIGHTS = {
  NAME: 0.25,
  DATA_TYPE: 0.15,
  DISTRIBUTION: 0.10,
  CONTEXT: 0.20,
  SIBLINGS: 0.15,
  MEMORY: 0.15
};

const AMBIGUOUS_NAMES = ['montant', 'amount', 'total', 'valeur', 'value'];

function normalize(str: string): string {
  return cleCanonique(str);
}

// 1. Column Name Signal
function analyzeColumnName(columnName: string): { matches: { key: string, type: string, score: number }[], justifications: string[] } {
  const normName = normalize(columnName);
  const matches: { key: string, type: string, score: number }[] = [];
  const justifications: string[] = [];

  if (AMBIGUOUS_NAMES.includes(normName)) {
    matches.push({ key: 'ambiguous_amount', type: 'ambiguous', score: 0.5 });
    justifications.push(`Name is ambiguous ('${normName}'), needs context.`);
    return { matches, justifications };
  }

  // 1. Check direct aliases from importUtils
  // Try raw lowercase first, then normalized
  const rawLower = columnName.toLowerCase().trim();
  const directAlias = FIELD_ALIASES[rawLower] || 
                      FIELD_ALIASES[rawLower.replace(/[\s-]/g, "_")] || 
                      FIELD_ALIASES[normName] ||
                      ALIAS_CANONIQUES[normName];

  if (directAlias) {
    matches.push({ key: directAlias, type: directAlias, score: 0.95 });
    justifications.push(`Name matched known alias '${directAlias}'.`);
  } 
  
  // 2. Check manual overrides for strong signals
  if (['ca', 'chiffre_affaires', 'revenue', 'sales'].includes(normName)) {
    matches.push({ key: 'revenue_amount', type: 'revenue', score: 0.9 });
    justifications.push(`Name strongly implies revenue.`);
  } else if (['depense', 'expense', 'charge', 'frais'].includes(normName)) {
    matches.push({ key: 'expense_amount', type: 'expense', score: 0.9 });
    justifications.push(`Name strongly implies expense.`);
  } else if (['solde', 'balance', 'closing_cash'].includes(normName)) {
    matches.push({ key: 'cash_balance', type: 'cash_balance', score: 0.9 });
    justifications.push(`Name strongly implies cash balance.`);
  } else if (['produit', 'product'].includes(normName)) {
    matches.push({ key: 'product_name', type: 'product_name', score: 0.8 });
    justifications.push(`Name implies product.`);
  } else if (['stock'].includes(normName)) {
    matches.push({ key: 'inventory_level', type: 'inventory_level', score: 0.8 });
    justifications.push(`Name implies inventory.`);
  } else if (['campagne', 'campaign'].includes(normName)) {
    matches.push({ key: 'campaign_name', type: 'campaign_name', score: 0.8 });
    justifications.push(`Name implies campaign.`);
  } else if (['employe', 'employee'].includes(normName)) {
    matches.push({ key: 'employee_id', type: 'employee_id', score: 0.8 });
    justifications.push(`Name implies employee.`);
  } else if (['cout_acquisition', 'cac'].includes(normName)) {
    matches.push({ key: 'cac', type: 'cac', score: 0.9 });
    justifications.push(`Name implies CAC.`);
  } else if (['roas'].includes(normName)) {
    matches.push({ key: 'roas', type: 'roas', score: 0.9 });
    justifications.push(`Name implies ROAS.`);
  }

  // 3. Check exact schema properties
  if (matches.length === 0 || matches[0].score < 0.9) {
    for (const [entityName, schema] of Object.entries(ENTITY_SCHEMAS)) {
      if (schema.properties[normName]) {
        matches.push({ key: normName, type: normName, score: 0.9 });
        justifications.push(`Name exactly matches schema property '${normName}' in ${entityName}.`);
        break; // Only need one exact match
      }
    }
  }

  if (matches.length === 0) {
    matches.push({ key: 'unknown', type: 'unknown', score: 0.1 });
    justifications.push(`No exact name match found for '${normName}'.`);
  }

  // Sort by score
  matches.sort((a, b) => b.score - a.score);
  
  // Boost score to ensure it passes the 0.40 threshold even with missing context
  if (matches[0] && matches[0].key !== 'unknown') {
    matches[0].score = Math.max(matches[0].score, 0.9);
  }

  return { matches, justifications };
}

// 2. Data Type Analysis
function analyzeDataType(values: unknown[]): { typeMatch: string, score: number, justification: string } {
  if (!values || values.length === 0) return { typeMatch: 'unknown', score: 0, justification: 'No sample values.' };
  
  let numCount = 0;
  let dateCount = 0;
  let textCount = 0;
  let floatCount = 0;
  
  for (const v of values) {
    if (v == null || v === '') continue;
    if (typeof v === 'number') {
      numCount++;
      if (!Number.isInteger(v)) floatCount++;
    } else if (typeof v === 'string') {
      if (!isNaN(Date.parse(v))) dateCount++;
      else if (!isNaN(Number(v))) {
        numCount++;
        if (v.includes('.')) floatCount++;
      }
      else textCount++;
    }
  }
  
  const total = numCount + dateCount + textCount;
  if (total === 0) return { typeMatch: 'unknown', score: 0, justification: 'Empty values.' };

  if (numCount / total > 0.8) {
    if (floatCount > 0) return { typeMatch: 'currency', score: 0.8, justification: 'Mostly decimals, likely currency or rate.' };
    return { typeMatch: 'quantity', score: 0.7, justification: 'Mostly integers, likely count or quantity.' };
  }
  if (dateCount / total > 0.8) return { typeMatch: 'date', score: 0.9, justification: 'Mostly dates.' };
  
  return { typeMatch: 'text', score: 0.8, justification: 'Mostly text, likely category or identifier.' };
}

// 3. Value Distribution
function analyzeDistribution(values: unknown[]): { rangeMatch: string, score: number, justification: string } {
  let hasNegative = false;
  let allZeroToOne = true;
  let allZeroToHundred = true;
  let hasLarge = false;
  let numCount = 0;

  for (const v of values) {
    let num = NaN;
    if (typeof v === 'number') num = v;
    else if (typeof v === 'string' && !isNaN(Number(v))) num = Number(v);
    
    if (!isNaN(num)) {
      numCount++;
      if (num < 0) hasNegative = true;
      if (num > 1 || num < 0) allZeroToOne = false;
      if (num > 100 || num < 0) allZeroToHundred = false;
      if (num > 100) hasLarge = true;
    }
  }

  if (numCount === 0) return { rangeMatch: 'none', score: 0, justification: 'No numeric values to analyze distribution.' };

  if (hasNegative) return { rangeMatch: 'balance_flow', score: 0.8, justification: 'Negative values present, likely balance or net flow.' };
  if (hasLarge) return { rangeMatch: 'volume', score: 0.7, justification: 'Large positive values, likely revenue/expense volume.' };
  if (allZeroToOne) return { rangeMatch: 'ratio', score: 0.8, justification: 'Values in 0-1 range, likely ratio.' };
  if (allZeroToHundred) return { rangeMatch: 'percentage', score: 0.7, justification: 'Values in 0-100 range, likely percentage.' };

  return { rangeMatch: 'unknown', score: 0.5, justification: 'Generic distribution.' };
}

// 4. Sheet Context
function analyzeContext(sheetName: string, entityHint?: string): { contextMap: Record<string, string>, score: number, justification: string } {
  const norm = normalize(entityHint || sheetName);
  
  if (norm.includes('expense') || norm.includes('depense')) {
    return { contextMap: { 'ambiguous_amount': 'expense_amount' }, score: 0.9, justification: 'Context implies Expenses.' };
  }
  if (norm.includes('order') || norm.includes('commande') || norm.includes('sales')) {
    return { contextMap: { 'ambiguous_amount': 'revenue_amount' }, score: 0.9, justification: 'Context implies Orders/Sales.' };
  }
  if (norm.includes('payroll') || norm.includes('paie') || norm.includes('salaire')) {
    return { contextMap: { 'ambiguous_amount': 'payroll_cost' }, score: 0.9, justification: 'Context implies Payroll.' };
  }

  return { contextMap: {}, score: 0.3, justification: `Neutral context '${norm}'.` };
}

// 5. Sibling Columns
function analyzeSiblings(siblings: string[]): { siblingMap: Record<string, string>, score: number, justification: string } {
  const normSiblings = siblings.map(normalize);
  
  if (normSiblings.some(s => s.includes('expense_cat') || s.includes('fournisseur') || s.includes('vendor'))) {
    return { siblingMap: { 'ambiguous_amount': 'expense_amount' }, score: 0.8, justification: 'Siblings imply Expenses.' };
  }
  if (normSiblings.some(s => s.includes('order_id') || s.includes('client') || s.includes('customer'))) {
    return { siblingMap: { 'ambiguous_amount': 'revenue_amount' }, score: 0.8, justification: 'Siblings imply Revenue.' };
  }
  if (normSiblings.some(s => s.includes('stock') || s.includes('inventory'))) {
    return { siblingMap: { 'ambiguous_amount': 'inventory_value' }, score: 0.8, justification: 'Siblings imply Inventory.' };
  }

  return { siblingMap: {}, score: 0.3, justification: 'Neutral siblings.' };
}

// 6. Memory
function analyzeMemory(
  columnName: string,
  sheetName: string,
  siblings: string[],
  memory?: MappingMemoryEntry[]
): { match: MappingMemoryEntry | null, score: number, justification: string } {
  if (!memory || memory.length === 0) return { match: null, score: 0, justification: 'No mapping memory provided.' };

  const normName = normalize(columnName);
  const normContext = normalize(sheetName);
  const sig = siblings.map(normalize).sort().join('|');

  let bestMatch: MappingMemoryEntry | null = null;
  let bestScore = 0;
  let just = 'No memory match.';

  for (const entry of memory) {
    if (entry.columnName === normName) {
      if (entry.sourceContext === normContext && entry.siblingSignature === sig) {
        return { match: entry, score: 1.0, justification: 'Exact match in mapping memory (name + context + siblings).' };
      }
      if (entry.sourceContext === normContext) {
        bestMatch = entry;
        bestScore = 0.9;
        just = 'Partial match in mapping memory (name + context).';
      }
      if (bestScore < 0.5) {
        bestMatch = entry;
        bestScore = 0.5;
        just = 'Column name match only in mapping memory (low reliability).';
      }
    }
  }

  return { match: bestMatch, score: bestScore, justification: just };
}

export function recognizeColumn(params: ColumnRecognitionParams): ColumnRecognition {
  const { columnName, sheetName, sampleValues, siblingColumns, entityHint, mappingMemory } = params;

  let totalConfidence = 0;
  const justifications: string[] = [];
  
  // Base signals
  const nameSignal = analyzeColumnName(columnName);
  const typeSignal = analyzeDataType(sampleValues);
  const distSignal = analyzeDistribution(sampleValues);
  const ctxSignal = analyzeContext(sheetName, entityHint);
  const sibSignal = analyzeSiblings(siblingColumns);
  const memSignal = analyzeMemory(columnName, sheetName, siblingColumns, mappingMemory);

  // Combine scores
  totalConfidence += nameSignal.matches[0]?.score * WEIGHTS.NAME || 0;
  totalConfidence += typeSignal.score * WEIGHTS.DATA_TYPE;
  totalConfidence += distSignal.score * WEIGHTS.DISTRIBUTION;
  totalConfidence += ctxSignal.score * WEIGHTS.CONTEXT;
  totalConfidence += sibSignal.score * WEIGHTS.SIBLINGS;
  totalConfidence += memSignal.score * WEIGHTS.MEMORY;

  // If the name is an exact match (score >= 0.9), ensure confidence is high enough to not be discarded
  if (nameSignal.matches[0]?.score >= 0.9 && nameSignal.matches[0]?.key !== 'unknown') {
    totalConfidence = Math.max(totalConfidence, 0.70);
  }

  let resolvedKey = nameSignal.matches[0]?.key || 'unknown';
  let resolvedType = nameSignal.matches[0]?.type || 'unknown';
  let resolvedRole = ECONOMIC_ROLES.IDENTIFIER;

  justifications.push(...nameSignal.justifications);
  justifications.push(typeSignal.justification);
  justifications.push(distSignal.justification);
  justifications.push(ctxSignal.justification);
  justifications.push(sibSignal.justification);
  if (memSignal.score > 0) justifications.push(memSignal.justification);

  // Apply Context and Siblings to resolve ambiguity
  if (resolvedKey === 'ambiguous_amount') {
    if (ctxSignal.contextMap['ambiguous_amount']) {
      resolvedKey = ctxSignal.contextMap['ambiguous_amount'];
      resolvedType = resolvedKey.replace('_amount', ''); // simplified fallback
      resolvedRole = ECONOMIC_ROLES.FLOW;
    } else if (sibSignal.siblingMap['ambiguous_amount']) {
      resolvedKey = sibSignal.siblingMap['ambiguous_amount'];
      resolvedType = resolvedKey.replace('_amount', '');
      resolvedRole = ECONOMIC_ROLES.FLOW;
    }
  }

  // Override with memory if high confidence
  if (memSignal.match && memSignal.score >= 0.9) {
    resolvedKey = memSignal.match.resolvedCanonicalKey;
    resolvedType = memSignal.match.resolvedSemanticType;
    resolvedRole = ECONOMIC_ROLES.FLOW; 
  }

  // Determine Role based on types
  if (['revenue', 'expense', 'payroll_cost'].includes(resolvedType)) resolvedRole = ECONOMIC_ROLES.FLOW;
  if (['cash_balance', 'inventory'].includes(resolvedType)) resolvedRole = ECONOMIC_ROLES.STOCK;

  if (totalConfidence < 0.40) {
    resolvedKey = 'unknown';
    resolvedType = 'unknown';
  }

  return {
    canonicalKey: resolvedKey,
    semanticType: resolvedType,
    economicRole: resolvedRole,
    confidence: Math.min(1.0, totalConfidence),
    justification: justifications,
    alternatives: [], 
    requiresValidation: totalConfidence < 0.60
  };
}

export function recognizeAllColumns(params: SheetRecognitionParams): Map<string, ColumnRecognition> {
  const { sheetName, headers, sampleRows, entityHint, mappingMemory } = params;
  const results = new Map<string, ColumnRecognition>();

  for (const header of headers) {
    const siblings = headers.filter(h => h !== header);
    const sampleValues = sampleRows.map(row => row[header]);

    const recognition = recognizeColumn({
      columnName: header,
      sheetName,
      sampleValues,
      siblingColumns: siblings,
      entityHint,
      mappingMemory
    });

    results.set(header, recognition);
  }

  return results;
}
