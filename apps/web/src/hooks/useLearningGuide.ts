import type { ProjectManifest } from '@campuskit/project-catalog';
import { useCallback, useEffect, useState } from 'react';

import { loadLearningGuide, type LoadedGuide } from '../lib/learning.ts';

export type GuideState =
  | { status: 'loading' }
  | { status: 'ready'; loaded: LoadedGuide }
  | { status: 'missing' }
  | { status: 'error'; message: string };

type Settled =
  | { key: string; status: 'ready'; loaded: LoadedGuide }
  | { key: string; status: 'missing' }
  | { key: string; status: 'error'; message: string };

/** Loads a project's learning guide; `retry` tries again after an error. */
export function useLearningGuide(project: ProjectManifest | undefined): GuideState & {
  retry: () => void;
} {
  const [attempt, setAttempt] = useState(0);
  const [settled, setSettled] = useState<Settled | null>(null);
  const key = project ? `${project.id}:${attempt}` : null;

  useEffect(() => {
    if (!project || !key) return undefined;
    let cancelled = false;
    loadLearningGuide(project).then(
      (loaded) => {
        if (!cancelled)
          setSettled(loaded ? { key, status: 'ready', loaded } : { key, status: 'missing' });
      },
      (error: unknown) => {
        if (!cancelled)
          setSettled({
            key,
            status: 'error',
            message: error instanceof Error ? error.message : 'The guide could not be loaded.',
          });
      },
    );
    return () => {
      cancelled = true;
    };
  }, [project, key]);

  const retry = useCallback(() => setAttempt((value) => value + 1), []);

  if (!key) return { status: 'missing', retry };
  if (!settled || settled.key !== key) return { status: 'loading', retry };
  if (settled.status === 'ready') return { status: 'ready', loaded: settled.loaded, retry };
  if (settled.status === 'missing') return { status: 'missing', retry };
  return { status: 'error', message: settled.message, retry };
}
