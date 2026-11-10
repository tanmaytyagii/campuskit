/**
 * `pnpm smoke <site URL> [--expect-entry assets/index-….js]`
 *
 * Checks a deployed CampusKit site in a real browser, as the last step of the Pages workflow
 * or by hand: `pnpm smoke https://tanmaytyagii.github.io/campuskit/`.
 *
 *  1. With --expect-entry, waits (bounded) until the site serves that build, so the checks
 *     test the new deployment and not a cached old one.
 *  2. Fetches every script, stylesheet and icon the home page loads.
 *  3. Opens the home page, every project page, the generator, each project's demo (when its
 *     page links to one) and an unknown address, and checks the headings they show.
 *  4. Downloads one project ZIP and checks its contents.
 *
 * Transient CDN answers (429, 502–504) and network errors are retried with doubling waits;
 * anything else fails the check. Results go to the console, to the job summary in GitHub
 * Actions, and screenshots of failed pages to smoke-report/.
 *
 * Needs Chromium: `pnpm playwright:install`.
 */
import { appendFile, mkdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';

import { catalog } from '@campuskit/project-catalog';
import JSZip from 'jszip';

import { launchBrowser } from './lib/browser.ts';
import {
  fetchWithRetry,
  linkedAssets,
  summaryTable,
  waitForDeployment,
  zipProblems,
  type CheckResult,
} from './lib/smoke.ts';

const args = process.argv.slice(2);
const siteArg = args.find((arg) => !arg.startsWith('--'));
const entryIndex = args.indexOf('--expect-entry');
const expectedEntry = entryIndex === -1 ? undefined : args[entryIndex + 1];
if (!siteArg) {
  console.error('Usage: pnpm smoke <site URL> [--expect-entry assets/index-….js]');
  process.exit(2);
}
const site = siteArg.endsWith('/') ? siteArg : `${siteArg}/`;
const reportDir = 'smoke-report';
const results: CheckResult[] = [];

function record(name: string, ok: boolean, detail: string): void {
  results.push({ name, ok, detail });
  console.log(`${ok ? '✓' : '✗'} ${name}: ${detail}`);
}

async function check(name: string, run: () => Promise<string>): Promise<void> {
  try {
    record(name, true, await run());
  } catch (error) {
    record(name, false, (error as Error).message);
  }
}

// 1. The new build, and its assets.
let homeHtml = '';
await check(expectedEntry ? 'The new build is live' : 'The site answers', async () => {
  if (expectedEntry) {
    const { checks, html } = await waitForDeployment(site, expectedEntry);
    homeHtml = html;
    return `serving ${expectedEntry} (check ${checks})`;
  }
  const response = await fetchWithRetry(site);
  homeHtml = await response.text();
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return `HTTP ${response.status}`;
});

if (homeHtml) {
  await check('Linked assets', async () => {
    const assets = linkedAssets(homeHtml, site);
    const failed: string[] = [];
    for (const asset of assets) {
      const response = await fetchWithRetry(asset);
      if (!response.ok) failed.push(`${asset}: HTTP ${response.status}`);
      await response.arrayBuffer();
    }
    if (failed.length > 0) throw new Error(failed.join('; '));
    return `${assets.length} assets answered 200`;
  });
}

// 2. Pages in a browser.
const browser = await launchBrowser();
const context = await browser.newContext({ acceptDownloads: true });
const page = await context.newPage();
const pageProblems: string[] = [];
page.on('pageerror', (error) => pageProblems.push(`script error: ${error.message}`));
page.on('response', (response) => {
  // A deep link is answered by 404.html with status 404, by design; its files must still load.
  if (response.request().resourceType() !== 'document' && response.status() >= 400)
    pageProblems.push(`HTTP ${response.status()} for ${response.url()}`);
});

async function openPage(path: string): Promise<string> {
  pageProblems.length = 0;
  let lastError: unknown;
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      await page.goto(new URL(path, site).toString(), {
        waitUntil: 'networkidle',
        timeout: 45_000,
      });
      const heading = await page
        .getByRole('heading', { level: 1 })
        .first()
        .textContent({ timeout: 15_000 });
      return (heading ?? '').trim();
    } catch (error) {
      lastError = error;
      await new Promise((done) => setTimeout(done, 2000 * attempt));
    }
  }
  throw lastError instanceof Error ? lastError : new Error(String(lastError));
}

async function pageCheck(
  name: string,
  path: string,
  verify: (heading: string) => string | Promise<string>,
) {
  await check(name, async () => {
    try {
      const heading = await openPage(path);
      const detail = await verify(heading);
      if (pageProblems.length > 0) throw new Error(pageProblems.slice(0, 5).join('; '));
      return detail;
    } catch (error) {
      await mkdir(reportDir, { recursive: true });
      const file = join(reportDir, `${name.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}.png`);
      await page.screenshot({ path: file, fullPage: true }).catch(() => undefined);
      throw new Error(`${(error as Error).message.split('\n')[0]} (at ${page.url()})`, {
        cause: error,
      });
    }
  });
}

function expectHeading(heading: string, wanted: string): string {
  if (heading !== wanted) throw new Error(`the main heading is “${heading}”, expected “${wanted}”`);
  return `shows “${wanted}”`;
}

await pageCheck('Home page', '', (heading) => {
  if (!heading) throw new Error('no main heading');
  return `shows “${heading}”`;
});

for (const project of catalog) {
  await pageCheck(`Project page: ${project.name}`, `projects/${project.slug}`, async (heading) => {
    const shown = expectHeading(heading, project.name);
    const demo = page.getByRole('link', { name: 'Try the interactive demo' });
    if ((await demo.count()) === 0) return shown;
    await demo.first().click();
    const region = page.getByRole('region', { name: `${project.name} demo` });
    await region.waitFor({ timeout: 20_000 });
    return `${shown}; its demo opens`;
  });
}

const first = catalog[0];
if (first) {
  await pageCheck('Generator', `generate?template=${first.id}`, async (heading) => {
    expectHeading(heading, 'Generate a project');
    await page.getByRole('heading', { name: 'Name your project' }).waitFor({ timeout: 15_000 });
    return `opens at “Name your project” for ${first.name}`;
  });
}

await pageCheck('Unknown address', 'campuskit-smoke-no-such-page', (heading) =>
  expectHeading(heading, 'This page doesn’t exist'),
);

// 3. A real ZIP, built in the browser from the deployed template bundle.
if (first) {
  await check(`Project ZIP: ${first.name}`, async () => {
    await openPage(`projects/${first.slug}`);
    const downloading = page.waitForEvent('download', { timeout: 60_000 });
    await page.getByRole('button', { name: 'Download with defaults' }).click();
    const download = await downloading;
    const zip = await JSZip.loadAsync(await readFile(await download.path()));
    const names = Object.keys(zip.files);
    const problems = zipProblems(names, ['README.md', 'GETTING_STARTED.md', 'LICENSE']);
    if (problems.length > 0) throw new Error(problems.join('; '));
    return `${download.suggestedFilename()}: ${names.filter((name) => !name.endsWith('/')).length} files`;
  });
}

await browser.close();

const summary = summaryTable(site, results);
if (process.env.GITHUB_STEP_SUMMARY) await appendFile(process.env.GITHUB_STEP_SUMMARY, summary);
const failed = results.filter((result) => !result.ok);
console.log(
  failed.length === 0
    ? `\nAll ${results.length} checks passed.`
    : `\n${failed.length} of ${results.length} checks failed.`,
);
process.exitCode = failed.length === 0 ? 0 : 1;
