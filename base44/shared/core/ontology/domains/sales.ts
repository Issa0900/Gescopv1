import type { CanonicalConcept } from "../types.ts";
import {
  PHYSICAL_TYPES,
  LOGICAL_TYPES,
  BUSINESS_ROLES,
  SEMANTIC_NATURES,
  GRAIN_LEVELS,
  AGGREGATION_TYPES,
} from "../types.ts";

export const SALES_CONCEPTS: Record<string, CanonicalConcept> = {
  // ── REVENU NET (CA NET) ──
  "sales.revenue.net": {
    conceptId: "sales.revenue.net",
    canonicalName: "net_revenue",
    domain: "sales",
    subdomain: "revenue",
    nature: SEMANTIC_NATURES.FINANCIAL_MEASURE,
    businessRole: BUSINESS_ROLES.FLOW,
    physicalType: PHYSICAL_TYPES.DECIMAL,
    logicalType: LOGICAL_TYPES.CURRENCY,
    unit: "currency",
    grain: GRAIN_LEVELS.ORDER,
    temporalType: "flow",
    synonyms: {
      fr: [
        "chiffre d'affaires net", "chiffre affaires net", "ca net", "ca net ht", "revenu net",
        "ventes nettes", "chiffre d'affaires ht", "ca ht", "total net", "montant net des ventes",
        "produits des ventes", "recettes nettes", "montant ht", "chiffre daffaires", "ca",
        "ca total", "total ca", "chiffre d'affaires", "chiffre affaires", "chiffre d affaires",
        "revenu", "revenus", "ventes", "total ventes", "montant des ventes"
      ],
      en: [
        "net revenue", "net sales", "net turnover", "sales net", "turnover net", "revenue net",
        "net sales amount", "sales revenue net", "net billings", "net sales revenue",
        "revenue", "revenues", "sales", "turnover", "total sales", "sales total", "sales revenue"
      ],
      es: ["ingresos netos", "ventas netas", "facturacion neta", "ingresos", "ventas"],
      pt: ["receita liquida", "vendas liquidas", "faturamento liquido", "receita", "vendas"],
      de: ["nettoumsatz", "nettoerlos", "nettoumsatzerlose", "umsatz netto", "umsatz", "erlose"],
      it: ["ricavi netti", "fatturato netto", "vendite nette", "ricavi", "fatturato", "vendite"],
      nl: ["netto omzet", "netto-omzet", "netto opbrengst", "omzet", "opbrengst"],
    },
    abbreviations: ["CA", "CA NET", "CA HT", "REV NET"],
    acronyms: ["REV"],
    erpVariants: ["NET_SALES_AMT", "NET_REV", "AMOUNT_NET", "NETWR"],
    commonTypos: ["chiffre daffaires", "chifre daffaires", "revenu_net", "revnue net", "net_saless"],
    negativeTerms: ["brut", "gross", "ttc", "tax", "tva", "quantite", "quantity", "volume", "marge", "margin"],
    allowedAggregations: [AGGREGATION_TYPES.SUM, AGGREGATION_TYPES.AVG],
    forbiddenOperations: [],
    entityBindings: [
      { entity: "Order", field: "total", isDefault: true },
      { entity: "Transaction", field: "amount" },
      { entity: "Campaign", field: "revenue" },
    ],
  },

  // ── REVENU BRUT (CA BRUT / TTC) ──
  "sales.revenue.gross": {
    conceptId: "sales.revenue.gross",
    canonicalName: "gross_revenue",
    domain: "sales",
    subdomain: "revenue",
    nature: SEMANTIC_NATURES.FINANCIAL_MEASURE,
    businessRole: BUSINESS_ROLES.FLOW,
    physicalType: PHYSICAL_TYPES.DECIMAL,
    logicalType: LOGICAL_TYPES.CURRENCY,
    unit: "currency",
    grain: GRAIN_LEVELS.ORDER,
    temporalType: "flow",
    synonyms: {
      fr: [
        "chiffre d'affaires brut", "ca brut", "ventes brutes", "chiffre affaires brut",
        "ca ttc", "montant ttc", "total ttc", "recettes brutes", "facturation brute"
      ],
      en: ["gross revenue", "gross sales", "gross turnover", "total sales gross", "gross billings"],
      es: ["ingresos brutos", "ventas brutas", "facturacion bruta"],
      pt: ["receita bruta", "vendas brutas", "faturamento bruto"],
      de: ["bruttoumsatz", "bruttoerlos", "umsatz brutto"],
      it: ["ricavi lordi", "fatturato lordo", "vendite lorde"],
      nl: ["bruto omzet", "bruto-omzet"],
    },
    abbreviations: ["CA BRUT", "CA TTC"],
    erpVariants: ["GROSS_SALES", "BRUTTO_REV", "BRT_SALES"],
    negativeTerms: ["net", "ht", "marge", "margin", "cout", "cost"],
    allowedAggregations: [AGGREGATION_TYPES.SUM, AGGREGATION_TYPES.AVG],
    entityBindings: [
      { entity: "Order", field: "subtotal" },
      { entity: "Transaction", field: "amount" },
    ],
  },

  // ── QUANTITÉ VENDUE ──
  "sales.volume.quantity": {
    conceptId: "sales.volume.quantity",
    canonicalName: "sales_quantity",
    domain: "sales",
    subdomain: "volume",
    nature: SEMANTIC_NATURES.QUANTITY_MEASURE,
    businessRole: BUSINESS_ROLES.QUANTITY,
    physicalType: PHYSICAL_TYPES.INTEGER,
    logicalType: LOGICAL_TYPES.QUANTITY,
    unit: "units",
    grain: GRAIN_LEVELS.ORDER_LINE,
    temporalType: "flow",
    synonyms: {
      fr: [
        "quantite", "quantite vendue", "qte vendue", "nombre d'unites vendues",
        "unites vendues", "volume des ventes", "pieces vendues", "nombre d'articles vendus",
        "qte commande", "quantite commandee", "qte", "volume vendus"
      ],
      en: [
        "quantity", "qty", "sales quantity", "units sold", "quantity sold", "items sold",
        "ordered quantity", "order quantity", "sales volume", "pieces sold", "unit count"
      ],
      es: ["cantidad", "unidades vendidas", "cantidad vendida", "volumen de ventas"],
      pt: ["quantidade", "unidades vendidas", "volume de vendas"],
      de: ["menge", "abgesetzte menge", "verkaufsmenge", "stuckzahl"],
      it: ["quantita", "unita vendute", "volume vendite"],
      nl: ["aantal", "verkochte eenheden", "afzet"],
    },
    abbreviations: ["QTY", "QTE", "PCS", "VOL"],
    erpVariants: ["QUANTITY", "FKIMG", "MENGE", "QTY_ORDERED"],
    commonTypos: ["quantité", "quantitey", "quatite", "qunatity", "unites_vendue"],
    negativeTerms: ["price", "prix", "revenue", "ca", "cost", "cout", "amount", "montant"],
    allowedAggregations: [AGGREGATION_TYPES.SUM, AGGREGATION_TYPES.AVG, AGGREGATION_TYPES.MAX, AGGREGATION_TYPES.MIN],
    entityBindings: [
      { entity: "Order", field: "quantity", isDefault: true },
      { entity: "Product", field: "monthly_sales" },
    ],
  },

  // ── PRIX UNITAIRE ──
  "sales.pricing.unit_price": {
    conceptId: "sales.pricing.unit_price",
    canonicalName: "unit_price",
    domain: "sales",
    subdomain: "pricing",
    nature: SEMANTIC_NATURES.FINANCIAL_MEASURE,
    businessRole: BUSINESS_ROLES.RATE,
    physicalType: PHYSICAL_TYPES.DECIMAL,
    logicalType: LOGICAL_TYPES.CURRENCY,
    unit: "currency",
    grain: GRAIN_LEVELS.ORDER_LINE,
    temporalType: "static",
    synonyms: {
      fr: [
        "prix unitaire", "prix unitaire ht", "prix de vente", "prix unitaire de vente",
        "prix unitaire ttc", "tarif unitaire", "pu ht", "pu", "prix article"
      ],
      en: [
        "unit price", "selling price", "sale price", "retail price", "list price",
        "unit sales price", "base price", "price per unit", "average selling price", "asp"
      ],
      es: ["precio unitario", "precio de venta", "tarifa"],
      pt: ["preco unitario", "preco de venda"],
      de: ["einzelpreis", "stuckpreis", "verkaufspreis"],
      it: ["prezzo unitario", "prezzo di vendita"],
      nl: ["eenheidsprijs", "verkoopprijs"],
    },
    abbreviations: ["PU", "PU HT", "PU TTC", "ASP"],
    erpVariants: ["UNIT_PRICE", "NETPR", "PREIS", "SALES_PRICE"],
    negativeTerms: ["total", "subtotal", "cost", "cout", "remise", "discount", "qty"],
    allowedAggregations: [AGGREGATION_TYPES.AVG, AGGREGATION_TYPES.MIN, AGGREGATION_TYPES.MAX],
    forbiddenOperations: ["SUM"],
    entityBindings: [
      { entity: "Order", field: "unit_price", isDefault: true },
      { entity: "Product", field: "selling_price" },
    ],
  },

  // ── PANIER MOYEN (AOV / ATV) ──
  "sales.order.aov": {
    conceptId: "sales.order.aov",
    canonicalName: "average_order_value",
    domain: "sales",
    subdomain: "order",
    nature: SEMANTIC_NATURES.RATIO_MEASURE,
    businessRole: BUSINESS_ROLES.RATIO,
    physicalType: PHYSICAL_TYPES.DECIMAL,
    logicalType: LOGICAL_TYPES.CURRENCY,
    unit: "currency",
    grain: GRAIN_LEVELS.CUSTOMER,
    temporalType: "flow",
    synonyms: {
      fr: [
        "panier moyen", "valeur moyenne du panier", "panier moyen d'achat", "ticket moyen",
        "valeur moyenne des commandes", "commande moyenne"
      ],
      en: [
        "average order value", "average basket size", "average ticket", "average transaction value",
        "aov", "atv", "avg order value", "mean order value"
      ],
      es: ["cesta media", "ticket medio", "valor medio del pedido"],
      pt: ["ticket medio", "valor medio do pedido"],
      de: ["durchschnittlicher warenkorb", "durchschnittlicher bestellwert"],
      it: ["scontrino medio", "valore medio dell'ordine"],
      nl: ["gemiddelde orderwaarde", "gemiddeld winkelmandje"],
    },
    abbreviations: ["AOV", "ATV"],
    derivedFormula: "revenue / total_orders",
    requiredInputs: ["sales.revenue.net", "sales.order.count"],
    allowedAggregations: [AGGREGATION_TYPES.AVG],
    forbiddenOperations: ["SUM"],
    entityBindings: [
      { entity: "Customer", field: "average_order_value", isDefault: true },
    ],
  },

  // ── REMISE / RABAIS ──
  "sales.revenue.discount": {
    conceptId: "sales.revenue.discount",
    canonicalName: "discount",
    domain: "sales",
    subdomain: "revenue",
    nature: SEMANTIC_NATURES.FINANCIAL_MEASURE,
    businessRole: BUSINESS_ROLES.FLOW,
    physicalType: PHYSICAL_TYPES.DECIMAL,
    logicalType: LOGICAL_TYPES.CURRENCY,
    unit: "currency",
    grain: GRAIN_LEVELS.ORDER,
    temporalType: "flow",
    synonyms: {
      fr: ["remise", "rabais", "ristourne", "reduction", "escompte", "montant remise", "remises accordees"],
      en: ["discount", "rebate", "discount amount", "allowance", "price reduction"],
      es: ["descuento", "rebaja", "reduccion"],
      pt: ["desconto", "abatimento"],
      de: ["rabatt", "skonto", "preisnachlass"],
      it: ["sconto", "abbuono"],
      nl: ["korting", "prijskorting"],
    },
    abbreviations: ["DISC", "REM"],
    allowedAggregations: [AGGREGATION_TYPES.SUM, AGGREGATION_TYPES.AVG],
    entityBindings: [
      { entity: "Order", field: "discount", isDefault: true },
    ],
  },

  // ── TAXE DE VENTE / TVA ──
  "sales.revenue.tax": {
    conceptId: "sales.revenue.tax",
    canonicalName: "sales_tax",
    domain: "sales",
    subdomain: "revenue",
    nature: SEMANTIC_NATURES.FINANCIAL_MEASURE,
    businessRole: BUSINESS_ROLES.FLOW,
    physicalType: PHYSICAL_TYPES.DECIMAL,
    logicalType: LOGICAL_TYPES.CURRENCY,
    unit: "currency",
    grain: GRAIN_LEVELS.ORDER,
    temporalType: "flow",
    synonyms: {
      fr: ["taxe", "tva", "taxe sur la valeur ajoutee", "tps", "tvq", "montant tva", "taxes de vente"],
      en: ["tax", "sales tax", "vat", "value added tax", "gst", "hst", "pst", "tax amount"],
      es: ["iva", "impuesto", "impuestos sobre ventas"],
      pt: ["imposto", "iva", "icms"],
      de: ["mehrwertsteuer", "mwst", "umsatzsteuer", "ust"],
      it: ["iva", "imposta sul valore aggiunto"],
      nl: ["btw", "omzetbelasting"],
    },
    abbreviations: ["TVA", "VAT", "TPS", "TVQ", "GST", "MWST", "BTW"],
    allowedAggregations: [AGGREGATION_TYPES.SUM, AGGREGATION_TYPES.AVG],
    entityBindings: [
      { entity: "Order", field: "tax", isDefault: true },
    ],
  },
};
