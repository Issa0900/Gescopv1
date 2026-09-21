/**
 * GESCOP — Architecture centralisée des offres, permissions et limites commerciales.
 * Source unique de vérité pour le frontend et le backend.
 */

export const PLANS = {
  FREE: {
    id: "PLAN_FREE",
    name: "Diagnostic",
    badge: "Gratuit",
    price: 0,
    currency: "CAD",
    interval: "month",
    description: "Découvrir GESCOP et obtenir un premier diagnostic complet.",
    cta: "Commencer gratuitement",
    highlight: false,
    featuresList: [
      "Tableau de bord de synthèse",
      "Diagnostic de santé initial",
      "Quelques KPI essentiels",
      "Importation limitée (jusqu'à 3 imports)",
      "Aperçu des alertes & anomalies",
      "Aperçu des recommandations IA",
    ],
  },
  GESCOP: {
    id: "PLAN_GESCOP",
    name: "GESCOP",
    badge: "Essentiel",
    price: 49,
    currency: "CAD",
    interval: "month",
    description: "Pour les entreprises qui veulent centraliser leurs données et suivre leurs performances.",
    cta: "Commencer avec GESCOP",
    highlight: true,
    featuresList: [
      "Toutes les fonctionnalités Diagnostic",
      "Imports réguliers & mapping intelligent",
      "Tableaux de bord & KPI illimités",
      "Analyse financière & Trésorerie détaillée",
      "Gestion Opérations, Clients, Produits & RH",
      "Détection continue des anomalies & alertes",
      "Assistant IA & Recommandations prioritaires",
      "Génération de rapports exécutifs",
    ],
  },
  PRO: {
    id: "PLAN_PRO",
    name: "GESCOP Pro",
    badge: "Performance & IA",
    price: 99,
    currency: "CAD",
    interval: "month",
    description: "Pour les entreprises qui veulent anticiper avec les prévisions, la veille marché et le simulateur.",
    cta: "Passer à GESCOP Pro",
    highlight: false,
    featuresList: [
      "Toutes les fonctionnalités GESCOP",
      "Module Prévisions & Scénarios d'atterrissage",
      "Simulateur de décisions stratégiques",
      "Radar de veille externe & signaux marché",
      "Analyse concurrentielle approfondie",
      "IA générative avancée sans restriction",
      "Rapports exécutifs avancés",
      "Support prioritaire",
    ],
  },
};

export const FEATURES = {
  dashboard: "dashboard",
  kpi: "kpi",
  imports: "imports",
  financial_analysis: "financial_analysis",
  cashflow: "cashflow",
  alerts: "alerts",
  anomalies: "anomalies",
  ai_analysis: "ai_analysis",
  reports: "reports",
  assistant: "assistant",
  forecast: "forecast",
  simulator: "simulator",
  radar: "radar",
  market_watch: "market_watch",
  competitor_analysis: "competitor_analysis",
  advanced_ai: "advanced_ai",
  advanced_reports: "advanced_reports",
};

/**
 * Matrice des droits par plan
 */
export const PLAN_PERMISSIONS = {
  PLAN_FREE: {
    dashboard: true,
    kpi: "limited",
    imports: "limited",
    financial_analysis: false,
    cashflow: false,
    alerts: "limited",
    anomalies: "limited",
    ai_analysis: "limited",
    reports: false,
    assistant: "limited",
    forecast: false,
    simulator: false,
    radar: false,
    market_watch: false,
    competitor_analysis: false,
    advanced_ai: false,
    advanced_reports: false,
  },
  PLAN_GESCOP: {
    dashboard: true,
    kpi: true,
    imports: true,
    financial_analysis: true,
    cashflow: true,
    alerts: true,
    anomalies: true,
    ai_analysis: true,
    reports: true,
    assistant: true,
    forecast: false,
    simulator: false,
    radar: false,
    market_watch: false,
    competitor_analysis: false,
    advanced_ai: false,
    advanced_reports: false,
  },
  PLAN_PRO: {
    dashboard: true,
    kpi: true,
    imports: true,
    financial_analysis: true,
    cashflow: true,
    alerts: true,
    anomalies: true,
    ai_analysis: true,
    reports: true,
    assistant: true,
    forecast: true,
    simulator: true,
    radar: true,
    market_watch: true,
    competitor_analysis: true,
    advanced_ai: true,
    advanced_reports: true,
  },
};

/**
 * Limites chiffrées par plan
 */
export const PLAN_LIMITS = {
  PLAN_FREE: {
    max_imports_per_month: 3,
    max_rows_per_import: 500,
    ai_credits_per_month: 10,
    export_allowed: false,
  },
  PLAN_GESCOP: {
    max_imports_per_month: 30,
    max_rows_per_import: 15000,
    ai_credits_per_month: 100,
    export_allowed: true,
  },
  PLAN_PRO: {
    max_imports_per_month: 200,
    max_rows_per_import: 100000,
    ai_credits_per_month: 1000,
    export_allowed: true,
  },
};

/**
 * Détermine si un plan permet d'accéder à une fonctionnalité donnée.
 * Renvoie true si accès total, "limited" si partiel, false si refusé.
 * 
 * @param {string} planId - Identifiant du plan (PLAN_FREE, PLAN_GESCOP, PLAN_PRO)
 * @param {string} feature - Clé de la fonctionnalité
 * @returns {boolean|string}
 */
export function getFeaturePermission(planId, feature) {
  const normalizedPlan = PLAN_PERMISSIONS[planId] ? planId : "PLAN_FREE";
  return PLAN_PERMISSIONS[normalizedPlan][feature] ?? false;
}

/**
 * Raccourci booléen : l'accès est-il autorisé (complet ou limité) ?
 */
export function canAccess(planId, feature) {
  const perm = getFeaturePermission(planId, feature);
  return perm === true || perm === "limited";
}

/**
 * Raccourci strict : l'accès complet est-il débloqué ?
 */
export function hasFullAccess(planId, feature) {
  return getFeaturePermission(planId, feature) === true;
}

/**
 * Renvoie le plan minimal requis pour débloquer pleinement une fonctionnalité.
 */
export function getRequiredPlanForFeature(feature) {
  if (PLAN_PERMISSIONS.PLAN_GESCOP[feature] === true) {
    return PLANS.GESCOP;
  }
  return PLANS.PRO;
}

