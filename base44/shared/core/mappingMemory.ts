/**
 * Mapping Memory Engine
 * Phase 3, Sprint 2
 *
 * This module handles learning from user corrections during data import.
 * It stores mapping corrections WITH CONTEXT so they can be reused on future imports.
 *
 * Fundamental Rule:
 * - NEVER map a column context-free.
 * - ALWAYS map column + context (e.g. source context, sibling columns).
 */

import { stripAccents } from '../importUtils.ts';

/**
 * Normalizes a string for mapping memory by stripping accents, lowercasing, and trimming.
 */
function normalizeString(str: string): string {
  if (!str) return '';
  return stripAccents(str).trim().toLowerCase();
}

/**
 * Represents a stored mapping memory entry.
 */
export interface MappingMemoryEntry {
  columnName: string;           // normalized column name (stripAccents + lowercase)
  sourceContext: string;        // normalized entity/sheet name
  siblingSignature: string;     // sorted sibling column keys joined by '|'
  resolvedCanonicalKey: string; // e.g. 'expense_amount'
  resolvedSemanticType: string; // e.g. 'expense'
  confirmedBy: 'user' | 'auto';
  usageCount: number;
  lastUsed: string;             // ISO date string
  confidence: number;           // 1.0 for user-confirmed
}

/**
 * Builds a sibling signature by normalizing, sorting, and joining sibling columns.
 * @param siblingColumns List of sibling column names
 * @returns A normalized signature string
 */
export function buildSiblingSignature(siblingColumns: string[]): string {
  return siblingColumns
    .map(normalizeString)
    .sort()
    .join('|');
}

/**
 * Builds a unique lookup key combining column, context, and sibling signature.
 * @param columnName The normalized column name
 * @param sourceContext The normalized source context
 * @param siblingSignature The sibling signature
 * @returns The unique memory key
 */
export function buildMemoryKey(columnName: string, sourceContext: string, siblingSignature: string): string {
  const normalizedColumn = normalizeString(columnName);
  const normalizedContext = normalizeString(sourceContext);
  return `${normalizedColumn}::${normalizedContext}::${siblingSignature}`;
}

export interface MemoryLookupParams {
  columnName: string;
  sourceContext: string;
  siblingColumns: string[];
  memory: MappingMemoryEntry[];
}

/**
 * Looks up a memory entry based on priority match.
 * Priority:
 * 1. EXACT match: column + context + siblings -> confidence 1.0
 * 2. CONTEXT match: column + context (siblings differ) -> confidence 0.90
 * 3. COLUMN-ONLY match: column only -> confidence 0.50
 *
 * @param params Lookup parameters
 * @returns The best matching memory entry or null
 */
export function lookupMemory(params: MemoryLookupParams): MappingMemoryEntry | null {
  const normColumn = normalizeString(params.columnName);
  const normContext = normalizeString(params.sourceContext);
  const siblingSig = buildSiblingSignature(params.siblingColumns);

  let bestMatch: MappingMemoryEntry | null = null;
  let bestScore = -1;

  for (const entry of params.memory) {
    if (entry.columnName === normColumn) {
      if (entry.sourceContext === normContext) {
        if (entry.siblingSignature === siblingSig) {
          // Exact match
          if (bestScore < 100) {
            bestMatch = { ...entry, confidence: 1.0 };
            bestScore = 100;
          }
        } else {
          // Context match
          if (bestScore < 90) {
            bestMatch = { ...entry, confidence: 0.90 };
            bestScore = 90;
          }
        }
      } else {
        // Column only match
        if (bestScore < 50) {
          bestMatch = { ...entry, confidence: 0.50 };
          bestScore = 50;
        }
      }
    }
  }

  return bestMatch;
}

export interface CreateMemoryParams {
  columnName: string;
  sourceContext: string;
  siblingColumns: string[];
  canonicalKey: string;
  semanticType: string;
  confirmedBy: 'user' | 'auto';
}

/**
 * Creates a new memory entry.
 * @param params Parameters to create the entry
 * @returns A new MappingMemoryEntry
 */
