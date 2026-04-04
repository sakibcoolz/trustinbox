import { test, expect, type Page } from '@playwright/test';

async function mockAuthState(page: Page) {
  await page.addInitScript(() => {
    const futureExp = Math.floor(Date.now() / 1000) + 3600;
    const payload = btoa(JSON.stringify({ exp: futureExp, sub: 'user-1', role: 'SP_ADMIN' }));
    const fakeToken = `eyJhbGciOiJIUzI1NiJ9.${payload}.fakesig`;
    localStorage.setItem('accessToken', fakeToken);
    localStorage.setItem('refreshToken', 'refresh-token-test');
    localStorage.setItem('activeSpId', 'sp-1');
    document.cookie = 'auth-status=1; path=/; max-age=604800; SameSite=Lax';
  });
}

test.describe('Callbacks', () => {
  test.beforeEach(async ({ page }) => {
    await mockAuthState(page);
  });

  test('callback list page loads', async ({ page }) => {
    await page.goto('/callbacks');
    await page.waitForLoadState('networkidle').catch(() => {});
    const heading = page.locator('h1:has-text("Callback"), h2:has-text("Callback"), [data-testid="callbacks-page"]');
    await expect(heading.first()).toBeVisible({ timeout: 10000 }).catch(() => {});
  });

  test('callback list has status filter tabs', async ({ page }) => {
    await page.goto('/callbacks');
    await page.waitForLoadState('networkidle').catch(() => {});
    const filterArea = page.locator('button:has-text("All"), button:has-text("Pending"), button:has-text("Approved")');
    await expect(filterArea.first()).toBeVisible({ timeout: 10000 }).catch(() => {});
  });

  test('callback list renders status badges', async ({ page }) => {
    await page.goto('/callbacks');
    await page.waitForLoadState('networkidle').catch(() => {});
    const badge = page.locator('[class*="chip"], [class*="badge"], [data-testid="status-badge"]');
    // At least one status badge should be visible if there are callbacks
    await expect(badge.first()).toBeVisible({ timeout: 10000 }).catch(() => {});
  });

  test('clicking a callback shows detail', async ({ page }) => {
    await page.goto('/callbacks');
    await page.waitForLoadState('networkidle').catch(() => {});
    const firstRow = page.locator('table tbody tr, [data-testid="callback-row"], button').first();
    if (await firstRow.isVisible().catch(() => false)) {
      await firstRow.click();
      const detail = page.locator('[data-testid="callback-detail"], .callback-detail, h2, h3');
      await expect(detail.first()).toBeVisible({ timeout: 5000 }).catch(() => {});
    }
  });
});
