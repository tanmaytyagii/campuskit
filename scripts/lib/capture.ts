/**
 * Shared screenshot helpers. Every page gets the same viewport, locale, time
 * zone and a frozen clock, so screenshots of demo data are reproducible.
 */
import { mkdir } from 'node:fs/promises';
import { join, relative } from 'node:path';

import type { Browser, Page } from 'playwright-core';

export const FIXED_TIME = new Date('2026-10-21T10:30:00+05:30');
const VIEWPORT = { width: 1280, height: 800 };

export interface Shot {
  file: string;
  path?: string;
  prepare?: (page: Page) => Promise<void>;
  viewport?: { width: number; height: number };
  colorScheme?: 'light' | 'dark';
}

async function newPage(browser: Browser, shot: Shot): Promise<Page> {
  const context = await browser.newContext({
    viewport: shot.viewport ?? VIEWPORT,
    deviceScaleFactor: 1,
    colorScheme: shot.colorScheme ?? 'light',
    reducedMotion: 'reduce',
    locale: 'en-IN',
    timezoneId: 'Asia/Kolkata',
  });
  const page = await context.newPage();
  await page.clock.setFixedTime(FIXED_TIME);
  return page;
}

/** Opens each shot's page, runs its `prepare` step and saves a PNG into `outDir`. */
export async function capture(
  browser: Browser,
  baseUrl: string,
  outDir: string,
  shots: Shot[],
): Promise<void> {
  await mkdir(outDir, { recursive: true });
  for (const shot of shots) {
    const page = await newPage(browser, shot);
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto(new URL(shot.path ?? '', baseUrl).toString(), { waitUntil: 'networkidle' });
    if (shot.prepare) await shot.prepare(page);
    await page.waitForTimeout(400);
    const target = join(outDir, shot.file);
    await page.screenshot({ path: target, fullPage: false });
    await page.context().close();
    if (errors.length > 0) throw new Error(`${shot.file}: page errors: ${errors.join('; ')}`);
    console.log(`  ✓ ${relative(process.cwd(), target)}`);
  }
}