export function createMemoryEntry(params: CreateMemoryParams): MappingMemoryEntry {
  const normColumn = normalizeString(params.columnName);
  const normContext = normalizeString(params.sourceContext);
  const siblingSig = buildSiblingSignature(params.siblingColumns);

  return {
    columnName: normColumn,
    sourceContext: normContext,
    siblingSignature: siblingSig,
    resolvedCanonicalKey: params.canonicalKey,
    resolvedSemanticType: params.semanticType,
    confirmedBy: params.confirmedBy,
    usageCount: 1,
    lastUsed: new Date().toISOString(),
    confidence: params.confirmedBy === 'user' ? 1.0 : 0.8,
  };
}

/**
 * Updates an existing memory entry, incrementing usage and adjusting confidence.
 * @param existing The existing memory entry
 * @returns Updated memory entry
 */
export function updateMemoryEntry(existing: MappingMemoryEntry): MappingMemoryEntry {
  const newUsageCount = existing.usageCount + 1;
  let newConfidence = existing.confidence;

  if (existing.confirmedBy === 'auto') {
    // Increase confidence slightly for auto entries, up to max 0.95
    newConfidence = Math.min(0.95, existing.confidence + 0.05);
  }

  return {
    ...existing,
    usageCount: newUsageCount,
    lastUsed: new Date().toISOString(),
    confidence: newConfidence,
  };
}

/**
 * Merges new memory entries into existing memory.
 * - Deduplicates by memory key.
 * - User confirmed overrides auto.
 * - Higher usage count wins for auto ties.
 *
 * @param existingMemory Existing entries
 * @param newEntries New entries to merge
 * @returns Merged array of memory entries
 */
export function mergeMemory(existingMemory: MappingMemoryEntry[], newEntries: MappingMemoryEntry[]): MappingMemoryEntry[] {
  const map = new Map<string, MappingMemoryEntry>();

  const addToMap = (entry: MappingMemoryEntry) => {
    const key = buildMemoryKey(entry.columnName, entry.sourceContext, entry.siblingSignature);
    const existing = map.get(key);

    if (!existing) {
      map.set(key, entry);
    } else {
      // Conflict resolution
      if (entry.confirmedBy === 'user' && existing.confirmedBy !== 'user') {
        map.set(key, entry);
      } else if (entry.confirmedBy === 'user' && existing.confirmedBy === 'user') {
        if (entry.usageCount > existing.usageCount) {
          map.set(key, entry);
        } else if (entry.usageCount === existing.usageCount) {
            // Tie break based on last used time
            if (new Date(entry.lastUsed) > new Date(existing.lastUsed)) {
                map.set(key, entry);
            }
        }
      } else if (entry.confirmedBy === 'auto' && existing.confirmedBy === 'auto') {
        if (entry.usageCount > existing.usageCount) {
          map.set(key, entry);
        } else if (entry.usageCount === existing.usageCount) {
            if (new Date(entry.lastUsed) > new Date(existing.lastUsed)) {
                map.set(key, entry);
            }
        }
      }
    }
  };

  existingMemory.forEach(addToMap);
  newEntries.forEach(addToMap);

  return Array.from(map.values());
}

/**
 * Serializes memory entries to JSON string.
 * @param memory The memory array
 * @returns JSON string
 */
export function serializeMemory(memory: MappingMemoryEntry[]): string {
  return JSON.stringify(memory);
}

/**
 * Deserializes memory entries from JSON string.
 * @param serialized JSON string
 * @returns Array of MappingMemoryEntry
 */
export function deserializeMemory(serialized: string): MappingMemoryEntry[] {
  if (!serialized) return [];
  try {
    const parsed = JSON.parse(serialized);
    if (!Array.isArray(parsed)) {
      console.warn('Memory payload is not an array.');
      return [];
    }
    return parsed as MappingMemoryEntry[];
  } catch (err) {
    console.error('Failed to parse memory JSON:', err);
    return [];
  }
}
