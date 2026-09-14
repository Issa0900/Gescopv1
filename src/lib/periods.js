// Shared period helpers.
//
// Three rules apply to every month-over-month figure in the app:
//
//  1. The current calendar month is almost always incomplete (e.g. on the 11th
//     only 11 days of data exist). Comparing it against a full previous month
//     produces false "collapse" trends on every metric, so it is excluded.
//
//  2. A month with no rows must appear as ZERO, not disappear. A sparse series
//     makes slice(-3) mean "the last 3 months that happen to have data", which
//     silently compares e.g. Nov-Dec 2024 against Jun-Aug 2025. Every series
//     returned by monthlyAggComplete is therefore densified over its own range.
//
//  3. A comparison window that is not fully covered by data is NOT a comparison.
//     Summing 3 months against the 1 month that precedes them shows +200% growth
//     for a perfectly flat business. sumPrev returns null in that case, and
//     trendPct/trendDir propagate that null as "unknown" rather than inventing 0.

export function currentMonthKey(now = new Date()) {
  return now.toISOString().slice(0, 7);
}

/** Dernier mois complet, c'est-a-dire le mois precedent celui en cours. */
export function previousMonthKey(now = new Date()) {
  const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1));
  return d.toISOString().slice(0, 7);
}

/** "2025-03" + 1 → "2025-04" */
function shiftMonth(key, n) {
  const [y, m] = key.split("-").map(Number);
  const total = y * 12 + (m - 1) + n;
  return `${Math.floor(total / 12)}-${String((total % 12) + 1).padStart(2, "0")}`;
}

/** Whole months between two "YYYY-MM" keys. */
function monthDiff(a, b) {
  const [y1, m1] = a.split("-").map(Number);
  const [y2, m2] = b.split("-").map(Number);
  return (y2 - y1) * 12 + (m2 - m1);
}

/**
 * Insert a zero bucket for every calendar month missing between the first and
 * last month of the series, so positional slicing means calendar months.
 */
export function densify(series, endMonth = null) {
  const arr = series || [];
  if (arr.length === 0) return arr;
  if (arr.length < 2 && !endMonth) return arr;
  const out = [];
  const dernier = arr[arr.length - 1].month;
  // Une serie qui s'arrete avant `endMonth` doit etre prolongee par des mois a
  // zero : sinon "les 3 derniers mois" designe les 3 derniers mois AYANT des
  // donnees, et une entreprise qui n'importe plus depuis l'ete voit ses chiffres
  // du printemps presentes comme ceux du mois dernier.
  const fin = endMonth && monthDiff(dernier, endMonth) > 0 ? endMonth : dernier;
  const span = monthDiff(arr[0].month, fin);
  // Defensive: a corrupt key would otherwise allocate an unbounded array.
  if (!Number.isFinite(span) || span < 0 || span > 600) return arr;
  const byMonth = {};
  arr.forEach((x) => { byMonth[x.month] = x.val; });
  for (let i = 0; i <= span; i += 1) {
    const m = shiftMonth(arr[0].month, i);
    out.push({ month: m, val: byMonth[m] || 0 });
  }
  return out;
}

/** Aggregate records into ascending monthly buckets (sparse — gaps are absent). */
export function monthlyAgg(items, dateField, valueField, mode = "sum") {
  const map = {};
  const lastDate = {};
  (items || []).forEach((it) => {
    const raw = it[dateField] || "";
    const m = raw.slice(0, 7);
    if (!m) return;
    if (!map[m]) map[m] = 0;
    const v = Number(it[valueField]) || 0;
    if (mode === "sum") map[m] += v;
    else if (mode === "count") map[m] += 1;
    else if (mode === "last") {
      // Keep the value of the latest DATE in the month, not the last row the
      // iteration happened to reach — row order is not date order.
      if (!lastDate[m] || raw >= lastDate[m]) { lastDate[m] = raw; map[m] = v; }
    }
  });
  return Object.entries(map)
    .sort((a, b) => (a[0] < b[0] ? -1 : 1))
    .map(([month, val]) => ({ month, val }));
}

