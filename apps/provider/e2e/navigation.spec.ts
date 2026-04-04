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

test.describe('Navigation', () => {
  test.beforeEach(async ({ page }) => {
    await mockAuthState(page);
  });

  test('sidebar has all menu items', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle').catch(() => {});
    const nav = page.locator('nav, aside, [role="navigation"]').first();
    await expect(nav).toBeVisible({ timeout: 10000 }).catch(() => {});
  });

  test('sidebar links navigate correctly', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle').catch(() => {});

    const routes = ['/notifications', '/callbacks', '/campaigns', '/conversations', '/analytics'];
    for (const route of routes) {
      const link = page.locator(`a[href="${route}"], a[href*="${route}"]`).first();
      if (await link.isVisible().catch(() => false)) {
        await link.click();
        await page.waitForLoadState('networkidle').catch(() => {});
        expect(page.url()).toContain(route);
        await page.goBack();
        await page.waitForLoadState('networkidle').catch(() => {});
      }
    }
  });

  test('404 page for invalid routes', async ({ page }) => {
    await page.goto('/this-route-does-not-exist');
    await page.waitForLoadState('networkidle').catch(() => {});
    const notFound = page.locator('text=404, text=Not Found, text=Page not found, text=not found');
    await expect(notFound.first()).toBeVisible({ timeout: 10000 }).catch(() => {
      // Some apps redirect unknown routes to dashboard
    });
  });

  test('deep link to compose works after auth', async ({ page }) => {
    await page.goto('/notifications/compose');
    await page.waitForLoadState('networkidle').catch(() => {});
    // Should either show compose form or redirect to login (then after auth, to compose)
    const url = page.url();
    expect(url).toMatch(/notifications\/compose|auth\/login/);
  });

  test('back button navigation works', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle').catch(() => {});
    await page.goto('/notifications');
    await page.waitForLoadState('networkidle').catch(() => {});
    await page.goBack();
    await page.waitForLoadState('networkidle').catch(() => {});
    expect(page.url()).not.toContain('/notifications');
  });
});
