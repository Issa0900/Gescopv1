// ─────────────────────────────────────────────────────────────────────────────
// GESCOP Data Intelligence Core - KPI Execution Engine
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
import { resolveContextualField } from "./entityFieldMap";
import { KPI_STATUS, ECONOMIC_ROLES, AGGREGATION_METHODS, TEMPORAL_TYPES } from "./semanticTypes";

/**
 * Execute calculation for a specific KPI or measure over a dataset.
 *
 * @param {Object} params
 * @param {string} params.kpiId - The canonical key of the KPI
 * @param {Array<Object>} params.records - The raw data records
 * @param {Map<string, Object>} params.fieldSemantics - Resolved semantics for the records
 * @param {Object} [params.context={}] - Pre-computed dependencies or context variables
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

  // Many KPIs here list several ALTERNATIVE raw-field dependencies for the
  // same concept (e.g. total_revenue tries "revenue", "income_amount" AND
  // "transaction_amount" — whichever one the dataset actually has), and
  // their calculate() functions are written for that: `deps.a || deps.b`.
  // The status propagation below used to treat every dependency as
  // mandatory (AND): the FIRST one that came back UNAVAILABLE forced the
  // whole KPI to UNAVAILABLE, so calculate() never even ran, no matter how
  // many of the other alternatives had real data. A Transaction-only
  // dataset has no "revenue" or "cogs" field by that name, so total_revenue
  // and gross_margin_amount read as permanently unavailable even with
  // transactions actually present. Only "every single dependency failed"
  // should block calculate() outright (nothing at all to compute from); one
  // missing among several resolves to CONDITIONAL instead, matching the
  // status's own documented meaning ("some optional data missing - result
  // is valid but incomplete") and letting calculate() apply the per-field
  // fallbacks it was already written with.
  let anyDepUnavailable = false;
  let anyDepResolved = kpiDef.dependencies.length === 0;

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
        anyDepUnavailable = true;
      } else {
        anyDepResolved = true;
        if (depResult.status === KPI_STATUS.CONDITIONAL && status === KPI_STATUS.AVAILABLE) {
          status = KPI_STATUS.CONDITIONAL;
        }
      }
    } else {
      anyDepResolved = true;
    }
  }
  if (!anyDepResolved) {
    status = KPI_STATUS.UNAVAILABLE;
  } else if (anyDepUnavailable && status === KPI_STATUS.AVAILABLE) {
    status = KPI_STATUS.CONDITIONAL;
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
  const lineage = buildKpiLineage({
    kpiKey: kpiId,
    name: kpiDef.name.fr,
    value,
    unit: kpiDef.dataType,
    formula: `kpiRegistry.${kpiId}.calculate()`,
    sources: uniqueSources,
    status,
  });

  // Trace Debug (Exigence 9)
  if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
    console.debug(`[KPI DEBUG] ${kpiDef.name.fr}`, {
      kpi: kpiId,
      start_date: context.start_date,
      end_date: context.end_date,
      period_days: context.period_days,
      formula: lineage.formula,
      inputs: resolvedDeps
    });
  }

  return lineage;
}

/**
 * Determine la période couverte par les données (start_date, end_date, period_days)
 */
function determineTemporalContext(records) {
  let minDate = null;
  let maxDate = null;
  
  for (const r of records) {
    const dStr = r.date || r.created_at || r.acquisition_date;
    if (dStr && typeof dStr === 'string' && dStr.match(/^\d{4}-\d{2}-\d{2}/)) {
      const d = new Date(dStr.slice(0, 10));
      if (!isNaN(d.valueOf())) {
        if (!minDate || d < minDate) minDate = d;
        if (!maxDate || d > maxDate) maxDate = d;
      }
    }
  }
  
  if (minDate && maxDate) {
    const diffTime = Math.abs(maxDate - minDate);
    // Inclusif : +1 jour pour éviter la division par zéro si un seul jour de données
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    return {
      start_date: minDate.toISOString().slice(0, 10),
      end_date: maxDate.toISOString().slice(0, 10),
      period_days: diffDays
    };
  }
  
  return {};
}

/**
 * Compute multiple KPIs in dependency order
 * 
 * @param {string[]} kpiIds 
 * @param {Array<Object>} records 
 * @param {Map<string, Object>} fieldSemantics 
 * @returns {Map<string, import("./dataLineage").KpiLineage>}
 */
