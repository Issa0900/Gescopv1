// ─────────────────────────────────────────────────────────────────────────────
// GESCOP Recognition Engine — Context Engine (Sheet, Table & Sibling Profiler)
// Version 5.0 — Septembre 2026
// ─────────────────────────────────────────────────────────────────────────────

import { stripAccents } from "./normalizer.ts";

export interface ContextAnalysis {
  inferredDomain?: string;
  inferredEntity?: string;
  confidence: number;
  isOrderContext: boolean;
  isExpenseContext: boolean;
  isCashflowContext: boolean;
  isMarketingContext: boolean;
  isInventoryContext: boolean;
  isEmployeeContext: boolean;
  justifications: string[];
}

/**
 * Analyse le contexte global d'un tableau à partir du nom de feuille et du voisinage des colonnes
 */
export function analyzeContext(
  sheetOrFileName: string,
  siblingHeaders: string[],
  entityHint?: string
): ContextAnalysis {
  const normSheet = stripAccents(sheetOrFileName.toLowerCase().replace(/[_\-]/g, " "));
  const normSiblings = siblingHeaders.map((h) => stripAccents(h.toLowerCase().replace(/[_\-]/g, " ").trim()));
  const allClues = [normSheet, ...normSiblings, stripAccents(entityHint?.toLowerCase().replace(/[_\-]/g, " ") || "")];

  const justifications: string[] = [];

  let isOrderContext = false;
  let isExpenseContext = false;
  let isCashflowContext = false;
  let isMarketingContext = false;
  let isInventoryContext = false;
  let isEmployeeContext = false;

  // 1. Détection Contexte Commandes / Ventes
  const orderHits = allClues.filter((c) =>
    /\b(order|commande|commandes|client|customer|quantite|quantity|qty|prix|unit_price|vente|ventes|sales)\b/i.test(c)
  );
  if (orderHits.length >= 2 || normSheet.includes("order") || normSheet.includes("commande") || normSheet.includes("vente")) {
    isOrderContext = true;
    justifications.push(`Contexte Ventes/Commandes confirmé par : [${orderHits.slice(0, 3).join(", ")}].`);
  }

  // 2. Détection Contexte Dépenses / Factures fournisseurs
  const expenseHits = allClues.filter((c) =>
    /\b(expense|depense|depenses|fournisseur|supplier|vendor|charge|charges|frais|facture_fournisseur)\b/i.test(c)
  );
  if (expenseHits.length >= 2 || normSheet.includes("depense") || normSheet.includes("expense")) {
    isExpenseContext = true;
    justifications.push(`Contexte Dépenses/Charges confirmé par : [${expenseHits.slice(0, 3).join(", ")}].`);
  }

  // 3. Détection Contexte Trésorerie (Cashflow)
  const cashflowHits = allClues.filter((c) =>
    /\b(cash|tresorerie|encaisse|solde|inflow|outflow|encaissement|decaissement|banque)\b/i.test(c)
  );
  if (cashflowHits.length >= 2 || normSheet.includes("cash") || normSheet.includes("tresorerie")) {
    isCashflowContext = true;
    justifications.push(`Contexte Trésorerie confirmé par : [${cashflowHits.slice(0, 3).join(", ")}].`);
  }

  // 4. Détection Contexte Marketing / Publicité
  const marketingHits = allClues.filter((c) =>
    /\b(campaign|campagne|ad_spend|spend|impressions|clicks|clics|ctr|cpc|roas|marketing|ads)\b/i.test(c)
  );
  if (marketingHits.length >= 2 || normSheet.includes("marketing") || normSheet.includes("campagne") || normSheet.includes("pub")) {
    isMarketingContext = true;
    justifications.push(`Contexte Marketing confirmé par : [${marketingHits.slice(0, 3).join(", ")}].`);
  }

  // 5. Détection Contexte Stocks / Inventaire
  const inventoryHits = allClues.filter((c) =>
    /\b(stock|inventory|inventaire|sku|reorder|qoh|entrepot|warehouse)\b/i.test(c)
  );
  if (inventoryHits.length >= 2 || normSheet.includes("stock") || normSheet.includes("inventaire")) {
    isInventoryContext = true;
    justifications.push(`Contexte Stock confirmé par : [${inventoryHits.slice(0, 3).join(", ")}].`);
  }

  // 6. Détection Contexte RH / Employés
  const employeeHits = allClues.filter((c) =>
    /\b(employee|employe|salaries|staff|paie|payroll|salaire|hourly_rate|taux_horaire)\b/i.test(c)
  );
  if (employeeHits.length >= 2 || normSheet.includes("employe") || normSheet.includes("rh") || normSheet.includes("payroll")) {
    isEmployeeContext = true;
    justifications.push(`Contexte RH confirmé par : [${employeeHits.slice(0, 3).join(", ")}].`);
  }

  // Détermination du domaine dominant
  let inferredDomain: string | undefined;
  let inferredEntity: string | undefined;
  let confidence = 0.5;

  if (isOrderContext && !isExpenseContext) {
    inferredDomain = "sales";
    inferredEntity = "Order";
    confidence = 0.9;
  } else if (isExpenseContext) {
    inferredDomain = "finance";
    inferredEntity = "Expense";
    confidence = 0.9;
  } else if (isCashflowContext) {
    inferredDomain = "treasury";
    inferredEntity = "Cashflow";
    confidence = 0.9;
  } else if (isMarketingContext) {
    inferredDomain = "marketing";
    inferredEntity = "Campaign";
    confidence = 0.9;
  } else if (isInventoryContext) {
    inferredDomain = "inventory";
    inferredEntity = "Product";
    confidence = 0.9;
  } else if (isEmployeeContext) {
    inferredDomain = "hr";
    inferredEntity = "Employee";
    confidence = 0.9;
  }

  return {
    inferredDomain,
    inferredEntity,
    confidence,
    isOrderContext,
    isExpenseContext,
    isCashflowContext,
    isMarketingContext,
    isInventoryContext,
    isEmployeeContext,
    justifications,
  };
}

/**
 * Désambiguïse un en-tête générique comme "amount", "montant", "total" en s'appuyant sur le voisinage
 */
export function disambiguateGenericAmount(
  header: string,
  context: ContextAnalysis
): { resolvedConceptId: string; targetField: string; confidence: number; justification: string } {
  if (context.isOrderContext) {
    return {
      resolvedConceptId: "sales.revenue.net",
      targetField: "total",
      confidence: 0.92,
      justification: "En-tête 'montant/total' interprété comme Chiffre d'affaires (Order.total) dans un contexte de commandes.",
    };
  }
  if (context.isExpenseContext) {
    return {
      resolvedConceptId: "finance.expense.operating",
      targetField: "amount",
      confidence: 0.92,
      justification: "En-tête 'montant' interprété comme Dépense (Expense.amount) dans un contexte de charges.",
    };
  }
  if (context.isCashflowContext) {
    return {
      resolvedConceptId: "treasury.cash.closing",
      targetField: "closing_cash",
      confidence: 0.85,
      justification: "En-tête 'montant/solde' interprété comme Solde de clôture dans un contexte de trésorerie.",
    };
  }
  if (context.isMarketingContext) {
    return {
      resolvedConceptId: "marketing.spend.ads",
      targetField: "budget_spent",
      confidence: 0.85,
      justification: "En-tête 'montant/spend' interprété comme Dépense publicitaire dans un contexte marketing.",
    };
  }

  return {
    resolvedConceptId: "sales.revenue.net",
    targetField: "amount",
    confidence: 0.5,
    justification: "En-tête ambigu 'montant' sans contexte discriminant fort.",
  };
}
