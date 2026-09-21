// Shared domain score computation - used by both Dashboard and KPIs page
// to ensure "vue d'ensemble" and KPIs are always synchronized.
//
// Rules applied to every domain here:
//  1. Scores read RECENT performance (3 complete months), never all-time
//     cumulative totals, which hide a recent downturn behind good history.
//  2. Trends compare COMPLETE months only, on FULLY COVERED windows. When the
//     history is too short to compare, the score stays neutral and says so -
//     it never falls back to a made-up 0% change.
//  3. Every business definition (margin, runway, churn) comes from
//     src/lib/metrics.js so this file and the audit page cannot disagree.

import {
  monthlyAggComplete,
  lastVal,
  prevVal,
  trendPct,
  trendDir,
  sumLast,
  sumPrev,
} from "@/lib/periods";
import { financialMonthlySeries } from "@/lib/financialData";
import { getStockAlertSettings, computeStockAlerts } from "@/lib/stockAlerts";
import { warnIfDataMissing } from "@/lib/core/dataCompleteness";
import {
  aggregateMarginPct,
  previousMarginPct,
  marginDeltaPoints,
  netBurnRate,
  runwayMonths,
  fmtRunway,
  latestCashBalance,
  churnStats,
  roasWindow,
  previousRoasWindow,
  validSalesOrders,
} from "@/lib/metrics";

function clamp(v) {
  const n = Number(v);
  if (!Number.isFinite(n)) return 50;
  return Math.max(0, Math.min(100, Math.round(n)));
}

/**
 * Apply a trend bonus/penalty to a base score.
 * A null pct means "unknown" - the score is left untouched rather than penalised.
 */
function applyTrend(score, pct, bonus = 8, penalty = 12, threshold = 5) {
  if (pct === null || pct === undefined || !Number.isFinite(pct)) return score;
  if (pct > threshold) return score + bonus;
  if (pct < -threshold) return score - penalty;
  return score;
}

