/**
 * The learning workflows in a real browser: the studio's links into the
 * source browser, viva practice saved across reloads, and the report download.
 */
import { readFile } from 'node:fs/promises';

import { expect, test } from './fixtures.ts';

test('a walkthrough link opens the source browser at the real definition', async ({ page }) => {
  await page.goto('/projects/attendance-system/learn/code?entry=calculations');
  await page.getByRole('link', { name: 'attendancePercentage' }).click();
  await expect(page).toHaveURL(
    /source\?file=src%2Flib%2Fattendance\.ts&symbol=attendancePercentage/,
  );
  await expect(page.getByText(/attendancePercentage is defined on line \d+/)).toBeVisible();
});

test('viva ratings survive a reload and feed the review list', async ({ page }) => {
  await page.goto('/projects/student-result-analyzer/viva');
  await page.getByRole('button', { name: 'Start quick practice' }).click();
  await page.getByRole('button', { name: /I don’t know yet/ }).click();
  for (const criterion of [
    'Correctness',
    'Conceptual understanding',
    'Explanation clarity',
    'Awareness of limitations',
  ]) {
    await page.getByRole('group', { name: criterion }).getByText('Not yet').click();
  }
  await page.getByRole('button', { name: 'Save rating and continue' }).click();
  await page.getByRole('button', { name: 'End session' }).click();
  await expect(page.getByRole('heading', { name: 'Session complete' })).toBeVisible();

  await page.reload();
  await expect(page.getByText(/1 question you rated “Not yet” or “Partly”/)).toBeVisible();
  await expect(page.getByRole('button', { name: 'Start review' })).toBeEnabled();
});

test('the submission workspace downloads a report with the facts appendix', async ({ page }) => {
  await page.goto('/learn/report?project=expense-tracker');
  await page.getByRole('checkbox', { name: /^1\. Start the app/ }).check();
  const downloading = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download Markdown (.md)' }).click();
  const download = await downloading;
  const text = await readFile(await download.path(), 'utf8');
  expect(text).toContain('## Appendix A: Project facts from CampusKit');
  expect(text).toContain('Verified by CampusKit');
  expect(text).toContain('- [x] Start the app with npm run dev');
});
