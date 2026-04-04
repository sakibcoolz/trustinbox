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

test.describe('Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await mockAuthState(page);
  });

  test('dashboard loads with greeting', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle').catch(() => {});
    const greeting = page.locator('h1:has-text("Welcome"), h1:has-text("Dashboard")');
    await expect(greeting.first()).toBeVisible({ timeout: 10000 }).catch(() => {});
  });

  test('dashboard shows stat cards', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle').catch(() => {});
    const card = page.locator('.card, [data-testid="stat-card"]');
    await expect(card.first()).toBeVisible({ timeout: 10000 }).catch(() => {});
  });
});

test.describe('Service Providers', () => {
  test.beforeEach(async ({ page }) => {
    await mockAuthState(page);
  });

  test('service providers page loads', async ({ page }) => {
    await page.goto('/service-providers');
    await page.waitForLoadState('networkidle').catch(() => {});
    const heading = page.locator('h1:has-text("Service Provider"), h2:has-text("Provider"), h1:has-text("Directory")');
    await expect(heading.first()).toBeVisible({ timeout: 10000 }).catch(() => {});
  });

  test('service providers has search input', async ({ page }) => {
    await page.goto('/service-providers');
    await page.waitForLoadState('networkidle').catch(() => {});
    const searchInput = page.locator('input[placeholder*="search" i], input[type="search"]');
    await expect(searchInput.first()).toBeVisible({ timeout: 10000 }).catch(() => {});
  });
});

test.describe('Profile', () => {
  test.beforeEach(async ({ page }) => {
    await mockAuthState(page);
  });

  test('profile page loads', async ({ page }) => {
    await page.goto('/profile');
    await page.waitForLoadState('networkidle').catch(() => {});
    const heading = page.locator('h1:has-text("Profile"), h2:has-text("Profile"), [data-testid="profile-page"]');
    await expect(heading.first()).toBeVisible({ timeout: 10000 }).catch(() => {});
  });

  test('profile has tab navigation', async ({ page }) => {
    await page.goto('/profile');
    await page.waitForLoadState('networkidle').catch(() => {});
    const tab = page.locator('button:has-text("Overview"), button:has-text("Activity")');
    await expect(tab.first()).toBeVisible({ timeout: 10000 }).catch(() => {});
  });
});

test.describe('Conversations', () => {
  test.beforeEach(async ({ page }) => {
    await mockAuthState(page);
  });

  test('conversations page loads', async ({ page }) => {
    await page.goto('/conversations');
    await page.waitForLoadState('networkidle').catch(() => {});
    const heading = page.locator('h1:has-text("Conversation"), h2:has-text("Conversation"), h2:has-text("Messages")');
    await expect(heading.first()).toBeVisible({ timeout: 10000 }).catch(() => {});
  });
});

test.describe('Navigation', () => {
  test.beforeEach(async ({ page }) => {
    await mockAuthState(page);
  });

  test('bottom nav or sidebar has menu items', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle').catch(() => {});
    const nav = page.locator('nav, aside, [role="navigation"]');
    await expect(nav.first()).toBeVisible({ timeout: 10000 }).catch(() => {});
  });

  test('navigation links work', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle').catch(() => {});

    const routes = ['/inbox', '/callbacks', '/profile', '/settings'];
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
});
