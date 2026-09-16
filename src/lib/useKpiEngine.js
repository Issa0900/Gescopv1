import { useMemo } from 'react';
import { computeKpiBatch } from './core/kpiEngine';
import { getEntitySemantics } from './core/entityFieldMap';
import { KPI_REGISTRY } from './core/kpiRegistry';

/**
 * React Hook pour utiliser le nouveau moteur sémantique GESCOP.
 * Il fusionne les différentes entités en un jeu de données unifié pour le calcul.
 * 
 * @param {Object} data - Objet contenant les tableaux d'enregistrements (ex: { transactions, cashflow })
 * @param {string[]} kpiIds - Liste des KPI à calculer (ex: ['total_revenue', 'gross_margin_pct'])
 */
export function useKpiEngine(data, kpiIds) {
  return useMemo(() => {
    // 1. Aplatir les enregistrements et construire les sémantiques
    const allRecords = [];
    const allSemantics = new Map();

    // Two entities can share a raw field name (Transaction.amount and
    // Expense.amount, Transaction.date and Cashflow.date...). Keying this
    // map by field name alone let the second entity's semantic silently
    // overwrite the first's, so a canonicalKey only the first entity
    // provided (e.g. "transaction_amount") could no longer be found at all
    // the moment a second entity sharing that field name was added. The key
    // is namespaced by entity; lookups still match by canonicalKey value
    // (see _aggregateRawField), and each FieldSemantic already carries its
    // own raw field name (`.field`) for indexing back into its records.
    // Tagged with its source entity: two entities can share a raw field name
    // (Transaction.amount and Expense.amount both just called "amount"), and
    // without this tag the engine's raw-field aggregator had no way to tell
    // which rows actually belong to the field it resolved - it summed every
    // row in the flattened batch that happened to have an "amount" property,
    // so "Chiffre d'affaires" and "Dépenses totales" both ended up equal to
    // income + expenses combined the moment both entities were passed in.
    const addEntity = (entityName, records) => {
      if (!records) return;
      allRecords.push(...records.map((r) => ({ ...r, _entity: entityName })));
      const sem = getEntitySemantics(entityName);
      if (sem) sem.forEach((v, k) => allSemantics.set(`${entityName}:${k}`, v));
    };

    addEntity('Transaction', data.transactions);
    addEntity('Cashflow', data.cashflow);
    addEntity('Order', data.orders);
    addEntity('Expense', data.expenses);
    addEntity('Employee', data.employees);
    addEntity('Payroll', data.payrolls);
    addEntity('Customer', data.customers);
    addEntity('Product', data.products);
    // Campaign and CampaignDaily both roll up to the same canonicalKeys
    // (marketing_spend, campaign_revenue...) by design - pass only one to
    // avoid the entity filter picking whichever happens to be seen first
    // and silently ignoring the other's rows.
    addEntity('CampaignDaily', data.campaignDaily);

    // NOUVEAU DATA CORE (PHASE 2) - Traitement des Observations
    if (data.observations) {
      allRecords.push(...data.observations);
      // Les observations n'ont pas besoin de sémantique, elles ont déjà un champ 'concept'
    }

    // 2. Lancer le calcul
    if (allRecords.length === 0 || !kpiIds || kpiIds.length === 0) {
      return { kpis: new Map(), available: false };
    }

    try {
      const results = computeKpiBatch(kpiIds, allRecords, allSemantics);
      return { kpis: results, available: true };
    } catch (err) {
      console.error("Erreur du moteur KPI:", err);
      return { kpis: new Map(), available: false, error: err.message };
    }
  }, [data, kpiIds]);
}

/**
 * Hook étendu pour obtenir des séries temporelles (groupées par mois) via le moteur sémantique.
 */
export function useKpiEngineTimeSeries(data, kpiIds, options = { includeCurrentMonth: false }) {
  return useMemo(() => {
    const allRecords = [];
    const allSemantics = new Map();

    // Namespaced and tagged by entity - see the comment in useKpiEngine above.
    const addData = (entityName, records) => {
      if (!records || records.length === 0) return;
      allRecords.push(...records.map((r) => ({ ...r, _entity: entityName })));
      const sem = getEntitySemantics(entityName);
      if (sem) sem.forEach((v, k) => allSemantics.set(`${entityName}:${k}`, v));
    };

    addData('Transaction', data.transactions);
    addData('Cashflow', data.cashflow);
    addData('Order', data.orders);
    addData('Expense', data.expenses);
    addData('CampaignDaily', data.campaignDaily);
    addData('Employee', data.employees);
    addData('Payroll', data.payrolls);
    addData('Customer', data.customers);
    addData('Product', data.products);

    if (allRecords.length === 0 || kpiIds.length === 0) {
      return { timeSeries: [], available: false };
    }

    const byMonth = {};
    const getDate = (r) => r.date || r.acquisition_date || r.period; 
    
    allRecords.forEach(r => {
      const d = getDate(r);
      if (!d) return;
      const m = d.slice(0, 7);
      if (!byMonth[m]) byMonth[m] = [];
      byMonth[m].push(r);
    });

    const cm = new Date().toISOString().slice(0, 7);
    let months = Object.keys(byMonth).sort();
    if (!options.includeCurrentMonth) {
      months = months.filter(m => m !== cm);
    }

    if (months.length === 0) return { timeSeries: [], available: false };

    const firstMonth = months[0];
    const lastMonth = months[months.length - 1];
    const timeSeries = [];
    
    const [y1, m1] = firstMonth.split("-").map(Number);
    const [y2, m2] = lastMonth.split("-").map(Number);
    const span = (y2 - y1) * 12 + (m2 - m1);
    
    for (let i = 0; i <= span; i++) {
      const total = y1 * 12 + (m1 - 1) + i;
      const curMonth = `${Math.floor(total / 12)}-${String((total % 12) + 1).padStart(2, "0")}`;
      
      const monthRecords = byMonth[curMonth] || [];
      // Trier par date pour que l'agrégation LAST fonctionne correctement
      monthRecords.sort((a, b) => (getDate(a) < getDate(b) ? -1 : 1));

      const results = computeKpiBatch(kpiIds, monthRecords, allSemantics);
      
      const dataPoint = { date: curMonth };
      kpiIds.forEach(id => {
        const lineage = results.get(id);
        // Important: Use null if unavailable, to prevent dropping averages
        dataPoint[id] = (lineage && lineage.value !== null) ? lineage.value : null; 
      });
      timeSeries.push(dataPoint);
    }

    return { timeSeries, available: true };
  }, [data, kpiIds, options.includeCurrentMonth]);
}

