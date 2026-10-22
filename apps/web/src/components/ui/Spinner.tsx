import { LoaderCircle } from 'lucide-react';

import { cn } from '../../lib/cn.ts';

export function Spinner({ label, className }: { label: string; className?: string }) {
  return (
    <span
      role="status"
      className={cn('inline-flex items-center gap-2 text-sm text-ink-3', className)}
    >
      <LoaderCircle aria-hidden="true" className="size-4 motion-safe:animate-spin" />
      <span>{label}</span>
    </span>
  );
}

/** Placeholder blocks shown while content loads. */
export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={cn('rounded-lg bg-raised motion-safe:animate-pulse', className)}
    />
  );
}
