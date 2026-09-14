// Data audit: cross-checks between independent sources, import quality checks,
// and metric traceability (formula + source + period + intermediate values).
// Read-only — it never modifies data, it only reports what the metrics are built on.

import { monthlyAgg, monthlyAggComplete, currentMonthKey, sumLast, sumPrev, latestByKey, meanOf } from "@/lib/periods";
import {
  aggregateMarginPct,
  netBurnRate,
  runwayMonths,
  fmtRunway,
  latestCashBalance,
  churnStats,
  customerValue,
} from "@/lib/metrics";

const num = (v) => Number(v) || 0;
const sum = (arr, f) => (arr || []).reduce((s, x) => s + num(f(x)), 0);
// null means "not computable" and must render as such, never as 0 $.
const fmt$ = (v) => (v === null || v === undefined || !Number.isFinite(Number(v)) ? "—" : `${Math.round(v).toLocaleString("fr-CA")} $`);
const pctGap = (a, b) => {
  const base = Math.max(Math.abs(a), Math.abs(b));
  return base > 0 ? (Math.abs(a - b) / base) * 100 : 0;
};

/** status: "ok" | "warn" | "error" | "skip" */
function check(label, status, detail, expected, actual) {
  return { label, status, detail, expected, actual };
}

/**
 * Sum two independent sources over the months they BOTH cover completely.
 *
 * Comparing lifetime totals of two sources was the main source of false errors:
 * each file covers its own span (and its own rows inside that span), so
 * "commandes vs transactions" flagged a 120 % gap on data that was simply not
 * aligned. Only the shared complete months can be compared, and if there is no
 * shared month the comparison is refused rather than invented.
 */
function sharedMonths(rowsA, dateA, valA, rowsB, dateB, valB) {
  const a = monthlyAggComplete(rowsA, dateA, valA);
  const b = monthlyAggComplete(rowsB, dateB, valB);
  const mb = new Map(b.map((x) => [x.month, x.val]));
  const shared = a.filter((x) => mb.has(x.month)).map((x) => x.month);
  if (shared.length === 0) return null;
  const ma = new Map(a.map((x) => [x.month, x.val]));
  return {
    months: shared.length,
    label: `${shared[0]} → ${shared[shared.length - 1]}`,
    a: shared.reduce((s, m) => s + ma.get(m), 0),
    b: shared.reduce((s, m) => s + mb.get(m), 0),
  };
}