export function computeDomainScores(data) {
  warnIfDataMissing("computeDomainScores", data, [
    "transactions", "orders", "customers", "campaigns", "campaignDaily",
    "products", "inventory", "cashflow", "expenses", "company",
  ]);
  const { transactions, orders, customers, campaigns, campaignDaily, products, inventory, cashflow, expenses, company, executiveSummary } = data;
  const scores = {};

  // === FINANCE - aggregated margin over complete months (unifies transactions, orders, expenses, executiveSummary) ===
  const financialMonthly = financialMonthlySeries(transactions || [], expenses || [], orders || [], executiveSummary || []);
  const revMonthly = financialMonthly.map((p) => ({ month: p.month, val: p.income }));
  const expMonthly = financialMonthly.map((p) => ({ month: p.month, val: p.expense }));

  const hasHistory3 = revMonthly.length >= 3;
  const recentMargin = hasHistory3
    ? aggregateMarginPct(revMonthly, expMonthly, 3)
    : (revMonthly.length > 0 ? aggregateMarginPct(revMonthly, expMonthly, revMonthly.length) : null);
  const priorMargin = hasHistory3 ? previousMarginPct(revMonthly, expMonthly, 3) : null;
  // Margin moves in POINTS. A 2%→4% move is +2 points, not +100%.
  const marginDelta = marginDeltaPoints(recentMargin, priorMargin);

  let financeScore;
  if (recentMargin === null) financeScore = 50;
  else if (recentMargin >= 40) financeScore = 88;
  else if (recentMargin >= 25) financeScore = 72;
  else if (recentMargin >= 10) financeScore = 52;
  else if (recentMargin >= 0) financeScore = 32;
  else financeScore = 15;
  // Threshold expressed in margin points, not in relative percent.
  financeScore = applyTrend(financeScore, marginDelta, 8, 12, 3);
  scores.finance = {
    // measured=false : aucune donnee pour ce domaine. Le score neutre de 50
    // qui suit n'est qu'un repli d'affichage et NE DOIT PAS entrer dans la
    // moyenne globale - une absence de mesure n'est pas une demi-sante.
    measured: recentMargin !== null,
    score: clamp(financeScore),
    trend: marginDelta === null ? "stable" : marginDelta > 3 ? "up" : marginDelta < -3 ? "down" : "stable",
    explanation:
      recentMargin !== null
        ? `Marge ${recentMargin.toFixed(0)} % (${hasHistory3 ? "3 mois" : `${revMonthly.length} mois`})`
        : revMonthly.length === 0
          ? "Aucune donnée financière importée"
          : "Historique insuffisant",
  };

  // === TRÉSORERIE - runway on NET burn, not gross expenses ===
  const cfSorted = (cashflow || []).slice().sort((a, b) => ((a.date || "") < (b.date || "") ? 1 : -1));
  const cashVals = (arr) => arr.map((c) => Number(c.closing_cash) || 0);
  const avg = (a) => (a.length > 0 ? a.reduce((s, v) => s + v, 0) / a.length : 0);
  const cash7 = avg(cashVals(cfSorted.slice(0, 7)));
  const cashPrev7 = cfSorted.length >= 14 ? avg(cashVals(cfSorted.slice(7, 14))) : null;
  const latestCash = latestCashBalance(cashflow);

  // A profitable business does not have a runway problem: burn is revenue-net.
  const burn = netBurnRate(revMonthly, expMonthly, 3);
  const runway = latestCash === null ? null : runwayMonths(latestCash, burn);

  let tresoScore;
  if (runway === null) tresoScore = 50;
  else if (runway === Infinity) tresoScore = 92;
  else if (runway >= 12) tresoScore = 90;
  else if (runway >= 6) tresoScore = 75;
  else if (runway >= 3) tresoScore = 55;
  else if (runway >= 1) tresoScore = 35;
  else tresoScore = 18;
  tresoScore = applyTrend(tresoScore, trendPct(cash7, cashPrev7), 6, 10, 2);
  scores.tresorerie = {
    // measured=false : aucune donnee pour ce domaine. Le score neutre de 50
    // qui suit n'est qu'un repli d'affichage et NE DOIT PAS entrer dans la
    // moyenne globale - une absence de mesure n'est pas une demi-sante.
    measured: runway !== null,
    score: clamp(tresoScore),
    trend: trendDir(cash7, cashPrev7, 1),
    explanation:
      latestCash === null
        ? "Aucun relevé de trésorerie importé"
        : `${Math.round(latestCash).toLocaleString("fr-CA")} $ · ${fmtRunway(runway)}`,
  };

  // === VENTES - complete-month revenue and basket trend ===
  // A refunded order's total was already reversed - counting it as revenue
  // overstated this score's input by the store's full return rate.
  const salesOrders = validSalesOrders(orders);
  const orderRevMonthly = monthlyAggComplete(
    salesOrders.map((o) => ({
      ...o,
      _computed_rev:
        Number(o.total_revenue) ||
        Number(o.total) ||
        Number(o.revenue_amount) ||
        Number(o.amount) ||
        ((Number(o.quantity) || 1) * (Number(o.unit_price) || Number(o.price) || 0)) ||
        0,
    })),
    "date",
    "_computed_rev"
  );
  const orderCntMonthly = monthlyAggComplete(salesOrders, "date", "order_id", "count");
  // 3-month blocks, but only when BOTH blocks are fully covered.
  const rev3 = sumLast(orderRevMonthly, 3);
  const revPrev3 = sumPrev(orderRevMonthly, 3);
  const revTrend = trendPct(rev3, revPrev3);

  let ventesScore;
  if (revTrend === null) ventesScore = 50;
  else if (revTrend > 15) ventesScore = 85;
  else if (revTrend > 2) ventesScore = 70;
  // A flat business is holding its ground, not underperforming: ±2% used to
  // fall into the same band as a -14% decline and scored below neutral.
  else if (revTrend >= -2) ventesScore = 60;
  else if (revTrend > -15) ventesScore = 48;
  else ventesScore = 28;
  const aovCurr = lastVal(orderCntMonthly) > 0 ? lastVal(orderRevMonthly) / lastVal(orderCntMonthly) : 0;
  const aovPrev = prevVal(orderCntMonthly) > 0 ? prevVal(orderRevMonthly) / prevVal(orderCntMonthly) : 0;
  ventesScore = applyTrend(ventesScore, trendPct(aovCurr, aovPrev), 6, 6);
  scores.ventes = {
    // measured=false : aucune donnee pour ce domaine. Le score neutre de 50
    // qui suit n'est qu'un repli d'affichage et NE DOIT PAS entrer dans la
    // moyenne globale - une absence de mesure n'est pas une demi-sante.
    measured: revTrend !== null,
    score: clamp(ventesScore),
    trend: trendDir(rev3, revPrev3),
    explanation:
      revTrend !== null
        ? `${revTrend >= 0 ? "+" : ""}${revTrend.toFixed(0)} % sur 3 mois`
        : orderRevMonthly.length === 0
          ? ""
          : revPrev3 === null
            // Not enough history to line up two 3-month blocks.
            ? `${orderRevMonthly.length} mois complets - 6 requis pour comparer`
            // Two blocks exist but the earlier one is empty: a percentage
            // change from zero has no meaning, so none is shown.
            : `${Math.round(rev3).toLocaleString("fr-CA")} $ sur 3 mois · aucune vente sur les 3 mois précédents`,
  };

  // === MARKETING - recent ROAS with a real computed trend ===
  // Prefer daily campaign data (it is dated, so it can be windowed);
  // fall back to campaign totals when daily rows are absent.
  const spendMonthly = monthlyAggComplete(campaignDaily || [], "date", "spend");
  const campRevMonthly = monthlyAggComplete(campaignDaily || [], "date", "revenue");

  let roas = roasWindow(spendMonthly, campRevMonthly, 3);
  const roasPrev = previousRoasWindow(spendMonthly, campRevMonthly, 3);
  let roasIsAllTime = false;
  if (roas === null) {
    const totalSpend = (campaigns || []).reduce((s, c) => s + (Number(c.spend) || 0), 0);
    const totalCampRev = (campaigns || []).reduce((s, c) => s + (Number(c.revenue) || 0), 0);
    if (totalSpend > 0) {
      roas = totalCampRev / totalSpend;
      roasIsAllTime = true;
    }
  }

  let marketingScore;
  if (roas === null) marketingScore = 50;
  else if (roas >= 4) marketingScore = 88;
  else if (roas >= 2) marketingScore = 72;
  else if (roas >= 1) marketingScore = 50;
  else marketingScore = 28;
  marketingScore = applyTrend(marketingScore, trendPct(roas, roasPrev), 6, 10);
  scores.marketing = {
    // measured=false : aucune donnee pour ce domaine. Le score neutre de 50
    // qui suit n'est qu'un repli d'affichage et NE DOIT PAS entrer dans la
    // moyenne globale - une absence de mesure n'est pas une demi-sante.
    measured: roas !== null,
    score: clamp(marketingScore),
    // Real trend when a comparison window exists - never inferred from the level.
    trend: trendDir(roas, roasPrev),
    explanation:
      roas !== null
        ? `ROAS ${roas.toFixed(1)}x${roasIsAllTime ? " (cumul, non daté)" : ""}`
        : "Aucune donnée publicitaire",
  };

  // === OPÉRATIONS - latest stock snapshot per product, not every history row ===
  // Uses the SAME shortage definition as the Produits page and the alert centre,
  // including the threshold the user set on their company. This score used to
  // read the imported stock_status only, so lowering the threshold changed the
  // Produits list while this score stayed put on the same data.
  const stock = computeStockAlerts(products, inventory, getStockAlertSettings(company), orders);
  const trackedCount = stock.tracked;
  const dormantCount = stock.dormantCount;
  const ruptureCount = stock.alertCount;
  const lowCount = stock.lowStockCount;
  const issueRatio = trackedCount > 0 ? (dormantCount + ruptureCount) / trackedCount : 0;

  let opsScore;
  if (trackedCount === 0) opsScore = 50;
  else if (issueRatio === 0) opsScore = 82;
  else if (issueRatio < 0.1) opsScore = 68;
  else if (issueRatio < 0.25) opsScore = 48;
  else opsScore = 28;
  scores.operations = {
    // measured=false : aucune donnee pour ce domaine. Le score neutre de 50
    // qui suit n'est qu'un repli d'affichage et NE DOIT PAS entrer dans la
    // moyenne globale - une absence de mesure n'est pas une demi-sante.
    measured: trackedCount > 0,
    score: clamp(opsScore),
    trend: "stable",
    explanation: trackedCount > 0 ? `${ruptureCount} ruptures · ${dormantCount} dormants` : "",
    details: { trackedCount, dormantCount, ruptureCount, lowCount },
  };

  // === CLIENTS - single churn definition + acquisition trend ===
  const churn = churnStats(customers, orders);
  // churn.rate needs a populated Customer.status field, which most CRM
  // imports never carry. churnStats() already computes a second, independent
  // rate from real purchase behaviour (behaviourRate) whenever order history
  // exists - this used to be discarded, leaving the domain "non mesuré" on
  // an import with complete customers + orders but no status column.
  const churnRate = churn.rate !== null ? churn.rate : churn.behaviourRate;
  const churnIsBehaviour = churn.rate === null && churn.behaviourRate !== null;
  const custMonthly = monthlyAggComplete(customers || [], "acquisition_date", "customer_id", "count");
  const new3 = sumLast(custMonthly, 3);
  const newPrev3 = sumPrev(custMonthly, 3);

  let clientsScore;
  if (churnRate === null || churnRate === undefined) clientsScore = 50;
  else if (churnRate < 5) clientsScore = 85;
  else if (churnRate < 10) clientsScore = 70;
  else if (churnRate < 20) clientsScore = 50;
  else clientsScore = 30;
  clientsScore = applyTrend(clientsScore, trendPct(new3, newPrev3), 8, 8);
  scores.clients = {
    // measured=false : aucune donnee pour ce domaine. Le score neutre de 50
    // qui suit n'est qu'un repli d'affichage et NE DOIT PAS entrer dans la
    // moyenne globale - une absence de mesure n'est pas une demi-sante.
    measured: churnRate !== null && churnRate !== undefined,
    score: clamp(clientsScore),
    trend: trendDir(new3, newPrev3),
    explanation:
      churnRate !== null && churnRate !== undefined
        ? churnIsBehaviour
          ? `${churn.buyers} acheteurs · ${churnRate.toFixed(0)} % churn (comportement)`
          : `${churn.active} actifs · ${churnRate.toFixed(0)} % churn`
        : "",
  };

  return scores;
}
