// Shared business context builder — used by analyzeBusiness, chatAssistant, generateReport
// Extracts the company + all data sources and produces a compact context string for the LLM.

async function safeList(entity, ...args) {
  try {
    return await entity.list(...args);
  } catch {
    return [];
  }
}

const PAGE = 500;

/**
 * Read a source in full, page by page.
 *
 * Every figure in this context is an AGGREGATE, so a truncated read does not
 * merely omit rows — it changes the number the AI reports. A single list() call
 * caps at 500 rows, so the previous `list("-date", 500)` quietly rewrote the
 * totals of any company past that size, and the AI then contradicted the
 * dashboards it was supposed to explain.
 *
 * `truncated` is surfaced in the prompt rather than hidden: an AI told its data
 * is partial can say so; one that is not told invents confident conclusions.
 */
async function listAll(entity, sort = "-created_date", maxPages = 24) {
  const out = [];
  let truncated = false;
  for (let page = 0; page < maxPages; page += 1) {
    let batch;
    try {
      batch = await entity.list(sort, PAGE, page * PAGE);
    } catch {
      break;
    }
    out.push(...(batch || []));
    if (!batch || batch.length < PAGE) return { rows: out, truncated: false };
    if (page === maxPages - 1) truncated = true;
  }
  return { rows: out, truncated };
}

function round(n) {
  return Math.round(n || 0);
}

function monthlySum(items, dateField, valueField) {
  const byMonth = {};
  items.forEach((item) => {
    const m = (item[dateField] || "").slice(0, 7);
    if (!m) return;
    byMonth[m] = (byMonth[m] || 0) + (Number(item[valueField]) || 0);
  });
  return Object.entries(byMonth).sort((a, b) => (a[0] < b[0] ? 1 : -1));
}

