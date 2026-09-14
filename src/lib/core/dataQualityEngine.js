// ─────────────────────────────────────────────────────────────────────────────
// GESCOP Data Intelligence Core — Data Quality Engine
// ─────────────────────────────────────────────────────────────────────────────
//
// Computes a quality score (0–100) for each field and dataset.
// Builds on the coherence/quality checks already in src/lib/dataAudit.js
// but structures them as normalized per-field scores.
//
// Consumed by: kpiValidator, displayEngine, dataLineage
// ─────────────────────────────────────────────────────────────────────────────

import { DATA_TYPES, ECONOMIC_ROLES } from "./semanticTypes";

// ─────────────────────────────────────────────────────────────────────────────
// QUALITY DIMENSIONS
// ─────────────────────────────────────────────────────────────────────────────

const QUALITY_WEIGHTS = Object.freeze({
  completeness: 0.30, // % of non-null values
  validity: 0.25, // % of values in expected domain
  consistency: 0.20, // % of values consistent with related fields
  uniqueness: 0.10, // % of unique values (for identifiers)
  freshness: 0.15, // how recent the latest record is
});

// ─────────────────────────────────────────────────────────────────────────────
// FIELD QUALITY
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Compute the quality score for a single field across a set of records.
 *
 * @param {Array<Object>} records — Dataset records
 * @param {string} fieldName — Field to evaluate
 * @param {Object} fieldSemantic — FieldSemantic from entityFieldMap
 * @returns {FieldQualityScore}
 */
export function computeFieldQuality(records, fieldName, fieldSemantic) {
  if (!records || records.length === 0) {
    return _emptyQuality(fieldName, fieldSemantic);
  }

  const values = records.map((r) => r[fieldName]);
  const total = values.length;

  // ── Completeness: % of non-null, non-empty values ──
  const nonNull = values.filter(
    (v) => v !== null && v !== undefined && String(v).trim() !== ""
  ).length;
  const completeness = total > 0 ? (nonNull / total) * 100 : 0;

  // ── Validity: % of values matching expected data type ──
  const validity = _computeValidity(values, fieldSemantic);

  // ── Consistency: check for outliers and impossible values ──
  const consistency = _computeConsistency(values, fieldSemantic);

  // ── Uniqueness: for identifiers, % of distinct values ──
  const uniqueness = _computeUniqueness(values, fieldSemantic);

  // ── Freshness: age of most recent record ──
  const freshness = _computeFreshness(records, fieldSemantic);

  // ── Weighted global score ──
  const global = Math.round(
    completeness * QUALITY_WEIGHTS.completeness +
      validity * QUALITY_WEIGHTS.validity +
      consistency * QUALITY_WEIGHTS.consistency +
      uniqueness * QUALITY_WEIGHTS.uniqueness +
      freshness * QUALITY_WEIGHTS.freshness
  );

  const issues = [];
  if (completeness < 80) issues.push(`Complétude faible (${Math.round(completeness)} %) — ${total - nonNull} valeurs manquantes`);
  if (validity < 80) issues.push(`Validité faible (${Math.round(validity)} %) — valeurs hors domaine attendu`);
  if (consistency < 80) issues.push(`Cohérence faible (${Math.round(consistency)} %) — valeurs aberrantes détectées`);
  if (uniqueness < 80 && fieldSemantic?.economicRole === ECONOMIC_ROLES.DIMENSION && fieldSemantic?.semanticType === "identifier") {
    issues.push(`Unicité faible (${Math.round(uniqueness)} %) — doublons détectés sur un identifiant`);
  }
  if (freshness < 50) issues.push("Données potentiellement obsolètes");

  return {
    field: fieldName,
    source: fieldSemantic?.source || null,
    semanticType: fieldSemantic?.semanticType || null,
    dimensions: {
      completeness: Math.round(completeness),
      validity: Math.round(validity),
      consistency: Math.round(consistency),
      uniqueness: Math.round(uniqueness),
      freshness: Math.round(freshness),
    },
    global: Math.max(0, Math.min(100, global)),
    issues,
    recordCount: total,
  };
}

