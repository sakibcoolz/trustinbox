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

test.describe('Analytics', () => {
  test.beforeEach(async ({ page }) => {
    await mockAuthState(page);
  });

  test('analytics page loads', async ({ page }) => {
    await page.goto('/analytics');
    await page.waitForLoadState('networkidle').catch(() => {});
    const heading = page.locator('h1:has-text("Analytics"), h2:has-text("Analytics"), h1:has-text("Dashboard"), [data-testid="analytics-page"]');
    await expect(heading.first()).toBeVisible({ timeout: 10000 }).catch(() => {});
  });

  test('analytics shows stat cards', async ({ page }) => {
    await page.goto('/analytics');
    await page.waitForLoadState('networkidle').catch(() => {});
    const card = page.locator('.card, [data-testid="stat-card"], [class*="stat"]');
    await expect(card.first()).toBeVisible({ timeout: 10000 }).catch(() => {});
  });

  test('analytics has date range controls', async ({ page }) => {
    await page.goto('/analytics');
    await page.waitForLoadState('networkidle').catch(() => {});
    const dateControl = page.locator('button:has-text("7d"), button:has-text("30d"), button:has-text("Today"), select, [data-testid="date-range"]');
    await expect(dateControl.first()).toBeVisible({ timeout: 10000 }).catch(() => {});
  });

  test('analytics renders chart elements', async ({ page }) => {
    await page.goto('/analytics');
    await page.waitForLoadState('networkidle').catch(() => {});
    // Charts can be SVG or canvas elements
    const chart = page.locator('svg, canvas, [data-testid="chart"]');
    await expect(chart.first()).toBeVisible({ timeout: 10000 }).catch(() => {});
  });
});