/** Level 2 — coherence cross-checks between independent data sources. */
export function runCoherenceChecks(d) {
  const { transactions = [], orders = [], customers = [], products = [], inventory = [], cashflow = [], campaigns = [], campaignDaily = [], expenses = [], payroll = [], employees = [] } = d;
  const out = [];

  // --- Revenue: orders vs income transactions, on complete months only ---
  const ordersRev = sum(orders, (o) => o.total);
  const revShared = sharedMonths(orders, "date", "total", transactions.filter((t) => t.type === "income"), "date", "amount");
  if (orders.length === 0 || transactions.length === 0) {
    out.push(check("CA des commandes vs revenus des transactions", "skip", "Une des deux sources est absente."));
  } else if (!revShared) {
    out.push(check("CA des commandes vs revenus des transactions", "skip", "Aucun mois complet couvert par les deux sources : comparaison impossible."));
  } else {
    const gap = pctGap(revShared.a, revShared.b);
    out.push(check(
      "CA des commandes vs revenus des transactions",
      gap <= 5 ? "ok" : gap <= 20 ? "warn" : "error",
      gap <= 5
        ? `Les deux sources concordent sur ${revShared.months} mois communs (${revShared.label}).`
        : `Écart de ${gap.toFixed(1)} % sur les ${revShared.months} mois communs (${revShared.label}) : une des deux sources ne contient qu'une partie des opérations de la période.`,
      `Commandes : ${fmt$(revShared.a)}`,
      `Transactions : ${fmt$(revShared.b)}`,
    ));
  }

  // --- Cashflow: sum of net flows vs closing - opening ---
  // Le solde ne se reconstitue que sur des jours CONSÉCUTIFS. Comparer la somme
  // de tous les flux nets au premier et au dernier solde d'une série trouée
  // garantissait un écart énorme, signalé comme erreur alors que seule la
  // couverture était partielle. On ne compare donc que les segments continus.
  if (cashflow.length < 2) {
    out.push(check("Flux de trésorerie vs variation du solde", "skip", "Moins de deux relevés de trésorerie."));
  } else {
    const cfAsc = [...cashflow].filter((c) => c.date).sort((a, b) => (a.date < b.date ? -1 : 1));
    const nextDay = (d) => new Date(new Date(d).getTime() + 86400000).toISOString().slice(0, 10);
    let netSum = 0;
    let delta = 0;
    let pairs = 0;
    for (let i = 1; i < cfAsc.length; i += 1) {
      if (nextDay(cfAsc[i - 1].date) !== String(cfAsc[i].date).slice(0, 10)) continue;
      netSum += num(cfAsc[i].net_cash_flow);
      delta += num(cfAsc[i].closing_cash) - num(cfAsc[i - 1].closing_cash);
      pairs += 1;
    }
    if (pairs === 0) {
      out.push(check(
        "Flux de trésorerie vs variation du solde",
        "skip",
        `Aucun jour consécutif dans les ${cfAsc.length} relevés : la variation du solde n'est pas reconstituable.`,
      ));
    } else {
      const gap = pctGap(netSum, delta);
      out.push(check(
        "Flux de trésorerie vs variation du solde",
        gap <= 2 ? "ok" : gap <= 10 ? "warn" : "error",
        gap <= 2
          ? `Les flux nets expliquent la variation du solde sur ${pairs} jours consécutifs vérifiés.`
          : `Écart de ${gap.toFixed(1)} % sur ${pairs} jours consécutifs : les flux nets ne concordent pas avec les soldes déclarés.`,
        `Somme des flux nets : ${fmt$(netSum)}`,
        `Variation du solde : ${fmt$(delta)}`,
      ));
    }
  }

  // --- Cash in vs cash out consistency per row ---
  if (cashflow.length > 0) {
    const bad = cashflow.filter((c) => {
      const expectedNet = num(c.cash_in) - num(c.cash_out);
      return Math.abs(expectedNet - num(c.net_cash_flow)) > Math.max(1, Math.abs(expectedNet) * 0.02);
    });
    out.push(check(
      "Cohérence entrées − sorties = flux net",
      bad.length === 0 ? "ok" : bad.length / cashflow.length < 0.05 ? "warn" : "error",
      bad.length === 0 ? `Vérifié sur ${cashflow.length} relevés.` : `${bad.length} relevés sur ${cashflow.length} où entrées − sorties ≠ flux net.`,
    ));
  }

  // --- Margin: orders margin vs unit price - cost ---
  const withMargin = orders.filter((o) => o.gross_margin != null && o.total != null && o.cost != null);
  if (withMargin.length === 0) {
    out.push(check("Marge des commandes vs total − coût", "skip", "Champs de marge ou de coût absents des commandes."));
  } else {
    const bad = withMargin.filter((o) => {
      const expected = num(o.total) - num(o.cost);
      return Math.abs(expected - num(o.gross_margin)) > Math.max(1, Math.abs(expected) * 0.05);
    });
    out.push(check(
      "Marge des commandes vs total − coût",
      bad.length === 0 ? "ok" : bad.length / withMargin.length < 0.05 ? "warn" : "error",
      bad.length === 0 ? `Vérifié sur ${withMargin.length} commandes.` : `${bad.length} commandes sur ${withMargin.length} où la marge importée ne correspond pas à total − coût.`,
    ));
  }

  // --- Orphan references ---
  const custIds = new Set(customers.map((c) => c.customer_id));
  const orphanOrders = customers.length > 0 ? orders.filter((o) => o.customer_id && !custIds.has(o.customer_id)) : [];
  if (customers.length === 0 || orders.length === 0) {
    out.push(check("Commandes rattachées à un client existant", "skip", "Clients ou commandes absents."));
  } else {
    out.push(check(
      "Commandes rattachées à un client existant",
      orphanOrders.length === 0 ? "ok" : "warn",
      orphanOrders.length === 0 ? `${orders.length} commandes rattachées.` : `${orphanOrders.length} commandes référencent un client absent du fichier clients : elles faussent la LTV et le churn.`,
    ));
  }

  const prodIds = new Set(products.map((p) => p.product_id));
  const orphanOrderProducts = products.length > 0 ? orders.filter((o) => o.product_id && !prodIds.has(o.product_id)) : [];
  const orphanInventory = products.length > 0 ? inventory.filter((i) => i.product_id && !prodIds.has(i.product_id)) : [];
  if (products.length === 0) {
    out.push(check("Produits référencés existants", "skip", "Fichier produits absent."));
  } else {
    const bad = orphanOrderProducts.length + orphanInventory.length;
    out.push(check(
      "Produits référencés existants",
      bad === 0 ? "ok" : "warn",
      bad === 0 ? `${products.length} produits, toutes références valides.` : `${orphanOrderProducts.length} commandes et ${orphanInventory.length} lignes d'inventaire référencent un produit inconnu.`,
    ));
  }

  const empIds = new Set(employees.map((e) => e.employee_id));
  if (employees.length === 0 || payroll.length === 0) {
    out.push(check("Paie rattachée à un employé existant", "skip", "Employés ou paie absents."));
  } else {
    const orphanPay = payroll.filter((p) => p.employee_id && !empIds.has(p.employee_id));
    out.push(check(
      "Paie rattachée à un employé existant",
      orphanPay.length === 0 ? "ok" : "warn",
      orphanPay.length === 0 ? `${payroll.length} lignes de paie rattachées.` : `${orphanPay.length} lignes de paie référencent un employé inconnu.`,
    ));
  }

  // --- Campaigns: totals vs daily rows ---
  if (campaigns.length === 0 || campaignDaily.length === 0) {
    out.push(check("Totaux de campagnes vs données quotidiennes", "skip", "Campagnes ou données quotidiennes absentes."));
  } else {
    // Le quotidien ne contient souvent que quelques jours par campagne : son
    // total ne peut pas égaler le total de la campagne. On ne compare donc que
    // les campagnes présentes dans les deux sources, et on refuse la
    // comparaison quand la couverture quotidienne est manifestement partielle.
    const dailyIds = new Set(campaignDaily.map((c) => c.campaign_id).filter(Boolean));
    const shared = campaigns.filter((c) => dailyIds.has(c.campaign_id));
    const totSpend = sum(shared, (c) => c.spend);
    const dailySpend = sum(campaignDaily.filter((c) => dailyIds.has(c.campaign_id)), (c) => c.spend);
    const daysPerCampaign = dailyIds.size > 0 ? campaignDaily.length / dailyIds.size : 0;
    if (shared.length === 0) {
      out.push(check("Totaux de campagnes vs données quotidiennes", "skip", "Aucune campagne commune aux deux sources."));
    } else if (daysPerCampaign < 15) {
      out.push(check(
        "Totaux de campagnes vs données quotidiennes",
        "skip",
        `Couverture quotidienne partielle (${daysPerCampaign.toFixed(1)} jour(s) par campagne en moyenne) : les totaux ne sont pas comparables. Le ROAS quotidien ne porte donc que sur les jours présents.`,
        `Campagnes concernées : ${shared.length}`,
        `Lignes quotidiennes : ${campaignDaily.length}`,
      ));
    } else {
      const gap = pctGap(totSpend, dailySpend);
      out.push(check(
        "Totaux de campagnes vs données quotidiennes",
        gap <= 5 ? "ok" : gap <= 25 ? "warn" : "error",
        gap <= 5 ? `Les deux sources concordent sur ${shared.length} campagnes communes.` : `Écart de ${gap.toFixed(1)} % : le ROAS et le CAC peuvent différer selon la source utilisée.`,
        `Campagnes : ${fmt$(totSpend)}`,
        `Quotidien : ${fmt$(dailySpend)}`,
      ));
    }
  }

  // --- Customer aggregates vs orders ---
  if (customers.length === 0 || orders.length === 0) {
    out.push(check("Revenu client cumulé vs commandes", "skip", "Clients ou commandes absents."));
  } else {
    // Le champ « revenu total » d'une fiche client couvre TOUTE la vie du client,
    // alors que les commandes importées ne couvrent qu'une période : un écart est
    // normal ici et ne doit pas être présenté comme une erreur de calcul.
    const custRev = sum(customers, (c) => c.total_revenue);
    const gap = pctGap(custRev, ordersRev);
    out.push(check(
      "Revenu client cumulé vs commandes",
      gap <= 5 ? "ok" : "warn",
      gap <= 5 ? "Les totaux clients correspondent aux commandes." : `Écart de ${gap.toFixed(1)} % : les fiches clients cumulent tout l'historique du client alors que les commandes importées ne couvrent qu'une période. Les calculs se basent sur les commandes.`,
      `Fiches clients : ${fmt$(custRev)}`,
      `Commandes : ${fmt$(ordersRev)}`,
    ));
  }

  // --- Expenses vs cash out ---
  if (expenses.length === 0 || cashflow.length === 0) {
    out.push(check("Dépenses vs sorties de trésorerie", "skip", "Dépenses ou trésorerie absentes."));
  } else {
    const shared = sharedMonths(expenses, "date", "amount", cashflow, "date", "cash_out");
    if (!shared) {
      out.push(check("Dépenses vs sorties de trésorerie", "skip", "Aucun mois complet couvert par les deux sources."));
    } else {
      const gap = pctGap(shared.a, shared.b);
      out.push(check(
        "Dépenses vs sorties de trésorerie",
        gap <= 15 ? "ok" : gap <= 40 ? "warn" : "error",
        gap <= 15
          ? `Ordres de grandeur cohérents sur ${shared.months} mois communs (${shared.label}).`
          : `Écart de ${gap.toFixed(1)} % sur les ${shared.months} mois communs (${shared.label}) : les sorties de trésorerie incluent probablement des achats non listés en dépenses (ou inversement).`,
        `Dépenses : ${fmt$(shared.a)}`,
        `Sorties de caisse : ${fmt$(shared.b)}`,
      ));
    }
  }

  return out;
}

