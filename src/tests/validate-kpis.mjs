/**
 * Batterie de tests KPI — GESCOP
 * Script Node.js autonome (sans framework) pour valider la logique de
 * classification et de calcul financier.
 *
 * Usage: node src/tests/validate-kpis.mjs
 */

// ─── Logique à tester (copiée des sources pour isoler les tests) ──────────────

const INCOME_TYPES = ["income", "entree", "credit", "revenu", "encaissement"];
const EXPENSE_TYPES = ["expense", "sortie", "debit", "depense", "decaissement", "charge"];

function stripAccents(str) {
  return String(str).normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function classifyType(typeStr) {
  if (!typeStr) return null;
  const s = stripAccents(String(typeStr).toLowerCase().trim());
  if (INCOME_TYPES.includes(s)) return "income";
  if (EXPENSE_TYPES.includes(s)) return "expense";
  return null;
}

function isIncome(t) { return classifyType(t?.type) === "income"; }
function isExpense(t) { return classifyType(t?.type) === "expense"; }

function txAmount(t, classification) {
  if (!t) return 0;
  const base = Number(t.amount);
  if (base) return Math.abs(base);
  if (classification === "income") return Number(t.revenue_amount) || Number(t.expense_amount) || 0;
  if (classification === "expense") return Number(t.expense_amount) || Number(t.revenue_amount) || 0;
  return Number(t.revenue_amount) || Number(t.expense_amount) || 0;
}

function prepareTransactions(transactions) {
  const rows = transactions || [];
  return {
    incomes: rows.filter(isIncome).map(r => ({ ...r, _amount: txAmount(r, "income") })),
    expenses: rows.filter(isExpense).map(r => ({ ...r, _amount: txAmount(r, "expense") })),
  };
}

function financialSummary(transactions) {
  const { incomes, expenses } = prepareTransactions(transactions);
  const revenue = incomes.reduce((sum, r) => sum + r._amount, 0);
  const expense = expenses.reduce((sum, r) => sum + r._amount, 0);
  const netIncome = revenue - expense;
  return {
    revenue,
    expense,
    netIncome,
    marginPct: revenue > 0 ? (netIncome / revenue) * 100 : 0,
  };
}

// Logique backend: normaliser le type lors de l'import
function normalizeImportType(rawType, rawCategory, rawAmount) {
  const amount = Number(rawAmount) || 0;
  let type = (rawType || "").toLowerCase().trim();
  const categoryType = (rawCategory || "").toLowerCase().trim();
  const recognizedTypes = [
    "revenu", "revenue", "credit", "entree", "income",
    "depense", "expense", "debit", "sortie", "decaissement",
    "remboursement", "achat", "charge", "refund", "transfer", "transfert",
  ];
  const typeNormRaw = stripAccents(type);
  const categoryNormRaw = stripAccents(categoryType);

  if (!recognizedTypes.includes(typeNormRaw)) {
    // Type non reconnu : sauvegarder dans category, déduire depuis le montant
    if (recognizedTypes.includes(categoryNormRaw)) {
      type = categoryType;
    } else {
      type = amount >= 0 ? "income" : "expense";
    }
  }
  if (!type) type = amount >= 0 ? "income" : "expense";
  const typeNorm = stripAccents(type);
  if (["revenu", "revenue", "credit", "entree", "income"].includes(typeNorm)) type = "income";
  if (["depense", "expense", "debit", "sortie"].includes(typeNorm)) type = "expense";
  if (["achat", "charge", "charges", "frais", "remboursement", "refund", "transfer", "transfert"].includes(typeNorm)) type = "expense";
  return ["income", "expense"].includes(type) ? type : undefined;
}

// ─── Test runner ──────────────────────────────────────────────────────────────

let passed = 0, failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`  ✅ PASS: ${name}`);
    passed++;
  } catch (e) {
    console.log(`  ❌ FAIL: ${name}`);
    console.log(`     → ${e.message}`);
    failed++;
  }
}

function assert(condition, msg) {
  if (!condition) throw new Error(msg || "Assertion failed");
}

function assertEq(a, b, msg) {
  if (Math.abs(a - b) > 0.01) throw new Error(msg || `Expected ${b}, got ${a}`);
}

// ─── Données de test ──────────────────────────────────────────────────────────

const txIncome1  = { type: "income",      amount: 1000, date: "2024-01-15" };
const txIncome2  = { type: "Income",      amount:  500, date: "2024-01-20" }; // casse
const txIncome3  = { type: "revenu",      amount:  200, date: "2024-01-25" }; // français
const txExpense1 = { type: "expense",     amount:  300, date: "2024-01-10" };
const txExpense2 = { type: "depense",     amount:  150, date: "2024-01-12" }; // français
const txBadPos   = { type: "utilitaires", amount:  923, date: "2024-02-01" }; // non reconnu, positif → income
const txBadNeg   = { type: "salaires",    amount: -800, date: "2024-02-05" }; // non reconnu, négatif → expense
const txEmpty    = { type: "",            amount:    0, date: "2024-03-01" };
const txNull     = { type: null,          amount:  100, date: "2024-03-02" };

