// ─────────────────────────────────────────────────────────────────────────────
// GESCOP Data Intelligence Core — Field Semantic Object Builder
// ─────────────────────────────────────────────────────────────────────────────
//
// Creates and manages semantic descriptors for individual data fields.
// A FieldSemantic object is the complete "identity card" of a field:
// it tells GESCOP what the field represents, how it behaves economically,
// and what operations are valid on it.
//
// This module is consumed by: entityFieldMap, kpiEngine, compatibilityEngine,
// chartValidator, displayEngine.
// ─────────────────────────────────────────────────────────────────────────────

import {
  SEMANTIC_TYPES,
  ECONOMIC_ROLES,
  TEMPORAL_TYPES,
  DATA_TYPES,
  AGGREGATION_METHODS,
  ADDITIVE_COMPATIBILITY,
  COMPARISON_COMPATIBILITY,
  getSemanticType,
} from "./semanticTypes";

// ─────────────────────────────────────────────────────────────────────────────
// FIELD SEMANTIC CONSTRUCTOR
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Creates a complete semantic descriptor for a data field.
 *
 * @param {Object} params
 * @param {string} params.source       — Entity name (e.g., "Order", "Cashflow")
 * @param {string} params.field        — Field name in the entity (e.g., "total", "closing_cash")
 * @param {string} params.canonicalKey — Unique semantic key (e.g., "revenue", "cash_closing")
 * @param {string} params.semanticType — Key into SEMANTIC_TYPES catalog
 * @param {string} [params.grain]      — Record granularity (e.g., "order", "day")
 * @param {string} [params.unit]       — Display unit override (e.g., "CAD", "days")
 * @param {string} [params.currencyCode] — ISO currency code (default: "CAD")
 * @param {number} [params.confidence] — Recognition confidence 0–1 (default: 1.0)
 * @param {string} [params.status]     — Verification status (default: "verified")
 * @param {Object} [params.overrides]  — Override any auto-derived property
 * @returns {FieldSemantic} Complete semantic descriptor
 */
export function createFieldSemantic({
  source,
  field,
  canonicalKey,
  semanticType,
  grain = null,
  unit = null,
  currencyCode = "CAD",
  confidence = 1.0,
  status = "verified",
  overrides = {},
}) {
  const typeDef = getSemanticType(semanticType);

  if (!typeDef) {
    return {
      source,
      field,
      canonicalKey,
      semanticType: "unknown",
      economicRole: ECONOMIC_ROLES.DIMENSION,
      dataType: DATA_TYPES.STRING,
      unit: null,
      currencyCode: null,
      grain: grain || "unknown",
      temporalType: TEMPORAL_TYPES.STATIC,
      aggregation: AGGREGATION_METHODS.NONE,
      isAdditive: false,
      isComparable: false,
      domain: null,
      confidence: Math.min(confidence, 0.5),
      status: "review",
      label: { fr: field, en: field },
      direction: "neutral",
    };
  }

  // Resolve effective unit
  const resolvedUnit =
    unit ||
    (typeDef.dataType === DATA_TYPES.CURRENCY
      ? "currency"
      : typeDef.dataType === DATA_TYPES.PERCENTAGE
        ? "%"
        : typeDef.dataType === DATA_TYPES.DURATION
          ? "days"
          : null);

  const semantic = {
    // ── Source identification ──
    source,
    field,

    // ── Semantic identity ──
    canonicalKey,
    semanticType,

    // ── Economic classification (from SEMANTIC_TYPES) ──
    economicRole: typeDef.economicRole,
    dataType: typeDef.dataType,
    temporalType: typeDef.temporalType,
    aggregation: typeDef.aggregation,
    isAdditive: typeDef.isAdditive,
    isComparable: typeDef.isComparable,
    domain: typeDef.domain,
    direction: typeDef.direction,
    label: typeDef.label,

    // ── Units ──
    unit: resolvedUnit,
    currencyCode:
      typeDef.dataType === DATA_TYPES.CURRENCY ? currencyCode : null,

    // ── Granularity ──
    grain: grain || "unknown",

    // ── Trust ──
    confidence: Math.max(0, Math.min(1, confidence)),
    status,

    // ── Apply any explicit overrides ──
    ...overrides,
  };

  return Object.freeze(semantic);
}

// ─────────────────────────────────────────────────────────────────────────────
// COMPATIBILITY CHECKS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Check if two fields can be summed together.
 *
 * Two fields are additive if:
 * 1. Both are individually additive (isAdditive === true)
 * 2. Their economic roles are compatible (FLOW+FLOW, STOCK+STOCK, etc.)
 * 3. Their units are compatible (both currency, or both same unit)
 *
 * @param {FieldSemantic} fieldA
 * @param {FieldSemantic} fieldB
 * @returns {{ valid: boolean, reason: string|null }}
 */
