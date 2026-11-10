/** A notice while the browser is offline: what still works, and what needs a connection. */
import { WifiOff } from 'lucide-react';
import { useSyncExternalStore } from 'react';

import { useT } from '../../lib/i18n.ts';

/** While offline, how often to look again: Firefox may not fire `online` for a page it loaded offline. */
const RECHECK_MS = 2000;

function subscribe(callback: () => void) {
  let timer: ReturnType<typeof setInterval> | undefined;
  const stop = () => {
    clearInterval(timer);
    timer = undefined;
  };
  const watch = () => {
    stop();
    if (navigator.onLine) return;
    timer = setInterval(() => {
      callback();
      if (navigator.onLine) stop();
    }, RECHECK_MS);
  };
  const onChange = () => {
    callback();
    watch();
  };
  window.addEventListener('online', onChange);
  window.addEventListener('offline', onChange);
  watch();
  return () => {
    stop();
    window.removeEventListener('online', onChange);
    window.removeEventListener('offline', onChange);
  };
}

export function useOnline(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => navigator.onLine,
    () => true,
  );
}

export function OfflineNotice() {
  const online = useOnline();
  const t = useT();
  return (
    <div aria-live="polite">
      {online ? null : (
        <p className="flex items-start justify-center gap-2 border-b border-warn/50 bg-warn-soft px-4 py-2 text-center text-sm text-ink">
          <WifiOff aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
          {t('offline.notice')}
        </p>
      )}
    </div>
  );
}
