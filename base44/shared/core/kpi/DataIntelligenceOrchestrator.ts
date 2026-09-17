// ─────────────────────────────────────────────────────────────────────────────
// GESCOP Universal KPI Engine — Data Intelligence Orchestrator
// Version 2.0 — Septembre 2026 (Spec Section 47)
// ─────────────────────────────────────────────────────────────────────────────

import { classifyDocumentSheet, type SheetClassificationResult } from "../documentClassifier.ts";
import { extractBaseMetrics } from "./metricEngine.ts";
import { discoverKpis } from "./kpiDiscovery.ts";
import { generateKpiRecommendations } from "./kpiRecommendation.ts";
import { diagnoseKpiFailure, type RootCauseDiagnostic } from "./kpiDependencyGraph.ts";
import {
  type DiscoveredKpi,
  type DiscoverySummary,
  type KpiRecommendation,
  type DocumentArchetype,
  KPI_STATES,
} from "./types.ts";

export interface OrchestrationInput {
  sheetName?: string;
  fileName?: string;
  headers: string[];
  rows: Record<string, any>[];
  semanticConfidence?: number;
}

export interface DataIntelligenceReport {
  sheetName: string;
  fileName: string;
  archetype: DocumentArchetype;
  grain: string;
  isAggregatedSummary: boolean;
  classification: SheetClassificationResult;
  extractedMetrics: Record<string, number>;
  kpis: DiscoveredKpi[];
  calculatedKpis: DiscoveredKpi[];
  partialKpis: DiscoveredKpi[];
  recommendations: KpiRecommendation[];
  recommendationsByModule: Record<string, KpiRecommendation[]>;
  summaryMessage: string;
  discoverySummary: DiscoverySummary;
  topMissingKpiDiagnostics: RootCauseDiagnostic[];
}

/**
 * Pipeline d'orchestration unifié de découverte intelligente des KPI (Spec Section 47)
 * inspect() -> classify() -> detectGrain() -> extractBaseMetrics() -> discoverKpis() -> generateKpiRecommendations()
 */
export function runDataIntelligencePipeline(input: OrchestrationInput): DataIntelligenceReport {
  const {
    sheetName = "Sheet1",
    fileName = "dataset.xlsx",
    headers,
    rows,
    semanticConfidence = 0.95,
  } = input;

  // 1. Classifier la structure du document et détecter le grain
  const classification = classifyDocumentSheet({
    sheetName,
    headers,
    rows,
  });

  const grain = classification.grain.grain;
  const isAggregatedSummary = classification.isAggregatedSummary;

  // 2. Extraire les métriques canoniques fondamentales
  const extractedMetrics = extractBaseMetrics({
    headers,
    rows,
    grain,
    isAggregatedSummary,
  });

  // 3. Découvrir automatiquement les KPIs éligibles
  const { kpis, summary } = discoverKpis({
    metrics: extractedMetrics,
    grain,
    sourceDatasetName: fileName,
    semanticConfidence,
  });

  // 4. Générer les recommandations par module et le score de priorité
  const recommendationResult = generateKpiRecommendations(kpis);
  summary.recommendations = recommendationResult.recommendations;

  // 5. Diagnostics de cause racine pour les indicateurs partiels majeurs
  const partialKpis = kpis.filter((k) => k.state === KPI_STATES.PARTIAL);
  const calculatedKpis = kpis.filter((k) => k.state === KPI_STATES.CALCULATED);

  const topMissingKpiDiagnostics = partialKpis
    .slice(0, 5)
    .map((pk) => diagnoseKpiFailure(pk.kpiId, extractedMetrics));

  return {
    sheetName,
    fileName,
    archetype: classification.archetype,
    grain,
    isAggregatedSummary,
    classification,
    extractedMetrics,
    kpis,
    calculatedKpis,
    partialKpis,
    recommendations: recommendationResult.recommendations,
    recommendationsByModule: recommendationResult.byModule,
    summaryMessage: recommendationResult.summaryMessage,
    discoverySummary: summary,
    topMissingKpiDiagnostics,
  };
}

