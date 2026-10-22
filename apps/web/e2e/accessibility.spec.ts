/**
 * axe-core with every rule enabled (including colour contrast) in a real
 * browser, in both colour themes.
 */
import AxeBuilder from '@axe-core/playwright';

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

for (const scheme of ['light', 'dark'] as const) {
  test.describe(`${scheme} theme`, () => {
    test.use({ colorScheme: scheme });

    for (const path of PAGES) {
      test(`${path} has no accessibility violations`, async ({ page }) => {
        await page.goto(path);
        await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
        await page.waitForLoadState('networkidle');
        const results = await new AxeBuilder({ page })
          .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice'])
          .analyze();
        const summary = results.violations.map((violation) => ({
          rule: violation.id,
          impact: violation.impact,
          targets: violation.nodes.slice(0, 5).map((node) => node.target.join(' ')),
        }));
        expect(summary).toEqual([]);
      });
    }
  });
}
