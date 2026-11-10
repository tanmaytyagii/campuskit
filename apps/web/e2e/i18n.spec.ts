/**
 * The menus in Hindi: longer words and Devanagari text must fit the header, footer, dashboard
 * and palette at phone and desktop widths, and the pages must still pass the accessibility
 * checks with the page language set correctly.
 */
import AxeBuilder from '@axe-core/playwright';

import { expect, hasHorizontalOverflow, test } from './fixtures.ts';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.setItem('campuskit:locale:v1', JSON.stringify('hi'));
  });
});

for (const path of ['/dashboard', '/settings', '/projects']) {
  test(`${path} in Hindi fits the screen and has no accessibility violations`, async ({ page }) => {
    await page.goto(path);
    await expect(page.locator('html')).toHaveAttribute('lang', 'hi');
    await expect(page.getByRole('link', { name: 'मुख्य सामग्री पर जाएँ' })).toBeAttached();
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    expect(await hasHorizontalOverflow(page)).toBe(false);
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice'])
      .analyze();
    expect(results.violations.map((violation) => violation.id)).toEqual([]);
  });
}

test('the dashboard heading is in Hindi and the command palette opens in Hindi', async ({
  page,
}) => {
  await page.goto('/dashboard');
  await expect(page.getByRole('heading', { level: 1, name: 'आपका डैशबोर्ड' })).toBeVisible();
  await page.keyboard.press('ControlOrMeta+k');
  await expect(page.getByRole('dialog', { name: 'कहीं भी जाएँ' })).toBeVisible();
});
