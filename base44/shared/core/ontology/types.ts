// ─────────────────────────────────────────────────────────────────────────────
// GESCOP Universal Commercial Ontology (UCO) — Types & Schema Definitions
// Version 5.0 — Septembre 2026
// ─────────────────────────────────────────────────────────────────────────────

/**
 * 1. Types physiques de données
 */
export const PHYSICAL_TYPES = {
  STRING: "STRING",
  INTEGER: "INTEGER",
  DECIMAL: "DECIMAL",
  FLOAT: "FLOAT",
  BOOLEAN: "BOOLEAN",
  DATE: "DATE",
  DATETIME: "DATETIME",
  TIME: "TIME",
  TIMESTAMP: "TIMESTAMP",
  JSON: "JSON",
  ARRAY: "ARRAY",
  OBJECT: "OBJECT",
} as const;

export type PhysicalType = (typeof PHYSICAL_TYPES)[keyof typeof PHYSICAL_TYPES];

/**
 * 2. Types logiques de données
 */
export const LOGICAL_TYPES = {
  CURRENCY: "CURRENCY",
  PERCENTAGE: "PERCENTAGE",
  DATE: "DATE",
  IDENTIFIER: "IDENTIFIER",
  EMAIL: "EMAIL",
  PHONE: "PHONE",
  POSTAL_CODE: "POSTAL_CODE",
  URL: "URL",
  QUANTITY: "QUANTITY",
  RATING: "RATING",
  DURATION: "DURATION",
  ADDRESS: "ADDRESS",
  CATEGORY: "CATEGORY",
  STATUS: "STATUS",
  TEXT: "TEXT",
  BOOLEAN: "BOOLEAN",
} as const;

export type LogicalType = (typeof LOGICAL_TYPES)[keyof typeof LOGICAL_TYPES];

/**
 * 3. Rôles analytiques & économiques
 */
export const BUSINESS_ROLES = {
  FLOW: "FLOW",           // Flux cumulable dans le temps (ventes, charges)
  STOCK: "STOCK",         // Valeur instantanée (solde de trésorerie, niveau de stock)
  RATE: "RATE",           // Taux (taux d'intérêt, taux de conversion)
  RATIO: "RATIO",         // Ratio (marge brute %, ROAS, panier moyen)
  COUNT: "COUNT",         // Nombre discret d'occurrences
  QUANTITY: "QUANTITY",   // Quantité physique (unités, kg, litres)
  BALANCE: "BALANCE",     // Solde à un instant t
  ASSET: "ASSET",         // Actif
  LIABILITY: "LIABILITY", // Passif
  RESULT: "RESULT",       // Résultat calculé (bénéfice, EBITDA)
  DIMENSION: "DIMENSION", // Dimension catégorielle ou temporelle
  IDENTIFIER: "IDENTIFIER",// Clé technique ou métier
} as const;

export type BusinessRole = (typeof BUSINESS_ROLES)[keyof typeof BUSINESS_ROLES];

/**
 * 4. Natures sémantiques
 */
export const SEMANTIC_NATURES = {
  FINANCIAL_MEASURE: "financial_measure",
  QUANTITY_MEASURE: "quantity_measure",
  PERCENTAGE_MEASURE: "percentage_measure",
  RATIO_MEASURE: "ratio_measure",
  TEMPORAL_DIMENSION: "temporal_dimension",
  CATEGORICAL_DIMENSION: "categorical_dimension",
  GEOGRAPHIC_DIMENSION: "geographic_dimension",
  IDENTIFIER: "identifier",
  STATUS_DIMENSION: "status_dimension",
  CONTACT_DIMENSION: "contact_dimension",
  RATING_MEASURE: "rating_measure",
  DURATION_MEASURE: "duration_measure",
} as const;

export type SemanticNature = (typeof SEMANTIC_NATURES)[keyof typeof SEMANTIC_NATURES];

/**
 * 5. Grains métiers
 */
export const GRAIN_LEVELS = {
  TRANSACTION: "transaction",
  ORDER: "order",
  ORDER_LINE: "order_line",
  DAY: "day",
  MONTH: "month",
  YEAR: "year",
  CUSTOMER: "customer",
  PRODUCT: "product",
  EMPLOYEE: "employee",
  SUPPLIER: "supplier",
  CAMPAIGN: "campaign",
  STORE: "store",
  LOCATION: "location",
  SUMMARY: "summary",
  STATIC: "static",
} as const;

export type GrainLevel = (typeof GRAIN_LEVELS)[keyof typeof GRAIN_LEVELS];

/**
 * Archetypes structuraux de document / feuille (Spec Section 9 & 14)
 */
export const DOCUMENT_ARCHETYPES = {
  TRANSACTION_DATA: "TRANSACTION_DATA",
  MASTER_DATA: "MASTER_DATA",
  AGGREGATED_SUMMARY: "AGGREGATED_SUMMARY",
  PERIODIC_REPORT: "PERIODIC_REPORT",
  REFERENCE_DATA: "REFERENCE_DATA",
  UNKNOWN: "UNKNOWN",
} as const;

export type DocumentArchetype = (typeof DOCUMENT_ARCHETYPES)[keyof typeof DOCUMENT_ARCHETYPES];

/**
 * Catégories sémantiques reconnues dans les valeurs (Spec Section 14 & 15)
 */
