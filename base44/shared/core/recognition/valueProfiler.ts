// ─────────────────────────────────────────────────────────────────────────────
// GESCOP Recognition Engine — Value Profiler
// Version 5.0 — Septembre 2026
// ─────────────────────────────────────────────────────────────────────────────

import type { LogicalType, ValueSemanticCategory } from "../ontology/types.ts";
import { LOGICAL_TYPES, VALUE_SEMANTIC_CATEGORIES } from "../ontology/types.ts";

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

  // Profilage statistique (Spec Section 14)
  cardinality: number;
  uniquenessRatio: number;
  nullRatio: number;
  isUniqueKeyCandidate: boolean;

  // Profilage sémantique des valeurs (Spec Section 14 & 15)
  semanticCategory: ValueSemanticCategory;
  semanticCategoryConfidence: number;
}

const KNOWN_GEOGRAPHIES = new Set([
  "quebec", "montreal", "levis", "trois-rivieres", "trois rivieres", "sherbrooke",
  "gatineau", "ottawa", "toronto", "vancouver", "calgary", "edmonton", "halifax",
  "paris", "lyon", "marseille", "bordeaux", "toulouse", "lille", "nantes", "strasbourg",
  "bruxelles", "geneve", "lausanne", "saguenay", "chicoutimi", "rimouski", "drummondville",
  "saint-jerome", "granby", "saint-hyacinthe", "shawinigan", "victoriaville"
]);

const KNOWN_DEPARTMENTS = new Set([
  "direction", "ventes", "marketing", "logistique", "administration", "rh",
  "ressources humaines", "service_client", "service client", "atelier", "comptabilite",
  "achats", "informatique", "it", "rd", "operations", "production", "support", "ventes/magasin"
]);

const KNOWN_MARKETING_CHANNELS = new Set([
  "meta_ads", "facebook", "facebook ads", "meta", "google_ads", "google", "google ads",
  "adwords", "tiktok", "tiktok ads", "instagram", "courriel", "email", "newsletter",
  "affichage", "affichage / web", "sepaq", "partenariat", "partenariat sepaq", "web",
  "influenceurs", "seo", "sea", "sms", "affiliation", "radio", "presse", "evenementiel"
]);

const KNOWN_PAYMENT_METHODS = new Set([
  "carte", "credit", "debit", "visa", "mastercard", "amex", "comptant", "cash",
  "virement", "interac", "stripe", "paypal", "cheque", "pos", "facture 30 jours", "prelevement"
]);

const KNOWN_STATUSES = new Set([
  "actif", "active", "terminee", "termine", "completed", "en cours", "pending",
  "annule", "annulee", "cancelled", "brouillon", "draft", "archive", "archivee", "closed", "open"
]);

