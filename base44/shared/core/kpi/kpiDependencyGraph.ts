// ─────────────────────────────────────────────────────────────────────────────
// GESCOP Universal KPI Engine — KPI Dependency Graph & Root-Cause Diagnostics
// Version 2.0 — Septembre 2026 (Spec Sections 32, 33, 42)
// ─────────────────────────────────────────────────────────────────────────────

import { UNIVERSAL_KPI_CATALOG } from "./kpiCatalog.ts";
import { resolveMetricValue } from "./kpiEligibility.ts";
import { type DiscoveredKpi, type KpiDefinition } from "./types.ts";

export interface MetricSourceProvenance {
  metricName: string;
  recommendedEntities: string[];
  typicalColumns: string[];
  descriptionFr: string;
}

/**
 * Registre de provenance des métriques de base pour guider l'utilisateur vers la source de données manquante
 */
export const METRIC_PROVENANCE_REGISTRY: Record<string, MetricSourceProvenance> = {
  revenue: {
    metricName: "revenue",
    recommendedEntities: ["Order", "ExecutiveSummary", "Invoice"],
    typicalColumns: ["Total", "Ventes", "Montant", "Revenue", "CA"],
    descriptionFr: "Chiffre d'affaires / ventes totales.",
  },
  attributed_revenue: {
    metricName: "attributed_revenue",
    recommendedEntities: ["Order", "ExecutiveSummary", "Invoice"],
    typicalColumns: ["Total", "Ventes", "Montant", "Revenue", "CA"],
    descriptionFr: "Chiffre d'affaires / ventes totales.",
  },
  cogs: {
    metricName: "cogs",
    recommendedEntities: ["Order", "InventoryItem", "ExecutiveSummary"],
    typicalColumns: ["Coût Total", "COGS", "Cost", "Prix d'achat"],
    descriptionFr: "Coût des marchandises vendues (COGS).",
  },
  gross_profit: {
    metricName: "gross_profit",
    recommendedEntities: ["ExecutiveSummary", "Order"],
    typicalColumns: ["Profit Brut", "Bénéfice", "Gross Profit", "Marge brute ($)"],
    descriptionFr: "Bénéfice ou marge brute en valeur monétaire.",
  },
  operating_expenses: {
    metricName: "operating_expenses",
    recommendedEntities: ["Expense", "AccountingEntry"],
    typicalColumns: ["Charges", "Dépenses", "OPEX", "Operating Expenses"],
    descriptionFr: "Charges et dépenses d'exploitation.",
  },
  ad_spend: {
    metricName: "ad_spend",
    recommendedEntities: ["MarketingCampaign"],
    typicalColumns: ["Budget", "Spend", "Dépense pub", "Cost", "Montant investi"],
    descriptionFr: "Budget publicitaire investi sur les canaux marketing (Meta, Google, etc.).",
  },
  marketing_spend: {
    metricName: "marketing_spend",
    recommendedEntities: ["MarketingCampaign"],
    typicalColumns: ["Budget", "Spend", "Dépense pub", "Cost", "Montant investi"],
    descriptionFr: "Budget publicitaire investi sur les canaux marketing (Meta, Google, etc.).",
  },
  impressions: {
    metricName: "impressions",
    recommendedEntities: ["MarketingCampaign"],
    typicalColumns: ["Impressions", "Vues", "Affichages"],
    descriptionFr: "Nombre total d'impressions publicitaires.",
  },
  clicks: {
    metricName: "clicks",
    recommendedEntities: ["MarketingCampaign"],
    typicalColumns: ["Clics", "Clicks"],
    descriptionFr: "Nombre de clics enregistrés sur les campagnes.",
  },
  conversions: {
    metricName: "conversions",
    recommendedEntities: ["MarketingCampaign", "Order"],
    typicalColumns: ["Conversions", "Achats", "Orders"],
    descriptionFr: "Nombre de conversions ou achats générés.",
  },
  orders: {
    metricName: "orders",
    recommendedEntities: ["Order"],
    typicalColumns: ["order_id", "Numéro commande", "N° Facture"],
    descriptionFr: "Volume ou nombre de transactions / commandes uniques.",
  },
  customers: {
    metricName: "customers",
    recommendedEntities: ["Customer", "Order"],
    typicalColumns: ["customer_id", "Client ID", "Courriel"],
    descriptionFr: "Nombre de clients actifs ou uniques.",
  },
  headcount: {
    metricName: "headcount",
    recommendedEntities: ["Employee"],
    typicalColumns: ["employee_id", "ID Employé", "Matricule"],
    descriptionFr: "Effectif total d'employés dans l'entreprise.",
  },
  cash_inflow: {
    metricName: "cash_inflow",
    recommendedEntities: ["CashTransaction", "Invoice"],
    typicalColumns: ["Encaissements", "Entrées", "Cash In"],
    descriptionFr: "Flux d'encaissements de trésorerie.",
  },
  cash_outflow: {
    metricName: "cash_outflow",
    recommendedEntities: ["CashTransaction", "Expense"],
    typicalColumns: ["Décaissements", "Sorties", "Cash Out"],
    descriptionFr: "Flux de décaissements de trésorerie.",
  },
  cash_balance: {
    metricName: "cash_balance",
    recommendedEntities: ["CashTransaction", "BankStatement"],
    typicalColumns: ["Solde", "Liquidités", "Solde bancaire"],
    descriptionFr: "Solde de trésorerie disponible.",
  },
  inventory_value: {
    metricName: "inventory_value",
    recommendedEntities: ["InventoryItem"],
    typicalColumns: ["Valeur stock", "Inventory Value"],
    descriptionFr: "Valeur marchande ou comptable du stock.",
  },
};