/**
 * Level 0 — reconciliation: does the database hold exactly what the files contained?
 * Every later calculation is wrong if rows were silently lost at import time,
 * so this compares the import journal to the records actually stored.
 */
export function runReconciliation(imports = [], d = {}) {
  // EVERY entity that can be imported must be listed here. This check is the
  // only thing that catches rows disappearing after a successful import, and it
  // covered just 11 of the 18 importable entities: an unscoped delete wiped 500
  // imported ExternalSignal rows while the journal still reported them loaded,
  // and nothing flagged it because ExternalSignal was not in this map.
  const ENTITY_ROWS = {
    Transaction: d.transactions, Order: d.orders, Customer: d.customers,
    Product: d.products, Inventory: d.inventory, Cashflow: d.cashflow,
    Expense: d.expenses, Payroll: d.payroll, Employee: d.employees,
    Campaign: d.campaigns, CampaignDaily: d.campaignDaily,
    Supplier: d.suppliers, Purchase: d.purchases, Interaction: d.interactions,
    Competitor: d.competitors, Goal: d.goals, Event: d.events,
    ExternalSignal: d.externalSignals,
  };
  const out = [];

  const rejected = imports.filter((i) => num(i.rows_quarantined) > 0);
  const totalRejected = sum(rejected, (i) => i.rows_quarantined);
  out.push(check(
    "Lignes rejetées à l'import",
    totalRejected === 0 ? "ok" : "error",
    totalRejected === 0
      ? `Aucune ligne perdue sur ${imports.length} import(s).`
      : `${totalRejected} lignes n'ont pas été chargées (${rejected.map((i) => i.file_name).slice(0, 3).join(", ")}). Les totaux sont donc sous-évalués : corrigez et réimportez ces fichiers.`,
  ));

  const failed = imports.filter((i) => i.status === "echoue");
  if (failed.length > 0) {
    out.push(check(
      "Imports en échec",
      "error",
      `${failed.length} import(s) ont échoué : ${failed.map((i) => `${i.file_name} → ${i.entity_type || "type inconnu"}`).slice(0, 4).join(" · ")}`,
    ));
  }

  Object.entries(ENTITY_ROWS).forEach(([entity, rows]) => {
    const ims = imports.filter((i) => i.entity_type === entity && i.status === "complete");
    if (ims.length === 0 || !rows) return;
    const declared = sum(ims, (i) => i.rows_processed);
    const stored = rows.length;
    const gap = Math.abs(declared - stored);
    out.push(check(
      `${entity} — journal d'import vs base de données`,
      gap === 0 ? "ok" : gap / Math.max(declared, 1) < 0.02 ? "warn" : "error",
      gap === 0
        ? `${stored} lignes importées, ${stored} lignes présentes.`
        : `Écart de ${gap} lignes entre ce qui a été importé et ce qui est stocké (suppression manuelle ou double comptage).`,
      `Importé : ${declared}`,
      `En base : ${stored}`,
    ));
  });

  return out;
}

