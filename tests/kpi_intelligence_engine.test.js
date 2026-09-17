import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  UNIVERSAL_KPI_CATALOG,
  extractBaseMetrics,
  evaluateKpiEligibility,
  validateKpiResult,
  discoverKpis,
  generateKpiRecommendations,
  diagnoseKpiFailure,
  generateKpiAudit,
  runDataIntelligencePipeline,
  KPI_STATES,
  KPI_MODULES,
} from '../base44/shared/core/kpi/index.ts';

test('KPI Catalog — Intégrité et couverture des 10 modules', () => {
  const catalogKeys = Object.keys(UNIVERSAL_KPI_CATALOG);
  assert.ok(catalogKeys.length >= 25, `Le catalogue doit contenir au moins 25 KPIs (actuel: ${catalogKeys.length})`);

  // Vérifier la présence de tous les modules requis par la spec
  const modulesPresent = new Set();
  for (const def of Object.values(UNIVERSAL_KPI_CATALOG)) {
    modulesPresent.add(def.primaryModule);
    assert.ok(def.id, 'Chaque KPI doit avoir un ID');
    assert.ok(def.name.fr, 'Chaque KPI doit avoir un nom FR');
    assert.ok(def.formula, 'Chaque KPI doit avoir une formule');
    assert.ok(Array.isArray(def.requiredMetrics) && def.requiredMetrics.length > 0, 'Chaque KPI doit spécifier ses métriques requises');
  }

  assert.ok(modulesPresent.has(KPI_MODULES.FINANCE), 'Module finance présent');
  assert.ok(modulesPresent.has(KPI_MODULES.VENTES), 'Module ventes présent');
  assert.ok(modulesPresent.has(KPI_MODULES.MARKETING), 'Module marketing présent');
  assert.ok(modulesPresent.has(KPI_MODULES.TRESORERIE), 'Module tresorerie présent');
  assert.ok(modulesPresent.has(KPI_MODULES.STOCKS), 'Module stocks présent');
});

test('KPI Discovery — Cas Ventes / Sommaire Exécutif Nordik Plein Air', () => {
  const headers = ['Succursale', 'Ventes Totales ($)', 'Coût Total ($)', 'Profit Brut ($)', '% Marge'];
  const rows = [
    { 'Succursale': 'Montréal - Centre-Ville', 'Ventes Totales ($)': '1250000', 'Coût Total ($)': '750000', 'Profit Brut ($)': '500000', '% Marge': '40.0%' },
    { 'Succursale': 'Québec - Sainte-Foy', 'Ventes Totales ($)': '950000', 'Coût Total ($)': '570000', 'Profit Brut ($)': '380000', '% Marge': '40.0%' },
    { 'Succursale': 'Laval', 'Ventes Totales ($)': '820000', 'Coût Total ($)': '510000', 'Profit Brut ($)': '310000', '% Marge': '37.8%' },
  ];

  const metrics = extractBaseMetrics({ headers, rows, isAggregatedSummary: true, grain: 'branch' });
  assert.equal(metrics.revenue, 3020000);
  assert.equal(metrics.cogs, 1830000);
  assert.equal(metrics.gross_profit, 1190000);
  assert.equal(metrics.branches, 3);

  const { kpis, summary } = discoverKpis({
    metrics,
    grain: 'branch',
    sourceDatasetName: 'Nordik_PleinAir_Donnees_Complet_2026.xlsx [Sommaire Exécutif]',
  });

  assert.ok(summary.calculatedCount >= 3, `Au moins 3 KPIs doivent être calculés (actuel: ${summary.calculatedCount})`);

  const grossProfitKpi = kpis.find((k) => k.kpiId === 'gross_profit');
  assert.ok(grossProfitKpi);
  assert.equal(grossProfitKpi.state, KPI_STATES.CALCULATED);
  assert.equal(grossProfitKpi.value, 1190000);

  const grossMarginKpi = kpis.find((k) => k.kpiId === 'gross_margin_pct');
  assert.ok(grossMarginKpi);
  assert.equal(grossMarginKpi.state, KPI_STATES.CALCULATED);
  // (1190000 / 3020000) * 100 = 39.4%
  assert.equal(grossMarginKpi.value, 39.4);

  const revPerBranchKpi = kpis.find((k) => k.kpiId === 'revenue_per_branch');
  assert.ok(revPerBranchKpi);
  assert.equal(revPerBranchKpi.state, KPI_STATES.CALCULATED);
  // 3020000 / 3 = 1006666.67
  assert.equal(revPerBranchKpi.value, 1006666.67);
});

test('KPI Discovery — Cas Campagnes Marketing (CTR, CPC, ROAS, CPA)', () => {
  const metrics = {
    revenue: 45000,
    ad_spend: 10000,
    impressions: 250000,
    clicks: 12500,
    conversions: 500,
  };

  const { kpis } = discoverKpis({ metrics, grain: 'day' });

  const ctrKpi = kpis.find((k) => k.kpiId === 'ctr');
  assert.ok(ctrKpi);
  assert.equal(ctrKpi.state, KPI_STATES.CALCULATED);
  // (12500 / 250000) * 100 = 5.0%
  assert.equal(ctrKpi.value, 5);

  const cpcKpi = kpis.find((k) => k.kpiId === 'cpc');
  assert.ok(cpcKpi);
  assert.equal(cpcKpi.state, KPI_STATES.CALCULATED);
  // 10000 / 12500 = 0.80$
  assert.equal(cpcKpi.value, 0.8);

  const roasKpi = kpis.find((k) => k.kpiId === 'roas');
  assert.ok(roasKpi);
  assert.equal(roasKpi.state, KPI_STATES.CALCULATED);
  // 45000 / 10000 = 4.5
  assert.equal(roasKpi.value, 4.5);

  const cpaKpi = kpis.find((k) => k.kpiId === 'cpa');
  assert.ok(cpaKpi);
  assert.equal(cpaKpi.state, KPI_STATES.CALCULATED);
  // 10000 / 500 = 20.00$
  assert.equal(cpaKpi.value, 20);
});