export function computeKpiBatch(kpiIds, records, fieldSemantics) {
  const orderedIds = sortKpisTopologically(kpiIds);
  // Injection de la temporalité et des données brutes (Phase 3 SSOT)
  const context = determineTemporalContext(records);
  context._records = records; // Permet aux KPI complexes de filtrer sémantiquement
  context._semantics = fieldSemantics;

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
  // --- NOUVEAU DATA CORE (PHASE 2) ---
  // Si le jeu de données contient des Observations, on utilise directement la valeur stockée
  // sans avoir besoin du vieux mappage de colonnes (fieldSemantics).
  if (records && records.length > 0 && records[0].observation_type) {
    const matchingObs = records.filter(r => 
      r.concept === canonicalKey || r.concept === `finance.${canonicalKey}` || r.concept === `customer.${canonicalKey}`
    );
    
    if (matchingObs.length > 0) {
      const sum = matchingObs.reduce((acc, obs) => acc + (obs.value || 0), 0);
      
      return buildKpiLineage({
        kpiKey: canonicalKey,
        name: canonicalKey,
        value: sum,
        unit: matchingObs[0].unit || null,
        formula: "Agrégation d'Observations Sémantiques",
        sources: [{ entity: "Observation", field: "value", canonicalKey, records: matchingObs.length, qualityScore: matchingObs[0].confidence ? matchingObs[0].confidence * 100 : 100 }],
        status: 1 // KPI_STATUS.AVAILABLE
      });
    }
  }

  // --- ANCIEN SYSTEME (Rétrocompatibilité) ---
  // Find the field in the records that matches this canonicalKey
  let targetField = null;
  let targetSemantic = null;
  // Records this field actually applies to. Equal to `records` unless a
  // contextual fallback below narrows it (see next block).
  let targetRecords = records;

  for (const [fieldName, fs] of (fieldSemantics || new Map()).entries()) {
    if (fs.canonicalKey === canonicalKey) {
      targetField = fieldName;
      targetSemantic = fs;
      break;
    }
  }

  // Fallback: a contextual field (e.g. Transaction.amount is "income_amount"
  // or "expense_amount" depending on its own `type`) was resolved to ONE
  // default canonicalKey for the whole batch, because getEntitySemantics is
  // called once with no representative record — a single row can't stand in
  // for a whole file that mixes income and expense. Match it here instead,
  // per record, using the same context rules getFieldSemantic carries on
  // the semantic object (see entityFieldMap.js). Without this, "revenue"
  // and "expense" for Transaction-only data were both permanently
  // unavailable, and the single resolved fallback key ("transaction_amount")
  // silently summed income and expense together under the wrong metric.
  if (!targetField) {
    for (const [fieldName, fs] of (fieldSemantics || new Map()).entries()) {
      const rule = (fs.contextRules || []).find((r) => r.then.canonicalKey === canonicalKey);
      if (!rule) continue;
      const matches = records.filter((r) => resolveContextualField({ contextRules: fs.contextRules }, r).canonicalKey === canonicalKey);
      if (matches.length === 0) continue;
      targetField = fieldName;
      targetSemantic = { ...fs, canonicalKey, semanticType: rule.then.semanticType };
      targetRecords = matches;
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
  const quality = computeFieldQuality(targetRecords, targetField, targetSemantic);
  const qualityCheck = isQualitySufficient(quality);

  const source = buildLineageSource({
    entity: targetSemantic.source || "Inconnu",
    field: targetField,
    canonicalKey,
    records: targetRecords,
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

  // GESCOP Phase 3 : Validation Sémantique SSOT avant calcul
  const validValues = targetRecords
    .filter(r => {
      // Filtrage sémantique SSOT basé sur le statut et l'entité
      if (targetSemantic.source === "Order") {
        // Utilisation d'un helper rudimentaire ici si on ne peut pas l'importer en haut, 
        // mais le mieux est de vérifier le status directement.
        const st = String(r.status || r.payment_status || r.fulfillment_status || "").toLowerCase();
        if (st.includes("annul") || st.includes("cancel") || st.includes("void") || st.includes("brouillon") || st.includes("draft") || st.includes("rembours")) {
           return false;
        }
      } else if (targetSemantic.source === "Transaction") {
        const st = String(r.status || "").toLowerCase();
        if (st.includes("attente") || st.includes("pending") || st.includes("annul") || st.includes("draft")) {
           return false;
        }
      }
      return true;
    })
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

