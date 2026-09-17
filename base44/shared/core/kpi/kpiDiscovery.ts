// ─────────────────────────────────────────────────────────────────────────────
// GESCOP Universal KPI Engine — KPI Discovery Engine
// Version 2.0 — Septembre 2026 (Spec Sections 23–26)
// ─────────────────────────────────────────────────────────────────────────────

import { UNIVERSAL_KPI_CATALOG } from "./kpiCatalog.ts";
import { evaluateKpiEligibility, validateKpiResult, resolveMetricValue } from "./kpiEligibility.ts";
import {
  type DiscoveredKpi,
  type DiscoverySummary,
  type KpiModule,
  KPI_STATES,
  KPI_MODULES,
} from "./types.ts";

export interface DiscoverKpisInput {
  metrics: Record<string, number>;
  grain?: string;
  sourceDatasetName?: string;
  semanticConfidence?: number;
}

/**
 * Découvre automatiquement l'ensemble des KPIs calculables, partiels et manquants (Spec Section 23 & 24)
 */
export function discoverKpis(input: DiscoverKpisInput): {
  kpis: DiscoveredKpi[];
  summary: DiscoverySummary;
} {
  const {
    metrics,
    grain = "month",
    sourceDatasetName = "dataset",
    semanticConfidence = 0.95,
  } = input;

  const discoveredList: DiscoveredKpi[] = [];
  const moduleCounts: Record<KpiModule, number> = {
    finance: 0,
    ventes: 0,
    marketing: 0,
    clients: 0,
    stocks: 0,
    operations: 0,
    rh: 0,
    tresorerie: 0,
    succursales: 0,
    previsions: 0,
  };

  let calculatedCount = 0;
  let availableCount = 0;
  let partialCount = 0;
  let insufficientDataCount = 0;

  for (const [id, kpiDef] of Object.entries(UNIVERSAL_KPI_CATALOG)) {
    const eligibility = evaluateKpiEligibility(kpiDef, metrics, grain);
    let state = eligibility.state;
    let computedValue: number | null = null;
    let explanation = eligibility.reason;

    if (eligibility.eligible) {
      availableCount++;
      try {
        const effectiveMetrics: Record<string, number> = { ...metrics };
        for (const req of kpiDef.requiredMetrics) {
          const val = resolveMetricValue(metrics, req);
          if (val !== undefined) {
            effectiveMetrics[req] = val;
          }
        }

        computedValue = kpiDef.calculate(effectiveMetrics);
        const valResult = validateKpiResult(kpiDef, computedValue);
        if (valResult.isValid && computedValue !== null) {
          state = KPI_STATES.CALCULATED;
          calculatedCount++;
          explanation = `Calculé avec succès à partir de [${kpiDef.requiredMetrics.join(", ")}].`;
          moduleCounts[kpiDef.primaryModule] = (moduleCounts[kpiDef.primaryModule] || 0) + 1;
        } else {
          state = KPI_STATES.INVALID;
          explanation = valResult.anomaly || "Calcul mathématique impossible.";
        }
      } catch (err: any) {
        state = KPI_STATES.INVALID;
        explanation = `Erreur lors de l'exécution de la formule : ${err?.message || err}`;
      }
    } else if (eligibility.state === KPI_STATES.PARTIAL) {
      partialCount++;
    } else {
      insufficientDataCount++;
    }

    discoveredList.push({
      kpiId: id,
      name: kpiDef.name.fr,
      module: kpiDef.primaryModule,
      secondaryModules: kpiDef.secondaryModules,
      state,
      value: computedValue,
      unit: kpiDef.unit,
      availableMetrics: eligibility.presentMetrics,
      missingMetrics: eligibility.missingMetrics,
      confidence: Math.round(semanticConfidence * 100),
      explanation,
      suggestedAction:
        state === KPI_STATES.CALCULATED
          ? `Disponible pour affichage dans le module ${kpiDef.primaryModule.toUpperCase()}.`
          : state === KPI_STATES.PARTIAL
          ? `Ajouter la métrique « ${eligibility.missingMetrics.join(", ")} » pour débloquer cet indicateur.`
          : "Données sources requises non importées.",
      lineage: {
        formula: kpiDef.formula,
        inputs: Object.fromEntries(
          kpiDef.requiredMetrics.map((rm) => [rm, resolveMetricValue(metrics, rm) ?? 0])
        ),
        sourceDatasets: [sourceDatasetName],
        calculatedAt: new Date().toISOString(),
      },
    });
  }

  // Trier : CALCULATED d'abord, puis PARTIAL, puis INSUFFICIENT_DATA
  discoveredList.sort((a, b) => {
    const order = { CALCULATED: 0, AVAILABLE: 1, PARTIAL: 2, PENDING_VALIDATION: 3, INSUFFICIENT_DATA: 4, INVALID: 5, STALE: 6, SUPPRESSED: 7 };
    return (order[a.state] ?? 9) - (order[b.state] ?? 9);
  });

  const summary: DiscoverySummary = {
    totalAnalyzed: Object.keys(UNIVERSAL_KPI_CATALOG).length,
    calculatedCount,
    availableCount,
    partialCount,
    insufficientDataCount,
    byModule: moduleCounts,
    recommendations: [],
  };

  return { kpis: discoveredList, summary };
}
