import { computeKpiBatch } from './lib/core/kpiEngine.js';

// Mock semantics
const fieldSemantics = new Map();

function testPeriod(days) {
  const records = [];
  const start = new Date("2026-01-01");
  for (let i = 0; i < days; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    records.push({ date: d.toISOString().slice(0, 10), total: 1000, revenue_amount: 1000, type: 'income', stock: 50, expenses: 200, category: 'Achat' });
  }
  
  // Minimal semantics to map total_revenue to these records
  // Since we don't have the full semantics map, we just inject them manually or rely on fallback.
  // Actually, for BFR, we need: accounts_receivable, inventory_value, accounts_payable, total_revenue.
  
  const bfrRecords = records.map(r => ({
    date: r.date,
    accounts_receivable: 1000,
    inventory_value: 500,
    accounts_payable: 300,
    total_revenue: 1000,
    cash_closing: 5000,
    net_burn_rate: -100
  }));

  const res = computeKpiBatch(['bfr_days', 'cash_runway', 'bfr'], bfrRecords, fieldSemantics);
  
  // Since fieldSemantics is empty, the engine won't aggregate bfr dependencies unless we mock context.
  // We can see the trace in the output.
  console.log(`TEST ${days} JOURS:`);
  console.log("BFR Days:", res.get('bfr_days')?.value);
  console.log("Runway:", res.get('cash_runway')?.value);
}

testPeriod(7);
testPeriod(30);
testPeriod(90);
testPeriod(365);
testPeriod(1); // 1 day

