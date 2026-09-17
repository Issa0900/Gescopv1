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

export const PRODUCT_CONCEPTS: Record<string, CanonicalConcept> = {
  // ── IDENTIFIANT PRODUIT / SKU ──
  "products.identity.id": {
    conceptId: "products.identity.id",
    canonicalName: "product_id",
    domain: "products",
    subdomain: "identity",
    nature: SEMANTIC_NATURES.IDENTIFIER,
    businessRole: BUSINESS_ROLES.IDENTIFIER,
    physicalType: PHYSICAL_TYPES.STRING,
    logicalType: LOGICAL_TYPES.IDENTIFIER,
    unit: undefined,
    grain: GRAIN_LEVELS.PRODUCT,
    temporalType: "static",
    synonyms: {
      fr: [
        "id produit", "id_produit", "code produit", "reference produit", "ref produit",
        "code article", "numero article", "sku", "code barre", "ean"
      ],
      en: [
        "product id", "product_id", "item id", "sku", "stock keeping unit",
        "product code", "item code", "part number", "upc", "ean", "article number"
      ],
      es: ["id producto", "codigo de producto", "referencia", "sku"],
      pt: ["id produto", "codigo do produto", "sku"],
      de: ["produkt-id", "artikelnummer", "warennummer", "sku", "ean"],
      it: ["id prodotto", "codice articolo", "codice prodotto", "sku"],
      nl: ["product id", "artikelnummer", "productcode", "sku"],
    },
    abbreviations: ["SKU", "EAN", "UPC", "REF", "ART_ID"],
    allowedAggregations: [AGGREGATION_TYPES.COUNT_DISTINCT],
    forbiddenOperations: ["SUM", "AVG"],
    entityBindings: [
      { entity: "Product", field: "product_id", isDefault: true },
      { entity: "Order", field: "product_id" },
      { entity: "Inventory", field: "product_id" },
    ],
  },

  // ── NOM DU PRODUIT ──
  "products.identity.name": {
    conceptId: "products.identity.name",
    canonicalName: "product_name",
    domain: "products",
    subdomain: "identity",
    nature: SEMANTIC_NATURES.CATEGORICAL_DIMENSION,
    businessRole: BUSINESS_ROLES.DIMENSION,
    physicalType: PHYSICAL_TYPES.STRING,
    logicalType: LOGICAL_TYPES.TEXT,
    unit: undefined,
    grain: GRAIN_LEVELS.PRODUCT,
    temporalType: "static",
    synonyms: {
      fr: [
        "nom du produit", "designation", "libelle article", "libelle produit",
        "nom article", "description article", "designation produit"
      ],
      en: [
        "product name", "item name", "product title", "item description",
        "product description", "title", "designation"
      ],
      es: ["nombre del producto", "descripcion del producto"],
      pt: ["nome do produto", "descricao do produto"],
      de: ["produktname", "artikelbezeichnung", "produktbezeichnung"],
      it: ["nome prodotto", "descrizione articolo"],
      nl: ["productnaam", "artikelomschrijving"],
    },
    allowedAggregations: [AGGREGATION_TYPES.NONE],
    entityBindings: [
      { entity: "Product", field: "name", isDefault: true },
    ],
  },

  // ── CATÉGORIE DU PRODUIT ──
  "products.classification.category": {
    conceptId: "products.classification.category",
    canonicalName: "product_category",
    domain: "products",
    subdomain: "classification",
    nature: SEMANTIC_NATURES.CATEGORICAL_DIMENSION,
    businessRole: BUSINESS_ROLES.DIMENSION,
    physicalType: PHYSICAL_TYPES.STRING,
    logicalType: LOGICAL_TYPES.CATEGORY,
    unit: undefined,
    grain: GRAIN_LEVELS.PRODUCT,
    temporalType: "static",
    synonyms: {
      fr: [
        "categorie de produit", "rayon", "famille article", "famille de produits",
        "groupe de marchandises", "type de produit", "sous-categorie"
      ],
      en: [
        "product category", "category", "item category", "department",
        "product line", "product family", "merchandise group"
      ],
      es: ["categoria de producto", "familia de articulos"],
      pt: ["categoria de produto", "familia de produtos"],
      de: ["warengruppe", "produktkategorie", "artikelfamilie"],
      it: ["categoria prodotto", "gruppo merceologico"],
      nl: ["productcategorie", "artikelgroep"],
    },
    abbreviations: ["CAT"],
    allowedAggregations: [AGGREGATION_TYPES.COUNT_DISTINCT],
    entityBindings: [
      { entity: "Product", field: "category", isDefault: true },
    ],
  },
};
