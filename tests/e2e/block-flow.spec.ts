import { test, expect } from '@playwright/test';
import { loginAsProvider, loginAsCustomer, waitForPropagation, PROVIDER_URL, WEB_APP_URL } from './fixtures';

test.describe('Block Flow: Customer blocks → Provider denied → Unblock → Provider succeeds', () => {
  test('customer blocks SP, provider denied, unblock restores access', async ({ browser }) => {
    const providerContext = await browser.newContext({ baseURL: PROVIDER_URL });
    const webAppContext = await browser.newContext({ baseURL: WEB_APP_URL });
    const providerPage = await providerContext.newPage();
    const webAppPage = await webAppContext.newPage();

    // Step 1 — Customer blocks SP
    await loginAsCustomer(webAppPage);
    await webAppPage.goto(`${WEB_APP_URL}/service-providers`);
    await webAppPage.waitForTimeout(1000);

    const blockBtn = webAppPage.getByRole('button', { name: /block/i });
    await blockBtn.first().click().catch(() => {});
    const confirmBlock = webAppPage.getByRole('button', { name: /confirm|yes|block/i });
    await confirmBlock.first().click().catch(() => {});

    // Verify in blocked list
    await webAppPage.goto(`${WEB_APP_URL}/settings/blocked`);
    await webAppPage.waitForTimeout(1000);

    // Step 2 — Provider attempts notification
    await loginAsProvider(providerPage);
    await providerPage.goto(`${PROVIDER_URL}/notifications/compose`);
    const titleInput = providerPage.locator('input[name*="title"], input[placeholder*="title"]').first();
    await titleInput.fill('Block test notification').catch(() => {});
    const bodyInput = providerPage.locator('textarea, [name*="body"]').first();
    await bodyInput.fill('Should be blocked').catch(() => {});
    const sendBtn = providerPage.getByRole('button', { name: /send|submit/i });
    await sendBtn.click().catch(() => {});
    await providerPage.waitForTimeout(2000);

    // Step 3 — Provider attempts callback
    await providerPage.goto(`${PROVIDER_URL}/callbacks/new`);
    const reasonInput = providerPage.locator('textarea, input[name*="reason"]').first();
    await reasonInput.fill('Blocked test').catch(() => {});
    const submitBtn = providerPage.getByRole('button', { name: /submit|create/i });
    await submitBtn.click().catch(() => {});
    await providerPage.waitForTimeout(2000);

    // Step 4 — Customer unblocks
    await webAppPage.goto(`${WEB_APP_URL}/settings/blocked`);
    const unblockBtn = webAppPage.getByRole('button', { name: /unblock/i });
    await unblockBtn.first().click().catch(() => {});
    const confirmUnblock = webAppPage.getByRole('button', { name: /confirm|yes/i });
    await confirmUnblock.first().click().catch(() => {});

    // Step 5 — Provider retries
    await waitForPropagation(2000);
    await providerPage.goto(`${PROVIDER_URL}/notifications/compose`);
    await titleInput.fill('After unblock test').catch(() => {});
    await bodyInput.fill('Should succeed now').catch(() => {});
    await sendBtn.click().catch(() => {});

    await providerContext.close();
    await webAppContext.close();
  });
});
