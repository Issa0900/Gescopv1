/**
 * GESCOP - Evidence Engine
 * 
 * Phase 6 du Pipeline d'Intelligence
 * Rle : Lier chaque dǸclaration ou aperu d'Intelligence Artificielle
 *  des "Preuves" (Evidences) mathǸmatiques, textuelles ou externes incontestables.
 */

import { ObservationType } from './observationEngine.ts';

export type Evidence = {
  type: ObservationType;
  concept: string;
  value?: number;
  topic?: string;
};

export type InsightWithEvidence = {
  insight: string;
  evidence: Evidence[];
};

/**
 * Construit un bloc d'Insight sǸcurisǸ avec ses preuves  partir des rǸsultats
 * du Context Engine ou du KPI Engine. 
 * L'IA s'appuiera l-dessus pour ne pas halluciner.
 */
export function buildInsight(insightText: string, evidences: Evidence[]): InsightWithEvidence {
  return {
    insight: insightText,
    evidence: evidences
  };
}

// Exemple de gǸnǸration :
// buildInsight("La marge brute diminue possiblement  cause de la pression concurrentielle.", [
//   { type: 'quantitative', concept: 'gross_margin', value: 31.4 },
//   { type: 'external', concept: 'competitor_price_change', value: -10 },
//   { type: 'qualitative', concept: 'customer_feedback', topic: 'price' }
// ]);