export interface RootCauseDiagnostic {
  kpiId: string;
  kpiName: string;
  module: string;
  state: string;
  missingMetrics: string[];
  remedyFr: string;
  suggestedFilesOrEntities: string[];
  blockedDownstreamKpis: string[];
}

export interface KpiAuditReport {
  kpiId: string;
  kpiName: string;
  formula: string;
  state: string;
  value: number | null;
  unit: string;
  inputMetrics: Record<string, number>;
  sourceDatasets: string[];
  calculatedAt: string;
  isSanityChecked: boolean;
  anomalyDetected: string | null;
}

/**
 * Analyse de cause racine pour expliquer pourquoi un KPI n'est pas disponible (Spec Section 33)
 */
export function diagnoseKpiFailure(
  kpiId: string,
  availableMetrics: Record<string, number>
): RootCauseDiagnostic {
  const kpiDef = UNIVERSAL_KPI_CATALOG[kpiId];
  if (!kpiDef) {
    return {
      kpiId,
      kpiName: kpiId,
      module: "inconnu",
      state: "UNKNOWN",
      missingMetrics: [],
      remedyFr: `Indicateur « ${kpiId} » non répertorié dans le catalogue universel GESCOP.`,
      suggestedFilesOrEntities: [],
      blockedDownstreamKpis: [],
    };
  }

  const missing: string[] = [];
  for (const req of kpiDef.requiredMetrics) {
    if (resolveMetricValue(availableMetrics, req) === undefined) {
      missing.push(req);
    }
  }

  const suggestedFiles: Set<string> = new Set();
  const remedyParts: string[] = [];

  for (const m of missing) {
    const prov = METRIC_PROVENANCE_REGISTRY[m];
    if (prov) {
      prov.recommendedEntities.forEach((e) => suggestedFiles.add(e));
      remedyParts.push(`« ${prov.descriptionFr} » (colonnes types : ${prov.typicalColumns.join(", ")})`);
    } else {
      remedyParts.push(`« ${m} »`);
    }
  }

  // Identifier les autres KPI en aval bloqués par ces mêmes métriques manquantes
  const blockedDownstream: string[] = [];
  for (const [otherId, otherDef] of Object.entries(UNIVERSAL_KPI_CATALOG)) {
    if (otherId === kpiId) continue;
    const hasIntersection = otherDef.requiredMetrics.some((rm) => missing.includes(rm));
    if (hasIntersection) {
      blockedDownstream.push(otherDef.name.fr);
    }
  }

  const remedyFr =
    missing.length === 0
      ? "Toutes les métriques requises sont présentes mais les critères mathématiques (ex: diviseur non nul ou grain) ne sont pas respectés."
      : `Pour activer « ${kpiDef.name.fr} », importez les données sources fournissant : ${remedyParts.join("; ")}.`;

  return {
    kpiId,
    kpiName: kpiDef.name.fr,
    module: kpiDef.primaryModule,
    state: missing.length === kpiDef.requiredMetrics.length ? "INSUFFICIENT_DATA" : "PARTIAL",
    missingMetrics: missing,
    remedyFr,
    suggestedFilesOrEntities: Array.from(suggestedFiles),
    blockedDownstreamKpis: blockedDownstream.slice(0, 5),
  };
}

/**
 * Génère un rapport d'audit et de traçabilité complet pour un KPI calculé (Spec Section 42)
 */
export function generateKpiAudit(discoveredKpi: DiscoveredKpi): KpiAuditReport {
  return {
    kpiId: discoveredKpi.kpiId,
    kpiName: discoveredKpi.name,
    formula: discoveredKpi.lineage.formula,
    state: discoveredKpi.state,
    value: discoveredKpi.value,
    unit: discoveredKpi.unit,
    inputMetrics: discoveredKpi.lineage.inputs,
    sourceDatasets: discoveredKpi.lineage.sourceDatasets,
    calculatedAt: discoveredKpi.lineage.calculatedAt,
    isSanityChecked: discoveredKpi.state === "CALCULATED",
    anomalyDetected: discoveredKpi.state === "INVALID" ? discoveredKpi.explanation : null,
  };
}
