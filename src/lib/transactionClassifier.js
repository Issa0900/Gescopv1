/**
 * Shared transaction classification helpers.
 *
 * Every page that needs to distinguish income from expense transactions MUST use
 * these helpers instead of rolling its own string comparison.  This guarantees
 * that Finance, Prévisions, Simulateur, Dashboard and KPIs all agree on the
 * classification — regardless of whether the imported data uses English, French
 * or accented labels.
 */

const INCOME_TYPES = ["income", "entree", "credit", "revenu", "encaissement", "vente", "ventes", "recette", "recettes", "revenue"];
const EXPENSE_TYPES = ["expense", "sortie", "debit", "depense", "decaissement", "charge", "charges", "frais", "achat", "achats", "remboursement", "refund", "transfer", "transfert", "salaire", "salaires", "cout", "couts"];

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

/**
 * Classify a full transaction object.
 * Falls back to the sign of `amount` when `type` is not a recognized financial keyword
 * (e.g. "utilitaires", "salaires", "marketing") — this handles data imported before
 * the backend normalization fix was deployed.
 */
export function classifyTransaction(t) {
  if (!t) return null;
  const byType = classifyType(t.type);
  if (byType) return byType;
  // Fallback: use the sign of the amount
  const amt = Number(t.amount) || 0;
  if (amt > 0) return "income";
  if (amt < 0) return "expense";
  return null;
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
  if (base) return base;

  if (classification === "income") {
    return Number(t.revenue_amount) || Number(t.expense_amount) || 0;
  }
  if (classification === "expense") {
    return Number(t.expense_amount) || Number(t.revenue_amount) || 0;
  }
  // No hint — try both.
  return Number(t.revenue_amount) || Number(t.expense_amount) || 0;
}

