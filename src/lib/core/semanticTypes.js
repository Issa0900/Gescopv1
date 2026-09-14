// ─────────────────────────────────────────────────────────────────────────────
// GESCOP Data Intelligence Core — Semantic Types Catalog
// ─────────────────────────────────────────────────────────────────────────────
//
// This is the foundational dictionary of the Data Intelligence Core.
// Every recognized field in every entity will be linked to an entry here.
//
// RULES:
// 1. This file is the SINGLE SOURCE OF TRUTH for semantic classification.
// 2. Do NOT duplicate these definitions elsewhere.
// 3. Every new semantic concept must be added here first.
// 4. Changes here propagate to: fieldSemantic, entityFieldMap, kpiEngine,
//    compatibilityEngine, chartValidator, displayEngine.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Economic roles define how a value behaves in business logic.
 * This is the most critical classification — it determines what operations
 * are valid on a value (sum, average, compare, compose).
 */
export const ECONOMIC_ROLES = Object.freeze({
  /** Cumulative over time — can be summed across periods (revenue, expenses, orders) */
  FLOW: "FLOW",
  /** Point-in-time value — CANNOT be summed across periods (cash balance, inventory) */
  STOCK: "STOCK",
  /** A rate or percentage — must be weighted-averaged, never summed */
  RATE: "RATE",
  /** A ratio of two measures — context-dependent aggregation */
  RATIO: "RATIO",
  /** A count of discrete items — can be summed */
  COUNT: "COUNT",
  /** A measurable quantity (hours, units, weight) — can be summed if same unit */
  QUANTITY: "QUANTITY",
  /** An outstanding balance (receivable, payable) — point-in-time, not summable */
  BALANCE: "BALANCE",
  /** An owned resource (equipment, property) — point-in-time valuation */
  ASSET: "ASSET",
  /** An owed obligation — point-in-time */
  LIABILITY: "LIABILITY",
  /** A computed result from other values (margin amount, net income) */
  RESULT: "RESULT",
  /** A categorical or identifier field — no arithmetic operations */
  DIMENSION: "DIMENSION",
});

/**
 * Temporal types define how a value relates to time.
 * This prevents errors like summing monthly cash balances.
 */
export const TEMPORAL_TYPES = Object.freeze({
  /** Accumulated over a period — summing across periods is valid */
  FLOW: "flow",
  /** Snapshot at a point in time — only the latest value matters */
  STOCK: "stock",
  /** A single observation at a moment — similar to stock but event-driven */
  SNAPSHOT: "snapshot",
  /** Not time-dependent (categories, identifiers) */
  STATIC: "static",
});

/**
 * Data types for display and validation.
 */
export const DATA_TYPES = Object.freeze({
  CURRENCY: "currency",
  PERCENTAGE: "percentage",
  NUMBER: "number",
  INTEGER: "integer",
  DATE: "date",
  STRING: "string",
  BOOLEAN: "boolean",
  DURATION: "duration",
  SCORE: "score",
});

/**
 * Aggregation methods — how a value should be combined across records.
 */
export const AGGREGATION_METHODS = Object.freeze({
  SUM: "sum",
  AVG: "avg",
  WEIGHTED_AVG: "weighted_avg",
  LAST: "last",
  FIRST: "first",
  MIN: "min",
  MAX: "max",
  COUNT: "count",
  COUNT_DISTINCT: "count_distinct",
  NONE: "none",
});

/**
 * Business domains for organizing KPIs and dashboards.
 */
export const DOMAINS = Object.freeze({
  FINANCE: "finance",
  VENTES: "ventes",
  MARKETING: "marketing",
  OPERATIONS: "operations",
  RH: "rh",
  TRESORERIE: "tresorerie",
  CLIENTS: "clients",
});

/**
 * Grain types — the level of detail of each record.
 */