/**
 * Monthly buckets ready for analysis: the in-progress month is dropped and
 * missing months are filled with zero. This is the series every calculation
 * should use; monthlyAgg stays sparse for data-quality gap detection.
 */
export function monthlyAggComplete(items, dateField, valueField, mode = "sum") {
  const cm = currentMonthKey();
  const sparse = monthlyAgg(items, dateField, valueField, mode).filter((x) => x.month !== cm);
  // Prolonge jusqu'au dernier mois complet pour que le decoupage positionnel
  // designe de vrais mois calendaires, meme quand les imports se sont arretes.
  // Tous les appelants agregent des FLUX (sommes, comptes) : un mois sans
  // donnee vaut donc zero. Ne pas utiliser pour un solde, qui se reporte.
  return densify(sparse, previousMonthKey());
}

export function dropCurrentMonth(series) {
  const cm = currentMonthKey();
  return (series || []).filter((x) => x.month !== cm);
}

export function lastVal(arr) {
  return arr && arr.length > 0 ? arr[arr.length - 1].val : 0;
}
export function prevVal(arr) {
  return arr && arr.length > 1 ? arr[arr.length - 2].val : 0;
}

/**
 * Percentage change, or null when it cannot be computed (no baseline, or a
 * baseline of zero/negative for which a percentage is meaningless).
 * Callers must treat null as "unknown", never as 0.
 */
export function trendPct(curr, prev) {
  if (prev === null || prev === undefined || curr === null || curr === undefined) return null;
  if (!Number.isFinite(Number(prev)) || !Number.isFinite(Number(curr))) return null;
  if (Number(prev) <= 0) return null;
  return ((Number(curr) - Number(prev)) / Number(prev)) * 100;
}

export function trendDir(curr, prev, tolerance = 2) {
  const pct = trendPct(curr, prev);
  if (pct === null) return "stable";
  if (pct > tolerance) return "up";
  if (pct < -tolerance) return "down";
  return "stable";
}

/** Format a possibly-null percentage for display. */
export function fmtPct(pct, digits = 0) {
  if (pct === null || pct === undefined || !Number.isFinite(pct)) return "—";
  return `${pct >= 0 ? "+" : ""}${pct.toFixed(digits)} %`;
}

/** Sum the last n buckets, or null if the series does not cover n months. */
export function sumLast(series, n) {
  const arr = series || [];
  if (arr.length < n) return null;
  return arr.slice(-n).reduce((s, x) => s + x.val, 0);
}

/**
 * Sum the n buckets immediately before the last n — null unless BOTH windows
 * are fully covered. Comparing a 3-month block to a 1-month block is the single
 * biggest source of invented trends, so an incomplete window is refused.
 */
export function sumPrev(series, n) {
  const arr = series || [];
  if (arr.length < 2 * n) return null;
  return arr.slice(arr.length - 2 * n, arr.length - n).reduce((s, x) => s + x.val, 0);
}

/** True when the series can support an n-vs-n month comparison. */
export function hasWindow(series, n) {
  return (series || []).length >= 2 * n;
}

/** Mean of a raw numeric array, ignoring non-finite entries. */
export function meanOf(values) {
  const arr = (values || []).filter((v) => Number.isFinite(v));
  return arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;
}

/**
 * Latest snapshot per key from a dated, repeating series (e.g. daily inventory rows).
 * Counting every historical row instead of the latest state per product
 * massively over-counts problems.
 */
export function latestByKey(items, keyField, dateField = "date") {
  const map = {};
  (items || []).forEach((it) => {
    const k = it[keyField];
    if (!k) return;
    if (!map[k] || (it[dateField] || "") > (map[k][dateField] || "")) map[k] = it;
  });
  return Object.values(map);
}
