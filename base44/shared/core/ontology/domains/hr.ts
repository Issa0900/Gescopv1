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

export const HR_CONCEPTS: Record<string, CanonicalConcept> = {
  // ── IDENTIFIANT EMPLOYÉ ──
  "hr.employee.id": {
    conceptId: "hr.employee.id",
    canonicalName: "employee_id",
    domain: "hr",
    subdomain: "identity",
    nature: SEMANTIC_NATURES.IDENTIFIER,
    businessRole: BUSINESS_ROLES.IDENTIFIER,
    physicalType: PHYSICAL_TYPES.STRING,
    logicalType: LOGICAL_TYPES.IDENTIFIER,
    unit: undefined,
    grain: GRAIN_LEVELS.EMPLOYEE,
    temporalType: "static",
    synonyms: {
      fr: [
        "id employe", "id_employe", "code employe", "matricule", "numero de matricule",
        "identifiant salarie", "num employe", "matricule salarie"
      ],
      en: [
        "employee id", "employee_id", "staff id", "emp id", "employee number",
        "worker id", "personnel number", "badge number"
      ],
      es: ["id empleado", "numero de empleado", "matricula"],
      pt: ["id funcionario", "numero de funcionario", "matricula"],
      de: ["personalnummer", "mitarbeiter-id", "personal-id"],
      it: ["id dipendente", "numero di matricola", "codice dipendente"],
      nl: ["werknemersnummer", "personeelsnummer", "medewerker id"],
    },
    abbreviations: ["EMP_ID", "MATR"],
    allowedAggregations: [AGGREGATION_TYPES.COUNT_DISTINCT],
    forbiddenOperations: ["SUM", "AVG"],
    entityBindings: [
      { entity: "Employee", field: "employee_id", isDefault: true },
      { entity: "Payroll", field: "employee_id" },
    ],
  },

  // ── CHARGES DE PAIE / SALAIRES (PAYROLL COST) ──
  "hr.compensation.payroll": {
    conceptId: "hr.compensation.payroll",
    canonicalName: "payroll_cost",
    domain: "hr",
    subdomain: "compensation",
    nature: SEMANTIC_NATURES.FINANCIAL_MEASURE,
    businessRole: BUSINESS_ROLES.FLOW,
    physicalType: PHYSICAL_TYPES.DECIMAL,
    logicalType: LOGICAL_TYPES.CURRENCY,
    unit: "currency",
    grain: GRAIN_LEVELS.EMPLOYEE,
    temporalType: "flow",
    synonyms: {
      fr: [
        "salaire brut", "masse salariale", "charges de personnel", "salaire net",
        "cout salarial", "remuneration", "paie", "salaires", "montant paie"
      ],
      en: [
        "payroll", "payroll cost", "gross salary", "net salary", "wages",
        "compensation", "labor cost", "staff cost", "personnel expenses"
      ],
      es: ["nomina", "salarios", "costes de personal", "sueldos"],
      pt: ["folha de pagamento", "salarios", "custos com pessoal"],
      de: ["personalkosten", "lohn", "gehalt", "lohne und gehalter"],
      it: ["costo del personale", "stipendi", "buste paga"],
      nl: ["loonkosten", "personeelskosten", "salarissen"],
    },
    abbreviations: ["PAYROLL", "SAL"],
    allowedAggregations: [AGGREGATION_TYPES.SUM, AGGREGATION_TYPES.AVG],
    entityBindings: [
      { entity: "Payroll", field: "gross_pay", isDefault: true },
    ],
  },

  // ── EFFECTIF / HEADCOUNT (ETP / FTE) ──
  "hr.workforce.headcount": {
    conceptId: "hr.workforce.headcount",
    canonicalName: "headcount",
    domain: "hr",
    subdomain: "workforce",
    nature: SEMANTIC_NATURES.QUANTITY_MEASURE,
    businessRole: BUSINESS_ROLES.STOCK,
    physicalType: PHYSICAL_TYPES.INTEGER,
    logicalType: LOGICAL_TYPES.QUANTITY,
    unit: "units",
    grain: GRAIN_LEVELS.MONTH,
    temporalType: "stock",
    synonyms: {
      fr: [
        "effectif", "nombre d'employes", "effectif total", "nombre de salaries",
        "effectif en etp", "etp", "equivalent temps plein"
      ],
      en: [
        "headcount", "employee count", "staff count", "number of employees",
        "full time equivalent", "fte", "workforce size"
      ],
      es: ["plantilla", "numero de empleados", "efectivos"],
      pt: ["quadro de pessoal", "numero de funcionarios"],
      de: ["mitarbeiterzahl", "beschaftigtenzahl", "belegschaft", "vollzeit-aquivalent"],
      it: ["organico", "numero di dipendenti", "forza lavoro"],
      nl: ["aantal medewerkers", "personeelsbestand", "fte"],
    },
    abbreviations: ["FTE", "ETP"],
    allowedAggregations: [AGGREGATION_TYPES.LAST, AGGREGATION_TYPES.AVG],
    forbiddenOperations: ["SUM"],
    entityBindings: [
      { entity: "Competitor", field: "employee_count" },
    ],
  },
};
