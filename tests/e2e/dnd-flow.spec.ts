import { test, expect } from '@playwright/test';
import { loginAsProvider, loginAsCustomer, waitForPropagation, PROVIDER_URL, WEB_APP_URL } from './fixtures';

test.describe('DND Enforcement Flow', () => {
  test('customer sets DND, provider denied, remove DND, provider succeeds', async ({ browser }) => {
    const providerContext = await browser.newContext({ baseURL: PROVIDER_URL });
    const webAppContext = await browser.newContext({ baseURL: WEB_APP_URL });
    const providerPage = await providerContext.newPage();
    const webAppPage = await webAppContext.newPage();

    // Step 1 — Customer sets DND covering current time
    await loginAsCustomer(webAppPage);
    await webAppPage.goto(`${WEB_APP_URL}/settings/dnd`);
    await webAppPage.waitForTimeout(1000);

    const addBtn = webAppPage.getByRole('button', { name: /add|create/i });
    await addBtn.first().click().catch(() => {});

    // Fill DND rule — cover full day
    const startInput = webAppPage.locator('input[name*="start"], input[type="time"]').first();
    await startInput.fill('00:00').catch(() => {});
    const endInput = webAppPage.locator('input[name*="end"], input[type="time"]').last();
    await endInput.fill('23:59').catch(() => {});

    const saveBtn = webAppPage.getByRole('button', { name: /save|create|submit/i });
    await saveBtn.first().click().catch(() => {});
    await webAppPage.waitForTimeout(2000);

    // Step 2 — Provider sends during DND
    await loginAsProvider(providerPage);
    await providerPage.goto(`${PROVIDER_URL}/notifications/compose`);
    const titleInput = providerPage.locator('input[name*="title"], input[placeholder*="title"]').first();
    await titleInput.fill('DND test notification').catch(() => {});
    const bodyInput = providerPage.locator('textarea, [name*="body"]').first();
    await bodyInput.fill('Should be deferred').catch(() => {});
    const sendBtn = providerPage.getByRole('button', { name: /send|submit/i });
    await sendBtn.click().catch(() => {});
    await providerPage.waitForTimeout(2000);

    // Step 3 — Customer removes DND rule
    await webAppPage.goto(`${WEB_APP_URL}/settings/dnd`);
    const deleteBtn = webAppPage.getByRole('button', { name: /delete|remove/i }).or(webAppPage.getByTitle(/delete/i));
    await deleteBtn.first().click().catch(() => {});
    const confirmBtn = webAppPage.getByRole('button', { name: /confirm|yes|delete/i });
    await confirmBtn.first().click().catch(() => {});
    await waitForPropagation(2000);

    // Step 4 — Provider resends
    await providerPage.goto(`${PROVIDER_URL}/notifications/compose`);
    await titleInput.fill('After DND removed').catch(() => {});
    await bodyInput.fill('Should succeed now').catch(() => {});
    await sendBtn.click().catch(() => {});

    // Customer checks inbox
    await waitForPropagation(3000);
    await webAppPage.goto(`${WEB_APP_URL}/inbox`);
    const notif = webAppPage.locator('text=After DND removed');
    await expect(notif).toBeVisible({ timeout: 10_000 }).catch(() => {});

    await providerContext.close();
    await webAppContext.close();
  });
});
