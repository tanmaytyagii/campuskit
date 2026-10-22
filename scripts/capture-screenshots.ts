/**
 * `pnpm screenshots [templates|web|<template-id>...]`
 *
 * Captures real screenshots of the running apps:
 *  - each React template is built and served from its dist/ folder;
 *  - the Streamlit template is started with the Python in CAMPUSKIT_PYTHON
 *    (default: python3) — install its requirements first;
 *  - the CampusKit web app is served from apps/web/dist (run `pnpm build`).
 *
 * The browser clock is frozen at 21 October 2026 so demo data, and therefore
 * the screenshots, are the same every time.
 *
 * Prerequisites: `npm ci` inside each React template, and Chromium
 * (`pnpm playwright:install`, or set CAMPUSKIT_CHROMIUM).
 */
import { spawn, spawnSync, type ChildProcess } from 'node:child_process';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import type { Browser, Page } from 'playwright-core';

import { launchBrowser } from './lib/browser.ts';
import { capture, type Shot } from './lib/capture.ts';
import { serveStatic } from './lib/static-server.ts';
import { captureWebApp } from './lib/web-screenshots.ts';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
function run(command: string, args: string[], cwd: string): void {
  const result = spawnSync(command, args, {
    cwd,
    stdio: 'inherit',
    shell: process.platform === 'win32',
  });
  if (result.status !== 0) throw new Error(`${command} ${args.join(' ')} failed in ${cwd}`);
}

async function captureReactTemplate(browser: Browser, id: string, port: number, shots: Shot[]) {
  const directory = join(repoRoot, 'templates', id);
  console.log(`\n${id}: building`);
  run('npm', ['run', 'build', '--silent'], directory);
  const server = await serveStatic(join(directory, 'dist'), port);
  try {
    await capture(browser, server.url, join(directory, 'docs', 'screenshots'), shots);
  } finally {
    await server.close();
  }
}

async function waitForUrl(url: string, timeoutMs: number): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(url);
      if (response.ok) return;
    } catch {
      // not up yet
    }
    await new Promise((done) => setTimeout(done, 500));
  }
  throw new Error(`Timed out waiting for ${url}`);
}

async function captureStreamlit(browser: Browser, port: number) {
  const id = 'student-result-analyzer';
  const directory = join(repoRoot, 'templates', id);
  const python = process.env.CAMPUSKIT_PYTHON ?? 'python3';
  console.log(`\n${id}: starting Streamlit with ${python}`);
  const child: ChildProcess = spawn(
    python,
    [
      '-m',
      'streamlit',
      'run',
      'app.py',
      '--server.headless',
      'true',
      '--server.port',
      String(port),
    ],
    { cwd: directory, stdio: 'ignore' },
  );
  try {
    const url = `http://127.0.0.1:${port}/`;
    await waitForUrl(`${url}_stcore/health`, 60_000);
    const waitForApp = async (page: Page) => {
      await page.getByRole('heading', { level: 1 }).first().waitFor();
      await page.waitForTimeout(1500); // let charts finish rendering
    };
    const openTab = (name: string) => async (page: Page) => {
      await waitForApp(page);
      await page.getByRole('tab', { name }).click();
      // Scroll so the tab's content starts at the top of the screenshot.
      await page
        .getByRole('tablist')
        .first()
        .evaluate((element) => element.scrollIntoView({ block: 'start' }));
      await page.waitForTimeout(1500);
    };
    await capture(browser, url, join(directory, 'docs', 'screenshots'), [
      { file: 'overview.png', prepare: waitForApp },
      { file: 'subjects.png', prepare: openTab('Subjects') },
      { file: 'grades.png', prepare: openTab('Grades') },
      {
        file: 'validation.png',
        prepare: async (page) => {
          await waitForApp(page);
          await page.getByText('Upload a CSV file', { exact: true }).click();
          await page
            .locator('input[type="file"]')
            .setInputFiles(join(directory, 'data', 'sample_with_errors.csv'));
          await page.getByText('can’t be analysed yet').waitFor();
          await page.waitForTimeout(800);
        },
      },
    ]);
  } finally {
    child.kill();
  }
}

async function markSomeAttendance(page: Page) {
  await page.getByRole('button', { name: 'Mark all present' }).click();
  for (const [name, status] of [
    ['Kabir Singh', 'Absent'],
    ['Rohan Das', 'Late'],
    ['Meera Iyer', 'Absent'],
  ] as const) {
    await page
      .getByRole('group', { name: new RegExp(name) })
      .getByRole('radio', { name: status })
      .check();
  }
}

const targets = new Set(process.argv.slice(2));
const wants = (name: string, group: 'templates' | 'web') =>
  targets.size === 0 || targets.has(group) || targets.has(name);

const browser = await launchBrowser();
try {
  if (wants('attendance-system', 'templates')) {
    await captureReactTemplate(browser, 'attendance-system', 4410, [
      { file: 'dashboard.png' },
      { file: 'mark-attendance.png', path: '#/mark', prepare: markSomeAttendance },
      { file: 'students.png', path: '#/students' },
    ]);
  }
  if (wants('expense-tracker', 'templates')) {
    await captureReactTemplate(browser, 'expense-tracker', 4411, [
      { file: 'overview.png' },
      {
        file: 'transactions.png',
        path: '#/transactions',
        prepare: async (page) => {
          await page.getByLabel('Period').selectOption('last-30-days');
        },
      },
      { file: 'settings.png', path: '#/settings' },
    ]);
  }
  if (wants('student-result-analyzer', 'templates')) {
    await captureStreamlit(browser, 4412);
  }
  if (wants('web', 'web')) {
    await captureWebApp(browser, repoRoot, 4413);
  }
} finally {
  await browser.close();
}
console.log('\nScreenshots captured.');
