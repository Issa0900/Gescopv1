// Dev-time guard against the exact class of bug that made "Dépenses" read
// 0 $ for months: a page fetches an entity (e.g. Expense) but forgets to
// thread it into a shared aggregator (computeDomainScores, useKpiEngine,
// computeLiveAlerts...), so every score/KPI relying on it silently reads as
// unmeasured or zero instead of erroring - nothing crashes, it just lies.
//
// Works for ANY data key, not just expenses: pass the full list of keys the
// aggregator actually reads. `undefined` means "the caller never passed this
// key at all" (almost certainly a forgotten wire-up); `[]` or `null` means
// "passed, genuinely empty" and is never flagged.

const isDev = typeof import.meta !== "undefined" && import.meta.env && import.meta.env.DEV;

/**
 * @param {string} fnName - name of the aggregator function, for the log line
 * @param {Object} data - the data bag the aggregator received
 * @param {string[]} expectedKeys - every key the aggregator reads from `data`
 */
export function warnIfDataMissing(fnName, data, expectedKeys) {
  if (!isDev) return;
  const missing = expectedKeys.filter((key) => data[key] === undefined);
  if (missing.length === 0) return;
  console.warn(
    `[${fnName}] called without: ${missing.join(", ")}. ` +
    `If the caller fetches this entity elsewhere, pass it here too - ` +
    `otherwise any score/KPI that depends on it will read as "non mesuré" ` +
    `or 0 instead of using the real data.`
  );
}
