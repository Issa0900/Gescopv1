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

export const INVENTORY_CONCEPTS: Record<string, CanonicalConcept> = {
  // ── NIVEAU DE STOCK ACTUEL ──
  "inventory.stock.level": {
    conceptId: "inventory.stock.level",
    canonicalName: "inventory_level",
    domain: "inventory",
    subdomain: "stock",
    nature: SEMANTIC_NATURES.QUANTITY_MEASURE,
    businessRole: BUSINESS_ROLES.STOCK,
    physicalType: PHYSICAL_TYPES.INTEGER,
    logicalType: LOGICAL_TYPES.QUANTITY,
    unit: "units",
    grain: GRAIN_LEVELS.PRODUCT,
    temporalType: "stock",
    synonyms: {
      fr: [
        "niveau de stock", "stock actuel", "quantite en stock", "stock disponible",
        "en stock", "unites en stock", "stock physique", "quantite disponible", "qte stock"
      ],
      en: [
        "inventory level", "stock level", "quantity on hand", "on hand", "qoh",
        "available stock", "current stock", "stock quantity", "units on hand"
      ],
      es: ["nivel de existencias", "stock disponible", "cantidad en mano"],
      pt: ["nivel de estoque", "estoque disponivel", "quantidade em maos"],
      de: ["lagerbestand", "vorrat", "vorratige menge", "verfugbarer bestand"],
      it: ["livello delle scorte", "giacenza di magazzino", "quantita disponibile"],
      nl: ["voorraadniveau", "beschikbare voorraad", "voorraadhoeveelheid"],
    },
    abbreviations: ["QOH", "STK", "STOCK"],
    allowedAggregations: [AGGREGATION_TYPES.LAST, AGGREGATION_TYPES.AVG],
    forbiddenOperations: ["SUM"],
    entityBindings: [
      { entity: "Product", field: "inventory_level", isDefault: true },
      { entity: "Inventory", field: "available_stock" },
    ],
  },

  // ── SEUIL DE RÉAPPROVISIONNEMENT ──
  "inventory.stock.reorder_point": {
    conceptId: "inventory.stock.reorder_point",
    canonicalName: "reorder_point",
    domain: "inventory",
    subdomain: "stock",
    nature: SEMANTIC_NATURES.QUANTITY_MEASURE,
    businessRole: BUSINESS_ROLES.STOCK,
    physicalType: PHYSICAL_TYPES.INTEGER,
    logicalType: LOGICAL_TYPES.QUANTITY,
    unit: "units",
    grain: GRAIN_LEVELS.PRODUCT,
    temporalType: "static",
    synonyms: {
      fr: [
        "seuil de reapprovisionnement", "point de commande", "seuil d'alerte stock",
        "seuil critique de stock", "seuil reappro", "stock minimal"
      ],
      en: [
        "reorder point", "reorder level", "minimum stock level", "rop",
        "order point", "restock trigger"
      ],
      es: ["punto de pedido", "nivel de reaprovisionamiento"],
      pt: ["ponto de encomenda", "nivel de ressuprimento"],
      de: ["meldebestand", "bestellpunkt", "nachbestellgrenze"],
      it: ["livello di riordino", "punto di riordino"],
      nl: ["bestelniveau", "herbevoorradingspunt"],
    },
    abbreviations: ["ROP"],
    allowedAggregations: [AGGREGATION_TYPES.LAST, AGGREGATION_TYPES.AVG],
    entityBindings: [
      { entity: "Product", field: "reorder_point", isDefault: true },
      { entity: "Inventory", field: "reorder_point" },
    ],
  },

  // ── JOURS D'INVENTAIRE / COUVERTURE DE STOCK (DIO) ──
  "inventory.metrics.dio": {
    conceptId: "inventory.metrics.dio",
    canonicalName: "days_in_inventory",
    domain: "inventory",
    subdomain: "metrics",
    nature: SEMANTIC_NATURES.DURATION_MEASURE,
    businessRole: BUSINESS_ROLES.RATIO,
    physicalType: PHYSICAL_TYPES.FLOAT,
    logicalType: LOGICAL_TYPES.DURATION,
    unit: "days",
    grain: GRAIN_LEVELS.PRODUCT,
    temporalType: "stock",
    synonyms: {
      fr: [
        "jours d'inventaire", "duree de rotation du stock", "couverture de stock",
        "rotation des stocks en jours", "jours de stock", "dio"
      ],
      en: [
        "days inventory outstanding", "dio", "days in inventory", "days sales of inventory",
        "dsi", "stock turnover days", "inventory coverage"
      ],
      es: ["dias de inventario", "periodo medio de maduracion del inventario"],
      pt: ["dias de estoque", "prazo medio de estocagem"],
      de: ["reichweite des lagers in tagen", "lagerdauer in tagen"],
      it: ["giorni di scorta", "tempo medio di giacenza"],
      nl: ["voorraaddagen", "omloopsnelheid voorraad in dagen"],
    },
    abbreviations: ["DIO", "DSI"],
    allowedAggregations: [AGGREGATION_TYPES.AVG],
    forbiddenOperations: ["SUM"],
    entityBindings: [
      { entity: "Inventory", field: "days_in_inventory", isDefault: true },
    ],
  },
};
