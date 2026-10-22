/** Parses raw manifest objects into a validated, typed catalog. */
import { manifestSchema, type ProjectManifest } from './schema.ts';

export interface ManifestProblem {
  manifest: string;
  path: string;
  message: string;
}

export class CatalogError extends Error {
  readonly problems: ManifestProblem[];

  constructor(problems: ManifestProblem[]) {
    super(
      `The project catalog is invalid:\n${problems.map((problem) => `  ${problem.manifest} ${problem.path}: ${problem.message}`).join('\n')}`,
    );
    this.name = 'CatalogError';
    this.problems = problems;
  }
}

export interface RawManifest {
  /** File name, used in error messages. */
  file: string;
  data: unknown;
}

/** Validates every manifest and checks catalog-wide rules (unique ids and slugs). */
export function checkManifests(raw: RawManifest[]): {
  manifests: ProjectManifest[];
  problems: ManifestProblem[];
} {
  const problems: ManifestProblem[] = [];
  const manifests: ProjectManifest[] = [];

  for (const entry of raw) {
    const result = manifestSchema.safeParse(entry.data);
    if (!result.success) {
      for (const issue of result.error.issues) {
        problems.push({
          manifest: entry.file,
          path: issue.path.join('.') || '(root)',
          message: issue.message,
        });
      }
      continue;
    }
    const expectedFile = `${result.data.id}.json`;
    if (entry.file !== expectedFile) {
      problems.push({
        manifest: entry.file,
        path: 'id',
        message: `The file should be named ${expectedFile}`,
      });
    }
    manifests.push(result.data);
  }

  for (const key of ['id', 'slug'] as const) {
    const seen = new Map<string, string>();
    for (const manifest of manifests) {
      const value = manifest[key];
      const previous = seen.get(value);
      if (previous) {
        problems.push({
          manifest: `${manifest.id}.json`,
          path: key,
          message: `Duplicate ${key} "${value}" (also used by ${previous})`,
        });
      } else {
        seen.set(value, `${manifest.id}.json`);
      }
    }
  }
  return { manifests, problems };
}

export function parseCatalog(raw: RawManifest[]): ProjectManifest[] {
  const { manifests, problems } = checkManifests(raw);
  if (problems.length > 0) throw new CatalogError(problems);
  return manifests;
}
