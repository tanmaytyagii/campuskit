import type { LearningGuide, ProjectManifest } from '@campuskit/project-catalog';
import { CircleCheck, CircleDashed, X } from 'lucide-react';
import { useEffect, useId, useRef, useState } from 'react';
import { Link } from 'react-router';

import { Button } from '../../components/ui/Button.tsx';
import { Checkbox } from '../../components/ui/Field.tsx';
import { todayIso } from '../../lib/format.ts';
import { writeRehearsal } from '../../lib/progress.ts';
import { readinessHref } from '../learning/links.ts';
import type { LoadedDemo } from './define.ts';
import { LearnLinks } from './FeaturePanel.tsx';
import type { DemoDefinition, PresentationStep, StepCheck } from './types.ts';

export function CheckLine({ check }: { check: StepCheck }) {
  return (
    <p
      className={
        check.done
          ? 'flex items-start gap-2 rounded-lg bg-lime-soft px-3 py-2 text-sm text-ink'
          : 'flex items-start gap-2 rounded-lg bg-raised px-3 py-2 text-sm text-ink-2'
      }
    >
      {check.done ? (
        <CircleCheck aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-lime-text" />
      ) : (
        <CircleDashed aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-ink-3" />
      )}
      <span>
        <span className="font-semibold">
          {check.done ? 'Done in the demo: ' : 'Not done yet: '}
        </span>
        {check.detail}
      </span>
    </p>
  );
}

/** What to say, do and expect for one step, as a description list. */
export function StepScript({ step }: { step: PresentationStep }) {
  return (
    <dl className="grid gap-4 md:grid-cols-3">
      <div className="space-y-1">
        <dt className="type-eyebrow text-violet">Say</dt>
        <dd className="text-sm text-ink">{step.say}</dd>
      </div>
      <div className="space-y-1">
        <dt className="type-eyebrow text-violet">Do</dt>
        <dd className="text-sm text-ink">{step.action}</dd>
      </div>
      <div className="space-y-1">
        <dt className="type-eyebrow text-violet">What should happen</dt>
        <dd className="text-sm text-ink">{step.expect}</dd>
      </div>
    </dl>
  );
}

export interface GuidedState {
  /** -1 for the introduction, 0…n-1 for the steps, n for the summary. */
  index: number;
  /** The demo data when the steps started; checks compare against it. */
  start: unknown;
}

/**
 * The guided demo: a short introduction, then one step at a time with what to
 * say, what to do and what should happen, and a live check of whether the
 * step's action was really done in the demo. Finishing with every checked
 * action done saves the date in this browser for the readiness check.
 */