export function areFieldsAdditive(fieldA, fieldB) {
  if (!fieldA || !fieldB) {
    return { valid: false, reason: "Un ou plusieurs champs sont indéfinis." };
  }

  // Check individual additivity
  if (!fieldA.isAdditive) {
    return {
      valid: false,
      reason: `« ${fieldA.label?.fr || fieldA.field} » (${fieldA.economicRole}) n'est pas additionnable — c'est un ${fieldA.temporalType === "stock" ? "solde ponctuel" : "taux/ratio"}.`,
    };
  }
  if (!fieldB.isAdditive) {
    return {
      valid: false,
      reason: `« ${fieldB.label?.fr || fieldB.field} » (${fieldB.economicRole}) n'est pas additionnable — c'est un ${fieldB.temporalType === "stock" ? "solde ponctuel" : "taux/ratio"}.`,
    };
  }

  // Check role compatibility
  const compatSet = ADDITIVE_COMPATIBILITY[fieldA.economicRole];
  if (!compatSet || !compatSet.has(fieldB.economicRole)) {
    return {
      valid: false,
      reason: `Incompatibilité économique : « ${fieldA.label?.fr || fieldA.field} » (${fieldA.economicRole}) et « ${fieldB.label?.fr || fieldB.field} » (${fieldB.economicRole}) ne sont pas additifs. Les flux (FLOW) et les soldes (STOCK/BALANCE) ne peuvent pas être sommés.`,
    };
  }

  // Check unit compatibility
  if (fieldA.dataType !== fieldB.dataType) {
    return {
      valid: false,
      reason: `Unités incompatibles : « ${fieldA.label?.fr || fieldA.field} » est en ${fieldA.dataType} et « ${fieldB.label?.fr || fieldB.field} » est en ${fieldB.dataType}.`,
    };
  }

  // Check currency compatibility
  if (
    fieldA.dataType === DATA_TYPES.CURRENCY &&
    fieldA.currencyCode &&
    fieldB.currencyCode &&
    fieldA.currencyCode !== fieldB.currencyCode
  ) {
    return {
      valid: false,
      reason: `Devises différentes : ${fieldA.currencyCode} vs ${fieldB.currencyCode}. Conversion requise avant addition.`,
    };
  }

  return { valid: true, reason: null };
}

/**
 * Check if two fields can be compared side-by-side (e.g., in a chart).
 *
 * Comparison is more permissive than addition:
 * - Revenue and Expenses can be compared (both FLOW + currency)
 * - Margin % and Conversion % can be compared (both RATE + percentage)
 * - Revenue (FLOW) and Cash Balance (STOCK) CANNOT be compared meaningfully
 *
 * @param {FieldSemantic} fieldA
 * @param {FieldSemantic} fieldB
 * @returns {{ valid: boolean, reason: string|null }}
 */
export function areFieldsComparable(fieldA, fieldB) {
  if (!fieldA || !fieldB) {
    return { valid: false, reason: "Un ou plusieurs champs sont indéfinis." };
  }

  if (!fieldA.isComparable || !fieldB.isComparable) {
    return {
      valid: false,
      reason: "Un ou plusieurs champs ne sont pas comparables (dimensions ou identifiants).",
    };
  }

  const compatSet = COMPARISON_COMPATIBILITY[fieldA.economicRole];
  if (!compatSet || !compatSet.has(fieldB.economicRole)) {
    return {
      valid: false,
      reason: `Comparaison non significative : « ${fieldA.label?.fr || fieldA.field} » (${fieldA.economicRole}) et « ${fieldB.label?.fr || fieldB.field} » (${fieldB.economicRole}) n'appartiennent pas à la même famille économique.`,
    };
  }

  return { valid: true, reason: null };
}

/**
 * Get the correct aggregation method for a field.
 *
 * Returns the canonical aggregation from the semantic type, but can
 * be overridden for specific contexts (e.g., "last" for stock in
 * time series, "sum" for flow in period totals).
 *
 * @param {FieldSemantic} fieldSemantic
 * @param {string} [context] — 'timeseries' | 'period_total' | 'cross_section'
 * @returns {string} Aggregation method key
 */
