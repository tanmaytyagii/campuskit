/**
 * Generates real ZIP files through the user interface, saves the download
 * and inspects it in Node.
 */
import { readFile } from 'node:fs/promises';

import type { Download, Page } from '@playwright/test';
import JSZip from 'jszip';

import { expect, test } from './fixtures.ts';

interface Archive {
  names: string[];
  text: (path: string) => Promise<string>;
}

async function openArchive(download: Download): Promise<Archive> {
  const path = await download.path();
  const zip = await JSZip.loadAsync(await readFile(path));
  const names = Object.keys(zip.files);
  return {
    names,
    text: async (name) => {
      const entry = zip.file(name);
      if (!entry) throw new Error(`${name} is not in the ZIP`);
      return entry.async('string');
    },
  };
}

function expectSafeEntries(archive: Archive, root: string) {
  for (const name of archive.names) {
    expect(name.startsWith(`${root}/`), `${name} is inside ${root}/`).toBe(true);
    expect(name.split('/')).not.toContain('..');
    expect(name).not.toMatch(/^\/|\\|^[A-Za-z]:/);
  }
  const forbidden = archive.names.filter((name) =>
    /(^|\/)(node_modules|dist|__pycache__|\.venv|\.git)\/|(^|\/)\.env$|secrets\.toml$/.test(name),
  );
  expect(forbidden).toEqual([]);
}

async function generate(page: Page): Promise<Download> {
  const downloading = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Generate ZIP' }).click();
  return downloading;
}

test('customize the attendance system and download it', async ({ page }) => {
  const name = 'Riya’s Lab <Attendance> & “Notes” — हाज़िरी';
  await page.goto('/generate');
  await page.getByText('Student Attendance System', { exact: true }).click();
  await page.getByRole('button', { name: 'Continue with Student Attendance System' }).click();

  await page.getByRole('textbox', { name: 'Project name' }).fill(name);
  await page
    .getByRole('textbox', { name: 'Institution name (optional)' })
    .fill('St. Xavier’s College');
  await page.getByRole('textbox', { name: 'Your name (optional)' }).fill('Riya Sharma');
  await page.getByRole('button', { name: 'Continue to options' }).click();

  await page.getByText('Teal', { exact: true }).click();
  await page.getByRole('spinbutton', { name: 'Attendance threshold' }).fill('80');
  await page.getByRole('checkbox', { name: /Include the demo class/ }).uncheck();
  await page.getByRole('button', { name: 'Review your project' }).click();

  await expect(page.getByText('will be packed into')).toContainText(
    'riya-s-lab-attendance-and-notes.zip',
  );
  await page.getByRole('combobox', { name: 'File' }).selectOption('README.md');
  await expect(page.getByLabel('Contents of README.md')).toContainText(
    '# Riya’s Lab \\<Attendance\\>',
  );
  const download = await generate(page);
  expect(download.suggestedFilename()).toBe('riya-s-lab-attendance-and-notes.zip');
  await expect(
    page.getByRole('heading', { name: 'riya-s-lab-attendance-and-notes.zip is ready' }),
  ).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Copy command: cd riya-s-lab-attendance-and-notes' }),
  ).toBeVisible();

  const archive = await openArchive(download);
  const root = 'riya-s-lab-attendance-and-notes';
  expectSafeEntries(archive, root);
  expect(archive.names).toEqual(
    expect.arrayContaining([
      `${root}/.gitignore`,
      `${root}/package-lock.json`,
      `${root}/GETTING_STARTED.md`,
      `${root}/docs/PROJECT_REPORT_DRAFT.md`,
      `${root}/LICENSE`,
    ]),
  );
  const report = await archive.text(`${root}/docs/PROJECT_REPORT_DRAFT.md`);
  expect(report).toContain('**Team:** Riya Sharma');
  expect(report).toContain('**Institution:** St. Xavier’s College');

  const config = JSON.parse(await archive.text(`${root}/src/app.config.json`)) as Record<
    string,
    unknown
  >;
  expect(config).toEqual({
    appName: name,
    institutionName: 'St. Xavier’s College',
    authorName: 'Riya Sharma',
    theme: 'teal',
    attendanceThreshold: 80,
    seedDemoData: false,
  });
  expect(await archive.text(`${root}/index.html`)).toContain(
    '<title>Riya’s Lab &lt;Attendance&gt; &amp; “Notes” — हाज़िरी</title>',
  );
  const readme = await archive.text(`${root}/README.md`);
  expect(readme).toContain('# Riya’s Lab \\<Attendance\\> \\& “Notes” — हाज़िरी');
  expect(readme).toMatch(/\| Built by\s+\| Riya Sharma\s+\|/);
  expect((JSON.parse(await archive.text(`${root}/package.json`)) as { name: string }).name).toBe(
    root,
  );
});

test('download a Python project with its defaults from the project page', async ({ page }) => {
  await page.goto('/projects/student-result-analyzer');
  const downloading = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download with defaults' }).click();
  const download = await downloading;
  expect(download.suggestedFilename()).toBe('student-result-analyzer.zip');
  await expect(page.getByText('Downloaded student-result-analyzer.zip')).toBeVisible();

  const archive = await openArchive(download);
  const root = 'student-result-analyzer';
  expectSafeEntries(archive, root);
  // Hidden configuration folders are part of a working project and must be kept.
  expect(archive.names).toEqual(
    expect.arrayContaining([
      `${root}/.streamlit/config.toml`,
      `${root}/.gitignore`,
      `${root}/requirements.txt`,
      `${root}/app.py`,
    ]),
  );
  const guide = await archive.text(`${root}/GETTING_STARTED.md`);
  expect(guide).toContain('pip install -r requirements.txt');
  expect(guide).toContain('streamlit run app.py');
});

test('switching templates keeps the name and shows only supported options', async ({ page }) => {
  await page.goto('/generate?template=attendance-system');
  await page.getByRole('textbox', { name: 'Project name' }).fill('Hostel Helper');
  await page.getByRole('button', { name: /Template \(completed\)/ }).click();
  await page.getByText('Personal Expense Tracker', { exact: true }).click();
  await page.getByRole('button', { name: 'Continue with Personal Expense Tracker' }).click();
  await expect(page.getByRole('textbox', { name: 'Project name' })).toHaveValue('Hostel Helper');
  await expect(page.getByRole('textbox', { name: /Institution/ })).toHaveCount(0);
  await page.getByRole('button', { name: 'Continue to options' }).click();
  await expect(page.getByRole('group', { name: /Currency/ })).toBeVisible();
  await expect(page.getByRole('spinbutton', { name: 'Attendance threshold' })).toHaveCount(0);
});
