/**
 * GESCOP - Context Engine
 * 
 * Phase 5 du Pipeline d'Intelligence
 * Rle : Croiser les 3 mondes (Quantitatif, Qualitatif, Externe)
 * pour identifier des corrǸlations, des associations ou des relations temporelles.
 */

import { Observation } from './observationEngine.ts';
import { QualitativeSignal } from './qualitativeEngine.ts';

export type ContextRelationship = {
  type: 'correlation' | 'temporal' | 'association' | 'causal_candidate';
  primary_concept: string;
  secondary_concept: string;
  description: string;
  strength: number; // 0.0  1.0
};

/**
 * Cherche des liens logiques entre les mǸtriques financiǸres (Quant)
 * et les signaux textuels (Qual) ou externes (Ext).
 * (Exemple nalf : Si les plaintes "prix" augmentent, chercher si les ventes baissent)
 */
export function buildContextGraph(
  quantMetrics: Record<string, number>,
  qualSignals: QualitativeSignal[],
  extObservations: Observation[]
): ContextRelationship[] {
  
  const relationships: ContextRelationship[] = [];

  // 1. Analyse Qual -> Quant (Exemple: SensibilitǸ au prix affecte la conversion)
  const negativeSignals = qualSignals.filter(s => s.sentiment === 'negative');
  const priceComplaints = negativeSignals.filter(s => s.issues.includes('price_sensitivity')).length;
  
  if (priceComplaints > 0 && quantMetrics['revenue'] !== undefined) {
    relationships.push({
      type: 'association',
      primary_concept: 'qualitative.price_sensitivity',
      secondary_concept: 'finance.revenue',
      description: 'PrǸsence de rǸclamations sur les prix associǸe aux rǸsultats financiers actuels.',
      strength: Math.min(1.0, priceComplaints / 10) // Calcul trs basique
    });
  }

  // 2. Analyse Ext -> Quant (Exemple: Le concurrent baisse son prix -> impact potentiel)
  const competitorPriceDrops = extObservations.filter(
    o => o.concept === 'external.competitor_price_change' && (o.value || 0) < 0
  );

  if (competitorPriceDrops.length > 0) {
    relationships.push({
      type: 'temporal',
      primary_concept: 'external.competitor_price_change',
      secondary_concept: 'finance.revenue',
      description: `Baisse de prix dǸtectǸe chez un concurrent (${competitorPriceDrops[0].entity_id}).`,
      strength: 0.8
    });
  }

  // 3. Synthse Causal Candidate
  // Si le concurrent baisse le prix ET que les clients se plaignent du prix
  if (competitorPriceDrops.length > 0 && priceComplaints > 0) {
    relationships.push({
      type: 'causal_candidate',
      primary_concept: 'external.competitor_pricing',
      secondary_concept: 'qualitative.price_sensitivity',
      description: 'Forte probabilitǸ que la sensibilitǸ au prix soit exacerbǸe par la promotion du concurrent.',
      strength: 0.95
    });
  }

  return relationships;
}