/** Level 2b — import quality: missing, aberrant or duplicated data. */
export function runQualityChecks(d) {
  const sets = [
    { name: "Transactions", rows: d.transactions, date: "date", amount: "amount", key: null },
    { name: "Commandes", rows: d.orders, date: "date", amount: "total", key: "order_id" },
    { name: "Clients", rows: d.customers, date: "acquisition_date", amount: null, key: "customer_id" },
    { name: "Trésorerie", rows: d.cashflow, date: "date", amount: "closing_cash", key: "date" },
    { name: "Dépenses", rows: d.expenses, date: "date", amount: "amount", key: "expense_id" },
    { name: "Inventaire", rows: d.inventory, date: "date", amount: null, key: null },
    { name: "Campagnes (quotidien)", rows: d.campaignDaily, date: "date", amount: "spend", key: null },
    { name: "Paie", rows: d.payroll, date: "period", amount: "total_cost", key: "payroll_id" },
  ];
  const today = new Date().toISOString().slice(0, 10);
  const cm = currentMonthKey();

  return sets.map((s) => {
    const rows = s.rows || [];
    if (rows.length === 0) return { name: s.name, rows: 0, status: "skip", issues: ["Aucune donnée importée."] };

    const issues = [];
    const missingDate = rows.filter((r) => !r[s.date]).length;
    if (missingDate > 0) issues.push(`${missingDate} lignes sans date`);

    const future = rows.filter((r) => r[s.date] && String(r[s.date]).slice(0, 10) > today).length;
    if (future > 0) issues.push(`${future} lignes datées dans le futur`);

    if (s.amount) {
      const zero = rows.filter((r) => !r[s.amount]).length;
      if (zero > 0) issues.push(`${zero} lignes avec ${s.amount} nul ou absent`);
      const values = rows.map((r) => Math.abs(num(r[s.amount]))).filter((v) => v > 0);
      const mean = meanOf(values);
      const outliers = values.filter((v) => mean > 0 && v > mean * 20).length;
      if (outliers > 0) issues.push(`${outliers} valeurs aberrantes (> 20× la moyenne)`);
    }

    if (s.key) {
      const seen = new Set();
      let dup = 0;
      rows.forEach((r) => {
        const k = r[s.key];
        if (!k) return;
        if (seen.has(k)) dup += 1;
        else seen.add(k);
      });
      if (dup > 0) issues.push(`${dup} doublons sur ${s.key} (possible double import)`);
    }

    // Coverage: months present, and whether the in-progress month is included.
    const months = monthlyAgg(rows, s.date, s.amount || s.date, "count");
    const hasPartial = months.some((m) => m.month === cm);
    const coverage = months.length > 0 ? `${months[0].month} → ${months[months.length - 1].month} (${months.length} mois)` : "période indéterminée";

    // Gaps in the monthly series — a missing month silently distorts every trend.
    let gaps = 0;
    const complete = months.filter((m) => m.month !== cm);
    for (let i = 1; i < complete.length; i += 1) {
      const [y1, m1] = complete[i - 1].month.split("-").map(Number);
      const [y2, m2] = complete[i].month.split("-").map(Number);
      gaps += (y2 - y1) * 12 + (m2 - m1) - 1;
    }
    if (gaps > 0) issues.push(`${gaps} mois manquants dans la série`);

    const status = issues.some((i) => i.includes("doublons") || i.includes("sans date")) ? "error" : issues.length > 0 ? "warn" : "ok";
    return {
      name: s.name,
      rows: rows.length,
      status,
      coverage,
      partialMonth: hasPartial ? cm : null,
      issues: issues.length > 0 ? issues : ["Aucune anomalie détectée."],
    };
  });
}

