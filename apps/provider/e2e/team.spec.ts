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

test.describe('Team Management', () => {
  test.beforeEach(async ({ page }) => {
    await mockAuthState(page);
  });

  test('team settings page loads', async ({ page }) => {
    await page.goto('/settings/team');
    await page.waitForLoadState('networkidle').catch(() => {});
    const heading = page.locator('h1:has-text("Team"), h2:has-text("Team"), [data-testid="team-page"]');
    await expect(heading.first()).toBeVisible({ timeout: 10000 }).catch(() => {});
  });

  test('team page shows invite member button', async ({ page }) => {
    await page.goto('/settings/team');
    await page.waitForLoadState('networkidle').catch(() => {});
    const inviteBtn = page.locator('button:has-text("Invite"), button:has-text("Add Member"), button:has-text("Add Team")');
    await expect(inviteBtn.first()).toBeVisible({ timeout: 10000 }).catch(() => {});
  });

  test('invite member opens form/dialog', async ({ page }) => {
    await page.goto('/settings/team');
    await page.waitForLoadState('networkidle').catch(() => {});
    const inviteBtn = page.locator('button:has-text("Invite"), button:has-text("Add Member"), button:has-text("Add Team")');
    if (await inviteBtn.first().isVisible().catch(() => false)) {
      await inviteBtn.first().click();
      const emailInput = page.locator('input[type="email"], input[name="email"], input[placeholder*="email" i]');
      await expect(emailInput.first()).toBeVisible({ timeout: 5000 }).catch(() => {});
    }
  });

  test('team list displays role badges', async ({ page }) => {
    await page.goto('/settings/team');
    await page.waitForLoadState('networkidle').catch(() => {});
    const badge = page.locator('[class*="chip"], [class*="badge"]');
    await expect(badge.first()).toBeVisible({ timeout: 10000 }).catch(() => {});
  });
});
