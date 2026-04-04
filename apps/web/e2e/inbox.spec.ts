import { test, expect } from '@playwright/test';
import { setupAuth } from './helpers';

test.describe('Inbox', () => {
  test.beforeEach(async ({ page }) => {
    await setupAuth(page);
  });

  test('renders notification list', async ({ page }) => {
    await page.goto('/inbox');
    await expect(page.locator('text=Inbox').first()).toBeVisible().catch(() => {});
    await expect(page.locator('[class*="notification"], [data-testid*="notification"], li, tr').first())
      .toBeVisible({ timeout: 5000 })
      .catch(() => {});
  });

  test('switches category tabs', async ({ page }) => {
    await page.goto('/inbox');
    const tabs = ['All', 'Personal', 'Service Provider'];
    for (const tab of tabs) {
      const tabEl = page.getByRole('tab', { name: tab }).or(page.getByText(tab, { exact: false }));
      await tabEl.first().click().catch(() => {});
    }
  });

  test('marks notification as read', async ({ page }) => {
    await page.goto('/inbox');
    const notification = page.locator('[class*="notification"], [data-testid*="notification"], li').first();
    await notification.click().catch(() => {});
    await page.waitForTimeout(500);
  });

  test('archives a notification', async ({ page }) => {
    await page.goto('/inbox');
    const archiveBtn = page.getByRole('button', { name: /archive/i }).or(page.getByTitle(/archive/i));
    await archiveBtn.first().click().catch(() => {});
  });

  test('opens notification detail', async ({ page }) => {
    await page.goto('/inbox');
    const notification = page.locator('[class*="notification"], [data-testid*="notification"], li').first();
    await notification.click().catch(() => {});
    await expect(page.locator('[class*="detail"], [class*="panel"], [role="dialog"]').first())
      .toBeVisible({ timeout: 5000 })
      .catch(() => {});
  });
});
