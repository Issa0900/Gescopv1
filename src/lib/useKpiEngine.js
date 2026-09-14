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

