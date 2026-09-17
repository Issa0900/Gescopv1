// ─────────────────────────────────────────────────────────────────────────────
// GESCOP Recognition Engine — Intelligent Tokenizer
// Version 5.0 — Septembre 2026
// ─────────────────────────────────────────────────────────────────────────────

import { stripAccents } from "./normalizer.ts";

/**
 * Découpe intelligemment un identifiant ou en-tête en tokens atomiques
 * Prend en charge :
 * - camelCase (customerLifetimeValue -> customer, lifetime, value)
 * - PascalCase (GrossMargin -> gross, margin)
 * - snake_case (avg_order_value -> avg, order, value)
 * - kebab-case (net-sales-volume -> net, sales, volume)
 * - Séparation lettres/chiffres (q1Revenue -> q1, revenue)
 * - Acronymes collés (getAOVAmount -> get, aov, amount, orderID -> order, id)
 */
export function tokenizeHeader(header: string): string[] {
  if (!header) return [];

  const stripped = stripAccents(String(header).trim());

  // 1. Remplacement des séparateurs explicites par des espaces
  const spaced = stripped
    .replace(/[_\-./\\+*]/g, " ")
    .replace(/[^a-zA-Z0-9\s]/g, " ");

  const words = spaced.split(/\s+/).filter(Boolean);
  const resultTokens: string[] = [];

  for (const word of words) {
    // 2. Décomposition des majuscules (camelCase / PascalCase / Acronymes)
    // Exemple : CustomerLifetimeValue -> Customer, Lifetime, Value
    // Exemple : orderID -> order, ID
    // Exemple : XMLParser -> XML, Parser
    const subWords = word
      // Traite les transitions Acronyme -> Mot normal (ex: AOVAmount -> AOV Amount)
      .replace(/([A-Z]+)([A-Z][a-z])/g, "$1 $2")
      // Traite les transitions minuscule -> Majuscule (ex: customerLifetime -> customer Lifetime)
      .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
      // Traite les transitions lettres -> chiffres (ex: q1Revenue -> q1 Revenue)
      .replace(/([a-zA-Z])([0-9]+)/g, "$1 $2")
      .replace(/([0-9]+)([a-zA-Z])/g, "$1 $2")
      .split(/\s+/);

    for (const sub of subWords) {
      const cleanToken = sub.toLowerCase().trim();
      if (cleanToken.length > 0) {
        resultTokens.push(cleanToken);
      }
    }
  }

  return resultTokens;
}

/**
 * Reconstruit les n-grammes de tokens (1-gram, 2-gram, 3-gram)
 * Exemple : ["chiffre", "affaires", "net"]
 * -> ["chiffre", "affaires", "net", "chiffre affaires", "affaires net", "chiffre affaires net"]
 */
export function generateNGrams(tokens: string[], maxN = 3): string[] {
  const nGrams: string[] = [];
  const len = tokens.length;

  for (let n = 1; n <= Math.min(maxN, len); n++) {
    for (let i = 0; i <= len - n; i++) {
      nGrams.push(tokens.slice(i, i + n).join(" "));
    }
  }

  return nGrams;
}

