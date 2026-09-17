import type { CanonicalConcept } from "../types.ts";
import {
  CanonicalConcept,
  PHYSICAL_TYPES,
  LOGICAL_TYPES,
  BUSINESS_ROLES,
  SEMANTIC_NATURES,
  GRAIN_LEVELS,
  AGGREGATION_TYPES,
} from "../types.ts";

export const CUSTOMER_CONCEPTS: Record<string, CanonicalConcept> = {
  // ── IDENTIFIANT CLIENT ──
  "customers.identity.id": {
    conceptId: "customers.identity.id",
    canonicalName: "customer_id",
    domain: "customers",
    subdomain: "identity",
    nature: SEMANTIC_NATURES.IDENTIFIER,
    businessRole: BUSINESS_ROLES.IDENTIFIER,
    physicalType: PHYSICAL_TYPES.STRING,
    logicalType: LOGICAL_TYPES.IDENTIFIER,
    unit: undefined,
    grain: GRAIN_LEVELS.CUSTOMER,
    temporalType: "static",
    synonyms: {
      fr: [
        "id client", "id_client", "code client", "code_client", "numero client",
        "no client", "numero de client", "num client", "ref client", "identifiant client"
      ],
      en: [
        "customer id", "customer_id", "client id", "client_id", "customer number",
        "customer no", "account id", "customer code", "cust id", "buyer id"
      ],
      es: ["id cliente", "codigo cliente", "numero de cliente"],
      pt: ["id cliente", "codigo do cliente", "numero do cliente"],
      de: ["kundennummer", "kunden-id", "kundenid", "kdnr"],
      it: ["id cliente", "codice cliente", "numero cliente"],
      nl: ["klantnummer", "klant id", "klantcode"],
    },
    abbreviations: ["CUST_ID", "ID_CLI", "KDNR"],
    allowedAggregations: [AGGREGATION_TYPES.COUNT_DISTINCT],
    forbiddenOperations: ["SUM", "AVG"],
    entityBindings: [
      { entity: "Customer", field: "customer_id", isDefault: true },
      { entity: "Order", field: "customer_id" },
      { entity: "Transaction", field: "client" },
    ],
  },

  // ── VALEUR VIE CLIENT (LTV / CLV) ──
  "customers.value.ltv": {
    conceptId: "customers.value.ltv",
    canonicalName: "lifetime_value",
    domain: "customers",
    subdomain: "value",
    nature: SEMANTIC_NATURES.FINANCIAL_MEASURE,
    businessRole: BUSINESS_ROLES.RESULT,
    physicalType: PHYSICAL_TYPES.DECIMAL,
    logicalType: LOGICAL_TYPES.CURRENCY,
    unit: "currency",
    grain: GRAIN_LEVELS.CUSTOMER,
    temporalType: "stock",
    synonyms: {
      fr: [
        "valeur vie client", "valeur a vie", "valeur vie", "clv", "ltv",
        "valeur globale du client", "chiffre d'affaires cumule par client"
      ],
      en: [
        "lifetime value", "customer lifetime value", "clv", "ltv", "cltv",
        "customer value", "cumulative customer revenue"
      ],
      es: ["valor de vida del cliente", "valor vitalicio", "ltv"],
      pt: ["valor do ciclo de vida", "ltv do cliente"],
      de: ["customer lifetime value", "kundenlebenszeitwert", "clv"],
      it: ["valore del ciclo di vita del cliente", "customer lifetime value"],
      nl: ["klantwaarde over de levensduur", "clv"],
    },
    abbreviations: ["LTV", "CLV", "CLTV"],
    allowedAggregations: [AGGREGATION_TYPES.AVG, AGGREGATION_TYPES.MAX, AGGREGATION_TYPES.MIN],
    forbiddenOperations: [],
    entityBindings: [
      { entity: "Customer", field: "lifetime_value", isDefault: true },
    ],
  },

  // ── RISQUE DE CHURN / ATTRITION ──
  "customers.behavior.churn_risk": {
    conceptId: "customers.behavior.churn_risk",
    canonicalName: "churn_risk",
    domain: "customers",
    subdomain: "behavior",
    nature: SEMANTIC_NATURES.CATEGORICAL_DIMENSION,
    businessRole: BUSINESS_ROLES.DIMENSION,
    physicalType: PHYSICAL_TYPES.STRING,
    logicalType: LOGICAL_TYPES.CATEGORY,
    unit: undefined,
    grain: GRAIN_LEVELS.CUSTOMER,
    temporalType: "snapshot",
    synonyms: {
      fr: [
        "risque d'attrition", "risque de churn", "probabilite de depart",
        "churn risk", "statut de risque client", "niveau de risque de perte"
      ],
      en: [
        "churn risk", "attrition risk", "churn probability", "customer churn status",
        "churn score"
      ],
      es: ["riesgo de abandono", "probabilidad de baja"],
      pt: ["risco de churn", "risco de cancelamento"],
      de: ["abwanderungsrisiko", "churn-risiko"],
      it: ["rischio di abbandono", "rischio churn"],
      nl: ["verlooprisico", "churn risico"],
    },
    abbreviations: ["CHURN"],
    allowedAggregations: [AGGREGATION_TYPES.NONE],
    entityBindings: [
      { entity: "Customer", field: "churn_risk", isDefault: true },
    ],
  },

  // ── SCORE DE SATISFACTION (CSAT / NPS) ──
  "customers.satisfaction.rating": {
    conceptId: "customers.satisfaction.rating",
    canonicalName: "satisfaction_score",
    domain: "customers",
    subdomain: "satisfaction",
    nature: SEMANTIC_NATURES.RATING_MEASURE,
    businessRole: BUSINESS_ROLES.RATE,
    physicalType: PHYSICAL_TYPES.FLOAT,
    logicalType: LOGICAL_TYPES.RATING,
    unit: "rating",
    grain: GRAIN_LEVELS.CUSTOMER,
    temporalType: "snapshot",
    synonyms: {
      fr: [
        "note moyenne", "satisfaction client", "score de satisfaction", "evaluation client",
        "csat", "nps", "net promoter score", "note avis", "avis client"
      ],
      en: [
        "average rating", "customer satisfaction", "csat", "nps", "net promoter score",
        "customer rating", "feedback score", "review score"
      ],
      es: ["puntuacion media", "satisfaccion del cliente", "nps", "calificacion"],
      pt: ["avaliacao media", "satisfacao do cliente", "nps"],
      de: ["durchschnittsbewertung", "kundenzufriedenheit", "nps", "kundenbewertung"],
      it: ["valutazione media", "soddisfazione del cliente", "nps"],
      nl: ["gemiddelde score", "klanttevredenheid", "nps"],
    },
    abbreviations: ["NPS", "CSAT"],
    allowedAggregations: [AGGREGATION_TYPES.AVG],
    forbiddenOperations: ["SUM"],
    entityBindings: [
      { entity: "Supplier", field: "average_rating" },
    ],
  },
};
