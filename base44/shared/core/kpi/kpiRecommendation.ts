// ─────────────────────────────────────────────────────────────────────────────
// GESCOP Universal KPI Engine — KPI Recommendation Engine
// Version 2.0 — Septembre 2026 (Spec Sections 26, 28, 36, 37)
// ─────────────────────────────────────────────────────────────────────────────

import {
  type DiscoveredKpi,
  type KpiRecommendation,
  type KpiModule,
  KPI_STATES,
} from "./types.ts";

const STRATEGIC_WEIGHTS: Record<string, number> = {
  gross_profit: 98,
  gross_margin_pct: 99,
  operating_profit: 95,
  operating_margin_pct: 95,
  average_order_value: 94,
  cac: 96,
  roas: 97,
  ctr: 92,
  inventory_turnover: 90,
  net_cash_flow: 96,
  burn_rate: 95,
  runway_months: 98,
  revenue_per_employee: 88,
  revenue_per_branch: 92,
};

/**
 * Recommande intelligemment les KPIs calculables par module (Spec Section 26 & 36)
 */
export function generateKpiRecommendations(
  discoveredKpis: DiscoveredKpi[]
): {
  recommendations: KpiRecommendation[];
  summaryMessage: string;
  byModule: Record<string, KpiRecommendation[]>;
} {
  const calculated = discoveredKpis.filter(
    (k) => k.state === KPI_STATES.CALCULATED || k.state === KPI_STATES.AVAILABLE
  );

  const recommendations: KpiRecommendation[] = [];
  const byModule: Record<string, KpiRecommendation[]> = {};

  for (const kpi of calculated) {
    const strategicWeight = STRATEGIC_WEIGHTS[kpi.kpiId] || 80;
    const priorityScore = Math.min(
      100,
      Math.round(kpi.confidence * 0.5 + strategicWeight * 0.5)
    );

    const rec: KpiRecommendation = {
      kpiId: kpi.kpiId,
      name: kpi.name,
      module: kpi.module,
      priorityScore,
      confidence: kpi.confidence,
      reason: `${kpi.name} calculé avec succès (Valeur : ${kpi.value}${kpi.unit === "percentage" ? "%" : kpi.unit === "currency" ? " $" : ""}).`,
      canAddImmediately: true,
    };

    recommendations.push(rec);

    if (!byModule[kpi.module]) {
      byModule[kpi.module] = [];
    }
    byModule[kpi.module].push(rec);

    // Ajouter également aux modules secondaires
    for (const secMod of kpi.secondaryModules) {
      if (!byModule[secMod]) byModule[secMod] = [];
      byModule[secMod].push(rec);
    }
  }

  // Trier les recommandations par score de priorité décroissant
  recommendations.sort((a, b) => b.priorityScore - a.priorityScore);

  // Générer le message synthétique en français (Spec Section 26)
  const moduleBreakdown = Object.entries(byModule)
    .map(([mod, list]) => `${mod.charAt(0).toUpperCase() + mod.slice(1)} (+${list.length})`)
    .join(", ");

  const summaryMessage =
    recommendations.length > 0
      ? `${recommendations.length} nouveaux indicateurs de performance (KPI) détectés et prêts à être ajoutés [${moduleBreakdown}].`
      : "Aucun nouveau KPI complet n'a pu être calculé à partir de ce jeu de données.";

  return {
    recommendations,
    summaryMessage,
    byModule,
  };
}

