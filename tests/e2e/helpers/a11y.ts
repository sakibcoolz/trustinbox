import AxeBuilder from '@axe-core/playwright';
import { Page, expect } from '@playwright/test';

export async function checkA11y(page: Page, options?: { exclude?: string[] }) {
  const builder = new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa']);

  if (options?.exclude) {
    for (const selector of options.exclude) {
      builder.exclude(selector);
    }
  }

  const results = await builder.analyze();
  expect(results.violations).toEqual([]);
}