export const GRAIN_TYPES = Object.freeze({
  TRANSACTION: "transaction",
  ORDER: "order",
  CUSTOMER: "customer",
  PRODUCT: "product",
  EMPLOYEE: "employee",
  CAMPAIGN: "campaign",
  CAMPAIGN_DAILY: "campaign_daily",
  DAY: "day",
  WEEK: "week",
  MONTH: "month",
  QUARTER: "quarter",
  YEAR: "year",
  SUPPLIER: "supplier",
  PURCHASE: "purchase",
  INTERACTION: "interaction",
  EVENT: "event",
});

/**
 * KPI status — the reliability state of a computed indicator.
 */
export const KPI_STATUS = Object.freeze({
  /** All dependencies present, quality sufficient, calculation valid */
  AVAILABLE: "AVAILABLE",
  /** Some optional data missing — result is valid but incomplete */
  CONDITIONAL: "CONDITIONAL",
  /** Using proxy data or extrapolation — value is an estimate */
  ESTIMATED: "ESTIMATED",
  /** Critical dependencies missing — cannot compute */
  UNAVAILABLE: "UNAVAILABLE",
  /** Calculation produced an invalid result (NaN, division by zero) */
  INVALID: "INVALID",
  /** Requires manual review before trusting */
  REVIEW: "REVIEW",
  /** Manually verified by user */
  VERIFIED: "VERIFIED",
});

/**
 * KPI levels — the hierarchy from raw data to strategic insight.
 */
export const KPI_LEVELS = Object.freeze({
  /** Raw aggregated value from source data (e.g., total revenue) */
  MESURE: "MESURE",
  /** Derived indicator from one or more measures (e.g., gross margin %) */
  KPI: "KPI",
  /** High-level strategic indicator combining multiple KPIs */
  KPI_STRATEGIQUE: "KPI_STRATEGIQUE",
});

/**
 * Evidence tags for AI governance — how a statement was produced.
 */
export const EVIDENCE_TAGS = Object.freeze({
  /** Raw verifiable data from the source */
  FAIT: "FAIT",
  /** Result of a deterministic formula */
  CALCUL: "CALCUL",
  /** Logical deduction from an engine */
  INFERENCE: "INFÉRENCE",
  /** Unverified assumption */
  HYPOTHESE: "HYPOTHÈSE",
  /** Suggested action */
  RECOMMANDATION: "RECOMMANDATION",
});

// ─────────────────────────────────────────────────────────────────────────────
// SEMANTIC TYPES CATALOG
// ─────────────────────────────────────────────────────────────────────────────
//
// Each entry defines the full semantic profile of a field concept.
// When a field is recognized as a given semantic type, it inherits all
// these properties, which then drive: aggregation, compatibility checks,
// chart validation, and KPI calculation.
// ─────────────────────────────────────────────────────────────────────────────

