/**
 * Which templates a change can affect, so pull requests run the slow
 * install-test-build verification only where it matters. Changes to the
 * engine, the catalog code, the verification script or the dependencies can
 * affect every generated project, so they select all templates.
 */

/** Paths whose changes can affect every generated project. */
const AFFECTS_ALL = [
  /^packages\/template-engine\/src\//,
  /^packages\/project-catalog\/src\//,
  /^scripts\/verify-generated-projects\.ts$/,
  /^pnpm-lock\.yaml$/,
  /^package\.json$/,
  /^\.nvmrc$/,
  /^\.github\/workflows\/ci\.yml$/,
];

export type ChangedTemplates = { kind: 'all' } | { kind: 'some'; ids: string[] };

export function templatesForChanges(
  changedPaths: readonly string[],
  templateIds: readonly string[],
): ChangedTemplates {
  if (changedPaths.some((path) => AFFECTS_ALL.some((pattern) => pattern.test(path)))) {
    return { kind: 'all' };
  }
  const ids = new Set<string>();
  for (const path of changedPaths) {
    const template = /^templates\/([^/]+)\//.exec(path)?.[1];
    const manifest = /^packages\/project-catalog\/manifests\/([^/]+)\.json$/.exec(path)?.[1];
    for (const id of [template, manifest]) {
      if (id && templateIds.includes(id)) ids.add(id);
    }
    // A new template has no manifest in the base branch yet, but its folder is enough.
    if (template && !templateIds.includes(template)) return { kind: 'all' };
  }
  return { kind: 'some', ids: [...ids].sort() };
}
