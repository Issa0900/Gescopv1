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

export const ECOMMERCE_CONCEPTS: Record<string, CanonicalConcept> = {
  // ── SESSIONS / VISITES WEB ──
  "ecommerce.traffic.sessions": {
    conceptId: "ecommerce.traffic.sessions",
    canonicalName: "sessions",
    domain: "ecommerce",
    subdomain: "traffic",
    nature: SEMANTIC_NATURES.QUANTITY_MEASURE,
    businessRole: BUSINESS_ROLES.COUNT,
    physicalType: PHYSICAL_TYPES.INTEGER,
    logicalType: LOGICAL_TYPES.QUANTITY,
    unit: "units",
    grain: GRAIN_LEVELS.DAY,
    temporalType: "flow",
    synonyms: {
      fr: ["sessions", "visites", "nombre de visites", "visiteurs uniques", "trafic web"],
      en: ["sessions", "visits", "web traffic", "visitors", "unique visitors", "web sessions"],
      es: ["sesiones", "visitas", "trafico web"],
      pt: ["sessoes", "visitas", "trafego web"],
      de: ["sitzungen", "besuche", "web-traffic", "visiten"],
      it: ["sessioni", "visite", "traffico web"],
      nl: ["sessies", "bezoeken", "webtrafiek"],
    },
    abbreviations: ["SESS", "VISITS"],
    allowedAggregations: [AGGREGATION_TYPES.SUM, AGGREGATION_TYPES.AVG],
    entityBindings: [],
  },

  // ── TAUX DE CONVERSION E-COMMERCE (CVR) ──
  "ecommerce.funnel.cvr": {
    conceptId: "ecommerce.funnel.cvr",
    canonicalName: "conversion_rate",
    domain: "ecommerce",
    subdomain: "funnel",
    nature: SEMANTIC_NATURES.PERCENTAGE_MEASURE,
    businessRole: BUSINESS_ROLES.RATE,
    physicalType: PHYSICAL_TYPES.FLOAT,
    logicalType: LOGICAL_TYPES.PERCENTAGE,
    unit: "%",
    grain: GRAIN_LEVELS.DAY,
    temporalType: "flow",
    synonyms: {
      fr: ["taux de conversion", "cvr", "taux de transformation", "ratio de conversion"],
      en: ["conversion rate", "cvr", "ecommerce conversion rate", "order conversion rate"],
      es: ["tasa de conversion", "cvr"],
      pt: ["taxa de conversao", "cvr"],
      de: ["konversionsrate", "conversion-rate", "cvr"],
      it: ["tasso di conversione", "cvr"],
      nl: ["conversieratio", "conversiepercentage"],
    },
    abbreviations: ["CVR", "CR"],
    derivedFormula: "orders / sessions",
    allowedAggregations: [AGGREGATION_TYPES.AVG],
    forbiddenOperations: ["SUM"],
    entityBindings: [
      { entity: "Campaign", field: "conversion_rate", isDefault: true },
    ],
  },
};