export const SEMANTIC_TYPES = Object.freeze({
  // ── FINANCE ────────────────────────────────────────────────────────────

  revenue: {
    label: { fr: "Revenu", en: "Revenue" },
    economicRole: ECONOMIC_ROLES.FLOW,
    dataType: DATA_TYPES.CURRENCY,
    temporalType: TEMPORAL_TYPES.FLOW,
    aggregation: AGGREGATION_METHODS.SUM,
    isAdditive: true,
    isComparable: true,
    domain: DOMAINS.FINANCE,
    direction: "up", // higher is better
  },

  expense: {
    label: { fr: "Dépense", en: "Expense" },
    economicRole: ECONOMIC_ROLES.FLOW,
    dataType: DATA_TYPES.CURRENCY,
    temporalType: TEMPORAL_TYPES.FLOW,
    aggregation: AGGREGATION_METHODS.SUM,
    isAdditive: true,
    isComparable: true,
    domain: DOMAINS.FINANCE,
    direction: "down", // lower is better
  },

  cost: {
    label: { fr: "Coût", en: "Cost" },
    economicRole: ECONOMIC_ROLES.FLOW,
    dataType: DATA_TYPES.CURRENCY,
    temporalType: TEMPORAL_TYPES.FLOW,
    aggregation: AGGREGATION_METHODS.SUM,
    isAdditive: true,
    isComparable: true,
    domain: DOMAINS.OPERATIONS,
    direction: "down",
  },

  tax: {
    label: { fr: "Taxe", en: "Tax" },
    economicRole: ECONOMIC_ROLES.FLOW,
    dataType: DATA_TYPES.CURRENCY,
    temporalType: TEMPORAL_TYPES.FLOW,
    aggregation: AGGREGATION_METHODS.SUM,
    isAdditive: true,
    isComparable: true,
    domain: DOMAINS.FINANCE,
    direction: "neutral",
  },

  discount: {
    label: { fr: "Remise", en: "Discount" },
    economicRole: ECONOMIC_ROLES.FLOW,
    dataType: DATA_TYPES.CURRENCY,
    temporalType: TEMPORAL_TYPES.FLOW,
    aggregation: AGGREGATION_METHODS.SUM,
    isAdditive: true,
    isComparable: true,
    domain: DOMAINS.VENTES,
    direction: "neutral",
  },

  // ── TRÉSORERIE ─────────────────────────────────────────────────────────

  cash_balance: {
    label: { fr: "Solde de trésorerie", en: "Cash Balance" },
    economicRole: ECONOMIC_ROLES.STOCK,
    dataType: DATA_TYPES.CURRENCY,
    temporalType: TEMPORAL_TYPES.STOCK,
    aggregation: AGGREGATION_METHODS.LAST,
    isAdditive: false,
    isComparable: true,
    domain: DOMAINS.TRESORERIE,
    direction: "up",
  },

  cash_inflow: {
    label: { fr: "Entrée de trésorerie", en: "Cash Inflow" },
    economicRole: ECONOMIC_ROLES.FLOW,
    dataType: DATA_TYPES.CURRENCY,
    temporalType: TEMPORAL_TYPES.FLOW,
    aggregation: AGGREGATION_METHODS.SUM,
    isAdditive: true,
    isComparable: true,
    domain: DOMAINS.TRESORERIE,
    direction: "up",
  },

  cash_outflow: {
    label: { fr: "Sortie de trésorerie", en: "Cash Outflow" },
    economicRole: ECONOMIC_ROLES.FLOW,
    dataType: DATA_TYPES.CURRENCY,
    temporalType: TEMPORAL_TYPES.FLOW,
    aggregation: AGGREGATION_METHODS.SUM,
    isAdditive: true,
    isComparable: true,
    domain: DOMAINS.TRESORERIE,
    direction: "down",
  },

  net_cash_flow: {
    label: { fr: "Flux net de trésorerie", en: "Net Cash Flow" },
    economicRole: ECONOMIC_ROLES.RESULT,
    dataType: DATA_TYPES.CURRENCY,
    temporalType: TEMPORAL_TYPES.FLOW,
    aggregation: AGGREGATION_METHODS.SUM,
    isAdditive: true,
    isComparable: true,
    domain: DOMAINS.TRESORERIE,
    direction: "up",
  },

  // ── BALANCE SHEET ──────────────────────────────────────────────────────

  receivable: {
    label: { fr: "Comptes clients", en: "Accounts Receivable" },
    economicRole: ECONOMIC_ROLES.BALANCE,
    dataType: DATA_TYPES.CURRENCY,
    temporalType: TEMPORAL_TYPES.STOCK,
    aggregation: AGGREGATION_METHODS.LAST,
    isAdditive: false,
    isComparable: true,
    domain: DOMAINS.FINANCE,
    direction: "neutral",
  },

  payable: {
    label: { fr: "Comptes fournisseurs", en: "Accounts Payable" },
    economicRole: ECONOMIC_ROLES.BALANCE,
    dataType: DATA_TYPES.CURRENCY,
    temporalType: TEMPORAL_TYPES.STOCK,
    aggregation: AGGREGATION_METHODS.LAST,
    isAdditive: false,
    isComparable: true,
    domain: DOMAINS.FINANCE,
    direction: "neutral",
  },

  // ── INVENTORY ──────────────────────────────────────────────────────────

  inventory_value: {
    label: { fr: "Valeur du stock", en: "Inventory Value" },
    economicRole: ECONOMIC_ROLES.STOCK,
    dataType: DATA_TYPES.CURRENCY,
    temporalType: TEMPORAL_TYPES.STOCK,
    aggregation: AGGREGATION_METHODS.LAST,
    isAdditive: false,
    isComparable: true,
    domain: DOMAINS.OPERATIONS,
    direction: "neutral",
  },

  inventory_quantity: {
    label: { fr: "Quantité en stock", en: "Inventory Quantity" },
    economicRole: ECONOMIC_ROLES.STOCK,
    dataType: DATA_TYPES.INTEGER,
    temporalType: TEMPORAL_TYPES.STOCK,
    aggregation: AGGREGATION_METHODS.LAST,
    isAdditive: false,
    isComparable: true,
    domain: DOMAINS.OPERATIONS,
    direction: "neutral",
  },

  // ── VENTES ─────────────────────────────────────────────────────────────

  sales_quantity: {
    label: { fr: "Quantité vendue", en: "Sales Quantity" },
    economicRole: ECONOMIC_ROLES.QUANTITY,
    dataType: DATA_TYPES.INTEGER,
    temporalType: TEMPORAL_TYPES.FLOW,
    aggregation: AGGREGATION_METHODS.SUM,
    isAdditive: true,
    isComparable: true,
    domain: DOMAINS.VENTES,
    direction: "up",
  },

  unit_price: {
    label: { fr: "Prix unitaire", en: "Unit Price" },
    economicRole: ECONOMIC_ROLES.RATE,
    dataType: DATA_TYPES.CURRENCY,
    temporalType: TEMPORAL_TYPES.STATIC,
    aggregation: AGGREGATION_METHODS.AVG,
    isAdditive: false,
    isComparable: true,
    domain: DOMAINS.VENTES,
    direction: "neutral",
  },

  purchase_cost: {
    label: { fr: "Coût d'achat", en: "Purchase Cost" },
    economicRole: ECONOMIC_ROLES.RATE,
    dataType: DATA_TYPES.CURRENCY,
    temporalType: TEMPORAL_TYPES.STATIC,
    aggregation: AGGREGATION_METHODS.AVG,
    isAdditive: false,
    isComparable: true,
    domain: DOMAINS.OPERATIONS,
    direction: "down",
  },

  selling_price: {
    label: { fr: "Prix de vente", en: "Selling Price" },
    economicRole: ECONOMIC_ROLES.RATE,
    dataType: DATA_TYPES.CURRENCY,
    temporalType: TEMPORAL_TYPES.STATIC,
    aggregation: AGGREGATION_METHODS.AVG,
    isAdditive: false,
    isComparable: true,
    domain: DOMAINS.VENTES,
    direction: "up",
  },

  // ── RATES & PERCENTAGES ────────────────────────────────────────────────

  margin: {
    label: { fr: "Marge", en: "Margin" },
    economicRole: ECONOMIC_ROLES.RATE,
    dataType: DATA_TYPES.PERCENTAGE,
    temporalType: TEMPORAL_TYPES.FLOW,
    aggregation: AGGREGATION_METHODS.WEIGHTED_AVG,
    isAdditive: false,
    isComparable: true,
    domain: DOMAINS.FINANCE,
    direction: "up",
  },

  percentage: {
    label: { fr: "Pourcentage", en: "Percentage" },
    economicRole: ECONOMIC_ROLES.RATE,
    dataType: DATA_TYPES.PERCENTAGE,
    temporalType: TEMPORAL_TYPES.FLOW,
    aggregation: AGGREGATION_METHODS.AVG,
    isAdditive: false,
    isComparable: true,
    domain: null,
    direction: "neutral",
  },

  // ── RATIOS ─────────────────────────────────────────────────────────────

  ratio: {
    label: { fr: "Ratio", en: "Ratio" },
    economicRole: ECONOMIC_ROLES.RATIO,
    dataType: DATA_TYPES.NUMBER,
    temporalType: TEMPORAL_TYPES.FLOW,
    aggregation: AGGREGATION_METHODS.WEIGHTED_AVG,
    isAdditive: false,
    isComparable: true,
    domain: null,
    direction: "neutral",
  },

  // ── COUNTS ─────────────────────────────────────────────────────────────

  count: {
    label: { fr: "Nombre", en: "Count" },
    economicRole: ECONOMIC_ROLES.COUNT,
    dataType: DATA_TYPES.INTEGER,
    temporalType: TEMPORAL_TYPES.FLOW,
    aggregation: AGGREGATION_METHODS.SUM,
    isAdditive: true,
    isComparable: true,
    domain: null,
    direction: "neutral",
  },

  headcount: {
    label: { fr: "Effectif", en: "Headcount" },
    economicRole: ECONOMIC_ROLES.STOCK,
    dataType: DATA_TYPES.INTEGER,
    temporalType: TEMPORAL_TYPES.STOCK,
    aggregation: AGGREGATION_METHODS.LAST,
    isAdditive: false,
    isComparable: true,
    domain: DOMAINS.RH,
    direction: "neutral",
  },

  // ── DURATION ───────────────────────────────────────────────────────────

  duration: {
    label: { fr: "Durée", en: "Duration" },
    economicRole: ECONOMIC_ROLES.QUANTITY,
    dataType: DATA_TYPES.DURATION,
    temporalType: TEMPORAL_TYPES.FLOW,
    aggregation: AGGREGATION_METHODS.AVG,
    isAdditive: false,
    isComparable: true,
    domain: null,
    direction: "neutral",
  },

  // ── SCORES ─────────────────────────────────────────────────────────────

  score: {
    label: { fr: "Score", en: "Score" },
    economicRole: ECONOMIC_ROLES.RATE,
    dataType: DATA_TYPES.SCORE,
    temporalType: TEMPORAL_TYPES.SNAPSHOT,
    aggregation: AGGREGATION_METHODS.AVG,
    isAdditive: false,
    isComparable: true,
    domain: null,
    direction: "up",
  },

  // ── RH ─────────────────────────────────────────────────────────────────

  payroll_cost: {
    label: { fr: "Coût salarial", en: "Payroll Cost" },
    economicRole: ECONOMIC_ROLES.FLOW,
    dataType: DATA_TYPES.CURRENCY,
    temporalType: TEMPORAL_TYPES.FLOW,
    aggregation: AGGREGATION_METHODS.SUM,
    isAdditive: true,
    isComparable: true,
    domain: DOMAINS.RH,
    direction: "neutral",
  },

  hourly_rate: {
    label: { fr: "Taux horaire", en: "Hourly Rate" },
    economicRole: ECONOMIC_ROLES.RATE,
    dataType: DATA_TYPES.CURRENCY,
    temporalType: TEMPORAL_TYPES.STATIC,
    aggregation: AGGREGATION_METHODS.AVG,
    isAdditive: false,
    isComparable: true,
    domain: DOMAINS.RH,
    direction: "neutral",
  },

  hours_worked: {
    label: { fr: "Heures travaillées", en: "Hours Worked" },
    economicRole: ECONOMIC_ROLES.QUANTITY,
    dataType: DATA_TYPES.NUMBER,
    temporalType: TEMPORAL_TYPES.FLOW,
    aggregation: AGGREGATION_METHODS.SUM,
    isAdditive: true,
    isComparable: true,
    domain: DOMAINS.RH,
    direction: "neutral",
  },

  // ── MARKETING ──────────────────────────────────────────────────────────

  impressions: {
    label: { fr: "Impressions", en: "Impressions" },
    economicRole: ECONOMIC_ROLES.COUNT,
    dataType: DATA_TYPES.INTEGER,
    temporalType: TEMPORAL_TYPES.FLOW,
    aggregation: AGGREGATION_METHODS.SUM,
    isAdditive: true,
    isComparable: true,
    domain: DOMAINS.MARKETING,
    direction: "up",
  },

  clicks: {
    label: { fr: "Clics", en: "Clicks" },
    economicRole: ECONOMIC_ROLES.COUNT,
    dataType: DATA_TYPES.INTEGER,
    temporalType: TEMPORAL_TYPES.FLOW,
    aggregation: AGGREGATION_METHODS.SUM,
    isAdditive: true,
    isComparable: true,
    domain: DOMAINS.MARKETING,
    direction: "up",
  },

  conversions: {
    label: { fr: "Conversions", en: "Conversions" },
    economicRole: ECONOMIC_ROLES.COUNT,
    dataType: DATA_TYPES.INTEGER,
    temporalType: TEMPORAL_TYPES.FLOW,
    aggregation: AGGREGATION_METHODS.SUM,
    isAdditive: true,
    isComparable: true,
    domain: DOMAINS.MARKETING,
    direction: "up",
  },

  budget: {
    label: { fr: "Budget", en: "Budget" },
    economicRole: ECONOMIC_ROLES.FLOW,
    dataType: DATA_TYPES.CURRENCY,
    temporalType: TEMPORAL_TYPES.FLOW,
    aggregation: AGGREGATION_METHODS.SUM,
    isAdditive: true,
    isComparable: true,
    domain: DOMAINS.MARKETING,
    direction: "neutral",
  },

  // ── DIMENSIONS (non-numeric) ───────────────────────────────────────────

  date: {
    label: { fr: "Date", en: "Date" },
    economicRole: ECONOMIC_ROLES.DIMENSION,
    dataType: DATA_TYPES.DATE,
    temporalType: TEMPORAL_TYPES.STATIC,
    aggregation: AGGREGATION_METHODS.NONE,
    isAdditive: false,
    isComparable: false,
    domain: null,
    direction: "neutral",
  },

  identifier: {
    label: { fr: "Identifiant", en: "Identifier" },
    economicRole: ECONOMIC_ROLES.DIMENSION,
    dataType: DATA_TYPES.STRING,
    temporalType: TEMPORAL_TYPES.STATIC,
    aggregation: AGGREGATION_METHODS.COUNT_DISTINCT,
    isAdditive: false,
    isComparable: false,
    domain: null,
    direction: "neutral",
  },

  category: {
    label: { fr: "Catégorie", en: "Category" },
    economicRole: ECONOMIC_ROLES.DIMENSION,
    dataType: DATA_TYPES.STRING,
    temporalType: TEMPORAL_TYPES.STATIC,
    aggregation: AGGREGATION_METHODS.NONE,
    isAdditive: false,
    isComparable: false,
    domain: null,
    direction: "neutral",
  },

  status: {
    label: { fr: "Statut", en: "Status" },
    economicRole: ECONOMIC_ROLES.DIMENSION,
    dataType: DATA_TYPES.STRING,
    temporalType: TEMPORAL_TYPES.STATIC,
    aggregation: AGGREGATION_METHODS.NONE,
    isAdditive: false,
    isComparable: false,
    domain: null,
    direction: "neutral",
  },

  name: {
    label: { fr: "Nom", en: "Name" },
    economicRole: ECONOMIC_ROLES.DIMENSION,
    dataType: DATA_TYPES.STRING,
    temporalType: TEMPORAL_TYPES.STATIC,
    aggregation: AGGREGATION_METHODS.NONE,
    isAdditive: false,
    isComparable: false,
    domain: null,
    direction: "neutral",
  },

  description: {
    label: { fr: "Description", en: "Description" },
    economicRole: ECONOMIC_ROLES.DIMENSION,
    dataType: DATA_TYPES.STRING,
    temporalType: TEMPORAL_TYPES.STATIC,
    aggregation: AGGREGATION_METHODS.NONE,
    isAdditive: false,
    isComparable: false,
    domain: null,
    direction: "neutral",
  },

  country: {
    label: { fr: "Pays", en: "Country" },
    economicRole: ECONOMIC_ROLES.DIMENSION,
    dataType: DATA_TYPES.STRING,
    temporalType: TEMPORAL_TYPES.STATIC,
    aggregation: AGGREGATION_METHODS.NONE,
    isAdditive: false,
    isComparable: false,
    domain: null,
    direction: "neutral",
  },

  email: {
    label: { fr: "Courriel", en: "Email" },
    economicRole: ECONOMIC_ROLES.DIMENSION,
    dataType: DATA_TYPES.STRING,
    temporalType: TEMPORAL_TYPES.STATIC,
    aggregation: AGGREGATION_METHODS.NONE,
    isAdditive: false,
    isComparable: false,
    domain: null,
    direction: "neutral",
  },

  boolean_flag: {
    label: { fr: "Indicateur", en: "Flag" },
    economicRole: ECONOMIC_ROLES.DIMENSION,
    dataType: DATA_TYPES.BOOLEAN,
    temporalType: TEMPORAL_TYPES.STATIC,
    aggregation: AGGREGATION_METHODS.NONE,
    isAdditive: false,
    isComparable: false,
    domain: null,
    direction: "neutral",
  },

  sentiment: {
    label: { fr: "Sentiment", en: "Sentiment" },
    economicRole: ECONOMIC_ROLES.DIMENSION,
    dataType: DATA_TYPES.STRING,
    temporalType: TEMPORAL_TYPES.SNAPSHOT,
    aggregation: AGGREGATION_METHODS.NONE,
    isAdditive: false,
    isComparable: false,
    domain: DOMAINS.CLIENTS,
    direction: "neutral",
  },
});

