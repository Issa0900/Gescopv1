// Single source of truth for every business definition used in the app.
//
// Before this module the same indicator was computed differently on each page:
// four churn rates (two of them counting "a_risque" clients as already lost),
// three LTVs (one dividing revenue from ALL customers by ACTIVE customers only,
// which doubles the figure when half the base has churned), and two margins
// (a mean of monthly percentages vs. an aggregated margin — 23% vs 10% on the
// same data). A dashboard that contradicts its own audit page is worse than no
// dashboard, so every definition now lives here and every page imports it.

import { sumLast, sumPrev, meanOf, trendPct } from "@/lib/periods";
import { computeKpi, computeKpiBatch } from "@/lib/core/kpiEngine";
import { KPI_REGISTRY, getKpiDefinition, getKpisByDomain } from "@/lib/core/kpiRegistry";

export {
  computeKpi,
  computeKpiBatch,
  KPI_REGISTRY,
  getKpiDefinition,
  getKpisByDomain
};

const num = (v) => (Number.isFinite(Number(v)) ? Number(v) : 0);

/* ------------------------------------------------------------------ */
/* Marge                                                               */
/* ------------------------------------------------------------------ */

/**
 * Aggregated margin over the last n complete months: (revenus − dépenses) ÷ revenus.
 *
 * NOT the mean of the monthly margin percentages. A month at 2 000 $ of revenue
 * must not weigh as much as a month at 100 000 $ — on a real series the two
 * methods differ by more than a factor of two.
 *
 * Returns null when there is no revenue to divide by.
 */
export function aggregateMarginPct(revSeries, expSeries, n = 3) {
  const rev = sumLast(revSeries, n);
  const exp = sumLast(expSeries, n);
  if (rev === null || exp === null || rev <= 0) return null;
  return ((rev - exp) / rev) * 100;
}

/** Same metric over the n months preceding the last n — null if not covered. */
export function previousMarginPct(revSeries, expSeries, n = 3) {
  const rev = sumPrev(revSeries, n);
  const exp = sumPrev(expSeries, n);
  if (rev === null || exp === null || rev <= 0) return null;
  return ((rev - exp) / rev) * 100;
}

/**
 * Change in margin expressed in POINTS, not in percent of a percent.
 * Going from 2% to 4% is +2 points, not "+100% growth" — the relative reading
 * used to hand out a full trend bonus for a two-point move on a thin margin.
 */
export function marginDeltaPoints(currPct, prevPct) {
  if (currPct === null || prevPct === null) return null;
  return currPct - prevPct;
}

/* ------------------------------------------------------------------ */
/* Trésorerie                                                          */
/* ------------------------------------------------------------------ */

/**
 * Net monthly burn: how much cash the business actually consumes once revenue
 * is taken into account. Dividing the balance by GROSS expenses told a
 * profitable company it had "2.4 months left" and fired a critical alert.
 *
 * Returns 0 when the business is cash-generating (no burn → infinite runway).
 */
export function netBurnRate(revSeries, expSeries, n = 3) {
  const rev = sumLast(revSeries, n);
  const exp = sumLast(expSeries, n);
  if (exp === null) return null;
  const months = Math.min(n, (expSeries || []).length) || 1;
  const net = (exp - (rev === null ? 0 : rev)) / months;
  return net > 0 ? net : 0;
}

/**
 * Months of runway. null = not computable, Infinity = profitable (no burn).
 * Callers must handle Infinity explicitly instead of printing a number.
 */
export function runwayMonths(cash, burn) {
  if (burn === null || burn === undefined) return null;
  // Une tresorerie nulle ou negative n'a aucune autonomie, meme si l'activite
  // degage du cash : annoncer "tresorerie autofinancee" a une entreprise a
  // decouvert est le pire contresens que puisse faire un outil de pilotage.
  if (num(cash) <= 0) return 0;
  if (burn <= 0) return Infinity;
  return num(cash) / burn;
}

export function fmtRunway(months) {
  if (months === null || months === undefined) return "—";
  if (months === Infinity) return "trésorerie autofinancée";
  return `${months.toFixed(1)} mois`;
}

/** Latest closing balance from a cashflow series, defensively typed. */
export function latestCashBalance(cashflow) {
  const sorted = (cashflow || []).slice().sort((a, b) => ((a.date || "") < (b.date || "") ? 1 : -1));
  if (sorted.length === 0) return null;
  return num(sorted[0].closing_cash);
}

/* ------------------------------------------------------------------ */
/* Clients                                                             */
/* ------------------------------------------------------------------ */

/**
 * One churn definition for the whole app: a client is churned when its STATUS
 * says so. "a_risque" is a client still buying — counting it as lost inflated
 * the rate on the Clients page and in every AI report while the KPI page showed
 * a lower one from the same rows.
 */
export const DEFAULT_INACTIVE_MONTHS = 6;

/** "2026-09" moved back n months. */
function shiftMonthKey(key, n) {
  const [y, m] = key.split("-").map(Number);
  const total = y * 12 + (m - 1) + n;
  return `${Math.floor(total / 12)}-${String((total % 12) + 1).padStart(2, "0")}`;
}

/**
 * @deprecated GESCOP Phase 3 SSOT : Ce calcul comportemental décentralisé doit être abandonné.
 * Veuillez consommer `churn_rate` via `useKpiEngine()`.
 */
