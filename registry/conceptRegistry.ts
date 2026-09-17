// GESCOP — Registre unique de concepts (spec v2, section 3)
//
// Portée de ce fichier : le lexique utilisé pour RECONNAÎTRE une colonne à
// l'import (en-tête -> concept métier) et pour TRADUIRE une valeur de canal
// marketing (ex. "Facebook Ads" -> meta_ads). Ce n'est PAS un remplacement du
// catalogue riche `src/lib/core/semanticTypes.js` (SEMANTIC_TYPES), qui reste
// la source pour la compatibilité d'affichage/agrégation des KPI — les deux
// catalogues seront réconciliés dans un chantier ultérieur une fois que ce
// registre aura fait ses preuves sur la reconnaissance de colonnes.
//
// Ce fichier ne doit contenir aucune syntaxe spécifique à Deno ou à un
// bundler : il est importé tel quel depuis base44/shared (Deno) et depuis
// src/lib/core (Vite).

export type Criticality = "core" | "optional";
export type MissingBehavior = "NOT_IMPORTED" | "QUARANTINED" | "ZERO_IS_VALID";

export const ECONOMIC_ROLES = Object.freeze({
  FLOW: "FLOW",
  STOCK: "STOCK",
  RATE: "RATE",
  RATIO: "RATIO",
  COUNT: "COUNT",
});

export const DATA_TYPES = Object.freeze({
  CURRENCY: "currency",
  PERCENTAGE: "percentage",
  NUMBER: "number",
  INTEGER: "integer",
  DATE: "date",
  STRING: "string",
});

export const AGGREGATION_METHODS = Object.freeze({
  SUM: "sum",
  AVG: "avg",
  LAST: "last",
  COUNT: "count",
  NONE: "none",
});

export const DOMAINS = Object.freeze({
  FINANCE: "finance",
  VENTES: "ventes",
  MARKETING: "marketing",
  OPERATIONS: "operations",
  RH: "rh",
  TRESORERIE: "tresorerie",
  CLIENTS: "clients",
});

export interface ConceptDefinition {
  conceptId: string; // "finance.revenue" — compatible avec semanticMatcher.matchConcept
  canonicalKey: string; // "revenue" — compatible avec FIELD_ALIASES / kpiRegistry deps
  kind: keyof typeof ECONOMIC_ROLES;
  criticality: Criticality;
  domains: Array<keyof typeof DOMAINS>;
  dataType: keyof typeof DATA_TYPES;
  aggregation: keyof typeof AGGREGATION_METHODS;
  // Synonymes normalisés (accents retirés, minuscules, espaces simples) pour
  // reconnaître un EN-TÊTE de colonne comme ce concept.
  lexicon: string[];
  missingBehavior: MissingBehavior;
  // Synonymes qui ne doivent JAMAIS résoudre vers ce concept (garde-fou d'ambiguïté).
  forbidden?: string[];
  label: { fr: string; en: string };
}

export interface CategoryDefinition {
  categoryId: string;
  canonicalValues: string[];
  // Valeur canonique -> synonymes de VALEUR DE CELLULE (pas d'en-tête de colonne).
  lexicon: Record<string, string[]>;
}

export const REGISTRY_VERSION = "2026-09-17.1";

