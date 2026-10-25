/**
 * The Demo Studio, presentation mode and readiness check in a real browser:
 * real keyboard use, data that lasts for the tab, and layouts at phone sizes.
 */
import { expect, hasHorizontalOverflow, isMobile, nextKey, test } from './fixtures.ts';

test('a student can be added and marked present with the keyboard alone', async ({
  page,
  browserName,
}, testInfo) => {
  test.skip(isMobile(testInfo.project.name), 'keyboard use is tested on desktop');
  await page.goto('/projects/attendance-system/demo');
  await expect(page.getByText('Showing 12 of 12 students')).toBeVisible();

  const students = page.getByRole('tab', { name: 'Students' });
  await students.focus();
  await page.keyboard.press('ArrowRight');
  await expect(page.getByRole('tab', { name: 'Mark attendance' })).toBeFocused();
  await page.keyboard.press('ArrowLeft');

  await page.getByRole('button', { name: 'Add student' }).focus();
  await page.keyboard.press('Enter');
  const dialog = page.getByRole('dialog', { name: 'Add student' });
  // The dialog starts on its Close button, as native dialogs do; Tab reaches the first field.
  await expect(dialog.getByRole('button', { name: 'Close' })).toBeFocused();
  await page.keyboard.press(nextKey(browserName));
  await expect(dialog.getByRole('textbox', { name: 'Full name' })).toBeFocused();
  await page.keyboard.type('Kavya Rao');
  await page.keyboard.press(nextKey(browserName));
  await page.keyboard.type('10A-07');
  await page.keyboard.press('Enter');
  await expect(page.getByText('Added Kavya Rao.')).toBeVisible();

  // Escape closes a dialog and gives focus back to the button that opened it.
  await page.getByRole('button', { name: 'Add student' }).focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('dialog', { name: 'Add student' })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog', { name: 'Add student' })).toBeHidden();
  await expect(page.getByRole('button', { name: 'Add student' })).toBeFocused();
  await expect(page.getByText('Showing 13 of 13 students')).toBeVisible();

  // The data lasts for the tab: reload and it is still there; reset brings back the example.
  await page.reload();
  await expect(page.getByText('Showing 13 of 13 students')).toBeVisible();
  await page.getByRole('button', { name: 'Reset to the example' }).click();
  await expect(page.getByText('Showing 12 of 12 students')).toBeVisible();
});

test('deleting a row with the keyboard leaves focus on the next row, not the page body', async ({
  page,
  browserName,
}, testInfo) => {
  test.skip(isMobile(testInfo.project.name), 'keyboard use is tested on desktop');
  await page.goto('/projects/attendance-system/demo');
  await expect(page.getByText('Showing 12 of 12 students')).toBeVisible();
  const deletes = page.getByRole('table').getByRole('button', { name: /^Delete / });
  const next = (await deletes.nth(3).getAttribute('aria-label')) ?? '';

  await deletes.nth(2).focus();
  await page.keyboard.press('Enter');
  const dialog = page.getByRole('alertdialog', { name: /^Delete / });
  await expect(dialog).toHaveAccessibleDescription(/^This also deletes \d+ attendance marks?/);
  await expect(dialog.getByRole('button', { name: 'Close' })).toBeFocused();
  // Cancel deletes nothing and gives focus back to the delete button.
  await page.keyboard.press(nextKey(browserName));
  await expect(dialog.getByRole('button', { name: 'Cancel' })).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(dialog).toBeHidden();
  await expect(deletes.nth(2)).toBeFocused();
  await expect(page.getByText('Showing 12 of 12 students')).toBeVisible();

  await page.keyboard.press('Enter');
  await expect(dialog.getByRole('button', { name: 'Close' })).toBeFocused();
  await page.keyboard.press(nextKey(browserName)); // Cancel
  await page.keyboard.press(nextKey(browserName)); // Delete student
  await expect(dialog.getByRole('button', { name: 'Delete student' })).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(dialog).toBeHidden();
  await expect(page.getByText('Showing 11 of 11 students')).toBeVisible();
  await expect(page.getByRole('button', { name: next, exact: true })).toBeFocused();
});

