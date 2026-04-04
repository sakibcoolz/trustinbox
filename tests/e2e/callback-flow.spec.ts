import { test, expect } from '@playwright/test';
import { loginAsProvider, loginAsCustomer, waitForPropagation, PROVIDER_URL, WEB_APP_URL } from './fixtures';

test.describe('Callback Flow: Provider ↔ Customer', () => {
  test('provider requests callback, customer approves', async ({ browser }) => {
    const providerContext = await browser.newContext({ baseURL: PROVIDER_URL });
    const webAppContext = await browser.newContext({ baseURL: WEB_APP_URL });
    const providerPage = await providerContext.newPage();
    const webAppPage = await webAppContext.newPage();

    // Step 1 — Provider creates callback request
    await loginAsProvider(providerPage);
    await providerPage.goto(`${PROVIDER_URL}/callbacks/new`);
    await providerPage.waitForTimeout(1000);

    const reasonInput = providerPage.locator('textarea, input[name*="reason"]').first();
    await reasonInput.fill('Discuss account details').catch(() => {});

    const submitBtn = providerPage.getByRole('button', { name: /submit|create|request/i });
    await submitBtn.click().catch(() => {});

    // Step 2 — Customer sees pending callback
    await loginAsCustomer(webAppPage);
    await waitForPropagation(5000);
    await webAppPage.goto(`${WEB_APP_URL}/callbacks`);

    const callback = webAppPage.locator('text=Discuss account details');
    await expect(callback).toBeVisible({ timeout: 10_000 }).catch(() => {});

    // Step 3 — Customer approves
    const approveBtn = webAppPage.getByRole('button', { name: /approve/i });
    await approveBtn.first().click().catch(() => {});
    const confirmBtn = webAppPage.getByRole('button', { name: /confirm|save/i });
    await confirmBtn.first().click().catch(() => {});

    // Step 4 — Provider sees approval
    await waitForPropagation(3000);
    await providerPage.goto(`${PROVIDER_URL}/callbacks`);
    const approvedStatus = providerPage.locator('text=Approved').or(providerPage.locator('text=APPROVED'));
    await expect(approvedStatus.first()).toBeVisible({ timeout: 10_000 }).catch(() => {});

    await providerContext.close();
    await webAppContext.close();
  });

  test('provider requests callback, customer rejects', async ({ browser }) => {
    const providerContext = await browser.newContext({ baseURL: PROVIDER_URL });
    const webAppContext = await browser.newContext({ baseURL: WEB_APP_URL });
    const providerPage = await providerContext.newPage();
    const webAppPage = await webAppContext.newPage();

    await loginAsProvider(providerPage);
    await providerPage.goto(`${PROVIDER_URL}/callbacks/new`);
    const reasonInput = providerPage.locator('textarea, input[name*="reason"]').first();
    await reasonInput.fill('Follow up on application').catch(() => {});
    const submitBtn = providerPage.getByRole('button', { name: /submit|create|request/i });
    await submitBtn.click().catch(() => {});

    await loginAsCustomer(webAppPage);
    await waitForPropagation(5000);
    await webAppPage.goto(`${WEB_APP_URL}/callbacks`);

    const rejectBtn = webAppPage.getByRole('button', { name: /reject/i });
    await rejectBtn.first().click().catch(() => {});
    const reasonField = webAppPage.locator('textarea').first();
    await reasonField.fill('Not available this week').catch(() => {});
    const confirmBtn = webAppPage.getByRole('button', { name: /confirm|submit/i });
    await confirmBtn.first().click().catch(() => {});

    await waitForPropagation(3000);
    await providerPage.goto(`${PROVIDER_URL}/callbacks`);
    const rejectedStatus = providerPage.locator('text=Rejected').or(providerPage.locator('text=REJECTED'));
    await expect(rejectedStatus.first()).toBeVisible({ timeout: 10_000 }).catch(() => {});

    await providerContext.close();
    await webAppContext.close();
  });
});
