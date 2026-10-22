import { Check } from 'lucide-react';

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
  onSelect: (step: StepId) => void;
}

/** The wizard's progress. Completed steps are buttons so you can go back and change them. */
export function Stepper({ steps, current, reachable, onSelect }: StepperProps) {
  const currentIndex = steps.indexOf(current);
  return (
    <nav aria-label="Generator steps">
      <ol className="flex flex-wrap items-center gap-x-2 gap-y-3">
        {steps.map((step, index) => {
          const done = index < currentIndex;
          const isCurrent = step === current;
          const content = (
            <>
              <span
                aria-hidden="true"
                className={cn(
                  'flex size-7 items-center justify-center rounded-full border-2 font-mono text-xs font-medium',
                  isCurrent && 'border-violet bg-violet text-on-violet',
                  done && 'border-violet text-violet',
                  !isCurrent && !done && 'border-line-strong text-ink-3',
                )}
              >
                {done ? <Check className="size-3.5" /> : index + 1}
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
              </span>
            </>
          );
          return (
            <li
              key={step}
              className="flex items-center gap-2"
              aria-current={isCurrent ? 'step' : undefined}
            >
              {done && reachable(step) ? (
                <button
                  type="button"
                  onClick={() => onSelect(step)}
                  className="flex items-center gap-2 rounded-lg px-1 py-0.5 hover:bg-raised"
                >
                  {content}
                </button>
              ) : (
                <span className="flex items-center gap-2 px-1 py-0.5">{content}</span>
              )}
              {index < steps.length - 1 ? (
                <span aria-hidden="true" className="h-px w-6 bg-line-strong sm:w-10" />
              ) : null}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
