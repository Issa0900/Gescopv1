import type { CanonicalConcept } from "../types.ts";
import {
  PHYSICAL_TYPES,
  LOGICAL_TYPES,
  BUSINESS_ROLES,
  SEMANTIC_NATURES,
  GRAIN_LEVELS,
  AGGREGATION_TYPES,
} from "../types.ts";

export const LOGISTICS_CONCEPTS: Record<string, CanonicalConcept> = {
  // ── DÉLAI DE LIVRAISON EN JOURS ──
  "logistics.delivery.lead_time": {
    conceptId: "logistics.delivery.lead_time",
    canonicalName: "delivery_days",
    domain: "logistics",
    subdomain: "delivery",
    nature: SEMANTIC_NATURES.DURATION_MEASURE,
    businessRole: BUSINESS_ROLES.QUANTITY,
    physicalType: PHYSICAL_TYPES.FLOAT,
    logicalType: LOGICAL_TYPES.DURATION,
    unit: "days",
    grain: GRAIN_LEVELS.ORDER,
    temporalType: "flow",
    synonyms: {
      fr: [
        "delai de livraison", "temps de livraison", "delai moyen de livraison",
        "delai d'expedition", "duree de transport", "delai de livraison en jours", "delai moyen"
      ],
      en: [
        "delivery days", "delivery time", "shipping time", "lead time", "transit time",
        "average delivery days", "shipping duration", "order lead time"
      ],
      es: ["plazo de entrega", "tiempo de entrega", "dias de entrega"],
      pt: ["prazo de entrega", "tempo de entrega", "dias de entrega"],
      de: ["lieferzeit", "versanddauer", "lieferfrist in tagen", "durchschnittliche lieferzeit"],
      it: ["tempi di consegna", "giorni di consegna", "tempo di transito"],
      nl: ["levertijd", "bezorgduur", "gemiddelde levertijd in dagen"],
    },
    abbreviations: ["LEAD_TIME", "DELIV_DAYS"],
    allowedAggregations: [AGGREGATION_TYPES.AVG, AGGREGATION_TYPES.MIN, AGGREGATION_TYPES.MAX],
    forbiddenOperations: ["SUM"],
    entityBindings: [
      { entity: "Supplier", field: "average_delivery_days", isDefault: true },
    ],
  },

  // ── FRAIS DE PORT / TRANSPORT ──
  "logistics.cost.shipping": {
    conceptId: "logistics.cost.shipping",
    canonicalName: "shipping_cost",
    domain: "logistics",
    subdomain: "costs",
    nature: SEMANTIC_NATURES.FINANCIAL_MEASURE,
    businessRole: BUSINESS_ROLES.FLOW,
    physicalType: PHYSICAL_TYPES.DECIMAL,
    logicalType: LOGICAL_TYPES.CURRENCY,
    unit: "currency",
    grain: GRAIN_LEVELS.ORDER,
    temporalType: "flow",
    synonyms: {
      fr: ["frais de port", "cout de livraison", "frais de transport", "cout expedition", "fret"],
      en: ["shipping cost", "delivery fee", "freight cost", "shipping fee", "postage"],
      es: ["gastos de envio", "coste de transporte", "flete"],
      pt: ["frete", "custo de envio", "taxa de entrega"],
      de: ["versandkosten", "frachtkosten", "liefergebuhren"],
      it: ["spese di spedizione", "costo di trasporto"],
      nl: ["verzendkosten", "vrachtkosten"],
    },
    abbreviations: ["FREIGHT", "SHIP_COST"],
    allowedAggregations: [AGGREGATION_TYPES.SUM, AGGREGATION_TYPES.AVG],
    entityBindings: [],
  },
};