function stripString(str: string): string {
  return str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

/**
 * Détecte la catégorie sémantique des valeurs textuelles
 */
export function detectSemanticCategory(
  samples: unknown[],
  headerHint = ""
): { category: ValueSemanticCategory; confidence: number } {
  if (samples.length === 0) {
    return { category: VALUE_SEMANTIC_CATEGORIES.GENERAL_TEXT, confidence: 0.1 };
  }

  const normHint = stripString(headerHint);
  let geoHits = 0;
  let deptHits = 0;
  let channelHits = 0;
  let paymentHits = 0;
  let statusHits = 0;

  for (const s of samples) {
    const val = stripString(String(s ?? ""));
    if (!val) continue;

    if (
      KNOWN_GEOGRAPHIES.has(val) ||
      /\b(succursale|magasin|boutique|store|branch)\b/i.test(val) ||
      /\b(nord|sud|est|ouest|centre|downtown)\b/i.test(val)
    ) {
      geoHits++;
    }

    if (
      KNOWN_DEPARTMENTS.has(val) ||
      /\b(direction|ventes|marketing|logistique|admin|atelier|support)\b/i.test(val)
    ) {
      deptHits++;
    }

    if (
      KNOWN_MARKETING_CHANNELS.has(val) ||
      /\b(facebook|google|tiktok|instagram|courriel|email|ads|campagne|newsletter)\b/i.test(val)
    ) {
      channelHits++;
    }

    if (
      KNOWN_PAYMENT_METHODS.has(val) ||
      /\b(carte|visa|mastercard|interac|comptant|virement|stripe|cash)\b/i.test(val)
    ) {
      paymentHits++;
    }

    if (
      KNOWN_STATUSES.has(val) ||
      /\b(actif|active|termine|terminee|en cours|brouillon|draft)\b/i.test(val)
    ) {
      statusHits++;
    }
  }

  const total = samples.length;
  const geoRatio = geoHits / total;
  const deptRatio = deptHits / total;
  const chanRatio = channelHits / total;
  const payRatio = paymentHits / total;
  const statusRatio = statusHits / total;

  // Header clues can boost
  const isGeoHeader = /\b(succursale|ville|city|location|store|magasin|branche|region|site)\b/i.test(normHint);
  const isDeptHeader = /\b(departement|dept|service|division|pole)\b/i.test(normHint);
  const isChanHeader = /\b(canal|channel|source|support|plateforme)\b/i.test(normHint);
  const isPayHeader = /\b(paiement|payment|mode|methode_paiement|reglement)\b/i.test(normHint);
  const isStatusHeader = /\b(statut|status|etat|phase)\b/i.test(normHint);

  if (geoRatio >= 0.5 || (geoRatio >= 0.25 && isGeoHeader) || (geoHits > 0 && isGeoHeader && deptHits === 0)) {
    return {
      category: VALUE_SEMANTIC_CATEGORIES.GEOGRAPHIC_LOCATION,
      confidence: Math.min(0.98, Math.max(0.7, geoRatio + (isGeoHeader ? 0.3 : 0))),
    };
  }

  if (deptRatio >= 0.5 || (deptRatio >= 0.25 && isDeptHeader)) {
    return {
      category: VALUE_SEMANTIC_CATEGORIES.ORGANIZATIONAL_DEPARTMENT,
      confidence: Math.min(0.98, Math.max(0.7, deptRatio + (isDeptHeader ? 0.3 : 0))),
    };
  }

  if (chanRatio >= 0.5 || (chanRatio >= 0.25 && isChanHeader)) {
    return {
      category: VALUE_SEMANTIC_CATEGORIES.MARKETING_CHANNEL,
      confidence: Math.min(0.98, Math.max(0.7, chanRatio + (isChanHeader ? 0.3 : 0))),
    };
  }

  if (payRatio >= 0.5 || (payRatio >= 0.25 && isPayHeader)) {
    return {
      category: VALUE_SEMANTIC_CATEGORIES.PAYMENT_METHOD,
      confidence: Math.min(0.98, Math.max(0.7, payRatio + (isPayHeader ? 0.3 : 0))),
    };
  }

  if (statusRatio >= 0.5 || (statusRatio >= 0.25 && isStatusHeader)) {
    return {
      category: VALUE_SEMANTIC_CATEGORIES.STATUS_LIFECYCLE,
      confidence: Math.min(0.98, Math.max(0.7, statusRatio + (isStatusHeader ? 0.3 : 0))),
    };
  }

  return { category: VALUE_SEMANTIC_CATEGORIES.GENERAL_TEXT, confidence: 0.5 };
}

/**
 * Analyse la distribution et le profil des valeurs réelles d'une colonne
 */
export function profileValues(values: unknown[], headerHint = ""): ValueProfile {
  const normHint = headerHint.toLowerCase().replace(/[_\-]/g, " ").trim();
  const samples = values.filter((v) => v !== null && v !== undefined && String(v).trim() !== "");
  const nullCount = values.length - samples.length;
  const totalRows = values.length;
  const nullRatio = totalRows > 0 ? nullCount / totalRows : 0;

  // Profilage statistique
  const distinctSet = new Set(samples.map((s) => String(s).trim()));
  const cardinality = distinctSet.size;
  const uniquenessRatio = samples.length > 0 ? cardinality / samples.length : 0;
  const isUniqueKeyCandidate = uniquenessRatio === 1.0 && nullCount === 0 && samples.length > 1;

  // Profilage sémantique
  const { category: semanticCategory, confidence: semanticCategoryConfidence } =
    detectSemanticCategory(samples, normHint);

  const stats = {
    cardinality,
    uniquenessRatio,
    nullRatio,
    isUniqueKeyCandidate,
    semanticCategory,
    semanticCategoryConfidence,
  };

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
      ...stats,
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
      ...stats,
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
      ...stats,
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
        ...stats,
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
        ...stats,
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
        ...stats,
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
      ...stats,
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
    ...stats,
  };
}
