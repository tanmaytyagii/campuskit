import { Check, TriangleAlert } from 'lucide-react';

import { cn } from '../../lib/cn.ts';
import type { StepId } from './logic.ts';

export const STEP_LABELS: Record<StepId, string> = {
  template: 'Template',
  details: 'Details',
  options: 'Options',
  review: 'Review',
  done: 'Download',
};

interface StepperProps {
  steps: StepId[];
  current: StepId;
  /** Steps the student may jump back to. */
  reachable: (step: StepId) => boolean;
  /** A step whose fields have errors (shown with a warning mark). */
  invalid?: (step: StepId) => boolean;
  onSelect: (step: StepId) => void;
}

/**
 * The wizard's progress. Completed steps are buttons so you can go back and
 * change them; the current step is filled; a step with errors shows a
 * warning mark and says so to screen readers.
 */
export function Stepper({ steps, current, reachable, invalid, onSelect }: StepperProps) {
  const currentIndex = steps.indexOf(current);
  const progress = steps.length > 1 ? currentIndex / (steps.length - 1) : 1;
  return (
    <nav aria-label="Generator steps" className="space-y-3">
      <p className="text-sm font-semibold text-ink-2 sm:hidden">
        Step {currentIndex + 1} of {steps.length}: {STEP_LABELS[current]}
      </p>
      <ol className="flex flex-wrap items-center gap-x-1.5 gap-y-3 sm:gap-x-2">
        {steps.map((step, index) => {
          const done = index < currentIndex;
          const isCurrent = step === current;
          const hasErrors = isCurrent && Boolean(invalid?.(step));
          const content = (
            <>
              <span
                aria-hidden="true"
                className={cn(
                  'flex size-7 items-center justify-center rounded-full border-2 font-mono text-xs font-medium transition-colors',
                  hasErrors && 'border-danger bg-danger-soft text-danger',
                  isCurrent && !hasErrors && 'border-violet bg-violet text-on-violet',
                  done && 'border-violet bg-violet-soft text-violet',
                  !isCurrent && !done && 'border-line-strong text-ink-3',
                )}
              >
                {hasErrors ? (
                  <TriangleAlert className="size-3.5" />
                ) : done ? (
                  <Check className="size-3.5" />
                ) : (
                  index + 1
                )}
              </span>
              <span
                className={cn(
                  'text-sm font-semibold',
                  isCurrent ? 'text-ink' : done ? 'text-ink-2' : 'text-ink-3',
                )}
              >
                {STEP_LABELS[step]}
                {done ? (
                  <>
                    {' '}
                    <span className="sr-only">(completed)</span>
                  </>
                ) : null}
                {hasErrors ? (
                  <>
                    {' '}
                    <span className="sr-only">(needs attention)</span>
                  </>
                ) : null}
              </span>
            </>
          );
          return (
            <li
              key={step}
              className="flex items-center gap-1.5 sm:gap-2"
              aria-current={isCurrent ? 'step' : undefined}
            >
              {done && reachable(step) ? (
                <button
                  type="button"
                  onClick={() => onSelect(step)}
                  className="flex items-center gap-2 rounded-lg px-1.5 py-1 transition-colors hover:bg-raised"
                >
                  {content}
                </button>
              ) : (
                <span className="flex items-center gap-2 px-1.5 py-1">{content}</span>
              )}
              {index < steps.length - 1 ? (
                <span
                  aria-hidden="true"
                  className={cn(
                    'h-0.5 w-4 rounded-full sm:w-8 lg:w-12',
                    index < currentIndex ? 'bg-violet' : 'bg-line-strong',
                  )}
                />
              ) : null}
            </li>
          );
        })}
      </ol>
      <div aria-hidden="true" className="h-1 overflow-hidden rounded-full bg-raised">
        <div
          className="h-full rounded-full bg-violet transition-[width] duration-300 motion-reduce:transition-none"
          style={{ width: `${Math.max(progress, 0.04) * 100}%` }}
        />
      </div>
    </nav>
  );
}