export function getAggregationMethod(fieldSemantic, context = "period_total") {
  if (!fieldSemantic) return AGGREGATION_METHODS.NONE;

  // Stock values in a time series → take the last value, never sum
  if (
    context === "timeseries" &&
    fieldSemantic.temporalType === TEMPORAL_TYPES.STOCK
  ) {
    return AGGREGATION_METHODS.LAST;
  }

  // Rates and ratios in a period total → weighted average, never sum
  if (
    context === "period_total" &&
    (fieldSemantic.economicRole === ECONOMIC_ROLES.RATE ||
      fieldSemantic.economicRole === ECONOMIC_ROLES.RATIO)
  ) {
    return AGGREGATION_METHODS.WEIGHTED_AVG;
  }

  return fieldSemantic.aggregation || AGGREGATION_METHODS.NONE;
}

/**
 * Validate whether a set of fields can form a valid composition chart.
 *
 * A composition chart (stacked bar, pie, treemap) implies that all values
 * are SUMMED to form a meaningful total. This requires ALL fields to be
 * mutually additive.
 *
 * This is THE function that blocks the "220 861 $" composition.
 *
 * @param {FieldSemantic[]} fields
 * @returns {{ valid: boolean, reason: string|null, invalidPairs: Array|null }}
 */
export function canComposeChart(fields) {
  if (!fields || fields.length < 2) {
    return { valid: true, reason: null, invalidPairs: null };
  }

  const invalidPairs = [];

  for (let i = 0; i < fields.length; i++) {
    for (let j = i + 1; j < fields.length; j++) {
      const check = areFieldsAdditive(fields[i], fields[j]);
      if (!check.valid) {
        invalidPairs.push({
          fieldA: fields[i].label?.fr || fields[i].field,
          fieldB: fields[j].label?.fr || fields[j].field,
          roleA: fields[i].economicRole,
          roleB: fields[j].economicRole,
          reason: check.reason,
        });
      }
    }
  }

  if (invalidPairs.length > 0) {
    // Build a human-readable explanation
    const roles = [...new Set(fields.map((f) => f.economicRole))];
    const roleLabels = {
      [ECONOMIC_ROLES.FLOW]: "flux",
      [ECONOMIC_ROLES.STOCK]: "soldes",
      [ECONOMIC_ROLES.BALANCE]: "soldes",
      [ECONOMIC_ROLES.RATE]: "taux",
      [ECONOMIC_ROLES.RATIO]: "ratios",
      [ECONOMIC_ROLES.COUNT]: "comptages",
      [ECONOMIC_ROLES.QUANTITY]: "quantités",
      [ECONOMIC_ROLES.RESULT]: "résultats",
      [ECONOMIC_ROLES.ASSET]: "actifs",
      [ECONOMIC_ROLES.LIABILITY]: "passifs",
      [ECONOMIC_ROLES.DIMENSION]: "dimensions",
    };
    const mixedTypes = roles.map((r) => roleLabels[r] || r).join(", ");

    return {
      valid: false,
      reason: `Composition indisponible : les mesures sélectionnées mélangent ${mixedTypes} économiquement non additifs. Un graphique de composition ne peut combiner que des valeurs de même nature (ex : uniquement des flux, ou uniquement des soldes).`,
      invalidPairs,
    };
  }

  return { valid: true, reason: null, invalidPairs: null };
}

// ─────────────────────────────────────────────────────────────────────────────
// UTILITY FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Get a human-readable description of a field's semantic identity.
 * Useful for tooltips, lineage explanations, and audit trails.
 *
 * @param {FieldSemantic} fs
 * @returns {string}
 */
export function describeField(fs) {
  if (!fs) return "Champ inconnu";
  const roleFr = {
    FLOW: "flux cumulable dans le temps",
    STOCK: "valeur ponctuelle (solde)",
    RATE: "taux ou pourcentage",
    RATIO: "ratio calculé",
    COUNT: "comptage d'éléments",
    QUANTITY: "quantité mesurable",
    BALANCE: "solde de compte",
    ASSET: "valeur d'actif",
    LIABILITY: "obligation",
    RESULT: "résultat calculé",
    DIMENSION: "dimension descriptive",
  };
  const typeDesc = roleFr[fs.economicRole] || fs.economicRole;
  return `${fs.label?.fr || fs.field} (${fs.source}.${fs.field}) — ${typeDesc}, agrégation par ${fs.aggregation || "aucune"}`;
}

/**
 * Serialize a FieldSemantic to a compact JSON-safe object (for storage/cache).
 * @param {FieldSemantic} fs
 * @returns {Object}
 */
export function serializeFieldSemantic(fs) {
  return { ...fs };
}

/**
 * Create a unique key for a field semantic (for maps and caches).
 * @param {FieldSemantic} fs
 * @returns {string}
 */
export function fieldSemanticKey(fs) {
  return `${fs.source}.${fs.field}`;
}