// ─────────────────────────────────────────────────────────────────────────────
// COMPATIBILITY RULES
// ─────────────────────────────────────────────────────────────────────────────
//
// Defines which economic roles can be combined in charts and calculations.
// This is the core of the "test ultime" — preventing invalid compositions.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Matrix defining which economic roles can be SUMMED together.
 * Key: roleA, Value: Set of roles that can be added to roleA.
 *
 * FLOW + FLOW = OK (revenue + expenses = net income)
 * STOCK + STOCK = OK if same snapshot (AR + AP = net position)
 * FLOW + STOCK = NEVER (revenue + cash balance = nonsense)
 * RATE + anything = NEVER summed
 * RATIO + anything = NEVER summed
 */
export const ADDITIVE_COMPATIBILITY = Object.freeze({
  [ECONOMIC_ROLES.FLOW]: new Set([
    ECONOMIC_ROLES.FLOW,
    ECONOMIC_ROLES.RESULT,
  ]),
  [ECONOMIC_ROLES.STOCK]: new Set([
    ECONOMIC_ROLES.STOCK,
    ECONOMIC_ROLES.BALANCE,
    ECONOMIC_ROLES.ASSET,
    ECONOMIC_ROLES.LIABILITY,
  ]),
  [ECONOMIC_ROLES.BALANCE]: new Set([
    ECONOMIC_ROLES.STOCK,
    ECONOMIC_ROLES.BALANCE,
    ECONOMIC_ROLES.ASSET,
    ECONOMIC_ROLES.LIABILITY,
  ]),
  [ECONOMIC_ROLES.ASSET]: new Set([
    ECONOMIC_ROLES.STOCK,
    ECONOMIC_ROLES.BALANCE,
    ECONOMIC_ROLES.ASSET,
  ]),
  [ECONOMIC_ROLES.LIABILITY]: new Set([
    ECONOMIC_ROLES.STOCK,
    ECONOMIC_ROLES.BALANCE,
    ECONOMIC_ROLES.LIABILITY,
  ]),
  [ECONOMIC_ROLES.RESULT]: new Set([
    ECONOMIC_ROLES.FLOW,
    ECONOMIC_ROLES.RESULT,
  ]),
  [ECONOMIC_ROLES.COUNT]: new Set([
    ECONOMIC_ROLES.COUNT,
    ECONOMIC_ROLES.QUANTITY,
  ]),
  [ECONOMIC_ROLES.QUANTITY]: new Set([
    ECONOMIC_ROLES.COUNT,
    ECONOMIC_ROLES.QUANTITY,
  ]),
  // These can NEVER be summed with anything
  [ECONOMIC_ROLES.RATE]: new Set(),
  [ECONOMIC_ROLES.RATIO]: new Set(),
  [ECONOMIC_ROLES.DIMENSION]: new Set(),
});

