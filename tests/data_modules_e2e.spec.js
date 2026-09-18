// Test bout-en-bout : lance l'app React réelle dans un navigateur (routing,
// layout, sidebar, React Query, chaque page), sans rien mocker côté React —
// seule la couche réseau /api est interceptée avec des données fictives mais
// réalistes par entité. Le but n'est pas "la page ne plante pas" (déjà couvert
// par audit.spec.js avec des listes vides) mais "chaque module affiche
// réellement la donnée qui le concerne", en particulier les entités qui
// étaient importées puis invisibles nulle part (Purchase, Supplier, Goal,
// Event, Interaction, ExecutiveSummary) avant l'ajout de leur module.
import { test, expect } from '@playwright/test';

// Une ligne par entité, avec au moins un libellé "signature" suffisamment
// distinctif pour qu'on le cherche tel quel dans le DOM rendu : si le module
// affichait vraiment la donnée, ce texte doit apparaître à l'écran.
const FIXTURES = {
  Purchase: [{
    id: 'p1', purchase_id: 'CMD-9001', date: '2026-01-05', supplier_id: 'SUP-1',
    product_id: 'PROD-1', quantity: 10, unit_cost: 12, total_cost: 120,
    delay_days: 3, status: 'retard',
  }],
  Supplier: [{
    id: 's1', supplier_id: 'SUP-1', supplier_name: 'Fournisseur Zenith Signature',
    country: 'Canada', average_delivery_days: 7, quality_score: 88,
    reliability_score: 91, status: 'actif',
  }],
  Goal: [{
    id: 'g1', goal_id: 'GOAL-1', domain: 'ventes', metric: 'Objectif CA Signature Q1',
    target: 100000, current: 42000, period: '2026-Q1', status: 'en_cours',
  }],
  Event: [{
    id: 'e1', event_id: 'EVT-1', date: '2026-01-10', event_type: 'Rupture Stock Signature',
    description: 'Incident logistique majeur sur l\'entrepôt principal', impact_area: 'operations',
  }],
  Interaction: [{
    id: 'i1', interaction_id: 'INT-1', date: '2026-01-12', customer_id: 'CLI-1',
    channel: 'telephone', subject: 'Plainte Signature Livraison', sentiment: 'negatif', resolved: false,
  }],
  ExecutiveSummary: [{
    id: 'x1', summary_id: 'SUM-1', location_id: 'LOC-1', succursale: 'Succursale Signature Nord',
    period: '2026-01', total_revenue: 55000, total_cost: 32000, gross_margin: 42, total_orders: 210,
  }],
  Customer: [{
    id: 'c1', customer_id: 'CLI-1', first_name: 'Client', last_name: 'SignatureTest',
    segment: 'vip', status: 'actif', churn_risk: 0.2,
  }],
  Campaign: [{
    id: 'ca1', campaign_id: 'CAMP-1', campaign_name: 'Campagne Signature Hiver',
    channel: 'google_ads', spend: 1000, revenue: 5000, status: 'active',
  }],
  Cashflow: [{ id: 'cf1', date: '2026-01-01', net_cash_flow: 15000, cash_closing: 80000 }],
  Order: [{ id: 'o1', order_id: 'ORD-1', customer_id: 'CLI-1', date: '2026-01-03', total: 250, payment_status: 'paye' }],
  Decision: [{ id: 'd1', title: 'Décision Signature Test', status: 'a_decider', predicted_impact: 5000, confidence_pct: 70 }],
  Report: [{ id: 'r1', type: 'mensuel', period: '2026-01', summary: 'Résumé Signature' }],
  AnalysisRun: [{ id: 'ar1', run_date: '2026-01-15', health_score: 72, dimension_scores: {}, counts: {} }],
};

async function mockBackend(page) {
  await page.route('**/api/apps/**', (route) => {
    const url = route.request().url();
    const entityMatch = url.match(/\/entities\/([A-Za-z]+)/);
    if (entityMatch && FIXTURES[entityMatch[1]]) {
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(FIXTURES[entityMatch[1]]) });
    }
    if (entityMatch) {
      // Entité connue du backend mais sans donnée de test dédiée ici.
      return route.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
    }
    // public-settings, analytics/track, etc. : réponse neutre pour ne pas
    // bloquer l'app sur des appels annexes qui ne sont pas l'objet du test.
    return route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
  });
  await page.goto('/');
  await page.evaluate(() => localStorage.setItem('PLAYWRIGHT_TEST', 'true'));
}

test.describe('Chaque module affiche réellement la donnée importée qui le concerne', () => {
  test.beforeEach(async ({ page }) => {
    await mockBackend(page);
  });

  test('Achats & Fournisseurs affiche Purchase ET Supplier (entités orphelines avant ce module)', async ({ page }) => {
    await page.goto('/achats');
    // Le nom apparaît deux fois : dans le tableau Fournisseurs, et joint sur
    // supplier_id dans le tableau Commandes — la jointure Purchase↔Supplier
    // fonctionne, donc on vérifie au moins une occurrence plutôt qu'une seule.
    await expect(page.getByText('Fournisseur Zenith Signature').first()).toBeVisible();
    await expect(page.getByText('Fournisseur Zenith Signature')).toHaveCount(2);
    // Le statut "retard" de la commande fixture doit apparaître (badge/texte).
    await expect(page.locator('body')).toContainText('En retard');
  });

  test('Décisions affiche les Objectifs (Goal)', async ({ page }) => {
    await page.goto('/decisions');
    await expect(page.getByText('Objectif CA Signature Q1')).toBeVisible();
  });

  test('Historique affiche le Journal des événements (Event)', async ({ page }) => {
    await page.goto('/historique');
    await expect(page.getByText('Rupture Stock Signature')).toBeVisible();
  });

  test('Clients affiche les Interactions', async ({ page }) => {
    await page.goto('/clients');
    await expect(page.getByText('Plainte Signature Livraison')).toBeVisible();
  });

  test('Rapports affiche la Synthèse par succursale (ExecutiveSummary)', async ({ page }) => {
    await page.goto('/rapports');
    await expect(page.getByText('Succursale Signature Nord')).toBeVisible();
  });

  test('Régression : Marketing affiche toujours Campaign', async ({ page }) => {
    await page.goto('/marketing');
    await expect(page.getByText('Campagne Signature Hiver')).toBeVisible();
  });
});
