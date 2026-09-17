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

export const TREASURY_CONCEPTS: Record<string, CanonicalConcept> = {
  // ── SOLDE D'OUVERTURE DE TRÉSORERIE ──
  "treasury.cash.opening": {
    conceptId: "treasury.cash.opening",
    canonicalName: "opening_cash",
    domain: "treasury",
    subdomain: "cash",
    nature: SEMANTIC_NATURES.FINANCIAL_MEASURE,
    businessRole: BUSINESS_ROLES.STOCK,
    physicalType: PHYSICAL_TYPES.DECIMAL,
    logicalType: LOGICAL_TYPES.CURRENCY,
    unit: "currency",
    grain: GRAIN_LEVELS.DAY,
    temporalType: "stock",
    synonyms: {
      fr: [
        "solde initial", "tresorerie initiale", "solde d'ouverture", "encaisse d'ouverture",
        "tresorerie d'ouverture", "solde debut", "solde debut periode", "encaisse initiale",
        "disponibilites initiales", "caisse initiale"
      ],
      en: [
        "opening cash", "beginning cash", "starting cash", "initial cash", "cash at beginning",
        "opening cash balance", "beginning cash balance", "cash balance start"
      ],
      es: ["saldo inicial", "caja inicial", "tesoreria inicial"],
      pt: ["saldo inicial", "caixa inicial", "tesouraria inicial"],
      de: ["anfangsbestand kasse", "anfangsbestand liquide mittel", "anfangssaldo"],
      it: ["saldo iniziale", "cassa iniziale", "liquidita iniziali"],
      nl: ["beginsaldo", "aanvangssaldo", "begin liquide middelen"],
    },
    abbreviations: ["SOLDE INIT", "OPEN CASH"],
    negativeTerms: ["cloture", "closing", "fin", "end", "entree", "inflow", "sortie", "outflow"],
    allowedAggregations: [AGGREGATION_TYPES.FIRST],
    forbiddenOperations: ["SUM"],
    entityBindings: [
      { entity: "Cashflow", field: "opening_cash", isDefault: true },
    ],
  },

  // ── ENCAISSEMENTS / ENTRÉES DE TRÉSORERIE ──
  "treasury.cash.inflow": {
    conceptId: "treasury.cash.inflow",
    canonicalName: "cash_in",
    domain: "treasury",
    subdomain: "cash",
    nature: SEMANTIC_NATURES.FINANCIAL_MEASURE,
    businessRole: BUSINESS_ROLES.FLOW,
    physicalType: PHYSICAL_TYPES.DECIMAL,
    logicalType: LOGICAL_TYPES.CURRENCY,
    unit: "currency",
    grain: GRAIN_LEVELS.DAY,
    temporalType: "flow",
    synonyms: {
      fr: [
        "encaissements", "entrees de tresorerie", "entrees d'argent", "recettes encaissees",
        "flux entrants", "cash in", "total encaissements", "entrees", "reglements clients recus",
        "versements recus"
      ],
      en: [
        "cash in", "cash inflow", "cash inflows", "cash received", "receipts", "cash collections",
        "inflow", "cash deposits", "customer payments received"
      ],
      es: ["cobros", "entradas de caja", "flujo entrante", "ingresos de efectivo"],
      pt: ["entradas de caixa", "recebimentos", "fluxo de entrada"],
      de: ["einzahlungen", "zahlungseingange", "mittelzufluss", "cash in"],
      it: ["incassi", "entrate di cassa", "flussi in entrata"],
      nl: ["ontvangsten", "kasontvangsten", "instroom liquide middelen"],
    },
    abbreviations: ["CASH IN", "ENCAISS"],
    negativeTerms: ["decaissements", "outflow", "sorties", "solde", "balance", "cloture", "closing"],
    allowedAggregations: [AGGREGATION_TYPES.SUM, AGGREGATION_TYPES.AVG],
    entityBindings: [
      { entity: "Cashflow", field: "cash_in", isDefault: true },
      { entity: "Transaction", field: "amount" },
    ],
  },

  // ── DÉCAISSEMENTS / SORTIES DE TRÉSORERIE ──
  "treasury.cash.outflow": {
    conceptId: "treasury.cash.outflow",
    canonicalName: "cash_out",
    domain: "treasury",
    subdomain: "cash",
    nature: SEMANTIC_NATURES.FINANCIAL_MEASURE,
    businessRole: BUSINESS_ROLES.FLOW,
    physicalType: PHYSICAL_TYPES.DECIMAL,
    logicalType: LOGICAL_TYPES.CURRENCY,
    unit: "currency",
    grain: GRAIN_LEVELS.DAY,
    temporalType: "flow",
    synonyms: {
      fr: [
        "decaissements", "sorties de tresorerie", "sorties d'argent", "depenses payees",
        "flux sortants", "cash out", "total decaissements", "sorties", "reglements fournisseurs payes",
        "paiements effectues"
      ],
      en: [
        "cash out", "cash outflow", "cash outflows", "cash paid", "disbursements", "payments made",
        "outflow", "cash withdrawals"
      ],
      es: ["pagos", "salidas de caja", "flujo saliente", "desembolsos"],
      pt: ["saidas de caixa", "pagamentos", "fluxo de saida"],
      de: ["auszahlungen", "zahlungsausgange", "mittelabfluss", "cash out"],
      it: ["esborsi", "uscite di cassa", "flussi in uscita"],
      nl: ["uitgaven", "kasuitgaven", "uitstroom liquide middelen"],
    },
    abbreviations: ["CASH OUT", "DECAISS"],
    negativeTerms: ["encaissements", "inflow", "entrees", "solde", "balance", "ouverture", "opening"],
    allowedAggregations: [AGGREGATION_TYPES.SUM, AGGREGATION_TYPES.AVG],
    entityBindings: [
      { entity: "Cashflow", field: "cash_out", isDefault: true },
      { entity: "Transaction", field: "amount" },
    ],
  },

  // ── SOLDE DE CLÔTURE DE TRÉSORERIE ──
  "treasury.cash.closing": {
    conceptId: "treasury.cash.closing",
    canonicalName: "closing_cash",
    domain: "treasury",
    subdomain: "cash",
    nature: SEMANTIC_NATURES.FINANCIAL_MEASURE,
    businessRole: BUSINESS_ROLES.STOCK,
    physicalType: PHYSICAL_TYPES.DECIMAL,
    logicalType: LOGICAL_TYPES.CURRENCY,
    unit: "currency",
    grain: GRAIN_LEVELS.DAY,
    temporalType: "stock",
    synonyms: {
      fr: [
        "solde de cloture", "solde final", "tresorerie finale", "tresorerie de cloture",
        "encaisse finale", "solde fin", "solde fin periode", "solde banque", "solde disponible",
        "tresorerie disponible", "solde cloture", "caisse finale", "position de tresorerie"
      ],
      en: [
        "closing cash", "ending cash", "cash balance", "closing balance", "ending balance",
        "cash position", "cash on hand", "ending cash balance", "final cash balance"
      ],
      es: ["saldo final", "caja final", "tesoreria final", "saldo de cierre"],
      pt: ["saldo final", "caixa final", "saldo de fecho"],
      de: ["endbestand kasse", "schlussbestand liquide mittel", "endsaldo", "kassenbestand"],
      it: ["saldo finale", "cassa finale", "saldo di chiusura"],
      nl: ["eindsaldo", "slotsaldo", "eindstand liquide middelen"],
    },
    abbreviations: ["SOLDE CLOT", "CASH POS", "END CASH"],
    derivedFormula: "opening_cash + cash_in - cash_out",
    negativeTerms: ["ouverture", "opening", "debut", "start", "entree", "sortie"],
    allowedAggregations: [AGGREGATION_TYPES.LAST],
    forbiddenOperations: ["SUM"],
    entityBindings: [
      { entity: "Cashflow", field: "closing_cash", isDefault: true },
    ],
  },

  // ── FLUX NET DE TRÉSORERIE ──
  "treasury.cash.net_flow": {
    conceptId: "treasury.cash.net_flow",
    canonicalName: "net_cash_flow",
    domain: "treasury",
    subdomain: "cash",
    nature: SEMANTIC_NATURES.FINANCIAL_MEASURE,
    businessRole: BUSINESS_ROLES.FLOW,
    physicalType: PHYSICAL_TYPES.DECIMAL,
    logicalType: LOGICAL_TYPES.CURRENCY,
    unit: "currency",
    grain: GRAIN_LEVELS.DAY,
    temporalType: "flow",
    synonyms: {
      fr: ["flux net de tresorerie", "variation de tresorerie", "cash flow net", "flux net"],
      en: ["net cash flow", "cash flow", "change in cash", "net cash change"],
      es: ["flujo de caja neto", "variacion de tesoreria"],
      pt: ["fluxo de caixa liquido", "variacao de caixa"],
      de: ["netto-cashflow", "veranderung der liquiden mittel"],
      it: ["flusso di cassa netto", "variazione di liquidita"],
      nl: ["netto kasstroom", "verandering in kasmiddelen"],
    },
    abbreviations: ["NCF", "CASHFLOW"],
    derivedFormula: "cash_in - cash_out",
    allowedAggregations: [AGGREGATION_TYPES.SUM, AGGREGATION_TYPES.AVG],
    entityBindings: [
      { entity: "Cashflow", field: "net_cash_flow", isDefault: true },
    ],
  },

  // ── CRÉANCES CLIENTS (ACCOUNTS RECEIVABLE / AR) ──
  "treasury.working_capital.receivables": {
    conceptId: "treasury.working_capital.receivables",
    canonicalName: "accounts_receivable",
    domain: "treasury",
    subdomain: "working_capital",
    nature: SEMANTIC_NATURES.FINANCIAL_MEASURE,
    businessRole: BUSINESS_ROLES.BALANCE,
    physicalType: PHYSICAL_TYPES.DECIMAL,
    logicalType: LOGICAL_TYPES.CURRENCY,
    unit: "currency",
    grain: GRAIN_LEVELS.DAY,
    temporalType: "stock",
    synonyms: {
      fr: [
        "creances clients", "comptes clients", "creances a recevoir", "factures a recevoir",
        "en-cours client", "clients a encaisser", "creances d'exploitation"
      ],
      en: [
        "accounts receivable", "ar", "trade receivables", "receivables", "debtors",
        "customer balance", "unpaid customer invoices"
      ],
      es: ["cuentas por cobrar", "deudores comerciales", "creditos comerciales"],
      pt: ["contas a receber", "clientes a receber"],
      de: ["forderungen aus lieferungen und leistungen", "debitoren", "kundenforderungen"],
      it: ["crediti verso clienti", "crediti commerciali"],
      nl: ["debiteuren", "vorderingen op klanten"],
    },
    abbreviations: ["AR", "CREANCES", "DEB"],
    relatedTerms: ["invoice", "customer", "payment", "due_date", "balance", "dso"],
    negativeTerms: ["fournisseur", "supplier", "payable", "ap", "augmented reality"],
    allowedAggregations: [AGGREGATION_TYPES.LAST, AGGREGATION_TYPES.AVG],
    forbiddenOperations: ["SUM"],
    entityBindings: [
      { entity: "Cashflow", field: "accounts_receivable", isDefault: true },
    ],
  },

  // ── DETTES FOURNISSEURS (ACCOUNTS PAYABLE / AP) ──
  "treasury.working_capital.payables": {
    conceptId: "treasury.working_capital.payables",
    canonicalName: "accounts_payable",
    domain: "treasury",
    subdomain: "working_capital",
    nature: SEMANTIC_NATURES.FINANCIAL_MEASURE,
    businessRole: BUSINESS_ROLES.BALANCE,
    physicalType: PHYSICAL_TYPES.DECIMAL,
    logicalType: LOGICAL_TYPES.CURRENCY,
    unit: "currency",
    grain: GRAIN_LEVELS.DAY,
    temporalType: "stock",
    synonyms: {
      fr: [
        "dettes fournisseurs", "comptes fournisseurs", "dettes a payer", "factures a payer",
        "en-cours fournisseur", "fournisseurs a payer", "dettes d'exploitation"
      ],
      en: [
        "accounts payable", "ap", "trade payables", "payables", "creditors",
        "supplier balance", "unpaid supplier invoices"
      ],
      es: ["cuentas por pagar", "acreedores comerciales", "deudas con proveedores"],
      pt: ["contas a pagar", "fornecedores a pagar"],
      de: ["verbindlichkeiten aus lieferungen und leistungen", "kreditoren", "lieferantenverbindlichkeiten"],
      it: ["debiti verso fornitori", "debiti commerciali"],
      nl: ["crediteuren", "schulden aan leveranciers"],
    },
    abbreviations: ["AP", "DETTES", "KRED"],
    relatedTerms: ["supplier", "vendor", "purchase", "dpo", "invoice"],
    negativeTerms: ["client", "customer", "receivable", "ar"],
    allowedAggregations: [AGGREGATION_TYPES.LAST, AGGREGATION_TYPES.AVG],
    forbiddenOperations: ["SUM"],
    entityBindings: [
      { entity: "Cashflow", field: "accounts_payable", isDefault: true },
    ],
  },
};
