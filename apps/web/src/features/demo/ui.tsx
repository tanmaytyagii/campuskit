/** Small pieces shared by the demos' screens. */
import { Fragment, useCallback, useLayoutEffect, useRef, type ReactNode } from 'react';

import { cn } from '../../lib/cn.ts';

/**
 * Where focus goes after a row of a table is deleted. The delete button that opened the
 * confirmation is removed with its row, so focus would otherwise fall to the page body. Focus
 * moves to the delete button of the row that took the deleted row's place (or of the row before,
 * when the last row went), or to `fallback` when no row is left: an empty-state heading, or the
 * button that clears filters hiding the remaining rows.
 *
 * Mark each row's delete button with `data-delete`, put `rowsRef` on the <tbody>, give the
 * fallback `fallbackRef`, and call `deleting(index)` with the row's position just before deleting it. The confirmation dialog
 * closes in its own layout effect, before this one runs, so the page is no longer inert.
 */
export function useFocusAfterDelete() {
  const rowsRef = useRef<HTMLTableSectionElement>(null);
  const fallback = useRef<HTMLElement | null>(null);
  // A callback ref, so it can be given to a heading or a button alike.
  const fallbackRef = useCallback((element: HTMLElement | null) => {
    fallback.current = element;
  }, []);
  const pending = useRef<number | null>(null);
  useLayoutEffect(() => {
    const index = pending.current;
    if (index === null) return;
    pending.current = null;
    const buttons = rowsRef.current?.querySelectorAll<HTMLElement>('[data-delete]') ?? [];
    const target = buttons[Math.min(index, buttons.length - 1)] ?? fallback.current;
    target?.focus();
  });
  return {
    rowsRef,
    fallbackRef,
    deleting: (index: number) => {
      pending.current = index;
    },
  };
}

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
          'mt-1 text-xl font-bold sm:text-2xl',
          tone === 'attention' ? 'text-danger' : 'text-ink',
        )}
      >
        {value}
      </dd>
      {detail ? <dd className="mt-0.5 text-xs text-ink-3">{detail}</dd> : null}
    </div>
  );
}

/**
 * A grid of stat tiles separated by hairlines. On phones it has two columns, and an
 * odd last tile spans the row rather than leaving an empty cell.
 */
export function StatGrid({ children, columns = 4 }: { children: ReactNode; columns?: 3 | 4 }) {
  return (
    <dl
      className={cn(
        'grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-line bg-line',
        '[&>:last-child:nth-child(odd)]:col-span-2',
        columns === 3
          ? 'sm:grid-cols-3 sm:[&>:last-child:nth-child(odd)]:col-span-1'
          : 'lg:grid-cols-4 lg:[&>:last-child:nth-child(odd)]:col-span-1',
      )}
    >
      {children}
    </dl>
  );
}

/**
 * A table that scrolls sideways inside its own focusable region on narrow screens.
 * It is positioned so screen-reader-only text in its cells (absolutely positioned)
 * scrolls with the table instead of widening the page.
 */
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
      className={cn('relative overflow-x-auto rounded-xl border border-line', className)}
    >
      {children}
    </div>
  );
}

export const tableClasses = 'w-full text-left text-sm';
export const theadClasses = 'bg-raised text-ink';
export const thClasses = 'px-3 py-2.5 font-semibold whitespace-nowrap';
export const tdClasses = 'px-3 py-2.5 align-middle text-ink-2';
/** A row's first cell, as a header for the row. */
export const rowHeaderClasses = 'px-3 py-2.5 text-left align-middle font-semibold text-ink';
/** A cell of small icon buttons. */
export const actionCellClasses = 'px-3 py-1.5 text-right align-middle whitespace-nowrap';

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

/** Code names and paths with line-break opportunities after “_”, “/” and “.”, never inside a word. */
export function Breakable({ text }: { text: string }) {
  const parts = text.split(/(?<=[_/.])/);
  return (
    <>
      {parts.map((part, index) => (
        <Fragment key={`${index}-${part}`}>
          {index > 0 ? <wbr /> : null}
          {part}
        </Fragment>
      ))}
    </>
  );
}
