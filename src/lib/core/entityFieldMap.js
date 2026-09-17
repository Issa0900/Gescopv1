// ─────────────────────────────────────────────────────────────────────────────
// GESCOP Data Intelligence Core - Entity Field Map
// ─────────────────────────────────────────────────────────────────────────────
//
// Declarative mapping of every field in every Base44 entity to its semantic
// type, canonical key, and grain. This is the bridge between the 31 entities
// defined in base44/entities/*.jsonc and the Data Semantic Core.
//
// RULES:
// 1. Every importable entity must have an entry here.
// 2. Every field that carries business meaning must be mapped.
// 3. Ambiguous fields (e.g., Transaction.amount) use contextRules.
// 4. This map is consumed by: kpiEngine, dataQualityEngine, displayEngine,
//    contextualRecognition, and all downstream modules.
// ─────────────────────────────────────────────────────────────────────────────

import { GRAIN_TYPES } from "./semanticTypes.js";
import { createFieldSemantic } from "./fieldSemantic.js";

// ─────────────────────────────────────────────────────────────────────────────
// RAW FIELD DEFINITIONS
// ─────────────────────────────────────────────────────────────────────────────
//
// Each entity maps its fields to { canonicalKey, semanticType, grain }.
// Fields with contextRules have their semantic type resolved at runtime
// based on the value of another field in the same record.
// ─────────────────────────────────────────────────────────────────────────────

