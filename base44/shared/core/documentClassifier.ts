// ─────────────────────────────────────────────────────────────────────────────
// GESCOP Universal Data Engine — Document & Sheet Classifier
// Version 3.0 — Septembre 2026 (Spec Section 9 & 14)
// ─────────────────────────────────────────────────────────────────────────────

import {
  DOCUMENT_ARCHETYPES,
  type DocumentArchetype,
  GRAIN_LEVELS,
} from "./ontology/types.ts";
import { analyzeGrain, type GrainAnalysisResult } from "./grainEngine.ts";
import { isSummaryOrTotalRow } from "../importUtils.ts";

export interface SheetClassificationResult {
  archetype: DocumentArchetype;
  confidence: number;
  grain: GrainAnalysisResult;
  isAggregatedSummary: boolean;
  hasSummaryTotalRow: boolean;
  totalRowIndices: number[];
  recommendedHandling:
    | "TRANSACTION_INGEST"
    | "MASTER_SYNC"
    | "EXECUTIVE_KPI_REPORT"
    | "PERIODIC_SUMMARY"
    | "MANUAL_REVIEW";
  explanation: string;
  summaryMetrics: string[];
  groupDimension: string | null;
}

export interface SheetClassificationInput {
  sheetName: string;
  headers: string[];
  rows: Record<string, any>[];
  matrix?: any[][];
}

const SUMMARY_SHEET_NAME_REGEX =
  /\b(sommaire|executif|sommaire executif|resume|dashboard|tableau de bord|kpi|synthese|recap|consolidation|overview|summary)\b/i;

const TRANSACTION_SHEET_NAME_REGEX =
  /\b(ventes?|orders?|commandes?|transactions?|achats?|purchases?|depenses?|expenses?|factures?|invoices?|operations?|releve|pos)\b/i;

const MASTER_DATA_SHEET_NAME_REGEX =
  /\b(clients?|customers?|produits?|products?|articles?|catalogue|fournisseurs?|suppliers?|employes?|employees?|personnel|equipe|staff)\b/i;

/**
 * Classifie universellement une feuille ou un fichier importé (Spec Section 9 & 14)
 */
