// ─────────────────────────────────────────────────────────────────────────────
// GESCOP Data Intelligence Core — Chart Validator
// ─────────────────────────────────────────────────────────────────────────────
//
// Validates whether a specific set of KPIs/fields can be visualized together
// in a specific chart type. This implements the "Ultimate Test" of the architecture.
// ─────────────────────────────────────────────────────────────────────────────

import { validateComposition, validateChartType } from "./compatibilityEngine";
import { getKpiDefinition } from "./kpiRegistry";
import { getSemanticType } from "./semanticTypes";

/**
 * Validates a chart configuration before rendering.
 * 
 * @param {Object} params
 * @param {string} params.chartType — 'composition' (pie, stacked), 'comparison' (bar, line), etc.
 * @param {string[]} params.kpiIds — The IDs of the KPIs or measures to plot
 * @param {Map<string, Object>} params.fieldSemantics — Resolved semantics, if plotting raw fields
 * @returns {Object} Validation result with { valid, reason, suggestion }
 */
export function validateChartConfig({ chartType, kpiIds = [], fieldSemantics = new Map() }) {
  if (kpiIds.length === 0 && fieldSemantics.size === 0) {
    return { valid: false, reason: "Aucune donnée sélectionnée pour le graphique.", suggestion: null };
  }

  // 1. Gather all semantics to validate
  const semanticsToValidate = [];

  // Add registered KPIs
  for (const id of kpiIds) {
    const def = getKpiDefinition(id);
    if (def) {
      // Build a pseudo-FieldSemantic for the KPI so the compatibility engine can read it
      semanticsToValidate.push({
        field: id,
        label: def.name,
        semanticType: def.semanticType,
        economicRole: def.economicRole,
        dataType: def.dataType,
        isAdditive: def.isAdditive,
        isComparable: true, // Registered KPIs are comparable by default
        temporalType: getSemanticType(def.semanticType)?.temporalType || 'flow',
        unit: def.dataType
      });
    }
  }

  // Add raw fields if passed
  for (const [, fs] of fieldSemantics.entries()) {
    semanticsToValidate.push(fs);
  }

  if (semanticsToValidate.length < 2 && chartType === 'composition') {
    return { 
      valid: false, 
      reason: "Une composition nécessite au moins deux indicateurs.", 
      suggestion: "Ajoutez un indicateur ou utilisez un graphique simple." 
    };
  }

  // 2. The Ultimate Test: If it's a composition, use the strict validation
  if (chartType === 'composition' || chartType === 'stacked' || chartType === 'pie') {
    const compCheck = validateComposition(semanticsToValidate);
    
    // THIS is where the CA + AR + AP + Dépenses gets BLOCKED
    if (!compCheck.valid) {
      return {
        valid: false,
        reason: compCheck.reason,
        suggestion: compCheck.suggestion,
        // The engine provides a human readable string like:
        // "Composition indisponible : les mesures sélectionnées mélangent flux et soldes..."
        errorMessage: `Graphique bloqué : ${compCheck.reason}`,
        groups: compCheck.groups
      };
    }
  }

  // 3. General chart type validation (for comparisons, trends, etc.)
  return validateChartType(chartType, semanticsToValidate);
}

/**
 * Filter a list of potential metrics to only return those compatible with the 
 * currently selected metrics in a chart.
 * 
 * @param {string[]} availableMetricIds
 * @param {string[]} selectedMetricIds 
 * @param {string} chartType 
 * @returns {string[]} Allowed metric IDs
 */
export function getCompatibleMetricsForChart(availableMetricIds, selectedMetricIds, chartType) {
  if (selectedMetricIds.length === 0) return availableMetricIds;

  const allowed = [];

  for (const candidateId of availableMetricIds) {
    if (selectedMetricIds.includes(candidateId)) continue;

    const testSet = [...selectedMetricIds, candidateId];
    const check = validateChartConfig({ chartType, kpiIds: testSet });

    if (check.valid) {
      allowed.push(candidateId);
    }
  }

  return allowed;
}