export const ENTITY_FIELD_MAP = Object.freeze({
  // ── ORDERS ─────────────────────────────────────────────────────────────
  Order: {
    order_id:           { canonicalKey: "order_id", semanticType: "identifier", grain: GRAIN_TYPES.ORDER },
    date:               { canonicalKey: "order_date", semanticType: "date", grain: GRAIN_TYPES.ORDER },
    customer_id:        { canonicalKey: "order_customer_id", semanticType: "identifier", grain: GRAIN_TYPES.ORDER },
    product_id:         { canonicalKey: "order_product_id", semanticType: "identifier", grain: GRAIN_TYPES.ORDER },
    quantity:           { canonicalKey: "sales_quantity", semanticType: "sales_quantity", grain: GRAIN_TYPES.ORDER },
    unit_price:         { canonicalKey: "order_unit_price", semanticType: "unit_price", grain: GRAIN_TYPES.ORDER },
    subtotal:           { canonicalKey: "order_subtotal", semanticType: "revenue", grain: GRAIN_TYPES.ORDER },
    discount:           { canonicalKey: "order_discount", semanticType: "discount", grain: GRAIN_TYPES.ORDER },
    tax:                { canonicalKey: "order_tax", semanticType: "tax", grain: GRAIN_TYPES.ORDER },
    total:              { canonicalKey: "revenue", semanticType: "revenue", grain: GRAIN_TYPES.ORDER },
    // importUtils.ts aliases headers like "Montant Total"/"Total Spent" to the
    // raw field total_revenue (a real, separate Order schema property, not a
    // typo for `total`), and its own rescue hook derives it from
    // quantity*unit_price when a file leaves it blank. Without this entry that
    // derived value was written to a field this map never recognized, so
    // total_revenue KPIs read null while the correctly-computed number sat
    // right there in the record.
    total_revenue:      { canonicalKey: "revenue", semanticType: "revenue", grain: GRAIN_TYPES.ORDER },
    cost:               { canonicalKey: "cogs", semanticType: "cost", grain: GRAIN_TYPES.ORDER },
    total_cost:         { canonicalKey: "cogs", semanticType: "cost", grain: GRAIN_TYPES.ORDER },
    gross_margin:       { canonicalKey: "order_gross_margin", semanticType: "revenue", grain: GRAIN_TYPES.ORDER },
    payment_status:     { canonicalKey: "payment_status", semanticType: "status", grain: GRAIN_TYPES.ORDER },
    fulfillment_status: { canonicalKey: "fulfillment_status", semanticType: "status", grain: GRAIN_TYPES.ORDER },
    return_status:      { canonicalKey: "return_status", semanticType: "status", grain: GRAIN_TYPES.ORDER },
  },

  // ── TRANSACTIONS ───────────────────────────────────────────────────────
  // Transaction.amount is CONTEXT-DEPENDENT: its meaning changes based on
  // Transaction.type. This is the canonical example of why naive column
  // recognition fails - "Montant" means different things in different tables.
  Transaction: {
    date:        { canonicalKey: "transaction_date", semanticType: "date", grain: GRAIN_TYPES.TRANSACTION },
    description: { canonicalKey: "transaction_desc", semanticType: "description", grain: GRAIN_TYPES.TRANSACTION },
    amount: {
      canonicalKey: null, // resolved by context
      semanticType: null, // resolved by context
      grain: GRAIN_TYPES.TRANSACTION,
      contextRules: [
        { when: { field: "type", equals: ["income", "entree", "credit", "revenu", "encaissement"] },  then: { canonicalKey: "income_amount", semanticType: "revenue" } },
        { when: { field: "type", equals: ["expense", "sortie", "debit", "depense", "decaissement", "charge"] }, then: { canonicalKey: "expense_amount", semanticType: "expense" } },
      ],
      defaultFallback: { canonicalKey: "transaction_amount", semanticType: "revenue" },
    },
    type:     { canonicalKey: "transaction_type", semanticType: "category", grain: GRAIN_TYPES.TRANSACTION },
    category: { canonicalKey: "transaction_category", semanticType: "category", grain: GRAIN_TYPES.TRANSACTION },
    source:   { canonicalKey: "transaction_source", semanticType: "category", grain: GRAIN_TYPES.TRANSACTION },
    currency: { canonicalKey: "transaction_currency", semanticType: "category", grain: GRAIN_TYPES.TRANSACTION },
    client:   { canonicalKey: "transaction_client", semanticType: "identifier", grain: GRAIN_TYPES.TRANSACTION },
    product:  { canonicalKey: "transaction_product", semanticType: "identifier", grain: GRAIN_TYPES.TRANSACTION },
  },

  // ── CASHFLOW ───────────────────────────────────────────────────────────
  Cashflow: {
    date:                { canonicalKey: "cashflow_date", semanticType: "date", grain: GRAIN_TYPES.DAY },
    opening_cash:        { canonicalKey: "cash_opening", semanticType: "cash_balance", grain: GRAIN_TYPES.DAY },
    closing_cash:        { canonicalKey: "cash_closing", semanticType: "cash_balance", grain: GRAIN_TYPES.DAY },
    cash_in:             { canonicalKey: "cash_inflow", semanticType: "cash_inflow", grain: GRAIN_TYPES.DAY },
    cash_out:            { canonicalKey: "cash_outflow", semanticType: "cash_outflow", grain: GRAIN_TYPES.DAY },
    net_cash_flow:       { canonicalKey: "net_cash_flow", semanticType: "net_cash_flow", grain: GRAIN_TYPES.DAY },
    accounts_receivable: { canonicalKey: "accounts_receivable", semanticType: "receivable", grain: GRAIN_TYPES.DAY },
    accounts_payable:    { canonicalKey: "accounts_payable", semanticType: "payable", grain: GRAIN_TYPES.DAY },
  },

  // ── EXPENSES ───────────────────────────────────────────────────────────
  Expense: {
    expense_id: { canonicalKey: "expense_id", semanticType: "identifier", grain: GRAIN_TYPES.TRANSACTION },
    date:       { canonicalKey: "expense_date", semanticType: "date", grain: GRAIN_TYPES.TRANSACTION },
    category:   { canonicalKey: "expense_category", semanticType: "category", grain: GRAIN_TYPES.TRANSACTION },
    supplier:   { canonicalKey: "expense_supplier", semanticType: "identifier", grain: GRAIN_TYPES.TRANSACTION },
    amount:     { canonicalKey: "operating_expense", semanticType: "expense", grain: GRAIN_TYPES.TRANSACTION },
    recurring:  { canonicalKey: "expense_recurring", semanticType: "boolean_flag", grain: GRAIN_TYPES.TRANSACTION },
    department: { canonicalKey: "expense_department", semanticType: "category", grain: GRAIN_TYPES.TRANSACTION },
  },

  // ── INVENTORY ──────────────────────────────────────────────────────────
  Inventory: {
    inventory_id:    { canonicalKey: "inventory_id", semanticType: "identifier", grain: GRAIN_TYPES.PRODUCT },
    date:            { canonicalKey: "inventory_date", semanticType: "date", grain: GRAIN_TYPES.PRODUCT },
    product_id:      { canonicalKey: "inventory_product_id", semanticType: "identifier", grain: GRAIN_TYPES.PRODUCT },
    opening_stock:   { canonicalKey: "stock_opening", semanticType: "inventory_quantity", grain: GRAIN_TYPES.PRODUCT },
    closing_stock:   { canonicalKey: "stock_closing", semanticType: "inventory_quantity", grain: GRAIN_TYPES.PRODUCT },
    inventory_value: { canonicalKey: "inventory_value", semanticType: "inventory_value", grain: GRAIN_TYPES.PRODUCT },
    stock_status:    { canonicalKey: "stock_status", semanticType: "status", grain: GRAIN_TYPES.PRODUCT },
  },

  // ── CUSTOMERS ──────────────────────────────────────────────────────────
  Customer: {
    customer_id:    { canonicalKey: "customer_id", semanticType: "identifier", grain: GRAIN_TYPES.CUSTOMER },
    first_name:     { canonicalKey: "customer_first_name", semanticType: "name", grain: GRAIN_TYPES.CUSTOMER },
    last_name:      { canonicalKey: "customer_last_name", semanticType: "name", grain: GRAIN_TYPES.CUSTOMER },
    email:          { canonicalKey: "customer_email", semanticType: "email", grain: GRAIN_TYPES.CUSTOMER },
    customer_type:  { canonicalKey: "customer_type", semanticType: "category", grain: GRAIN_TYPES.CUSTOMER },
    total_orders:   { canonicalKey: "customer_total_orders", semanticType: "count", grain: GRAIN_TYPES.CUSTOMER },
    total_revenue:  { canonicalKey: "customer_revenue", semanticType: "revenue", grain: GRAIN_TYPES.CUSTOMER },
    lifetime_value: { canonicalKey: "ltv", semanticType: "revenue", grain: GRAIN_TYPES.CUSTOMER },
    churn_risk:     { canonicalKey: "churn_risk", semanticType: "score", grain: GRAIN_TYPES.CUSTOMER },
    segment:        { canonicalKey: "customer_segment", semanticType: "category", grain: GRAIN_TYPES.CUSTOMER },
  },

  // ── PRODUCTS ───────────────────────────────────────────────────────────
  Product: {
    product_id:      { canonicalKey: "product_id", semanticType: "identifier", grain: GRAIN_TYPES.PRODUCT },
    sku:             { canonicalKey: "product_sku", semanticType: "identifier", grain: GRAIN_TYPES.PRODUCT },
    product_name:    { canonicalKey: "product_name", semanticType: "name", grain: GRAIN_TYPES.PRODUCT },
    category:        { canonicalKey: "product_category", semanticType: "category", grain: GRAIN_TYPES.PRODUCT },
    purchase_cost:   { canonicalKey: "product_purchase_cost", semanticType: "purchase_cost", grain: GRAIN_TYPES.PRODUCT },
    selling_price:   { canonicalKey: "product_selling_price", semanticType: "selling_price", grain: GRAIN_TYPES.PRODUCT },
    gross_margin:    { canonicalKey: "product_margin", semanticType: "margin", grain: GRAIN_TYPES.PRODUCT },
    monthly_sales:   { canonicalKey: "product_monthly_sales", semanticType: "sales_quantity", grain: GRAIN_TYPES.PRODUCT },
    inventory_level: { canonicalKey: "product_inventory_level", semanticType: "inventory_quantity", grain: GRAIN_TYPES.PRODUCT },
    reorder_point:   { canonicalKey: "product_reorder_point", semanticType: "inventory_quantity", grain: GRAIN_TYPES.PRODUCT },
    status:          { canonicalKey: "product_status", semanticType: "status", grain: GRAIN_TYPES.PRODUCT },
  },

  // ── CAMPAIGNS ──────────────────────────────────────────────────────────
  Campaign: {
    campaign_id: { canonicalKey: "campaign_id", semanticType: "identifier", grain: GRAIN_TYPES.CAMPAIGN },
    channel:     { canonicalKey: "campaign_channel", semanticType: "category", grain: GRAIN_TYPES.CAMPAIGN },
    budget:      { canonicalKey: "campaign_budget", semanticType: "budget", grain: GRAIN_TYPES.CAMPAIGN },
    spend:       { canonicalKey: "marketing_spend", semanticType: "expense", grain: GRAIN_TYPES.CAMPAIGN },
    impressions: { canonicalKey: "campaign_impressions", semanticType: "impressions", grain: GRAIN_TYPES.CAMPAIGN },
    clicks:      { canonicalKey: "campaign_clicks", semanticType: "clicks", grain: GRAIN_TYPES.CAMPAIGN },
    conversions: { canonicalKey: "campaign_conversions", semanticType: "conversions", grain: GRAIN_TYPES.CAMPAIGN },
    revenue:     { canonicalKey: "campaign_revenue", semanticType: "revenue", grain: GRAIN_TYPES.CAMPAIGN },
    new_customers:{ canonicalKey: "new_customers", semanticType: "count", grain: GRAIN_TYPES.CAMPAIGN },
    roas:        { canonicalKey: "campaign_roas", semanticType: "ratio", grain: GRAIN_TYPES.CAMPAIGN },
    cac:         { canonicalKey: "campaign_cac", semanticType: "ratio", grain: GRAIN_TYPES.CAMPAIGN },
    status:      { canonicalKey: "campaign_status", semanticType: "status", grain: GRAIN_TYPES.CAMPAIGN },
  },

  // 📈 CAMPAIGN DAILY 📈📈📈📈📈📈📈📈📈📈📈📈📈📈📈📈📈📈📈📈📈📈📈📈📈📈📈📈📈📈📈📈📈📈📈📈📈📈📈📈📈📈📈📈📈📈📈📈📈📈📈📈📈📈📈
  CampaignDaily: {
    campaign_id: { canonicalKey: "campaign_daily_campaign_id", semanticType: "identifier", grain: GRAIN_TYPES.CAMPAIGN_DAILY },
    date:        { canonicalKey: "campaign_daily_date", semanticType: "date", grain: GRAIN_TYPES.CAMPAIGN_DAILY },
    spend:       { canonicalKey: "marketing_spend", semanticType: "expense", grain: GRAIN_TYPES.CAMPAIGN_DAILY }, // Rolled up with Campaign
    impressions: { canonicalKey: "campaign_impressions", semanticType: "impressions", grain: GRAIN_TYPES.CAMPAIGN_DAILY }, // Rolled up with Campaign
    clicks:      { canonicalKey: "campaign_clicks", semanticType: "clicks", grain: GRAIN_TYPES.CAMPAIGN_DAILY }, // Rolled up with Campaign
    conversions: { canonicalKey: "campaign_conversions", semanticType: "conversions", grain: GRAIN_TYPES.CAMPAIGN_DAILY }, // Rolled up with Campaign
    revenue:     { canonicalKey: "campaign_revenue", semanticType: "revenue", grain: GRAIN_TYPES.CAMPAIGN_DAILY }, // Rolled up with Campaign
    roas:        { canonicalKey: "daily_roas", semanticType: "ratio", grain: GRAIN_TYPES.CAMPAIGN_DAILY },
  },

  // ── EMPLOYEES ──────────────────────────────────────────────────────────
  Employee: {
    employee_id:     { canonicalKey: "employee_id", semanticType: "identifier", grain: GRAIN_TYPES.EMPLOYEE },
    department:      { canonicalKey: "employee_department", semanticType: "category", grain: GRAIN_TYPES.EMPLOYEE },
    role:            { canonicalKey: "employee_role", semanticType: "category", grain: GRAIN_TYPES.EMPLOYEE },
    hire_date:       { canonicalKey: "employee_hire_date", semanticType: "date", grain: GRAIN_TYPES.EMPLOYEE },
    employment_type: { canonicalKey: "employee_type", semanticType: "category", grain: GRAIN_TYPES.EMPLOYEE },
    hourly_rate:     { canonicalKey: "employee_hourly_rate", semanticType: "hourly_rate", grain: GRAIN_TYPES.EMPLOYEE },
    weekly_hours:    { canonicalKey: "employee_weekly_hours", semanticType: "hours_worked", grain: GRAIN_TYPES.EMPLOYEE },
    status:          { canonicalKey: "employee_status", semanticType: "status", grain: GRAIN_TYPES.EMPLOYEE },
  },

  // ── PAYROLL ────────────────────────────────────────────────────────────
  Payroll: {
    payroll_id:    { canonicalKey: "payroll_id", semanticType: "identifier", grain: GRAIN_TYPES.EMPLOYEE },
    employee_id:   { canonicalKey: "payroll_employee_id", semanticType: "identifier", grain: GRAIN_TYPES.EMPLOYEE },
    period:        { canonicalKey: "payroll_period", semanticType: "date", grain: GRAIN_TYPES.EMPLOYEE },
    hours:         { canonicalKey: "payroll_hours", semanticType: "hours_worked", grain: GRAIN_TYPES.EMPLOYEE },
    regular_pay:   { canonicalKey: "payroll_regular_pay", semanticType: "payroll_cost", grain: GRAIN_TYPES.EMPLOYEE },
    overtime:      { canonicalKey: "payroll_overtime", semanticType: "payroll_cost", grain: GRAIN_TYPES.EMPLOYEE },
    bonus:         { canonicalKey: "payroll_bonus", semanticType: "payroll_cost", grain: GRAIN_TYPES.EMPLOYEE },
    employer_cost: { canonicalKey: "payroll_employer_cost", semanticType: "payroll_cost", grain: GRAIN_TYPES.EMPLOYEE },
    total_cost:    { canonicalKey: "payroll_total_cost", semanticType: "payroll_cost", grain: GRAIN_TYPES.EMPLOYEE },
  },

  // ── SUPPLIERS ──────────────────────────────────────────────────────────
  Supplier: {
    supplier_id:          { canonicalKey: "supplier_id", semanticType: "identifier", grain: GRAIN_TYPES.SUPPLIER },
    supplier_name:        { canonicalKey: "supplier_name", semanticType: "name", grain: GRAIN_TYPES.SUPPLIER },
    country:              { canonicalKey: "supplier_country", semanticType: "country", grain: GRAIN_TYPES.SUPPLIER },
    average_delivery_days:{ canonicalKey: "supplier_delivery_days", semanticType: "duration", grain: GRAIN_TYPES.SUPPLIER },
    quality_score:        { canonicalKey: "supplier_quality", semanticType: "score", grain: GRAIN_TYPES.SUPPLIER },
    reliability_score:    { canonicalKey: "supplier_reliability", semanticType: "score", grain: GRAIN_TYPES.SUPPLIER },
    status:               { canonicalKey: "supplier_status", semanticType: "status", grain: GRAIN_TYPES.SUPPLIER },
  },

  // ── PURCHASES ──────────────────────────────────────────────────────────
  Purchase: {
    purchase_id: { canonicalKey: "purchase_id", semanticType: "identifier", grain: GRAIN_TYPES.PURCHASE },
    date:        { canonicalKey: "purchase_date", semanticType: "date", grain: GRAIN_TYPES.PURCHASE },
    supplier_id: { canonicalKey: "purchase_supplier_id", semanticType: "identifier", grain: GRAIN_TYPES.PURCHASE },
    product_id:  { canonicalKey: "purchase_product_id", semanticType: "identifier", grain: GRAIN_TYPES.PURCHASE },
    quantity:    { canonicalKey: "purchase_quantity", semanticType: "sales_quantity", grain: GRAIN_TYPES.PURCHASE },
    unit_cost:   { canonicalKey: "purchase_unit_cost", semanticType: "purchase_cost", grain: GRAIN_TYPES.PURCHASE },
    total_cost:  { canonicalKey: "purchase_total_cost", semanticType: "cost", grain: GRAIN_TYPES.PURCHASE },
    status:      { canonicalKey: "purchase_status", semanticType: "status", grain: GRAIN_TYPES.PURCHASE },
  },

  // ── INTERACTIONS ───────────────────────────────────────────────────────
  Interaction: {
    interaction_id:  { canonicalKey: "interaction_id", semanticType: "identifier", grain: GRAIN_TYPES.INTERACTION },
    date:            { canonicalKey: "interaction_date", semanticType: "date", grain: GRAIN_TYPES.INTERACTION },
    customer_id:     { canonicalKey: "interaction_customer_id", semanticType: "identifier", grain: GRAIN_TYPES.INTERACTION },
    channel:         { canonicalKey: "interaction_channel", semanticType: "category", grain: GRAIN_TYPES.INTERACTION },
    type:            { canonicalKey: "interaction_type", semanticType: "category", grain: GRAIN_TYPES.INTERACTION },
    sentiment:       { canonicalKey: "interaction_sentiment", semanticType: "sentiment", grain: GRAIN_TYPES.INTERACTION },
    resolution_time: { canonicalKey: "interaction_resolution_time", semanticType: "duration", grain: GRAIN_TYPES.INTERACTION },
    resolved:        { canonicalKey: "interaction_resolved", semanticType: "boolean_flag", grain: GRAIN_TYPES.INTERACTION },
  },
});

