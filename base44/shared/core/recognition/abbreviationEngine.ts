// ─────────────────────────────────────────────────────────────────────────────
// GESCOP Recognition Engine — Abbreviation Engine & Disambiguation
// Version 5.0 — Septembre 2026
// ─────────────────────────────────────────────────────────────────────────────

import { stripAccents } from "./normalizer.ts";

export interface AbbreviationRule {
  abbreviation: string;
  defaultConceptId: string;
  isAmbiguous: boolean;
  contextualVariants?: Array<{
    conceptId: string;
    triggerTokens: string[]; // Colonnes soeurs ou mots-clés de feuille favorisant cette variante
    negativeTokens?: string[];
  }>;
}

export const ABBREVIATIONS_CATALOG: Record<string, AbbreviationRule> = {
  // ── VENTES & COMMANDES ──
  ca: {
    abbreviation: "ca",
    defaultConceptId: "sales.revenue.net",
    isAmbiguous: false,
  },
  "ca ht": {
    abbreviation: "ca ht",
    defaultConceptId: "sales.revenue.net",
    isAmbiguous: false,
  },
  "ca ttc": {
    abbreviation: "ca ttc",
    defaultConceptId: "sales.revenue.gross",
    isAmbiguous: false,
  },
  so: {
    abbreviation: "so",
    defaultConceptId: "common.identifier.order_id",
    isAmbiguous: false,
  },
  aov: {
    abbreviation: "aov",
    defaultConceptId: "sales.order.aov",
    isAmbiguous: false,
  },
  atv: {
    abbreviation: "atv",
    defaultConceptId: "sales.order.aov",
    isAmbiguous: false,
  },
  asp: {
    abbreviation: "asp",
    defaultConceptId: "sales.pricing.unit_price",
    isAmbiguous: false,
  },
  qty: {
    abbreviation: "qty",
    defaultConceptId: "sales.volume.quantity",
    isAmbiguous: false,
  },
  qte: {
    abbreviation: "qte",
    defaultConceptId: "sales.volume.quantity",
    isAmbiguous: false,
  },
  pu: {
    abbreviation: "pu",
    defaultConceptId: "sales.pricing.unit_price",
    isAmbiguous: false,
  },
  "pu ht": {
    abbreviation: "pu ht",
    defaultConceptId: "sales.pricing.unit_price",
    isAmbiguous: false,
  },

  // ── FINANCE & RÉSULTATS ──
  mb: {
    abbreviation: "mb",
    defaultConceptId: "finance.profit.gross",
    isAmbiguous: false,
  },
  gp: {
    abbreviation: "gp",
    defaultConceptId: "finance.profit.gross",
    isAmbiguous: false,
  },
  rn: {
    abbreviation: "rn",
    defaultConceptId: "finance.profit.net",
    isAmbiguous: false,
  },
  cogs: {
    abbreviation: "cogs",
    defaultConceptId: "finance.cogs.amount",
    isAmbiguous: false,
  },
  cmv: {
    abbreviation: "cmv",
    defaultConceptId: "finance.cogs.amount",
    isAmbiguous: false,
  },
  ebitda: {
    abbreviation: "ebitda",
    defaultConceptId: "finance.profit.ebitda",
    isAmbiguous: false,
  },
  ebe: {
    abbreviation: "ebe",
    defaultConceptId: "finance.profit.ebitda",
    isAmbiguous: false,
  },
  baiia: {
    abbreviation: "baiia",
    defaultConceptId: "finance.profit.ebitda",
    isAmbiguous: false,
  },
  opex: {
    abbreviation: "opex",
    defaultConceptId: "finance.expense.operating",
    isAmbiguous: false,
  },

  // ── TRÉSORERIE & BFR ──
  ar: {
    abbreviation: "ar",
    defaultConceptId: "treasury.working_capital.receivables", // Accounts Receivable
    isAmbiguous: true,
    contextualVariants: [
      {
        conceptId: "treasury.working_capital.receivables",
        triggerTokens: ["invoice", "facture", "customer", "client", "payment", "paiement", "balance", "solde", "due", "echeance", "finance", "compta"],
      },
    ],
  },
  ap: {
    abbreviation: "ap",
    defaultConceptId: "treasury.working_capital.payables", // Accounts Payable
    isAmbiguous: false,
  },
  cm: {
    abbreviation: "cm",
    defaultConceptId: "finance.profit.gross", // Contribution Margin
    isAmbiguous: true,
    contextualVariants: [
      {
        conceptId: "finance.profit.gross",
        triggerTokens: ["revenue", "sales", "margin", "marge", "profit", "contribution"],
      },
      {
        conceptId: "finance.cogs.amount",
        triggerTokens: ["matiere", "production", "achat", "fabriquant", "atelier"],
      },
    ],
  },

  // ── CLIENTS & MARKETING ──
  cac: {
    abbreviation: "cac",
    defaultConceptId: "marketing.metrics.cac",
    isAmbiguous: false,
  },
  clv: {
    abbreviation: "clv",
    defaultConceptId: "customers.value.ltv",
    isAmbiguous: false,
  },
  ltv: {
    abbreviation: "ltv",
    defaultConceptId: "customers.value.ltv",
    isAmbiguous: false,
  },
  ctr: {
    abbreviation: "ctr",
    defaultConceptId: "marketing.metrics.ctr",
    isAmbiguous: false,
  },
  cpc: {
    abbreviation: "cpc",
    defaultConceptId: "marketing.metrics.cpc",
    isAmbiguous: false,
  },
  cpa: {
    abbreviation: "cpa",
    defaultConceptId: "marketing.metrics.cpc",
    isAmbiguous: false,
  },
  roas: {
    abbreviation: "roas",
    defaultConceptId: "marketing.metrics.roas",
    isAmbiguous: false,
  },
  nps: {
    abbreviation: "nps",
    defaultConceptId: "customers.satisfaction.rating",
    isAmbiguous: false,
  },
  csat: {
    abbreviation: "csat",
    defaultConceptId: "customers.satisfaction.rating",
    isAmbiguous: false,
  },

  // ── INVENTAIRE & LOGISTIQUE ──
  sku: {
    abbreviation: "sku",
    defaultConceptId: "products.identity.id",
    isAmbiguous: false,
  },
  ean: {
    abbreviation: "ean",
    defaultConceptId: "products.identity.id",
    isAmbiguous: false,
  },
  upc: {
    abbreviation: "upc",
    defaultConceptId: "products.identity.id",
    isAmbiguous: false,
  },
  qoh: {
    abbreviation: "qoh",
    defaultConceptId: "inventory.stock.level",
    isAmbiguous: false,
  },
  dio: {
    abbreviation: "dio",
    defaultConceptId: "inventory.metrics.dio",
    isAmbiguous: false,
  },
  po: {
    abbreviation: "po",
    defaultConceptId: "procurement.purchase.order_id",
    isAmbiguous: false,
  },

  // ── RH ──
  fte: {
    abbreviation: "fte",
    defaultConceptId: "hr.workforce.headcount",
    isAmbiguous: false,
  },
  etp: {
    abbreviation: "etp",
    defaultConceptId: "hr.workforce.headcount",
    isAmbiguous: false,
  },
};

