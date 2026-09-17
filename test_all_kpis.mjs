import { computeKpiBatch } from './src/lib/core/kpiEngine.js';
import { KPI_REGISTRY } from './src/lib/core/kpiRegistry.js';
import { KPI_STATUS } from './src/lib/core/semanticTypes.js';
import { createFieldSemantic } from './src/lib/core/fieldSemantic.js';

// ─────────────────────────────────────────────────────────────────────────────
// 1. Build a realistic dataset covering every raw dependency used by the registry
// ─────────────────────────────────────────────────────────────────────────────
const generateMockData = () => {
  const records = [];
  const start = new Date("2026-01-01");
  for (let i = 0; i < 90; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    records.push({
      date: d.toISOString().slice(0, 10),

      // Financial flows
      revenue: Math.random() * 5000 + 1000,
      income_amount: Math.random() * 2000 + 500,
      transaction_amount: Math.random() * 2000 + 500,
      expense: Math.random() * 3000 + 500,
      expense_amount: Math.random() * 1500 + 300,
      operating_expense: Math.random() * 1000 + 200,
      cogs: Math.random() * 1000 + 200,
      payroll_cost: Math.random() * 800 + 200,

      // Treasury / balance sheet (stocks)
      cash_closing: Math.random() * 50000 + 10000,
      net_cash_flow: -(Math.random() * 1000 + 100),
      accounts_receivable: Math.random() * 20000,
      inventory_value: Math.random() * 30000,
      accounts_payable: Math.random() * 15000,

      // Marketing
      marketing_spend: Math.random() * 2000 + 500,
      campaign_revenue: Math.random() * 5000 + 1000,
      new_customers: Math.floor(Math.random() * 20) + 1,

      // Sales / customers (used by _records-based KPIs)
      order_id: `ORD-${i}`,
      customer_id: `CUST-${i % 30}`,
      status: i % 5 === 0 ? "inactif" : "actif",
    });
  }

  // Employee records (distinct employees, some inactive) for RH KPIs
  for (let e = 0; e < 40; e++) {
    records.push({
      date: "2026-03-01",
      employee_id: `EMP-${e}`,
      status: e % 8 === 0 ? "inactif" : "actif",
    });
  }

  return records;
};

// ─────────────────────────────────────────────────────────────────────────────
// 2. Build the fieldSemantics map (field name -> FieldSemantic)
//    The engine resolves raw dependencies by matching fs.canonicalKey.
// ─────────────────────────────────────────────────────────────────────────────
const buildFieldSemantics = () => {
  const defs = [
    // [fieldName, canonicalKey, semanticType, source]
    ["revenue", "revenue", "revenue", "Order"],
    ["income_amount", "income_amount", "revenue", "Transaction"],
    ["transaction_amount", "transaction_amount", "revenue", "Transaction"],
    ["expense", "expense", "expense", "Transaction"],
    ["expense_amount", "expense_amount", "expense", "Transaction"],
    ["operating_expense", "operating_expense", "expense", "Transaction"],
    ["cogs", "cogs", "cost", "Transaction"],
    ["payroll_cost", "payroll_cost", "payroll_cost", "Employee"],
    ["cash_closing", "cash_closing", "cash_balance", "Cashflow"],
    ["net_cash_flow", "net_cash_flow", "net_cash_flow", "Cashflow"],
    ["accounts_receivable", "accounts_receivable", "receivable", "Balance"],
    ["inventory_value", "inventory_value", "inventory_value", "Inventory"],
    ["accounts_payable", "accounts_payable", "payable", "Balance"],
    ["marketing_spend", "marketing_spend", "expense", "Campaign"],
    ["campaign_revenue", "campaign_revenue", "revenue", "Campaign"],
    ["new_customers", "new_customers", "count", "Campaign"],
  ];

  const map = new Map();
  for (const [field, canonicalKey, semanticType, source] of defs) {
    map.set(
      field,
      createFieldSemantic({ source, field, canonicalKey, semanticType })
    );
  }
  return map;
};

// ────────────────────────────────────────────────────────────────────────────
// 3. Run the batch and report
// ─────────────────────────────────────────────────────────────────────────────
const records = generateMockData();
const fieldSemantics = buildFieldSemantics();
const kpiIds = Object.keys(KPI_REGISTRY);

console.log(`Evaluating ${kpiIds.length} KPIs...\n`);

// Static check: every registry entry must expose a calculate() function
const missingCalculate = kpiIds.filter(
  (k) => typeof KPI_REGISTRY[k].calculate !== 'function'
);
if (missingCalculate.length > 0) {
  console.log(`WARNING - KPIs missing a calculate() function: ${missingCalculate.join(', ')}\n`);
}

const result = computeKpiBatch(kpiIds, records, fieldSemantics);

let successCount = 0;
let failCount = 0;
const fails = [];

for (const id of kpiIds) {
  const kpi = KPI_REGISTRY[id];
  const res = result.get(id);

  if (res && res.status === KPI_STATUS.AVAILABLE && res.value !== null) {
    successCount++;
    console.log(`[OK]   ${id.padEnd(22)} = ${res.value}`);
  } else {
    failCount++;
    fails.push({
      id,
      status: res ? res.status : 'NOT_RETURNED',
      value: res ? res.value : undefined,
      level: kpi.level,
    });
  }
}

console.log(`\nResults: ${successCount} Success / ${failCount} Failed`);

if (failCount > 0) {
  console.log("\nFailed KPIs:");
  fails.forEach((f) => {
    console.log(`- ${f.id} (${f.level}): status=${f.status}, value=${f.value}`);
  });
} else {
  console.log("All KPIs calculated successfully!");
}