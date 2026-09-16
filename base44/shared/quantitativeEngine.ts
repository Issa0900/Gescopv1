/**
 * GESCOP - Quantitative Engine
 * 
 * Phase 2 du Pipeline d'Intelligence
 * Rle : Prendre une liste d'Observations (issues du Data Core), les filtrer
 * (uniquement les quantitatives), et les agrǸger temporellement pour nourrir
 * le moteur de KPIs ou d'anomalies.
 */

import { Observation } from './observationEngine.ts';

export type AggregatedMetrics = Record<string, number>;

/**
 * Agrge les observations quantitatives pour une pǸriode ou globalement,
 * prtes  tre injectǸes dans le KPI Engine.
 */
export function aggregateQuantitativeObservations(
  observations: Observation[],
  startDate?: Date,
  endDate?: Date
): AggregatedMetrics {
  
  const metrics: AggregatedMetrics = {};

  // Filtrer uniquement les observations quantitatives (et dans la pǸriode si spǸcifiǸe)
  const validObs = observations.filter(obs => {
    if (obs.observation_type !== 'quantitative' || obs.value === undefined) return false;
    
    if (startDate && endDate && obs.date) {
      const d = new Date(obs.date);
      if (d < startDate || d > endDate) return false;
    }
    return true;
  });

  // AgrǸgation par concept
  for (const obs of validObs) {
    // Normaliser le nom du concept (ex: "finance.revenue" -> "revenue")
    // Le KPI Engine actuel de GESCOP attend des clǸs courtes sans le prǸfixe de domaine.
    const keyParts = obs.concept.split('.');
    const metricKey = keyParts.length > 1 ? keyParts[1] : obs.concept;

    if (!metrics[metricKey]) {
      metrics[metricKey] = 0;
    }
    metrics[metricKey] += obs.value!;
  }

  return metrics;
}

/**
 * Calcule la tendance (Trend) entre deux pǸriodes
 */
export function calculateTrend(
  currentMetrics: AggregatedMetrics, 
  previousMetrics: AggregatedMetrics,
  metricKey: string
): number {
  const current = currentMetrics[metricKey] || 0;
  const previous = previousMetrics[metricKey] || 0;

  if (previous === 0) return current > 0 ? 100 : 0; // +100% si on part de 0

  return ((current - previous) / Math.abs(previous)) * 100;
}
