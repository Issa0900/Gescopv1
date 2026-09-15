export const METRIC_TYPES = {
  STOCK: "STOCK", // e.g., employees, cash balance, inventory
  FLOW: "FLOW"    // e.g., revenue, expenses
};

export const AGG_METHODS = {
  SUM: "SUM",
  LAST: "LAST",
  AVG: "AVG",
  COUNT: "COUNT"
};

/**
 * Validates that the chosen aggregation method is compatible with the metric type.
 * Throws an error if attempting to SUM a STOCK metric.
 * 
 * @param {string} metricType - "STOCK" or "FLOW"
 * @param {string} method - The aggregation method (e.g., "SUM", "LAST")
 * @param {string} [metricName] - Optional name of the metric for error logging
 * @returns {string} The valid aggregation method to use
 */
export function validateChartAggregation(metricType, method, metricName = "Metric") {
  const isStock = metricType === METRIC_TYPES.STOCK;
  const isSum = method && method.toUpperCase() === AGG_METHODS.SUM;

  if (isStock && isSum) {
    throw new Error(`Invalid aggregation for chart: Cannot use SUM on a STOCK metric (${metricName}). Use LAST or AVG instead.`);
  }

  // Si c'est un FLUX, la somme est le comportement par défaut et valide
  return method || (isStock ? AGG_METHODS.LAST : AGG_METHODS.SUM);
}
