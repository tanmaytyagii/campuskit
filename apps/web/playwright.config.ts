/**
 * End-to-end tests against the production build, in a desktop and a phone
 * viewport. `pnpm test:e2e` builds the site and serves it with `vite preview`.
 *
 * Browsers: run `pnpm playwright:install` once to download Playwright's
 * Chromium, or set CAMPUSKIT_CHROMIUM to an existing Chromium executable.
 * Set CAMPUSKIT_E2E_BROWSERS=firefox,webkit to add desktop Firefox and WebKit
 * (Safari's engine) projects; CI runs each of them in its own job.
 */
import { defineConfig, devices } from '@playwright/test';

const PORT = 4173;
const executablePath = process.env.CAMPUSKIT_CHROMIUM;
const isRoot = process.getuid?.() === 0;
const extraBrowsers = new Set(
  (process.env.CAMPUSKIT_E2E_BROWSERS ?? '')
    .split(',')
    .map((name) => name.trim())
    .filter(Boolean),
);
const desktopViewport = { width: 1280, height: 800 };

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  // One retry in CI keeps an unlucky runner from failing the build, and the github reporter
  // still writes every flaky test (and its failed attempt) as an annotation on the run.
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['list'], ['github'], ['html', { open: 'never' }]] : 'list',
  timeout: 45_000,
  use: {
    baseURL: `http://127.0.0.1:${PORT}`,
    trace: 'retain-on-failure',
    locale: 'en-IN',
    timezoneId: 'Asia/Kolkata',
    launchOptions: {
      ...(executablePath ? { executablePath } : {}),
      // Chromium refuses to start as root (common in containers) unless the sandbox is disabled.
      ...(isRoot ? { args: ['--no-sandbox'] } : {}),
    },
  },
  projects: [
    {
      name: 'desktop',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 800 } },
    },
    // A narrow phone; navigation.spec.ts also checks reflow at 320 CSS pixels.
    { name: 'mobile', use: { ...devices['Pixel 7'], viewport: { width: 360, height: 780 } } },
    ...(extraBrowsers.has('firefox')
      ? [{ name: 'firefox', use: { ...devices['Desktop Firefox'], viewport: desktopViewport } }]
      : []),
    ...(extraBrowsers.has('webkit')
      ? [{ name: 'webkit', use: { ...devices['Desktop Safari'], viewport: desktopViewport } }]
      : []),
  ],
  webServer: {
    command: `pnpm exec vite build && pnpm exec vite preview --host 127.0.0.1 --port ${PORT} --strictPort`,
    url: `http://127.0.0.1:${PORT}/`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    stdout: 'ignore',
    stderr: 'pipe',
  },
});
