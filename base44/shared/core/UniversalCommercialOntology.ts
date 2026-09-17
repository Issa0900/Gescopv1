// ─────────────────────────────────────────────────────────────────────────────
// GESCOP — Universal Commercial Ontology (UCO) Master Entry Point
// Version 5.0 — Septembre 2026
// ─────────────────────────────────────────────────────────────────────────────

import { Registry } from "./ontology/index.ts";
import type { CanonicalConcept, RecognitionResult } from "./ontology/types.ts";
import { analyzeColumn } from "./recognition/mappingDecisionEngine.ts";
import type { ColumnRecognitionRequest } from "./recognition/mappingDecisionEngine.ts";

export * from "./ontology/types.ts";
export { Registry } from "./ontology/index.ts";
export { analyzeColumn } from "./recognition/mappingDecisionEngine.ts";

export interface SheetAnalysisParams {
  sheetName: string;
  headers: string[];
  sampleRows?: Record<string, unknown>[];
  entityHint?: string;
  mappingMemory?: any[];
}

/**
 * Analyse l'ensemble des colonnes d'une feuille de calcul ou fichier
 */
export function analyzeSheet(params: SheetAnalysisParams): Map<string, RecognitionResult> {
  const { sheetName, headers, sampleRows = [], entityHint, mappingMemory } = params;
  const results = new Map<string, RecognitionResult>();

  for (const header of headers) {
    const siblings = headers.filter((h) => h !== header);
    const sampleValues = sampleRows.map((r) => r[header]);

    const recognition = analyzeColumn({
      columnName: header,
      sheetName,
      sampleValues,
      siblingColumns: siblings,
      entityHint,
      mappingMemory,
    });

    results.set(header, recognition);
  }

  return results;
}

export const UniversalCommercialOntology = {
  Registry,
  analyzeColumn,
  analyzeSheet,
};