export async function buildBusinessContext(base44) {
  const companies = await base44.entities.Company.list();
  const company = companies && companies[0] ? companies[0] : null;

  // Fetch all data sources. The ones that drive totals are read in full;
  // the rest are recent-N lists used only as qualitative context.
  const truncatedSources = [];
  const readAll = async (entity, label, sort) => {
    const { rows, truncated } = await listAll(entity, sort);
    if (truncated) truncatedSources.push(label);
    return rows;
  };

  const transactions = await readAll(base44.entities.Transaction, "transactions", "-date");
  const orders = await readAll(base44.entities.Order, "commandes", "-date");
  const customers = await readAll(base44.entities.Customer, "clients", "-created_date");
  const products = await readAll(base44.entities.Product, "produits", "-created_date");
  const inventory = await readAll(base44.entities.Inventory, "inventaire", "-date");
  // These were read with a small cap (100–500 rows) while each source holds
  // thousands: every total built from them — coût paie, dépenses, trésorerie,
  // achats, ROAS, taux de plaintes — was computed on a fraction of the data and
  // the AI reported figures far below reality. They feed aggregates, so they
  // must be read in full like the sources above.
  const suppliers = await readAll(base44.entities.Supplier, "fournisseurs", "-created_date");
  const purchases = await readAll(base44.entities.Purchase, "achats", "-date");
  const campaigns = await readAll(base44.entities.Campaign, "campagnes", "-created_date");
  const campaignDaily = await readAll(base44.entities.CampaignDaily, "campagnes quotidiennes", "-date");
  const employees = await readAll(base44.entities.Employee, "employés", "-created_date");
  const payroll = await readAll(base44.entities.Payroll, "paie", "-period");
  const expenses = await readAll(base44.entities.Expense, "dépenses", "-date");
  const cashflow = await readAll(base44.entities.Cashflow, "trésorerie", "-date");
  const interactions = await readAll(base44.entities.Interaction, "interactions", "-date");
  const competitors = await readAll(base44.entities.Competitor, "concurrents", "-created_date");
  const goals = await readAll(base44.entities.Goal, "objectifs", "-created_date");
  const events = await readAll(base44.entities.Event, "événements", "-date");
  const kpis = await safeList(base44.entities.Kpi);
  const anomalies = await safeList(base44.entities.Anomaly, "-created_date", 20);
  const risks = await safeList(base44.entities.Risk);
  const opportunities = await safeList(base44.entities.Opportunity);
  const recommendations = await safeList(base44.entities.Recommendation, "-created_date", 20);
  const tasks = await safeList(base44.entities.Task, "-created_date", 30);

  // === FINANCE (transactions) ===
  const INCOME_TYPES = ["income", "entree", "credit", "revenu", "encaissement", "vente", "ventes", "recette", "recettes", "revenue"];
  const isIncome = (t) => {
    const s = String(t.type || "").toLowerCase().trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    return INCOME_TYPES.includes(s);
  };
  const isExpense = (t) => !isIncome(t);
  
  const incomes = transactions.filter(isIncome);
  const txnExpenses = transactions.filter(isExpense);
  const totalIncome = incomes.reduce((s, t) => s + Math.abs(t.amount || 0), 0);
  const totalExpenses = txnExpenses.reduce((s, t) => s + Math.abs(t.amount || 0), 0);
  // NOTE: cumulative over the whole imported history, and NET (all expenses
  // deducted, not just cost of goods). The screens show a 3-month aggregated
  // margin, so the two figures answer different questions — the prompt below
  // labels this one explicitly so the AI does not present it as "the" margin.
  const grossMargin = totalIncome - totalExpenses;
  const marginPct = totalIncome > 0 ? Math.round((grossMargin / totalIncome) * 100) : 0;

  const txnMonthly = monthlySum(transactions, "date", "amount");
  const txnMonthlyStr = txnMonthly.slice(0, 12).map(([m, v]) => `${m}: ${round(v)} $`).join("\n");

  const expByCat = {};
  txnExpenses.forEach((t) => {
    const c = t.category || "Autre";
    expByCat[c] = (expByCat[c] || 0) + (t.amount || 0);
  });
  const topExpCats = Object.entries(expByCat).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([c, v]) => `${c}: ${round(v)} $`).join("\n");

  // === VENTES (orders) ===
  const orderRevenue = orders.reduce((s, o) => s + (Number(o.total) || Number(o.revenue) || 0), 0);
  const orderCount = orders.length;
  const aov = orderCount > 0 ? Math.round(orderRevenue / orderCount) : 0;
  const returns = orders.filter((o) => o.return_status && o.return_status !== "aucun");
  const returnRate = orderCount > 0 ? Math.round((returns.length / orderCount) * 100) : 0;

  const orderMonthly = monthlySum(orders, "date", "total");
  const orderMonthlyStr = orderMonthly.slice(0, 12).map(([m, v]) => `${m}: ${round(v)} $`).join("\n");

  const byChannel = {};
  orders.forEach((o) => {
    const c = o.channel || "Autre";
    byChannel[c] = (byChannel[c] || 0) + (Number(o.total) || Number(o.revenue) || 0);
  });
  const channelStr = Object.entries(byChannel).sort((a, b) => b[1] - a[1]).map(([c, v]) => `${c}: ${round(v)} $`).join("\n");

  // === CLIENTS ===
  const totalCustomers = customers.length;
  const bySegment = {};
  customers.forEach((c) => {
    const s = c.segment || "non_precise";
    bySegment[s] = (bySegment[s] || 0) + 1;
  });
  const segmentStr = Object.entries(bySegment).map(([s, v]) => `${s}: ${v}`).join(", ");

  // Same churn definition as every screen: STATUS only. Counting "a_risque"
  // here made the AI reports quote a higher churn than the KPI page showed for
  // the same customers, which destroys trust in both.
  const inactiveCustomers = customers.filter((c) => c.status === "inactif" || c.status === "perdu");
  const atRiskCustomers = customers.filter((c) => c.status === "actif" && Number(c.churn_risk) >= 0.7);
  const churnRate = totalCustomers > 0 ? Math.round((inactiveCustomers.length / totalCustomers) * 100) : 0;

  // Concentration computed from ORDERS, not from the customer file's
  // total_revenue column: the audit page already warns that this column goes
  // stale, and the app's own screens use orders. Falls back to the column only
  // when there are no orders at all.
  const revByCustomer = {};
  orders.forEach((o) => {
    if (!o.customer_id) return;
    revByCustomer[o.customer_id] = (revByCustomer[o.customer_id] || 0) + (Number(o.total) || 0);
  });
  const useOrderRevenue = Object.keys(revByCustomer).length > 0;
  const custRevenue = (c) => (useOrderRevenue ? revByCustomer[c.customer_id] || 0 : Number(c.total_revenue) || 0);
  const sortedByRevenue = [...customers].sort((a, b) => custRevenue(b) - custRevenue(a));
  const top5Revenue = sortedByRevenue.slice(0, 5).reduce((s, c) => s + custRevenue(c), 0);
  const allCustomerRevenue = customers.reduce((s, c) => s + custRevenue(c), 0);
  const concentration = allCustomerRevenue > 0 ? Math.round((top5Revenue / allCustomerRevenue) * 100) : 0;
  const topCustomersStr = sortedByRevenue.slice(0, 5).map((c) => `${c.customer_id || c.first_name || "?"}: ${round(custRevenue(c))} $ (${c.segment || "?"})`).join("\n");

  // === PRODUITS ===
  const totalProducts = products.length;
  const lowMarginProducts = products.filter((p) => (p.gross_margin || 0) < 15);
  const topProducts = [...products].sort((a, b) => (b.monthly_sales || 0) - (a.monthly_sales || 0)).slice(0, 5);
  const dormantProducts = products.filter((p) => (p.inventory_level || 0) > 20 && (p.monthly_sales || 0) < 5);
  const nearRupture = products.filter((p) => (p.inventory_level || 0) <= (p.reorder_point || 0) && p.reorder_point > 0);

  const topProductsStr = topProducts.map((p) => `${p.product_name || p.product_id}: ${p.monthly_sales || 0} ventes/mois, marge ${round(p.gross_margin || 0)}%, stock ${p.inventory_level || 0}`).join("\n");
  const dormantStr = dormantProducts.slice(0, 5).map((p) => `${p.product_name || p.product_id}: stock ${p.inventory_level}, ventes ${p.monthly_sales}/mois`).join("\n");
  const ruptureStr = nearRupture.slice(0, 5).map((p) => `${p.product_name || p.product_id}: stock ${p.inventory_level}, seuil ${p.reorder_point}`).join("\n");

  // === INVENTAIRE ===
  const stockStatusDist = {};
  inventory.forEach((i) => {
    const s = i.stock_status || "non_precise";
    stockStatusDist[s] = (stockStatusDist[s] || 0) + 1;
  });
  const stockDistStr = Object.entries(stockStatusDist).map(([s, v]) => `${s}: ${v}`).join(", ");
  const inventoryValue = inventory.reduce((s, i) => s + (Number(i.inventory_value) || 0), 0);

  // === FOURNISSEURS ===
  const totalSuppliers = suppliers.length;
  const problematicSuppliers = suppliers.filter((s) => s.status === "problematique" || (s.average_delivery_days || 0) > 21 || (s.quality_score || 100) < 70);
  const supplierStr = suppliers.slice(0, 10).map((s) => {
    const pct = s.price_change_last_12_months || 0;
    return `${s.supplier_name}: délai ${s.average_delivery_days || "?"}j, qualité ${s.quality_score || "?"}/100, prix ${pct > 0 ? "+" : ""}${round(pct)}%, ${s.status}`;
  }).join("\n");

  // === ACHATS ===
  const totalPurchaseCost = purchases.reduce((s, p) => s + (Number(p.total_cost) || 0), 0);
  const avgDelay = purchases.length > 0 ? Math.round(purchases.reduce((s, p) => s + (p.delay_days || 0), 0) / purchases.length) : 0;
  const delayedPurchases = purchases.filter((p) => (p.delay_days || 0) > 5);
  const purchaseMonthly = monthlySum(purchases, "date", "total_cost");
  const purchaseMonthlyStr = purchaseMonthly.slice(0, 8).map(([m, v]) => `${m}: ${round(v)} $`).join("\n");

  // === MARKETING (campagnes) ===
  const totalSpend = campaigns.reduce((s, c) => s + (Number(c.spend) || 0), 0);
  const totalCampaignRevenue = campaigns.reduce((s, c) => s + (Number(c.revenue) || 0), 0);
  const totalNewCustomers = campaigns.reduce((s, c) => s + (Number(c.new_customers) || 0), 0);
  const overallRoas = totalSpend > 0 ? Math.round((totalCampaignRevenue / totalSpend) * 100) / 100 : 0;
  const overallRoi = totalSpend > 0 ? Math.round(((totalCampaignRevenue - totalSpend) / totalSpend) * 100) : 0;
  const overallCac = totalNewCustomers > 0 ? Math.round(totalSpend / totalNewCustomers) : 0;

  const campaignByChannel = {};
  campaigns.forEach((c) => {
    const ch = c.channel || "Autre";
    if (!campaignByChannel[ch]) campaignByChannel[ch] = { spend: 0, revenue: 0, conversions: 0, new_customers: 0 };
    campaignByChannel[ch].spend += Number(c.spend) || 0;
    campaignByChannel[ch].revenue += Number(c.revenue) || 0;
    campaignByChannel[ch].conversions += Number(c.conversions) || 0;
    campaignByChannel[ch].new_customers += Number(c.new_customers) || 0;
  });
  const channelMarketingStr = Object.entries(campaignByChannel).map(([ch, v]) => {
    const roas = v.spend > 0 ? (v.revenue / v.spend).toFixed(1) : "—";
    const roi = v.spend > 0 ? Math.round(((v.revenue - v.spend) / v.spend) * 100) : "—";
    const cac = v.new_customers > 0 ? Math.round(v.spend / v.new_customers) : "—";
    return `${ch}: dépenses ${round(v.spend)} $, revenus ${round(v.revenue)} $, ROAS ${roas}, ROI ${roi}%, CAC ${cac} $`;
  }).join("\n");

  const worstCampaigns = [...campaigns].filter((c) => c.spend > 0).sort((a, b) => {
    const ra = (b.revenue || 0) / (b.spend || 1);
    const rb = (a.revenue || 0) / (a.spend || 1);
    return ra - rb;
  }).slice(0, 3);
  const worstCampaignsStr2 = worstCampaigns.map((c) => {
    const roas = c.spend > 0 ? ((c.revenue || 0) / c.spend).toFixed(1) : "—";
    const roi = c.spend > 0 ? Math.round((((c.revenue || 0) - c.spend) / c.spend) * 100) : "—";
    return `${c.campaign_name}: dépenses ${round(c.spend)} $, revenus ${round(c.revenue || 0)} $, ROAS ${roas}, ROI ${roi}%`;
  }).join("\n");

  // Marketing daily trend
  const dailyMonthly = monthlySum(campaignDaily, "date", "spend");
  const dailyMonthlyRev = monthlySum(campaignDaily, "date", "revenue");
  const spendTrendStr = dailyMonthly.slice(0, 8).map(([m, v]) => `${m}: ${round(v)} $`).join("\n");

  // === PAIE ===
  const totalPayrollCost = payroll.reduce((s, p) => s + (Number(p.total_cost) || 0), 0);
  const payrollByPeriod = {};
  payroll.forEach((p) => {
    const per = p.period || (p.payroll_id || "").slice(0, 7);
    payrollByPeriod[per] = (payrollByPeriod[per] || 0) + (Number(p.total_cost) || 0);
  });
  const payrollTrendStr = Object.entries(payrollByPeriod).sort((a, b) => (a[0] < b[0] ? 1 : -1)).slice(0, 8).map(([m, v]) => `${m}: ${round(v)} $`).join("\n");

  // === DÉPENSES ===
  const totalExpensesAmount = expenses.reduce((s, e) => s + (Number(e.amount) || 0), 0);
  const recurringExpenses = expenses.filter((e) => e.recurring);
  const recurringByCat = {};
  recurringExpenses.forEach((e) => {
    const c = e.category || e.description || "Autre";
    recurringByCat[c] = (recurringByCat[c] || 0) + (Number(e.amount) || 0);
  });
  const recurringStr = Object.entries(recurringByCat).sort((a, b) => b[1] - a[1]).map(([c, v]) => `${c}: ${round(v)} $/mois`).join("\n");

  // === TRÉSORERIE ===
  const latestCashflow = cashflow[0];
  const currentCash = latestCashflow ? latestCashflow.closing_cash : 0;
  const cashflowMonthly = monthlySum(cashflow, "date", "net_cash_flow");
  const cashflowTrendStr = cashflowMonthly.slice(0, 8).map(([m, v]) => `${m}: ${round(v)} $`).join("\n");

  // === INTERACTIONS CLIENTS ===
  const totalInteractions = interactions.length;
  const complaints = interactions.filter((i) => i.type === "plainte" || i.type === "retour" || i.sentiment === "negatif" || i.sentiment === "tres_negatif");
  const complaintRate = totalInteractions > 0 ? Math.round((complaints.length / totalInteractions) * 100) : 0;
  const avgSatisfaction = totalInteractions > 0 ? Math.round(interactions.reduce((s, i) => s + (Number(i.satisfaction_score) || 0), 0) / totalInteractions) : 0;
  const complaintMonthly = monthlySum(interactions.filter((i) => i.type === "plainte"), "date", "satisfaction_score");

  // === CONCURRENTS ===
  const competitorStr = competitors.slice(0, 8).map((c) => `${c.name}: ${c.market_position || "?"}, ${c.price_position || "?"}, rating ${c.average_rating || "?"}, CA estimé ${round(c.estimated_revenue || 0)} $`).join("\n");

  // === OBJECTIFS ===
  const goalStr = goals.map((g) => `${g.domain}/${g.metric}: cible ${g.target} ${g.period || ""}, priorité ${g.priority || "?"}`).join("\n");

  // === ÉVÉNEMENTS ===
  const eventStr = events.slice(0, 15).map((e) => `${e.date}: ${e.event_type} — ${e.description || ""} (impact: ${e.impact_area || "?"})`).join("\n");

  // === EMPLOYÉS ===
  const activeEmployees = employees.filter((e) => e.status === "actif");

  // === Build context string ===
  const companyProfile = company
    ? `Entreprise: ${company.name}
Secteur: ${company.sector || "non précisé"}
Localisation: ${company.location || "non précisée"}
Employés: ${company.employee_count || activeEmployees.length || "non précisé"}
Modèle: ${company.business_model || "non précisé"}
Produits/services: ${(company.products || "")} ${(company.services || "")}
Clientèle: ${company.clientele || "non précisée"}
Objectifs: ${(company.objectives || []).join(", ") || "non précisés"}`
    : "Aucune entreprise configurée.";

  // transactions.length === 0 makes totalIncome/totalExpenses/grossMargin all
  // 0 by construction (sum of nothing), not a measured "0% margin" — without
  // this marker the headline read "Marge nette cumulée: 0 $ (0%)" right next
  // to "Total transactions: 0", and the model could present a genuine absence
  // of data as a fact about the business (sec16 of the audit: never let a
  // conclusion rest on an absent figure).
  const financeSection = transactions.length === 0
    ? "Total transactions: 0\nAucune transaction importée — revenus, dépenses et marge non mesurables (pas \"nuls\", non disponibles)."
    : `Total transactions: ${transactions.length}
Revenus totaux: ${round(totalIncome)} $
Dépenses totales: ${round(totalExpenses)} $
Marge nette cumulée sur tout l'historique importé: ${round(grossMargin)} $ (${marginPct}%) — les écrans affichent la marge agrégée des 3 derniers mois complets, qui peut légitimement différer de ce cumul
Évolution mensuelle (12 derniers mois):
${txnMonthlyStr || "insuffisant"}
Top catégories de dépenses:
${topExpCats || "insuffisant"}`;

  // Same principle as financeSection: 0 commandes ne veut pas dire panier
  // moyen de 0 $, ça veut dire panier moyen non mesurable.
  const salesSection = orderCount === 0
    ? "Commandes: 0\nAucune commande importée — revenu commandes, panier moyen et taux de retour non mesurables (pas \"nuls\", non disponibles)."
    : `Commandes: ${orderCount}
Revenu commandes: ${round(orderRevenue)} $
Panier moyen: ${aov} $
Taux de retour: ${returnRate}%
Évolution mensuelle:
${orderMonthlyStr || "insuffisant"}
Par canal:
${channelStr || "insuffisant"}`;

  const customerSection = `Total clients: ${totalCustomers}
Segments: ${segmentStr || "insuffisant"}
Taux de churn (clients au statut inactif ou perdu, cumulé sur toute la base): ${churnRate}% — ${atRiskCustomers.length} clients actifs sont par ailleurs à risque élevé de départ, sans être encore perdus
Concentration top 5: ${concentration}% du CA
Top clients:
${topCustomersStr || "insuffisant"}`;

  const productSection = `Total produits: ${totalProducts}
Produits faible marge (<15%): ${lowMarginProducts.length}
Top produits:
${topProductsStr || "insuffisant"}
Produits dormant (stock élevé, ventes faibles):
${dormantStr || "aucun"}
Produits proches rupture:
${ruptureStr || "aucun"}`;

  const inventorySection = `Valeur inventaire: ${round(inventoryValue)} $
Distribution statut stock: ${stockDistStr || "insuffisant"}`;

  const supplierSection = `Total fournisseurs: ${totalSuppliers}
Fournisseurs problématiques: ${problematicSuppliers.length}
${supplierStr || "insuffisant"}`;

  const purchaseSection = `Coût total achats: ${round(totalPurchaseCost)} $
Délai moyen: ${avgDelay} jours
Achats en retard (>5j): ${delayedPurchases.length}
Évolution mensuelle:
${purchaseMonthlyStr || "insuffisant"}`;

  const marketingSection = `Dépenses totales: ${round(totalSpend)} $
  Revenus attribues: ${round(totalCampaignRevenue)} $
  ROAS global: ${overallRoas}
  ROI Marketing: ${overallRoi}%
  CAC global: ${overallCac} $
  Nouveaux clients: ${totalNewCustomers}
  Par canal:
  ${channelMarketingStr || "insuffisant"}
  Pires campagnes (ROAS bas):
  ${worstCampaignsStr2 || "insuffisant"}
  Tendance dépenses marketing:
  ${spendTrendStr || "insuffisant"}`;

  const payrollSection = `Coût total paie: ${round(totalPayrollCost)} $
Employés actifs: ${activeEmployees.length}
Tendance:
${payrollTrendStr || "insuffisant"}`;

  const expenseSection = `Total dépenses: ${round(totalExpensesAmount)} $
Abonnements récurrents:
${recurringStr || "aucun"}`;

  const cashflowSection = `Trésorerie actuelle: ${round(currentCash)} $
Tendance flux net:
${cashflowTrendStr || "insuffisant"}`;

  const interactionSection = `Total interactions: ${totalInteractions}
Taux de plaintes: ${complaintRate}%
Satisfaction moyenne: ${avgSatisfaction}/5
Plaintes par mois:
${complaintMonthly.map(([m, v]) => `${m}: ${v}`).join("\n") || "insuffisant"}`;

  const competitorSection = competitorStr || "aucun concurrent renseigné";
  const goalSection = goalStr || "aucun objectif renseigné";
  const eventSection = eventStr || "aucun événement renseigné";

  // Told to the model explicitly. An AI that knows its data is partial can say
  // so; one that is not told states confident conclusions on a truncated base.
  const dataQualityNote = truncatedSources.length > 0
    ? `ATTENTION — LECTURE PARTIELLE DES DONNÉES
Les sources suivantes dépassent la capacité de lecture et n'ont été lues que partiellement (lignes les plus récentes) : ${truncatedSources.join(", ")}.
Les totaux cumulés ci-dessous sont donc SOUS-ÉVALUÉS pour ces sources. Mentionne cette limite dans ton analyse et privilégie les tendances récentes aux totaux absolus.

`
    : "";

  const context = `${dataQualityNote}CONTEXTE DE L'ENTREPRISE
${companyProfile}

NOTE DE LECTURE : sauf mention contraire, les totaux de cette fiche sont cumulés sur tout l'historique importé, alors que les écrans de l'application affichent des fenêtres de 3 mois complets. Ne présente pas un cumul comme s'il s'agissait d'une performance récente, et ne contredis pas un chiffre du tableau de bord sans préciser que la période diffère.

=== FINANCE ===
${financeSection}

=== VENTES ===
${salesSection}

=== CLIENTS ===
${customerSection}

=== PRODUITS ===
${productSection}

=== INVENTAIRE ===
${inventorySection}

=== FOURNISSEURS ===
${supplierSection}

=== ACHATS ===
${purchaseSection}

=== MARKETING ===
${marketingSection}

=== PAIE ===
${payrollSection}

=== DÉPENSES ===
${expenseSection}

=== TRÉSORERIE ===
${cashflowSection}

=== INTERACTIONS CLIENTS ===
${interactionSection}

=== CONCURRENTS ===
${competitorSection}

=== OBJECTIFS ===
${goalSection}

=== ÉVÉNEMENTS D'ENTREPRISE ===
${eventSection}`;

  return {
    company,
    transactions,
    orders,
    customers,
    products,
    inventory,
    suppliers,
    purchases,
    campaigns,
    cashflow,
    interactions,
    kpis,
    anomalies,
    risks,
    opportunities,
    recommendations,
    tasks,
    context,
    totals: {
      totalIncome,
      totalExpenses,
      grossMargin,
      marginPct,
      count: transactions.length,
      orderRevenue,
      orderCount,
      aov,
      returnRate,
      totalSpend,
      overallRoas,
      overallCac,
      churnRate,
      concentration,
      currentCash,
    },
  };
}