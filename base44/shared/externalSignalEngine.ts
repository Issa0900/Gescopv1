/**
 * GESCOP - External Signal Engine
 * 
 * Phase 4 du Pipeline d'Intelligence
 * Rle : GǸrer le registre des sources de donnǸes externes (ActualitǸs, Gouvernement, Concurrents)
 * et standardiser ces signaux en Observations.
 */

import { Observation } from './observationEngine.ts';

export type ExternalDataSource = {
  id: string;
  name: string;
  type: 'competitor' | 'market' | 'government' | 'economic' | 'news' | 'regulation';
  url?: string;
  trust_level: number; // 0.0  1.0
};

export type RawExternalSignal = {
  source_id: string;
  category: string;
  concept: string;
  entity: string;
  value?: number;
  unit?: string;
  text?: string;
  observed_at: string;
};

/**
 * Convertit un signal brut provenant du Web (Radar) en une Observation canonique
 * qui pourra tre croisǸe par le Context Engine.
 */
export function processExternalSignal(signal: RawExternalSignal, source: ExternalDataSource): Observation {
  return {
    observation_type: 'external',
    concept: `external.${signal.concept}`, // ex: "external.competitor_price_change"
    value: signal.value,
    unit: signal.unit,
    text: signal.text,
    date: signal.observed_at,
    entity_id: signal.entity,
    source_id: signal.source_id,
    confidence: source.trust_level // La confiance hǸrite de la fiabilitǸ de la source
  };
}