export const VALUE_SEMANTIC_CATEGORIES = {
  GEOGRAPHIC_LOCATION: "GEOGRAPHIC_LOCATION",
  ORGANIZATIONAL_DEPARTMENT: "ORGANIZATIONAL_DEPARTMENT",
  MARKETING_CHANNEL: "MARKETING_CHANNEL",
  PAYMENT_METHOD: "PAYMENT_METHOD",
  STATUS_LIFECYCLE: "STATUS_LIFECYCLE",
  GENERAL_TEXT: "GENERAL_TEXT",
} as const;

export type ValueSemanticCategory = (typeof VALUE_SEMANTIC_CATEGORIES)[keyof typeof VALUE_SEMANTIC_CATEGORIES];

/**
 * 6. Méthodes d'agrégation autorisées
 */
export const AGGREGATION_TYPES = {
  SUM: "SUM",
  AVG: "AVG",
  WEIGHTED_AVG: "WEIGHTED_AVG",
  LAST: "LAST",
  FIRST: "FIRST",
  MIN: "MIN",
  MAX: "MAX",
  COUNT: "COUNT",
  COUNT_DISTINCT: "COUNT_DISTINCT",
  NONE: "NONE",
} as const;

export type AggregationType = (typeof AGGREGATION_TYPES)[keyof typeof AGGREGATION_TYPES];

/**
 * Structure des synonymes multilingues
 */
export interface MultilingualSynonyms {
  fr?: string[];
  en?: string[];
  es?: string[];
  pt?: string[];
  de?: string[];
  it?: string[];
  nl?: string[];
  [lang: string]: string[] | undefined;
}

/**
 * Liaison vers un champ concret d'une entité Base44
 */
export interface EntityFieldBinding {
  entity: string;   // Ex: "Order", "Cashflow", "Transaction"
  field: string;    // Ex: "total", "closing_cash", "amount"
  isDefault?: boolean;
}

/**
 * Définition complète d'un Concept Canonique universel
 */
export interface CanonicalConcept {
  conceptId: string;                     // ID universel (ex: "sales.revenue.net")
  canonicalName: string;                 // Nom standard (ex: "net_revenue")
  domain: string;                        // Domaine principal (ex: "sales")
  subdomain?: string;                    // Sous-domaine (ex: "revenue")
  nature: SemanticNature;                // Nature sémantique
  businessRole: BusinessRole;            // Rôle économique
  physicalType: PhysicalType;            // Type physique attendu
  logicalType: LogicalType;              // Type logique
  unit?: string;                         // Unité standard (currency, %, units, days, kg...)
  grain: GrainLevel;                     // Niveau de détail habituel
  temporalType: "flow" | "stock" | "snapshot" | "static";

  // Vocabulaire & Variantes
  synonyms: MultilingualSynonyms;        // Synonymes par langue
  abbreviations?: string[];              // Abréviations courantes (CA, MB, RN, AOV, etc.)
  acronyms?: string[];                   // Acronymes
  regionalVariants?: string[];           // Variantes régionales
  erpVariants?: string[];                // Noms de colonnes SAP, Odoo, Sage, QuickBooks...
  commonTypos?: string[];                // Fautes de frappe courantes

  // Relations & Dépendances
  relatedTerms?: string[];               // Termes qui renforcent le score
  negativeTerms?: string[];              // Termes qui DISQUALIFIENT le concept (ex: margin != profit)
  conflictingConcepts?: string[];        // Concepts concurrents
  parentConcept?: string;                // Concept parent dans la hiérarchie
  childConcepts?: string[];              // Concepts enfants

  // Comportement analytique & Formules
  allowedAggregations: AggregationType[];// Opérations valides
  forbiddenOperations?: string[];        // Opérations interdites (ex: SUM pour les soldes instantanés)
  derivedFormula?: string;               // Ex: "gross_profit / revenue" pour gross_margin
  requiredInputs?: string[];             // Dépendances de calcul

  // Liaison Base44
  entityBindings?: EntityFieldBinding[]; // Correspondances vers les entités de l'application
}

/**
 * Format standardisé de résultat pour une colonne analysée (Section 60)
 */
export interface CandidateMatch {
  conceptId: string;
  canonicalName: string;
  score: number;
  confidence: number;
  justification?: string;
}

export interface RecognitionResult {
  sourceHeader: string;                  // En-tête brut d'origine
  normalizedHeader: string;              // En-tête nettoyé
  language: string;                      // Langue détectée (fr, en, es, pt, de, it, nl...)
  candidates: CandidateMatch[];          // Candidats classés par score
  selectedConcept: string | null;        // conceptId retenu (ou null si inconnu)
  canonicalName: string | null;          // Nom canonique
  confidence: number;                    // Score de confiance global (0.0 à 1.0)
  evidence: string[];                    // Liste des preuves ayant motivé le choix
  nature: SemanticNature | "unknown";
  logicalType: LogicalType | "unknown";
  role: BusinessRole | "unknown";
  aggregation: AggregationType;
  grain: GrainLevel | "unknown";
  unit?: string | null;
  currency?: string | null;
  targetEntity?: string | null;          // Entité Base44 recommandée
  targetField?: string | null;           // Propriété dans l'entité Base44
  requiresValidation: boolean;           // true si confiance < 0.65 ou ambigu
}
