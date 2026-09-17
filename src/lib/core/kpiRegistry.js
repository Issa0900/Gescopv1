// ─────────────────────────────────────────────────────────────────────────────
// GESCOP Data Intelligence Core - KPI Registry
// ─────────────────────────────────────────────────────────────────────────────
//
// Declarative registry of all business KPIs.
// Replaces the imperative calculations scattered across src/lib/metrics.js
// and various page components.
//
// Each KPI defines its semantic identity, required inputs, and formula.
// The KPI Engine will resolve dependencies and execute the formulas.
// ─────────────────────────────────────────────────────────────────────────────

import { DOMAINS, KPI_LEVELS, DATA_TYPES, ECONOMIC_ROLES } from "./semanticTypes";

/**
 * Registry of all computed indicators (KPIs and Measures).
 *
 * Structure for each KPI:
 * - id: canonical key
 * - name: human-readable name (fr/en)
 * - level: MESURE (raw aggregation) | KPI (derived) | STRATEGIQUE (high-level)
 * - domain: business domain (finance, ventes, etc.)
 * - semanticType: economic role type (revenue, margin, etc.)
 * - unit: display unit
 * - dependencies: array of canonical keys required to compute this KPI
 * - calculate: pure function that takes a resolved dependencies object and returns the value
 * - isAdditive: boolean, whether the RESULT can be summed across periods
 */