/**
 * Matrix defining which economic roles can be COMPARED side-by-side
 * (e.g., in a multi-line chart or a comparison table).
 * Comparison is much more permissive than addition.
 */
export const COMPARISON_COMPATIBILITY = Object.freeze({
  [ECONOMIC_ROLES.FLOW]: new Set([
    ECONOMIC_ROLES.FLOW,
    ECONOMIC_ROLES.RESULT,
    ECONOMIC_ROLES.COUNT,
    ECONOMIC_ROLES.QUANTITY,
  ]),
  [ECONOMIC_ROLES.STOCK]: new Set([
    ECONOMIC_ROLES.STOCK,
    ECONOMIC_ROLES.BALANCE,
    ECONOMIC_ROLES.ASSET,
    ECONOMIC_ROLES.LIABILITY,
  ]),
  [ECONOMIC_ROLES.RATE]: new Set([
    ECONOMIC_ROLES.RATE,
  ]),
  [ECONOMIC_ROLES.RATIO]: new Set([
    ECONOMIC_ROLES.RATIO,
  ]),
  [ECONOMIC_ROLES.COUNT]: new Set([
    ECONOMIC_ROLES.COUNT,
    ECONOMIC_ROLES.QUANTITY,
    ECONOMIC_ROLES.FLOW,
  ]),
  [ECONOMIC_ROLES.QUANTITY]: new Set([
    ECONOMIC_ROLES.QUANTITY,
    ECONOMIC_ROLES.COUNT,
    ECONOMIC_ROLES.FLOW,
  ]),
  [ECONOMIC_ROLES.BALANCE]: new Set([
    ECONOMIC_ROLES.STOCK,
    ECONOMIC_ROLES.BALANCE,
    ECONOMIC_ROLES.ASSET,
    ECONOMIC_ROLES.LIABILITY,
  ]),
  [ECONOMIC_ROLES.ASSET]: new Set([
    ECONOMIC_ROLES.STOCK,
    ECONOMIC_ROLES.BALANCE,
    ECONOMIC_ROLES.ASSET,
  ]),
  [ECONOMIC_ROLES.LIABILITY]: new Set([
    ECONOMIC_ROLES.STOCK,
    ECONOMIC_ROLES.BALANCE,
    ECONOMIC_ROLES.LIABILITY,
  ]),
  [ECONOMIC_ROLES.RESULT]: new Set([
    ECONOMIC_ROLES.FLOW,
    ECONOMIC_ROLES.RESULT,
  ]),
  [ECONOMIC_ROLES.DIMENSION]: new Set(),
});

