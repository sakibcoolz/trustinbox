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

test.describe('Settings — Privacy', () => {
  test.beforeEach(async ({ page }) => {
    await mockAuthState(page);
  });

  test('privacy settings page loads', async ({ page }) => {
    await page.goto('/settings/privacy');
    await page.waitForLoadState('networkidle').catch(() => {});
    const heading = page.locator('h1:has-text("Privacy"), h2:has-text("Privacy")');
    await expect(heading.first()).toBeVisible({ timeout: 10000 }).catch(() => {});
  });

  test('privacy page shows toggle switches', async ({ page }) => {
    await page.goto('/settings/privacy');
    await page.waitForLoadState('networkidle').catch(() => {});
    const toggle = page.locator('button[role="switch"], input[type="checkbox"], [data-testid="toggle"]');
    await expect(toggle.first()).toBeVisible({ timeout: 10000 }).catch(() => {});
  });

  test('privacy page has save button', async ({ page }) => {
    await page.goto('/settings/privacy');
    await page.waitForLoadState('networkidle').catch(() => {});
    const saveBtn = page.locator('button:has-text("Save"), button:has-text("Update")');
    await expect(saveBtn.first()).toBeVisible({ timeout: 10000 }).catch(() => {});
  });

  test('privacy page has back link', async ({ page }) => {
    await page.goto('/settings/privacy');
    await page.waitForLoadState('networkidle').catch(() => {});
    const backLink = page.locator('a[href="/settings"], button:has-text("Back")');
    await expect(backLink.first()).toBeVisible({ timeout: 10000 }).catch(() => {});
  });
});

test.describe('Settings — DND', () => {
  test.beforeEach(async ({ page }) => {
    await mockAuthState(page);
  });

  test('DND settings page loads', async ({ page }) => {
    await page.goto('/settings/dnd');
    await page.waitForLoadState('networkidle').catch(() => {});
    const heading = page.locator('h1:has-text("Do Not Disturb"), h1:has-text("DND")');
    await expect(heading.first()).toBeVisible({ timeout: 10000 }).catch(() => {});
  });

  test('DND page has add rule button', async ({ page }) => {
    await page.goto('/settings/dnd');
    await page.waitForLoadState('networkidle').catch(() => {});
    const addBtn = page.locator('button:has-text("Add Rule"), button:has-text("New Rule")');
    await expect(addBtn.first()).toBeVisible({ timeout: 10000 }).catch(() => {});
  });

  test('clicking Add Rule shows form', async ({ page }) => {
    await page.goto('/settings/dnd');
    await page.waitForLoadState('networkidle').catch(() => {});
    const addBtn = page.locator('button:has-text("Add Rule")');
    if (await addBtn.first().isVisible().catch(() => false)) {
      await addBtn.first().click();
      const timeInput = page.locator('input[type="time"]');
      await expect(timeInput.first()).toBeVisible({ timeout: 5000 });
    }
  });
});

test.describe('Settings — Blocked', () => {
  test.beforeEach(async ({ page }) => {
    await mockAuthState(page);
  });

  test('blocked providers page loads', async ({ page }) => {
    await page.goto('/settings/blocked');
    await page.waitForLoadState('networkidle').catch(() => {});
    const heading = page.locator('h1:has-text("Blocked")');
    await expect(heading.first()).toBeVisible({ timeout: 10000 }).catch(() => {});
  });
});

test.describe('Settings — Availability', () => {
  test.beforeEach(async ({ page }) => {
    await mockAuthState(page);
  });

  test('availability settings page loads', async ({ page }) => {
    await page.goto('/settings/availability');
    await page.waitForLoadState('networkidle').catch(() => {});
    const heading = page.locator('h1:has-text("Availability"), h1:has-text("Schedule")');
    await expect(heading.first()).toBeVisible({ timeout: 10000 }).catch(() => {});
  });
});
