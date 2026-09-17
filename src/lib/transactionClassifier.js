/**
 * GESCOP - Classification Analytique Centrale
 * 
 * Ce module garantit que toute donnée (Commande, Transaction) est sémantiquement
 * validée avant d'entrer dans un calcul KPI (CA, Marge, Stock estimé).
 */

const INCOME_TYPES = ["income", "entree", "credit", "revenu", "encaissement", "vente", "ventes", "recette", "recettes", "revenue"];
const EXPENSE_TYPES = ["expense", "sortie", "debit", "depense", "decaissement", "charge", "charges", "frais", "achat", "achats", "remboursement", "refund", "transfer", "transfert", "salaire", "salaires", "cout", "couts"];

// Normalisation des statuts (tolérant casse, accents, espaces)
const STATUS_MAP = {
  cancelled: ["annulee", "annule", "cancelled", "canceled", "cancel", "void", "voided"],
  draft: ["brouillon", "draft"],
  refunded: ["remboursee", "rembourse", "refund", "refunded", "returned", "return"],
  completed: ["completee", "completed", "complete", "paid", "payee", "paye", "valide", "valid", "livree", "delivered"],
  pending: ["en attente", "pending", "unpaid", "pending payment", "processing", "en cours"]
};

export const UNKNOWN_STATUS_POLICY = {
  VALID: "valid",       // La donnée est analytiquement sûre
  EXCLUDED: "excluded", // La donnée est analytiquement exclue du CA / Stock
  UNKNOWN: "unknown",   // Statut non reconnu (exclu par sécurité du CA)
  PARTIAL: "partial"    // Ex: partiellement remboursée
};

/**
 * Normalise une chaîne textuelle (sans accent, minuscule, sans espaces superflus, tirets en espaces)
 */
export function normalizeString(str) {
  if (!str) return "";
  return String(str)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[_-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Détermine la catégorie d'un statut textuel
 */
export function classifyStatus(statusStr) {
  const s = normalizeString(statusStr);
  if (!s) return null; // Missing status
  
  for (const [category, keywords] of Object.entries(STATUS_MAP)) {
    if (keywords.includes(s) || keywords.some(k => s.includes(k))) {
      return category;
    }
  }
  return "unknown";
}

/**
 * Règle Analytique : Une commande génère-t-elle du CA ?
 */
export function isRevenueOrder(order) {
  if (!order) return false;
  const statusCategory = classifyStatus(order.status || order.payment_status || order.fulfillment_status);
  
  // Politique : Si aucun statut n'est fourni dans l'export, on présume que la donnée est valide (ex: export simple de ventes)
  if (!statusCategory) return true;
  
  // Si le statut est connu, on filtre strictement
  if (["completed", "pending"].includes(statusCategory)) return true;
  
  // Politique UNKNOWN : Un statut inconnu (ex: "Test") est EXCLU du CA par sécurité.
  return false;
}

/**
 * Règle Analytique : Une commande affecte-t-elle le stock estimé ?
 * (Les commandes annulées/remboursées ne déduisent pas le stock)
 */
export function isValidOrderForStock(order) {
  if (!order) return false;
  const statusCategory = classifyStatus(order.status || order.fulfillment_status);
  
  if (!statusCategory) return true;
  if (["completed", "pending"].includes(statusCategory)) return true;
  
  return false;
}

export function isCancelledOrder(order) {
  return classifyStatus(order?.status) === "cancelled";
}

export function isReturnedOrder(order) {
  return classifyStatus(order?.status) === "refunded";
}

export function isDraftOrder(order) {
  return classifyStatus(order?.status) === "draft";
}

/**
 * Règle Analytique : La transaction bancaire est-elle encaissée/décaissée ?
 */
export function isClearedTransaction(tx) {
  if (!tx) return false;
  const statusCategory = classifyStatus(tx.status);
  if (!statusCategory) return true;
  if (statusCategory === "pending" || statusCategory === "cancelled" || statusCategory === "draft") return false;
  return true;
}

// --- EXISTANT ---

export function classifyType(typeStr) {
  const s = normalizeString(typeStr);
  if (!s) return null;
  if (INCOME_TYPES.some(k => s === k || s.includes(k))) return "income";
  if (EXPENSE_TYPES.some(k => s === k || s.includes(k))) return "expense";
  return null;
}

export function amountForClassification(t) {
  if (!t) return null;
  for (const value of [t.amount, t.revenue_amount, t.expense_amount]) {
    const amount = Number(value);
    if (Number.isFinite(amount)) return amount;
  }
  return null;
}

export function classifyTransaction(t) {
  if (!t) return null;
  const explicit = classifyType(t.type);
  if (explicit) return explicit;

  const amount = amountForClassification(t);
  return amount === null || amount >= 0 ? "income" : "expense";
}

/** Returns `true` when the transaction should count as revenue. */
export function isIncome(t) {
  return classifyTransaction(t) === "income" && isClearedTransaction(t);
}

/** Returns `true` when the transaction should count as an expense. */
export function isExpense(t) {
  return classifyTransaction(t) === "expense" && isClearedTransaction(t);
}

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
  // No hint - try both.
  return Math.abs(Number(t.revenue_amount) || Number(t.expense_amount) || 0);
}
