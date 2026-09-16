/**
 * GESCOP - Grain Engine
 * 
 * Etape 4 du Pipeline SǸmantique (Phase 1)
 * Rle : DǸterminer le niveau de granularitǸ d'un jeu de donnǸes (ex: 1 ligne = 1 transaction vs 1 ligne = 1 mois)
 * pour Ǹviter les doubles comptages.
 */

import { SemanticMatch } from './semanticMatcher.ts';
import { DatasetProfile } from './dataProfiler.ts';

export type DatasetGrain = {
  type: 'transactional' | 'aggregated' | 'entity_catalog' | 'unknown';
  resolution?: 'daily' | 'monthly' | 'yearly';
  confidence: number;
};

/**
 * DǸduit le grain du jeu de donnǸes sur la base des concepts dǸtectǸs et des statistiques.
 */
export function detectGrain(
  profile: DatasetProfile,
  matchedConcepts: Record<string, SemanticMatch>
): DatasetGrain {
  
  const hasDate = Object.values(matchedConcepts).some(m => m.concept === 'temporal.date');
  const hasEntityId = Object.values(matchedConcepts).some(m => m.concept.endsWith('.id'));
  const hasRevenue = Object.values(matchedConcepts).some(m => m.concept === 'finance.revenue');

  // Si on a un ID (client, produit) mais pas de date, c'est srement un catalogue (Entity Catalog)
  if (hasEntityId && !hasDate) {
    return { type: 'entity_catalog', confidence: 0.8 };
  }

  // S'il n'y a pas de date du tout, dur  dǸterminer, probablement aggregǸ ou dimensionnel
  if (!hasDate) {
    return { type: 'unknown', confidence: 0.2 };
  }

  // Cherchons la colonne date pour vǸrifier la rǸsolution
  let dateColumnName = '';
  for (const [col, match] of Object.entries(matchedConcepts)) {
    if (match.concept === 'temporal.date') {
      dateColumnName = col;
      break;
    }
  }

  if (dateColumnName && profile.columns[dateColumnName]) {
    const uniqueDates = profile.columns[dateColumnName].uniqueValues;
    const rowCount = profile.rowCount;

    // Si quasiment chaque ligne a une date diffǸrente ou beaucoup de doublons sur la mme date,
    // on est srement sur du transactionnel (plusieurs ǸvǸnements le mme jour).
    // Si uniqueDates est petit (ex: 12 pour une annǸe de CA mensuel) et rowCount == uniqueDates, c'est aggregǸ.
    
    if (uniqueDates === rowCount && rowCount < 50) {
      return { 
        type: 'aggregated', 
        resolution: rowCount <= 12 ? 'monthly' : 'daily', 
        confidence: 0.85 
      };
    }
    
    if (rowCount > uniqueDates * 2) {
      return { type: 'transactional', confidence: 0.9 };
    }
  }

  // Fallback
  return { type: 'transactional', confidence: 0.5 };
}