export const CONCEPTS: Record<string, ConceptDefinition> = {
  "temporal.date": {
    conceptId: "temporal.date",
    canonicalKey: "date",
    kind: "COUNT",
    criticality: "core",
    domains: ["FINANCE", "VENTES", "OPERATIONS"],
    dataType: "DATE",
    aggregation: "NONE",
    // "periode" est volontairement exclu : ALIAS_CANONIQUES le mappe deja a
    // "period" (distinct de "date"), et ce chantier n'ecrase pas les
    // resolutions ambigues existantes sans revue dediee.
    lexicon: ["date", "mois", "annee", "timestamp", "created_at", "date_operation", "date de commande"],
    missingBehavior: "NOT_IMPORTED",
    label: { fr: "Date", en: "Date" },
  },
  "finance.revenue": {
    conceptId: "finance.revenue",
    canonicalKey: "revenue",
    kind: "FLOW",
    criticality: "core",
    domains: ["FINANCE", "VENTES"],
    dataType: "CURRENCY",
    aggregation: "SUM",
    // "chiffre affaires" (sans "d") est volontairement exclu : ALIAS_CANONIQUES
    // a deja deux entrees contradictoires pour cette cle exacte (revenue et
    // total_revenue, un doublon de cle preexistant dans ce fichier) — pas a ce
    // chantier de trancher laquelle est correcte. "chiffre d affaires" (avec
    // "d") est une cle distincte, non ambigue, et reste dans ce lexique.
    lexicon: [
      "ca", "chiffre d affaires", "revenu", "revenue", "revenus",
      "ventes", "vente", "sales", "sales revenue", "turnover", "montant des ventes",
    ],
    missingBehavior: "NOT_IMPORTED",
    label: { fr: "Chiffre d'affaires", en: "Revenue" },
  },
  "finance.cogs": {
    conceptId: "finance.cogs",
    canonicalKey: "cogs",
    kind: "FLOW",
    criticality: "optional",
    domains: ["FINANCE"],
    dataType: "CURRENCY",
    aggregation: "SUM",
    lexicon: ["cout des biens vendus", "cout des marchandises vendues", "cost of goods sold", "cogs"],
    missingBehavior: "NOT_IMPORTED",
    label: { fr: "Coût des marchandises vendues", en: "Cost of goods sold" },
  },
  "finance.grossMargin": {
    conceptId: "finance.grossMargin",
    canonicalKey: "gross_margin",
    kind: "RATE",
    criticality: "optional",
    domains: ["FINANCE"],
    dataType: "PERCENTAGE",
    aggregation: "AVG",
    lexicon: ["marge brute", "marge", "gross margin", "gross profit margin", "taux de marge brute"],
    missingBehavior: "NOT_IMPORTED",
    label: { fr: "Marge brute", en: "Gross margin" },
  },
  "finance.expense": {
    conceptId: "finance.expense",
    canonicalKey: "expense",
    kind: "FLOW",
    criticality: "optional",
    domains: ["FINANCE"],
    dataType: "CURRENCY",
    aggregation: "SUM",
    // "depense totale" est volontairement exclu : ALIAS_CANONIQUES le mappe
    // deja (vraisemblablement a tort) a "total_revenue" — pas a ce chantier
    // de corriger cette resolution existante sans revue dediee.
    lexicon: ["depense", "depenses", "expense", "expenses"],
    missingBehavior: "NOT_IMPORTED",
    label: { fr: "Dépense", en: "Expense" },
  },
  "finance.cashBalance": {
    conceptId: "finance.cashBalance",
    canonicalKey: "closing_cash",
    kind: "STOCK",
    criticality: "optional",
    domains: ["TRESORERIE"],
    dataType: "CURRENCY",
    aggregation: "LAST",
    lexicon: ["solde cloture", "solde final", "solde banque", "solde bancaire", "solde", "closing cash", "cash balance"],
    missingBehavior: "NOT_IMPORTED",
    label: { fr: "Solde de trésorerie", en: "Cash balance" },
  },
  // marketing.spend est LE concept au cœur du bug "Facebook Ads ignoré" :
  // aucune des tables existantes (CONCEPT_MAPPINGS, FIELD_ALIASES) n'avait de
  // synonyme d'EN-TÊTE pour un canal publicitaire (ENUM_TRANSLATIONS ne
  // traduit ces mots que comme VALEUR de cellule d'une colonne "channel" déjà
  // reconnue — jamais comme nom de colonne). Ce lexique comble ce trou.
  "marketing.spend": {
    conceptId: "marketing.spend",
    canonicalKey: "advertising_spend",
    kind: "FLOW",
    criticality: "optional",
    domains: ["MARKETING"],
    dataType: "CURRENCY",
    aggregation: "SUM",
    lexicon: [
      "depenses publicitaires", "cout publicite", "ad spend", "advertising spend", "advertising cost",
      // en-têtes de fichiers larges "1 colonne par canal" — la cause racine du bug :
      "facebook ads", "facebook", "fb ads", "fb", "meta ads", "meta",
      "google ads", "adwords", "tiktok ads", "instagram ads",
    ],
    missingBehavior: "NOT_IMPORTED",
    label: { fr: "Dépenses publicitaires", en: "Advertising spend" },
  },
  "marketing.ctr": {
    conceptId: "marketing.ctr",
    canonicalKey: "ctr",
    kind: "RATE",
    criticality: "optional",
    domains: ["MARKETING"],
    dataType: "PERCENTAGE",
    aggregation: "AVG",
    lexicon: ["taux de clic", "taux clic", "click through rate", "click rate", "ctr"],
    missingBehavior: "NOT_IMPORTED",
    label: { fr: "Taux de clic", en: "Click-through rate" },
  },
  "marketing.cpc": {
    conceptId: "marketing.cpc",
    canonicalKey: "cpc",
    kind: "RATE",
    criticality: "optional",
    domains: ["MARKETING"],
    dataType: "CURRENCY",
    aggregation: "AVG",
    lexicon: ["cout par clic", "cout moyen par clic", "cost per click", "cpc"],
    missingBehavior: "NOT_IMPORTED",
    label: { fr: "Coût par clic", en: "Cost per click" },
  },
  "marketing.cpa": {
    conceptId: "marketing.cpa",
    canonicalKey: "cpa",
    kind: "RATE",
    criticality: "optional",
    domains: ["MARKETING"],
    dataType: "CURRENCY",
    aggregation: "AVG",
    lexicon: ["cout par acquisition", "cout par conversion", "cost per acquisition", "cpa"],
    missingBehavior: "NOT_IMPORTED",
    label: { fr: "Coût par acquisition", en: "Cost per acquisition" },
  },
  "marketing.roas": {
    conceptId: "marketing.roas",
    canonicalKey: "roas",
    kind: "RATIO",
    criticality: "optional",
    domains: ["MARKETING"],
    dataType: "NUMBER",
    aggregation: "AVG",
    lexicon: ["retour sur depenses publicitaires", "rendement publicitaire", "return on ad spend", "roas"],
    missingBehavior: "NOT_IMPORTED",
    label: { fr: "Retour sur dépenses publicitaires", en: "Return on ad spend" },
  },
  "customer.count": {
    conceptId: "customer.count",
    canonicalKey: "customer_count",
    kind: "COUNT",
    criticality: "optional",
    domains: ["CLIENTS"],
    dataType: "INTEGER",
    aggregation: "SUM",
    lexicon: ["clients", "acheteurs", "customers", "nb clients", "nombre de clients"],
    missingBehavior: "NOT_IMPORTED",
    label: { fr: "Nombre de clients", en: "Customer count" },
  },
  "customer.id": {
    conceptId: "customer.id",
    canonicalKey: "customer_id",
    kind: "COUNT",
    criticality: "optional",
    domains: ["CLIENTS"],
    dataType: "STRING",
    aggregation: "NONE",
    lexicon: ["client_id", "id_client", "customer_id"],
    missingBehavior: "NOT_IMPORTED",
    label: { fr: "Identifiant client", en: "Customer ID" },
  },
  "qualitative.feedback": {
    conceptId: "qualitative.feedback",
    canonicalKey: "feedback",
    kind: "COUNT",
    criticality: "optional",
    domains: ["CLIENTS"],
    dataType: "STRING",
    aggregation: "NONE",
    lexicon: ["commentaire", "avis", "feedback", "review", "remarque"],
    missingBehavior: "NOT_IMPORTED",
    label: { fr: "Commentaire", en: "Feedback" },
  },
};

export const CATEGORIES: Record<string, CategoryDefinition> = {
  marketing_channel: {
    categoryId: "marketing_channel",
    canonicalValues: ["meta_ads", "google_ads", "instagram", "email", "tiktok", "shopify"],
    lexicon: {
      meta_ads: ["facebook ads", "facebook", "fb ads", "fb", "meta ads", "meta"],
      google_ads: ["google ads", "adwords", "affichage", "affichage / web"],
      instagram: ["instagram", "instagram ads"],
      email: ["email", "courriel"],
      tiktok: ["tiktok", "tiktok ads"],
      shopify: ["web", "shopify"],
    },
  },
};
