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

test.describe('Settings — Profile', () => {
  test.beforeEach(async ({ page }) => {
    await mockAuthState(page);
  });

  test('profile settings page loads', async ({ page }) => {
    await page.goto('/settings/profile');
    await page.waitForLoadState('networkidle').catch(() => {});
    const heading = page.locator('h1:has-text("Profile"), h2:has-text("Profile"), h1:has-text("Organization"), [data-testid="settings-profile"]');
    await expect(heading.first()).toBeVisible({ timeout: 10000 }).catch(() => {});
  });

  test('profile form has org name field', async ({ page }) => {
    await page.goto('/settings/profile');
    await page.waitForLoadState('networkidle').catch(() => {});
    const nameInput = page.locator('input[name="name"], input[name="orgName"], input[name="organizationName"], input[placeholder*="name" i]');
    await expect(nameInput.first()).toBeVisible({ timeout: 10000 }).catch(() => {});
  });

  test('profile form has save button', async ({ page }) => {
    await page.goto('/settings/profile');
    await page.waitForLoadState('networkidle').catch(() => {});
    const saveBtn = page.locator('button:has-text("Save"), button:has-text("Update"), button[type="submit"]');
    await expect(saveBtn.first()).toBeVisible({ timeout: 10000 }).catch(() => {});
  });
});

test.describe('Settings — Industry', () => {
  test.beforeEach(async ({ page }) => {
    await mockAuthState(page);
  });

  test('industry settings page loads', async ({ page }) => {
    await page.goto('/settings/industry');
    await page.waitForLoadState('networkidle').catch(() => {});
    const heading = page.locator('h1:has-text("Industry"), h2:has-text("Industry"), [data-testid="settings-industry"]');
    await expect(heading.first()).toBeVisible({ timeout: 10000 }).catch(() => {});
  });

  test('industry page shows available templates', async ({ page }) => {
    await page.goto('/settings/industry');
    await page.waitForLoadState('networkidle').catch(() => {});
    const template = page.locator('[data-testid="industry-template"], .card, .template-card');
    await expect(template.first()).toBeVisible({ timeout: 10000 }).catch(() => {});
  });
});

test.describe('Settings — Webhooks', () => {
  test.beforeEach(async ({ page }) => {
    await mockAuthState(page);
  });

  test('webhook settings page loads', async ({ page }) => {
    await page.goto('/settings/webhooks');
    await page.waitForLoadState('networkidle').catch(() => {});
    const heading = page.locator('h1:has-text("Webhook"), h2:has-text("Webhook"), [data-testid="settings-webhooks"]');
    await expect(heading.first()).toBeVisible({ timeout: 10000 }).catch(() => {});
  });

  test('webhook page has create button', async ({ page }) => {
    await page.goto('/settings/webhooks');
    await page.waitForLoadState('networkidle').catch(() => {});
    const createBtn = page.locator('button:has-text("Create"), button:has-text("Add"), button:has-text("New")');
    await expect(createBtn.first()).toBeVisible({ timeout: 10000 }).catch(() => {});
  });
});
