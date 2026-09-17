// ─────────────────────────────────────────────────────────────────────────────
// GESCOP Universal Data Engine — Grain Engine
// Version 3.0 — Septembre 2026 (Spec Section 8 & 14)
// ─────────────────────────────────────────────────────────────────────────────

import { GRAIN_LEVELS, type GrainLevel } from "./ontology/types.ts";
import { profileValues } from "./recognition/valueProfiler.ts";

export interface CandidateKey {
  columns: string[];
  isUnique: boolean;
  uniquenessRatio: number;
  nullCount: number;
}

export interface GrainAnalysisResult {
  primaryGrain: GrainLevel;
  primaryKeyCandidates: string[];
  compositeKeyCandidate: string[] | null;
  isAggregated: boolean;
  aggregationGrainDimension: string | null;
  cardinalityTotal: number;
  dimensions: string[];
  metrics: string[];
  explanation: string;
}

function cleanStr(val: unknown): string {
  return String(val ?? "").trim();
}

/**
 * Analyse la granularité d'un tableau de données (Spec Section 8 & 14)
 */
export function analyzeGrain(
  headers: string[],
  rows: Record<string, any>[]
): GrainAnalysisResult {
  const totalRows = rows.length;
  if (totalRows === 0 || headers.length === 0) {
    return {
      primaryGrain: GRAIN_LEVELS.TRANSACTION,
      primaryKeyCandidates: [],
      compositeKeyCandidate: null,
      isAggregated: false,
      aggregationGrainDimension: null,
      cardinalityTotal: 0,
      dimensions: [],
      metrics: [],
      explanation: "Tableau vide ou sans en-tête.",
    };
  }

  // 1. Profiler chaque colonne
  const columnProfiles = headers.map((col) => {
    const values = rows.map((r) => r[col]);
    const profile = profileValues(values, col);
    return { col, profile, values };
  });

  // 2. Classer métriques vs dimensions
  const metrics: string[] = [];
  const dimensions: string[] = [];
  const singleKeyCandidates: string[] = [];

  for (const cp of columnProfiles) {
    const isMetricName = /\b(qty|quantite|quantity|price|prix|cost|cout|total|amount|revenue|margin|marge|heures|volume|rate|taux)\b/i.test(cp.col);
    const isIdCandidate = /(^|_)(id|code|sku|ref|no|numero|key)($|_)/i.test(cp.col) || cp.profile.detectedLogicalType === "IDENTIFIER" || (!cp.profile.isNumeric && !isMetricName);

    if (cp.profile.isNumeric && !isIdCandidate) {
      metrics.push(cp.col);
    } else {
      dimensions.push(cp.col);
    }

    if (cp.profile.isUniqueKeyCandidate && isIdCandidate && !isMetricName) {
      singleKeyCandidates.push(cp.col);
    }
  }

  // 3. Recherche de clé composite (si pas de clé unique simple)
  let compositeKeyCandidate: string[] | null = null;
  if (singleKeyCandidates.length === 0 && dimensions.length >= 2 && totalRows > 1) {
    // Tester des paires de dimensions
    for (let i = 0; i < dimensions.length; i++) {
      for (let j = i + 1; j < dimensions.length; j++) {
        const col1 = dimensions[i];
        const col2 = dimensions[j];
        const compositeSet = new Set(
          rows.map((r) => `${cleanStr(r[col1])}###${cleanStr(r[col2])}`)
        );
        if (compositeSet.size === totalRows) {
          compositeKeyCandidate = [col1, col2];
          break;
        }
      }
      if (compositeKeyCandidate) break;
    }
  }

  // 4. Détecter si le tableau est une agrégation / synthèse
  // Signes d'agrégation :
  // - Peu de lignes (<= 35)
  // - Majorité de métriques financières ou ratios (ex: total_vente, cout_total, profit_brut, marge_pct)
  // - Présence d'une dimension géographique ou catégorielle (succursale, ville, categorie, mois)
  // - Absence d'identifiants de transactions fins (pas d'order_id individuel ni de transaction_id unique par ligne)
  const metricRatio = metrics.length / Math.max(1, headers.length);
  const hasMarginOrAvg = columnProfiles.some(
    (cp) => cp.profile.isPercentageCandidate || /\b(marge|margin|avg|moyenne|taux|pct)\b/i.test(cp.col)
  );
  const hasTotalMetrics = columnProfiles.some(
    (cp) => /\b(total|somme|global|profit|cout_total|ca_total)\b/i.test(cp.col)
  );

  const geoDimension = columnProfiles.find(
    (cp) => cp.profile.semanticCategory === "GEOGRAPHIC_LOCATION" ||
      /\b(succursale|store|magasin|ville|city|location)\b/i.test(cp.col)
  );

  const dateDimension = columnProfiles.find(
    (cp) => cp.profile.isDate || /\b(date|mois|month|annee|year|trimestre|quarter|periode)\b/i.test(cp.col)
  );

  const isSmallRowSet = totalRows <= 35;
  const isAggregated =
    (isSmallRowSet && (hasMarginOrAvg || hasTotalMetrics) && metricRatio >= 0.4) ||
    Boolean(geoDimension && isSmallRowSet && hasTotalMetrics);

  // 5. Déterminer le grain
  let primaryGrain: GrainLevel = GRAIN_LEVELS.TRANSACTION;
  let aggregationGrainDimension: string | null = null;
  let explanation = "";

  if (isAggregated) {
    if (geoDimension) {
      primaryGrain = GRAIN_LEVELS.LOCATION;
      aggregationGrainDimension = geoDimension.col;
      explanation = `Grain agrégé par succursale/site géographique (${geoDimension.col}) : ${totalRows} unités analysées avec ${metrics.length} indicateurs consolidés.`;
    } else if (dateDimension) {
      primaryGrain = GRAIN_LEVELS.MONTH;
      aggregationGrainDimension = dateDimension.col;
      explanation = `Grain agrégé par période temporelle (${dateDimension.col}) : synthèse périodique.`;
    } else {
      primaryGrain = GRAIN_LEVELS.SUMMARY;
      aggregationGrainDimension = dimensions[0] || null;
      explanation = `Grain agrégé / tableau de bord consolidé : synthèse par ${dimensions[0] || "catégorie"}.`;
    }
  } else {
    // Grain transactionnel ou entité détaillée
    // Vérifier les signatures de grain
    const orderIdCol = headers.find((h) => /(^|_)(order|commande|cde|invoice|facture)($|_)/i.test(h) || h.toLowerCase().includes("order"));
    const productIdCol = headers.find((h) => /(^|_)(product|produit|item|article|sku|ugs)($|_)/i.test(h) || h.toLowerCase().includes("product"));
    const customerIdCol = headers.find((h) => /(^|_)(customer|client|acheteur)($|_)/i.test(h) || h.toLowerCase().includes("customer"));
    const employeeIdCol = headers.find((h) => /(^|_)(employee|employe|staff)($|_)/i.test(h) || h.toLowerCase().includes("employee"));

    if (orderIdCol && productIdCol && compositeKeyCandidate && compositeKeyCandidate.includes(orderIdCol)) {
      primaryGrain = GRAIN_LEVELS.ORDER_LINE;
      explanation = `Grain ligne de commande (Order Line) : identifié par la clé composite [${compositeKeyCandidate.join(", ")}].`;
    } else if (orderIdCol && singleKeyCandidates.includes(orderIdCol)) {
      primaryGrain = GRAIN_LEVELS.ORDER;
      explanation = `Grain commande (Order) : 1 ligne = 1 commande unique (${orderIdCol}).`;
    } else if (productIdCol && singleKeyCandidates.includes(productIdCol)) {
      primaryGrain = GRAIN_LEVELS.PRODUCT;
      explanation = `Grain produit (Master Data) : 1 ligne = 1 produit (${productIdCol}).`;
    } else if (customerIdCol && singleKeyCandidates.includes(customerIdCol)) {
      primaryGrain = GRAIN_LEVELS.CUSTOMER;
      explanation = `Grain client (Master Data) : 1 ligne = 1 compte client (${customerIdCol}).`;
    } else if (employeeIdCol && singleKeyCandidates.includes(employeeIdCol)) {
      primaryGrain = GRAIN_LEVELS.EMPLOYEE;
      explanation = `Grain employé (Master Data) : 1 ligne = 1 employé (${employeeIdCol}).`;
    } else if (dateDimension && metrics.length > 0) {
      primaryGrain = GRAIN_LEVELS.TRANSACTION;
      explanation = `Grain transactionnel : événements ou mouvements individuels dans le temps.`;
    } else {
      primaryGrain = GRAIN_LEVELS.TRANSACTION;
      explanation = `Grain individuel par ligne : ${totalRows} enregistrements.`;
    }
  }

  return {
    primaryGrain,
    primaryKeyCandidates: singleKeyCandidates,
    compositeKeyCandidate,
    isAggregated,
    aggregationGrainDimension,
    cardinalityTotal: totalRows,
    dimensions,
    metrics,
    explanation,
  };
}
