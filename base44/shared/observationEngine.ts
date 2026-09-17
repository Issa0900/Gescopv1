/**
 * GESCOP - Observation Engine
 * 
 * Etape 5 du Pipeline SǸmantique (Phase 1)
 * Rle : Convertir une ligne normalisǸe en un ensemble d'"Observations" indǸpendantes.
 * C'est l'abstraction centrale de la nouvelle architecture (RAW ≠ NORMALIZED).
 */

import { SemanticMatch } from './semanticMatcher.ts';
import { DatasetGrain } from './grainEngine.ts';

export type ObservationType = 'quantitative' | 'qualitative' | 'external';

export type Observation = {
  observation_type: ObservationType;
  concept: string;          // ex: "finance.revenue"
  value?: number;           // pour le quantitatif
  text?: string;            // pour le qualitatif
  unit?: string;            // ex: "CAD", "percent"
  date?: string;            // Date d'observation (ISO)
  entity_id?: string;       // RǸfǸrence (ex: ID client, ID produit)
  source_id: string;        // TraabilitǸ (ID de l'import ou du fichier)
  confidence: number;       // Confiance hǸritǸe du Semantic Matcher
};

/**
 * Prend une ligne normalisǸe et les concepts matchǸs, et gǸnre des observations.
 */
export function generateObservations(
  normalizedRow: Record<string, any>,
  matchedConcepts: Record<string, SemanticMatch>,
  sourceId: string,
  grain: DatasetGrain
): Observation[] {
  
  const observations: Observation[] = [];
  
  // RǸcupǸrer le contexte gǸnǸral de la ligne (Date, EntitǸ)
  let rowDate: string | undefined;
  let rowEntityId: string | undefined;
  
  for (const [colName, match] of Object.entries(matchedConcepts)) {
    if (match.concept === 'temporal.date') rowDate = normalizedRow[colName];
    if (match.concept.endsWith('.id')) rowEntityId = String(normalizedRow[colName]);
  }

  // Pour chaque colonne matchǸe, gǸnǸrer une observation correspondante
  for (const [colName, match] of Object.entries(matchedConcepts)) {
    // Ne pas crǸer d'observation pour les mǸtadonnǸes (date, id)
    if (match.concept === 'temporal.date' || match.concept.endsWith('.id')) continue;
    
    const value = normalizedRow[colName];
    if (value === null || value === undefined) continue;

    let obsType: ObservationType = 'quantitative';
    if (match.concept.startsWith('qualitative.')) obsType = 'qualitative';
    if (match.concept.startsWith('external.')) obsType = 'external';

    const observation: Observation = {
      observation_type: obsType,
      concept: match.concept,
      source_id: sourceId,
      confidence: match.confidence,
      date: rowDate,
      entity_id: rowEntityId
    };

    if (obsType === 'quantitative' && typeof value === 'number') {
      observation.value = value;
    } else if (obsType === 'qualitative') {
      observation.text = String(value);
    } else {
      observation.text = String(value); // Fallback
    }

    observations.push(observation);
  }

  return observations;
}

