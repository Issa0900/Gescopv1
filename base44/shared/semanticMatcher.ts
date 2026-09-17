/**
 * GESCOP - Semantic Matcher
 * 
 * Etape 2 du Pipeline SǸmantique (Phase 1)
 * Rle : Associer chaque colonne profilǸe  un "Concept MǸtier" canonique
 * avec un score de confiance, au lieu de faire un simple mapping de nom de colonne.
 */

import { ColumnProfile } from './dataProfiler.ts';

export type SemanticMatch = {
  concept: string;         // e.g. "finance.revenue", "temporal.date", "customer.id"
  confidence: number;      // 0.0 to 1.0
  method: string;          // "exact_match", "synonym+type", "ai_inference"
  requiresValidation: boolean;
};

// Dictionnaire basique (qui sera plus tard alimentǸ par un vrai SemanticDictionary)
const CONCEPT_MAPPINGS = [
  { concept: 'temporal.date', type: 'date', keywords: ['date', 'periode', 'mois', 'annee', 'timestamp', 'created_at'] },
  { concept: 'finance.revenue', type: ['decimal', 'currency', 'integer'], keywords: ['ca', 'chiffre', 'affaire', 'revenu', 'revenue', 'ventes', 'sales', 'montant'] },
  { concept: 'finance.cogs', type: ['decimal', 'currency', 'integer'], keywords: ['cout', 'achat', 'cogs', 'cost', 'depense'] },
  { concept: 'customer.count', type: 'integer', keywords: ['clients', 'acheteurs', 'customers', 'nb', 'nombre'] },
  { concept: 'customer.id', type: ['string', 'integer'], keywords: ['client_id', 'id_client', 'customer_id'] },
  { concept: 'qualitative.feedback', type: 'string', keywords: ['commentaire', 'avis', 'feedback', 'review', 'remarque'] },
];

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
