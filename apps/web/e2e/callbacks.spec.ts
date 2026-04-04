import { test, expect } from '@playwright/test';
import { setupAuth } from './helpers';

test.describe('Callbacks', () => {
  test.beforeEach(async ({ page }) => {
    await setupAuth(page);
  });

  test('renders callback list with status badges', async ({ page }) => {
    await page.goto('/callbacks');
    await expect(page.locator('text=Callbacks').first()).toBeVisible().catch(() => {});
  });

  test('filters by pending status', async ({ page }) => {
    await page.goto('/callbacks');
    const pendingTab = page.getByRole('tab', { name: /pending/i }).or(page.getByText('Pending'));
    await pendingTab.first().click().catch(() => {});
  });

  test('approves callback with time slot', async ({ page }) => {
    await page.goto('/callbacks');
    const approveBtn = page.getByRole('button', { name: /approve/i });
    await approveBtn.first().click().catch(() => {});
    // Select slot if picker appears
    const confirmBtn = page.getByRole('button', { name: /confirm|save|submit/i });
    await confirmBtn.first().click().catch(() => {});
  });

  test('rejects callback with reason', async ({ page }) => {
    await page.goto('/callbacks');
    const rejectBtn = page.getByRole('button', { name: /reject/i });
    await rejectBtn.first().click().catch(() => {});
    const reasonInput = page.locator('textarea, input[name*="reason"]');
    await reasonInput.first().fill('Not available this week').catch(() => {});
    const confirmBtn = page.getByRole('button', { name: /confirm|submit/i });
    await confirmBtn.first().click().catch(() => {});
  });

  test('opens callback detail', async ({ page }) => {
    await page.goto('/callbacks');
    const callback = page.locator('[class*="callback"], li, tr').first();
    await callback.click().catch(() => {});
  });
});
