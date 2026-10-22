import type { TemplateBundle } from '@campuskit/template-engine';
import { useCallback, useEffect, useState } from 'react';

import { useBundleLoader } from '../lib/bundle-context.tsx';

export type BundleState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'ready'; bundle: TemplateBundle }
  | { status: 'error'; message: string };

type Settled = { key: string } & (
  { status: 'ready'; bundle: TemplateBundle } | { status: 'error'; message: string }
);

/**
 * Loads a template bundle when `templateId` is set; `retry` tries again after
 * an error. The loading state is derived (no result yet for the current
 * request), so nothing is set synchronously inside the effect.
 */
export function useTemplateBundle(templateId: string | null): BundleState & { retry: () => void } {
  const loader = useBundleLoader();
  const [attempt, setAttempt] = useState(0);
  const [settled, setSettled] = useState<Settled | null>(null);
  const key = templateId ? `${templateId}#${attempt}` : null;

  useEffect(() => {
    if (!templateId || !key) return undefined;
    let cancelled = false;
    loader(templateId).then(
      (bundle) => {
        if (!cancelled) setSettled({ key, status: 'ready', bundle });
      },
      (error: unknown) => {
        if (!cancelled) {
          setSettled({
            key,
            status: 'error',
            message: error instanceof Error ? error.message : 'The template could not be loaded.',
          });
        }
      },
    );
    return () => {
      cancelled = true;
    };
  }, [loader, templateId, key]);

  const retry = useCallback(() => setAttempt((value) => value + 1), []);

  if (!key) return { status: 'idle', retry };
  if (!settled || settled.key !== key) return { status: 'loading', retry };
  return settled.status === 'ready'
    ? { status: 'ready', bundle: settled.bundle, retry }
    : { status: 'error', message: settled.message, retry };
}
