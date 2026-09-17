// ─────────────────────────────────────────────────────────────────────────────
// GESCOP Recognition Engine — Value Profiler
// Version 5.0 — Septembre 2026
// ─────────────────────────────────────────────────────────────────────────────

import type { LogicalType } from "../ontology/types.ts";
import { LOGICAL_TYPES } from "../ontology/types.ts";

export interface ValueProfile {
  detectedLogicalType: LogicalType;
  confidence: number;
  sampleCount: number;
  nullCount: number;
  isNumeric: boolean;
  hasDecimals: boolean;
  hasNegative: boolean;
  min?: number;
  max?: number;
  avg?: number;
  isRatingCandidate: boolean;     // e.g. values strictly between 0 and 5
  isPercentageCandidate: boolean; // e.g. values strictly between 0 and 1 (or 0 and 100)
  isIntegerOnly: boolean;
  isDate: boolean;
  isBoolean: boolean;
  justification: string;
}

/**
 * Analyse la distribution et le profil des valeurs réelles d'une colonne
 */
export function profileValues(values: unknown[], headerHint = ""): ValueProfile {
  const normHint = headerHint.toLowerCase().replace(/[_\-]/g, " ").trim();
  const samples = values.filter((v) => v !== null && v !== undefined && String(v).trim() !== "");
  const nullCount = values.length - samples.length;

  if (samples.length === 0) {
    return {
      detectedLogicalType: LOGICAL_TYPES.TEXT,
      confidence: 0.2,
      sampleCount: 0,
      nullCount,
      isNumeric: false,
      hasDecimals: false,
      hasNegative: false,
      isRatingCandidate: false,
      isPercentageCandidate: false,
      isIntegerOnly: false,
      isDate: false,
      isBoolean: false,
      justification: "Aucune valeur échantillon disponible.",
    };
  }

  let numCount = 0;
  let dateCount = 0;
  let boolCount = 0;
  let decimalCount = 0;
  let negCount = 0;
  let numbers: number[] = [];

  for (const val of samples) {
    // Test booléen
    if (typeof val === "boolean" || /^(true|false|oui|non|yes|no|1|0)$/i.test(String(val).trim())) {
      boolCount++;
    }

    // Test numérique
    let cleanedNumStr = String(val)
      .replace(/[\s\u00A0]/g, "")
      .replace(/[$€£%]/g, "")
      .replace(/,/g, ".");
    const num = Number(cleanedNumStr);

    if (!isNaN(num) && cleanedNumStr !== "") {
      numCount++;
      numbers.push(num);
      if (!Number.isInteger(num)) decimalCount++;
      if (num < 0) negCount++;
    }

    // Test Date
    const strVal = String(val).trim();
    if (
      /^\d{4}[-/.]\d{1,2}[-/.]\d{1,2}/.test(strVal) ||
      /^\d{1,2}[-/.]\d{1,2}[-/.]\d{2,4}/.test(strVal) ||
      (!isNaN(Date.parse(strVal)) && isNaN(Number(strVal)) && strVal.length >= 8)
    ) {
      dateCount++;
    }
  }

  const sampleCount = samples.length;
  const numRatio = numCount / sampleCount;
  const dateRatio = dateCount / sampleCount;
  const boolRatio = boolCount / sampleCount;

  // 1. Détection Date
  if (dateRatio >= 0.75) {
    return {
      detectedLogicalType: LOGICAL_TYPES.DATE,
      confidence: 0.95,
      sampleCount,
      nullCount,
      isNumeric: false,
      hasDecimals: false,
      hasNegative: false,
      isRatingCandidate: false,
      isPercentageCandidate: false,
      isIntegerOnly: false,
      isDate: true,
      isBoolean: false,
      justification: `${Math.round(dateRatio * 100)}% des valeurs sont des dates valides.`,
    };
  }

  // 2. Détection Booléen (si non purement numérique)
  if (boolRatio >= 0.85 && numRatio < 0.85) {
    return {
      detectedLogicalType: LOGICAL_TYPES.BOOLEAN,
      confidence: 0.9,
      sampleCount,
      nullCount,
      isNumeric: false,
      hasDecimals: false,
      hasNegative: false,
      isRatingCandidate: false,
      isPercentageCandidate: false,
      isIntegerOnly: false,
      isDate: false,
      isBoolean: true,
      justification: "Valeurs booléennes (vrai/faux, oui/non).",
    };
  }

  // 3. Détection Numérique & Sous-types
  if (numRatio >= 0.8) {
    const min = Math.min(...numbers);
    const max = Math.max(...numbers);
    const avg = Number((numbers.reduce((s, n) => s + n, 0) / numbers.length).toFixed(2));
    const hasDecimals = decimalCount > 0;
    const hasNegative = negCount > 0;
    const isIntegerOnly = !hasDecimals;

    // A. Pourcentage (PERCENTAGE) : 0..1 ou 0..100 avec indice de taux/marge
    const isPctHint = normHint.includes("%") || /\b(pct|taux|rate|pourcent|percentage|marge|margin|ratio)\b/i.test(normHint);
    const isZeroToOne = min >= 0 && max <= 1.0;
    const isZeroToHundred = min >= 0 && max <= 100.0 && isPctHint;
    if (isZeroToOne || isZeroToHundred) {
      return {
        detectedLogicalType: LOGICAL_TYPES.PERCENTAGE,
        confidence: isPctHint ? 0.95 : 0.85,
        sampleCount,
        nullCount,
        isNumeric: true,
        hasDecimals,
        hasNegative,
        min,
        max,
        avg,
        isRatingCandidate: false,
        isPercentageCandidate: true,
        isIntegerOnly,
        isDate: false,
        isBoolean: false,
        justification: isZeroToOne
          ? "Valeurs décimales comprises entre 0 et 1 (ratio/pourcentage)."
          : "Valeurs comprises entre 0 et 100 avec indication de taux/marge.",
      };
    }

    // B. Évaluation / Note (RATING) : ex. 1 à 5 (note d'avis, CSAT, satisfaction)
    const isRatingHint = /\b(rating|note|score|csat|avis|evaluation|satisfaction|stars?)\b/i.test(normHint);
    const isRatingRange = min >= 0 && max <= 5.0 && numbers.length > 0;
    if (isRatingHint || (isRatingRange && max > 1.0 && (isRatingHint || hasDecimals))) {
      return {
        detectedLogicalType: LOGICAL_TYPES.RATING,
        confidence: isRatingHint ? 0.95 : 0.75,
        sampleCount,
        nullCount,
        isNumeric: true,
        hasDecimals,
        hasNegative,
        min,
        max,
        avg,
        isRatingCandidate: true,
        isPercentageCandidate: false,
        isIntegerOnly,
        isDate: false,
        isBoolean: false,
        justification: `Valeurs distribuées entre ${min} et ${max} (profil d'évaluation / note).`,
      };
    }

    // C. Quantité / Compte (QUANTITY) : Entiers positifs sans décimales avec indice de quantité
    const isQtyHint = /\b(qty|qte|quantite|unites|units|pieces|items|count|volume|heures|jours)\b/i.test(normHint);
    if (isIntegerOnly && !hasNegative && (isQtyHint || max < 1000)) {
      return {
        detectedLogicalType: LOGICAL_TYPES.QUANTITY,
        confidence: isQtyHint ? 0.9 : 0.7,
        sampleCount,
        nullCount,
        isNumeric: true,
        hasDecimals: false,
        hasNegative: false,
        min,
        max,
        avg,
        isRatingCandidate: false,
        isPercentageCandidate: false,
        isIntegerOnly: true,
        isDate: false,
        isBoolean: false,
        justification: "Entiers positifs caractéristiques d'un comptage ou d'une quantité.",
      };
    }

    // D. Montant monétaire / Devise (CURRENCY)
    return {
      detectedLogicalType: LOGICAL_TYPES.CURRENCY,
      confidence: hasDecimals || max > 50 ? 0.85 : 0.65,
      sampleCount,
      nullCount,
      isNumeric: true,
      hasDecimals,
      hasNegative,
      min,
      max,
      avg,
      isRatingCandidate: false,
      isPercentageCandidate: false,
      isIntegerOnly,
      isDate: false,
      isBoolean: false,
      justification: `Valeurs numériques (min: ${min}, max: ${max}, moy: ${avg}) compatibles avec un montant monétaire.`,
    };
  }

  // 4. Par défaut : Texte ou Identifiant
  const allAlphanum = samples.every((s) => /^[a-zA-Z0-9_\-#]+$/.test(String(s).trim()));
  const isIdHint = /\b(id|code|sku|ref|numero|no)\b/i.test(normHint);

  return {
    detectedLogicalType: allAlphanum && isIdHint ? LOGICAL_TYPES.IDENTIFIER : LOGICAL_TYPES.TEXT,
    confidence: allAlphanum && isIdHint ? 0.9 : 0.7,
    sampleCount,
    nullCount,
    isNumeric: false,
    hasDecimals: false,
    hasNegative: false,
    isRatingCandidate: false,
    isPercentageCandidate: false,
    isIntegerOnly: false,
    isDate: false,
    isBoolean: false,
    justification: allAlphanum && isIdHint
      ? "Codes alphanumériques typiques d'un identifiant."
      : "Valeurs textuelles catégorielles ou descriptives.",
  };
}
