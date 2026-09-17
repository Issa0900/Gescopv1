// ─────────────────────────────────────────────────────────────────────────────
// GESCOP Recognition Engine — Normalizer
// Version 5.0 — Septembre 2026
// ─────────────────────────────────────────────────────────────────────────────

export interface NormalizedHeaderInfo {
  rawHeader: string;
  cleanText: string;
  extractedUnit?: string;
  extractedCurrency?: string;
  isPercentage: boolean;
  tokens: string[];
}

/**
 * Nettoie les accents et caractères diacritiques (NFD)
 */
export function stripAccents(str: string): string {
  if (!str) return "";
  return String(str).normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

/**
 * Normalisation de base d'un texte (minuscules, sans accents, espaces condensés)
 */
export function basicNormalize(str: string): string {
  if (!str) return "";
  return stripAccents(String(str).toLowerCase().trim())
    .replace(/[\s\-_]+/g, " ")
    .replace(/[^\w\s%€$]/g, "")
    .trim();
}

/**
 * Analyse complète et normalisation d'un en-tête brut avec préservation
 */
export function normalizeHeader(raw: string): NormalizedHeaderInfo {
  const rawHeader = String(raw ?? "");
  let text = stripAccents(rawHeader).toLowerCase().trim();

  let extractedCurrency: string | undefined;
  let extractedUnit: string | undefined;
  let isPercentage = false;

  // 1. Détection des devises dans l'en-tête (ex: ($), (€), (CAD), (USD), [EUR])
  if (/\b(cad|\$cad|cad\$)\b/i.test(text) || text.includes("$") || text.includes("usd")) {
    if (text.includes("cad")) extractedCurrency = "CAD";
    else if (text.includes("usd")) extractedCurrency = "USD";
    else extractedCurrency = "CURRENCY";
  } else if (text.includes("€") || /\b(eur|euros?)\b/i.test(text)) {
    extractedCurrency = "EUR";
  } else if (text.includes("£") || /\b(gbp)\b/i.test(text)) {
    extractedCurrency = "GBP";
  }

  // 2. Détection des pourcentages (ex: (%), [%], _pct, _pourcentage)
  if (text.includes("%") || /\b(pct|pourcent|percent|percentage|pourcentage)\b/i.test(text)) {
    isPercentage = true;
    extractedUnit = "%";
  }

  // 3. Détection des unités temporelles et physiques (ex: (jours), (days), (kg), (litres))
  if (/\b(jours?|days?|dias?|tage)\b/i.test(text)) {
    extractedUnit = "days";
  } else if (/\b(heures?|hours?|hrs?|stunden)\b/i.test(text)) {
    extractedUnit = "hours";
  } else if (/\b(kg|kilos?|kilogrammes?)\b/i.test(text)) {
    extractedUnit = "kg";
  } else if (/\b(litres?|liters?)\b/i.test(text)) {
    extractedUnit = "litres";
  } else if (/\b(pcs|pieces?|unites?|units?)\b/i.test(text)) {
    extractedUnit = "units";
  }

  // 4. Nettoyage de la chaîne racine sans les parenthèses d'unités
  let cleanText = text
    .replace(/\([^)]*\)/g, " ")     // enlève (USD), ($), (%)
    .replace(/\[[^\]]*\]/g, " ")   // enlève [CAD], [%]
    .replace(/[\$€£%]/g, " ")      // enlève symboles restants
    .replace(/[_\-./\\+*]/g, " ")  // unifie les séparateurs
    .replace(/[^a-z0-9\s]/g, " ")  // supprime ponctuation résiduelle
    .replace(/\s+/g, " ")
    .trim();

  // 5. Découpage en tokens simples
  const tokens = cleanText.split(" ").filter((t) => t.length > 0);

  return {
    rawHeader,
    cleanText,
    extractedUnit,
    extractedCurrency,
    isPercentage,
    tokens,
  };
}

