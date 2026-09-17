// ─────────────────────────────────────────────────────────────────────────────
// GESCOP Universal KPI Engine — Metric Engine & Base Measure Extractor
// Version 2.0 — Septembre 2026 (Spec Section 11 & 31)
// ─────────────────────────────────────────────────────────────────────────────

import { parseNumber, isSummaryOrTotalRow } from "../../importUtils.ts";

export interface DatasetSummaryInput {
  entityName?: string | null;
  headers: string[];
  rows: Record<string, any>[];
  grain?: string;
  isAggregatedSummary?: boolean;
}

/**
 * Extrait les métriques canoniques fondamentales d'un jeu de données (Spec Section 11 & 31)
 */
export function extractBaseMetrics(input: DatasetSummaryInput): Record<string, number> {
  const { headers, rows, isAggregatedSummary = false } = input;
  const metrics: Record<string, number> = {};

  if (!rows || rows.length === 0) return metrics;

  // 1. Identifier les colonnes par concept canonique (insensible à la casse, aux accents et aux symboles)
  const normalizeStr = (s: string) =>
    s
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[\s\-_$%€()]+/g, "");

  const findCol = (regex: RegExp) => headers.find((h) => regex.test(normalizeStr(h)));

  const revCol = findCol(/(total)?(revenue|vente|ventes|ca|sales|amount|mtt)/i);
  const costCol = findCol(/(total)?(cogs|cost|cout|couts|charges|purchasecost|couttotal)/i);
  const profitCol = findCol(/(gross)?(profit|benefice|margebrutedollar|profitbrut)/i);
  const marginPctCol = findCol(/(gross)?(margin|marge|tauxmarge|pctmarge)/i);
  const qtyCol = findCol(/(quantity|quantite|qte|units|unites)/i);
  const orderIdCol = findCol(/(order|commande|cde|invoice|facture)id/i);
  const customerIdCol = findCol(/(customer|client|acheteur)id/i);
  const employeeIdCol = findCol(/(employee|employe|staff)id/i);
  const branchCol = findCol(/(succursale|store|magasin|location|branch|site|ville)/i);

  // Marketing metrics
  const spendCol = findCol(/(spend|depense|budget|coutpub|adspend)/i);
  const impCol = findCol(/(impressions|vues|views)/i);
  const clickCol = findCol(/(clicks|clics)/i);
  const convCol = findCol(/(conversions|convs|achats)/i);

  // Cashflow metrics
  const cashInCol = findCol(/(cashin|encaissements|entrees|recettes)/i);
  const cashOutCol = findCol(/(cashout|decaissements|sorties|depenses)/i);
  const cashBalCol = findCol(/(cashbalance|solde|liquidites|tresorerie)/i);

  // Inventory metrics
  const invValCol = findCol(/(inventoryvalue|valeurstock|stockvalue)/i);
  const stockQtyCol = findCol(/(inventorylevel|closingstock|qtestock|stock)/i);

  // 2. Extraire et agréger selon le type économique (Flow vs Stock)
  let totalRevenue = 0;
  let totalCost = 0;
  let totalProfit = 0;
  let totalQty = 0;
  let totalSpend = 0;
  let totalImp = 0;
  let totalClicks = 0;
  let totalConv = 0;
  let totalCashIn = 0;
  let totalCashOut = 0;

  const uniqueOrders = new Set<string>();
  const uniqueCustomers = new Set<string>();
  const uniqueEmployees = new Set<string>();
  const uniqueBranches = new Set<string>();

  for (const r of rows) {
    if (isSummaryOrTotalRow(r)) continue;

    if (revCol && r[revCol] != null) totalRevenue += parseNumber(r[revCol]) || 0;
    if (costCol && r[costCol] != null) totalCost += parseNumber(r[costCol]) || 0;
    if (profitCol && r[profitCol] != null) totalProfit += parseNumber(r[profitCol]) || 0;
    if (qtyCol && r[qtyCol] != null) totalQty += parseNumber(r[qtyCol]) || 0;

    if (spendCol && r[spendCol] != null) totalSpend += parseNumber(r[spendCol]) || 0;
    if (impCol && r[impCol] != null) totalImp += parseNumber(r[impCol]) || 0;
    if (clickCol && r[clickCol] != null) totalClicks += parseNumber(r[clickCol]) || 0;
    if (convCol && r[convCol] != null) totalConv += parseNumber(r[convCol]) || 0;

    if (cashInCol && r[cashInCol] != null) totalCashIn += parseNumber(r[cashInCol]) || 0;
    if (cashOutCol && r[cashOutCol] != null) totalCashOut += parseNumber(r[cashOutCol]) || 0;

    if (orderIdCol && r[orderIdCol]) uniqueOrders.add(String(r[orderIdCol]).trim());
    if (customerIdCol && r[customerIdCol]) uniqueCustomers.add(String(r[customerIdCol]).trim());
    if (employeeIdCol && r[employeeIdCol]) uniqueEmployees.add(String(r[employeeIdCol]).trim());
    if (branchCol && r[branchCol]) uniqueBranches.add(String(r[branchCol]).trim());
  }

  // 3. Stocker les métriques canoniques détectées
  if (revCol) {
    metrics.revenue = Math.round(totalRevenue * 100) / 100;
    metrics.attributed_revenue = metrics.revenue;
  }
  if (costCol) metrics.cogs = Math.round(totalCost * 100) / 100;
  if (profitCol) {
    metrics.gross_profit = Math.round(totalProfit * 100) / 100;
  } else if (revCol && costCol && totalCost > 0) {
    metrics.gross_profit = Math.round((totalRevenue - totalCost) * 100) / 100;
  }

  if (qtyCol) metrics.quantity = totalQty;
  if (orderIdCol) metrics.orders = uniqueOrders.size > 0 ? uniqueOrders.size : rows.length;
  if (customerIdCol) metrics.customers = uniqueCustomers.size > 0 ? uniqueCustomers.size : rows.length;
  if (employeeIdCol) metrics.employees = uniqueEmployees.size > 0 ? uniqueEmployees.size : rows.length;

  if (branchCol) {
    const bCount = uniqueBranches.size > 0 ? uniqueBranches.size : rows.length;
    metrics.branches_count = bCount;
    metrics.branches = bCount;
  }

  if (spendCol) {
    metrics.marketing_spend = Math.round(totalSpend * 100) / 100;
    metrics.ad_spend = metrics.marketing_spend;
  }
  if (impCol) metrics.impressions = totalImp;
  if (clickCol) metrics.clicks = totalClicks;
  if (convCol) metrics.conversions = totalConv;
  if (convCol && totalRevenue > 0) metrics.attributed_revenue = metrics.revenue;

  if (cashInCol) metrics.cash_inflow = Math.round(totalCashIn * 100) / 100;
  if (cashOutCol) metrics.cash_outflow = Math.round(totalCashOut * 100) / 100;
  if (cashBalCol && rows.length > 0) {
    // Dernier solde (Stock metric)
    metrics.cash_balance = parseNumber(rows[rows.length - 1][cashBalCol]) || 0;
  }

  if (invValCol && rows.length > 0) {
    metrics.inventory_value = parseNumber(rows[rows.length - 1][invValCol]) || 0;
  } else if (stockQtyCol && costCol) {
    const lastRow = rows[rows.length - 1];
    metrics.inventory_value = (parseNumber(lastRow[stockQtyCol]) || 0) * (parseNumber(lastRow[costCol]) || 1);
  }

  return metrics;
}
