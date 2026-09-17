// ─────────────────────────────────────────────────────────────────────────────
// GESCOP Universal KPI Engine — Types & Interfaces
// Version 2.0 — Septembre 2026 (Spec Section 12-25, 31, 38, 41)
// ─────────────────────────────────────────────────────────────────────────────

export type { DocumentArchetype } from "../ontology/types.ts";

export const KPI_STATES = {
  AVAILABLE: "AVAILABLE",
  CALCULATED: "CALCULATED",
  PARTIAL: "PARTIAL",
  INSUFFICIENT_DATA: "INSUFFICIENT_DATA",
  INVALID: "INVALID",
  PENDING_VALIDATION: "PENDING_VALIDATION",
  STALE: "STALE",
  SUPPRESSED: "SUPPRESSED",
} as const;

export type KpiState = (typeof KPI_STATES)[keyof typeof KPI_STATES];

export const KPI_MODULES = {
  FINANCE: "finance",
  VENTES: "ventes",
  MARKETING: "marketing",
  CLIENTS: "clients",
  STOCKS: "stocks",
  OPERATIONS: "operations",
  RH: "rh",
  TRESORERIE: "tresorerie",
  SUCCURSALES: "succursales",
  PREVISIONS: "previsions",
} as const;

export type KpiModule = (typeof KPI_MODULES)[keyof typeof KPI_MODULES];

export const AGGREGATION_METHODS = {
  ADDITIVE: "ADDITIVE",
  SEMI_ADDITIVE: "SEMI_ADDITIVE",
  NON_ADDITIVE: "NON_ADDITIVE",
  RATIO: "RATIO",
  AVERAGE: "AVERAGE",
  COUNT: "COUNT",
  DISTINCT_COUNT: "DISTINCT_COUNT",
  BALANCE: "BALANCE",
  FLOW: "FLOW",
} as const;

export type AggregationMethod = (typeof AGGREGATION_METHODS)[keyof typeof AGGREGATION_METHODS];

export interface KpiDefinition {
  id: string;
  name: { fr: string; en: string };
  description: { fr: string; en: string };
  primaryModule: KpiModule;
  secondaryModules: KpiModule[];
  requiredMetrics: string[];
  optionalMetrics?: string[];
  formula: string;
  calculate: (metrics: Record<string, number>) => number | null;
  unit: "currency" | "percentage" | "count" | "ratio" | "days" | "hours" | "score";
  aggregationType: AggregationMethod;
  validGrains: string[];
  requiresPositiveDenominator?: boolean;
  maxSanityThreshold?: number;
  minSanityThreshold?: number;
}

export interface KpiLineageInfo {
  formula: string;
  inputs: Record<string, number>;
  sourceDatasets: string[];
  calculatedAt: string;
}

export interface DiscoveredKpi {
  kpiId: string;
  name: string;
  module: KpiModule;
  secondaryModules: KpiModule[];
  state: KpiState;
  value: number | null;
  unit: string;
  availableMetrics: string[];
  missingMetrics: string[];
  confidence: number;
  explanation: string;
  suggestedAction: string;
  lineage: KpiLineageInfo;
}

export interface KpiRecommendation {
  kpiId: string;
  name: string;
  module: KpiModule;
  priorityScore: number;
  confidence: number;
  reason: string;
  canAddImmediately: boolean;
}

export interface DiscoverySummary {
  totalAnalyzed: number;
  calculatedCount: number;
  availableCount: number;
  partialCount: number;
  insufficientDataCount: number;
  byModule: Record<KpiModule, number>;
  recommendations: KpiRecommendation[];
}
