/**
 * Launches headless Chromium for the screenshot and verification scripts.
 *
 * By default Playwright's own Chromium is used (install it once with
 * `pnpm exec playwright install chromium`). Set CAMPUSKIT_CHROMIUM to the path
 * of another Chromium-based browser to use that instead.
 */
import { chromium, type Browser } from 'playwright-core';

export async function launchBrowser(): Promise<Browser> {
  const executablePath = process.env.CAMPUSKIT_CHROMIUM;
  try {
    return await chromium.launch({
      headless: true,
      ...(executablePath ? { executablePath } : {}),
      // Chromium refuses to start as root (common in containers) unless the sandbox is disabled.
      args: [...(process.getuid?.() === 0 ? ['--no-sandbox'] : []), '--font-render-hinting=none'],
    });
  } catch (error) {
    throw new Error(
      `Could not start Chromium (${(error as Error).message.split('\n')[0]}).\n` +
        'Install it with "pnpm playwright:install" or set CAMPUSKIT_CHROMIUM to a Chromium executable.',
      { cause: error },
    );
  }
}
