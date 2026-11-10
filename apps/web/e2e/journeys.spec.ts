/**
 * Four student journeys from start to finish. Each moves through the site by its own links, as a
 * student would, and checks that what one page saves is what the next one shows.
 */
import { readFile } from 'node:fs/promises';

import JSZip from 'jszip';

import { expect, isMobile, test } from './fixtures.ts';

test('discover a project, download a customized copy and move on to learning it', async ({
  page,
}, testInfo) => {
  await page.goto('/');
  if (isMobile(testInfo.project.name))
    await page.getByRole('button', { name: 'Open menu' }).click();
  await page
    .getByRole('navigation', { name: 'Main' })
    .getByRole('link', { name: 'Projects' })
    .click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Projects');

  await page.getByRole('searchbox', { name: 'Search', exact: true }).fill('budget');
  await expect(page.getByRole('status').filter({ hasText: 'projects' })).toHaveText(
    'Showing 1 of 4 projects',
  );
  await page.getByRole('link', { name: 'Personal Expense Tracker', exact: true }).click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Personal Expense Tracker');

  // The generator opens on the template the student came from.
  await page.getByRole('link', { name: 'Customize and download' }).click();
  await expect(page.getByRole('heading', { name: 'Name your project' })).toBeVisible();
  await page.getByRole('textbox', { name: 'Project name' }).fill('Hostel Budget Buddy');
  await page.getByRole('button', { name: 'Continue to options' }).click();
  await page.getByRole('button', { name: 'Review your project' }).click();
  await expect(page.getByText('will be packed into')).toContainText('hostel-budget-buddy.zip');

  const downloading = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Generate ZIP' }).click();
  const download = await downloading;
  expect(download.suggestedFilename()).toBe('hostel-budget-buddy.zip');
  const zip = await JSZip.loadAsync(await readFile(await download.path()));
  const config = zip.file('hostel-budget-buddy/src/app.config.json');
  expect(JSON.parse((await config?.async('string')) ?? '{}')).toMatchObject({
    appName: 'Hostel Budget Buddy',
  });

  await expect(
    page.getByRole('heading', { name: 'hostel-budget-buddy.zip is ready' }),
  ).toBeVisible();
  await page.getByRole('link', { name: /^Learn how it works/ }).click();
  await expect(page).toHaveURL(/\/projects\/expense-tracker\/learn$/);
  await expect(
    page.getByRole('navigation', { name: 'Learning studio sections' }).getByRole('link', {
      name: 'Overview',
    }),
  ).toHaveAttribute('aria-current', 'page');
});

test('learn the code, practise the viva and see it counted in the readiness check', async ({
  page,
}) => {
  await page.goto('/projects/attendance-system');
  await page
    .getByRole('region', { name: 'Learn and present' })
    .getByRole('link', { name: 'Open the learning studio' })
    .click();
  const sections = page.getByRole('navigation', { name: 'Learning studio sections' });
  await sections.getByRole('link', { name: 'Code walkthrough' }).click();
  await expect(page.getByRole('heading', { level: 2, name: 'Code walkthrough' })).toBeVisible();

  // A walkthrough link opens the real definition in the source browser.
  await page
    .getByRole('navigation', { name: 'Files in this walkthrough' })
    .getByRole('link', { name: /Attendance calculations/ })
    .click();
  await page.getByRole('link', { name: 'attendancePercentage' }).first().click();
  await expect(page.getByText(/attendancePercentage is defined on line \d+/)).toBeVisible();

  await page
    .getByRole('navigation', { name: 'Breadcrumb' })
    .getByRole('link', { name: 'Student Attendance System' })
    .click();
  await page.getByRole('link', { name: 'Practise viva questions' }).click();
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

  // The rating is the student's own, kept in this browser, and the readiness check counts it.
  await page
    .getByRole('navigation', { name: 'Breadcrumb' })
    .getByRole('link', { name: 'Student Attendance System' })
    .click();
  await page.getByRole('link', { name: 'Check your readiness' }).click();
  const viva = page.getByRole('listitem').filter({
    has: page.getByRole('heading', { name: 'Practise the viva questions' }),
  });
  await expect(viva).toContainText(/1 of \d+ questions practised: 0 confident, 0 need a little/);
  await expect(viva).toContainText('1 to review again');
});

