import { Page } from '@playwright/test';

// ─── Constants ─────────────────────────────────────────────

export const PROVIDER_URL = 'http://localhost:6060';
export const WEB_APP_URL = 'http://localhost:3000';

export const PROVIDER_USER = {
  email: 'provider@trustinbox.dev',
  password: 'ProviderPass123!',
};

export const CUSTOMER_USER = {
  email: 'customer@trustinbox.dev',
  password: 'CustomerPass123!',
};

// ─── Login Helpers ─────────────────────────────────────────

export async function loginAsProvider(page: Page) {
  await page.goto(`${PROVIDER_URL}/auth/login`);
  await page.fill('[name="email"], input[type="email"]', PROVIDER_USER.email);
  await page.fill('[name="password"], input[type="password"]', PROVIDER_USER.password);
  await page.click('button[type="submit"]');
  await page.waitForURL(`${PROVIDER_URL}/`, { timeout: 10_000 }).catch(() => {});
}

export async function loginAsCustomer(page: Page) {
  await page.goto(`${WEB_APP_URL}/auth/login`);
  await page.fill('[name="email"], input[type="email"]', CUSTOMER_USER.email);
  await page.fill('[name="password"], input[type="password"]', CUSTOMER_USER.password);
  await page.click('button[type="submit"]');
  await page.waitForURL(`${WEB_APP_URL}/`, { timeout: 10_000 }).catch(() => {});
}

// ─── Propagation Helper ───────────────────────────────────

export async function waitForPropagation(ms = 3000) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}