// ─────────────────────────────────────────────────────────────────────────────
// HELPER FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Get the full semantic type definition for a given type key.
 * @param {string} typeKey — e.g., 'revenue', 'cash_balance', 'margin'
 * @returns {object|null} The semantic type definition or null if unknown.
 */
export function getSemanticType(typeKey) {
  return SEMANTIC_TYPES[typeKey] || null;
}

/**
 * Check if two economic roles can be summed together.
 * @param {string} roleA
 * @param {string} roleB
 * @returns {boolean}
 */
export function canSum(roleA, roleB) {
  const compatible = ADDITIVE_COMPATIBILITY[roleA];
  return compatible ? compatible.has(roleB) : false;
}

/**
 * Check if two economic roles can be compared side-by-side.
 * @param {string} roleA
 * @param {string} roleB
 * @returns {boolean}
 */
export function canCompare(roleA, roleB) {
  const compatible = COMPARISON_COMPATIBILITY[roleA];
  return compatible ? compatible.has(roleB) : false;
}

/**
 * Get all semantic types that belong to a given domain.
 * @param {string} domain — e.g., 'finance', 'ventes'
 * @returns {string[]} Array of semantic type keys.
 */
export function getTypesByDomain(domain) {
  return Object.entries(SEMANTIC_TYPES)
    .filter(([, def]) => def.domain === domain)
    .map(([key]) => key);
}

/**
 * Get all semantic types that have a given economic role.
 * @param {string} role — e.g., 'FLOW', 'STOCK'
 * @returns {string[]} Array of semantic type keys.
 */
export function getTypesByRole(role) {
  return Object.entries(SEMANTIC_TYPES)
    .filter(([, def]) => def.economicRole === role)
    .map(([key]) => key);
}

