// ─────────────────────────────────────────────────────────────────────────────
// GESCOP Universal Data Engine — Multi-Dimensional Quality Engine
// Version 3.0 — Septembre 2026 (Spec Section 22 & 24)
// ─────────────────────────────────────────────────────────────────────────────

import { profileValues } from "./recognition/valueProfiler.ts";
import { isSummaryOrTotalRow } from "../importUtils.ts";

export interface QualityProfile {
  overallQualityScore: number;       // 0 - 100
  completenessScore: number;         // 0 - 100
  structuralScore: number;           // 0 - 100
  consistencyScore: number;          // 0 - 100
  uniquenessScore: number;           // 0 - 100
  semanticConfidence: number;        // 0 - 100
  riskLevel: "LOW" | "MEDIUM" | "HIGH";
  totalRows: number;
  usableRows: number;
  quarantinedRows: number;
  isolatedSummaryRows: number;
  diagnostics: string[];
}

export interface QualityEngineParams {
  headers: string[];
  rows: Record<string, any>[];
  mappedColumnsCount?: number;
  totalColumnsCount?: number;
  averageSemanticConfidence?: number; // 0.0 - 1.0
  isAggregatedSummary?: boolean;
}

/**
 * Calcule le profil multi-critères de qualité des données (Spec Section 22 & 24)
 */
export function calculateQualityProfile(params: QualityEngineParams): QualityProfile {
  const {
    headers,
    rows,
    mappedColumnsCount = headers.length,
    totalColumnsCount = headers.length,
    averageSemanticConfidence = 0.85,
    isAggregatedSummary = false,
  } = params;

  const totalRows = rows.length;
  if (totalRows === 0 || headers.length === 0) {
    return {
      overallQualityScore: 0,
      completenessScore: 0,
      structuralScore: 0,
      consistencyScore: 0,
      uniquenessScore: 0,
      semanticConfidence: 0,
      riskLevel: "HIGH",
      totalRows: 0,
      usableRows: 0,
      quarantinedRows: 0,
      isolatedSummaryRows: 0,
      diagnostics: ["Tableau vide ou sans données exploitables."],
    };
  }

  const diagnostics: string[] = [];

  // 1. Détection et isolation des lignes de totaux
  let isolatedSummaryRows = 0;
  const cleanRows: Record<string, any>[] = [];

  for (const row of rows) {
    if (isSummaryOrTotalRow(row)) {
      isolatedSummaryRows++;
    } else {
      cleanRows.push(row);
    }
  }

  if (isolatedSummaryRows > 0) {
    diagnostics.push(
      `${isolatedSummaryRows} ligne(s) de total/synthèse Excel détectée(s) et isolée(s) automatiquement.`
    );
  }

  const usableRows = cleanRows.length;
  if (usableRows === 0) {
    return {
      overallQualityScore: 0,
      completenessScore: 0,
      structuralScore: 50,
      consistencyScore: 0,
      uniquenessScore: 0,
      semanticConfidence: Math.round(averageSemanticConfidence * 100),
      riskLevel: "HIGH",
      totalRows,
      usableRows: 0,
      quarantinedRows: 0,
      isolatedSummaryRows,
      diagnostics: ["Toutes les lignes du tableau sont des lignes de synthèse/totaux."],
    };
  }

  // 2. Score de complétude (Completeness)
  // % de cellules non vides dans les colonnes exploitées
  let filledCells = 0;
  const totalCells = usableRows * headers.length;

  for (const row of cleanRows) {
    for (const h of headers) {
      const val = row[h];
      if (val !== null && val !== undefined && String(val).trim() !== "") {
        filledCells++;
      }
    }
  }

  const completenessRatio = totalCells > 0 ? filledCells / totalCells : 0;
  const completenessScore = Math.round(completenessRatio * 100);
  diagnostics.push(`Taux de complétude des données : ${completenessScore}%.`);

  // 3. Score structurel (Structural Accuracy)
  // Base 100, pénalités si en-têtes anonymes (__EMPTY), si colonnes vides
  let structuralScore = 100;
  const emptyHeadersCount = headers.filter((h) => /^(__empty|col_\d+|untitled)/i.test(h)).length;
  if (emptyHeadersCount > 0) {
    structuralScore -= Math.min(40, emptyHeadersCount * 10);
    diagnostics.push(`${emptyHeadersCount} colonne(s) sans intitulé explicite.`);
  }
  if (isolatedSummaryRows > 0) {
    // Avoir des lignes de total dans les données brutes est une légère anomalie structurelle mais rattrapée
    structuralScore = Math.max(70, structuralScore);
  }

  // 4. Score de consistance / cohérence de types (Consistency)
  // Pour chaque colonne, vérifier si le type dominant est respecté
  let consistentColumnsCount = 0;
  for (const h of headers) {
    const values = cleanRows.map((r) => r[h]);
    const prof = profileValues(values, h);
    // Si la colonne a un type bien identifié avec une bonne confiance
    if (prof.confidence >= 0.7) {
      consistentColumnsCount++;
    }
  }
  const consistencyScore = Math.round((consistentColumnsCount / Math.max(1, headers.length)) * 100);

  // 5. Score d'unicité (Uniqueness)
  // Vérifie si une colonne d'identification unique existe
  let maxUniqueness = 0;
  for (const h of headers) {
    const values = cleanRows.map((r) => r[h]);
    const prof = profileValues(values, h);
    if (prof.uniquenessRatio > maxUniqueness) {
      maxUniqueness = prof.uniquenessRatio;
    }
  }
  const uniquenessScore = Math.round(maxUniqueness * 100);

  // 6. Confiance Sémantique
  const semanticConfidence = Math.round(averageSemanticConfidence * 100);

  // 7. Score Global Pondéré (Spec Section 22)
  // Formule fondamentale :
  // Completeness (30%) + Consistency (25%) + Structural (20%) + Semantic (15%) + Uniqueness (10%)
  // Pour un Sommaire Exécutif, l'unicité par succursale / dimension vaut 100%
  const finalUniqueness = isAggregatedSummary ? 100 : uniquenessScore;
  const overallQualityScore = Math.min(
    100,
    Math.max(
      0,
      Math.round(
        completenessScore * 0.30 +
        consistencyScore * 0.25 +
        structuralScore * 0.20 +
        semanticConfidence * 0.15 +
        finalUniqueness * 0.10
      )
    )
  );

  // 8. Niveau de risque (Risk Level)
  let riskLevel: "LOW" | "MEDIUM" | "HIGH" = "LOW";
  if (overallQualityScore < 50 || completenessScore < 50) {
    riskLevel = "HIGH";
  } else if (overallQualityScore < 80 || consistencyScore < 65) {
    riskLevel = "MEDIUM";
  }

  const quarantinedRows = 0; // Calculé par le moteur de validation d'entité lors de l'ingestion

  return {
    overallQualityScore,
    completenessScore,
    structuralScore,
    consistencyScore,
    uniquenessScore: finalUniqueness,
    semanticConfidence,
    riskLevel,
    totalRows,
    usableRows,
    quarantinedRows,
    isolatedSummaryRows,
    diagnostics,
  };
}

