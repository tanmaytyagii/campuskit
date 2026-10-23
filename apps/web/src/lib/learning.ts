/**
 * Learning guides (packages/project-catalog/learning/*.json), loaded only
 * when a Learning Studio, viva practice or the report workspace needs them,
 * and validated again before use.
 */
import {
  learningGuideSchema,
  sharedTroubleshootingSchema,
  type LearningGuide,
  type ProjectManifest,
  type TroubleshootingEntry,
} from '@campuskit/project-catalog';

const loaders = import.meta.glob<unknown>('../../../../packages/project-catalog/learning/*.json', {
  import: 'default',
});

const PREFIX = '../../../../packages/project-catalog/learning/';
const SHARED_FILE = 'shared-troubleshooting.json';

export interface LoadedGuide {
  guide: LearningGuide;
  /** The project's own entries first, then the shared advice for its stack. */
  troubleshooting: TroubleshootingEntry[];
}

export class GuideLoadError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'GuideLoadError';
  }
}

export function hasLearningGuide(project: ProjectManifest): boolean {
  return `${PREFIX}${project.id}.json` in loaders;
}

const cache = new Map<string, Promise<LoadedGuide | null>>();

export function loadLearningGuide(project: ProjectManifest): Promise<LoadedGuide | null> {
  const cached = cache.get(project.id);
  if (cached) return cached;
  const load = loaders[`${PREFIX}${project.id}.json`];
  if (!load) return Promise.resolve(null);

  const request = (async () => {
    const sharedLoader = loaders[`${PREFIX}${SHARED_FILE}`];
    let raw: unknown;
    let sharedRaw: unknown;
    try {
      [raw, sharedRaw] = await Promise.all([load(), sharedLoader?.()]);
    } catch {
      throw new GuideLoadError(
        'The learning guide could not be downloaded. Check your connection and try again.',
      );
    }
    const parsed = learningGuideSchema.safeParse(raw);
    if (!parsed.success || parsed.data.templateId !== project.id) {
      throw new GuideLoadError('The learning guide is damaged. Reload the page and try again.');
    }
    const shared = sharedTroubleshootingSchema.safeParse(sharedRaw);
    const sharedEntries = shared.success
      ? parsed.data.troubleshooting.include.flatMap((set) => shared.data.sets[set])
      : [];
    return {
      guide: parsed.data,
      troubleshooting: [...parsed.data.troubleshooting.entries, ...sharedEntries],
    };
  })();

  cache.set(project.id, request);
  request.catch(() => cache.delete(project.id)); // allow a retry after a failure
  return request;
}