/**
 * Résout une abréviation en tenant compte des colonnes soeurs et du contexte
 */
export function resolveAbbreviation(
  abbr: string,
  contextTokens: string[] = []
): { conceptId: string; confidence: number; justification: string } | null {
  const norm = stripAccents(abbr.toLowerCase().trim()).replace(/[^a-z0-9\s]/g, "");
  const rule = ABBREVIATIONS_CATALOG[norm];
  if (!rule) return null;

  // Cas non-ambigu : correspondance directe haute confiance
  if (!rule.isAmbiguous || !rule.contextualVariants || rule.contextualVariants.length === 0) {
    return {
      conceptId: rule.defaultConceptId,
      confidence: 0.95,
      justification: `Abréviation métier reconnue '${norm.toUpperCase()}'.`,
    };
  }

  // Cas ambigu : vérification du contexte
  const cleanContext = contextTokens.map((t) => stripAccents(t.toLowerCase().trim()));

  for (const variant of rule.contextualVariants) {
    const hits = variant.triggerTokens.filter((trigger) =>
      cleanContext.some((ctx) => ctx.includes(trigger))
    );
    if (hits.length > 0) {
      return {
        conceptId: variant.conceptId,
        confidence: 0.92,
        justification: `Abréviation '${norm.toUpperCase()}' confirmée par les indices contextuels : [${hits.join(", ")}].`,
      };
    }
  }

  // Si le contexte ne confirme pas explicitement, on renvoie la valeur par défaut avec un score plus mesuré
  return {
    conceptId: rule.defaultConceptId,
    confidence: 0.65,
    justification: `Abréviation '${norm.toUpperCase()}' attribuée par défaut (contexte neutre).`,
  };
}

