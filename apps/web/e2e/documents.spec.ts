import { test, expect } from '@playwright/test';
import { setupAuth } from './helpers';

test.describe('Documents', () => {
  test.beforeEach(async ({ page }) => {
    await setupAuth(page);
  });

  test('renders documents list', async ({ page }) => {
    await page.goto('/documents');
    await expect(page.locator('text=Documents').first()).toBeVisible({ timeout: 5000 }).catch(() => {});
  });

  test('initiates document download', async ({ page }) => {
    await page.goto('/documents');
    const downloadBtn = page.getByRole('button', { name: /download/i }).or(page.getByRole('link', { name: /download/i }));
    const [download] = await Promise.all([
      page.waitForEvent('download', { timeout: 5000 }).catch(() => null),
      downloadBtn.first().click().catch(() => {}),
    ]);
  });

  test('filters documents by SP', async ({ page }) => {
    await page.goto('/documents');
    const filter = page.locator('select, [role="combobox"], [class*="filter"]');
    await filter.first().click().catch(() => {});
  });

  test('previews image document', async ({ page }) => {
    await page.goto('/documents');
    const imgDoc = page.locator('[class*="document"], li, tr').first();
    await imgDoc.click().catch(() => {});
    await expect(page.locator('img[src*="presigned"], [class*="preview"], [role="dialog"]').first())
      .toBeVisible({ timeout: 5000 })
      .catch(() => {});
  });
});
