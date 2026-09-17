import { test, expect } from '@playwright/test';

test.describe('Onboarding and LLM Audit', () => {
  let errors = [];

  test.beforeEach(async ({ page }) => {
    errors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(`Console Error: ${msg.text()}`);
      }
    });
    page.on('pageerror', exception => {
      errors.push(`Uncaught Error: ${exception}`);
    });
  });

  test('Should execute Auto-remplir (InvokeLLM) without crashing', async ({ page }) => {
    // 1. Mock authentication endpoints
    await page.route('**/api/apps/*/auth/me', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ id: 'mock-user', email: 'test@example.com' })
      });
    });

    await page.route('**/api/entities/Company*', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ items: [] })
      });
    });

    await page.route('**/*enrichFromWebsite*', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          company_info: {
            name: "Test Corp",
            sector: "Technologie",
            business_model: "B2B",
            products: "Logiciels",
            services: "Consultation",
            clientele: "Entreprises"
          }
        })
      });
    });

    // Execute real LLM request without mocking

    // 2. Go straight to onboarding    // Set local storage directly and navigate
    await page.goto('http://localhost:5173/');
    await page.evaluate(() => {
      localStorage.setItem('PLAYWRIGHT_TEST', 'true');
    });
    
    // Manually go to onboarding
    await page.goto('/onboarding');
    
    // Verify we are actually on onboarding by looking for step 1 title
    await page.waitForTimeout(2000);
    await page.screenshot({ path: 'onboarding-screen.png' });
    await expect(page.locator('h2').filter({ hasText: "Identit" })).toBeVisible({ timeout: 10000 });

    // 3. Fill website
    await page.fill('input[placeholder*="monsite.ca"]', 'https://www.base44.com');
    
    // 4. Click Auto-remplir
    await page.click('button:has-text("Auto-remplir")');

    // 5. Wait for the LLM to finish
    await page.waitForSelector('text="Recherche…"', { state: 'hidden', timeout: 30000 });

    // 6. Check for crash or SDK errors
    const toastError = page.locator('.bg-destructive, [role="alert"]').filter({ hasText: 'Erreur:' });
    if (await toastError.count() > 0) {
      const errorText = await toastError.first().innerText();
      errors.push(`Toast Error detected: ${errorText}`);
    }

    expect(errors).toEqual([]);
  });
});
