/**
 * Short notifications that confirm an action or report a problem without moving focus.
 * Call notify() from anywhere; the <Toaster> in the page layout shows them. Messages are read
 * out from live regions that exist from the start (polite for news, assertive for errors),
 * disappear after a few seconds unless the pointer or focus is on them, and can be dismissed.
 */
import { CircleAlert, CircleCheck, X } from 'lucide-react';
import { useEffect, useRef, useSyncExternalStore } from 'react';

import { cn } from '../../lib/cn.ts';
import { useT } from '../../lib/i18n.ts';

export type ToastTone = 'success' | 'error';

export interface ToastAction {
  label: string;
  run: () => void;
}

interface Toast {
  id: number;
  message: string;
  tone: ToastTone;
  action?: ToastAction;
}

const VISIBLE_FOR = 6000;
const MAX_TOASTS = 3;

let toasts: Toast[] = [];
let nextId = 1;
const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
}

export function notify(message: string, tone: ToastTone = 'success', action?: ToastAction): void {
  toasts = [...toasts, { id: nextId++, message, tone, ...(action ? { action } : {}) }].slice(
    -MAX_TOASTS,
  );
  emit();
}

export function dismissToast(id: number): void {
  toasts = toasts.filter((toast) => toast.id !== id);
  emit();
}

/** Removes every notification (between tests, for example). */
export function clearToasts(): void {
  toasts = [];
  emit();
}

const store = {
  subscribe: (listener: () => void) => {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
  getSnapshot: () => toasts,
};

function ToastItem({ toast }: { toast: Toast }) {
  const t = useT();
  const paused = useRef(false);
  const left = useRef(VISIBLE_FOR);

  useEffect(() => {
    let started = Date.now();
    const timer = window.setInterval(() => {
      const now = Date.now();
      if (!paused.current) left.current -= now - started;
      started = now;
      if (left.current <= 0) dismissToast(toast.id);
    }, 250);
    return () => window.clearInterval(timer);
  }, [toast.id]);

  const Icon = toast.tone === 'error' ? CircleAlert : CircleCheck;
  return (
    <div
      onPointerEnter={() => (paused.current = true)}
      onPointerLeave={() => (paused.current = false)}
      onFocus={() => (paused.current = true)}
      onBlur={() => (paused.current = false)}
      className={cn(
        'pointer-events-auto flex items-start gap-3 rounded-xl border bg-surface p-3 pr-2 text-sm shadow-lift',
        'motion-safe:animate-[toast-in_160ms_ease-out]',
        toast.tone === 'error' ? 'border-danger/50' : 'border-line',
      )}
    >
      <Icon
        aria-hidden="true"
        className={cn(
          'mt-0.5 size-4 shrink-0',
          toast.tone === 'error' ? 'text-danger' : 'text-violet',
        )}
      />
      <div className="min-w-0 flex-1 space-y-2">
        <p lang="en" className="text-ink">
          {toast.message}
        </p>
        {toast.action ? (
          <button
            type="button"
            onClick={() => {
              dismissToast(toast.id);
              toast.action?.run();
            }}
            className="rounded-md text-sm font-semibold text-violet underline-offset-4 hover:underline"
          >
            {toast.action.label}
          </button>
        ) : null}
      </div>
      <button
        type="button"
        onClick={() => dismissToast(toast.id)}
        className="-my-1 inline-flex size-7 shrink-0 items-center justify-center rounded-md text-ink-3 hover:bg-raised hover:text-ink"
        aria-label={t('toast.dismiss')}
      >
        <X aria-hidden="true" className="size-4" />
      </button>
    </div>
  );
}

export function Toaster() {
  const t = useT();
  const current = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot);
  const list = (tone: ToastTone) => current.filter((toast) => toast.tone === tone);
  return (
    <section
      aria-label={t('toast.region')}
      className="pointer-events-none fixed inset-x-4 bottom-4 z-50 flex flex-col items-end gap-2 sm:left-auto sm:w-96"
    >
      {/* Both regions are always present, so screen readers notice what is added to them. */}
      <div aria-live="polite" className="flex w-full flex-col gap-2">
        {list('success').map((toast) => (
          <ToastItem key={toast.id} toast={toast} />
        ))}
      </div>
      <div aria-live="assertive" className="flex w-full flex-col gap-2">
        {list('error').map((toast) => (
          <ToastItem key={toast.id} toast={toast} />
        ))}
      </div>
    </section>
  );
}