// ─────────────────────────────────────────────────────────────────────────────
// CONTEXT RESOLUTION
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Resolve a field definition's semantic type when it depends on context.
 *
 * For example, Transaction.amount → revenue if type=income, expense if type=expense.
 *
 * @param {Object} fieldDef - The field definition from ENTITY_FIELD_MAP
 * @param {Object} record - The actual data record containing context fields
 * @returns {{ canonicalKey: string, semanticType: string }}
 */
export function resolveContextualField(fieldDef, record) {
  // If the field has no context rules, return it directly
  if (!fieldDef.contextRules) {
    return {
      canonicalKey: fieldDef.canonicalKey,
      semanticType: fieldDef.semanticType,
    };
  }

  // Try each context rule
  for (const rule of fieldDef.contextRules) {
    const contextValue = record?.[rule.when.field];
    if (contextValue != null) {
      const normalizedValue = String(contextValue).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
      
      let matched = false;
      if (Array.isArray(rule.when.equals)) {
        matched = rule.when.equals.some(v => String(v).toLowerCase().trim() === normalizedValue);
      } else {
        matched = normalizedValue === String(rule.when.equals).toLowerCase().trim();
      }
      
      if (matched) {
        return {
          canonicalKey: rule.then.canonicalKey,
          semanticType: rule.then.semanticType,
        };
      }
    }
  }

  // Fallback for Transaction amounts when the type string was unrecognized: check the amount sign
  if (fieldDef.defaultFallback?.canonicalKey === "transaction_amount" && record?.amount !== undefined) {
    const amt = Number(record.amount);
    if (amt < 0) {
      return { canonicalKey: "expense_amount", semanticType: "expense" };
    } else if (amt > 0) {
      return { canonicalKey: "income_amount", semanticType: "revenue" };
    }
  }

  // Fallback
  if (fieldDef.defaultFallback) {
    return {
      canonicalKey: fieldDef.defaultFallback.canonicalKey,
      semanticType: fieldDef.defaultFallback.semanticType,
    };
  }

  return { canonicalKey: fieldDef.canonicalKey, semanticType: fieldDef.semanticType };
}