test('try the demo, present the project and come back to the same demo data', async ({
  page,
}, testInfo) => {
  await page.goto('/projects/expense-tracker');
  await page.getByRole('link', { name: 'Try the interactive demo' }).click();
  const demo = page.getByRole('region', { name: 'Personal Expense Tracker demo' });
  await demo.getByRole('tab', { name: 'Transactions' }).click();
  const count = demo.getByText(/^Showing all \d+ transactions$/);
  const before = Number((await count.textContent())?.match(/\d+/)?.[0]);

  await demo.getByRole('button', { name: 'Add transaction' }).click();
  const dialog = page.getByRole('dialog', { name: 'Add transaction' });
  await dialog.getByRole('textbox', { name: 'Amount (INR)' }).fill('120');
  await dialog.getByRole('button', { name: 'Add transaction' }).click();
  await expect(demo.getByText('Added expense of ₹120.00.')).toBeVisible();
  await expect(count).toHaveText(`Showing all ${before + 1} transactions`);

  await page.getByRole('link', { name: /^Present the project/ }).click();
  await expect(
    page.getByRole('heading', { level: 1, name: 'Personal Expense Tracker' }),
  ).toBeVisible();
  if (isMobile(testInfo.project.name)) {
    await page.getByRole('link', { name: 'Exit', exact: true }).click();
  } else {
    await expect(page.getByText(/· Slide 1 of \d+$/)).toBeVisible();
    await page.keyboard.press('ArrowRight');
    await expect(page.getByText(/· Slide 2 of \d+$/)).toBeVisible();
    await page.keyboard.press('Escape');
  }
  await expect(page).toHaveURL(/\/projects\/expense-tracker$/);

  // The demo's data lasts for the tab, so the rehearsal can go on where it stopped.
  await page.getByRole('link', { name: 'Try the interactive demo' }).click();
  await demo.getByRole('tab', { name: 'Transactions' }).click();
  await expect(count).toHaveText(`Showing all ${before + 1} transactions`);
});

test('check readiness, draft the report and see the readiness check follow it', async ({
  page,
}) => {
  await page.goto('/projects/student-result-analyzer');
  await page.getByRole('link', { name: 'Check your readiness' }).click();
  const score = page.getByText(/^\d+%$/);
  const before = Number((await score.textContent())?.replace('%', ''));
  const report = page.getByRole('listitem').filter({
    has: page.getByRole('heading', { name: 'Finish the report draft' }),
  });
  await expect(report).toContainText('You haven’t saved a report draft for this project yet.');

  await report.getByRole('link', { name: 'Submission workspace' }).click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Submission workspace');
  await page.getByRole('textbox', { name: 'Team members' }).fill('Asha Rao, Ravi Teja');
  await expect(page.getByText('Saved automatically in this browser only.')).toBeVisible();
  const downloading = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download Markdown (.md)' }).click();
  const text = await readFile(await (await downloading).path(), 'utf8');
  expect(text).toContain('Asha Rao, Ravi Teja');
  expect(text).toContain('## Appendix A: Project facts from CampusKit');

  // Back in the readiness check, the saved draft is counted by its unfinished prompts.
  await page.goBack();
  await expect(report).toContainText(/\d+ prompts? left in your saved draft\./);
  const tests = page.getByRole('listitem').filter({
    has: page.getByRole('heading', { name: 'Run the project’s tests' }),
  });
  await tests.getByRole('checkbox', { name: 'I’ve done this on my computer' }).check();
  await expect(score).not.toHaveText(`${before}%`);
  await page.reload();
  await expect(
    tests.getByRole('checkbox', { name: 'I’ve done this on my computer' }),
  ).toBeChecked();
});
