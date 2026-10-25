import { useCallback, useEffect, useState } from 'react';

import type { LoadedDemo } from './define.ts';
import { loadDemo } from './registry.ts';

type Settled =
  | { key: string; status: 'ready'; demo: LoadedDemo }
  | { key: string; status: 'error'; message: string };

export type LoadedDemoState =
  | { status: 'loading' }
  | { status: 'ready'; demo: LoadedDemo }
  | { status: 'error'; message: string };

/** Loads a demo's implementation on demand; `retry` tries again after an error. */
export function useLoadedDemo(projectId: string): LoadedDemoState & { retry: () => void } {
  const [attempt, setAttempt] = useState(0);
  const [settled, setSettled] = useState<Settled | null>(null);
  const key = `${projectId}:${attempt}`;

  useEffect(() => {
    let cancelled = false;
    loadDemo(projectId).then(
      (demo) => {
        if (!cancelled) setSettled({ key, status: 'ready', demo });
      },
      (error: unknown) => {
        if (!cancelled)
          setSettled({
            key,
            status: 'error',
            message: error instanceof Error ? error.message : 'The demo could not be loaded.',
          });
      },
    );
    return () => {
      cancelled = true;
    };
  }, [projectId, key]);

  const retry = useCallback(() => setAttempt((value) => value + 1), []);
  if (!settled || settled.key !== key) return { status: 'loading', retry };
  if (settled.status === 'ready') return { status: 'ready', demo: settled.demo, retry };
  return { status: 'error', message: settled.message, retry };
}
