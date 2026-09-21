/**
 * GESCOP — Backend Entitlements & Permissions
 * Règle de sécurité centrale pour le backend Base44.
 */

export interface PlanConfig {
  id: string;
  name: string;
  price: number;
  currency: string;
  interval: string;
}

export const PLANS: Record<string, PlanConfig> = {
  FREE: {
    id: "PLAN_FREE",
    name: "Diagnostic",
    price: 0,
    currency: "CAD",
    interval: "month",
  },
  GESCOP: {
    id: "PLAN_GESCOP",
    name: "GESCOP",
    price: 49,
    currency: "CAD",
    interval: "month",
  },
  PRO: {
    id: "PLAN_PRO",
    name: "GESCOP Pro",
    price: 99,
    currency: "CAD",
    interval: "month",
  },
};

export const PLAN_PERMISSIONS: Record<string, Record<string, boolean | "limited">> = {
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

export const PLAN_LIMITS: Record<string, { max_imports_per_month: number; max_rows_per_import: number; ai_credits_per_month: number; export_allowed: boolean }> = {
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

export function canAccessFeature(planId: string | undefined, feature: string): boolean {
  const activePlan = planId && PLAN_PERMISSIONS[planId] ? planId : "PLAN_FREE";
  const perm = PLAN_PERMISSIONS[activePlan][feature];
  return perm === true || perm === "limited";
}

export function hasFullAccessFeature(planId: string | undefined, feature: string): boolean {
  const activePlan = planId && PLAN_PERMISSIONS[planId] ? planId : "PLAN_FREE";
  return PLAN_PERMISSIONS[activePlan][feature] === true;
}

