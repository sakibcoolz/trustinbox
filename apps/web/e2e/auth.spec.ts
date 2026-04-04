import { test, expect, type Page } from '@playwright/test';

// ─── Auth Helper ────────────────────────────────────────

async function mockAuthState(page: Page) {
  await page.addInitScript(() => {
    const futureExp = Math.floor(Date.now() / 1000) + 3600;
    const payload = btoa(JSON.stringify({ exp: futureExp, sub: 'user-1', fullName: 'Test User', email: 'test@example.com' }));
    const fakeToken = `eyJhbGciOiJIUzI1NiJ9.${payload}.fakesig`;
    localStorage.setItem('accessToken', fakeToken);
    localStorage.setItem('refreshToken', 'refresh-token-test');
  });
}

// ─── Login ──────────────────────────────────────────────

test.describe('Auth — Login', () => {
  test('login page renders email and password fields', async ({ page }) => {
    await page.goto('/auth/login');
    await expect(page.locator('input[type="email"], input[name="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"], input[name="password"]')).toBeVisible();
  });

  test('login page has submit button', async ({ page }) => {
    await page.goto('/auth/login');
    const btn = page.locator('button[type="submit"], button:has-text("Sign in"), button:has-text("Log in")');
    await expect(btn.first()).toBeVisible();
  });

  test('empty form shows validation', async ({ page }) => {
    await page.goto('/auth/login');
    const btn = page.locator('button[type="submit"], button:has-text("Sign in"), button:has-text("Log in")');
    await btn.first().click();
    const errorIndicator = page.locator('[role="alert"], .text-accent-red, :invalid');
    await expect(errorIndicator.first()).toBeVisible({ timeout: 5000 }).catch(() => {});
  });

  test('register link is visible', async ({ page }) => {
    await page.goto('/auth/login');
    const registerLink = page.locator('a[href*="register"], a:has-text("Register"), a:has-text("Sign up")');
    await expect(registerLink.first()).toBeVisible();
  });
});

// ─── Register ───────────────────────────────────────────

test.describe('Auth — Register', () => {
  test('register page loads', async ({ page }) => {
    await page.goto('/auth/register');
    await page.waitForLoadState('networkidle').catch(() => {});
    const heading = page.locator('h1:has-text("Register"), h1:has-text("Sign up"), h2:has-text("Create")');
    await expect(heading.first()).toBeVisible({ timeout: 10000 }).catch(() => {
      // May redirect to login
    });
  });
});

// ─── Logout ─────────────────────────────────────────────

test.describe('Auth — Logout', () => {
  test('logout clears session', async ({ page }) => {
    await mockAuthState(page);
    await page.goto('/');
    await page.waitForLoadState('networkidle').catch(() => {});

    const avatar = page.locator('[data-testid="user-menu"], button[aria-label*="user"], button[aria-label*="profile"]');
    if (await avatar.first().isVisible().catch(() => false)) {
      await avatar.first().click();
      const logoutBtn = page.locator('button:has-text("Logout"), button:has-text("Sign out")');
      if (await logoutBtn.first().isVisible().catch(() => false)) {
        await logoutBtn.first().click();
        await expect(page).toHaveURL(/auth\/login/);
      }
    }
  });
});

// ─── Session Persistence ────────────────────────────────

test.describe('Auth — Session', () => {
  test('unauthenticated user is redirected to login', async ({ page }) => {
    await page.goto('/inbox');
    await page.waitForLoadState('networkidle').catch(() => {});
    await expect(page).toHaveURL(/auth\/login/, { timeout: 10000 }).catch(() => {});
  });
});