/**
 * Compute quality scores for all fields in a dataset.
 *
 * @param {Array<Object>} records
 * @param {Map<string, Object>} fieldSemantics — field name → FieldSemantic
 * @returns {DatasetQualityScore}
 */
export function computeDatasetQuality(records, fieldSemantics) {
  if (!records || records.length === 0) {
    return { global: 0, byField: {}, issues: [], recordCount: 0 };
  }

  const byField = {};
  const allIssues = [];
  let totalScore = 0;
  let fieldCount = 0;

  for (const [fieldName, fs] of fieldSemantics) {
    const score = computeFieldQuality(records, fieldName, fs);
    byField[fieldName] = score;
    totalScore += score.global;
    fieldCount++;
    allIssues.push(...score.issues.map((i) => `${fieldName}: ${i}`));
  }

  return {
    global: fieldCount > 0 ? Math.round(totalScore / fieldCount) : 0,
    byField,
    issues: allIssues,
    recordCount: records.length,
  };
}

/**
 * Generate a human-readable quality report.
 *
 * @param {DatasetQualityScore} scores
 * @returns {QualityReport}
 */
export function getQualityReport(scores) {
  const { global, byField, issues, recordCount } = scores;

  const grade =
    global >= 90
      ? { label: "Excellent", emoji: "🟢" }
      : global >= 75
        ? { label: "Bon", emoji: "🟡" }
        : global >= 60
          ? { label: "Acceptable", emoji: "🟠" }
          : { label: "Insuffisant", emoji: "🔴" };

  const criticalFields = Object.entries(byField)
    .filter(([, s]) => s.global < 60)
    .map(([name, s]) => ({ name, score: s.global, issues: s.issues }));

  const recommendations = [];
  if (criticalFields.length > 0) {
    recommendations.push(
      `${criticalFields.length} champ(s) en qualité insuffisante nécessitent une attention.`
    );
  }

  const completenessIssues = Object.entries(byField).filter(
    ([, s]) => s.dimensions.completeness < 70
  );
  if (completenessIssues.length > 0) {
    recommendations.push(
      `${completenessIssues.length} champ(s) présentent des données manquantes significatives.`
    );
  }

  return {
    global,
    grade,
    recordCount,
    criticalFields,
    recommendations,
    issues,
    summary: `Qualité globale : ${grade.emoji} ${global}/100 (${grade.label}) — ${recordCount} enregistrements analysés.`,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// INTERNAL HELPERS
// ─────────────────────────────────────────────────────────────────────────────

function _emptyQuality(fieldName, fieldSemantic) {
  return {
    field: fieldName,
    source: fieldSemantic?.source || null,
    semanticType: fieldSemantic?.semanticType || null,
    dimensions: { completeness: 0, validity: 0, consistency: 0, uniqueness: 0, freshness: 0 },
    global: 0,
    issues: ["Aucune donnée disponible"],
    recordCount: 0,
  };
}

function _computeValidity(values, fieldSemantic) {
  if (!fieldSemantic) return 100;
  const nonNull = values.filter((v) => v !== null && v !== undefined && String(v).trim() !== "");
  if (nonNull.length === 0) return 0;

  const dataType = fieldSemantic.dataType;
  let valid = 0;

  for (const v of nonNull) {
    if (_isValidForType(v, dataType)) valid++;
  }

  return (valid / nonNull.length) * 100;
}

function _isValidForType(value, dataType) {
  switch (dataType) {
    case DATA_TYPES.CURRENCY:
    case DATA_TYPES.NUMBER:
    case DATA_TYPES.PERCENTAGE:
    case DATA_TYPES.SCORE: {
      const n = Number(value);
      return Number.isFinite(n);
    }
    case DATA_TYPES.INTEGER: {
      const n = Number(value);
      return Number.isFinite(n) && Number.isInteger(n);
    }
    case DATA_TYPES.DATE: {
      if (value instanceof Date) return !isNaN(value.getTime());
      const d = new Date(value);
      return !isNaN(d.getTime());
    }
    case DATA_TYPES.BOOLEAN:
      return (
        typeof value === "boolean" ||
        ["true", "false", "1", "0", "oui", "non", "yes", "no"].includes(
          String(value).toLowerCase()
        )
      );
    case DATA_TYPES.STRING:
      return typeof value === "string" && value.trim().length > 0;
    default:
      return true;
  }
}

function _computeConsistency(values, fieldSemantic) {
  if (!fieldSemantic) return 100;
  const numericTypes = [DATA_TYPES.CURRENCY, DATA_TYPES.NUMBER, DATA_TYPES.PERCENTAGE, DATA_TYPES.INTEGER, DATA_TYPES.SCORE];

  if (!numericTypes.includes(fieldSemantic.dataType)) return 100;

  const nums = values
    .map((v) => Number(v))
    .filter((n) => Number.isFinite(n));

  if (nums.length < 3) return 100;

  // Detect outliers: values > 20× the median
  const sorted = [...nums].sort((a, b) => a - b);
  const median = sorted[Math.floor(sorted.length / 2)];
  if (median === 0) return 100;

  const absMedian = Math.abs(median);
  const outliers = nums.filter((n) => Math.abs(n) > absMedian * 20).length;

  // Check for negative values where they shouldn't be
  let negativeIssues = 0;
  if (fieldSemantic.semanticType === "revenue" || fieldSemantic.semanticType === "count" || fieldSemantic.semanticType === "sales_quantity") {
    negativeIssues = nums.filter((n) => n < 0).length;
  }

  const totalIssues = outliers + negativeIssues;
  return Math.max(0, ((nums.length - totalIssues) / nums.length) * 100);
}

function _computeUniqueness(values, fieldSemantic) {
  if (!fieldSemantic) return 100;

  // Uniqueness matters most for identifiers
  if (fieldSemantic.economicRole !== ECONOMIC_ROLES.DIMENSION) return 100;
  if (fieldSemantic.semanticType !== "identifier") return 100;

  const nonNull = values.filter((v) => v !== null && v !== undefined && String(v).trim() !== "");
  if (nonNull.length === 0) return 0;

  const unique = new Set(nonNull.map((v) => String(v).trim())).size;
  return (unique / nonNull.length) * 100;
}

function _computeFreshness(records, fieldSemantic) {
  // Find any date field in the records to determine freshness
  const dateFields = ["date", "created_date", "period", "hire_date"];
  let latestDate = null;

  for (const record of records) {
    for (const df of dateFields) {
      const val = record[df];
      if (!val) continue;
      const d = new Date(val);
      if (!isNaN(d.getTime())) {
        if (!latestDate || d > latestDate) latestDate = d;
      }
    }
  }

  if (!latestDate) return 75; // Unknown freshness — neutral score

  const now = new Date();
  const ageInDays = (now.getTime() - latestDate.getTime()) / (1000 * 60 * 60 * 24);

  if (ageInDays <= 7) return 100;
  if (ageInDays <= 30) return 90;
  if (ageInDays <= 90) return 75;
  if (ageInDays <= 180) return 50;
  if (ageInDays <= 365) return 30;
  return 10;
}

/**
 * Check if a field's quality is sufficient for KPI calculation.
 *
 * @param {Object} fieldQuality — Result from computeFieldQuality
 * @param {number} [threshold=60] — Minimum acceptable quality score
 * @returns {{ sufficient: boolean, reason: string|null }}
 */
export function isQualitySufficient(fieldQuality, threshold = 60) {
  if (!fieldQuality) {
    return { sufficient: false, reason: "Score de qualité non disponible." };
  }
  if (fieldQuality.global >= threshold) {
    return { sufficient: true, reason: null };
  }
  const weakest = Object.entries(fieldQuality.dimensions)
    .sort(([, a], [, b]) => a - b)[0];
  return {
    sufficient: false,
    reason: `Qualité insuffisante (${fieldQuality.global}/100). Dimension la plus faible : ${weakest[0]} (${weakest[1]}%).`,
  };
}
