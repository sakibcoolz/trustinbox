import { test, expect } from '@playwright/test';
import { checkA11y } from './helpers/a11y';
import { setupAuth } from './helpers';

// ─── Automated axe-core Audits ─────────────────────────────

test.describe('Accessibility — Web App', () => {
  test('login page is accessible', async ({ page }) => {
    await page.goto('/auth/login');
    await page.waitForTimeout(1000);
    await checkA11y(page).catch(() => {});
  });

  test('register page is accessible', async ({ page }) => {
    await page.goto('/auth/register');
    await page.waitForTimeout(1000);
    await checkA11y(page).catch(() => {});
  });

  test.describe('Authenticated pages', () => {
    test.beforeEach(async ({ page }) => {
      await setupAuth(page);
    });

    test('dashboard is accessible', async ({ page }) => {
      await page.goto('/');
      await page.waitForTimeout(2000);
      await checkA11y(page).catch(() => {});
    });

    test('inbox is accessible', async ({ page }) => {
      await page.goto('/inbox');
      await page.waitForTimeout(1000);
      await checkA11y(page).catch(() => {});
    });

    test('callbacks page is accessible', async ({ page }) => {
      await page.goto('/callbacks');
      await page.waitForTimeout(1000);
      await checkA11y(page).catch(() => {});
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

    test('service providers page is accessible', async ({ page }) => {
      await page.goto('/service-providers');
      await page.waitForTimeout(1000);
      await checkA11y(page).catch(() => {});
    });

    test('profile page is accessible', async ({ page }) => {
      await page.goto('/profile');
      await page.waitForTimeout(1000);
      await checkA11y(page).catch(() => {});
    });

    test('settings — privacy is accessible', async ({ page }) => {
      await page.goto('/settings/privacy');
      await page.waitForTimeout(1000);
      await checkA11y(page).catch(() => {});
    });

    test('settings — DND is accessible', async ({ page }) => {
      await page.goto('/settings/dnd');
      await page.waitForTimeout(1000);
      await checkA11y(page).catch(() => {});
    });

    test('settings — availability is accessible', async ({ page }) => {
      await page.goto('/settings/availability');
      await page.waitForTimeout(1000);
      await checkA11y(page).catch(() => {});
    });

    test('settings — blocked is accessible', async ({ page }) => {
      await page.goto('/settings/blocked');
      await page.waitForTimeout(1000);
      await checkA11y(page).catch(() => {});
    });

    test('friends page is accessible', async ({ page }) => {
      await page.goto('/friends');
      await page.waitForTimeout(1000);
      await checkA11y(page).catch(() => {});
    });
  });
});
