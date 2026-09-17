// ─────────────────────────────────────────────────────────────────────────────
// GESCOP Recognition Engine — Contradiction & Negative Terms Engine
// Version 5.0 — Septembre 2026
// ─────────────────────────────────────────────────────────────────────────────

import { Registry } from "../ontology/index.ts";
import { stripAccents } from "./normalizer.ts";
import type { ValueProfile } from "./valueProfiler.ts";
import type { ExtractedUnitInfo } from "./unitEngine.ts";

export interface ContradictionEvaluation {
  hasContradiction: boolean;
  penalty: number; // 0.0 (pas de contradiction) à 1.0 (disqualification)
  violations: string[];
}

/**
 * Analyse si un concept candidat est en contradiction flagrante avec les preuves
 */
export function evaluateContradictions(
  conceptId: string,
  rawHeader: string,
  tokens: string[],
  valueProfile?: ValueProfile,
  unitInfo?: ExtractedUnitInfo
): ContradictionEvaluation {
  const concept = Registry.getConcept(conceptId);
  if (!concept) {
    return { hasContradiction: false, penalty: 0, violations: [] };
  }

  const normHeader = stripAccents(rawHeader.toLowerCase());
  const violations: string[] = [];
  let penalty = 0;

  // 1. Contrôle des Termes Négatifs Spécifiés dans l'Ontologie
  if (concept.negativeTerms && concept.negativeTerms.length > 0) {
    for (const neg of concept.negativeTerms) {
      const normNeg = stripAccents(neg.toLowerCase());
      if (tokens.includes(normNeg) || normHeader.includes(normNeg)) {
        penalty += 0.45;
        violations.push(`Terme négatif '${neg}' présent dans l'en-tête pour le concept ${conceptId}.`);
      }
    }
  }

  // 2. Règle d'or : gross_profit ($) vs gross_margin (%)
  if (conceptId === "finance.profit.gross") {
    // Si l'en-tête ou l'unité indique un pourcentage -> contradiction majeure avec gross_profit
    if (unitInfo?.unitType === "percentage" || normHeader.includes("%") || tokens.includes("margin") || tokens.includes("marge")) {
      penalty += 0.6;
      violations.push("Contradiction : 'gross_profit' est un montant en devise, or un pourcentage/marge est détecté.");
    }
  }

  if (conceptId === "finance.margin.gross_rate") {
    // Si l'en-tête indique un montant monétaire ou des devises ($ / €) -> contradiction avec gross_margin
    if (unitInfo?.unitType === "currency" || tokens.includes("montant") || tokens.includes("amount") || tokens.includes("valeur")) {
      penalty += 0.6;
      violations.push("Contradiction : 'gross_margin' est un ratio/taux, or un montant monétaire est détecté.");
    }
  }

  // 3. Règle d'or : Revenue vs Quantité
  if (concept.domain === "sales" && concept.subdomain === "revenue") {
    if (valueProfile?.isIntegerOnly && (tokens.includes("qty") || tokens.includes("quantite") || tokens.includes("units"))) {
      penalty += 0.8;
      violations.push("Contradiction : Une quantité physique d'unités ne peut pas être un chiffre d'affaires.");
    }
  }

  // 4. Règle d'or : Trésorerie (Opening vs Closing)
  if (conceptId === "treasury.cash.opening" && (tokens.includes("cloture") || tokens.includes("closing") || tokens.includes("fin"))) {
    penalty += 0.9;
    violations.push("Contradiction : En-tête de clôture attribué à un solde d'ouverture.");
  }
  if (conceptId === "treasury.cash.closing" && (tokens.includes("ouverture") || tokens.includes("opening") || tokens.includes("debut"))) {
    penalty += 0.9;
    violations.push("Contradiction : En-tête d'ouverture attribué à un solde de clôture.");
  }

  // 5. Règle d'or : Trésorerie (Flux In vs Out)
  if (conceptId === "treasury.cash.inflow" && (tokens.includes("sortie") || tokens.includes("outflow") || tokens.includes("decaissement"))) {
    penalty += 0.9;
    violations.push("Contradiction : Flux sortant attribué à un encaissement.");
  }
  if (conceptId === "treasury.cash.outflow" && (tokens.includes("entree") || tokens.includes("inflow") || tokens.includes("encaissement"))) {
    penalty += 0.9;
    violations.push("Contradiction : Flux entrant attribué à un décaissement.");
  }

  // Plafonnement de la pénalité à 1.0
  const totalPenalty = Math.min(1.0, Number(penalty.toFixed(2)));

  return {
    hasContradiction: totalPenalty >= 0.5,
    penalty: totalPenalty,
    violations,
  };
}
