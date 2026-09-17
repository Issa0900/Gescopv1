// ─────────────────────────────────────────────────────────────────────────────
// GESCOP Universal Data Engine — Multi-Level Decision Matrix
// Version 3.0 — Septembre 2026 (Spec Section 26)
// ─────────────────────────────────────────────────────────────────────────────

import type { QualityProfile } from "./qualityEngine.ts";

export type DecisionAction =
  | "AUTOMATIC"
  | "AUTOMATIC_LOGGED"
  | "RECOMMENDED_REVIEW"
  | "REQUIRED_REVIEW"
  | "QUARANTINE_REJECT";

export interface DecisionVerdict {
  action: DecisionAction;
  confidenceScore: number;     // 0 - 100
  canAutoProceed: boolean;
  requiresUserConfirmation: boolean;
  statusLabel: string;
  uiTone: "success" | "info" | "warning" | "danger";
  reasons: string[];
  suggestedAction: string;
}

/**
 * Évalue la décision d'intégration selon la matrice de confiance universelle (Spec Section 26)
 */
export function evaluateDecision(
  quality: QualityProfile,
  semanticConfidence: number // 0.0 - 1.0 ou 0 - 100
): DecisionVerdict {
  const normSemantic = semanticConfidence > 1 ? semanticConfidence / 100 : semanticConfidence;
  const normQuality = quality.overallQualityScore / 100;

  // Score combiné : Qualité des données (50%) + Confiance sémantique de compréhension (50%)
  const compositeConfidence = Math.round((normQuality * 0.5 + normSemantic * 0.5) * 100);

  const reasons: string[] = [];
  if (quality.isolatedSummaryRows > 0) {
    reasons.push(`${quality.isolatedSummaryRows} ligne(s) de total Excel isolée(s) proprement.`);
  }
  if (quality.completenessScore < 70) {
    reasons.push(`Complétude faible (${quality.completenessScore}% de champs remplis).`);
  }
  if (quality.consistencyScore < 70) {
    reasons.push(`Types hétérogènes détectés dans certaines colonnes (${quality.consistencyScore}% de conformité).`);
  }

  // 1. Confiance >= 95% -> Acceptation automatique immédiate
  if (compositeConfidence >= 95 && quality.riskLevel === "LOW") {
    return {
      action: "AUTOMATIC",
      confidenceScore: compositeConfidence,
      canAutoProceed: true,
      requiresUserConfirmation: false,
      statusLabel: "Intégration automatique sûre",
      uiTone: "success",
      reasons: reasons.length > 0 ? reasons : ["Compréhension sémantique et qualité des données optimales."],
      suggestedAction: "Importer directement sans friction.",
    };
  }

  // 2. Confiance 90-94% -> Acceptation automatique avec trace d'audit
  if (compositeConfidence >= 90) {
    return {
      action: "AUTOMATIC_LOGGED",
      confidenceScore: compositeConfidence,
      canAutoProceed: true,
      requiresUserConfirmation: false,
      statusLabel: "Intégration automatique tracée",
      uiTone: "success",
      reasons: reasons.length > 0 ? reasons : ["Qualité et compréhension élevées, journalisation d'audit activée."],
      suggestedAction: "Importer avec notification d'audit.",
    };
  }

  // 3. Confiance 75-89% -> Validation recommandée
  if (compositeConfidence >= 75) {
    return {
      action: "RECOMMENDED_REVIEW",
      confidenceScore: compositeConfidence,
      canAutoProceed: false,
      requiresUserConfirmation: true,
      statusLabel: "Validation recommandée",
      uiTone: "info",
      reasons: reasons.length > 0 ? reasons : ["Quelques ambiguïtés mineures identifiées."],
      suggestedAction: "Vérifier le rattachement des colonnes avant validation.",
    };
  }

  // 4. Confiance 50-74% -> Validation requise
  if (compositeConfidence >= 50) {
    return {
      action: "REQUIRED_REVIEW",
      confidenceScore: compositeConfidence,
      canAutoProceed: false,
      requiresUserConfirmation: true,
      statusLabel: "Validation requise",
      uiTone: "warning",
      reasons: reasons.length > 0 ? reasons : ["Ambiguïtés significatives ou données incomplètes."],
      suggestedAction: "Confirmer ou corriger manuellement les colonnes et types.",
    };
  }

  // 5. Confiance < 50% -> Quarantaine / Rejet
  return {
    action: "QUARANTINE_REJECT",
    confidenceScore: compositeConfidence,
    canAutoProceed: false,
    requiresUserConfirmation: true,
    statusLabel: "Rejet / Quarantaine nécessaire",
    uiTone: "danger",
    reasons: reasons.length > 0 ? reasons : ["Score de qualité ou de compréhension insuffisant (< 50%)."],
    suggestedAction: "Examiner la structure du fichier ou le corriger à la source.",
  };
}
