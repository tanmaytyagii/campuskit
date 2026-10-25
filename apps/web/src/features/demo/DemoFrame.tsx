import { CircleCheck } from 'lucide-react';
import { useId, useRef, type KeyboardEvent, type ReactNode } from 'react';

import { Badge } from '../../components/ui/Badge.tsx';
import { cn } from '../../lib/cn.ts';
import type { DemoDefinition } from './types.ts';

/**
 * The demo as an app window: its name, the screens as tabs (arrow keys move
 * between them), a feedback line that is also announced, and the screen.
 */
export function DemoFrame({
  definition,
  feature,
  onFeatureChange,
  feedback,
  status,
  children,
  className,
}: {
  definition: DemoDefinition;
  feature: string;
  onFeatureChange: (feature: string) => void;
  feedback: string | null;
  status: string;
  children: ReactNode;
  className?: string;
}) {
  const base = useId();
  const tabs = useRef<Array<HTMLButtonElement | null>>([]);
  const { features } = definition;
  const selected = Math.max(
    0,
    features.findIndex((item) => item.id === feature),
  );

  // Arrow keys move from the focused tab, not from the selected screen: the selection lives
  // in the address, and a quick second key press must not start from an older value.
  function onKeyDown(event: KeyboardEvent<HTMLButtonElement>, current: number) {
    const last = features.length - 1;
    const next =
      event.key === 'ArrowRight'
        ? current === last
          ? 0
          : current + 1
        : event.key === 'ArrowLeft'
          ? current === 0
            ? last
            : current - 1
          : event.key === 'Home'
            ? 0
            : event.key === 'End'
              ? last
              : null;
    if (next === null) return;
    event.preventDefault();
    const target = features[next];
    if (!target) return;
    onFeatureChange(target.id);
    tabs.current[next]?.focus();
  }

  return (
    <section
      data-demo-frame=""
      aria-label={`${definition.appName} demo`}
      className={cn(
        'relative min-w-0 overflow-hidden rounded-2xl border border-line bg-surface shadow-lift',
        className,
      )}
    >
      <div className="flex items-center justify-between gap-3 border-b border-line bg-raised px-4 py-2.5">
        <div className="flex min-w-0 items-center gap-3">
          <span aria-hidden="true" className="hidden gap-1.5 sm:flex">
            <span className="size-2.5 rounded-full bg-line-strong" />
            <span className="size-2.5 rounded-full bg-line-strong" />
            <span className="size-2.5 rounded-full bg-line-strong" />
          </span>
          <span className="min-w-0">
            <span className="block truncate text-sm font-semibold text-ink">
              {definition.appName}
            </span>
            {definition.appSubtitle ? (
              <span className="block truncate text-xs text-ink-3">{definition.appSubtitle}</span>
            ) : null}
          </span>
        </div>
        <Badge tone="outline" className="shrink-0">
          Demo · sample data
        </Badge>
      </div>
      <div
        role="tablist"
        aria-label={`${definition.appName} screens`}
        className="flex gap-1 overflow-x-auto border-b border-line px-2"
      >
        {features.map((item, index) => (
          <button
            key={item.id}
            ref={(element) => {
              tabs.current[index] = element;
            }}
            type="button"
            role="tab"
            id={`${base}-tab-${item.id}`}
            aria-selected={index === selected}
            aria-controls={`${base}-panel`}
            tabIndex={index === selected ? 0 : -1}
            onClick={() => onFeatureChange(item.id)}
            onKeyDown={(event) => onKeyDown(event, index)}
            className={cn(
              'relative shrink-0 px-3 py-3 text-sm font-semibold whitespace-nowrap transition-colors',
              'after:absolute after:inset-x-2 after:bottom-0 after:h-0.5 after:rounded-full',
              index === selected
                ? 'text-ink after:bg-violet'
                : 'text-ink-2 after:bg-transparent hover:text-ink',
            )}
          >
            {item.label}
          </button>
        ))}
      </div>
      <p
        role="status"
        className={cn(
          feedback
            ? 'flex items-start gap-2 border-b border-line bg-lime-soft px-4 py-2 text-sm text-ink'
            : 'sr-only',
        )}
      >
        {feedback ? (
          <CircleCheck aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-lime-text" />
        ) : null}
        {feedback}
      </p>
      <div
        role="tabpanel"
        id={`${base}-panel`}
        aria-labelledby={`${base}-tab-${features[selected]?.id ?? ''}`}
        tabIndex={0}
        className="p-4 outline-offset-[-2px] sm:p-6"
      >
        {children}
      </div>
      <p className="border-t border-line bg-raised px-4 py-2 text-xs text-ink-3">{status}</p>
    </section>
  );
}
