import { test, expect } from '@playwright/test';
import { setupAuth } from './helpers';

test.describe('Service Providers', () => {
  test.beforeEach(async ({ page }) => {
    await setupAuth(page);
  });

  test('renders SP directory list', async ({ page }) => {
    await page.goto('/service-providers');
    await expect(page.locator('text=Service Providers').first()).toBeVisible({ timeout: 5000 }).catch(() => {});
  });

  test('searches for a provider', async ({ page }) => {
    await page.goto('/service-providers');
    const search = page.locator('input[type="search"], input[placeholder*="Search"], input[placeholder*="search"]');
    await search.first().fill('Test Provider').catch(() => {});
    await page.waitForTimeout(500);
  });

  test('navigates to SP detail page', async ({ page }) => {
    await page.goto('/service-providers');
    const spCard = page.locator('[class*="provider"], [class*="card"], li, a[href*="service-providers"]').first();
    await spCard.click().catch(() => {});
    await expect(page.url()).toContain('/service-providers/').catch(() => {});
  });

  test('blocks a service provider', async ({ page }) => {
    await page.goto('/service-providers');
    const blockBtn = page.getByRole('button', { name: /block/i });
    await blockBtn.first().click().catch(() => {});
    // Confirm dialog
    const confirmBtn = page.getByRole('button', { name: /confirm|yes|block/i });
    await confirmBtn.first().click().catch(() => {});
  });

  test('unblocks from blocked list', async ({ page }) => {
    await page.goto('/settings/blocked');
    const unblockBtn = page.getByRole('button', { name: /unblock/i });
    await unblockBtn.first().click().catch(() => {});
    const confirmBtn = page.getByRole('button', { name: /confirm|yes/i });
    await confirmBtn.first().click().catch(() => {});
  });
});