export function classifyDocumentSheet(input: SheetClassificationInput): SheetClassificationResult {
  const { sheetName, headers, rows } = input;
  const grain = analyzeGrain(headers, rows);

  // 1. Détection des lignes de totaux / synthèses
  const totalRowIndices: number[] = [];
  rows.forEach((row, idx) => {
    if (isSummaryOrTotalRow(row)) {
      totalRowIndices.push(idx);
    }
  });
  const hasSummaryTotalRow = totalRowIndices.length > 0;

  // Lignes de données effectives (hors ligne de total)
  const effectiveRowCount = rows.length - totalRowIndices.length;

  // 2. Analyse des signaux de nom de feuille
  const nameSuggestsSummary = SUMMARY_SHEET_NAME_REGEX.test(sheetName);
  const nameSuggestsTransaction = TRANSACTION_SHEET_NAME_REGEX.test(sheetName);
  const nameSuggestsMaster = MASTER_DATA_SHEET_NAME_REGEX.test(sheetName);

  // 3. Analyse des métriques et dimensions
  const hasAggregatedMetrics = grain.metrics.some((m) =>
    /\b(total|somme|profit|marge|margin|pct|cout_total|ca_total|chiffre_affaires)\b/i.test(m)
  );

  // A. Sommaire Exécutif / Tableau de bord consolidé (ex: Nordik Plein Air [Sommaire Exécutif])
  // Caractéristiques :
  // - Nom de feuille évocateur ("Sommaire Exécutif") OU
  // - Grain agrégé (succursale, mois, catégorie) avec peu de lignes (<= 30) et présence d'une ligne de Total
  // - Métriques de haut niveau (% Marge, Coût Total, Profit Brut, Total Ventes)
  const isAggregatedSummary =
    nameSuggestsSummary ||
    (grain.isAggregated && (hasSummaryTotalRow || effectiveRowCount <= 20) && hasAggregatedMetrics) ||
    (effectiveRowCount <= 15 && hasSummaryTotalRow && grain.metrics.length >= 2);

  if (isAggregatedSummary) {
    const groupDim = grain.aggregationGrainDimension || grain.dimensions[0] || "succursale";
    return {
      archetype: DOCUMENT_ARCHETYPES.AGGREGATED_SUMMARY,
      confidence: nameSuggestsSummary ? 0.98 : 0.9,
      grain,
      isAggregatedSummary: true,
      hasSummaryTotalRow,
      totalRowIndices,
      recommendedHandling: "EXECUTIVE_KPI_REPORT",
      explanation: `Feuille identifiée comme Sommaire Exécutif / Tableau de bord consolidé (${effectiveRowCount} unités regroupées par « ${groupDim} » avec ${grain.metrics.length} métriques agrégées). Ne doit pas être traitée comme un fichier de transactions brutes individuelles.`,
      summaryMetrics: grain.metrics,
      groupDimension: groupDim,
    };
  }

  // B. Master Data (Catalogue produits, liste clients, registre employés)
  const isMasterGrain =
    grain.primaryGrain === GRAIN_LEVELS.PRODUCT ||
    grain.primaryGrain === GRAIN_LEVELS.CUSTOMER ||
    grain.primaryGrain === GRAIN_LEVELS.EMPLOYEE ||
    grain.primaryGrain === GRAIN_LEVELS.SUPPLIER;

  if (isMasterGrain || (nameSuggestsMaster && !hasAggregatedMetrics)) {
    return {
      archetype: DOCUMENT_ARCHETYPES.MASTER_DATA,
      confidence: nameSuggestsMaster ? 0.95 : 0.85,
      grain,
      isAggregatedSummary: false,
      hasSummaryTotalRow,
      totalRowIndices,
      recommendedHandling: "MASTER_SYNC",
      explanation: `Fichier de données de référence (Master Data) : catalogue ou référentiel d'entités avec clés uniques (Grain : ${grain.primaryGrain}).`,
      summaryMetrics: [],
      groupDimension: null,
    };
  }

  // C. Données Transactionnelles (Commandes, Lignes d'achats, Mouvements)
  const isTransactionGrain =
    grain.primaryGrain === GRAIN_LEVELS.TRANSACTION ||
    grain.primaryGrain === GRAIN_LEVELS.ORDER ||
    grain.primaryGrain === GRAIN_LEVELS.ORDER_LINE;

  if (isTransactionGrain || nameSuggestsTransaction || effectiveRowCount > 50) {
    return {
      archetype: DOCUMENT_ARCHETYPES.TRANSACTION_DATA,
      confidence: isTransactionGrain ? 0.92 : 0.8,
      grain,
      isAggregatedSummary: false,
      hasSummaryTotalRow,
      totalRowIndices,
      recommendedHandling: "TRANSACTION_INGEST",
      explanation: `Données transactionnelles granulaires (${effectiveRowCount} lignes d'événements commerciaux, Grain : ${grain.primaryGrain}).`,
      summaryMetrics: [],
      groupDimension: null,
    };
  }

  // D. Rapport Périodique (Synthèse mensuelle / journalière)
  if (grain.primaryGrain === GRAIN_LEVELS.MONTH || grain.primaryGrain === GRAIN_LEVELS.DAY) {
    return {
      archetype: DOCUMENT_ARCHETYPES.PERIODIC_REPORT,
      confidence: 0.85,
      grain,
      isAggregatedSummary: true,
      hasSummaryTotalRow,
      totalRowIndices,
      recommendedHandling: "PERIODIC_SUMMARY",
      explanation: `Rapport périodique chronologique agrégé par date ou période (${effectiveRowCount} périodes).`,
      summaryMetrics: grain.metrics,
      groupDimension: grain.aggregationGrainDimension,
    };
  }

  // E. Inconnu / Nécessite revue
  return {
    archetype: DOCUMENT_ARCHETYPES.UNKNOWN,
    confidence: 0.4,
    grain,
    isAggregatedSummary: false,
    hasSummaryTotalRow,
    totalRowIndices,
    recommendedHandling: "MANUAL_REVIEW",
    explanation: `Structure non typique nécessitant une validation manuelle (${effectiveRowCount} lignes).`,
    summaryMetrics: grain.metrics,
    groupDimension: null,
  };
}
