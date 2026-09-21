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
  /** @type {import("./semanticTypes").KpiStatus} */
  let status = KPI_STATUS.MEASURED;

  let unavailableDeps = 0;
  for (const depId of kpiDef.dependencies) {
    if (resolvedDeps[depId] === undefined) {
      // Need to compute this dependency
      const depResult = computeKpi({ kpiId: depId, records, fieldSemantics, context: resolvedDeps });

      resolvedDeps[depId] = depResult.value;

      // Merge sources and quality
      lineageSources.push(...depResult.sources);
      lowestQuality = Math.min(lowestQuality, depResult.qualityScore);

      // Propagate status
      if (depResult.status === KPI_STATUS.NOT_MEASURED) {
        unavailableDeps += 1;
      } else if (depResult.status === KPI_STATUS.UNKNOWN && status === KPI_STATUS.MEASURED) {
        status = KPI_STATUS.UNKNOWN;
      }
    }
  }
  // A KPI is only NOT_MEASURED when EVERY dependency is. Many KPIs list several
  // alternative sources for the same figure (e.g. total_revenue accepts
  // income_amount OR transaction_amount) and their calculate() fn already
  // handles a missing one via `deps.x || 0` - blocking calculate() the moment
  // any single alternative is missing skipped that fallback entirely and
  // silently produced a fake 0 (e.g. Finance page showing "0 $" of revenue
  // while transaction_amount had the real, available total).
  if (kpiDef.dependencies.length > 0 && unavailableDeps === kpiDef.dependencies.length) {
    status = KPI_STATUS.NOT_MEASURED;
  } else if (unavailableDeps > 0 && status === KPI_STATUS.MEASURED) {
    status = KPI_STATUS.UNKNOWN;
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
  if (status !== KPI_STATUS.NOT_MEASURED) {
    try {
      value = kpiDef.calculate(resolvedDeps);
      if (!Number.isFinite(value) && value !== null) {
        status = KPI_STATUS.INVALID;
        value = null;
      } else if (value === 0 && status === KPI_STATUS.MEASURED) {
        status = KPI_STATUS.VALID_ZERO;
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
    const diffTime = Math.abs(maxDate.getTime() - minDate.getTime());
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
  // Note: les Observations sont mélangées avec d'autres entités dans le tableau `records`
  // (voir useKpiEngine), donc on ne peut pas se fier à records[0] pour les détecter.
  if (records && records.some(r => r && r.observation_type)) {
    const matchingObs = records.filter(r =>
      r.observation_type && (
        r.concept === canonicalKey || r.concept === `finance.${canonicalKey}` || r.concept === `customer.${canonicalKey}`
      )
    );
    
    if (matchingObs.length > 0) {
      const sum = matchingObs.reduce((acc, obs) => acc + (obs.value || 0), 0);
      
      return buildKpiLineage({
        kpiKey: canonicalKey,
        name: canonicalKey,
        value: sum,
        unit: matchingObs[0].unit || null,
        formula: "Agrégation d'Observations Sémantiques",
        sources: [buildLineageSource({
          entity: "Observation",
          field: "value",
          canonicalKey,
          records: matchingObs,
          qualityScore: matchingObs[0].confidence ? matchingObs[0].confidence * 100 : 100,
        })],
        status: sum === 0 ? KPI_STATUS.VALID_ZERO : KPI_STATUS.MEASURED
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

  // More than one raw field can legitimately map to the same canonicalKey
  // (e.g. Order.total and Order.total_revenue both mean "revenue" - two
  // header spellings the source file might use, only one of which a given
  // import actually populated). Picking the first declared match regardless
  // of whether it has data in THIS batch silently read as null/NOT_MEASURED
  // whenever the populated field happened not to be the first one declared,
  // even though a real, already-computed number sat in the other field. Scan
  // every candidate and prefer the first one that actually has a value on at
  // least one record, falling back to the first declared candidate (for a
  // sane field name in the "nothing matched" lineage) when none do.
  let firstCandidate = null;
  for (const fs of (fieldSemantics || new Map()).values()) {
    if (fs.canonicalKey !== canonicalKey) continue;
    // The map key may be namespaced by entity (e.g. "Transaction:amount")
    // to avoid two entities' same-named fields colliding - the semantic's
    // own `.field` is always the real property name on the record.
    if (!firstCandidate) firstCandidate = fs;
    const hasData = records.some((r) => {
      if (r._entity !== undefined && r._entity !== fs.source) return false;
      const v = r[fs.field];
      return v !== undefined && v !== null && v !== "";
    });
    if (hasData) { targetField = fs.field; targetSemantic = fs; break; }
  }
  if (!targetField && firstCandidate) { targetField = firstCandidate.field; targetSemantic = firstCandidate; }

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
    for (const fs of (fieldSemantics || new Map()).values()) {
      const rule = (fs.contextRules || []).find((r) => r.then.canonicalKey === canonicalKey);
      if (!rule) continue;
      // Scope the match to this field's own entity first: two entities can
      // carry the same contextRules-bearing field name (e.g. a future
      // second "amount" column), and matching across all records here,
      // before the entity filter downstream, would let one entity's rows
      // decide whether the OTHER entity's field is even considered.
      const candidates = records.filter((r) => r._entity === undefined || r._entity === fs.source);
      const matches = candidates.filter((r) => resolveContextualField({ contextRules: fs.contextRules }, r).canonicalKey === canonicalKey);
      if (matches.length === 0) continue;
      // The map key can be entity-namespaced ("Transaction:amount"); the
      // real record property is always fs.field, same as the exact-match
      // loop above it. Using the map key here (fieldName) instead of
      // fs.field made every downstream `r[targetField]` read undefined the
      // moment two or more entities were combined (useKpiEngine always
      // namespaces), so income_amount/expense_amount resolved to null and
      // total_revenue/total_expense silently fell back to the context-blind
      // transaction_amount, summing income and expense together.
      targetField = fs.field;
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
      status: KPI_STATUS.NOT_MEASURED
    });
  }

  // Restrict to rows from the entity this field actually belongs to, on top
  // of the contextual narrowing above (targetRecords), not instead of it:
  // without this, two entities sharing a raw field name (Transaction and
  // Expense both have "amount") got their quality score, lineage record
  // count and aggregated value all computed over BOTH entities' rows
  // combined the moment records from both were passed into the same batch;
  // without keeping targetRecords as the base, this alone would also have
  // silently reintroduced the income/expense mixing the contextual fallback
  // above exists to prevent. Untagged rows (single-entity callers that
  // predate this tag) are kept as-is.
  const recordsForEntity = targetRecords.filter(
    (r) => r._entity === undefined || r._entity === targetSemantic.source
  );

  // Quality check
  const quality = computeFieldQuality(recordsForEntity, targetField, targetSemantic);
  const qualityCheck = isQualitySufficient(quality);

  const source = buildLineageSource({
    entity: targetSemantic.source || "Inconnu",
    field: targetField,
    canonicalKey,
    records: recordsForEntity,
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
      status: KPI_STATUS.NOT_MEASURED
    });
  }

  // Aggregate
  const method = getAggregationMethod(targetSemantic, "period_total");
  let value = null;

  // GESCOP Phase 3 : Validation Sémantique SSOT avant calcul
  const filteredRecords = recordsForEntity.filter(r => {
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
    });

  // "Last" must mean chronologically last, not last-in-input-order: callers
  // fetch records sorted various ways (a page fetching "-date" for a table
  // put the newest row first, so picking array-index -1 silently returned
  // the OLDEST balance instead of the current one).
  let validValues;
  if (method === AGGREGATION_METHODS.LAST) {
    const dated = filteredRecords
      .map(r => ({ date: r.date || r.acquisition_date || r.period || null, value: Number(r[targetField]) }))
      .filter(x => Number.isFinite(x.value));
    const withDate = dated.filter(x => x.date);
    if (withDate.length > 0) {
      withDate.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
      validValues = withDate.map(x => x.value);
    } else {
      // No date field to sort by - fall back to input order as before.
      validValues = dated.map(x => x.value);
    }
  } else {
    validValues = filteredRecords
      .map(r => Number(r[targetField]))
      .filter(n => Number.isFinite(n));
  }

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
    status: value === 0 ? KPI_STATUS.VALID_ZERO : KPI_STATUS.MEASURED
  });
}

