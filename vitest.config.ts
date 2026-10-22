/**
 * `pnpm test` runs every workspace test suite in one Vitest process:
 * the template engine, the project catalog, the web app and the
 * repository-level tests in tests/.
 *
 * The starter projects in templates/ have their own test suites and are
 * tested on their own (see scripts/verify-generated-projects.ts).
 */
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    projects: [
      'packages/template-engine',
      'packages/project-catalog',
      'apps/web',
      {
        test: {
          name: 'repository',
          environment: 'node',
          include: ['tests/**/*.test.ts'],
          testTimeout: 60_000,
        },
      },
    ],
  },
});
