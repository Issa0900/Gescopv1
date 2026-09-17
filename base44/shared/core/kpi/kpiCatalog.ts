// ─────────────────────────────────────────────────────────────────────────────
// GESCOP Universal KPI Engine — Universal KPI Catalog
// Version 2.0 — Septembre 2026 (Spec Sections 12–23, 38)
// ─────────────────────────────────────────────────────────────────────────────

import {
  type KpiDefinition,
  KPI_MODULES,
  AGGREGATION_METHODS,
} from "./types.ts";

/**
 * Catalogue exhaustif et structuré des KPIs de GESCOP
 */
export const UNIVERSAL_KPI_CATALOG: Record<string, KpiDefinition> = {
  // ── 1. FINANCE (Spec Section 13) ──────────────────────────────────────────
  gross_profit: {
    id: "gross_profit",
    name: { fr: "Profit brut", en: "Gross Profit" },
    description: {
      fr: "Différence entre le chiffre d'affaires et le coût des marchandises vendues (COGS).",
      en: "Difference between total revenue and cost of goods sold.",
    },
    primaryModule: KPI_MODULES.FINANCE,
    secondaryModules: [KPI_MODULES.VENTES],
    requiredMetrics: ["revenue", "cogs"],
    formula: "revenue - cogs",
    calculate: (m) => (m.revenue != null && m.cogs != null ? m.revenue - m.cogs : null),
    unit: "currency",
    aggregationType: AGGREGATION_METHODS.ADDITIVE,
    validGrains: ["day", "month", "year", "order", "branch", "product"],
  },

  gross_margin_pct: {
    id: "gross_margin_pct",
    name: { fr: "Marge brute (%)", en: "Gross Margin %" },
    description: {
      fr: "Pourcentage du chiffre d'affaires conservé après déduction des coûts d'achat directs.",
      en: "Percentage of revenue retained after deducting cost of goods sold.",
    },
    primaryModule: KPI_MODULES.FINANCE,
    secondaryModules: [KPI_MODULES.VENTES, KPI_MODULES.SUCCURSALES],
    requiredMetrics: ["revenue", "cogs"],
    formula: "((revenue - cogs) / revenue) * 100",
    calculate: (m) => {
      if (!m.revenue || m.revenue <= 0 || m.cogs == null) return null;
      return Math.round(((m.revenue - m.cogs) / m.revenue) * 10000) / 100;
    },
    unit: "percentage",
    aggregationType: AGGREGATION_METHODS.RATIO,
    validGrains: ["day", "month", "year", "order", "branch", "product", "location"],
    requiresPositiveDenominator: true,
    maxSanityThreshold: 100,
    minSanityThreshold: -100,
  },

  operating_profit: {
    id: "operating_profit",
    name: { fr: "Résultat d'exploitation (EBIT)", en: "Operating Profit" },
    description: {
      fr: "Bénéfice généré par l'activité opérationnelle avant intérêts et impôts.",
      en: "Profit generated from core operations before interest and taxes.",
    },
    primaryModule: KPI_MODULES.FINANCE,
    secondaryModules: [],
    requiredMetrics: ["revenue", "cogs", "operating_expenses"],
    formula: "revenue - cogs - operating_expenses",
    calculate: (m) =>
      m.revenue != null && m.cogs != null && m.operating_expenses != null
        ? m.revenue - m.cogs - m.operating_expenses
        : null,
    unit: "currency",
    aggregationType: AGGREGATION_METHODS.ADDITIVE,
    validGrains: ["month", "quarter", "year"],
  },

  operating_margin_pct: {
    id: "operating_margin_pct",
    name: { fr: "Marge d'exploitation (%)", en: "Operating Margin %" },
    description: { fr: "Ratio du résultat d'exploitation sur le chiffre d'affaires.", en: "Operating profit over revenue ratio." },
    primaryModule: KPI_MODULES.FINANCE,
    secondaryModules: [],
    requiredMetrics: ["revenue", "operating_profit"],
    formula: "(operating_profit / revenue) * 100",
    calculate: (m) =>
      m.revenue && m.revenue > 0 && m.operating_profit != null
        ? Math.round((m.operating_profit / m.revenue) * 10000) / 100
        : null,
    unit: "percentage",
    aggregationType: AGGREGATION_METHODS.RATIO,
    validGrains: ["month", "quarter", "year"],
    requiresPositiveDenominator: true,
  },

  net_profit: {
    id: "net_profit",
    name: { fr: "Résultat net", en: "Net Profit" },
    description: { fr: "Bénéfice net total après toutes charges, impôts et intérêts.", en: "Total net profit after all expenses." },
    primaryModule: KPI_MODULES.FINANCE,
    secondaryModules: [],
    requiredMetrics: ["revenue", "total_expenses"],
    formula: "revenue - total_expenses",
    calculate: (m) => (m.revenue != null && m.total_expenses != null ? m.revenue - m.total_expenses : null),
    unit: "currency",
    aggregationType: AGGREGATION_METHODS.ADDITIVE,
    validGrains: ["month", "year"],
  },

  net_margin_pct: {
    id: "net_margin_pct",
    name: { fr: "Marge nette (%)", en: "Net Margin %" },
    description: { fr: "Part du chiffre d'affaires convertie en bénéfice net.", en: "Percentage of revenue converted to net profit." },
    primaryModule: KPI_MODULES.FINANCE,
    secondaryModules: [],
    requiredMetrics: ["revenue", "net_profit"],
    formula: "(net_profit / revenue) * 100",
    calculate: (m) =>
      m.revenue && m.revenue > 0 && m.net_profit != null ? Math.round((m.net_profit / m.revenue) * 10000) / 100 : null,
    unit: "percentage",
    aggregationType: AGGREGATION_METHODS.RATIO,
    validGrains: ["month", "year"],
    requiresPositiveDenominator: true,
  },

  // ── 2. VENTES (Spec Section 14) ───────────────────────────────────────────
  average_order_value: {
    id: "average_order_value",
    name: { fr: "Panier moyen (AOV)", en: "Average Order Value" },
    description: { fr: "Montant moyen dépensé par commande.", en: "Average amount spent per order." },
    primaryModule: KPI_MODULES.VENTES,
    secondaryModules: [KPI_MODULES.FINANCE, KPI_MODULES.CLIENTS],
    requiredMetrics: ["revenue", "orders"],
    formula: "revenue / orders",
    calculate: (m) => (m.orders && m.orders > 0 && m.revenue != null ? Math.round((m.revenue / m.orders) * 100) / 100 : null),
    unit: "currency",
    aggregationType: AGGREGATION_METHODS.RATIO,
    validGrains: ["day", "month", "year", "branch", "channel"],
    requiresPositiveDenominator: true,
  },

  revenue_per_customer: {
    id: "revenue_per_customer",
    name: { fr: "Revenu par client (ARPU)", en: "Revenue per Customer" },
    description: { fr: "Chiffre d'affaires moyen généré par client actif.", en: "Average revenue generated per active customer." },
    primaryModule: KPI_MODULES.VENTES,
    secondaryModules: [KPI_MODULES.CLIENTS],
    requiredMetrics: ["revenue", "customers"],
    formula: "revenue / customers",
    calculate: (m) =>
      m.customers && m.customers > 0 && m.revenue != null ? Math.round((m.revenue / m.customers) * 100) / 100 : null,
    unit: "currency",
    aggregationType: AGGREGATION_METHODS.RATIO,
    validGrains: ["month", "year"],
    requiresPositiveDenominator: true,
  },

  average_selling_price: {
    id: "average_selling_price",
    name: { fr: "Prix de vente moyen (ASP)", en: "Average Selling Price" },
    description: { fr: "Prix moyen par unité vendue.", en: "Average price per unit sold." },
    primaryModule: KPI_MODULES.VENTES,
    secondaryModules: [KPI_MODULES.STOCKS],
    requiredMetrics: ["revenue", "quantity"],
    formula: "revenue / quantity",
    calculate: (m) =>
      m.quantity && m.quantity > 0 && m.revenue != null ? Math.round((m.revenue / m.quantity) * 100) / 100 : null,
    unit: "currency",
    aggregationType: AGGREGATION_METHODS.RATIO,
    validGrains: ["day", "month", "product", "category"],
    requiresPositiveDenominator: true,
  },

  // ── 3. MARKETING (Spec Section 15) ────────────────────────────────────────
  ctr: {
    id: "ctr",
    name: { fr: "Taux de clics (CTR)", en: "Click-Through Rate" },
    description: { fr: "Pourcentage d'impressions ayant généré un clic.", en: "Percentage of impressions resulting in clicks." },
    primaryModule: KPI_MODULES.MARKETING,
    secondaryModules: [],
    requiredMetrics: ["clicks", "impressions"],
    formula: "(clicks / impressions) * 100",
    calculate: (m) => {
      if (!m.impressions || m.impressions <= 0 || m.clicks == null) return null;
      return Math.round((m.clicks / m.impressions) * 10000) / 100;
    },
    unit: "percentage",
    aggregationType: AGGREGATION_METHODS.RATIO,
    validGrains: ["day", "month", "campaign", "channel"],
    requiresPositiveDenominator: true,
    maxSanityThreshold: 100,
  },

  cpc: {
    id: "cpc",
    name: { fr: "Coût par clic (CPC)", en: "Cost per Click" },
    description: { fr: "Dépense publicitaire moyenne pour chaque clic obtenu.", en: "Average marketing spend per click." },
    primaryModule: KPI_MODULES.MARKETING,
    secondaryModules: [],
    requiredMetrics: ["marketing_spend", "clicks"],
    formula: "marketing_spend / clicks",
    calculate: (m) =>
      m.clicks && m.clicks > 0 && m.marketing_spend != null
        ? Math.round((m.marketing_spend / m.clicks) * 100) / 100
        : null,
    unit: "currency",
    aggregationType: AGGREGATION_METHODS.RATIO,
    validGrains: ["day", "month", "campaign", "channel"],
    requiresPositiveDenominator: true,
  },

  marketing_conversion_rate: {
    id: "marketing_conversion_rate",
    name: { fr: "Taux de conversion marketing", en: "Marketing Conversion Rate" },
    description: { fr: "Pourcentage de clics ayant abouti à une conversion.", en: "Percentage of clicks leading to conversions." },
    primaryModule: KPI_MODULES.MARKETING,
    secondaryModules: [KPI_MODULES.VENTES],
    requiredMetrics: ["conversions", "clicks"],
    formula: "(conversions / clicks) * 100",
    calculate: (m) => {
      if (!m.clicks || m.clicks <= 0 || m.conversions == null) return null;
      return Math.round((m.conversions / m.clicks) * 10000) / 100;
    },
    unit: "percentage",
    aggregationType: AGGREGATION_METHODS.RATIO,
    validGrains: ["day", "month", "campaign", "channel"],
    requiresPositiveDenominator: true,
    maxSanityThreshold: 100,
  },

  roas: {
    id: "roas",
    name: { fr: "Retour sur dépenses publicitaires (ROAS)", en: "Return on Ad Spend" },
    description: { fr: "Chiffre d'affaires généré par dollar investi en publicité.", en: "Revenue generated per dollar spent on ads." },
    primaryModule: KPI_MODULES.MARKETING,
    secondaryModules: [KPI_MODULES.FINANCE],
    requiredMetrics: ["attributed_revenue", "marketing_spend"],
    formula: "attributed_revenue / marketing_spend",
    calculate: (m) =>
      m.marketing_spend && m.marketing_spend > 0 && m.attributed_revenue != null
        ? Math.round((m.attributed_revenue / m.marketing_spend) * 100) / 100
        : null,
    unit: "ratio",
    aggregationType: AGGREGATION_METHODS.RATIO,
    validGrains: ["day", "month", "campaign", "channel"],
    requiresPositiveDenominator: true,
  },

  cpa: {
    id: "cpa",
    name: { fr: "Coût par acquisition (CPA)", en: "Cost per Acquisition" },
    description: { fr: "Coût publicitaire moyen pour obtenir une conversion.", en: "Average advertising cost per conversion." },
    primaryModule: KPI_MODULES.MARKETING,
    secondaryModules: [KPI_MODULES.VENTES],
    requiredMetrics: ["marketing_spend", "conversions"],
    formula: "marketing_spend / conversions",
    calculate: (m) => {
      const spend = m.marketing_spend ?? m.ad_spend;
      if (!m.conversions || m.conversions <= 0 || spend == null) return null;
      return Math.round((spend / m.conversions) * 100) / 100;
    },
    unit: "currency",
    aggregationType: AGGREGATION_METHODS.RATIO,
    validGrains: ["day", "month", "campaign", "channel"],
    requiresPositiveDenominator: true,
  },

  cac: {
    id: "cac",
    name: { fr: "Coût d'acquisition client (CAC)", en: "Customer Acquisition Cost" },
    description: { fr: "Coût marketing et commercial pour acquérir un nouveau client.", en: "Cost to acquire a new customer." },
    primaryModule: KPI_MODULES.CLIENTS,
    secondaryModules: [KPI_MODULES.MARKETING, KPI_MODULES.FINANCE],
    requiredMetrics: ["marketing_spend", "new_customers"],
    formula: "marketing_spend / new_customers",
    calculate: (m) =>
      m.new_customers && m.new_customers > 0 && m.marketing_spend != null
        ? Math.round((m.marketing_spend / m.new_customers) * 100) / 100
        : null,
    unit: "currency",
    aggregationType: AGGREGATION_METHODS.RATIO,
    validGrains: ["month", "quarter", "year", "channel"],
    requiresPositiveDenominator: true,
  },

  // ── 4. CLIENTS (Spec Section 16) ──────────────────────────────────────────
  churn_rate_pct: {
    id: "churn_rate_pct",
    name: { fr: "Taux d'attrition (Churn %)", en: "Churn Rate %" },
    description: { fr: "Pourcentage de clients perdus sur une période donnée.", en: "Percentage of customers lost over a period." },
    primaryModule: KPI_MODULES.CLIENTS,
    secondaryModules: [KPI_MODULES.VENTES],
    requiredMetrics: ["lost_customers", "total_customers"],
    formula: "(lost_customers / total_customers) * 100",
    calculate: (m) =>
      m.total_customers && m.total_customers > 0 && m.lost_customers != null
        ? Math.round((m.lost_customers / m.total_customers) * 10000) / 100
        : null,
    unit: "percentage",
    aggregationType: AGGREGATION_METHODS.RATIO,
    validGrains: ["month", "quarter", "year"],
    requiresPositiveDenominator: true,
    maxSanityThreshold: 100,
  },

  clv: {
    id: "clv",
    name: { fr: "Valeur vie client (CLV)", en: "Customer Lifetime Value" },
    description: { fr: "Profit cumulé estimé généré par un client durant sa relation.", en: "Estimated total value of a customer." },
    primaryModule: KPI_MODULES.CLIENTS,
    secondaryModules: [KPI_MODULES.FINANCE],
    requiredMetrics: ["average_order_value", "purchase_frequency"],
    formula: "average_order_value * purchase_frequency",
    calculate: (m) =>
      m.average_order_value != null && m.purchase_frequency != null
        ? Math.round(m.average_order_value * m.purchase_frequency * 100) / 100
        : null,
    unit: "currency",
    aggregationType: AGGREGATION_METHODS.RATIO,
    validGrains: ["year"],
  },

  // ── 5. STOCKS (Spec Section 17) ───────────────────────────────────────────
  inventory_turnover: {
    id: "inventory_turnover",
    name: { fr: "Rotation des stocks (Turnover)", en: "Inventory Turnover" },
    description: { fr: "Nombre de fois où le stock est vendu et remplacé sur une période.", en: "Rate at which inventory is sold and replaced." },
    primaryModule: KPI_MODULES.STOCKS,
    secondaryModules: [KPI_MODULES.FINANCE],
    requiredMetrics: ["cogs", "inventory_value"],
    formula: "cogs / inventory_value",
    calculate: (m) =>
      m.inventory_value && m.inventory_value > 0 && m.cogs != null
        ? Math.round((m.cogs / m.inventory_value) * 100) / 100
        : null,
    unit: "ratio",
    aggregationType: AGGREGATION_METHODS.RATIO,
    validGrains: ["month", "year", "category", "product"],
    requiresPositiveDenominator: true,
  },

  days_inventory_outstanding: {
    id: "days_inventory_outstanding",
    name: { fr: "Délai de rotation des stocks (DIO en jours)", en: "Days Inventory Outstanding" },
    description: { fr: "Nombre moyen de jours nécessaires pour écouler le stock.", en: "Average days to turn inventory into sales." },
    primaryModule: KPI_MODULES.STOCKS,
    secondaryModules: [KPI_MODULES.TRESORERIE],
    requiredMetrics: ["inventory_value", "cogs"],
    formula: "(inventory_value / cogs) * 365",
    calculate: (m) =>
      m.cogs && m.cogs > 0 && m.inventory_value != null
        ? Math.round((m.inventory_value / m.cogs) * 365)
        : null,
    unit: "days",
    aggregationType: AGGREGATION_METHODS.RATIO,
    validGrains: ["year", "quarter"],
    requiresPositiveDenominator: true,
  },

  // ── 6. RH (Spec Section 19) ───────────────────────────────────────────────
  revenue_per_employee: {
    id: "revenue_per_employee",
    name: { fr: "Chiffre d'affaires par employé", en: "Revenue per Employee" },
    description: { fr: "Productivité financière moyenne par employé de l'effectif.", en: "Financial productivity per headcount." },
    primaryModule: KPI_MODULES.RH,
    secondaryModules: [KPI_MODULES.FINANCE, KPI_MODULES.SUCCURSALES],
    requiredMetrics: ["revenue", "employees"],
    formula: "revenue / employees",
    calculate: (m) =>
      m.employees && m.employees > 0 && m.revenue != null
        ? Math.round((m.revenue / m.employees) * 100) / 100
        : null,
    unit: "currency",
    aggregationType: AGGREGATION_METHODS.RATIO,
    validGrains: ["month", "year", "branch"],
    requiresPositiveDenominator: true,
  },

  profit_per_employee: {
    id: "profit_per_employee",
    name: { fr: "Profit par employé", en: "Profit per Employee" },
    description: { fr: "Bénéfice opérationnel généré par employé.", en: "Operating profit per headcount." },
    primaryModule: KPI_MODULES.RH,
    secondaryModules: [KPI_MODULES.FINANCE],
    requiredMetrics: ["gross_profit", "employees"],
    formula: "gross_profit / employees",
    calculate: (m) =>
      m.employees && m.employees > 0 && m.gross_profit != null
        ? Math.round((m.gross_profit / m.employees) * 100) / 100
        : null,
    unit: "currency",
    aggregationType: AGGREGATION_METHODS.RATIO,
    validGrains: ["month", "year", "branch"],
    requiresPositiveDenominator: true,
  },

  payroll_per_employee: {
    id: "payroll_per_employee",
    name: { fr: "Masse salariale moyenne par employé", en: "Payroll per Employee" },
    description: { fr: "Rémunération moyenne par collaborateur.", en: "Average compensation per employee." },
    primaryModule: KPI_MODULES.RH,
    secondaryModules: [],
    requiredMetrics: ["payroll_total", "employees"],
    formula: "payroll_total / employees",
    calculate: (m) =>
      m.employees && m.employees > 0 && m.payroll_total != null
        ? Math.round((m.payroll_total / m.employees) * 100) / 100
        : null,
    unit: "currency",
    aggregationType: AGGREGATION_METHODS.RATIO,
    validGrains: ["month", "year"],
    requiresPositiveDenominator: true,
  },

  // ── 7. TRÉSORERIE (Spec Section 20) ───────────────────────────────────────
  net_cash_flow: {
    id: "net_cash_flow",
    name: { fr: "Flux net de trésorerie", en: "Net Cash Flow" },
    description: { fr: "Différence entre les encaissements et les décaissements.", en: "Net cash inflow minus cash outflow." },
    primaryModule: KPI_MODULES.TRESORERIE,
    secondaryModules: [KPI_MODULES.FINANCE],
    requiredMetrics: ["cash_inflow", "cash_outflow"],
    formula: "cash_inflow - cash_outflow",
    calculate: (m) =>
      m.cash_inflow != null && m.cash_outflow != null ? m.cash_inflow - m.cash_outflow : null,
    unit: "currency",
    aggregationType: AGGREGATION_METHODS.FLOW,
    validGrains: ["day", "month", "year"],
  },

  burn_rate: {
    id: "burn_rate",
    name: { fr: "Taux de consommation de trésorerie (Burn Rate)", en: "Burn Rate" },
    description: { fr: "Rythme mensuel moyen de consommation de liquidités.", en: "Monthly cash consumption rate." },
    primaryModule: KPI_MODULES.TRESORERIE,
    secondaryModules: [],
    requiredMetrics: ["cash_outflow", "cash_inflow"],
    formula: "Math.max(0, cash_outflow - cash_inflow)",
    calculate: (m) =>
      m.cash_outflow != null && m.cash_inflow != null
        ? Math.max(0, m.cash_outflow - m.cash_inflow)
        : null,
    unit: "currency",
    aggregationType: AGGREGATION_METHODS.FLOW,
    validGrains: ["month"],
  },

  runway_months: {
    id: "runway_months",
    name: { fr: "Autonomie de trésorerie (Runway en mois)", en: "Cash Runway" },
    description: { fr: "Nombre de mois avant épuisement des liquidités au rythme de consommation actuel.", en: "Months of cash left at current burn rate." },
    primaryModule: KPI_MODULES.TRESORERIE,
    secondaryModules: [KPI_MODULES.FINANCE],
    requiredMetrics: ["cash_balance", "burn_rate"],
    formula: "cash_balance / burn_rate",
    calculate: (m) => {
      if (!m.burn_rate || m.burn_rate <= 0 || m.cash_balance == null) return null;
      return Math.round((m.cash_balance / m.burn_rate) * 10) / 10;
    },
    unit: "days",
    aggregationType: AGGREGATION_METHODS.NON_ADDITIVE,
    validGrains: ["month"],
    requiresPositiveDenominator: true,
  },

  // ── 8. SUCCURSALES (Spec Section 21) ──────────────────────────────────────
  revenue_per_branch: {
    id: "revenue_per_branch",
    name: { fr: "Chiffre d'affaires moyen par succursale", en: "Revenue per Branch" },
    description: { fr: "Chiffre d'affaires moyen généré par point de vente.", en: "Average revenue generated per branch/site." },
    primaryModule: KPI_MODULES.SUCCURSALES,
    secondaryModules: [KPI_MODULES.VENTES],
    requiredMetrics: ["revenue", "branches_count"],
    formula: "revenue / branches_count",
    calculate: (m) =>
      m.branches_count && m.branches_count > 0 && m.revenue != null
        ? Math.round((m.revenue / m.branches_count) * 100) / 100
        : null,
    unit: "currency",
    aggregationType: AGGREGATION_METHODS.RATIO,
    validGrains: ["branch", "location", "store", "site", "month", "year"],
    requiresPositiveDenominator: true,
  },

  profit_per_branch: {
    id: "profit_per_branch",
    name: { fr: "Profit brut moyen par succursale", en: "Profit per Branch" },
    description: { fr: "Profit brut moyen réalisé par succursale.", en: "Average gross profit per branch." },
    primaryModule: KPI_MODULES.SUCCURSALES,
    secondaryModules: [KPI_MODULES.FINANCE],
    requiredMetrics: ["gross_profit", "branches_count"],
    formula: "gross_profit / branches_count",
    calculate: (m) =>
      m.branches_count && m.branches_count > 0 && m.gross_profit != null
        ? Math.round((m.gross_profit / m.branches_count) * 100) / 100
        : null,
    unit: "currency",
    aggregationType: AGGREGATION_METHODS.RATIO,
    validGrains: ["branch", "location", "store", "site", "month", "year"],
    requiresPositiveDenominator: true,
  },

  // ── 9. PRÉVISIONS & BUDGET (Spec Section 22) ──────────────────────────────
  budget_variance_pct: {
    id: "budget_variance_pct",
    name: { fr: "Écart budgétaire (%)", en: "Budget Variance %" },
    description: { fr: "Pourcentage d'écart entre le réalisé et le budget prévu.", en: "Percentage variance between actual and budget." },
    primaryModule: KPI_MODULES.PREVISIONS,
    secondaryModules: [KPI_MODULES.FINANCE],
    requiredMetrics: ["revenue", "budget_revenue"],
    formula: "((revenue - budget_revenue) / budget_revenue) * 100",
    calculate: (m) =>
      m.budget_revenue && m.budget_revenue > 0 && m.revenue != null
        ? Math.round(((m.revenue - m.budget_revenue) / m.budget_revenue) * 10000) / 100
        : null,
    unit: "percentage",
    aggregationType: AGGREGATION_METHODS.RATIO,
    validGrains: ["month", "quarter", "year"],
    requiresPositiveDenominator: true,
  },
};

/**
 * Obtient un KPI du catalogue par son ID
 */
export function getCatalogKpi(id: string): KpiDefinition | null {
  return UNIVERSAL_KPI_CATALOG[id] || null;
}

/**
 * Liste tous les KPIs applicables à un module donné
 */
export function getKpisForModule(module: string): KpiDefinition[] {
  return Object.values(UNIVERSAL_KPI_CATALOG).filter(
    (k) => k.primaryModule === module || k.secondaryModules.includes(module as any)
  );
}