export const KPI_REGISTRY = Object.freeze({
  
  // ── FINANCIAL MEASURES (LEVEL 1) ──────────────────────────────────────────

  total_revenue: {
    id: "total_revenue",
    name: { fr: "Chiffre d'affaires total", en: "Total Revenue" },
    level: KPI_LEVELS.MESURE,
    domain: DOMAINS.FINANCE,
    semanticType: "revenue",
    dataType: DATA_TYPES.CURRENCY,
    isAdditive: true,
    dependencies: ["revenue", "income_amount", "transaction_amount"],
    // income_amount and transaction_amount are ALTERNATIVE readings of the
    // same Transaction rows (income-only vs. every row regardless of type),
    // never additive: summing them double-counted revenue once the kpiEngine
    // fix let both resolve on the same dataset (income_amount correctly
    // context-filtered, transaction_amount its context-blind fallback).
    // income_amount is preferred whenever it's actually available.
    calculate: (deps) => {
      if (deps.income_amount != null) return deps.income_amount;
      if (deps.transaction_amount != null) return deps.transaction_amount;
      return deps.revenue || 0;
    }
  },

  total_expense: {
    id: "total_expense",
    name: { fr: "Dépenses totales", en: "Total Expenses" },
    level: KPI_LEVELS.MESURE,
    domain: DOMAINS.FINANCE,
    semanticType: "expense",
    dataType: DATA_TYPES.CURRENCY,
    isAdditive: true,
    dependencies: ["expense", "expense_amount", "operating_expense"],
    calculate: (deps) => {
      if (deps.expense_amount) return deps.expense_amount;
      return (deps.expense || 0) + (deps.operating_expense || 0);
    }
  },

  payroll_total: {
    id: "payroll_total",
    name: { fr: "Masse salariale totale", en: "Total Payroll" },
    level: KPI_LEVELS.MESURE,
    domain: DOMAINS.RH,
    semanticType: "payroll_cost",
    dataType: DATA_TYPES.CURRENCY,
    isAdditive: true,
    dependencies: ["payroll_cost"],
    calculate: (deps) => deps.payroll_cost || 0,
  },

  employee_count_raw: {
    id: "employee_count_raw",
    name: { fr: "Employés Bruts", en: "Raw Employees" },
    level: KPI_LEVELS.MESURE,
    domain: DOMAINS.RH,
    semanticType: "count",
    dataType: DATA_TYPES.NUMBER,
    isAdditive: false,
    dependencies: [],
    // This is a LEVEL 1 measure with no computed dependencies: the engine
    // exposes the raw dataset through the `_records` context variable, so we
    // count distinct employees directly from it. If no employee identifier is
    // present, fall back to the semantic aggregation of `employee_id`.
    calculate: (deps) => {
      const records = deps._records || [];
      const empIds = new Set(
        records
          .map((r) => r.employee_id)
          .filter((id) => id !== null && id !== undefined && String(id).trim() !== "")
      );
      return empIds.size;
    },
  },

  employee_count: {
    id: "employee_count",
    name: { fr: "Effectif total (Actifs)", en: "Headcount" },
    level: KPI_LEVELS.MESURE,
    domain: DOMAINS.RH,
    semanticType: "count",
    dataType: DATA_TYPES.NUMBER,
    isAdditive: false, // Stock metric
    dependencies: [],
    // Counts distinct ACTIVE employees from the raw dataset. A record without
    // an explicit status is considered active; otherwise the status must
    // contain an "active" marker. Falls back to the raw employee count when no
    // status information is available at all.
    calculate: (deps) => {
      const records = deps._records || [];
      const employees = records.filter(
        (r) => r.employee_id !== null && r.employee_id !== undefined && String(r.employee_id).trim() !== ""
      );
      if (employees.length === 0) return deps.employee_count_raw || 0;

      const hasStatus = employees.some((r) => r.status !== null && r.status !== undefined && String(r.status).trim() !== "");
      if (!hasStatus) return deps.employee_count_raw || 0;

      const activeIds = new Set(
        employees
          .filter((r) => {
            const st = String(r.status || "").toLowerCase();
            return (
              st.includes("actif") ||
              st.includes("active") ||
              st.includes("en poste") ||
              st.includes("employé") ||
              st.includes("employee")
            );
          })
          .map((r) => r.employee_id)
      );
      return activeIds.size;
    },
  },

  rh_expense_ratio: {
    id: "rh_expense_ratio",
    name: { fr: "Poids Masse Salariale / CA", en: "Payroll to Revenue Ratio" },
    level: KPI_LEVELS.KPI,
    domain: DOMAINS.RH,
    semanticType: "ratio",
    economicRole: ECONOMIC_ROLES.RATIO,
    dataType: DATA_TYPES.PERCENTAGE,
    isAdditive: false,
    dependencies: ["payroll_total", "total_revenue"],
    calculate: (deps) => {
      if (!deps.total_revenue || deps.total_revenue === 0) return 0;
      return deps.payroll_total / deps.total_revenue;
    },
  },

  revenue_per_employee: {
    id: "revenue_per_employee",
    name: { fr: "CA par employé", en: "Revenue per Employee" },
    level: KPI_LEVELS.KPI_STRATEGIQUE,
    domain: DOMAINS.RH,
    semanticType: "ratio",
    economicRole: ECONOMIC_ROLES.RATIO,
    dataType: DATA_TYPES.CURRENCY,
    isAdditive: false,
    dependencies: ["total_revenue", "employee_count"],
    calculate: (deps) => {
      if (!deps.employee_count || deps.employee_count === 0) return 0;
      return deps.total_revenue / deps.employee_count;
    },
  },

  // ── FINANCIAL KPIs (LEVEL 2) ─────────────────────────────────────────────

  gross_margin_amount: {
    id: "gross_margin_amount",
    name: { fr: "Marge brute (montant)", en: "Gross Margin Amount" },
    level: KPI_LEVELS.KPI,
    domain: DOMAINS.FINANCE,
    semanticType: "margin",
    economicRole: ECONOMIC_ROLES.RESULT, // It's a calculated result, not a raw flow
    dataType: DATA_TYPES.CURRENCY,
    isAdditive: true, // Margin amounts can be summed across periods
    dependencies: ["total_revenue", "cogs"],
    // A COGS column that was never imported is not the same as a COGS of $0
    // (a real, measured zero-cost sale). `|| 0` made an absent COGS silently
    // read as zero cost, so gross margin came out at 100% for any revenue
    // whose cost data simply hadn't arrived yet — an invented "excellent
    // performance" from missing data, exactly what sec9-11 prohibits.
    calculate: (deps) => (deps.total_revenue != null && deps.cogs != null) ? deps.total_revenue - deps.cogs : null,
  },

  gross_margin_pct: {
    id: "gross_margin_pct",
    name: { fr: "Marge brute (%)", en: "Gross Margin %" },
    level: KPI_LEVELS.KPI,
    domain: DOMAINS.FINANCE,
    semanticType: "margin",
    economicRole: ECONOMIC_ROLES.RATE,
    dataType: DATA_TYPES.PERCENTAGE,
    isAdditive: false, // Rates can NEVER be summed
    dependencies: ["total_revenue", "gross_margin_amount"],
    calculate: (deps) => {
      if (!deps.total_revenue || deps.gross_margin_amount == null) return null;
      return (deps.gross_margin_amount / deps.total_revenue) * 100;
    },
  },

  net_income: {
    id: "net_income",
    name: { fr: "Résultat net", en: "Net Income" },
    level: KPI_LEVELS.KPI,
    domain: DOMAINS.FINANCE,
    semanticType: "margin",
    economicRole: ECONOMIC_ROLES.RESULT,
    dataType: DATA_TYPES.CURRENCY,
    isAdditive: true,
    dependencies: ["total_revenue", "total_expense"],
    // Same principle as gross_margin_amount: no expense data imported is not
    // the same as zero expenses, and treating it that way used to make net
    // income equal total_revenue -- a business with real costs looking
    // artificially 100% profitable the moment its expense data hadn't
    // arrived yet.
    calculate: (deps) => (deps.total_revenue != null && deps.total_expense != null) ? deps.total_revenue - deps.total_expense : null,
  },
  
  net_margin_pct: {
    id: "net_margin_pct",
    name: { fr: "Marge nette (%)", en: "Net Margin %" },
    level: KPI_LEVELS.KPI,
    domain: DOMAINS.FINANCE,
    semanticType: "margin",
    economicRole: ECONOMIC_ROLES.RATE,
    dataType: DATA_TYPES.PERCENTAGE,
    isAdditive: false,
    dependencies: ["total_revenue", "net_income"],
    calculate: (deps) => {
      if (!deps.total_revenue || deps.net_income == null) return null;
      return (deps.net_income / deps.total_revenue) * 100;
    },
  },

  ebitda: {
    id: "ebitda",
    name: { fr: "EBITDA", en: "EBITDA" },
    level: KPI_LEVELS.KPI,
    domain: DOMAINS.FINANCE,
    semanticType: "margin",
    economicRole: ECONOMIC_ROLES.RESULT,
    dataType: DATA_TYPES.CURRENCY,
    isAdditive: true,
    // Simple version: Net Income + Interest + Taxes + D&A. 
    // If we only have Revenue and Operating Expenses, it's roughly Rev - OpEx.
    dependencies: ["total_revenue", "operating_expense"],
    calculate: (deps) => (deps.total_revenue || 0) - (deps.operating_expense || 0),
  },

  // ── TREASURY & BFR (LEVEL 2/3) ──────────────────────────────────────────

  cash_runway: {
    id: "cash_runway",
    name: { fr: "Runway (mois)", en: "Cash Runway (months)" },
    level: KPI_LEVELS.KPI_STRATEGIQUE,
    domain: DOMAINS.TRESORERIE,
    semanticType: "duration",
    economicRole: ECONOMIC_ROLES.RESULT,
    dataType: DATA_TYPES.NUMBER,
    isAdditive: false,
    dependencies: ["cash_closing", "net_burn_rate"],
    calculate: (deps) => {
      if (!deps.cash_closing) return 0;
      if (deps.net_burn_rate >= 0) return Infinity; // Profitable, infinite runway
      
      const periodDays = deps.period_days || 30;
      const dailyBurnRate = Math.abs(deps.net_burn_rate) / periodDays;
      const monthlyBurnRate = dailyBurnRate * 30.416; // Average days in a month
      
      return deps.cash_closing / monthlyBurnRate;
    },
  },

  net_burn_rate: {
    id: "net_burn_rate",
    name: { fr: "Burn Rate net", en: "Net Burn Rate" },
    level: KPI_LEVELS.KPI,
    domain: DOMAINS.TRESORERIE,
    semanticType: "cash_outflow",
    economicRole: ECONOMIC_ROLES.RESULT,
    dataType: DATA_TYPES.CURRENCY,
    isAdditive: false, // Usually calculated over a specific window (e.g. 3 months avg)
    dependencies: ["net_cash_flow"],
    // In a real scenario, the engine provides windowed values if requested.
    // Here we just use the period's net cash flow directly.
    calculate: (deps) => deps.net_cash_flow || 0, 
  },

  // Le fameux Besoin en Fonds de Roulement (BFR) demandé dans le plan (Phase 9)
  bfr: {
    id: "bfr",
    name: { fr: "Besoin en Fonds de Roulement (BFR)", en: "Working Capital Requirement" },
    level: KPI_LEVELS.KPI_STRATEGIQUE,
    domain: DOMAINS.TRESORERIE,
    semanticType: "cash_balance",
    economicRole: ECONOMIC_ROLES.RESULT,
    dataType: DATA_TYPES.CURRENCY,
    isAdditive: false, // It's a STOCK-derived metric (AR + Inv - AP)
    dependencies: ["accounts_receivable", "inventory_value", "accounts_payable"],
    calculate: (deps) => (deps.accounts_receivable || 0) + (deps.inventory_value || 0) - (deps.accounts_payable || 0),
  },
  
  bfr_days: {
    id: "bfr_days",
    name: { fr: "BFR en jours de CA", en: "WCR in Days of Sales" },
    level: KPI_LEVELS.KPI_STRATEGIQUE,
    domain: DOMAINS.TRESORERIE,
    semanticType: "duration",
    economicRole: ECONOMIC_ROLES.RATIO,
    dataType: DATA_TYPES.NUMBER,
    isAdditive: false,
    dependencies: ["bfr", "total_revenue"],
    calculate: (deps) => {
      if (!deps.total_revenue || deps.total_revenue === 0) return 0;
      // Note: Assuming the total_revenue is annual. If it's a monthly period, 
      // the engine should adjust the multiplier (e.g., * 30 instead of 365).
      // For now, we return a simple ratio, engine handles period normalization.
      return (deps.bfr / deps.total_revenue) * 365;
      const periodDays = deps.period_days || 365;
      return (deps.bfr / deps.total_revenue) * periodDays;
    },
  },

  // ── SALES & MARKETING (LEVEL 2) ──────────────────────────────────────────

  cac: {
    id: "cac",
    name: { fr: "Coût d'Acquisition Client (CAC)", en: "Customer Acquisition Cost" },
    level: KPI_LEVELS.KPI,
    domain: DOMAINS.MARKETING,
    semanticType: "ratio",
    economicRole: ECONOMIC_ROLES.RATIO,
    dataType: DATA_TYPES.CURRENCY,
    isAdditive: false,
    dependencies: ["marketing_spend", "new_customers"],
    // Zero new customers makes the ratio undefined (division by zero), and an
    // unmeasured spend/count is not a spend/count of zero — both must read as
    // "non mesurable" (null), not as a free $0 acquisition cost.
    calculate: (deps) => {
      if (deps.marketing_spend == null || !deps.new_customers) return null;
      return deps.marketing_spend / deps.new_customers;
    },
  },
  
  roas: {
    id: "roas",
    name: { fr: "Retour sur Investissement Publicitaire (ROAS)", en: "ROAS" },
    level: KPI_LEVELS.KPI,
    domain: DOMAINS.MARKETING,
    semanticType: "ratio",
    economicRole: ECONOMIC_ROLES.RATIO,
    dataType: DATA_TYPES.NUMBER,
    isAdditive: false,
    dependencies: ["campaign_revenue", "marketing_spend"],
    calculate: (deps) => {
      if (!deps.marketing_spend || deps.campaign_revenue == null) return null;
      return deps.campaign_revenue / deps.marketing_spend;
    },
  },

  marketing_roi: {
    id: "marketing_roi",
    name: { fr: "ROI Marketing (%)", en: "Marketing ROI (%)" },
    level: KPI_LEVELS.KPI_STRATEGIQUE,
    domain: DOMAINS.MARKETING,
    semanticType: "ratio",
    economicRole: ECONOMIC_ROLES.RATIO,
    dataType: DATA_TYPES.PERCENTAGE,
    isAdditive: false,
    dependencies: ["campaign_revenue", "marketing_spend"],
    calculate: (deps) => {
      if (!deps.marketing_spend || deps.campaign_revenue == null) return null;
      return ((deps.campaign_revenue - deps.marketing_spend) / deps.marketing_spend) * 100;
    },
  },

  aov: {
    id: "aov",
    name: { fr: "Panier Moyen (AOV)", en: "Average Order Value" },
    level: KPI_LEVELS.KPI,
    domain: DOMAINS.VENTES,
    semanticType: "ratio",
    economicRole: ECONOMIC_ROLES.RATIO,
    dataType: DATA_TYPES.CURRENCY,
    isAdditive: false,
    dependencies: ["total_revenue"], 
    // GESCOP Phase 3 SSOT : On utilise context._records pour compter proprement les commandes valides
    calculate: (deps) => {
      const records = deps._records || [];
      const orderCount = records.filter(r => r.order_id && (!r.status || !["annul", "cancel", "void", "draft"].some(s => String(r.status).toLowerCase().includes(s)))).length;
      if (orderCount === 0 || deps.total_revenue == null) return null;
      return deps.total_revenue / orderCount;
    },
  },

  active_customers: {
    id: "active_customers",
    name: { fr: "Clients Actifs", en: "Active Customers" },
    level: KPI_LEVELS.KPI,
    domain: DOMAINS.VENTES,
    semanticType: "count",
    dataType: DATA_TYPES.NUMBER,
    isAdditive: false,
    dependencies: [],
    calculate: (deps) => {
      const records = deps._records || [];
      return records.filter(r => r.customer_id && ["actif", "active"].includes(String(r.status).toLowerCase())).length;
    },
  },

  churn_rate: {
    id: "churn_rate",
    name: { fr: "Taux d'Attrition (Churn)", en: "Churn Rate" },
    level: KPI_LEVELS.KPI,
    domain: DOMAINS.VENTES,
    semanticType: "ratio",
    dataType: DATA_TYPES.PERCENTAGE,
    isAdditive: false,
    dependencies: [],
    calculate: (deps) => {
      const records = deps._records || [];
      const customers = records.filter(r => r.customer_id);
      if (customers.length === 0) return 0;
      const churned = customers.filter(r => ["inactif", "inactive", "perdu", "lost"].includes(String(r.status).toLowerCase())).length;
      return churned / customers.length;
    },
  },

  arpu: {
    id: "arpu",
    name: { fr: "Revenu Moyen par Utilisateur (ARPU)", en: "ARPU" },
    level: KPI_LEVELS.KPI,
    domain: DOMAINS.VENTES,
    semanticType: "ratio",
    dataType: DATA_TYPES.CURRENCY,
    isAdditive: false,
    dependencies: ["total_revenue", "active_customers"],
    calculate: (deps) => {
      if (!deps.active_customers || deps.active_customers === 0) return 0;
      return (deps.total_revenue || 0) / deps.active_customers;
    },
  },

  ltv: {
    id: "ltv",
    name: { fr: "Valeur Vie Client (LTV)", en: "Lifetime Value" },
    level: KPI_LEVELS.KPI_STRATEGIQUE,
    domain: DOMAINS.VENTES,
    semanticType: "revenue",
    economicRole: ECONOMIC_ROLES.RESULT,
    dataType: DATA_TYPES.CURRENCY,
    isAdditive: false,
    // LTV = Average Order Value * Purchase Frequency * Customer Lifespan
    // OR simpler: Average Revenue Per User / Churn Rate
    dependencies: ["arpu", "churn_rate"],
    calculate: (deps) => {
      if (!deps.churn_rate || deps.churn_rate === 0) return 0;
      return (deps.arpu || 0) / deps.churn_rate;
    },
  },
  
  ltv_cac_ratio: {
    id: "ltv_cac_ratio",
    name: { fr: "Ratio LTV/CAC", en: "LTV/CAC Ratio" },
    level: KPI_LEVELS.KPI_STRATEGIQUE,
    domain: DOMAINS.MARKETING,
    semanticType: "ratio",
    economicRole: ECONOMIC_ROLES.RATIO,
    dataType: DATA_TYPES.NUMBER,
    isAdditive: false,
    dependencies: ["ltv", "cac"],
    calculate: (deps) => {
      if (!deps.cac || deps.cac === 0) return 0;
      return (deps.ltv || 0) / deps.cac;
    },
  },

  // ── QUALITATIVE & SENTIMENT (LEVEL 2) ────────────────────────────────────
  customer_sentiment_score: {
    id: "customer_sentiment_score",
    name: { fr: "Score de Sentiment Client", en: "Customer Sentiment Score" },
    level: KPI_LEVELS.KPI_STRATEGIQUE,
    domain: DOMAINS.CLIENTS,
    semanticType: "score",
    economicRole: ECONOMIC_ROLES.RESULT,
    dataType: DATA_TYPES.PERCENTAGE,
    isAdditive: false,
    dependencies: [],
    // Evaluated by the qualitativeEngine usually, but the KPI engine reads the pre-aggregated value
    calculate: (deps) => deps.customer_sentiment_score || 0,
  },

});

