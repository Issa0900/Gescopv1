// ─────────────────────────────────────────────────────────────────────────────
// GESCOP Data Intelligence Core — Data Lineage Engine
// ─────────────────────────────────────────────────────────────────────────────
//
// Traces the complete path from raw data to computed KPI:
//   source(s) → transformation(s) → measure → KPI
//
// Extends the buildMetricTraces() concept from src/lib/dataAudit.js
// with structured, per-KPI lineage objects.
// ─────────────────────────────────────────────────────────────────────────────

import { KPI_STATUS } from "./semanticTypes";

/**
 * @typedef {Object} LineageSource
 * @property {string} entity      — Base44 entity name
 * @property {string} field       — Field name in the entity
 * @property {string} canonicalKey — Semantic canonical key
 * @property {number} recordCount — Number of records used
 * @property {string} periodStart — Earliest date in the data (ISO)
 * @property {string} periodEnd   — Latest date in the data (ISO)
 * @property {number} qualityScore — Quality score of this source (0-100)
 */

/**
 * @typedef {Object} KpiLineage
 * @property {string} kpiKey         — Canonical KPI key
 * @property {string} name           — Display name
 * @property {*}      value          — Computed value
 * @property {string} unit           — Display unit
 * @property {LineageSource[]} sources — All data sources used
 * @property {string} formula        — Human-readable formula
 * @property {string} formulaCode    — Code-level formula reference
 * @property {string} period         — Period description
 * @property {number} qualityScore   — Aggregated quality score
 * @property {string} status         — KPI_STATUS value
 * @property {string} evidenceTag    — FAIT | CALCUL | INFÉRENCE | HYPOTHÈSE
 * @property {string[]} warnings     — Any warnings about data quality or methodology
 * @property {string} methodology    — Explanation of calculation method
 */

/**
 * Build a lineage record for a KPI.
 *
 * @param {Object} params
 * @param {string} params.kpiKey
 * @param {string} params.name
 * @param {*}      params.value
 * @param {string} params.unit
 * @param {string} params.formula — e.g., "(sum(total) - sum(cost)) / sum(total) * 100"
 * @param {string} [params.formulaCode] — Reference to source code function
 * @param {string} [params.methodology] — Why this calculation method was chosen
 * @param {LineageSource[]} params.sources
 * @param {string} params.status
 * @returns {KpiLineage}
 */
export function buildKpiLineage({
  kpiKey,
  name,
  value,
  unit,
  formula,
  formulaCode = null,
  methodology = null,
  sources = [],
  status = KPI_STATUS.AVAILABLE,
}) {
  // Determine period from sources
  const allStarts = sources
    .map((s) => s.periodStart)
    .filter(Boolean)
    .sort();
  const allEnds = sources
    .map((s) => s.periodEnd)
    .filter(Boolean)
    .sort();

  const periodStart = allStarts[0] || null;
  const periodEnd = allEnds[allEnds.length - 1] || null;
  const period =
    periodStart && periodEnd
      ? `${periodStart} → ${periodEnd}`
      : "Période inconnue";

  // Aggregate quality from sources
  const qualityScores = sources.map((s) => s.qualityScore).filter(Number.isFinite);
  const qualityScore =
    qualityScores.length > 0
      ? Math.round(qualityScores.reduce((a, b) => a + b, 0) / qualityScores.length)
      : 0;

  // Determine evidence tag
  const evidenceTag =
    status === KPI_STATUS.VERIFIED
      ? "FAIT"
      : status === KPI_STATUS.AVAILABLE
        ? "CALCUL"
        : status === KPI_STATUS.ESTIMATED
          ? "INFÉRENCE"
          : status === KPI_STATUS.CONDITIONAL
            ? "CALCUL"
            : "HYPOTHÈSE";

  // Warnings
  const warnings = [];
  if (qualityScore < 60) {
    warnings.push(`Qualité des données sources faible (${qualityScore}%).`);
  }
  if (sources.some((s) => s.recordCount === 0)) {
    warnings.push("Certaines sources ne contiennent aucun enregistrement.");
  }
  if (status === KPI_STATUS.ESTIMATED) {
    warnings.push("Valeur estimée — données incomplètes.");
  }
  if (status === KPI_STATUS.CONDITIONAL) {
    warnings.push("Données optionnelles manquantes — résultat partiel.");
  }

  return Object.freeze({
    kpiKey,
    name,
    value,
    unit,
    sources,
    formula,
    formulaCode,
    period,
    qualityScore,
    status,
    evidenceTag,
    warnings,
    methodology,
  });
}

/**
 * Build a lineage source reference.
 *
 * @param {Object} params
 * @param {string} params.entity
 * @param {string} params.field
 * @param {string} params.canonicalKey
 * @param {Array} params.records — The actual records (used to count and find date range)
 * @param {string} [params.dateField] — Field to use for period detection
 * @param {number} [params.qualityScore] — Pre-computed quality score
 * @returns {LineageSource}
 */
export function buildLineageSource({
  entity,
  field,
  canonicalKey,
  records = [],
  dateField = "date",
  qualityScore = 100,
}) {
  const dates = records
    .map((r) => r[dateField])
    .filter(Boolean)
    .map((d) => new Date(d))
    .filter((d) => !isNaN(d.getTime()))
    .sort((a, b) => a - b);

  return {
    entity,
    field,
    canonicalKey,
    recordCount: records.length,
    periodStart: dates.length > 0 ? dates[0].toISOString().slice(0, 10) : null,
    periodEnd:
      dates.length > 0
        ? dates[dates.length - 1].toISOString().slice(0, 10)
        : null,
    qualityScore,
  };
}

/**
 * Format a lineage for display (human-readable French explanation).
 *
 * @param {KpiLineage} lineage
 * @returns {string}
 */
export function formatLineage(lineage) {
  if (!lineage) return "Traçabilité non disponible.";

  const lines = [];
  lines.push(`${lineage.name} : ${lineage.value} ${lineage.unit || ""}`);
  lines.push("");
  lines.push("Sources :");
  for (const src of lineage.sources) {
    lines.push(
      `  • ${src.entity}.${src.field} — ${src.recordCount} enregistrements (${src.periodStart || "?"} → ${src.periodEnd || "?"})`
    );
  }
  lines.push("");
  lines.push(`Calcul : ${lineage.formula}`);
  lines.push(`Période : ${lineage.period}`);
  lines.push(`Qualité : ${lineage.qualityScore}%`);
  lines.push(`Statut : [${lineage.evidenceTag}]`);

  if (lineage.methodology) {
    lines.push("");
    lines.push(`Méthodologie : ${lineage.methodology}`);
  }

  if (lineage.warnings.length > 0) {
    lines.push("");
    lines.push("Avertissements :");
    for (const w of lineage.warnings) {
      lines.push(`  ⚠ ${w}`);
    }
  }

  return lines.join("\n");
}

/**
 * Build lineage objects for a batch of KPI results.
 *
 * @param {Array<{ kpiKey, name, value, unit, formula, sources, status }>} kpiResults
 * @returns {Map<string, KpiLineage>}
 */
export function buildBatchLineage(kpiResults) {
  const lineageMap = new Map();
  for (const result of kpiResults) {
    lineageMap.set(result.kpiKey, buildKpiLineage(result));
  }
  return lineageMap;
}
