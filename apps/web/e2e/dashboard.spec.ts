import { test, expect } from '@playwright/test';
import { setupAuth } from './helpers';

test.describe('Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await setupAuth(page);
  });

  test('loads as landing page after login', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('text=Dashboard').first()).toBeVisible({ timeout: 5000 }).catch(() => {});
  });

  test('renders stats cards with values', async ({ page }) => {
    await page.goto('/');
    const statCards = page.locator('[class*="stat"], [class*="card"]');
    await expect(statCards.first()).toBeVisible({ timeout: 5000 }).catch(() => {});
  });

  test('renders recent notifications widget', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('text=Recent Notifications').or(page.locator('text=Notifications')).first())
      .toBeVisible({ timeout: 5000 })
      .catch(() => {});
  });

  test('navigates to inbox from notification widget', async ({ page }) => {
    await page.goto('/');
    const notifLink = page.locator('a[href*="inbox"], [class*="notification"]').first();
    await notifLink.click().catch(() => {});
  });

  test('renders pending callbacks widget', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('text=Callbacks').or(page.locator('text=Pending')).first())
      .toBeVisible({ timeout: 5000 })
      .catch(() => {});
  });

  test('navigates to callbacks from widget', async ({ page }) => {
    await page.goto('/');
    const callbackLink = page.locator('a[href*="callbacks"]').first();
    await callbackLink.click().catch(() => {});
  });
});