// ─────────────────────────────────────────────────────────────────────────────
// FIELD SEMANTIC BUILDERS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Get a complete FieldSemantic for a specific entity.field combination.
 *
 * @param {string} entityName - e.g., "Order", "Transaction"
 * @param {string} fieldName - e.g., "total", "amount"
 * @param {Object} [record] - optional record for context resolution
 * @param {Object} [options] - override options (confidence, status, etc.)
 * @returns {FieldSemantic|null}
 */
export function getFieldSemantic(entityName, fieldName, record = null, options = {}) {
  const entityMap = ENTITY_FIELD_MAP[entityName];
  if (!entityMap) return null;

  const fieldDef = entityMap[fieldName];
  if (!fieldDef) return null;

  // Resolve context-dependent semantics
  const resolved = resolveContextualField(fieldDef, record);

  if (!resolved.semanticType) return null;

  return createFieldSemantic({
    source: entityName,
    field: fieldName,
    canonicalKey: resolved.canonicalKey,
    semanticType: resolved.semanticType,
    grain: fieldDef.grain,
    // A field with contextRules (e.g. Transaction.amount: income vs expense
    // depending on `type`) only got ONE canonicalKey here, picked without a
    // representative record — the aggregator needs the raw rules too, to
    // sum the right subset of records per row instead of treating the whole
    // batch as one undifferentiated field.
    overrides: { contextRules: fieldDef.contextRules || null },
    ...options,
  });
}