/**
 * Get a KPI definition by its canonical key.
 * @param {string} kpiId 
 * @returns {Object|null}
 */
export function getKpiDefinition(kpiId) {
  return KPI_REGISTRY[kpiId] || null;
}

/**
 * Get all KPIs belonging to a specific domain.
 * @param {string} domain 
 * @returns {Object[]}
 */
export function getKpisByDomain(domain) {
  return Object.values(KPI_REGISTRY).filter(kpi => kpi.domain === domain);
}

/**
 * Resolves the full dependency tree for a given KPI.
 * Returns a flat array of all required canonical keys, traversing nested KPIs.
 * 
 * @param {string} kpiId 
 * @returns {string[]} Array of required base data canonical keys
 */
export function resolveKpiDependencies(kpiId) {
  const kpi = getKpiDefinition(kpiId);
  if (!kpi) return [];

  const baseDependencies = new Set();
  const visited = new Set();

  function traverse(id) {
    if (visited.has(id)) return;
    visited.add(id);

    const def = getKpiDefinition(id);
    if (!def) {
      // It's a base measure/field, not a computed KPI
      baseDependencies.add(id);
      return;
    }

    if (def.level === KPI_LEVELS.MESURE) {
      // It's a level 1 measure, add its source dependencies
      def.dependencies.forEach(d => baseDependencies.add(d));
    } else {
      // It's a derived KPI, recurse into its dependencies
      def.dependencies.forEach(d => traverse(d));
    }
  }

  traverse(kpiId);
  return Array.from(baseDependencies);
}

/**
 * Orders a list of KPIs topologically so that dependencies are calculated first.
 * 
 * @param {string[]} kpiIds 
 * @returns {string[]} Ordered list of KPI IDs
 */
export function sortKpisTopologically(kpiIds) {
  const result = [];
  const visited = new Set();
  const tempMark = new Set();

  function visit(id) {
    if (tempMark.has(id)) throw new Error(`Circular dependency detected involving ${id}`);
    if (visited.has(id)) return;

    tempMark.add(id);

    const def = getKpiDefinition(id);
    if (def && def.dependencies) {
      def.dependencies.forEach(dep => {
        if (getKpiDefinition(dep)) { // Only traverse if the dependency is also a computed KPI
          visit(dep);
        }
      });
    }

    tempMark.delete(id);
    visited.add(id);
    result.push(id);
  }

  kpiIds.forEach(id => {
    if (getKpiDefinition(id)) {
      visit(id);
    }
  });

  return result;
}

