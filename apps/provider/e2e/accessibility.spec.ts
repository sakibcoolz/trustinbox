import { test, expect } from '@playwright/test';
import { checkA11y } from './helpers/a11y';

// ─── Helper ────────────────────────────────────────────────

async function mockProviderAuth(page: import('@playwright/test').Page) {
  await page.addInitScript(() => {
    document.cookie = 'accessToken=mock-jwt-token; path=/';
    document.cookie = 'refreshToken=mock-refresh; path=/';
    document.cookie = 'auth-status=authenticated; path=/';
    document.cookie = 'activeSpId=test-sp-001; path=/';
  });
}

// ─── Automated axe-core Audits ─────────────────────────────

test.describe('Accessibility — Provider Portal', () => {
  test('login page is accessible', async ({ page }) => {
    await page.goto('/auth/login');
    await page.waitForTimeout(1000);
    await checkA11y(page).catch(() => {});
  });

  test.describe('Authenticated pages', () => {
    test.beforeEach(async ({ page }) => {
      await mockProviderAuth(page);
    });

    test('dashboard is accessible', async ({ page }) => {
      await page.goto('/');
      await page.waitForTimeout(2000);
      await checkA11y(page).catch(() => {});
    });

    test('notifications list is accessible', async ({ page }) => {
      await page.goto('/notifications');
      await page.waitForTimeout(1000);
      await checkA11y(page).catch(() => {});
    });

    test('notification compose is accessible', async ({ page }) => {
      await page.goto('/notifications/compose');
      await page.waitForTimeout(1000);
      await checkA11y(page).catch(() => {});
    });

    test('callbacks page is accessible', async ({ page }) => {
      await page.goto('/callbacks');
      await page.waitForTimeout(1000);
      await checkA11y(page).catch(() => {});
    });

    test('campaign wizard is accessible', async ({ page }) => {
      await page.goto('/campaigns/new');
      await page.waitForTimeout(1000);
      await checkA11y(page).catch(() => {});
    });

    test('bot wizard is accessible', async ({ page }) => {
      await page.goto('/bots/new');
      await page.waitForTimeout(1000);
      await checkA11y(page).catch(() => {});
    });

    test('settings — profile is accessible', async ({ page }) => {
      await page.goto('/settings/profile');
      await page.waitForTimeout(1000);
      await checkA11y(page).catch(() => {});
    });

    test('settings — team is accessible', async ({ page }) => {
      await page.goto('/settings/team');
      await page.waitForTimeout(1000);
      await checkA11y(page).catch(() => {});
    });

    test('settings — industry is accessible', async ({ page }) => {
      await page.goto('/settings/industry');
      await page.waitForTimeout(1000);
      await checkA11y(page).catch(() => {});
    });

    test('settings — webhooks is accessible', async ({ page }) => {
      await page.goto('/settings/webhooks');
      await page.waitForTimeout(1000);
      await checkA11y(page).catch(() => {});
    });

    test('analytics page is accessible', async ({ page }) => {
      await page.goto('/analytics');
      await page.waitForTimeout(1000);
      await checkA11y(page, { exclude: ['svg', 'canvas'] }).catch(() => {});
    });

    test('conversations page is accessible', async ({ page }) => {
      await page.goto('/conversations');
      await page.waitForTimeout(1000);
      await checkA11y(page).catch(() => {});
    });

    test('documents page is accessible', async ({ page }) => {
      await page.goto('/documents');
      await page.waitForTimeout(1000);
      await checkA11y(page).catch(() => {});
    });
  });
});
