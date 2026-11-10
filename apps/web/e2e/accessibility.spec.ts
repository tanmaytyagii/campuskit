/**
 * axe-core with every rule enabled (including colour contrast) in a real
 * browser, in both colour themes.
 */
import AxeBuilder from '@axe-core/playwright';
import type { Locator, Page } from '@playwright/test';

import { expect, test } from './fixtures.ts';

const PAGES = [
  '/',
  '/projects',
  '/projects/expense-tracker',
  '/projects/attendance-system/docs/viva',
  '/projects/expense-tracker/source',
  '/generate?template=student-result-analyzer',
  '/learn',
  '/learn/report?project=student-result-analyzer',
  '/viva',
  '/compare?ids=attendance-system,student-result-analyzer&goal=database',
  '/projects/attendance-system/learn',
  '/projects/expense-tracker/learn/architecture',
  '/projects/student-result-analyzer/learn/code',
  '/projects/attendance-system/learn/checklist',
  '/projects/expense-tracker/viva',
  '/docs/template-engine',
  '/demos',
  '/projects/attendance-system/demo?feature=summary',
  '/projects/attendance-system/demo?feature=mark',
  '/projects/expense-tracker/demo?feature=overview',
  '/projects/expense-tracker/demo?feature=transactions',
  '/projects/student-result-analyzer/demo?feature=dataset',
  '/projects/student-result-analyzer/demo?feature=subjects',
  '/projects/student-management-system',
  '/projects/student-management-system/demo',
  '/projects/student-management-system/demo?feature=students',
  '/projects/student-management-system/demo?feature=attendance',
  '/projects/student-management-system/demo?feature=database',
  '/my-projects',
  '/dashboard',
  '/welcome',
  '/settings',
  '/assistant',
  '/projects/attendance-system/present?slide=demo-add-student',
  '/projects/expense-tracker/present?slide=workflow',
  '/projects/student-result-analyzer/ready',
  '/no-such-page',
];

/**
 * Dialogs fade in, and Playwright counts them as visible from the first frame,
 * so axe would measure half-faded colours. Wait until the dialog has settled.
 */