export function GuidedSteps({
  project,
  definition,
  demo,
  state,
  guided,
  guide,
  onStart,
  onIndexChange,
  onClose,
}: {
  project: ProjectManifest;
  definition: DemoDefinition;
  demo: LoadedDemo;
  state: unknown;
  guided: GuidedState;
  guide: LearningGuide | null;
  onStart: (fromSample: boolean) => void;
  onIndexChange: (index: number) => void;
  onClose: () => void;
}) {
  const steps = definition.presentation;
  const headingRef = useRef<HTMLHeadingElement>(null);
  const headingId = useId();
  const [fromSample, setFromSample] = useState(true);
  const [recorded, setRecorded] = useState<boolean | null>(null);

  useEffect(() => {
    headingRef.current?.focus();
  }, [guided.index]);

  const step = steps[guided.index];
  const progress = Math.min(guided.index + 1, steps.length) / steps.length;

  function finish() {
    const checks = steps
      .map((item) => demo.check(item.id, state, guided.start))
      .filter((check) => check !== null);
    const complete = checks.every((check) => check.done);
    if (complete)
      writeRehearsal(project.id, {
        version: 1,
        completedOn: todayIso(),
        checkedSteps: checks.length,
      });
    setRecorded(complete);
    onIndexChange(steps.length);
  }

  return (
    <section
      aria-labelledby={headingId}
      className="space-y-4 rounded-2xl border border-violet/40 bg-surface p-5 shadow-card"
    >
      <div className="flex items-center justify-between gap-3">
        <p className="type-eyebrow text-violet">
          Guided demo
          {step ? ` · Step ${guided.index + 1} of ${steps.length}` : ''}
        </p>
        <button
          type="button"
          onClick={onClose}
          className="inline-flex size-8 items-center justify-center rounded-md text-ink-3 transition-colors hover:bg-raised hover:text-ink"
          aria-label="Close the guided demo"
        >
          <X aria-hidden="true" className="size-4" />
        </button>
      </div>
      {guided.index >= 0 ? (
        <div aria-hidden="true" className="h-1.5 overflow-hidden rounded-full bg-raised">
          <div
            className="h-full rounded-full bg-violet transition-[width] duration-300 motion-reduce:transition-none"
            style={{ width: `${progress * 100}%` }}
          />
        </div>
      ) : null}

      {guided.index < 0 ? (
        <div className="space-y-4">
          <h2
            id={headingId}
            ref={headingRef}
            tabIndex={-1}
            className="type-h3 text-ink outline-none"
          >
            Practise demonstrating {project.name}
          </h2>
          <p className="text-sm text-ink-2">
            {steps.length} steps, each with what to say, what to do in the demo and what should
            happen. Steps that change the data are checked in the demo as you go.
          </p>
          <ol className="grid gap-x-6 gap-y-1 text-sm text-ink-2 sm:grid-cols-2">
            {steps.map((item, index) => (
              <li key={item.id}>
                <span className="font-mono text-xs text-ink-3">{index + 1}.</span> {item.title}
              </li>
            ))}
          </ol>
          <Checkbox
            label="Start from the sample data"
            description="Recommended: the expected results assume the sample data. Your changes in the demo are replaced."
            checked={fromSample}
            onChange={(event) => setFromSample(event.target.checked)}
          />
          <Button onClick={() => onStart(fromSample)}>Start the guided demo</Button>
        </div>
      ) : step ? (
        <div className="space-y-4">
          <div className="space-y-1">
            <h2
              id={headingId}
              ref={headingRef}
              tabIndex={-1}
              className="type-h3 text-ink outline-none"
            >
              {step.title}
            </h2>
            <p className="type-meta">Shows: {step.concept}</p>
          </div>
          <StepScript step={step} />
          {(() => {
            const check = demo.check(step.id, state, guided.start);
            return check ? <CheckLine check={check} /> : null;
          })()}
          {step.learn ? (
            <details className="text-sm">
              <summary className="cursor-pointer font-semibold text-ink-2 hover:text-ink">
                Read more about this step
              </summary>
              <div className="mt-2">
                <LearnLinks project={project} guide={guide} learn={step.learn} />
              </div>
            </details>
          ) : null}
          <div className="flex flex-wrap justify-between gap-2 border-t border-line pt-4">
            <Button
              variant="secondary"
              disabled={guided.index === 0}
              onClick={() => onIndexChange(guided.index - 1)}
            >
              Previous
            </Button>
            {guided.index === steps.length - 1 ? (
              <Button onClick={finish}>Finish</Button>
            ) : (
              <Button onClick={() => onIndexChange(guided.index + 1)}>Next step</Button>
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <h2
            id={headingId}
            ref={headingRef}
            tabIndex={-1}
            className="type-h3 text-ink outline-none"
          >
            Guided demo finished
          </h2>
          <ul className="space-y-2">
            {steps.map((item) => {
              const check = demo.check(item.id, state, guided.start);
              return (
                <li key={item.id} className="flex items-start gap-2 text-sm">
                  {check === null ? (
                    <span
                      aria-hidden="true"
                      className="mt-1.5 size-2 shrink-0 rounded-full bg-line-strong"
                    />
                  ) : check.done ? (
                    <CircleCheck
                      aria-hidden="true"
                      className="mt-0.5 size-4 shrink-0 text-lime-text"
                    />
                  ) : (
                    <CircleDashed
                      aria-hidden="true"
                      className="mt-0.5 size-4 shrink-0 text-ink-3"
                    />
                  )}
                  <span>
                    <span className="font-semibold text-ink">{item.title}</span>
                    <span className="block text-ink-3">
                      {check === null
                        ? 'An explanation step: nothing to check.'
                        : `${check.done ? 'Done' : 'Not done'}: ${check.detail}`}
                    </span>
                  </span>
                </li>
              );
            })}
          </ul>
          <p className="text-sm text-ink-2">
            {recorded
              ? 'Every step that changes the data was done, so today’s date is saved in this browser as evidence for your readiness check.'
              : 'Some steps that change the data weren’t done, so nothing was saved. Run the guided demo again when you’re ready.'}
          </p>
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" onClick={() => onIndexChange(-1)}>
              Run it again
            </Button>
            <Link
              to={readinessHref(project)}
              className="link inline-flex items-center px-1 text-sm"
            >
              Open the readiness check
            </Link>
          </div>
        </div>
      )}
    </section>
  );
}
