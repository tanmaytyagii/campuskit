import { X } from 'lucide-react';
import { useEffect, useId, useRef } from 'react';

import { Button } from '../../components/ui/Button.tsx';
import { cn } from '../../lib/cn.ts';
import type { TourStep } from './types.ts';

/**
 * A short tour of the demo. Each step opens the screen it talks about and
 * outlines the part it describes; focus moves to the step so screen reader
 * users hear it.
 */
export function TourPanel({
  steps,
  index,
  onIndexChange,
  onClose,
}: {
  steps: readonly TourStep[];
  index: number;
  onIndexChange: (index: number) => void;
  onClose: () => void;
}) {
  const headingRef = useRef<HTMLHeadingElement>(null);
  const headingId = useId();
  const step = steps[index];

  useEffect(() => {
    headingRef.current?.focus();
  }, [index]);

  if (!step) return null;
  const last = index === steps.length - 1;
  return (
    <section
      aria-labelledby={headingId}
      className="space-y-3 rounded-2xl border border-violet/40 bg-violet-soft/60 p-5"
    >
      <div className="flex items-center justify-between gap-3">
        <p className="type-eyebrow text-violet">
          Tour · Step {index + 1} of {steps.length}
        </p>
        <button
          type="button"
          onClick={onClose}
          className="inline-flex size-8 items-center justify-center rounded-md text-ink-2 transition-colors hover:bg-surface hover:text-ink"
          aria-label="End the tour"
        >
          <X aria-hidden="true" className="size-4" />
        </button>
      </div>
      <h2 id={headingId} ref={headingRef} tabIndex={-1} className="type-h3 text-ink outline-none">
        {step.title}
      </h2>
      <p className="max-w-[70ch] text-sm text-ink-2">{step.text}</p>
      <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
        <ol aria-hidden="true" className="flex gap-1.5">
          {steps.map((item, position) => (
            <li
              key={item.id}
              className={cn(
                'h-1.5 w-6 rounded-full transition-colors',
                position <= index ? 'bg-violet' : 'bg-line-strong',
              )}
            />
          ))}
        </ol>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="secondary"
            disabled={index === 0}
            onClick={() => onIndexChange(index - 1)}
          >
            Back
          </Button>
          {last ? (
            <Button size="sm" onClick={onClose}>
              Finish the tour
            </Button>
          ) : (
            <Button size="sm" onClick={() => onIndexChange(index + 1)}>
              Next
            </Button>
          )}
        </div>
      </div>
    </section>
  );
}
