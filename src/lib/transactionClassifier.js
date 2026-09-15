/**
 * Shared transaction classification helpers.
 *
 * Every page that needs to distinguish income from expense transactions MUST use
 * these helpers instead of rolling its own string comparison.  This guarantees
 * that Finance, Prévisions, Simulateur, Dashboard and KPIs all agree on the
 * classification — regardless of whether the imported data uses English, French
 * or accented labels.
 */

const INCOME_TYPES = ["income", "entree", "credit", "revenu", "encaissement"];
const EXPENSE_TYPES = ["expense", "sortie", "debit", "depense", "decaissement", "charge"];

/**
 * Normalise a raw `type` string (strip accents, lowercase, trim) and return
 * the canonical classification: `"income"`, `"expense"`, or `null` when the
 * value is unrecognised or missing.
 */
export function classifyType(typeStr) {
  if (!typeStr) return null;
  const s = String(typeStr)
    .toLowerCase()
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
  if (INCOME_TYPES.includes(s)) return "income";
  if (EXPENSE_TYPES.includes(s)) return "expense";
  return null;
}

function amountForClassification(t) {
  if (!t) return null;
  for (const value of [t.amount, t.revenue_amount, t.expense_amount]) {
    const amount = Number(value);
    if (Number.isFinite(amount)) return amount;
  }
  return null;
}

function classifyTransaction(t) {
  const explicit = classifyType(t?.type);
  if (explicit) return explicit;

  const amount = amountForClassification(t);
  return amount === null || amount >= 0 ? "income" : "expense";
}

/** Returns `true` when the transaction should count as revenue. */
export function isIncome(t) {
  return classifyTransaction(t) === "income";
}

/** Returns `true` when the transaction should count as an expense. */
export function isExpense(t) {
  return classifyTransaction(t) === "expense";
}

/**
 * Extract the monetary amount from a transaction, with fallbacks to the
 * alternate column names that some imports produce.
 *
 * @param {object} t - The transaction record.
 * @param {"income"|"expense"|null} classification - Optional hint so the
 *   correct fallback column is checked first.  When omitted the function
 *   tries both.
 */
export function txAmount(t, classification) {
  if (!t) return 0;
  const base = Number(t.amount);
  if (Number.isFinite(base)) return Math.abs(base);

  if (classification === "income") {
    return Math.abs(Number(t.revenue_amount) || Number(t.expense_amount) || 0);
  }
  if (classification === "expense") {
    return Math.abs(Number(t.expense_amount) || Number(t.revenue_amount) || 0);
  }
  // No hint — try both.
  return Math.abs(Number(t.revenue_amount) || Number(t.expense_amount) || 0);
}
