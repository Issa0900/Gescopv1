/**
 * @fileoverview Compatibility Engine for GESCOP Data Intelligence Core.
 * Verifies that sets of data fields can be validly combined in charts, calculations, and compositions.
 * Implements the core business logic to prevent mixing incompatible concepts (e.g., FLOW and STOCK).
 */

import {
  ECONOMIC_ROLES,
  TEMPORAL_TYPES,
  ADDITIVE_COMPATIBILITY,
  COMPARISON_COMPATIBILITY
} from './semanticTypes';

import {
  areFieldsAdditive,
  areFieldsComparable,
  canComposeChart
} from './fieldSemantic';

/**
 * Validates if an array of fields can form a valid composition chart.
 * Adds rich error messaging and grouping logic beyond basic compatibility.
 * 
 * @param {Array<Object>} fieldSemantics - Array of field semantics objects.
 * @returns {{ valid: boolean, reason: string|null, suggestion: string|null, groups: object|null }}
 */
export function validateComposition(fieldSemantics) {
  if (!fieldSemantics || fieldSemantics.length === 0) {
    return { valid: false, reason: 'Aucun champ fourni', suggestion: 'Sélectionnez des champs à composer.', groups: null };
  }
  
  if (fieldSemantics.length === 1) {
    return { valid: true, reason: null, suggestion: null, groups: _groupFields(fieldSemantics) };
  }

  // Use the fieldSemantic's logic which handles pair-wise check
  const compositionCheck = canComposeChart(fieldSemantics);
  
  if (compositionCheck.valid) {
    return { valid: true, reason: null, suggestion: null, groups: _groupFields(fieldSemantics) };
  }

  // Not composable. Identify the reason.
  // Group fields to provide detailed reasoning.
  const groups = _groupFields(fieldSemantics);
  
  // Rates/Ratios check
  const rates = fieldSemantics.filter(f => f.economicRole === ECONOMIC_ROLES.RATE || f.economicRole === ECONOMIC_ROLES.RATIO);
  if (rates.length > 0) {
    return {
      valid: false,
      reason: 'Les taux et ratios ne peuvent pas être sommés dans une composition.',
      suggestion: 'Utilisez un graphique de comparaison ou affichez les taux sur un axe secondaire.',
      groups
    };
  }

  // Temporal type conflict
  const flowFields = fieldSemantics.filter(f => f.temporalType === TEMPORAL_TYPES.FLOW);
  const stockFields = fieldSemantics.filter(f => f.temporalType === TEMPORAL_TYPES.STOCK || f.economicRole === ECONOMIC_ROLES.BALANCE);
  
  if (flowFields.length > 0 && stockFields.length > 0) {
    return {
      valid: false,
      reason: 'Mélange de flux (cumulables) et de soldes (valeurs ponctuelles).',
      suggestion: 'Séparez les flux et les soldes dans deux graphiques distincts.',
      groups
    };
  }
  
  // Base reason if none of the specific ones above matched perfectly
  return {
    valid: false,
    reason: 'Les champs sélectionnés ne sont pas compatibles pour une composition.',
    suggestion: 'Vérifiez que tous les champs partagent le même type temporel et unité.',
    groups
  };
}

/**
 * Internal helper to group fields by their economic role and unit.
 * @param {Array<Object>} fieldSemantics
 * @returns {Object}
 * @private
 */
function _groupFields(fieldSemantics) {
  const roleGroup = {};
  const unitGroup = {};
  
  fieldSemantics.forEach(f => {
    const role = f.economicRole || 'UNKNOWN';
    const unit = f.unit || 'UNKNOWN';
    
    if (!roleGroup[role]) roleGroup[role] = [];
    roleGroup[role].push(f);
    
    if (!unitGroup[unit]) unitGroup[unit] = [];
    unitGroup[unit].push(f);
  });
  
  return { roleGroup, unitGroup };
}

/**
 * Checks if an aggregation method is valid for a given field.
 * 
 * @param {Object} fieldSemantic - The semantic definition of a single field.
 * @param {string} method - The aggregation method (e.g., 'sum', 'avg', 'last').
 * @returns {{ valid: boolean, reason: string|null, suggestedMethod: string|null }}
 */
export function validateAggregation(fieldSemantic, method) {
  if (!fieldSemantic || !method) {
    return { valid: false, reason: 'Champ ou méthode manquant.', suggestedMethod: null };
  }

  const { temporalType, economicRole } = fieldSemantic;

  if (method === 'sum') {
    if (temporalType === TEMPORAL_TYPES.STOCK || economicRole === ECONOMIC_ROLES.BALANCE) {
      return {
        valid: false,
        reason: 'Les soldes ne peuvent pas être sommés dans le temps.',
        suggestedMethod: 'last'
      };
    }
    if (economicRole === ECONOMIC_ROLES.RATE || economicRole === ECONOMIC_ROLES.RATIO) {
      return {
        valid: false,
        reason: 'Les taux doivent être moyennés, pas sommés.',
        suggestedMethod: 'avg'
      };
    }
    return { valid: true, reason: null, suggestedMethod: null };
  }
  
  if (method === 'avg') {
    if (temporalType === TEMPORAL_TYPES.FLOW) {
      return {
        valid: true,
        reason: "La moyenne d'un flux dilue l'information - préférez la somme.",
        suggestedMethod: 'sum'
      };
    }
    return { valid: true, reason: null, suggestedMethod: null };
  }
  
  if (method === 'last') {
    if (temporalType === TEMPORAL_TYPES.STOCK || economicRole === ECONOMIC_ROLES.BALANCE) {
      return { valid: true, reason: null, suggestedMethod: null };
    }
  }

  return { valid: true, reason: null, suggestedMethod: null };
}