/** Level 1 — traceability: formula, source, period and intermediate values per metric. */
export function buildMetricTraces(d) {
  const { transactions = [], orders = [], customers = [], products = [], inventory = [], cashflow = [], campaignDaily = [], campaigns = [] } = d;
  const traces = [];

  const incomes = transactions.filter((t) => t.type === "income");
  const txnExp = transactions.filter((t) => t.type === "expense");
  const revM = monthlyAggComplete(incomes, "date", "amount");
  const expM = monthlyAggComplete(txnExp, "date", "amount");
  const rev3 = sumLast(revM, 3);
  const exp3 = sumLast(expM, 3);

  const margin3 = aggregateMarginPct(revM, expM, 3);
  traces.push({
    domain: "Finance",
    metric: "Marge nette (3 mois)",
    formula: "(revenus − dépenses) ÷ revenus, agrégé sur les 3 derniers mois complets",
    source: `Transactions — ${incomes.length} revenus, ${txnExp.length} dépenses`,
    period: revM.length >= 3 ? revM.slice(-3).map((m) => m.month).join(", ") : "—",
    steps: [
      ["Revenus 3 mois", fmt$(rev3)],
      ["Dépenses 3 mois", fmt$(exp3)],
      ["Marge", margin3 !== null ? `${margin3.toFixed(1)} %` : "—"],
    ],
    note: "Marge agrégée sur le trimestre, et non moyenne des marges mensuelles : un mois à 2 000 $ de revenus ne doit pas peser autant qu'un mois à 100 000 $. Nette et non brute : toutes les dépenses sont déduites, pas seulement le coût des ventes. Le mois en cours est exclu.",
  });

  const cfSorted = [...cashflow].sort((a, b) => ((a.date || "") < (b.date || "") ? 1 : -1));
  const latestCash = latestCashBalance(cashflow);
  const burn = netBurnRate(revM, expM, 3);
  const runway = latestCash === null ? null : runwayMonths(latestCash, burn);
  traces.push({
    domain: "Trésorerie",
    metric: "Autonomie (runway)",
    formula: "solde de clôture le plus récent ÷ consommation NETTE de trésorerie par mois (dépenses − revenus, sur 3 mois)",
    source: `Trésorerie — ${cashflow.length} relevés quotidiens`,
    period: cfSorted[0]?.date ? `solde au ${cfSorted[0].date}` : "—",
    steps: [
      ["Solde actuel", fmt$(latestCash)],
      ["Revenus 3 mois", fmt$(rev3)],
      ["Dépenses 3 mois", fmt$(exp3)],
      ["Burn net / mois", burn === null ? "—" : burn === 0 ? "aucun (autofinancée)" : fmt$(burn)],
      ["Autonomie", fmtRunway(runway)],
    ],
    note: "Le burn est NET : une entreprise qui encaisse plus qu'elle ne dépense n'a pas de problème d'autonomie. Comparer le solde aux dépenses brutes déclenchait une alerte critique sur une entreprise rentable. Le solde vient du fichier trésorerie importé, jamais du cumul des marges.",
  });

  const oRevM = monthlyAggComplete(orders, "date", "total");
  const oCntM = monthlyAggComplete(orders, "date", "total", "count");
  const orev3 = sumLast(oRevM, 3);
  // Refuses to compare unless BOTH 3-month windows are fully covered: summing
  // 3 months against the single month preceding them showed +200% growth on a
  // perfectly flat business.
  const orevPrev3 = sumPrev(oRevM, 3);
  traces.push({
    domain: "Ventes",
    metric: "Évolution du CA (3 mois)",
    formula: "(CA des 3 derniers mois − CA des 3 mois précédents) ÷ CA des 3 mois précédents",
    source: `Commandes — ${orders.length} lignes`,
    period: oRevM.length >= 6 ? `${oRevM.slice(-6)[0].month} → ${oRevM[oRevM.length - 1].month}` : "—",
    steps: [
      ["CA 3 derniers mois", fmt$(orev3)],
      ["CA 3 mois précédents", fmt$(orevPrev3)],
      ["Variation", orevPrev3 !== null && orevPrev3 > 0 && orev3 !== null ? `${(((orev3 - orevPrev3) / orevPrev3) * 100).toFixed(1)} %` : "—"],
    ],
    note: oRevM.length < 6
      ? `Seulement ${oRevM.length} mois complets disponibles : 6 sont nécessaires pour comparer deux trimestres. Aucune variation n'est affichée plutôt qu'une variation calculée sur une fenêtre incomplète.`
      : "Les mois sans aucune commande comptent pour 0 et ne sont pas sautés : sinon la comparaison porterait sur des mois non contigus.",
  });

  const lastCnt = oCntM.length ? oCntM[oCntM.length - 1] : null;
  const lastRev = oRevM.length ? oRevM[oRevM.length - 1] : null;
  traces.push({
    domain: "Ventes",
    metric: "Panier moyen",
    formula: "CA du dernier mois complet ÷ nombre de commandes du même mois",
    source: `Commandes — ${orders.length} lignes`,
    period: lastCnt?.month || "—",
    steps: [
      ["CA du mois", lastRev ? fmt$(lastRev.val) : "—"],
      ["Commandes", lastCnt ? String(lastCnt.val) : "—"],
      ["Panier moyen", lastCnt?.val ? fmt$(lastRev.val / lastCnt.val) : "—"],
    ],
  });

  const spendM = monthlyAggComplete(campaignDaily, "date", "spend");
  const crevM = monthlyAggComplete(campaignDaily, "date", "revenue");
  const s3 = sumLast(spendM, 3);
  const r3 = sumLast(crevM, 3);
  traces.push({
    domain: "Marketing",
    metric: "ROAS (3 mois)",
    formula: "revenus publicitaires ÷ dépenses publicitaires, sur les 3 derniers mois complets",
    source: s3 > 0 ? `Campagnes quotidiennes — ${campaignDaily.length} lignes` : `Totaux de campagnes — ${campaigns.length} campagnes`,
    period: spendM.length ? spendM.slice(-3).map((m) => m.month).join(", ") : "—",
    steps: [
      ["Dépenses", fmt$(s3 > 0 ? s3 : sum(campaigns, (c) => c.spend))],
      ["Revenus", fmt$(s3 > 0 ? r3 : sum(campaigns, (c) => c.revenue))],
      ["ROAS", s3 > 0 ? `${(r3 / s3).toFixed(2)}x` : sum(campaigns, (c) => c.spend) > 0 ? `${(sum(campaigns, (c) => c.revenue) / sum(campaigns, (c) => c.spend)).toFixed(2)}x` : "—"],
    ],
    note: "Les données quotidiennes sont utilisées en priorité car elles seules sont datables.",
  });

  const latestInv = latestByKey(inventory, "product_id", "date");
  const dormant = latestInv.filter((i) => i.stock_status === "dormant").length;
  const rupture = latestInv.filter((i) => ["rupture", "proche_rupture"].includes(i.stock_status)).length;
  traces.push({
    domain: "Opérations",
    metric: "Santé du stock",
    formula: "(produits dormants + en rupture) ÷ produits suivis, sur le dernier instantané de chaque produit",
    source: `Inventaire — ${inventory.length} lignes, ${latestInv.length} produits suivis`,
    period: latestInv.length ? "dernier relevé par produit" : "—",
    steps: [
      ["Produits suivis", String(latestInv.length)],
      ["Ruptures", String(rupture)],
      ["Dormants", String(dormant)],
      ["Ratio problème", latestInv.length ? `${(((dormant + rupture) / latestInv.length) * 100).toFixed(1)} %` : "—"],
    ],
    note: "Un seul instantané par produit : compter tout l'historique multiplierait le même problème.",
  });

  const churn = churnStats(customers, orders);
  traces.push({
    domain: "Clients",
    metric: "Clients perdus (cumul)",
    formula: "(clients au statut inactif + perdu) ÷ total des clients",
    source: `Clients — ${customers.length} fiches`,
    period: "état actuel des fiches",
    steps: [
      ["Total clients", String(churn.total)],
      ["Actifs", String(churn.active)],
      ["Inactifs / perdus", String(churn.churned)],
      ["Dont actifs à risque (non comptés)", String(churn.atRisk)],
      ["Part cumulée perdue", churn.rate !== null ? `${churn.rate.toFixed(1)} %` : "—"],
    ],
    note: "Un client « à risque » achète encore : il n'entre pas dans ce compte. Attention à la lecture : c'est une part CUMULÉE depuis le début, pas un taux par période. Elle ne peut que monter à mesure que la base vieillit. Pour piloter, utilisez l'indicateur d'inactivité ci-dessous.",
  });

  traces.push({
    domain: "Clients",
    metric: `Inactifs depuis ${churn.inactiveMonths} mois`,
    formula: "clients ayant déjà commandé mais sans aucune commande sur la fenêtre ÷ clients ayant déjà commandé",
    source: `Commandes — ${orders.length} lignes`,
    period: `${churn.inactiveMonths} derniers mois`,
    steps: [
      ["Clients ayant déjà commandé", churn.buyers !== null ? String(churn.buyers) : "—"],
      ["Sans commande sur la fenêtre", churn.lapsed !== null ? String(churn.lapsed) : "—"],
      ["Taux d'inactivité", churn.behaviourRate !== null ? `${churn.behaviourRate.toFixed(1)} %` : "—"],
    ],
    note: "Mesuré sur les achats réels, pas sur le champ « statut » du fichier clients. C'est le seul des deux qui peut s'améliorer et se comparer d'une période à l'autre.",
  });

  const value = customerValue(orders, customers, margin3);
  traces.push({
    domain: "Clients",
    metric: "Revenu moyen par client",
    formula: "CA total des commandes ÷ nombre de clients ayant réellement commandé",
    source: `Commandes (${orders.length}) et clients (${customers.length})`,
    period: "historique complet",
    steps: [
      ["CA total", fmt$(value.totalRevenue)],
      ["Clients ayant commandé", String(value.buyers)],
      ["Revenu moyen / client", fmt$(value.avgRevenue)],
      ["Marge appliquée", margin3 !== null ? `${margin3.toFixed(1)} %` : "—"],
      ["LTV (revenu × marge)", fmt$(value.ltv)],
    ],
    note: "Le numérateur couvre tous les acheteurs, donc le dénominateur aussi. Diviser le CA de TOUS les clients par les seuls clients ACTIFS gonflait le chiffre de 1/(part d'actifs) — le double quand la moitié de la base a churné. Une LTV est une valeur, pas un chiffre d'affaires : la marge est appliquée.",
  });

  traces.push({
    domain: "Opérations",
    metric: "Produits à réapprovisionner",
    formula: "stock du dernier relevé ≤ seuil de réapprovisionnement du produit",
    source: `Produits (${products.length}) et inventaire (${inventory.length})`,
    period: "dernier relevé par produit",
    steps: [
      ["Produits avec seuil défini", String(products.filter((p) => p.reorder_point).length)],
      ["Sous le seuil", String(products.filter((p) => {
        if (!p.reorder_point) return false;
        const snap = latestInv.find((i) => i.product_id === p.product_id);
        const stock = snap && snap.closing_stock != null ? num(snap.closing_stock) : num(p.inventory_level);
        return stock <= p.reorder_point;
      }).length)],
    ],
  });

  return traces;
}