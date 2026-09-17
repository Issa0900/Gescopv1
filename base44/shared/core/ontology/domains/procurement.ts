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

export const PROCUREMENT_CONCEPTS: Record<string, CanonicalConcept> = {
  // ── IDENTIFIANT FOURNISSEUR ──
  "procurement.supplier.id": {
    conceptId: "procurement.supplier.id",
    canonicalName: "supplier_id",
    domain: "procurement",
    subdomain: "supplier",
    nature: SEMANTIC_NATURES.IDENTIFIER,
    businessRole: BUSINESS_ROLES.IDENTIFIER,
    physicalType: PHYSICAL_TYPES.STRING,
    logicalType: LOGICAL_TYPES.IDENTIFIER,
    unit: undefined,
    grain: GRAIN_LEVELS.SUPPLIER,
    temporalType: "static",
    synonyms: {
      fr: [
        "id fournisseur", "id_fournisseur", "code fournisseur", "code_fournisseur",
        "numero fournisseur", "identifiant fournisseur"
      ],
      en: [
        "supplier id", "supplier_id", "vendor id", "vendor_id", "supplier code",
        "vendor code", "creditor id", "supplier number"
      ],
      es: ["id proveedor", "codigo de proveedor", "numero de proveedor"],
      pt: ["id fornecedor", "codigo do fornecedor"],
      de: ["lieferantennummer", "lieferanten-id", "kreditor-id"],
      it: ["id fornitore", "codice fornitore"],
      nl: ["leveranciersnummer", "leverancier id"],
    },
    abbreviations: ["SUPP_ID", "VEND_ID"],
    allowedAggregations: [AGGREGATION_TYPES.COUNT_DISTINCT],
    forbiddenOperations: ["SUM", "AVG"],
    entityBindings: [
      { entity: "Supplier", field: "supplier_id", isDefault: true },
      { entity: "Purchase", field: "supplier_id" },
      { entity: "Expense", field: "supplier" },
    ],
  },

  // ── BON DE COMMANDE ACHAT (PO) ──
  "procurement.purchase.order_id": {
    conceptId: "procurement.purchase.order_id",
    canonicalName: "purchase_order_id",
    domain: "procurement",
    subdomain: "purchase",
    nature: SEMANTIC_NATURES.IDENTIFIER,
    businessRole: BUSINESS_ROLES.IDENTIFIER,
    physicalType: PHYSICAL_TYPES.STRING,
    logicalType: LOGICAL_TYPES.IDENTIFIER,
    unit: undefined,
    grain: GRAIN_LEVELS.ORDER,
    temporalType: "static",
    synonyms: {
      fr: [
        "bon de commande", "numero bon de commande", "commande achat", "id commande achat",
        "no commande achat", "bon commande"
      ],
      en: [
        "purchase order", "po number", "po", "purchase order id", "po id", "order po"
      ],
      es: ["orden de compra", "pedido de compra"],
      pt: ["ordem de compra", "pedido de compra"],
      de: ["bestellnummer einkauf", "einkaufsbestellung"],
      it: ["ordine di acquisto"],
      nl: ["inkooporder", "inkoopordernummer"],
    },
    abbreviations: ["PO", "BC"],
    allowedAggregations: [AGGREGATION_TYPES.COUNT_DISTINCT],
    forbiddenOperations: ["SUM", "AVG"],
    entityBindings: [
      { entity: "Purchase", field: "purchase_id", isDefault: true },
    ],
  },
};
