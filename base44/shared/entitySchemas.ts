// Field types, formats, enums and required fields of every importable entity.
//
// The backend SDK exposes no `schema()` method, so an import that relied on it
// silently got `null` and skipped ALL normalization: statuses were stored raw
// ("Paid", "Completed", "Actif"), dates and numbers stayed as text, and every
// metric filtering on a canonical value read zero. This map is therefore the
// authoritative description the importer normalizes against.
//
// Keep it in sync with base44/entities/<Entity>.jsonc.

const S = { type: "string" };
const N = { type: "number" };
const D = { type: "string", format: "date" };
const B = { type: "boolean" };
const E = (...values: string[]) => ({ type: "string", enum: values });

export const ENTITY_SCHEMAS: Record<string, { properties: Record<string, any>; required: string[] }> = {
  Order: {
    properties: {
      order_id: S, customer_id: S, date: D,
      channel: E("shopify", "boutique", "b2b", "instagram"),
      product_id: S, quantity: N, unit_price: N, subtotal: N, discount: N, tax: N,
      shipping: N, total: N, cost: N, gross_margin: N,
      payment_status: E("paye", "en_attente", "echoue", "rembourse"),
      fulfillment_status: E("expedie", "en_preparation", "livre", "annule", "retourne"),
      return_status: E("aucun", "demande", "approuve", "refuse"),
      region: S, status: S, import_id: S,
    },
    required: ["order_id", "date"],
  },
  Customer: {
    properties: {
      customer_id: S, first_name: S, last_name: S, email: S, city: S, region: S,
      customer_type: E("particulier", "entreprise", "b2b"),
      acquisition_date: D, first_purchase_date: D, last_purchase_date: D,
      total_orders: N, total_revenue: N, average_order_value: N,
      status: E("actif", "inactif", "perdu"),
      segment: E("nouveau", "regulier", "vip", "inactif", "b2b", "haute_valeur", "a_risque"),
      lifetime_value: N, churn_risk: N, import_id: S,
    },
    required: ["customer_id"],
  },
  Product: {
    properties: {
      product_id: S, sku: S, product_name: S,
      category: E("decoration", "cuisine", "maison", "accessoires", "cadeaux", "lifestyle", "équipement", "accessoire", "piece", "entretien"),
      subcategory: S, supplier_id: S, purchase_cost: N, selling_price: N, gross_margin: N,
      launch_date: D,
      status: E("actif", "discontinue", "rupture", "nouveau", "dormant"),
      monthly_sales: N, inventory_level: N, reorder_point: N, import_id: S,
    },
    required: ["product_id"],
  },
  Inventory: {
    properties: {
      inventory_id: S, date: D, product_id: S, opening_stock: N, purchases: N,
      units_sold: N, returns: N, damaged: N, closing_stock: N, inventory_value: N,
      days_in_inventory: N,
      stock_status: E("optimal", "rupture", "surstock", "dormant", "faible", "proche_rupture"),
      import_id: S,
    },
    required: ["date", "product_id"],
  },
  Cashflow: {
    properties: {
      date: D, opening_cash: N, cash_in: N, cash_out: N, closing_cash: N,
      accounts_receivable: N, accounts_payable: N, net_cash_flow: N, import_id: S,
    },
    required: ["date"],
  },
  Expense: {
    properties: {
      expense_id: S, date: D, category: S, supplier: S, description: S,
      amount: N, recurring: B, department: S, payment_method: S, import_id: S,
    },
    required: ["date", "amount"],
  },
  Payroll: {
    properties: {
      payroll_id: S, employee_id: S, period: S, hours: N, regular_pay: N,
      overtime: N, bonus: N, employer_cost: N, total_cost: N, import_id: S,
    },
    required: ["employee_id", "period"],
  },
  Employee: {
    properties: {
      employee_id: S,
      department: E("direction", "ventes", "marketing", "logistique", "administration", "service_client", "atelier"),
      role: S, hire_date: D,
      employment_type: E("temps_plein", "temps_partiel", "contractuel", "stagiaire"),
      hourly_rate: N, weekly_hours: N,
      status: E("actif", "depart", "conge", "essai"),
      import_id: S,
    },
    required: ["employee_id"],
  },
  Campaign: {
    properties: {
      campaign_id: S, campaign_name: S,
      channel: E("google_ads", "meta_ads", "instagram", "email", "tiktok"),
      start_date: D, end_date: D, budget: N, spend: N, impressions: N, clicks: N,
      conversions: N, revenue: N, new_customers: N, cac: N, roas: N,
      status: E("active", "terminee", "pause", "planifiee"),
      import_id: S,
    },
    required: ["campaign_id", "campaign_name"],
  },
  CampaignDaily: {
    properties: {
      date: D, campaign_id: S, impressions: N, reach: N, clicks: N, ctr: N, cpc: N,
      conversions: N, conversion_rate: N, spend: N, revenue: N, roas: N, import_id: S,
    },
    required: ["date", "campaign_id"],
  },
  Supplier: {
    properties: {
      supplier_id: S, supplier_name: S, country: S, category: S, payment_terms: S,
      average_delivery_days: N, purchase_volume: N, quality_score: N,
      reliability_score: N, price_change_last_12_months: N,
      status: E("actif", "inactif", "problematique"),
      import_id: S,
    },
    required: ["supplier_id", "supplier_name"],
  },
  Purchase: {
    properties: {
      purchase_id: S, date: D, supplier_id: S, product_id: S, quantity: N,
      unit_cost: N, total_cost: N, expected_delivery: D, actual_delivery: D,
      delay_days: N,
      status: E("recu", "en_cours", "retard", "annule"),
      import_id: S,
    },
    required: ["date", "supplier_id", "product_id"],
  },
  Interaction: {
    properties: {
      interaction_id: S, date: D, customer_id: S,
      channel: E("email", "telephone", "chat", "boutique", "reseau_social"),
      type: E("email", "telephone", "chat", "plainte", "retour", "question", "support", "avis", "remerciement", "reclamation", "autre"),
      subject: S,
      sentiment: E("positif", "neutre", "negatif", "tres_negatif"),
      resolution_time: N, resolved: B, satisfaction_score: N, import_id: S,
    },
    required: ["date", "customer_id"],
  },
  Competitor: {
    properties: {
      competitor_id: S, name: S, sector: S, location: S,
      price_position: E("inferieur", "egal", "superieur"),
      market_position: E("leader", "challenger", "suiveur", "niche"),
      website: S, average_rating: N, employee_count: N, estimated_revenue: N, import_id: S,
    },
    required: ["competitor_id", "name"],
  },
  Goal: {
    properties: {
      goal_id: S,
      domain: E("finance", "ventes", "tresorerie", "clients", "operations", "marketing"),
      metric: S, target: N, current: N, period: S,
      priority: E("faible", "moyenne", "elevee", "urgente"),
      status: E("en_cours", "atteint", "depasse", "non_atteint"),
      import_id: S,
    },
    required: ["metric"],
  },
  Event: {
    properties: {
      event_id: S, date: D, event_type: S, description: S, impact_area: S, import_id: S,
    },
    required: ["date", "event_type"],
  },
  ExternalSignal: {
    properties: {
      title: S, description: S,
      family: E("gouvernement", "economie", "marche", "concurrence", "fournisseurs", "consommateurs", "actualites"),
      relevance_score: N,
      impact: E("positif", "neutre", "negatif"),
      source: S, url: S, date: D, relevance_reason: S, recommended_action: S,
      status: E("nouveau", "vu", "archive"),
      import_id: S,
    },
    required: ["title", "family"],
  },
  Transaction: {
    properties: {
      date: D, description: S, amount: N, type: S, category: S, source: S,
      currency: S, client: S, product: S, import_id: S,
    },
    required: ["date", "amount"],
  },
};

export function getSchema(entityName: string) {
  return ENTITY_SCHEMAS[entityName] || null;
}