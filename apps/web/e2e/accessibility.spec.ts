/**
 * axe-core with every rule enabled (including colour contrast) in a real
 * browser, in both colour themes.
 */
import AxeBuilder from '@axe-core/playwright';
import type { Page } from '@playwright/test';

import { expect, test } from './fixtures.ts';

const PAGES = [
  '/',
  '/projects',
  '/projects/expense-tracker',
  '/projects/attendance-system/docs/viva',
  '/projects/expense-tracker/source',
  '/generate?template=student-result-analyzer',
  '/learn',
  '/docs/template-engine',
  '/no-such-page',
];

async function violations(page: Page) {
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice'])
    .analyze();
  return results.violations.map((violation) => ({
    rule: violation.id,
    impact: violation.impact,
    targets: violation.nodes.slice(0, 5).map((node) => node.target.join(' ')),
  }));
}

for (const scheme of ['light', 'dark'] as const) {
  test.describe(`${scheme} theme`, () => {
    test.use({ colorScheme: scheme });

    for (const path of PAGES) {
      test(`${path} has no accessibility violations`, async ({ page }) => {
        await page.goto(path);
        await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
        await page.waitForLoadState('networkidle');
        expect(await violations(page)).toEqual([]);
      });
    }

    test('the open project guide has no accessibility violations', async ({ page }) => {
      await page.goto('/projects');
      await page.getByText('Not sure which project to choose?').click();
      await expect(page.getByRole('region', { name: 'Compare projects' })).toBeVisible();
      expect(await violations(page)).toEqual([]);
    });

    test('the generator review and done steps have no accessibility violations', async ({
      page,
    }) => {
      await page.goto('/generate?template=expense-tracker');
      await page.getByRole('button', { name: 'Continue to options' }).click();
      await page.getByRole('button', { name: 'Review your project' }).click();
      await expect(page.getByLabel('Contents of GETTING_STARTED.md')).toBeVisible();
      expect(await violations(page)).toEqual([]);

      const downloading = page.waitForEvent('download');
      await page.getByRole('button', { name: 'Generate ZIP' }).click();
      await downloading;
      await expect(page.getByRole('heading', { name: 'Known limitations' })).toBeVisible();
      expect(await violations(page)).toEqual([]);
    });
  });
}
