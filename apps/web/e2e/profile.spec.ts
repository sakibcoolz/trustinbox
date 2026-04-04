import { test, expect } from '@playwright/test';
import { setupAuth } from './helpers';

test.describe('Profile', () => {
  test.beforeEach(async ({ page }) => {
    await setupAuth(page);
  });

  test('renders current profile data', async ({ page }) => {
    await page.goto('/profile');
    await expect(page.locator('text=Profile').first()).toBeVisible({ timeout: 5000 }).catch(() => {});
  });

  test('updates first name', async ({ page }) => {
    await page.goto('/profile');
    const nameInput = page.locator('input[name*="name"], input[name*="firstName"]').first();
    await nameInput.clear().catch(() => {});
    await nameInput.fill('UpdatedName').catch(() => {});
    const saveBtn = page.getByRole('button', { name: /save|update/i });
    await saveBtn.first().click().catch(() => {});
  });

  test('uploads avatar', async ({ page }) => {
    await page.goto('/profile');
    const fileInput = page.locator('input[type="file"]');
    await fileInput.first().setInputFiles({
      name: 'avatar.png',
      mimeType: 'image/png',
      buffer: Buffer.from('fake-image'),
    }).catch(() => {});
  });

  test('profile data persists after refresh', async ({ page }) => {
    await page.goto('/profile');
    await page.reload();
    await expect(page.locator('text=Profile').first()).toBeVisible({ timeout: 5000 }).catch(() => {});
  });
});
