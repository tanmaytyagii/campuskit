/**
 * Shared test fixture: every page is watched for JavaScript errors, failed
 * requests and Content Security Policy violations, and a test fails if any
 * happen, even when its own assertions pass.
 */
import { test as base, expect, type Page } from '@playwright/test';

interface Fixtures {
  /** Problems seen so far. A test that causes errors on purpose can clear it. */
  problems: string[];
}

export const test = base.extend<Fixtures>({
  problems: [
    async ({ page }, use) => {
      const problems: string[] = [];
      page.on('pageerror', (error) => problems.push(`page error: ${error.message}`));
      page.on('console', (message) => {
        if (message.type() === 'error') problems.push(`console error: ${message.text()}`);
      });
      page.on('requestfailed', (request) => {
        // Downloads use blob: URLs that the browser hands over to the download manager.
        if (!request.url().startsWith('blob:'))
          problems.push(
            `request failed: ${request.url()} (${request.failure()?.errorText ?? 'unknown'})`,
          );
      });
      page.on('response', (response) => {
        if (response.status() >= 400) problems.push(`HTTP ${response.status()}: ${response.url()}`);
      });
      await page.addInitScript(() => {
        document.addEventListener('securitypolicyviolation', (event) => {
          console.error(`CSP violation: ${event.violatedDirective} blocked ${event.blockedURI}`);
        });
      });
      await use(problems);
      expect(problems, 'the page reported errors').toEqual([]);
    },
    { auto: true },
  ],
});

export { expect };

/** True when the page is wider than the viewport (horizontal scrolling). */
export async function hasHorizontalOverflow(page: Page): Promise<boolean> {
  return page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
}

export function isMobile(projectName: string): boolean {
  return projectName === 'mobile';
}