/**
 * Get all FieldSemantic objects for an entire entity.
 *
 * For context-dependent fields (like Transaction.amount), a representative
 * record can be provided; otherwise the default fallback is used.
 *
 * @param {string} entityName
 * @param {Object} [representativeRecord] - for resolving contextual fields
 * @returns {Map<string, FieldSemantic>} fieldName → FieldSemantic
 */
export function getEntitySemantics(entityName, representativeRecord = null) {
  const entityMap = ENTITY_FIELD_MAP[entityName];
  if (!entityMap) return new Map();

  const semantics = new Map();
  for (const [fieldName, fieldDef] of Object.entries(entityMap)) {
    const fs = getFieldSemantic(entityName, fieldName, representativeRecord);
    if (fs) {
      semantics.set(fieldName, fs);
    }
  }
  return semantics;
}

/**
 * Get all numeric (non-dimension) FieldSemantics for an entity.
 * Useful for determining which fields carry business values.
 *
 * @param {string} entityName
 * @returns {FieldSemantic[]}
 */
export function getNumericFields(entityName) {
  const semantics = getEntitySemantics(entityName);
  return [...semantics.values()].filter(
    (fs) => fs.economicRole !== "DIMENSION"
  );
}

/**
 * Find all entities that contain a given canonical key.
 *
 * @param {string} canonicalKey - e.g., "revenue"
 * @returns {{ entity: string, field: string }[]}
 */
