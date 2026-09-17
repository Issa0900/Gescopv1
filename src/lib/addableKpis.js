// Catalog of KPI_REGISTRY indicators that /kpis does not show by default but
// a user can opt into via the "Ajouter un indicateur" picker. Each one is
// computed live through the same semantic engine as everything else, so it
// only ever appears with a real value - if the data it needs isn't there,
// it stays hidden instead of showing a fake zero (exactly the class of bug
// this session spent most of its time fixing elsewhere).
//
// Deliberately excluded, and why:
//  - cash_runway: redundant with the existing "Autonomie de trésorerie" card,
//    which already handles the "trésorerie autofinancée" (infinite runway)
//    case that this raw registry KPI does not.
//  - gross_margin_amount / gross_margin_pct / ebitda: depend on `cogs` /
//    `operating_expense`, sources this app never gets real data for today
//    (Order.cost is unpopulated in every import seen so far) - they would
//    silently equal total_revenue (a false "100% margin") or duplicate
//    "Résultat net" under a different name.
export const ADDABLE_KPIS = [
  // Finance
  { id: "net_income", domain: "finance" },
  // Trésorerie - DSO/DPO are the market-standard pair for cash-cycle health
  { id: "bfr", domain: "tresorerie" },
  { id: "bfr_days", domain: "tresorerie" },
  { id: "dso", domain: "tresorerie" },
  { id: "dpo", domain: "tresorerie" },
  // Ventes
  { id: "purchase_frequency", domain: "ventes" },
  { id: "active_customers", domain: "ventes" },
  { id: "churn_rate", domain: "ventes" },
  { id: "arpu", domain: "ventes" },
  { id: "ltv", domain: "ventes" },
  // Marketing
  { id: "marketing_roi", domain: "marketing" },
  { id: "cpc", domain: "marketing" },
  { id: "cpm", domain: "marketing" },
  { id: "ltv_cac_ratio", domain: "marketing" },
  // RH
  { id: "payroll_total", domain: "rh" },
  { id: "employee_count", domain: "rh" },
  { id: "rh_expense_ratio", domain: "rh" },
  { id: "revenue_per_employee", domain: "rh" },
  { id: "avg_employee_cost", domain: "rh" },
  { id: "overtime_ratio", domain: "rh" },
];

export const ADDABLE_KPI_IDS = ADDABLE_KPIS.map((k) => k.id);
