import { Page } from '@playwright/test';

// ─── Test Constants ────────────────────────────────────────

export const TEST_USER = {
  email: 'testcustomer@trustinbox.dev',
  password: 'TestPassword123!',
  firstName: 'Test',
  lastName: 'Customer',
};

// ─── Auth Helpers ──────────────────────────────────────────

export async function loginAsCustomer(page: Page) {
  await page.goto('/auth/login');
  await page.fill('[name="email"], input[type="email"]', TEST_USER.email);
  await page.fill('[name="password"], input[type="password"]', TEST_USER.password);
  await page.click('button[type="submit"]');
  await page.waitForURL('/', { timeout: 10_000 }).catch(() => {});
}

export async function setupAuth(page: Page, token?: string) {
  const jwt = token || createMockJwt();
  await page.addInitScript((t) => {
    localStorage.setItem('accessToken', t);
    localStorage.setItem('refreshToken', t);
  }, jwt);
}

function createMockJwt(): string {
  const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const payload = btoa(
    JSON.stringify({
      sub: 'test-user-001',
      role: 'CUSTOMER',
      exp: Math.floor(Date.now() / 1000) + 3600,
    })
  );
  const signature = btoa('mock-signature');
  return `${header}.${payload}.${signature}`;
}

// ─── GraphQL Helpers ───────────────────────────────────────

export async function waitForGraphQL(page: Page, operationName: string) {
  return page.waitForResponse(
    (resp) =>
      resp.url().includes('/graphql') &&
      resp.request().postDataJSON()?.operationName === operationName,
    { timeout: 10_000 }
  );
}