export function findEntitiesByCanonicalKey(canonicalKey) {
  const results = [];
  for (const [entityName, fieldMap] of Object.entries(ENTITY_FIELD_MAP)) {
    for (const [fieldName, fieldDef] of Object.entries(fieldMap)) {
      if (fieldDef.canonicalKey === canonicalKey) {
        results.push({ entity: entityName, field: fieldName });
      }
      // Also check context rules
      if (fieldDef.contextRules) {
        for (const rule of fieldDef.contextRules) {
          if (rule.then.canonicalKey === canonicalKey) {
            results.push({ entity: entityName, field: fieldName, context: rule.when });
          }
        }
      }
    }
  }
  return results;
}

/**
 * List all entities in the field map.
 * @returns {string[]}
 */
export function listEntities() {
  return Object.keys(ENTITY_FIELD_MAP);
}

/**
 * List all unique canonical keys across all entities.
 * @returns {string[]}
 */
export function listAllCanonicalKeys() {
  const keys = new Set();
  for (const fieldMap of Object.values(ENTITY_FIELD_MAP)) {
    for (const fieldDef of Object.values(fieldMap)) {
      if (fieldDef.canonicalKey) keys.add(fieldDef.canonicalKey);
      if (fieldDef.contextRules) {
        for (const rule of fieldDef.contextRules) {
          if (rule.then.canonicalKey) keys.add(rule.then.canonicalKey);
        }
      }
      if (fieldDef.defaultFallback?.canonicalKey) {
        keys.add(fieldDef.defaultFallback.canonicalKey);
      }
    }
  }
  return [...keys].sort();
}

