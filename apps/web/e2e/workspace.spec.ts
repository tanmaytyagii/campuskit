/**
 * My projects: progress saved in one place can be backed up to a file and restored, through
 * the browser's real download and file chooser.
 */
import { readFile } from 'node:fs/promises';

import { expect, test } from './fixtures.ts';

test('back up progress to a file, and restore it into a browser that has none', async ({
  page,
}) => {
  await page.goto('/projects/attendance-system/learn/checklist');
  await page.getByRole('checkbox').first().check();

  await page.goto('/my-projects');
  const card = page.getByRole('article', { name: 'Student Attendance System' });
  await expect(card).toContainText(/1 of \d+ ticked/);
  const downloading = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download backup' }).click();
  const download = await downloading;
  expect(download.suggestedFilename()).toMatch(/^campuskit-progress-\d{4}-\d{2}-\d{2}\.json$/);
  const file = await download.path();
  const backup = JSON.parse(await readFile(file, 'utf8')) as { projects: object };
  expect(Object.keys(backup.projects)).toEqual(['attendance-system']);

  // As if on another computer: nothing saved in this browser.
  await page.evaluate(() => window.localStorage.clear());
  await page.reload();
  await expect(
    page.getByRole('heading', { name: 'No template progress in this browser yet' }),
  ).toBeVisible();

  await page.getByLabel('Backup file (.json)').setInputFiles(file);
  const dialog = page.getByRole('dialog', { name: 'Restore this backup?' });
  await expect(dialog).toContainText('In the file: 1 checklist item ticked');
  await dialog.getByRole('button', { name: 'Restore this backup' }).click();
  await expect(page.getByText('Restored your backup: progress for 1 template.')).toBeVisible();
  await expect(card).toContainText(/1 of \d+ ticked/);
});

test('export the report as a Word document, and print only the report', async ({ page }) => {
  // Headless browsers end print() at once; keep the print view so it can be checked.
  await page.addInitScript(() => {
    window.print = () => undefined;
  });
  await page.goto('/learn/report?project=attendance-system');
  await page.getByRole('textbox', { name: 'Team members' }).fill('Asha K.');

  const downloading = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download Word (.docx)' }).click();
  const download = await downloading;
  expect(download.suggestedFilename()).toBe('student-attendance-system-report-draft.docx');
  const bytes = await readFile(await download.path());
  // A .docx is a ZIP archive.
  expect(bytes.subarray(0, 2).toString('latin1')).toBe('PK');

  await page.getByRole('button', { name: 'Print or save as PDF' }).click();
  await page.emulateMedia({ media: 'print' });
  await expect(page.locator('body > .print-report')).toBeVisible();
  await expect(page.locator('body > .print-report')).toContainText('Asha K.');
  await expect(page.getByRole('banner')).toBeHidden();
  await expect(page.getByRole('heading', { level: 1, name: 'Submission workspace' })).toBeHidden();
});

test('create a project, track it, and find it again after a reload and in a backup', async ({
  page,
}) => {
  await page.goto('/my-projects');
  await page.getByRole('button', { name: 'New project' }).click();
  const dialog = page.getByRole('dialog', { name: 'New project' });
  await dialog.getByRole('textbox', { name: 'Title' }).fill('Library Seat Finder');
  await dialog.getByRole('textbox', { name: /^Technology stack/ }).fill('React, Vite');
  await dialog.getByRole('button', { name: 'Create project' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Library Seat Finder' })).toBeVisible();

  const milestones = page.getByRole('region', { name: 'Milestones' });
  await milestones.getByRole('textbox', { name: 'New milestone' }).fill('First demo');
  await milestones.getByLabel(/^Due date/).fill('2026-12-01');
  await milestones.getByRole('button', { name: 'Add' }).click();
  await expect(milestones.getByText('0 of 1 done')).toBeVisible();

  await page.reload();
  await expect(page.getByRole('checkbox', { name: /First demo/ })).toBeVisible();
  await page
    .getByRole('navigation', { name: 'Breadcrumb' })
    .getByRole('link', { name: 'My projects' })
    .click();
  await expect(page.getByRole('article', { name: 'Library Seat Finder' })).toContainText(
    '0 of 1 done',
  );

  const downloading = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download backup' }).click();
  const backup = JSON.parse(await readFile(await (await downloading).path(), 'utf8')) as {
    version: number;
    workspace: Array<{ title: string; milestones: unknown[] }>;
  };
  expect(backup.version).toBe(2);
  expect(backup.workspace.map((project) => project.title)).toEqual(['Library Seat Finder']);
  expect(backup.workspace[0]?.milestones).toHaveLength(1);
});
