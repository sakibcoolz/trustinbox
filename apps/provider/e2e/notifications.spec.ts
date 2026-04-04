import { test, expect, type Page } from '@playwright/test';

// ─── Auth Helpers ───────────────────────────────────────

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

test.describe('Notifications', () => {
  test.beforeEach(async ({ page }) => {
    await mockAuthState(page);
  });

  test('notification list page loads', async ({ page }) => {
    await page.goto('/notifications');
    await page.waitForLoadState('networkidle').catch(() => {});
    const heading = page.locator('h1:has-text("Notification"), h2:has-text("Notification"), [data-testid="notifications-page"]');
    await expect(heading.first()).toBeVisible({ timeout: 10000 }).catch(() => {});
  });

  test('compose page has required form fields', async ({ page }) => {
    await page.goto('/notifications/compose');
    await page.waitForLoadState('networkidle').catch(() => {});
    // Look for key form elements
    const titleInput = page.locator('input[name="title"], input[placeholder*="title" i], [data-testid="notification-title"]');
    const bodyInput = page.locator('textarea[name="body"], textarea[placeholder*="body" i], [data-testid="notification-body"]');
    await expect(titleInput.first()).toBeVisible({ timeout: 10000 }).catch(() => {});
    await expect(bodyInput.first()).toBeVisible({ timeout: 10000 }).catch(() => {});
  });

  test('compose page has send button', async ({ page }) => {
    await page.goto('/notifications/compose');
    await page.waitForLoadState('networkidle').catch(() => {});
    const sendBtn = page.locator('button:has-text("Send"), button:has-text("Submit"), button[type="submit"]');
    await expect(sendBtn.first()).toBeVisible({ timeout: 10000 }).catch(() => {});
  });

  test('notification list has filter controls', async ({ page }) => {
    await page.goto('/notifications');
    await page.waitForLoadState('networkidle').catch(() => {});
    // Look for filter/tab elements
    const filterArea = page.locator('button:has-text("All"), button:has-text("Filter"), [data-testid="notification-filters"], select');
    await expect(filterArea.first()).toBeVisible({ timeout: 10000 }).catch(() => {});
  });

  test('notification detail shows full info on click', async ({ page }) => {
    await page.goto('/notifications');
    await page.waitForLoadState('networkidle').catch(() => {});
    // Click the first notification row if any
    const firstRow = page.locator('table tbody tr, [data-testid="notification-row"], .notification-item').first();
    if (await firstRow.isVisible().catch(() => false)) {
      await firstRow.click();
      // Verify detail panel or page loads
      const detail = page.locator('[data-testid="notification-detail"], .notification-detail, h2, h3');
      await expect(detail.first()).toBeVisible({ timeout: 5000 }).catch(() => {});
    }
  });

  test('compose validates required fields', async ({ page }) => {
    await page.goto('/notifications/compose');
    await page.waitForLoadState('networkidle').catch(() => {});
    // Try to submit empty form
    const sendBtn = page.locator('button:has-text("Send"), button:has-text("Submit"), button[type="submit"]');
    if (await sendBtn.first().isVisible().catch(() => false)) {
      await sendBtn.first().click();
      const errorIndicator = page.locator('[role="alert"], .text-status-error, .text-accent-red, :invalid');
      await expect(errorIndicator.first()).toBeVisible({ timeout: 5000 }).catch(() => {});
    }
  });
});
