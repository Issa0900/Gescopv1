// ─────────────────────────────────────────────────────────────────────────────
// GESCOP Data Intelligence Core — KPI Execution Engine
// ─────────────────────────────────────────────────────────────────────────────
//
// Calculates KPIs by evaluating their dependencies, aggregating raw data
// securely (preventing invalid FLOW/STOCK additions), and generating
// traceability lineage.
// ─────────────────────────────────────────────────────────────────────────────

import { getKpiDefinition, sortKpisTopologically } from "./kpiRegistry";
import { buildKpiLineage, buildLineageSource } from "./dataLineage";
import { computeFieldQuality, isQualitySufficient } from "./dataQualityEngine";
import { getAggregationMethod } from "./fieldSemantic";
import { KPI_STATUS, ECONOMIC_ROLES, AGGREGATION_METHODS, TEMPORAL_TYPES } from "./semanticTypes";

/**
 * Execute calculation for a specific KPI or measure over a dataset.
 *
 * @param {Object} params
 * @param {string} params.kpiId — The canonical key of the KPI
 * @param {Array<Object>} params.records — The raw data records
 * @param {Map<string, Object>} params.fieldSemantics — Resolved semantics for the records
 * @param {Object} [params.context={}] — Pre-computed dependencies or context variables
 * @returns {import("./dataLineage").KpiLineage} The calculated KPI with its lineage
 */
export function computeKpi({ kpiId, records, fieldSemantics, context = {} }) {
  const kpiDef = getKpiDefinition(kpiId);
  
  if (!kpiDef) {
    // If it's not a registered KPI, assume it's a raw field we just need to aggregate
    return _aggregateRawField(kpiId, records, fieldSemantics);
  }

  // 1. Resolve and calculate dependencies
  const resolvedDeps = { ...context };
  const lineageSources = [];
  let lowestQuality = 100;
  let status = KPI_STATUS.AVAILABLE;

  for (const depId of kpiDef.dependencies) {
    if (resolvedDeps[depId] === undefined) {
      // Need to compute this dependency
      const depResult = computeKpi({ kpiId: depId, records, fieldSemantics, context: resolvedDeps });
      
      resolvedDeps[depId] = depResult.value;
      
      // Merge sources and quality
      lineageSources.push(...depResult.sources);
      lowestQuality = Math.min(lowestQuality, depResult.qualityScore);
      
      // Propagate status
      if (depResult.status === KPI_STATUS.UNAVAILABLE) {
        status = KPI_STATUS.UNAVAILABLE;
      } else if (depResult.status === KPI_STATUS.CONDITIONAL && status === KPI_STATUS.AVAILABLE) {
        status = KPI_STATUS.CONDITIONAL;
      }
    }
  }

  // Deduplicate sources
  const uniqueSources = [];
  const sourceKeys = new Set();
  for (const src of lineageSources) {
    const key = `${src.entity}.${src.field}`;
    if (!sourceKeys.has(key)) {
      sourceKeys.add(key);
      uniqueSources.push(src);
    }
  }

  // 2. Execute calculation
  let value = null;
  if (status !== KPI_STATUS.UNAVAILABLE) {
    try {
      value = kpiDef.calculate(resolvedDeps);
      if (!Number.isFinite(value) && value !== null) {
        status = KPI_STATUS.INVALID;
        value = null;
      }
    } catch (e) {
      status = KPI_STATUS.INVALID;
      console.error(`Error calculating KPI ${kpiId}:`, e);
    }
  }

  // 3. Build lineage
  return buildKpiLineage({
    kpiKey: kpiId,
    name: kpiDef.name.fr,
    value,
    unit: kpiDef.dataType,
    formula: `kpiRegistry.${kpiId}.calculate()`,
    sources: uniqueSources,
    status,
    // Add custom warnings logic if needed
  });
}

/**
 * Compute multiple KPIs efficiently by resolving dependencies in the right order.
 *
 * @param {string[]} kpiIds 
 * @param {Array<Object>} records 
 * @param {Map<string, Object>} fieldSemantics 
 * @returns {Map<string, import("./dataLineage").KpiLineage>}
 */
export function computeKpiBatch(kpiIds, records, fieldSemantics) {
  const orderedIds = sortKpisTopologically(kpiIds);
  const context = {};
  const results = new Map();

  for (const id of orderedIds) {
    const result = computeKpi({ kpiId: id, records, fieldSemantics, context });
    context[id] = result.value;
    
    // Only return the ones explicitly requested
    if (kpiIds.includes(id)) {
      results.set(id, result);
    }
  }

  return results;
}

// ─────────────────────────────────────────────────────────────────────────────
// INTERNAL HELPERS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Aggregates a raw field based on its semantic rules.
 * This is the ultimate defense against summing stocks.
 */
function _aggregateRawField(canonicalKey, records, fieldSemantics) {
  // Find the field in the records that matches this canonicalKey
  let targetField = null;
  let targetSemantic = null;

  for (const [fieldName, fs] of fieldSemantics.entries()) {
    if (fs.canonicalKey === canonicalKey) {
      targetField = fieldName;
      targetSemantic = fs;
      break;
    }
  }

  if (!targetField) {
    return buildKpiLineage({
      kpiKey: canonicalKey,
      name: canonicalKey,
      value: null,
      unit: null,
      formula: "Source manquante",
      sources: [],
      status: KPI_STATUS.UNAVAILABLE
    });
  }

  // Quality check
  const quality = computeFieldQuality(records, targetField, targetSemantic);
  const qualityCheck = isQualitySufficient(quality);

  const source = buildLineageSource({
    entity: targetSemantic.source || "Inconnu",
    field: targetField,
    canonicalKey,
    records,
    qualityScore: quality.global
  });

  if (!qualityCheck.sufficient) {
    return buildKpiLineage({
      kpiKey: canonicalKey,
      name: targetSemantic.label?.fr || targetField,
      value: null,
      unit: targetSemantic.dataType,
      formula: `Agrégation de ${targetField}`,
      sources: [source],
      status: KPI_STATUS.UNAVAILABLE
    });
  }

  // Aggregate
  const method = getAggregationMethod(targetSemantic, "period_total");
  let value = null;
  
  const validValues = records
    .map(r => Number(r[targetField]))
    .filter(n => Number.isFinite(n));

  if (validValues.length > 0) {
    switch (method) {
      case AGGREGATION_METHODS.SUM:
        // Double check temporal type before summing
        if (targetSemantic.temporalType === TEMPORAL_TYPES.STOCK) {
          throw new Error(`CRITICAL: Attempted to SUM a STOCK variable (${canonicalKey})`);
        }
        value = validValues.reduce((a, b) => a + b, 0);
        break;
      case AGGREGATION_METHODS.AVG:
        value = validValues.reduce((a, b) => a + b, 0) / validValues.length;
        break;
      case AGGREGATION_METHODS.LAST:
        // Use the value from the chronologically last record
        // Assuming records are already sorted chronologically by the caller
        value = validValues[validValues.length - 1];
        break;
      case AGGREGATION_METHODS.MIN:
        value = Math.min(...validValues);
        break;
      case AGGREGATION_METHODS.MAX:
        value = Math.max(...validValues);
        break;
      default:
        value = validValues[0];
    }
  }

  return buildKpiLineage({
    kpiKey: canonicalKey,
    name: targetSemantic.label?.fr || targetField,
    value,
    unit: targetSemantic.dataType,
    formula: `Agrégation (${method}) de ${targetField}`,
    sources: [source],
    status: KPI_STATUS.AVAILABLE
  });
}

