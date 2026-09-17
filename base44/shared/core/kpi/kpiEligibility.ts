// ─────────────────────────────────────────────────────────────────────────────
// GESCOP Universal KPI Engine — KPI Eligibility & Mathematical Validator
// Version 2.0 — Septembre 2026 (Spec Sections 23, 30, 31, 39, 40)
// ─────────────────────────────────────────────────────────────────────────────

import {
  type KpiDefinition,
  type KpiState,
  KPI_STATES,
} from "./types.ts";

export interface EligibilityResult {
  eligible: boolean;
  state: KpiState;
  reason: string;
  missingMetrics: string[];
  presentMetrics: string[];
}

export const METRIC_ALIASES: Record<string, string[]> = {
  marketing_spend: ["ad_spend", "spend", "budget"],
  ad_spend: ["marketing_spend", "spend", "budget"],
  attributed_revenue: ["revenue", "sales", "ca"],
  branches_count: ["branches", "stores", "locations"],
  branches: ["branches_count", "stores", "locations"],
  orders: ["transactions", "orders_count"],
  customers: ["customers_count", "clients"],
};

export function resolveMetricValue(metrics: Record<string, number>, metricName: string): number | undefined {
  if (metrics[metricName] !== undefined && metrics[metricName] !== null) {
    return metrics[metricName];
  }
  const aliases = METRIC_ALIASES[metricName] || [];
  for (const alias of aliases) {
    if (metrics[alias] !== undefined && metrics[alias] !== null) {
      return metrics[alias];
    }
  }
  return undefined;
}

/**
 * Vérifie l'éligibilité mathématique, structurelle et de grain d'un KPI (Spec Section 23 & 39)
 */
export function evaluateKpiEligibility(
  kpi: KpiDefinition,
  metrics: Record<string, number>,
  grain = "day"
): EligibilityResult {
  const missingMetrics: string[] = [];
  const presentMetrics: string[] = [];

  // 1. Vérifier la présence des métriques requises
  for (const req of kpi.requiredMetrics) {
    const val = resolveMetricValue(metrics, req);
    if (val !== undefined) {
      presentMetrics.push(req);
    } else {
      missingMetrics.push(req);
    }
  }

  // A. Si aucune métrique n'est présente
  if (presentMetrics.length === 0) {
    return {
      eligible: false,
      state: KPI_STATES.INSUFFICIENT_DATA,
      reason: `Aucune donnée requise disponible (${kpi.requiredMetrics.join(", ")} manquantes).`,
      missingMetrics,
      presentMetrics,
    };
  }

  // B. Si seulement une partie des métriques est présente
  if (missingMetrics.length > 0) {
    return {
      eligible: false,
      state: KPI_STATES.PARTIAL,
      reason: `Données partielles : ${presentMetrics.join(", ")} présent(s), mais ${missingMetrics.join(", ")} manquant(s).`,
      missingMetrics,
      presentMetrics,
    };
  }

  // 2. Vérifier la compatibilité du grain (Spec Section 30)
  const normGrain = grain.toLowerCase().trim();
  const isGrainCompatible =
    kpi.validGrains.includes(normGrain) ||
    (normGrain === "location" && kpi.validGrains.includes("branch")) ||
    (normGrain === "store" && kpi.validGrains.includes("branch")) ||
    kpi.validGrains.length === 0;

  if (!isGrainCompatible) {
    return {
      eligible: false,
      state: KPI_STATES.INVALID,
      reason: `Incompatibilité de grain analytique : grain actuel « ${grain} » non compatible (grains valides : ${kpi.validGrains.join(", ")}).`,
      missingMetrics,
      presentMetrics,
    };
  }

  // 3. Sécurité du dénominateur (Spec Section 39)
  if (kpi.requiresPositiveDenominator) {
    const denominatorMetric = kpi.requiredMetrics[kpi.requiredMetrics.length - 1];
    const denomValue = resolveMetricValue(metrics, denominatorMetric);
    if (denomValue === 0) {
      return {
        eligible: false,
        state: KPI_STATES.INVALID,
        reason: `Dénominateur nul : impossible de diviser par zéro (${denominatorMetric} = 0).`,
        missingMetrics,
        presentMetrics,
      };
    }
  }

  // 4. Éligible pour le calcul
  return {
    eligible: true,
    state: KPI_STATES.AVAILABLE,
    reason: "Toutes les métriques requises et les conditions mathématiques sont réunies.",
    missingMetrics: [],
    presentMetrics,
  };
}

/**
 * Valide le résultat mathématique calculé d'un KPI (Spec Section 40)
 */
export function validateKpiResult(
  kpi: KpiDefinition,
  value: number | null
): { isValid: boolean; anomaly: string | null } {
  if (value === null || !Number.isFinite(value) || Number.isNaN(value)) {
    return { isValid: false, anomaly: "Valeur indéfinie ou non numérique." };
  }

  if (kpi.maxSanityThreshold !== undefined && value > kpi.maxSanityThreshold) {
    return {
      isValid: false,
      anomaly: `Valeur atypique : ${value}${kpi.unit === "percentage" ? "%" : ""} dépasse le seuil plausible (${kpi.maxSanityThreshold}).`,
    };
  }

  if (kpi.minSanityThreshold !== undefined && value < kpi.minSanityThreshold) {
    return {
      isValid: false,
      anomaly: `Valeur négative atypique : ${value} est inférieur au seuil minimum (${kpi.minSanityThreshold}).`,
    };
  }

  return { isValid: true, anomaly: null };
}
