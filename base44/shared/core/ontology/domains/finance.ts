import type { CanonicalConcept } from "../types.ts";
import {
  PHYSICAL_TYPES,
  LOGICAL_TYPES,
  BUSINESS_ROLES,
  SEMANTIC_NATURES,
  GRAIN_LEVELS,
  AGGREGATION_TYPES,
} from "../types.ts";

export const FINANCE_CONCEPTS: Record<string, CanonicalConcept> = {
  // ── COÛT DES MARCHANDISES VENDUES (COGS) ──
  "finance.cogs.amount": {
    conceptId: "finance.cogs.amount",
    canonicalName: "cogs",
    domain: "finance",
    subdomain: "costs",
    nature: SEMANTIC_NATURES.FINANCIAL_MEASURE,
    businessRole: BUSINESS_ROLES.FLOW,
    physicalType: PHYSICAL_TYPES.DECIMAL,
    logicalType: LOGICAL_TYPES.CURRENCY,
    unit: "currency",
    grain: GRAIN_LEVELS.ORDER,
    temporalType: "flow",
    synonyms: {
      fr: [
        "cout des marchandises vendues", "cout des ventes", "cout d'achat des marchandises",
        "cout direct", "cout de revient", "cmv", "cogs", "cout marchandises"
      ],
      en: [
        "cost of goods sold", "cogs", "cost of sales", "direct cost", "product cost",
        "cogs amount", "cost of revenue"
      ],
      es: ["coste de las ventas", "coste de bienes vendidos", "costo de ventas"],
      pt: ["custo das mercadorias vendidas", "cmv", "custo das vendas"],
      de: ["herstellungskosten der zur erzelung der umsatzerlose erbrachten leistungen", "wareneinsatz", "herstellkosten"],
      it: ["costo del venduto", "costo dei beni venduti"],
      nl: ["kostprijs van de omzet", "inkoopwaarde van de omzet"],
    },
    abbreviations: ["COGS", "CMV", "COS"],
    negativeTerms: ["revenue", "ca", "profit", "benefice", "margin", "marge"],
    allowedAggregations: [AGGREGATION_TYPES.SUM, AGGREGATION_TYPES.AVG],
    entityBindings: [
      { entity: "Order", field: "cost", isDefault: true },
    ],
  },

  // ── DÉPENSES D'EXPLOITATION (OPEX) ──
  "finance.expense.operating": {
    conceptId: "finance.expense.operating",
    canonicalName: "operating_expense",
    domain: "finance",
    subdomain: "expenses",
    nature: SEMANTIC_NATURES.FINANCIAL_MEASURE,
    businessRole: BUSINESS_ROLES.FLOW,
    physicalType: PHYSICAL_TYPES.DECIMAL,
    logicalType: LOGICAL_TYPES.CURRENCY,
    unit: "currency",
    grain: GRAIN_LEVELS.TRANSACTION,
    temporalType: "flow",
    synonyms: {
      fr: [
        "depense", "depenses", "charges", "charges d'exploitation", "frais generaux",
        "couts operationnels", "depenses generales", "frais", "charges courantes", "montant depense"
      ],
      en: [
        "operating expense", "opex", "expenses", "operating cost", "overhead",
        "general and administrative", "expense amount", "expenditure"
      ],
      es: ["gastos de explotacion", "gastos operativos", "gastos generales"],
      pt: ["despesas operacionais", "gastos operacionais"],
      de: ["betriebsaufwand", "betriebskosten", "betriebliche aufwendungen"],
      it: ["spese operative", "costi operativi"],
      nl: ["bedrijfskosten", "operationele kosten"],
    },
    abbreviations: ["OPEX", "DEP", "EXP"],
    negativeTerms: ["revenue", "income", "profit", "margin", "gain"],
    allowedAggregations: [AGGREGATION_TYPES.SUM, AGGREGATION_TYPES.AVG],
    entityBindings: [
      { entity: "Expense", field: "amount", isDefault: true },
      { entity: "Transaction", field: "amount" },
    ],
  },

  // ── MARGE BRUTE EN MONTANT (GROSS PROFIT en $) ──
  "finance.profit.gross": {
    conceptId: "finance.profit.gross",
    canonicalName: "gross_profit",
    domain: "finance",
    subdomain: "profit",
    nature: SEMANTIC_NATURES.FINANCIAL_MEASURE,
    businessRole: BUSINESS_ROLES.RESULT,
    physicalType: PHYSICAL_TYPES.DECIMAL,
    logicalType: LOGICAL_TYPES.CURRENCY,
    unit: "currency",
    grain: GRAIN_LEVELS.ORDER,
    temporalType: "flow",
    synonyms: {
      fr: [
        "marge brute en valeur", "profit brut", "marge commerciale", "benefice brut",
        "marge brute montant", "marge brute absolue", "gain brut"
      ],
      en: [
        "gross profit", "gross income", "gross margin amount", "gross profit amount",
        "gross earnings", "trading profit"
      ],
      es: ["beneficio bruto", "margen bruto en valor", "utilidad bruta"],
      pt: ["lucro bruto", "margem bruta em valor"],
      de: ["bruttogewinn", "rohergebnis", "rohertrag"],
      it: ["utile lordo", "margine lordo valore"],
      nl: ["brutowinst", "brutomarge bedrag"],
    },
    abbreviations: ["MB", "GP"],
    derivedFormula: "revenue - cogs",
    requiredInputs: ["sales.revenue.net", "finance.cogs.amount"],
    negativeTerms: ["percent", "pourcent", "pct", "%", "taux", "rate", "ratio"],
    allowedAggregations: [AGGREGATION_TYPES.SUM, AGGREGATION_TYPES.AVG],
    entityBindings: [
      { entity: "Order", field: "gross_margin", isDefault: true },
    ],
  },

  // ── TAUX DE MARGE BRUTE (GROSS MARGIN en %) ──
  "finance.margin.gross_rate": {
    conceptId: "finance.margin.gross_rate",
    canonicalName: "gross_margin_rate",
    domain: "finance",
    subdomain: "margin",
    nature: SEMANTIC_NATURES.PERCENTAGE_MEASURE,
    businessRole: BUSINESS_ROLES.RATE,
    physicalType: PHYSICAL_TYPES.FLOAT,
    logicalType: LOGICAL_TYPES.PERCENTAGE,
    unit: "%",
    grain: GRAIN_LEVELS.ORDER,
    temporalType: "flow",
    synonyms: {
      fr: [
        "taux de marge brute", "pourcentage de marge brute", "marge brute pourcentage",
        "marge brute %", "taux de marge", "marge %", "pourcentage de marge"
      ],
      en: [
        "gross margin", "gross margin percentage", "gross margin rate", "gross margin %",
        "gm %", "gross profit margin"
      ],
      es: ["margen bruto porcentaje", "porcentaje margen bruto", "tasa de margen bruto"],
      pt: ["margem bruta percentual", "taxa de margem bruta"],
      de: ["bruttomarge", "rohertragsmarge", "bruttogewinnmarge in prozent"],
      it: ["margine lordo percentuale", "percentuale margine lordo"],
      nl: ["brutomarge percentage", "brutowinstmarge"],
    },
    abbreviations: ["GM%", "MB%", "MB RATE"],
    derivedFormula: "gross_profit / revenue",
    requiredInputs: ["finance.profit.gross", "sales.revenue.net"],
    negativeTerms: ["montant", "amount", "valeur", "dollars", "cad", "usd", "eur"],
    allowedAggregations: [AGGREGATION_TYPES.AVG],
    forbiddenOperations: ["SUM"],
    entityBindings: [],
  },

  // ── EBITDA / BAIIA ──
  "finance.profit.ebitda": {
    conceptId: "finance.profit.ebitda",
    canonicalName: "ebitda",
    domain: "finance",
    subdomain: "profit",
    nature: SEMANTIC_NATURES.FINANCIAL_MEASURE,
    businessRole: BUSINESS_ROLES.RESULT,
    physicalType: PHYSICAL_TYPES.DECIMAL,
    logicalType: LOGICAL_TYPES.CURRENCY,
    unit: "currency",
    grain: GRAIN_LEVELS.MONTH,
    temporalType: "flow",
    synonyms: {
      fr: [
        "ebitda", "baiia", "excedent brut d'exploitation", "ebe",
        "benefice avant interets impots et amortissements"
      ],
      en: [
        "ebitda", "earnings before interest taxes depreciation and amortization",
        "operating cash profit"
      ],
      es: ["ebitda", "resultado bruto de explotacion"],
      pt: ["ebitda", "lajida"],
      de: ["ebitda", "betriebsergebnis vor abschreibungen"],
      it: ["ebitda", "margine operativo lordo", "mol"],
      nl: ["ebitda"],
    },
    abbreviations: ["EBITDA", "BAIIA", "EBE", "MOL", "LAJIDA"],
    allowedAggregations: [AGGREGATION_TYPES.SUM, AGGREGATION_TYPES.AVG],
    entityBindings: [],
  },

  // ── RÉSULTAT NET / BÉNÉFICE NET ──
  "finance.profit.net": {
    conceptId: "finance.profit.net",
    canonicalName: "net_income",
    domain: "finance",
    subdomain: "profit",
    nature: SEMANTIC_NATURES.FINANCIAL_MEASURE,
    businessRole: BUSINESS_ROLES.RESULT,
    physicalType: PHYSICAL_TYPES.DECIMAL,
    logicalType: LOGICAL_TYPES.CURRENCY,
    unit: "currency",
    grain: GRAIN_LEVELS.MONTH,
    temporalType: "flow",
    synonyms: {
      fr: [
        "resultat net", "benefice net", "gain net", "perte nette", "rn",
        "resultat net de l'exercice", "profit net"
      ],
      en: [
        "net income", "net profit", "bottom line", "net earnings", "profit after tax",
        "net result"
      ],
      es: ["resultado neto", "beneficio neto", "utilidad neta"],
      pt: ["resultado liquido", "lucro liquido"],
      de: ["jahresuberschuss", "reingewinn", "nettoergebnis"],
      it: ["utile netto", "risultato netto"],
      nl: ["nettowinst", "nettoresultaat"],
    },
    abbreviations: ["RN", "NI", "NP"],
    allowedAggregations: [AGGREGATION_TYPES.SUM, AGGREGATION_TYPES.AVG],
    entityBindings: [],
  },
};
