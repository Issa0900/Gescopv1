// ─────────────────────────────────────────────────────────────────────────────
// GESCOP Recognition Engine — Unit & Currency Engine
// Version 5.0 — Septembre 2026
// ─────────────────────────────────────────────────────────────────────────────

import { stripAccents } from "./normalizer.ts";

export interface ExtractedUnitInfo {
  unitType: "currency" | "percentage" | "duration" | "physical" | "dimensionless";
  unitSymbol?: string;
  currencyCode?: string;
  confidence: number;
  justification?: string;
}

export function extractUnit(header: string, sampleValues: unknown[] = []): ExtractedUnitInfo {
  const norm = stripAccents(header.toLowerCase());

  // 1. Devises explicites dans l'en-tête
  if (/\b(cad|\$cad|cad\$)\b/i.test(norm) || (norm.includes("$") && norm.includes("cad"))) {
    return { unitType: "currency", unitSymbol: "$", currencyCode: "CAD", confidence: 0.98, justification: "Devise CAD détectée dans l'en-tête." };
  }
  if (/\b(usd|\$usd|usd\$)\b/i.test(norm) || norm.includes("usd")) {
    return { unitType: "currency", unitSymbol: "$", currencyCode: "USD", confidence: 0.98, justification: "Devise USD détectée dans l'en-tête." };
  }
  if (/\b(eur|euros?)\b/i.test(norm) || norm.includes("€")) {
    return { unitType: "currency", unitSymbol: "€", currencyCode: "EUR", confidence: 0.98, justification: "Devise EUR (€) détectée dans l'en-tête." };
  }
  if (norm.includes("$")) {
    return { unitType: "currency", unitSymbol: "$", currencyCode: "CURRENCY", confidence: 0.9, justification: "Symbole monétaire '$' détecté." };
  }

  // 2. Pourcentage explicite
  if (norm.includes("%") || /\b(pct|pourcent|percent|percentage|taux)\b/i.test(norm)) {
    return { unitType: "percentage", unitSymbol: "%", confidence: 0.95, justification: "Pourcentage (%) détecté dans l'en-tête." };
  }

  // 3. Unités temporelles
  if (/\b(jours?|days?|dias?|tage)\b/i.test(norm)) {
    return { unitType: "duration", unitSymbol: "days", confidence: 0.95, justification: "Unité en jours détectée." };
  }
  if (/\b(heures?|hours?|hrs?|stunden)\b/i.test(norm)) {
    return { unitType: "duration", unitSymbol: "hours", confidence: 0.95, justification: "Unité en heures détectée." };
  }

  // 4. Unités physiques
  if (/\b(kg|kilos?|kilogrammes?)\b/i.test(norm)) {
    return { unitType: "physical", unitSymbol: "kg", confidence: 0.95, justification: "Poids en kg détecté." };
  }
  if (/\b(litres?|liters?)\b/i.test(norm)) {
    return { unitType: "physical", unitSymbol: "litres", confidence: 0.95, justification: "Volume en litres détecté." };
  }
  if (/\b(pcs|pieces?|unites?|units?)\b/i.test(norm)) {
    return { unitType: "physical", unitSymbol: "units", confidence: 0.9, justification: "Comptage d'unités/pièces détecté." };
  }

  // 5. Inspection des valeurs échantillons pour symboles monétaires ($ / €) ou %
  for (const val of sampleValues.slice(0, 10)) {
    const s = String(val ?? "");
    if (s.includes("$")) {
      return { unitType: "currency", unitSymbol: "$", currencyCode: "CAD", confidence: 0.85, justification: "Symbole $ détecté dans les valeurs." };
    }
    if (s.includes("€")) {
      return { unitType: "currency", unitSymbol: "€", currencyCode: "EUR", confidence: 0.85, justification: "Symbole € détecté dans les valeurs." };
    }
    if (s.includes("%")) {
      return { unitType: "percentage", unitSymbol: "%", confidence: 0.85, justification: "Symbole % détecté dans les valeurs." };
    }
  }

  return { unitType: "dimensionless", confidence: 0.5 };
}

