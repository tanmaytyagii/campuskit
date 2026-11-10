/** The workspace for React components, and one way to change it that reports failures. */
import { useSyncExternalStore } from 'react';

import { notify } from '../../components/ui/Toast.tsx';
import { workspaceStore, type WorkspaceState } from '../../lib/workspace.ts';

export function useWorkspace(): WorkspaceState {
  return useSyncExternalStore(
    workspaceStore.subscribe,
    workspaceStore.getSnapshot,
    workspaceStore.getServerSnapshot,
  );
}

/**
 * Applies a change to the workspace. If the browser refuses to save it (storage full or
 * blocked), the change stays on screen for this tab and the student is told how to keep it.
 */
export function changeWorkspace(
  change: (state: WorkspaceState) => WorkspaceState,
  success?: string,
): boolean {
  const saved = workspaceStore.update(change);
  if (!saved)
    notify(
      'This change couldn’t be saved: the browser’s storage is full or blocked. It stays until you close this tab. Download a backup from My projects to keep it.',
      'error',
    );
  else if (success) notify(success);
  return saved;
}
