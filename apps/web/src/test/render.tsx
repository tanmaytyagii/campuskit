/**
 * Test helpers: render the real app routes in memory, with template bundles
 * built from the real template folders on disk instead of fetched over HTTP.
 */
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { getProjectById } from '@campuskit/project-catalog';
import type { TemplateBundle } from '@campuskit/template-engine';
import { buildTemplateBundle } from '@campuskit/template-engine/node';
import { render } from '@testing-library/react';
// Tests use RouterProvider from 'react-router' (not 'react-router/dom' as in main.tsx): under
// Vitest the two entry points resolve to different module formats and would not share context.
import { createMemoryRouter, RouterProvider } from 'react-router';

import { ThemeProvider } from '../hooks/useTheme.tsx';
import { BundleLoaderProvider } from '../lib/bundle-context.tsx';
import type { BundleLoader } from '../lib/bundles.ts';
import { routes } from '../routes.tsx';

export const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..', '..', '..');

const bundles = new Map<string, Promise<TemplateBundle>>();

export const diskBundleLoader: BundleLoader = (templateId) => {
  const existing = bundles.get(templateId);
  if (existing) return existing;
  const project = getProjectById(templateId);
  if (!project) return Promise.reject(new Error(`Unknown template ${templateId}`));
  const loading = buildTemplateBundle(join(repoRoot, project.template.directory), {
    templateId: project.id,
    templateVersion: project.version,
  }).then((result) => result.bundle);
  bundles.set(templateId, loading);
  return loading;
};

export function renderRoute(path: string, options: { loader?: BundleLoader } = {}) {
  const router = createMemoryRouter(routes, { initialEntries: [path] });
  const utils = render(
    <ThemeProvider>
      <BundleLoaderProvider loader={options.loader ?? diskBundleLoader}>
        <RouterProvider router={router} />
      </BundleLoaderProvider>
    </ThemeProvider>,
  );
  return { ...utils, router };
}
