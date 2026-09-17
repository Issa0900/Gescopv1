import type { CanonicalConcept } from "../types.ts";
import {
  PHYSICAL_TYPES,
  LOGICAL_TYPES,
  BUSINESS_ROLES,
  SEMANTIC_NATURES,
  GRAIN_LEVELS,
  AGGREGATION_TYPES,
} from "../types.ts";

export const ACCOUNTING_CONCEPTS: Record<string, CanonicalConcept> = {
  // ── DÉBIT COMPTABLE ──
  "accounting.entry.debit": {
    conceptId: "accounting.entry.debit",
    canonicalName: "debit_amount",
    domain: "accounting",
    subdomain: "ledger",
    nature: SEMANTIC_NATURES.FINANCIAL_MEASURE,
    businessRole: BUSINESS_ROLES.FLOW,
    physicalType: PHYSICAL_TYPES.DECIMAL,
    logicalType: LOGICAL_TYPES.CURRENCY,
    unit: "currency",
    grain: GRAIN_LEVELS.TRANSACTION,
    temporalType: "flow",
    synonyms: {
      fr: ["debit", "montant debit", "somme debitee", "debits"],
      en: ["debit", "debit amount", "dr", "debits", "dr amount"],
      es: ["debito", "debe", "cargo"],
      pt: ["debito", "debitos"],
      de: ["soll", "sollbetrag", "belastung"],
      it: ["dare", "importo dare", "addebito"],
      nl: ["debet", "debetbedrag"],
    },
    abbreviations: ["DR", "DEB"],
    allowedAggregations: [AGGREGATION_TYPES.SUM, AGGREGATION_TYPES.AVG],
    entityBindings: [
      { entity: "Transaction", field: "amount" },
    ],
  },

  // ── CRÉDIT COMPTABLE ──
  "accounting.entry.credit": {
    conceptId: "accounting.entry.credit",
    canonicalName: "credit_amount",
    domain: "accounting",
    subdomain: "ledger",
    nature: SEMANTIC_NATURES.FINANCIAL_MEASURE,
    businessRole: BUSINESS_ROLES.FLOW,
    physicalType: PHYSICAL_TYPES.DECIMAL,
    logicalType: LOGICAL_TYPES.CURRENCY,
    unit: "currency",
    grain: GRAIN_LEVELS.TRANSACTION,
    temporalType: "flow",
    synonyms: {
      fr: ["credit", "montant credit", "somme creditee", "credits"],
      en: ["credit", "credit amount", "cr", "credits", "cr amount"],
      es: ["credito", "haber", "abono"],
      pt: ["credito", "creditos"],
      de: ["haben", "habenbetrag", "gutschrift"],
      it: ["avere", "importo avere", "accredito"],
      nl: ["credit", "creditbedrag"],
    },
    abbreviations: ["CR", "CRED"],
    allowedAggregations: [AGGREGATION_TYPES.SUM, AGGREGATION_TYPES.AVG],
    entityBindings: [
      { entity: "Transaction", field: "amount" },
    ],
  },

  // ── COMPTE COMPTABLE / CODE COMPTABLE ──
  "accounting.account.code": {
    conceptId: "accounting.account.code",
    canonicalName: "account_code",
    domain: "accounting",
    subdomain: "chart_of_accounts",
    nature: SEMANTIC_NATURES.IDENTIFIER,
    businessRole: BUSINESS_ROLES.IDENTIFIER,
    physicalType: PHYSICAL_TYPES.STRING,
    logicalType: LOGICAL_TYPES.IDENTIFIER,
    unit: undefined,
    grain: GRAIN_LEVELS.TRANSACTION,
    temporalType: "static",
    synonyms: {
      fr: [
        "compte comptable", "numero de compte", "code compte", "compte general",
        "num compte", "no compte", "compte de resultat"
      ],
      en: [
        "account code", "gl account", "general ledger account", "account number",
        "nominal code", "chart of accounts code", "coa code"
      ],
      es: ["cuenta contable", "codigo de cuenta", "numero de cuenta"],
      pt: ["conta contabil", "codigo da conta", "plano de contas"],
      de: ["sachkonto", "kontonummer", "fibukonto"],
      it: ["conto contabile", "codice conto", "mastro"],
      nl: ["grootboekrekening", "rekeningnummer"],
    },
    abbreviations: ["GL", "COA", "CPT"],
    allowedAggregations: [AGGREGATION_TYPES.COUNT_DISTINCT],
    forbiddenOperations: ["SUM", "AVG"],
    entityBindings: [
      { entity: "Transaction", field: "category" },
    ],
  },
};
