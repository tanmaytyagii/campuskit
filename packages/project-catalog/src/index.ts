/**
 * @campuskit/project-catalog — the validated list of CampusKit projects.
 *
 * To add a project, create manifests/<id>.json and register it in
 * src/registry.ts. `pnpm validate:catalog` fails if a manifest file exists but
 * is not registered, or the other way round.
 */
import { parseCatalog } from './catalog.ts';
import { REGISTERED_MANIFESTS } from './registry.ts';
import type { ProjectManifest } from './schema.ts';

export const catalog: readonly ProjectManifest[] = parseCatalog([...REGISTERED_MANIFESTS]);

export function getProjectBySlug(slug: string): ProjectManifest | undefined {
  return catalog.find((project) => project.slug === slug);
}

export function getProjectById(id: string): ProjectManifest | undefined {
  return catalog.find((project) => project.id === id);
}

export * from './catalog.ts';
export * from './labels.ts';
export * from './markdown-links.ts';
export { REGISTERED_MANIFESTS } from './registry.ts';
export * from './schema.ts';
export * from './setup-guide.ts';