export function churnStats(customers, orders, inactiveMonths = DEFAULT_INACTIVE_MONTHS) {
  const rows = customers || [];
  const total = rows.length;
  const churned = rows.filter((c) => ["inactif", "inactive", "perdu", "lost"].includes(String(c.status || "").toLowerCase())).length;
  const active = rows.filter((c) => ["actif", "active"].includes(String(c.status || "").toLowerCase())).length;
  // Tracked separately: at-risk clients are a leading indicator, not churn.
  const atRisk = rows.filter((c) => {
    if (c.status !== "actif") return false;
    const r = Number(c.churn_risk);
    return Number.isFinite(r) && (r > 1 ? r / 100 : r) >= 0.7;
  }).length;
  // --- Attrition mesurée sur le COMPORTEMENT d'achat ---
  //
  // The status-based rate above is a CUMULATIVE share: every customer ever lost,
  // over the whole base. It only grows as the base ages, it cannot be compared
  // month to month, and it says nothing about what is happening now. Calling it
  // a "taux de churn" oversold it — a rate is measured over a period.
  //
  // This one is: among customers who have ever ordered, how many have stopped
  // buying over the chosen window. Computable whenever order history exists,
  // and it moves when the window moves.
  const months = Math.max(1, Number(inactiveMonths) || DEFAULT_INACTIVE_MONTHS);
  const ord = orders || [];
  const hasOrders = ord.some((o) => o.customer_id && o.date);
  let buyers = null;
  let lapsed = null;
  let behaviourRate = null;
  if (hasOrders) {
    const now = new Date().toISOString().slice(0, 7);
    const cutoff = shiftMonthKey(now, -months);
    const everBought = new Set();
    const boughtRecently = new Set();
    ord.forEach((o) => {
      const m = (o.date || "").slice(0, 7);
      if (!o.customer_id || !m) return;
      everBought.add(o.customer_id);
      // The month in progress counts as recent activity, unlike trend windows:
      // a purchase yesterday obviously means the customer has not lapsed.
      if (m >= cutoff) boughtRecently.add(o.customer_id);
    });
    buyers = everBought.size;
    lapsed = [...everBought].filter((id) => !boughtRecently.has(id)).length;
    behaviourRate = buyers > 0 ? (lapsed / buyers) * 100 : null;
  }

  return {
    total,
    active,
    churned,
    atRisk,
    // Cumulative share of the base marked lost — NOT a period rate.
    rate: total > 0 ? (churned / total) * 100 : null,
    // Period attrition from real purchase behaviour. null = not computable.
    inactiveMonths: months,
    buyers,
    lapsed,
    behaviourRate,
    measurable: hasOrders,
  };
}

/**
 * Average revenue per customer, and a margin-adjusted LTV when the margin is known.
 *
 * The numerator covers every customer that ordered, so the denominator must too.
 * Dividing all-customer revenue by ACTIVE customers only was inflating the
 * figure by 1/(share of active) — a 2x overstatement at 50% churn.
 */
/**
 * @deprecated GESCOP Phase 3 SSOT : Utilisez `ltv` via `useKpiEngine()`.
 * Le calcul historique sur l'ensemble de la base faussait l'analyse périodique.
 */
export function customerValue(orders, customers, marginPct = null) {
  const ord = orders || [];
  const totalRevenue = ord.reduce((s, o) => s + (Number(o.total) || Number(o.revenue_amount) || 0), 0);
  const buyers = new Set(ord.map((o) => o.customer_id).filter(Boolean)).size;
  const totalCustomers = (customers || []).length;
  // Prefer customers who actually ordered; fall back to the whole base.
  const denominator = buyers > 0 ? buyers : totalCustomers;
  const avgRevenue = denominator > 0 ? totalRevenue / denominator : null;
  return {
    totalRevenue,
    buyers,
    avgRevenue,
    // A real LTV is value, not turnover: apply the margin when we have one.
    ltv: avgRevenue !== null && marginPct !== null ? avgRevenue * (marginPct / 100) : null,
  };
}

/* ------------------------------------------------------------------ */
/* Marketing                                                           */
/* ------------------------------------------------------------------ */

/** ROAS over the last n complete months from dated daily rows. */
export function roasWindow(spendSeries, revSeries, n = 3) {
  const spend = sumLast(spendSeries, n);
  const rev = sumLast(revSeries, n);
  if (spend === null || rev === null || spend <= 0) return null;
  return rev / spend;
}

export function previousRoasWindow(spendSeries, revSeries, n = 3) {
  const spend = sumPrev(spendSeries, n);
  const rev = sumPrev(revSeries, n);
  if (spend === null || rev === null || spend <= 0) return null;
  return rev / spend;
}

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

/**
 * True when at least one row actually carries a value for this column.
 *
 * Imports routinely omit columns: `new_customers`, `churn_risk`, `cost`,
 * `inventory_value` were all empty in a real file. Every metric built on such a
 * column collapsed to 0 and was displayed as a fact — "CAC 0 $" next to 623 667 $
 * of spend, "0 % de risque" on every client. Zero and unknown are different
 * answers, and only one of them is honest here.
 */
export function columnPresent(rows, field) {
  return (rows || []).some((r) => {
    const v = r?.[field];
    return v !== null && v !== undefined && v !== "";
  });
}

/** True when at least one of several columns carries a value. */
export function anyColumnPresent(rows, fields) {
  return (fields || []).some((f) => columnPresent(rows, f));
}

export { trendPct, meanOf };
