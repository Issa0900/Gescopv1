/**
 * GESCOP - Semantic Matcher
 * 
 * Etape 2 du Pipeline SǸmantique (Phase 1)
 * Rle : Associer chaque colonne profilǸe  un "Concept MǸtier" canonique
 * avec un score de confiance, au lieu de faire un simple mapping de nom de colonne.
 */

import { ColumnProfile } from './dataProfiler.ts';
import { buildConceptMappingsFromRegistry } from './registry/generateAliases.ts';

export type SemanticMatch = {
  concept: string;         // e.g. "finance.revenue", "temporal.date", "customer.id"
  confidence: number;      // 0.0 to 1.0
  method: string;          // "exact_match", "synonym+type", "ai_inference"
  requiresValidation: boolean;
};

// Genere depuis le registre unique (registry/conceptRegistry.ts, spec v2 section 3).
// Ne plus ajouter de concept ici : l'ajouter au registre, qui alimente aussi
// FIELD_ALIASES et contextualRecognition.ts pour que les trois couches ne
// puissent plus diverger comme elles l'ont fait pour "Facebook Ads".
const CONCEPT_MAPPINGS = buildConceptMappingsFromRegistry();

function normalizeString(str: string): string {
  return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]/g, "");
}

/**
 * Tente de relier un profil de colonne  un concept mǸtier connu.
 */
export function matchConcept(profile: ColumnProfile): SemanticMatch | null {
  const normName = normalizeString(profile.columnName);
  
  let bestMatch: SemanticMatch | null = null;

  for (const mapping of CONCEPT_MAPPINGS) {
    // 1. VǸrifier la compatibilitǸ des types
    const typeIsCompatible = Array.isArray(mapping.type) 
      ? mapping.type.includes(profile.inferredType)
      : mapping.type === profile.inferredType;

    if (!typeIsCompatible && profile.inferredType !== 'unknown') {
      continue; // Le type de donnǸe ne correspond pas du tout au concept
    }

    // 2. Recherche par mots-clǸs (Scoring)
    let score = 0;
    for (const kw of mapping.keywords) {
      if (normName === kw) {
        score = 1.0; // Match exact
        break;
      } else if (normName.includes(kw)) {
        score = 0.7; // Match partiel
      }
    }

    // 3. Bonus si le type correspond parfaitement
    if (score > 0 && typeIsCompatible) {
      score = Math.min(1.0, score + 0.2);
    }

    if (score > 0.5 && (!bestMatch || score > bestMatch.confidence)) {
      bestMatch = {
        concept: mapping.concept,
        confidence: score,
        method: score === 1.0 ? 'exact_match' : 'synonym+type',
        requiresValidation: score < 0.8
      };
    }
  }

  return bestMatch;
}