test('KPI Sécurité Mathématique — Protection Dénominateur Nul (Division par Zéro)', () => {
  const metrics = {
    ad_spend: 5000,
    clicks: 0, // Dénominateur nul pour CPC
    impressions: 0, // Dénominateur nul pour CTR
  };

  const ctrDef = UNIVERSAL_KPI_CATALOG['ctr'];
  const eligibility = evaluateKpiEligibility(ctrDef, metrics, 'day');

  assert.equal(eligibility.eligible, false);
  assert.equal(eligibility.state, KPI_STATES.INVALID);
  assert.match(eligibility.reason, /dénominateur nul/i);
});

test('KPI Validateur de Plausibilité — Détection d’Anomalie de Seuil', () => {
  const marginDef = UNIVERSAL_KPI_CATALOG['gross_margin_pct'];
  
  // Taux de marge anormal de 180% (maxSanityThreshold = 100)
  const validation = validateKpiResult(marginDef, 180);
  assert.equal(validation.isValid, false);
  assert.match(validation.anomaly, /dépasse le seuil plausible/i);

  // Taux normal de 35%
  const validCheck = validateKpiResult(marginDef, 35);
  assert.equal(validCheck.isValid, true);
  assert.equal(validCheck.anomaly, null);
});

test('KPI Recommandations — Score de Priorité & Synthèse en Français', () => {
  const metrics = {
    revenue: 500000,
    cogs: 300000,
    gross_profit: 200000,
    orders: 4000,
  };

  const { kpis } = discoverKpis({ metrics, grain: 'month' });
  const { recommendations, summaryMessage, byModule } = generateKpiRecommendations(kpis);

  assert.ok(recommendations.length > 0);
  assert.ok(recommendations[0].priorityScore >= 80);
  assert.match(summaryMessage, /nouveaux indicateurs de performance \(KPI\) détectés/i);
  assert.ok(byModule.finance && byModule.finance.length > 0);
  assert.ok(byModule.ventes && byModule.ventes.length > 0);
});

test('KPI Diagnostic de Cause Racine — Métriques Manquantes & Suggestions de Fichiers', () => {
  // L'utilisateur n'a importé que des ventes, pas de pub
  const availableMetrics = { revenue: 100000, orders: 1200 };

  const roasDiagnostic = diagnoseKpiFailure('roas', availableMetrics);
  assert.equal(roasDiagnostic.state, 'PARTIAL');
  assert.ok(roasDiagnostic.missingMetrics.includes('marketing_spend') || roasDiagnostic.missingMetrics.includes('ad_spend'));
  assert.ok(roasDiagnostic.suggestedFilesOrEntities.includes('MarketingCampaign'));
  assert.match(roasDiagnostic.remedyFr, /importez les données sources/i);

  // Vérifier l'audit d'un KPI
  const { kpis } = discoverKpis({ metrics: { revenue: 100000, orders: 1000 } });
  const aovKpi = kpis.find((k) => k.kpiId === 'average_order_value');
  assert.ok(aovKpi);

  const audit = generateKpiAudit(aovKpi);
  assert.equal(audit.kpiId, 'average_order_value');
  assert.equal(audit.value, 100);
  assert.equal(audit.isSanityChecked, true);
});

test('Data Intelligence Orchestrator — Pipeline E2E Unifié', () => {
  const sheetName = 'Sommaire Exécutif';
  const fileName = 'Nordik_PleinAir_Donnees_Complet_2026.xlsx';
  const headers = ['Succursale', 'Ventes Totales ($)', 'Coût Total ($)', 'Profit Brut ($)', '% Marge'];
  const rows = [
    { 'Succursale': 'Montréal - Centre-Ville', 'Ventes Totales ($)': '1250000', 'Coût Total ($)': '750000', 'Profit Brut ($)': '500000', '% Marge': '40.0%' },
    { 'Succursale': 'Québec - Sainte-Foy', 'Ventes Totales ($)': '950000', 'Coût Total ($)': '570000', 'Profit Brut ($)': '380000', '% Marge': '40.0%' },
    { 'Succursale': 'Laval', 'Ventes Totales ($)': '820000', 'Coût Total ($)': '510000', 'Profit Brut ($)': '310000', '% Marge': '37.8%' },
    { 'Succursale': 'TOTAL CONSOLIDÉ', 'Ventes Totales ($)': '3020000', 'Coût Total ($)': '1830000', 'Profit Brut ($)': '1190000', '% Marge': '39.4%' },
  ];

  const report = runDataIntelligencePipeline({
    sheetName,
    fileName,
    headers,
    rows,
  });

  assert.equal(report.sheetName, sheetName);
  assert.equal(report.fileName, fileName);
  assert.equal(report.isAggregatedSummary, true);
  assert.ok(report.calculatedKpis.length >= 3);
  assert.ok(report.recommendations.length >= 3);
  assert.match(report.summaryMessage, /indicateurs de performance/i);
  assert.ok(report.topMissingKpiDiagnostics.length > 0);
});