/**
 * Returns all fields from a given array that are compatible for composition with the reference field.
 * 
 * @param {Object} fieldSemantic - The reference field semantic.
 * @param {Array<Object>} allFields - Array of field semantics to check.
 * @returns {Array<Object>}
 */
export function getCompatibleFields(fieldSemantic, allFields) {
  if (!fieldSemantic || !allFields || !Array.isArray(allFields)) return [];
  
  return allFields.filter(field => {
    if (field === fieldSemantic) return false;
    return areFieldsAdditive(fieldSemantic, field);
  });
}

/**
 * Validates whether a set of fields can be plotted on a specific chart type.
 * 
 * @param {string} chartType - The type of chart ('composition', 'comparison', 'trend', 'distribution', 'correlation').
 * @param {Array<Object>} fieldSemantics - The array of field semantics.
 * @returns {{ valid: boolean, reason: string|null, suggestedType: string|null }}
 */
export function validateChartType(chartType, fieldSemantics) {
  if (!fieldSemantics || fieldSemantics.length === 0) {
    return { valid: false, reason: 'Aucun champ fourni.', suggestedType: null };
  }

  if (chartType === 'composition') {
    const compResult = validateComposition(fieldSemantics);
    if (!compResult.valid) {
      return {
        valid: false,
        reason: compResult.reason,
        suggestedType: 'comparison'
      };
    }
    return { valid: true, reason: null, suggestedType: null };
  }

  if (chartType === 'comparison') {
    // Check if fields are mutually comparable
    let allComparable = true;
    for (let i = 0; i < fieldSemantics.length; i++) {
      for (let j = i + 1; j < fieldSemantics.length; j++) {
        if (!areFieldsComparable(fieldSemantics[i], fieldSemantics[j])) {
          allComparable = false;
          break;
        }
      }
      if (!allComparable) break;
    }
    
    if (!allComparable) {
      return {
        valid: false,
        reason: 'Les champs ne sont pas comparables (types temporels ou rôles incompatibles).',
        suggestedType: null
      };
    }
    return { valid: true, reason: null, suggestedType: null };
  }

  if (chartType === 'trend') {
    // Requires same temporalType or they must be on separate axes
    const tempTypes = new Set(fieldSemantics.map(f => f.temporalType));
    if (tempTypes.size > 1) {
       return {
         valid: true,
         reason: 'Types temporels mixtes détectés. Veillez à utiliser des axes séparés.',
         suggestedType: null
       };
    }
    return { valid: true, reason: null, suggestedType: null };
  }

  if (chartType === 'distribution' || chartType === 'correlation') {
    if (chartType === 'correlation' && fieldSemantics.length !== 2) {
      return {
        valid: false,
        reason: 'Une corrélation nécessite exactement deux champs.',
        suggestedType: 'comparison'
      };
    }
    return { valid: true, reason: null, suggestedType: null };
  }
  
  return { valid: false, reason: `Type de graphique inconnu: ${chartType}`, suggestedType: null };
}

/**
 * Suggests valid chart types for a given set of fields.
 * 
 * @param {Array<Object>} fieldSemantics - The array of field semantics.
 * @returns {Array<string>} List of valid chart types.
 */
export function suggestChartTypes(fieldSemantics) {
  const suggestions = [];
  if (!fieldSemantics || fieldSemantics.length === 0) return suggestions;
  
  const chartTypes = ['composition', 'comparison', 'trend', 'distribution', 'correlation'];
  
  chartTypes.forEach(type => {
    const result = validateChartType(type, fieldSemantics);
    if (result.valid) {
      suggestions.push(type);
    }
  });
  
  return suggestions;
}

/**
 * Explains in French why two fields cannot be combined.
 * 
 * @param {Object} fieldA
 * @param {Object} fieldB
 * @returns {string} Detailed explanation.
 */
export function explainIncompatibility(fieldA, fieldB) {
  if (!fieldA || !fieldB) return 'Champs invalides.';
  
  if (fieldA.temporalType !== fieldB.temporalType) {
    const aTypeDesc = fieldA.temporalType === TEMPORAL_TYPES.FLOW ? 'flux cumulable' : 'valeur ponctuelle';
    const bTypeDesc = fieldB.temporalType === TEMPORAL_TYPES.FLOW ? 'flux cumulable' : 'valeur ponctuelle';
    return `Le champ "${fieldA.name || 'A'}" (${aTypeDesc}) et le champ "${fieldB.name || 'B'}" (${bTypeDesc}) ne peuvent pas être additionnés car ils représentent des concepts économiques fondamentalement différents.`;
  }
  
  if (fieldA.economicRole === ECONOMIC_ROLES.RATE || fieldB.economicRole === ECONOMIC_ROLES.RATE) {
    return "L'un des champs est un taux. Les taux ne peuvent pas être additionnés directement.";
  }

  if (fieldA.unit !== fieldB.unit) {
    return `Les champs ont des unités différentes (${fieldA.unit || 'inconnue'} vs ${fieldB.unit || 'inconnue'}) et ne peuvent pas être comparés ou composés directement.`;
  }

  return 'Les champs sont incompatibles en raison de rôles économiques ou de types de données divergents.';
}