/**
 * Screenshots of the CampusKit website for the README, taken from the
 * production build in apps/web/dist (run `pnpm build` first).
 */
import { existsSync } from 'node:fs';
import { join } from 'node:path';

import type { Browser } from 'playwright-core';

import { capture } from './capture.ts';
import { serveStatic } from './static-server.ts';

export async function captureWebApp(
  browser: Browser,
  repoRoot: string,
  port: number,
): Promise<void> {
  const dist = join(repoRoot, 'apps', 'web', 'dist');
  if (!existsSync(join(dist, 'index.html')))
    throw new Error('apps/web/dist is missing. Run "pnpm build" first.');
  console.log('\nweb: serving apps/web/dist');
  const server = await serveStatic(dist, port);
  try {
    await capture(browser, server.url, join(repoRoot, 'docs', 'screenshots'), [
      { file: 'home.png' },
      { file: 'home-dark.png', colorScheme: 'dark' },
      { file: 'gallery.png', path: 'projects' },
      { file: 'project.png', path: 'projects/student-result-analyzer' },
      {
        file: 'generator.png',
        path: 'generate?template=attendance-system',
        prepare: async (page) => {
          const name = page.getByRole('textbox', { name: 'Project name' });
          await name.fill('Riya’s Lab <Attendance>');
          await page
            .getByRole('textbox', { name: 'Institution name (optional)' })
            .fill('St. Xavier’s College');
        },
      },
      {
        file: 'generator-done.png',
        path: 'generate?template=expense-tracker&name=Hostel%20Budget',
        prepare: async (page) => {
          await page.getByRole('button', { name: 'Continue to options' }).click();
          await page.getByRole('button', { name: 'Review your project' }).click();
          await page.getByText('will be packed into').waitFor();
          await page.getByRole('button', { name: 'Generate ZIP' }).click();
          await page.getByRole('heading', { name: 'hostel-budget.zip is ready' }).waitFor();
        },
      },
      { file: 'learn.png', path: 'learn/report?project=attendance-system' },
      {
        file: 'learning-studio.png',
        path: 'projects/attendance-system/learn/architecture',
        prepare: async (page) => {
          await page.getByRole('button', { name: 'localStorage persistence' }).click();
          await page.evaluate(() => window.scrollTo(0, 0));
        },
      },
      {
        file: 'viva-practice.png',
        path: 'projects/expense-tracker/viva',
        prepare: async (page) => {
          // Questions are shuffled; a fixed "random" number makes the screenshot repeatable.
          await page.evaluate(() => {
            Math.random = () => 0.5;
          });
          await page.getByRole('combobox', { name: 'Topic' }).selectOption('data-structures');
          await page.getByRole('button', { name: 'Start this topic' }).click();
          await page
            .getByRole('textbox', { name: 'Your answer' })
            .fill('Amounts are whole numbers of paise, so adding them never rounds.');
          await page.getByRole('button', { name: 'Compare with the model answer' }).click();
          await page.getByRole('heading', { name: 'Model answer' }).waitFor();
          // Start the picture at the question, below the sticky header.
          await page
            .getByRole('heading', { level: 2, name: /\?$/ })
            .evaluate((element) =>
              window.scrollTo(0, element.getBoundingClientRect().top + window.scrollY - 96),
            );
        },
      },
      {
        file: 'compare.png',
        path: 'compare?ids=attendance-system,student-result-analyzer&goal=first-project',
      },
      { file: 'mobile-home.png', viewport: { width: 390, height: 844 } },
    ]);
  } finally {
    await server.close();
  }
}
