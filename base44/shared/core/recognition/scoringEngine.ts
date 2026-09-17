// ─────────────────────────────────────────────────────────────────────────────
// GESCOP Recognition Engine — Multi-Criteria Scoring Engine
// Version 5.0 — Septembre 2026
// ─────────────────────────────────────────────────────────────────────────────

import { Registry } from "../ontology/index.ts";
import type { ValueProfile } from "./valueProfiler.ts";
import type { ExtractedUnitInfo } from "./unitEngine.ts";
import type { ContextAnalysis } from "./contextEngine.ts";
import { evaluateContradictions } from "./contradictionEngine.ts";

export interface ScoreBreakdown {
  conceptId: string;
  totalScore: number;
  confidence: number;
  lexicalScore: number;
  abbreviationScore: number;
  contextScore: number;
  valueScore: number;
  unitScore: number;
  penalty: number;
  evidence: string[];
}

const WEIGHTS = {
  LEXICAL: 0.35,
  ABBREVIATION: 0.25,
  CONTEXT: 0.20,
  VALUE_PROFILE: 0.10,
  UNIT: 0.10,
};

/**
 * Calcule le score multidimensionnel d'un concept candidat
 */
export function scoreCandidate(
  conceptId: string,
  rawHeader: string,
  tokens: string[],
  lexicalSimilarity: number,
  abbrevMatchConfidence: number,
  context: ContextAnalysis,
  valueProfile?: ValueProfile,
  unitInfo?: ExtractedUnitInfo
): ScoreBreakdown {
  const concept = Registry.getConcept(conceptId);
  const evidence: string[] = [];

  let lexicalScore = Math.max(0, Math.min(1.0, lexicalSimilarity));
  if (lexicalScore >= 0.8) evidence.push(`Correspondance lexicale forte (${Math.round(lexicalScore * 100)}%)`);

  let abbreviationScore = Math.max(0, Math.min(1.0, abbrevMatchConfidence));
  if (abbreviationScore >= 0.8) evidence.push(`Abréviation reconnue (${Math.round(abbreviationScore * 100)}%)`);

  // Score contextuel
  let contextScore = 0.5; // neutre
  if (concept) {
    if (context.inferredDomain === concept.domain) {
      contextScore = 0.95;
      evidence.push(`Cohérence de domaine métier '${concept.domain}'`);
    } else if (context.isOrderContext && concept.domain === "sales") {
      contextScore = 0.9;
      evidence.push("Cohérence avec le contexte de commande");
    } else if (context.isExpenseContext && concept.domain === "finance") {
      contextScore = 0.9;
      evidence.push("Cohérence avec le contexte de charges");
    } else if (context.isCashflowContext && concept.domain === "treasury") {
      contextScore = 0.95;
      evidence.push("Cohérence avec le contexte de trésorerie");
    }
  }

  // Score profil de valeur
  let valueScore = 0.5; // neutre
  if (valueProfile && concept) {
    if (concept.logicalType === valueProfile.detectedLogicalType) {
      valueScore = 0.95;
      evidence.push(`Type logique de valeur validé (${concept.logicalType})`);
    } else if (valueProfile.isRatingCandidate && concept.logicalType === "RATING") {
      valueScore = 0.95;
      evidence.push("Distribution des valeurs conforme à une note/évaluation");
    } else if (valueProfile.isPercentageCandidate && concept.logicalType === "PERCENTAGE") {
      valueScore = 0.95;
      evidence.push("Distribution des valeurs conforme à un pourcentage");
    } else if (valueProfile.isNumeric && concept.physicalType === "DECIMAL") {
      valueScore = 0.8;
    }
  }

  // Score unité
  let unitScore = 0.5; // neutre
  if (unitInfo && concept) {
    if (unitInfo.unitType === "currency" && concept.logicalType === "CURRENCY") {
      unitScore = 0.95;
      evidence.push(`Devise détectée (${unitInfo.currencyCode || "$"})`);
    } else if (unitInfo.unitType === "percentage" && concept.logicalType === "PERCENTAGE") {
      unitScore = 0.95;
      evidence.push("Unité de pourcentage (%) confirmée");
    } else if (unitInfo.unitType === "duration" && concept.logicalType === "DURATION") {
      unitScore = 0.95;
      evidence.push("Unité de durée confirmée");
    }
  }

  // Calcul pénalités de contradiction
  const contradiction = evaluateContradictions(conceptId, rawHeader, tokens, valueProfile, unitInfo);
  if (contradiction.violations.length > 0) {
    evidence.push(...contradiction.violations);
  }

  // Calcul pondéré
  let rawScore =
    lexicalScore * WEIGHTS.LEXICAL +
    abbreviationScore * WEIGHTS.ABBREVIATION +
    contextScore * WEIGHTS.CONTEXT +
    valueScore * WEIGHTS.VALUE_PROFILE +
    unitScore * WEIGHTS.UNIT;

  // Boost si correspondance lexicale ou abréviation très forte sans contradiction
  if (contradiction.penalty === 0) {
    if (lexicalScore >= 0.95 || abbreviationScore >= 0.95) {
      rawScore = Math.max(rawScore, 0.88);
    } else if (lexicalScore >= 0.85 || abbreviationScore >= 0.85) {
      rawScore = Math.max(rawScore, 0.78);
    }
  }

  // Soustraction de la pénalité de contradiction
  let finalScore = Math.max(0, rawScore - contradiction.penalty);
  let confidence = Number(Math.min(1.0, finalScore).toFixed(2));

  return {
    conceptId,
    totalScore: Number(finalScore.toFixed(3)),
    confidence,
    lexicalScore,
    abbreviationScore,
    contextScore,
    valueScore,
    unitScore,
    penalty: contradiction.penalty,
    evidence,
  };
}
