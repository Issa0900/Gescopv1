/**
 * @module grainEngine
 * Grain & Temporality Engine for GESCOP Data Intelligence Core.
 * Detects and validates temporal granularity of data, distinguishing FLOW from STOCK.
 */

import { GRAIN_TYPES, TEMPORAL_TYPES } from './semanticTypes';

/**
 * Temporal hierarchy from finest to coarsest.
 * Non-temporal (entity-level) grains are not included.
 * / Hiérarchie temporelle du plus fin au plus grossier.
 */
const GRAIN_HIERARCHY = Object.freeze([
    GRAIN_TYPES.DAY,
    GRAIN_TYPES.WEEK,
    GRAIN_TYPES.MONTH,
    GRAIN_TYPES.QUARTER,
    GRAIN_TYPES.YEAR
]);

const GRAIN_LABELS = Object.freeze({
    [GRAIN_TYPES.DAY]: { en: 'Day', fr: 'Jour' },
    [GRAIN_TYPES.WEEK]: { en: 'Week', fr: 'Semaine' },
    [GRAIN_TYPES.MONTH]: { en: 'Month', fr: 'Mois' },
    [GRAIN_TYPES.QUARTER]: { en: 'Quarter', fr: 'Trimestre' },
    [GRAIN_TYPES.YEAR]: { en: 'Year', fr: 'Année' },
    [GRAIN_TYPES.TRANSACTION]: { en: 'Transaction', fr: 'Transaction' },
    [GRAIN_TYPES.ORDER]: { en: 'Order', fr: 'Commande' },
    [GRAIN_TYPES.CUSTOMER]: { en: 'Customer', fr: 'Client' },
    [GRAIN_TYPES.PRODUCT]: { en: 'Product', fr: 'Produit' },
    [GRAIN_TYPES.EMPLOYEE]: { en: 'Employee', fr: 'Employé' },
    [GRAIN_TYPES.CAMPAIGN]: { en: 'Campaign', fr: 'Campagne' },
    [GRAIN_TYPES.CAMPAIGN_DAILY]: { en: 'Campaign Daily', fr: 'Campagne Journalière' },
    [GRAIN_TYPES.SUPPLIER]: { en: 'Supplier', fr: 'Fournisseur' },
    [GRAIN_TYPES.PURCHASE]: { en: 'Purchase', fr: 'Achat' },
    [GRAIN_TYPES.INTERACTION]: { en: 'Interaction', fr: 'Interaction' },
    [GRAIN_TYPES.EVENT]: { en: 'Event', fr: 'Événement' }
});

/**
 * Detects the temporal grain of a dataset by analyzing the median interval between sorted dates.
 * / Détecte le grain temporel d'un jeu de données en analysant l'intervalle médian entre les dates.
 * 
 * @param {Array<Object>} records - The dataset records / Les enregistrements
 * @param {string} [dateField='date'] - The field containing the date / Le champ de date
 * @returns {string|null} The detected GRAIN_TYPE or null / Le type de grain détecté ou null
 */
export function detectGrain(records, dateField = 'date') {
    if (!records || !Array.isArray(records) || records.length < 2) return null;
    
    const dates = records
        .map(r => r[dateField])
        .filter(d => d != null)
        .map(d => new Date(d).getTime())
        .filter(t => !isNaN(t))
        .sort((a, b) => a - b);
        
    if (dates.length < 2) return null;
    
    const intervals = [];
    for (let i = 1; i < dates.length; i++) {
        const diff = dates[i] - dates[i - 1];
        if (diff > 0) {
            intervals.push(diff);
        }
    }
    
    if (intervals.length === 0) return null;
    
    intervals.sort((a, b) => a - b);
    const median = intervals[Math.floor(intervals.length / 2)];
    
    const days = median / (1000 * 60 * 60 * 24);
    
    if (days >= 350) return GRAIN_TYPES.YEAR;
    if (days >= 85) return GRAIN_TYPES.QUARTER;
    if (days >= 27) return GRAIN_TYPES.MONTH;
    if (days >= 6) return GRAIN_TYPES.WEEK;
    return GRAIN_TYPES.DAY;
}

/**
 * Returns the temporal type based on the field's semantic type.
 * / Retourne le type temporel basé sur le type sémantique du champ.
 * 
 * @param {Object} fieldSemantic - FieldSemantic object / Objet sémantique du champ
 * @returns {string} The temporal type (flow | stock | snapshot | static)
 */
export function detectTemporalType(fieldSemantic) {
    if (!fieldSemantic) return TEMPORAL_TYPES.STATIC;
    return fieldSemantic.temporalType || TEMPORAL_TYPES.STATIC;
}

/**
 * Checks if a grain can be aggregated to another grain (fine to coarse).
 * / Vérifie si un grain peut être agrégé vers un autre (fin vers grossier).
 * 
 * @param {string} fromGrain - Source grain / Grain source
 * @param {string} toGrain - Target grain / Grain cible
 * @returns {boolean} True if aggregation is valid / Vrai si l'agrégation est valide
 */
export function canAggregate(fromGrain, toGrain) {
    if (fromGrain === toGrain) return true;
    
    const fromIdx = GRAIN_HIERARCHY.indexOf(fromGrain);
    const toIdx = GRAIN_HIERARCHY.indexOf(toGrain);
    
    if (fromIdx !== -1 && toIdx !== -1) {
        return fromIdx <= toIdx;
    }
    
    return false;
}

/**
 * Checks if two grains are compatible. Same grain or aggregateable.
 * / Vérifie si deux grains sont compatibles.
 * 
 * @param {string} grainA - First grain / Premier grain
 * @param {string} grainB - Second grain / Deuxième grain
 * @returns {boolean} True if compatible / Vrai si compatible
 */
export function areGrainsCompatible(grainA, grainB) {
    if (grainA === grainB) return true;
    return canAggregate(grainA, grainB) || canAggregate(grainB, grainA);
}

/**
 * Returns a human-readable label for the grain.
 * / Retourne une étiquette lisible pour le grain.
 * 
 * @param {string} grain - The grain type / Le type de grain
 * @param {string} [locale='fr'] - The locale, 'fr' or 'en' / La langue
 * @returns {string} Localized label / Étiquette localisée
 */
export function getGrainLabel(grain, locale = 'fr') {
    const labels = GRAIN_LABELS[grain];
    if (!labels) return grain;
    return labels[locale] || labels.en || grain;
}

/**
 * Returns the coarsest common grain that both can be aggregated to.
 * / Retourne le grain commun le plus grossier.
 * 
 * @param {string} grainA - First grain / Premier grain
 * @param {string} grainB - Second grain / Deuxième grain
 * @returns {string|null} Aligned grain or null / Grain aligné ou null
 */
export function alignGrains(grainA, grainB) {
    if (grainA === grainB) return grainA;
    if (canAggregate(grainA, grainB)) return grainB;
    if (canAggregate(grainB, grainA)) return grainA;
    return null;
}

/**
 * Checks if a field is temporally additive (can be summed across time periods).
 * / Vérifie si un champ est additivement temporel (FLUX).
 * 
 * @param {Object} fieldSemantic - FieldSemantic object / Objet sémantique
 * @returns {boolean} True if FLOW / Vrai si c'est un flux
 */
export function isTemporallyAdditive(fieldSemantic) {
    const tempType = detectTemporalType(fieldSemantic);
    return tempType === TEMPORAL_TYPES.FLOW;
}