async function settled(dialog: Locator) {
  await dialog.evaluate((element) =>
    Promise.all(element.getAnimations({ subtree: true }).map((animation) => animation.finished)),
  );
}

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

    test('an open troubleshooting entry has no accessibility violations', async ({ page }) => {
      await page.goto('/projects/student-result-analyzer/learn/troubleshooting');
      await page.getByText('Creating .venv fails with an ensurepip error').click();
      await expect(page.getByText('Seen on macOS on 22 Oct 2026', { exact: false })).toBeVisible();
      expect(await violations(page)).toEqual([]);
    });

    test('a revealed viva answer and its rating form have no accessibility violations', async ({
      page,
    }) => {
      await page.goto('/projects/attendance-system/viva');
      await page.getByRole('button', { name: 'Start quick practice' }).click();
      await page
        .getByRole('textbox', { name: 'Your answer' })
        .fill('It saves data in localStorage.');
      await page.getByRole('button', { name: 'Compare with the model answer' }).click();
      await expect(page.getByRole('heading', { name: 'Model answer' })).toBeVisible();
      expect(await violations(page)).toEqual([]);
    });

    test('a demo with its tour, guided demo and dialogs has no accessibility violations', async ({
      page,
    }) => {
      await page.goto('/projects/attendance-system/demo');
      await page.getByRole('button', { name: 'Take the tour' }).click();
      await expect(page.getByText('Tour · Step 1 of 5')).toBeVisible();
      expect(await violations(page)).toEqual([]);
      await page.getByRole('button', { name: 'End the tour' }).click();
      await page.getByRole('button', { name: 'Practise the demo' }).click();
      await page.getByRole('button', { name: 'Start the guided demo' }).click();
      await expect(page.getByText('Guided demo · Step 1 of 6')).toBeVisible();
      expect(await violations(page)).toEqual([]);
      await page.getByRole('button', { name: 'Add student' }).click();
      const dialog = page.getByRole('dialog', { name: 'Add student' });
      await expect(dialog).toBeVisible();
      await settled(dialog);
      expect(await violations(page)).toEqual([]);
    });

    test('the analyzer demo showing validation errors has no accessibility violations', async ({
      page,
    }) => {
      await page.goto('/projects/student-result-analyzer/demo');
      await page.getByText('File with mistakes', { exact: true }).click();
      await expect(page.getByText('Name is empty on line(s) 4.')).toBeVisible();
      expect(await violations(page)).toEqual([]);
    });

    test('the Flask simulation’s forms, record page and confirmation have no accessibility violations', async ({
      page,
    }) => {
      await page.goto('/projects/student-management-system/demo?feature=students');
      const demo = page.getByRole('region', { name: 'Student Management System demo' });
      await demo.getByRole('button', { name: 'Add a student' }).click();
      const form = page.getByRole('dialog', { name: 'Add a student' });
      await settled(form);
      await form.getByRole('button', { name: 'Add student' }).click();
      await expect(form.getByText('Enter the first name.')).toBeVisible();
      expect(await violations(page)).toEqual([]);
      await form.getByRole('button', { name: 'Cancel' }).click();

      await demo.getByRole('button', { name: 'Aarav Sharma' }).click();
      await expect(demo.getByRole('heading', { level: 2, name: 'Aarav Sharma' })).toBeFocused();
      expect(await violations(page)).toEqual([]);
      await demo.getByRole('button', { name: 'Delete' }).click();
      const confirm = page.getByRole('alertdialog', { name: 'Delete Aarav Sharma?' });
      await settled(confirm);
      expect(await violations(page)).toEqual([]);
    });

    test('My projects with a restore preview and a restored project has no accessibility violations', async ({
      page,
    }) => {
      await page.goto('/my-projects');
      await page.getByLabel('Backup file (.json)').setInputFiles({
        name: 'campuskit-progress-2026-10-29.json',
        mimeType: 'application/json',
        buffer: Buffer.from(
          JSON.stringify({
            format: 'campuskit-progress',
            version: 1,
            exportedOn: '2026-10-29',
            projects: { 'expense-tracker': { checklist: ['a', 'b'] } },
          }),
        ),
      });
      const dialog = page.getByRole('dialog', { name: 'Restore this backup?' });
      await settled(dialog);
      expect(await violations(page)).toEqual([]);
      // And the page with a project's progress on it.
      await dialog.getByRole('button', { name: 'Restore this backup' }).click();
      await expect(page.getByRole('article', { name: 'Personal Expense Tracker' })).toContainText(
        /\d+ of \d+ ticked/,
      );
      expect(await violations(page)).toEqual([]);
    });

    test('a student project in the list and on its own page has no accessibility violations', async ({
      page,
    }) => {
      await page.goto('/my-projects');
      await page.getByRole('button', { name: 'New project' }).click();
      const dialog = page.getByRole('dialog', { name: 'New project' });
      await settled(dialog);
      expect(await violations(page)).toEqual([]);
      await dialog.getByRole('textbox', { name: 'Title' }).fill('Library Seat Finder');
      await dialog.getByRole('textbox', { name: /^Tags/ }).fill('team, final year');
      await dialog.getByRole('button', { name: 'Create project' }).click();
      const milestones = page.getByRole('region', { name: 'Milestones' });
      await milestones.getByRole('textbox', { name: 'New milestone' }).fill('First demo');
      await milestones.getByLabel(/^Due date/).fill('2020-01-01');
      await milestones.getByRole('button', { name: 'Add' }).click();
      await expect(milestones.getByText('overdue', { exact: false })).toBeVisible();
      expect(await violations(page)).toEqual([]);
      await page.getByRole('link', { name: 'README and viva sheet' }).click();
      await expect(page.getByRole('region', { name: 'Preview: README' })).toBeVisible();
      expect(await violations(page)).toEqual([]);
      await page.getByRole('radio', { name: 'Viva preparation sheet' }).check();
      await expect(
        page.getByRole('region', { name: 'Preview: Viva preparation sheet' }),
      ).toBeVisible();
      expect(await violations(page)).toEqual([]);
      await page.goto('/my-projects');
      await expect(page.getByRole('article', { name: 'Library Seat Finder' })).toBeVisible();
      expect(await violations(page)).toEqual([]);
    });

    test('the command palette and the shortcut list have no accessibility violations', async ({
      page,
    }) => {
      await page.goto('/projects');
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
      await page.keyboard.press('ControlOrMeta+k');
      const palette = page.getByRole('dialog', { name: 'Go to anything' });
      await settled(palette);
      await expect(palette.getByRole('combobox')).toBeFocused();
      await palette.getByRole('combobox').fill('python');
      expect(await violations(page)).toEqual([]);
      await page.keyboard.press('Escape');
      await page.keyboard.press('?');
      const shortcuts = page.getByRole('dialog', { name: 'Keyboard shortcuts' });
      await settled(shortcuts);
      expect(await violations(page)).toEqual([]);
    });

    test('a mock viva and the viva progress page have no accessibility violations', async ({
      page,
    }) => {
      await page.goto('/projects/attendance-system/viva');
      await page.getByRole('button', { name: 'Start a mock viva' }).click();
      await expect(page.getByText(/Time left for this answer/)).toBeVisible();
      expect(await violations(page)).toEqual([]);
      await page.getByRole('button', { name: /I don’t know yet/ }).click();
      for (const criterion of [
        'Correctness',
        'Conceptual understanding',
        'Explanation clarity',
        'Awareness of limitations',
      ])
        await page.getByRole('group', { name: criterion }).getByText('Partly').click();
      await page.getByRole('button', { name: 'Save rating and continue' }).click();
      await page.goto('/viva/progress');
      await expect(
        page.getByRole('region', { name: 'Student Attendance System', exact: true }),
      ).toContainText('Topics that need work');
      expect(await violations(page)).toEqual([]);
    });

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
