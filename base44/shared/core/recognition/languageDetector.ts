// ─────────────────────────────────────────────────────────────────────────────
// GESCOP Recognition Engine — Language Detector
// Version 5.0 — Septembre 2026
// ─────────────────────────────────────────────────────────────────────────────

import { stripAccents } from "./normalizer.ts";

export type SupportedLanguage = "fr" | "en" | "es" | "pt" | "de" | "it" | "nl" | "unknown";

interface LanguageClues {
  keywords: string[];
  indicators: string[];
}

const LANGUAGE_MARKERS: Record<Exclude<SupportedLanguage, "unknown">, LanguageClues> = {
  fr: {
    keywords: [
      "chiffre", "affaires", "vente", "ventes", "recettes", "commande", "commandes",
      "client", "clients", "produit", "produits", "cout", "couts", "depense", "depenses",
      "solde", "cloture", "entrees", "sorties", "livraison", "taux", "remise", "panier", "paie"
    ],
    indicators: ["d'", "l'", "du", "des", "de", "le", "la", "et", "au", "aux"],
  },
  en: {
    keywords: [
      "revenue", "sales", "turnover", "order", "orders", "customer", "customers",
      "product", "products", "cost", "costs", "expense", "expenses", "cash", "balance",
      "opening", "closing", "delivery", "shipping", "discount", "basket", "payroll"
    ],
    indicators: ["of", "the", "and", "by", "for", "in", "to"],
  },
  es: {
    keywords: [
      "ingresos", "ventas", "pedido", "pedidos", "cliente", "clientes", "producto",
      "coste", "costo", "gastos", "saldo", "caja", "cierre", "entrega", "descuento"
    ],
    indicators: ["del", "de", "el", "la", "los", "las", "y", "en"],
  },
  pt: {
    keywords: [
      "receita", "vendas", "faturamento", "pedido", "pedidos", "cliente", "clientes",
      "produto", "custo", "despesas", "saldo", "caixa", "fecho", "entrega", "desconto"
    ],
    indicators: ["do", "da", "dos", "das", "em", "para"],
  },
  de: {
    keywords: [
      "umsatz", "erlos", "erlose", "bestellung", "auftrag", "kunde", "kunden",
      "produkt", "kosten", "ausgaben", "bestand", "kasse", "lieferung", "rabatt", "warenkorb"
    ],
    indicators: ["der", "die", "das", "und", "von", "in", "fur"],
  },
  it: {
    keywords: [
      "ricavi", "fatturato", "vendite", "ordine", "ordini", "cliente", "clienti",
      "prodotto", "costo", "spese", "saldo", "cassa", "chiusura", "consegna", "sconto"
    ],
    indicators: ["del", "della", "dello", "il", "la", "ed", "per"],
  },
  nl: {
    keywords: [
      "omzet", "opbrengst", "bestelling", "order", "klant", "klanten", "product",
      "kosten", "uitgaven", "saldo", "kas", "levering", "korting", "winkelmandje"
    ],
    indicators: ["van", "de", "het", "en", "in", "voor"],
  },
};

/**
 * Détecte la langue la plus probable à partir d'un ensemble de tokens ou d'une liste d'en-têtes
 */
export function detectLanguage(textOrTokens: string | string[]): { language: SupportedLanguage; confidence: number } {
  const tokens = Array.isArray(textOrTokens)
    ? textOrTokens.map((t) => stripAccents(t.toLowerCase().trim()))
    : stripAccents(textOrTokens.toLowerCase().trim()).split(/\s+/);

  const scores: Record<string, number> = {
    fr: 0,
    en: 0,
    es: 0,
    pt: 0,
    de: 0,
    it: 0,
    nl: 0,
  };

  let totalHits = 0;

  for (const token of tokens) {
    if (!token || token.length < 2) continue;

    for (const [lang, clues] of Object.entries(LANGUAGE_MARKERS)) {
      if (clues.keywords.includes(token)) {
        scores[lang] += 3;
        totalHits += 3;
      } else if (clues.indicators.includes(token)) {
        scores[lang] += 1;
        totalHits += 1;
      }
    }
  }

  if (totalHits === 0) {
    // Par défaut, si aucun indice fort n'est trouvé : anglais ou français selon la présence d'accents
    return { language: "fr", confidence: 0.4 };
  }

  let bestLang: SupportedLanguage = "fr";
  let maxScore = -1;

  for (const [lang, score] of Object.entries(scores)) {
    if (score > maxScore) {
      maxScore = score;
      bestLang = lang as SupportedLanguage;
    }
  }

  const confidence = Math.min(1.0, Number((maxScore / totalHits).toFixed(2)));
  return { language: bestLang, confidence };
}

