import type { CanonicalConcept } from "../types.ts";
import {
  PHYSICAL_TYPES,
  LOGICAL_TYPES,
  BUSINESS_ROLES,
  SEMANTIC_NATURES,
  GRAIN_LEVELS,
  AGGREGATION_TYPES,
} from "../types.ts";

export const COMMON_CONCEPTS: Record<string, CanonicalConcept> = {
  // ── IDENTIFIANT DE COMMANDE ──
  "common.identifier.order_id": {
    conceptId: "common.identifier.order_id",
    canonicalName: "order_id",
    domain: "sales",
    subdomain: "order",
    nature: SEMANTIC_NATURES.IDENTIFIER,
    businessRole: BUSINESS_ROLES.IDENTIFIER,
    physicalType: PHYSICAL_TYPES.STRING,
    logicalType: LOGICAL_TYPES.IDENTIFIER,
    unit: undefined,
    grain: GRAIN_LEVELS.ORDER,
    temporalType: "static",
    synonyms: {
      fr: [
        "id commande", "id_commande", "numero de commande", "no commande", "num commande",
        "commande id", "reference commande", "ref commande", "bon de commande client"
      ],
      en: [
        "order id", "order_id", "order number", "order no", "order ref",
        "sales order", "sales order id", "so number", "order #"
      ],
      es: ["id pedido", "numero de pedido", "codigo de pedido"],
      pt: ["id pedido", "numero do pedido"],
      de: ["bestellnummer", "auftragsnummer", "order-id"],
      it: ["id ordine", "numero ordine"],
      nl: ["bestelnummer", "ordernummer"],
    },
    abbreviations: ["SO", "ORD_ID"],
    allowedAggregations: [AGGREGATION_TYPES.COUNT_DISTINCT],
    forbiddenOperations: ["SUM", "AVG"],
    entityBindings: [
      { entity: "Order", field: "order_id", isDefault: true },
    ],
  },

  // ── DATE DE TRANSACTION / ÉVÉNEMENT ──
  "common.temporal.date": {
    conceptId: "common.temporal.date",
    canonicalName: "date",
    domain: "common",
    subdomain: "temporal",
    nature: SEMANTIC_NATURES.TEMPORAL_DIMENSION,
    businessRole: BUSINESS_ROLES.DIMENSION,
    physicalType: PHYSICAL_TYPES.DATE,
    logicalType: LOGICAL_TYPES.DATE,
    unit: undefined,
    grain: GRAIN_LEVELS.DAY,
    temporalType: "static",
    synonyms: {
      fr: [
        "date", "date operation", "date de transaction", "date commande", "date de vente",
        "date facture", "jour", "date_creation", "date creation", "created_at"
      ],
      en: [
        "date", "transaction date", "sale date", "order date", "invoice date",
        "created at", "timestamp", "event date", "day"
      ],
      es: ["fecha", "fecha de transaccion", "fecha de pedido"],
      pt: ["data", "data da transacao", "data do pedido"],
      de: ["datum", "buchungsdatum", "auftragsdatum", "erstellungsdatum"],
      it: ["data", "data transazione", "data ordine"],
      nl: ["datum", "transactiedatum", "orderdatum"],
    },
    abbreviations: ["DT", "DATE"],
    allowedAggregations: [AGGREGATION_TYPES.MIN, AGGREGATION_TYPES.MAX],
    forbiddenOperations: ["SUM", "AVG"],
    entityBindings: [
      { entity: "Order", field: "date", isDefault: true },
      { entity: "Transaction", field: "date" },
      { entity: "Cashflow", field: "date" },
      { entity: "Expense", field: "date" },
      { entity: "Inventory", field: "date" },
    ],
  },

  // ── STATUT DE L'ENREGISTREMENT ──
  "common.dimension.status": {
    conceptId: "common.dimension.status",
    canonicalName: "status",
    domain: "common",
    subdomain: "status",
    nature: SEMANTIC_NATURES.STATUS_DIMENSION,
    businessRole: BUSINESS_ROLES.DIMENSION,
    physicalType: PHYSICAL_TYPES.STRING,
    logicalType: LOGICAL_TYPES.STATUS,
    unit: undefined,
    grain: GRAIN_LEVELS.STATIC,
    temporalType: "static",
    synonyms: {
      fr: ["statut", "etat", "statut de la commande", "statut du paiement", "etat du dossier"],
      en: ["status", "state", "order status", "payment status", "fulfillment status"],
      es: ["estado", "estatus", "estado del pedido"],
      pt: ["status", "estado", "situacao"],
      de: ["status", "zustand", "auftragsstatus"],
      it: ["stato", "stato dell'ordine"],
      nl: ["status", "toestand", "orderstatus"],
    },
    abbreviations: ["STAT", "STATUS"],
    allowedAggregations: [AGGREGATION_TYPES.COUNT_DISTINCT],
    entityBindings: [
      { entity: "Order", field: "payment_status" },
      { entity: "Customer", field: "customer_status" },
      { entity: "Campaign", field: "status" },
    ],
  },

  // ── GÉOGRAPHIE : PAYS ──
  "common.geography.country": {
    conceptId: "common.geography.country",
    canonicalName: "country",
    domain: "common",
    subdomain: "geography",
    nature: SEMANTIC_NATURES.GEOGRAPHIC_DIMENSION,
    businessRole: BUSINESS_ROLES.DIMENSION,
    physicalType: PHYSICAL_TYPES.STRING,
    logicalType: LOGICAL_TYPES.CATEGORY,
    unit: undefined,
    grain: GRAIN_LEVELS.STATIC,
    temporalType: "static",
    synonyms: {
      fr: ["pays", "nation", "territoire", "code pays"],
      en: ["country", "nation", "country code", "billing country", "shipping country"],
      es: ["pais", "nacion"],
      pt: ["pais", "nacao"],
      de: ["land", "staat", "landercode"],
      it: ["paese", "nazione", "stato"],
      nl: ["land", "landcode"],
    },
    allowedAggregations: [AGGREGATION_TYPES.COUNT_DISTINCT],
    entityBindings: [
      { entity: "Customer", field: "country", isDefault: true },
    ],
  },
};
