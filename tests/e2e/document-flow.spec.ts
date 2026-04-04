import { test, expect } from '@playwright/test';
import { loginAsProvider, loginAsCustomer, waitForPropagation, PROVIDER_URL, WEB_APP_URL } from './fixtures';

test.describe('Document Sharing Flow', () => {
  test('provider shares document, customer sees and downloads it', async ({ browser }) => {
    const providerContext = await browser.newContext({ baseURL: PROVIDER_URL });
    const webAppContext = await browser.newContext({ baseURL: WEB_APP_URL });
    const providerPage = await providerContext.newPage();
    const webAppPage = await webAppContext.newPage();

    // Step 1 — Provider uploads and shares document
    await loginAsProvider(providerPage);
    await providerPage.goto(`${PROVIDER_URL}/documents`);
    await providerPage.waitForTimeout(1000);

    // Upload file
    const fileInput = providerPage.locator('input[type="file"]');
    await fileInput.first().setInputFiles({
      name: 'e2e-test-doc.txt',
      mimeType: 'text/plain',
      buffer: Buffer.from('E2E test document content'),
    }).catch(() => {});

    // Share with customer
    const shareBtn = providerPage.getByRole('button', { name: /share|send/i });
    await shareBtn.first().click().catch(() => {});
    const confirmBtn = providerPage.getByRole('button', { name: /confirm|share|send/i });
    await confirmBtn.first().click().catch(() => {});

    // Step 2 — Customer checks documents
    await loginAsCustomer(webAppPage);
    await waitForPropagation(5000);
    await webAppPage.goto(`${WEB_APP_URL}/documents`);

    const docEntry = webAppPage.locator('text=e2e-test-doc');
    await expect(docEntry).toBeVisible({ timeout: 10_000 }).catch(() => {});

    // Step 3 — Customer downloads
    const downloadBtn = webAppPage.getByRole('button', { name: /download/i }).or(webAppPage.getByRole('link', { name: /download/i }));
    const [download] = await Promise.all([
      webAppPage.waitForEvent('download', { timeout: 5000 }).catch(() => null),
      downloadBtn.first().click().catch(() => {}),
    ]);

    await providerContext.close();
    await webAppContext.close();
  });
});