test('the guided demo checks the actions and saves a rehearsal for the readiness check', async ({
  page,
}) => {
  await page.goto('/projects/expense-tracker/demo');
  await page.getByRole('button', { name: 'Practise the demo' }).click();
  await page.getByRole('button', { name: 'Start the guided demo' }).click();
  await page.getByRole('button', { name: 'Next step' }).click();
  await expect(
    page.getByRole('heading', { name: 'Add an expense, with validation' }),
  ).toBeVisible();

  await page.getByRole('button', { name: 'Add transaction' }).click();
  const dialog = page.getByRole('dialog', { name: 'Add transaction' });
  await dialog.getByRole('textbox', { name: 'Amount (INR)' }).fill('12.345');
  await dialog.getByRole('button', { name: 'Add transaction' }).click();
  await expect(dialog.getByText('Use at most 2 decimal places.')).toBeVisible();
  await dialog.getByRole('textbox', { name: 'Amount (INR)' }).fill('120');
  await dialog.getByRole('button', { name: 'Add transaction' }).click();
  await expect(page.getByText(/^Done in the demo:/)).toBeVisible();

  await page.getByRole('button', { name: 'Next step' }).click();
  await page.getByRole('button', { name: 'Next step' }).click();
  await page.getByRole('button', { name: 'Next step' }).click();
  await page.getByRole('textbox', { name: 'Monthly budget (INR)' }).fill('5000');
  await page.getByRole('button', { name: 'Save budget' }).click();
  await page.getByRole('button', { name: 'Next step' }).click();
  await page.getByRole('button', { name: 'Finish' }).click();
  await expect(page.getByText(/today’s date is saved in this browser/)).toBeVisible();

  await page.goto('/projects/expense-tracker/ready');
  await expect(page.getByText(/Guided demo finished on/)).toBeVisible();
});

test('presentation mode moves with the keyboard, hides notes and exits with Escape', async ({
  page,
}, testInfo) => {
  test.skip(isMobile(testInfo.project.name), 'keyboard use is tested on desktop');
  await page.goto('/projects/student-result-analyzer/present');
  await expect(
    page.getByRole('heading', { level: 1, name: 'Student Result Analyzer' }),
  ).toBeFocused();
  await page.keyboard.press('ArrowRight');
  await expect(page.getByRole('heading', { level: 1, name: 'The problem' })).toBeVisible();
  // Two quick presses move two slides: each move applies before the next key arrives.
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('ArrowRight');
  await expect(page.getByRole('heading', { level: 1, name: 'Key features' })).toBeVisible();
  await page.keyboard.press('n');
  await expect(page.getByRole('complementary', { name: 'Speaking notes' })).toBeHidden();
  await page.keyboard.press('End');
  await expect(page.getByRole('heading', { level: 1, name: 'Conclusion' })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page).toHaveURL(/\/projects\/student-result-analyzer$/);
});

test('readiness confirmations are kept after a reload and change the score', async ({ page }) => {
  await page.goto('/projects/attendance-system/ready');
  const score = page.getByText(/^\d+%$/);
  const before = await score.textContent();
  const tests = page.getByRole('listitem').filter({
    has: page.getByRole('heading', { name: 'Run the project’s tests' }),
  });
  await tests.getByRole('checkbox', { name: 'I’ve done this on my computer' }).check();
  await expect(score).not.toHaveText(before ?? '');
  await page.reload();
  await expect(
    tests.getByRole('checkbox', { name: 'I’ve done this on my computer' }),
  ).toBeChecked();
});

test('demos stay within the screen on phones, including charts and tables', async ({
  page,
}, testInfo) => {
  test.skip(!isMobile(testInfo.project.name), 'phone layouts only');
  for (const path of [
    '/projects/expense-tracker/demo?feature=overview',
    '/projects/student-result-analyzer/demo?feature=students',
    '/projects/attendance-system/demo?feature=mark',
    // Screen-reader-only notes in the table cells once widened the page here.
    '/projects/attendance-system/demo?feature=summary',
    '/projects/attendance-system/ready',
  ]) {
    await page.goto(path);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await page.waitForLoadState('networkidle');
    expect(await hasHorizontalOverflow(page), path).toBe(false);
    await page.setViewportSize({ width: 320, height: 640 });
    expect(await hasHorizontalOverflow(page), `${path} at 320 px`).toBe(false);
    await page.setViewportSize({ width: 360, height: 780 });
  }
});
