import { useCallback, useEffect, useState } from 'react';

import { readSession, writeSession } from '../../lib/storage.ts';
import type { LoadedDemo } from './define.ts';

/**
 * Demo data lives in sessionStorage under its own key, so it lasts while the
 * tab is open (moving to the source browser and back keeps it) and never
 * touches learning progress, report drafts or a generated project's data.
 */
export function demoStorageKey(projectId: string): string {
  return `campuskit:demo-studio:v1:${projectId}`;
}

export function useDemoStore(projectId: string, demo: LoadedDemo) {
  const key = demoStorageKey(projectId);
  const [state, setState] = useState<unknown>(
    () => demo.readState(readSession(key))?.state ?? demo.createState(),
  );

  useEffect(() => {
    writeSession(key, state);
  }, [key, state]);

  const update = useCallback((change: (current: unknown) => unknown) => setState(change), []);
  const reset = useCallback(() => setState(demo.createState()), [demo]);
  const startEmpty = useCallback(() => {
    if (demo.createEmptyState) setState(demo.createEmptyState());
  }, [demo]);

  return { state, update, reset, startEmpty };
}
