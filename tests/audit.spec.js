import { test, expect } from '@playwright/test';

const PAGES = [
  '/',
  '/insights',
  '/previsions',
  '/simulateur',
  '/decisions',
  '/historique',
  '/importer',
  '/audit',
  '/clients',
  '/produits',
  '/marketing',
  '/rh',
  '/achats',
  '/tresorerie',
  '/finance',
  '/kpis',
  '/anomalies',
  '/risques',
  '/recommandations',
  '/radar',
  '/taches',
  '/alertes',
  '/rapports',
  '/assistant',
  '/parametres',
  '/manuel'
];

test.describe('Global Crash Audit', () => {
  let errors = [];

  test.beforeEach(async ({ page }) => {
    errors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(`Console error: ${msg.text()}`);
      }
    });
    page.on('pageerror', exception => {
      errors.push(`Uncaught error: ${exception}`);
    });

    // We must mock the metrics and alerts so that pages load safely if they fetch them.
    // Bug fixé : le vrai chemin d'appel du SDK est /api/apps/{appId}/entities/{Entity}
    // (voir @base44/sdk/dist/modules/entities.js), pas /api/entities/** — ce glob ne
    // matchait donc jamais aucune requête réelle, et list() attend un tableau brut en
    // réponse (le SDK retourne response.data tel quel), pas { items: [] }.
    await page.route('**/api/apps/**', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: route.request().url().includes('/entities/') ? '[]' : '{}',
      });
    });

    // Le logo (BrandLogo.jsx) est hébergé sur base44.com/media.base44.com/
    // wixstatic.com : un environnement dont le trafic HTTPS sortant passe par
    // un proxy (CA non reconnue par Chromium) fait échouer ces requêtes en
    // ERR_CERT_AUTHORITY_INVALID, un faux positif de crash sans rapport avec
    // le code de l'app. On neutralise ces hôtes externes pour que ce test
    // reste déterministe quel que soit l'environnement réseau.
    await page.route(/^https:\/\/(base44\.com|media\.base44\.com|static\.wixstatic\.com)\//, route => {
      route.fulfill({ status: 200, contentType: 'image/svg+xml', body: '<svg xmlns="http://www.w3.org/2000/svg"/>' });
    });

    // Authenticate backdoor. Bug fixé : ce goto ciblait le port 5173 alors que
    // les tests naviguent ensuite sur 5175 (baseURL de playwright.config.js) —
    // localStorage étant scopé par origine, le backdoor ne s'appliquait jamais
    // et chaque page se heurtait au vrai mur d'authentification en silence.
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.setItem('PLAYWRIGHT_TEST', 'true');
    });
  });

  for (const p of PAGES) {
    test(`Page ${p} should not crash`, async ({ page }) => {
      await page.goto(p);
      
      // Wait for a core element to be visible (e.g. sidebar or main title)
      // Or just wait 2 seconds for any React render cycle to complete and potentially crash
      await page.waitForTimeout(2000);
      
      expect(errors).toEqual([]);
    });
  }
});
