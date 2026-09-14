// ─────────────────────────────────────────────────────────────────────────────
// GESCOP Data Intelligence Core — KPI Semantic Validator
// ─────────────────────────────────────────────────────────────────────────────
//
// Validates that a KPI or a set of KPIs can be safely computed and displayed.
// This is the semantic firewall that runs before sending data to the UI.
// ─────────────────────────────────────────────────────────────────────────────

import { getKpiDefinition, resolveKpiDependencies } from "./kpiRegistry";
import { findEntitiesByCanonicalKey } from "./entityFieldMap";
import { canDeriveKpi } from "./relationGraph";
import { KPI_STATUS } from "./semanticTypes";

/**
 * Validates if a specific KPI can be calculated given a list of available entities.
 * 
 * @param {string} kpiId — Canonical KPI key
 * @param {string[]} availableEntities — List of entities we have data for
 * @returns {Object} Validation result
 */
export function validateKpiComputability(kpiId, availableEntities) {
  const kpiDef = getKpiDefinition(kpiId);
  if (!kpiDef) {
    return {
      canCompute: false,
      reason: `KPI non reconnu : ${kpiId}`,
      missingDependencies: [],
      paths: []
    };
  }

  // Get flat list of all base canonical keys needed (e.g. ['revenue', 'cogs'])
  const requiredKeys = resolveKpiDependencies(kpiId);
  
  const requiredEntities = new Set();
  const missingKeys = [];

  // Map each required key to the entities that can provide it
  for (const key of requiredKeys) {
    const providers = findEntitiesByCanonicalKey(key);
    
    if (providers.length === 0) {
      missingKeys.push(key);
      continue;
    }

    // Check if any of the providers are in our available entities
    const hasProvider = providers.some(p => availableEntities.includes(p.entity));
    
    if (!hasProvider) {
      // We need at least one of these provider entities
      // For simplicity in the message, we just list the first one
      requiredEntities.add(providers[0].entity);
    }
  }

  if (missingKeys.length > 0) {
    return {
      canCompute: false,
      reason: `Clés sémantiques manquantes dans le dictionnaire : ${missingKeys.join(", ")}`,
      missingDependencies: missingKeys,
      paths: []
    };
  }

  // Use the relation graph to see if we can derive the missing entities
  const graphCheck = canDeriveKpi(Array.from(requiredEntities), availableEntities);

  if (graphCheck.possible) {
    return {
      canCompute: true,
      reason: "Toutes les dépendances sont satisfaites (directement ou par dérivation).",
      missingDependencies: [],
      paths: graphCheck.paths
    };
  } else {
    return {
      canCompute: false,
      reason: `Entités requises manquantes : ${graphCheck.missingEntities.join(", ")}`,
      missingDependencies: graphCheck.missingEntities,
      paths: graphCheck.paths
    };
  }
}

/**
 * Filter a list of KPIs, returning only those that can be safely computed.
 * 
 * @param {string[]} kpiIds 
 * @param {string[]} availableEntities 
 * @returns {{ computable: string[], uncomputable: Object }}
 */
export function filterComputableKpis(kpiIds, availableEntities) {
  const computable = [];
  const uncomputable = {};

  for (const id of kpiIds) {
    const check = validateKpiComputability(id, availableEntities);
    if (check.canCompute) {
      computable.push(id);
    } else {
      uncomputable[id] = check;
    }
  }

  return { computable, uncomputable };
}

/**
 * Verify if the lineage result of a KPI is trustworthy enough for display.
 * 
 * @param {import("./dataLineage").KpiLineage} kpiLineage 
 * @param {number} [qualityThreshold=60] 
 * @returns {{ displaySafe: boolean, warnings: string[], cssClass: string }}
 */
export function validateKpiForDisplay(kpiLineage, qualityThreshold = 60) {
  if (!kpiLineage) {
    return { displaySafe: false, warnings: ["Aucune donnée de lignage"], cssClass: "kpi-unavailable" };
  }

  if (kpiLineage.status === KPI_STATUS.UNAVAILABLE || kpiLineage.status === KPI_STATUS.INVALID) {
    return { 
      displaySafe: false, 
      warnings: ["Calcul impossible ou invalide"], 
      cssClass: "kpi-unavailable" 
    };
  }

  const warnings = [...(kpiLineage.warnings || [])];
  let cssClass = "kpi-safe";

  if (kpiLineage.qualityScore < qualityThreshold) {
    warnings.push(`Qualité des données faible (${kpiLineage.qualityScore}/100)`);
    cssClass = "kpi-warning";
  }

  if (kpiLineage.status === KPI_STATUS.ESTIMATED) {
    warnings.push("Valeur estimée, à utiliser avec précaution");
    cssClass = "kpi-warning";
  }

  if (kpiLineage.status === KPI_STATUS.REVIEW) {
    warnings.push("En attente de validation manuelle");
    cssClass = "kpi-warning";
  }

  return {
    displaySafe: true, // Even with warnings, it's safe to display if it has a value
    warnings,
    cssClass
  };
}

