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

    // We must mock the metrics and alerts so that pages load safely if they fetch them
    await page.route('**/api/entities/**', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ items: [] })
      });
    });

    // Authenticate backdoor
    await page.goto('http://localhost:5175/');
    await page.evaluate(() => {
      localStorage.setItem('PLAYWRIGHT_TEST', 'true');
    });
  });

  for (const p of PAGES) {
    test(`Page ${p} should not crash`, async ({ page }) => {
      await page.goto(`http://localhost:5175${p}`);
      
      // Wait for a core element to be visible (e.g. sidebar or main title)
      // Or just wait 2 seconds for any React render cycle to complete and potentially crash
      await page.waitForTimeout(2000);
      
      expect(errors).toEqual([]);
    });
  }
});
