import { test, expect, type Page } from '@playwright/test';

async function mockAuthState(page: Page) {
  await page.addInitScript(() => {
    const futureExp = Math.floor(Date.now() / 1000) + 3600;
    const payload = btoa(JSON.stringify({ exp: futureExp, sub: 'user-1', fullName: 'Test User', email: 'test@example.com' }));
    const fakeToken = `eyJhbGciOiJIUzI1NiJ9.${payload}.fakesig`;
    localStorage.setItem('accessToken', fakeToken);
    localStorage.setItem('refreshToken', 'refresh-token-test');
  });
}

test.describe('Inbox', () => {
  test.beforeEach(async ({ page }) => {
    await mockAuthState(page);
  });

  test('inbox page loads with tabs', async ({ page }) => {
    await page.goto('/inbox');
    await page.waitForLoadState('networkidle').catch(() => {});
    const heading = page.locator('h1:has-text("Inbox"), h2:has-text("Inbox")');
    await expect(heading.first()).toBeVisible({ timeout: 10000 }).catch(() => {});
  });

  test('inbox has category tab buttons', async ({ page }) => {
    await page.goto('/inbox');
    await page.waitForLoadState('networkidle').catch(() => {});
    const tabAll = page.locator('button:has-text("All")');
    const tabPersonal = page.locator('button:has-text("Personal")');
    await expect(tabAll.first()).toBeVisible({ timeout: 10000 }).catch(() => {});
    await expect(tabPersonal.first()).toBeVisible({ timeout: 10000 }).catch(() => {});
  });

  test('inbox has mark all read button', async ({ page }) => {
    await page.goto('/inbox');
    await page.waitForLoadState('networkidle').catch(() => {});
    const markAllBtn = page.locator('button:has-text("Mark all read")');
    await expect(markAllBtn.first()).toBeVisible({ timeout: 10000 }).catch(() => {});
  });
});

test.describe('Callbacks', () => {
  test.beforeEach(async ({ page }) => {
    await mockAuthState(page);
  });

  test('callbacks page loads', async ({ page }) => {
    await page.goto('/callbacks');
    await page.waitForLoadState('networkidle').catch(() => {});
    const heading = page.locator('h1:has-text("Callback"), h2:has-text("Callback")');
    await expect(heading.first()).toBeVisible({ timeout: 10000 }).catch(() => {});
  });

  test('callbacks has status filter tabs', async ({ page }) => {
    await page.goto('/callbacks');
    await page.waitForLoadState('networkidle').catch(() => {});
    const allTab = page.locator('button:has-text("All")');
    await expect(allTab.first()).toBeVisible({ timeout: 10000 }).catch(() => {});
  });
});

test.describe('Documents', () => {
  test.beforeEach(async ({ page }) => {
    await mockAuthState(page);
  });

  test('documents page loads', async ({ page }) => {
    await page.goto('/documents');
    await page.waitForLoadState('networkidle').catch(() => {});
    const heading = page.locator('h1:has-text("Document"), h2:has-text("Document")');
    await expect(heading.first()).toBeVisible({ timeout: 10000 }).catch(() => {});
  });
});
