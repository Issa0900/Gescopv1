# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: audit.spec.js >> Global Crash Audit >> Page /radar should not crash
- Location: tests\audit.spec.js:62:5

# Error details

```
Error: page.goto: net::ERR_CONNECTION_REFUSED at http://localhost:5173/
Call log:
  - navigating to "http://localhost:5173/", waiting until "load"

```

# Test source

```ts
  1  | import { test, expect } from '@playwright/test';
  2  | 
  3  | const PAGES = [
  4  |   '/',
  5  |   '/insights',
  6  |   '/previsions',
  7  |   '/simulateur',
  8  |   '/decisions',
  9  |   '/historique',
  10 |   '/importer',
  11 |   '/audit',
  12 |   '/clients',
  13 |   '/produits',
  14 |   '/marketing',
  15 |   '/rh',
  16 |   '/tresorerie',
  17 |   '/finance',
  18 |   '/kpis',
  19 |   '/anomalies',
  20 |   '/risques',
  21 |   '/recommandations',
  22 |   '/radar',
  23 |   '/taches',
  24 |   '/alertes',
  25 |   '/rapports',
  26 |   '/assistant',
  27 |   '/parametres',
  28 |   '/manuel'
  29 | ];
  30 | 
  31 | test.describe('Global Crash Audit', () => {
  32 |   let errors = [];
  33 | 
  34 |   test.beforeEach(async ({ page }) => {
  35 |     errors = [];
  36 |     page.on('console', msg => {
  37 |       if (msg.type() === 'error') {
  38 |         errors.push(`Console error: ${msg.text()}`);
  39 |       }
  40 |     });
  41 |     page.on('pageerror', exception => {
  42 |       errors.push(`Uncaught error: ${exception}`);
  43 |     });
  44 | 
  45 |     // We must mock the metrics and alerts so that pages load safely if they fetch them
  46 |     await page.route('**/api/entities/**', route => {
  47 |       route.fulfill({
  48 |         status: 200,
  49 |         contentType: 'application/json',
  50 |         body: JSON.stringify({ items: [] })
  51 |       });
  52 |     });
  53 | 
  54 |     // Authenticate backdoor
> 55 |     await page.goto('http://localhost:5173/');
     |                ^ Error: page.goto: net::ERR_CONNECTION_REFUSED at http://localhost:5173/
  56 |     await page.evaluate(() => {
  57 |       localStorage.setItem('PLAYWRIGHT_TEST', 'true');
  58 |     });
  59 |   });
  60 | 
  61 |   for (const p of PAGES) {
  62 |     test(`Page ${p} should not crash`, async ({ page }) => {
  63 |       await page.goto(`http://localhost:5175${p}`);
  64 |       
  65 |       // Wait for a core element to be visible (e.g. sidebar or main title)
  66 |       // Or just wait 2 seconds for any React render cycle to complete and potentially crash
  67 |       await page.waitForTimeout(2000);
  68 |       
  69 |       expect(errors).toEqual([]);
  70 |     });
  71 |   }
  72 | });
  73 | 
```