/** Small pieces shared by the demos' screens. */
import type { ReactNode } from 'react';

import { cn } from '../../lib/cn.ts';

/** Every demo screen starts with a heading and, optionally, actions on the right. */
export function ScreenHeading({
  title,
  description,
  actions,
}: {
  title: string;
  description?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div className="min-w-0 space-y-1">
        <h2 className="type-h3 text-ink">{title}</h2>
        {description ? <p className="max-w-[60ch] text-sm text-ink-2">{description}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}

/** A labelled figure in a row of headline numbers. Use inside a <dl>. */
export function StatTile({
  label,
  value,
  detail,
  tone = 'default',
}: {
  label: string;
  value: ReactNode;
  detail?: ReactNode;
  tone?: 'default' | 'attention';
}) {
  return (
    <div className="bg-surface px-4 py-3">
      <dt className="type-meta">{label}</dt>
      <dd
        className={cn(
          'mt-1 text-xl font-bold text-ink sm:text-2xl',
          tone === 'attention' && 'text-danger',
        )}
      >
        {value}
      </dd>
      {detail ? <dd className="mt-0.5 text-xs text-ink-3">{detail}</dd> : null}
    </div>
  );
}

/** A grid of stat tiles separated by hairlines. */
export function StatGrid({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <dl
      className={cn(
        'grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-line bg-line lg:grid-cols-4',
        className,
      )}
    >
      {children}
    </dl>
  );
}

/** A table that scrolls sideways inside its own focusable region on narrow screens. */
export function TableRegion({
  label,
  children,
  className,
}: {
  label: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      role="region"
      aria-label={label}
      tabIndex={0}
      className={cn('overflow-x-auto rounded-xl border border-line', className)}
    >
      {children}
    </div>
  );
}

export const tableClasses = 'w-full text-left text-sm';
export const theadClasses = 'bg-raised text-ink';
export const thClasses = 'px-3 py-2.5 font-semibold whitespace-nowrap';
export const tdClasses = 'px-3 py-2.5 align-top text-ink-2';

/** Data shown as formatted JSON, the way the template stores it. Focusable so it can be scrolled. */
export function JsonView({ value }: { value: unknown }) {
  return (
    <pre
      tabIndex={0}
      className="max-h-[28rem] overflow-auto rounded-xl bg-code-bg p-4 font-mono text-xs leading-relaxed text-code-ink"
    >
      {JSON.stringify(value, null, 2)}
    </pre>
  );
}

/** Classes that outline an element while the tour points at it. */
export function highlightClasses(active: boolean): string {
  return active
    ? 'rounded-xl outline-2 outline-offset-4 outline-violet transition-[outline-color]'
    : '';
}