// ─── Tests de classification (frontend) ───────────────────────────────────────

console.log("\n🧪 Tests de classification (transactionClassifier):");

test("type='income' → income",    () => assert(isIncome(txIncome1), "income doit être income"));
test("type='Income' (casse) → income", () => assert(isIncome(txIncome2), "Income doit être income"));
test("type='revenu' → income",    () => assert(isIncome(txIncome3), "revenu doit être income"));
test("type='expense' → expense",  () => assert(isExpense(txExpense1), "expense doit être expense"));
test("type='depense' → expense",  () => assert(isExpense(txExpense2), "depense doit être expense"));
test("type='utilitaires' n'est pas income (frontend sans backend)", () => {
  // Sans le backend, le frontend voit le type brut — le classifier retourne null
  // Ce test documente le comportement attendu après correction backend
  const classified = classifyType("utilitaires");
  assert(classified === null, `classifyType('utilitaires') doit retourner null, got '${classified}'`);
});
test("type=null, amount=100 → non classifié (frontend voit null)", () => {
  assert(!isIncome(txNull) && !isExpense(txNull), "null type doit retourner ni income ni expense");
});

// ─── Tests de normalisation backend (import) ──────────────────────────────────

console.log("\n🧪 Tests de normalisation import (backend):");

test("import 'income' → 'income'",       () => assertEq(normalizeImportType("income", "", 500) === "income" ? 1 : 0, 1, ""));
test("import 'Income' → 'income'",       () => assert(normalizeImportType("Income", "", 500) === "income"));
test("import 'expense' → 'expense'",     () => assert(normalizeImportType("expense", "", 200) === "expense"));
test("import 'utilitaires' + amount>0 → 'income'",  () => assert(normalizeImportType("utilitaires", "", 923) === "income", "utilitaires positif doit être income"));
test("import 'salaires' + amount<0 → 'expense'",    () => assert(normalizeImportType("salaires", "", -800) === "expense", "salaires négatif doit être expense"));
test("import 'utilitaires' + amount=0 → 'income'",  () => assert(normalizeImportType("utilitaires", "", 0) === "income", "montant zéro → income par défaut"));
test("import '' vide + amount>0 → 'income'",        () => assert(normalizeImportType("", "", 100) === "income"));
test("import '' vide + amount<0 → 'expense'",       () => assert(normalizeImportType("", "", -50) === "expense"));
test("import 'achat' → 'expense'",                  () => assert(normalizeImportType("achat", "", 200) === "expense"));
test("import 'charge' → 'expense'",                 () => assert(normalizeImportType("charge", "", 300) === "expense"));
test("import 'vente' (non reconnu) + amount>0 → 'income'", () => assert(normalizeImportType("vente", "", 400) === "income"));

// ─── Tests de calcul KPI (financialSummary) ────────────────────────────────────

console.log("\n🧪 Tests de calcul KPI (financialSummary):");

const allTx = [txIncome1, txIncome2, txExpense1];
const summary = financialSummary(allTx);

test("calcRevenue([income1000, income500, expense300]) = 1500", () => assertEq(summary.revenue, 1500));
test("calcExpenses([income1000, income500, expense300]) = 300",  () => assertEq(summary.expense, 300));
test("calcNetIncome = 1200",  () => assertEq(summary.netIncome, 1200));
test("calcMarginPct ≈ 80%",   () => assertEq(summary.marginPct, 80));

// ─── Tests de robustesse (données vides/invalides) ────────────────────────────

console.log("\n🧪 Tests de robustesse:");

test("financialSummary([]) → revenue=0 sans crash",      () => assertEq(financialSummary([]).revenue, 0));
test("financialSummary(undefined) → revenue=0 sans crash", () => assertEq(financialSummary(undefined).revenue, 0));
test("financialSummary(null) → revenue=0 sans crash",    () => assertEq(financialSummary(null).revenue, 0));
test("marginPct quand revenue=0 → 0 (pas de division par zéro)", () => assertEq(financialSummary([txExpense1]).marginPct, 0));
test("txAmount(null) → 0",    () => assertEq(txAmount(null), 0));
test("txAmount({}) → 0",      () => assertEq(txAmount({}), 0));

// ─── Tests de données mensuelles ─────────────────────────────────────────────

console.log("\n🧪 Tests de séries mensuelles:");

// Même mois (janvier 2024)
const sameMo = financialSummary([txIncome1, txIncome2, txExpense1]);
test("revenue 2 incomes janvier = 1500",  () => assertEq(sameMo.revenue, 1500));
test("expense 1 expense janvier = 300",   () => assertEq(sameMo.expense, 300));
test("net janvier = 1200",                () => assertEq(sameMo.netIncome, 1200));

// ─── Résultat ─────────────────────────────────────────────────────────────────

const total = passed + failed;
console.log(`\n${"─".repeat(50)}`);
console.log(`📊 Résultat: ${passed}/${total} tests passés`);
if (failed > 0) {
  console.log(`⚠️  ${failed} test(s) ÉCHOUÉ(S) — voir détails ci-dessus`);
  process.exit(1);
} else {
  console.log("🎉 Tous les tests passent !");
  process.exit(0);
}

