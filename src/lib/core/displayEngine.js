// ─────────────────────────────────────────────────────────────────────────────
// GESCOP Data Intelligence Core - Display Engine
// ─────────────────────────────────────────────────────────────────────────────
//
// Dynamically decides what components and KPIs to display on a page based on:
// 1. Available and computable KPIs
// 2. Data quality scores
// 3. Chart compatibility rules
//
// This allows GESCOP to present only relevant, valid insights,
// adapting the dashboard to whatever data was imported.
// ─────────────────────────────────────────────────────────────────────────────

import { getKpisByDomain } from "./kpiRegistry";
import { filterComputableKpis, validateKpiForDisplay } from "./kpiValidator";
import { validateChartConfig } from "./chartValidator";

/**
 * Generates a dynamic dashboard layout based on available data.
 * 
 * @param {Object} params
 * @param {string} params.domain - 'finance', 'ventes', 'tresorerie', etc.
 * @param {string[]} params.availableEntities - Entities with data in this context
 * @param {Map<string, import("./dataLineage").KpiLineage>} params.computedKpis - Pre-computed KPIs
 * @returns {Object} Layout definition with sections, metrics, and valid charts
 */
export function buildDynamicDashboard({ domain, availableEntities, computedKpis }) {
  // 1. Get all KPIs for this domain
  const domainKpis = getKpisByDomain(domain).map(k => k.id);
  
  // 2. Filter down to what we can actually compute with available entities
  const { computable, uncomputable } = filterComputableKpis(domainKpis, availableEntities);
  
  const layout = {
    domain,
    heroMetrics: [],
    secondaryMetrics: [],
    charts: [],
    alerts: [],
    missingCapabilities: []
  };

  // 3. Process computable KPIs
  const safeKpis = [];

  for (const kpiId of computable) {
    const lineage = computedKpis.get(kpiId);
    if (!lineage) continue; // Not computed yet

    const validation = validateKpiForDisplay(lineage);
    
    if (validation.displaySafe) {
      safeKpis.push(kpiId);
      
      const metricDef = {
        id: kpiId,
        label: lineage.name,
        value: lineage.value,
        unit: lineage.unit,
        status: lineage.status,
        cssClass: validation.cssClass,
        warnings: validation.warnings,
        lineage
      };

      // Sort into hero vs secondary based on kpi level
      const def = getKpisByDomain(domain).find(k => k.id === kpiId);
      if (def?.level === 'KPI_STRATEGIQUE') {
        layout.heroMetrics.push(metricDef);
      } else {
        layout.secondaryMetrics.push(metricDef);
      }

      if (validation.warnings.length > 0) {
        layout.alerts.push({
          type: 'warning',
          kpi: lineage.name,
          messages: validation.warnings
        });
      }
    }
  }

  // 4. Generate valid chart configurations
  // We try some standard combinations for the domain and only keep the valid ones
  
  const potentialCharts = _getStandardChartsForDomain(domain);
  
  for (const chart of potentialCharts) {
    // Only attempt if all required KPIs are in our safe list
    const hasAllData = chart.kpis.every(id => safeKpis.includes(id));
    if (!hasAllData) continue;

    // The Ultimate Test
    const validation = validateChartConfig({
      chartType: chart.type,
      kpiIds: chart.kpis
    });

    if (validation.valid) {
      layout.charts.push({
        id: chart.id,
        title: chart.title,
        type: chart.type,
        kpis: chart.kpis,
        groups: validation.groups || null
      });
    } else {
      // If a standard chart was blocked by the semantic firewall, we log it as an alert
      // so the user knows *why* the chart isn't there.
      layout.alerts.push({
        type: 'info',
        title: `Graphique "${chart.title}" masqué`,
        messages: [validation.errorMessage || validation.reason]
      });
    }
  }

  // 5. Document what we COULD show if we had more data
  for (const [id, missingInfo] of Object.entries(uncomputable)) {
    const def = getKpisByDomain(domain).find(k => k.id === id);
    if (def && def.level === 'KPI_STRATEGIQUE') {
      layout.missingCapabilities.push({
        kpi: def.name.fr,
        missing: missingInfo.missingDependencies
      });
    }
  }

  return layout;
}

/**
 * Standard chart templates per domain.
 * The display engine will try to render these if the semantic firewall permits.
 * @private
 */
function _getStandardChartsForDomain(domain) {
  const templates = {
    'finance': [
      { id: 'fin_comp_1', title: 'Composition des revenus', type: 'composition', kpis: ['total_revenue', 'total_expense'] }, // Will pass
      { id: 'fin_comp_2', title: 'Marge vs Revenu', type: 'comparison', kpis: ['total_revenue', 'gross_margin_amount'] }, // Will pass
      { id: 'fin_trend_1', title: 'Évolution de la marge nette', type: 'trend', kpis: ['net_margin_pct'] } // Will pass
    ],
    'tresorerie': [
      { id: 'tres_comp_1', title: 'BFR vs Trésorerie', type: 'comparison', kpis: ['bfr', 'cash_closing'] }, // Will pass (both stocks)
      // THIS is the bad chart the user explicitly wants blocked:
      { id: 'tres_bad_1', title: 'Composition des montants (TEST)', type: 'composition', kpis: ['total_revenue', 'accounts_receivable', 'accounts_payable', 'total_expense'] } // WILL BE BLOCKED!
    ],
    'marketing': [
      { id: 'mkt_comp_1', title: 'CAC vs LTV', type: 'comparison', kpis: ['cac', 'ltv'] }
    ]
  };

  return templates[domain] || [];
}

