/**
 * Automated accessibility checks with axe-core on every page type.
 *
 * jsdom has no layout engine, so two rules are left to the real-browser
 * end-to-end tests (e2e/accessibility.spec.ts), which run axe with every rule:
 * - color-contrast needs rendered colours;
 * - landmark-unique: some navigation is duplicated for mobile and desktop and
 *   hidden with CSS, which jsdom does not apply.
 */
import { screen } from '@testing-library/react';
import axe from 'axe-core';
import { describe, expect, it } from 'vitest';

import { renderRoute } from './test/render.tsx';

const PAGES = [
  '/',
  '/projects',
  '/projects?category=ai-ml',
  '/projects/attendance-system',
  '/projects/student-result-analyzer/docs/viva',
  '/projects/expense-tracker/source?file=src%2Fapp.config.json',
  '/generate',
  '/generate?template=attendance-system',
  '/learn',
  '/learn/report?project=expense-tracker',
  '/viva',
  '/compare?ids=attendance-system,student-result-analyzer&goal=python',
  '/projects/attendance-system/learn',
  '/projects/attendance-system/learn/architecture',
  '/projects/expense-tracker/learn/code',
  '/projects/student-result-analyzer/learn/checklist',
  '/projects/student-result-analyzer/learn/troubleshooting',
  '/projects/expense-tracker/viva',
  '/docs',
  '/docs/contributing',
  '/no-such-page',
];

async function violations(path: string): Promise<string[]> {
  const view = renderRoute(path);
  await screen.findAllByRole('heading', { level: 1 });
  // Let lazy content (Markdown documents, source files) finish loading.
  await new Promise((resolve) => setTimeout(resolve, 50));
  const results = await axe.run(document, {
    rules: { 'color-contrast': { enabled: false }, 'landmark-unique': { enabled: false } },
  });
  view.unmount();
  return results.violations.map(
    (violation) =>
      `${violation.id} (${violation.impact ?? 'unknown'}): ${violation.nodes.map((node) => node.target.join(' ')).join(' | ')}`,
  );
}

describe('accessibility (axe-core)', () => {
  it.each(PAGES)('%s has no detectable violations', async (path) => {
    expect(await violations(path)).toEqual([]);
  });
});
