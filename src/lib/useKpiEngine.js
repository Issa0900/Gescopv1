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

    if (data.transactions) {
      allRecords.push(...data.transactions);
      const sem = getEntitySemantics('Transaction');
      if (sem) sem.forEach((v, k) => allSemantics.set(k, v));
    }
    
    if (data.cashflow) {
      allRecords.push(...data.cashflow);
      const sem = getEntitySemantics('Cashflow');
      if (sem) sem.forEach((v, k) => allSemantics.set(k, v));
    }
    
    if (data.orders) {
      allRecords.push(...data.orders);
      const sem = getEntitySemantics('Order');
      if (sem) sem.forEach((v, k) => allSemantics.set(k, v));
    }

    if (data.expenses) {
      allRecords.push(...data.expenses);
      const sem = getEntitySemantics('Expense');
      if (sem) sem.forEach((v, k) => allSemantics.set(k, v));
    }

    if (data.employees) {
      allRecords.push(...data.employees);
      const sem = getEntitySemantics('Employee');
      if (sem) sem.forEach((v, k) => allSemantics.set(k, v));
    }

    if (data.payrolls) {
      allRecords.push(...data.payrolls);
      const sem = getEntitySemantics('Payroll');
      if (sem) sem.forEach((v, k) => allSemantics.set(k, v));
    }
    
    if (data.customers) {
      allRecords.push(...data.customers);
      const sem = getEntitySemantics('Customer');
      if (sem) sem.forEach((v, k) => allSemantics.set(k, v));
    }

    if (data.products) {
      allRecords.push(...data.products);
      const sem = getEntitySemantics('Product');
      if (sem) sem.forEach((v, k) => allSemantics.set(k, v));
    }

    // 2. Lancer le calcul
    if (allRecords.length === 0 || kpiIds.length === 0) {
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

    const addData = (entityName, records) => {
      if (!records || records.length === 0) return;
      allRecords.push(...records);
      const sem = getEntitySemantics(entityName);
      if (sem) sem.forEach((v, k) => allSemantics.set(k, v));
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

