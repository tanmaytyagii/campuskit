import {
  getProjectBySlug,
  type LearningGuide,
  type ProjectManifest,
} from '@campuskit/project-catalog';
import { ChevronLeft, ChevronRight, NotebookText, RotateCcw, X } from 'lucide-react';
import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router';

import { Button } from '../../components/ui/Button.tsx';
import { Skeleton } from '../../components/ui/Spinner.tsx';
import { useDocumentTitle } from '../../hooks/useDocumentTitle.ts';
import { useLearningGuide } from '../../hooks/useLearningGuide.ts';
import { cn } from '../../lib/cn.ts';
import { NotFoundPage } from '../../pages/NotFoundPage.tsx';
import type { LoadedDemo } from '../demo/define.ts';
import { DemoFrame } from '../demo/DemoFrame.tsx';
import { CheckLine } from '../demo/GuidedSteps.tsx';
import { getDemo } from '../demo/registry.ts';
import type { DemoDefinition, PresentationStep } from '../demo/types.ts';
import { useDemoStore } from '../demo/useDemoStore.ts';
import { useLoadedDemo } from '../demo/useLoadedDemo.ts';
import { buildSlides, SOURCE_LABELS, type Slide } from './slides.ts';

export function PresentationPage() {
  const { slug = '' } = useParams();
  const project = getProjectBySlug(slug);
  if (!project) return <NotFoundPage />;
  return <PresentationLoader key={project.id} project={project} />;
}

function PresentationLoader({ project }: { project: ProjectManifest }) {
  useDocumentTitle(`Presentation | ${project.name}`);
  const guide = useLearningGuide(project);
  if (guide.status === 'loading')
    return (
      <div
        className="mx-auto max-w-5xl space-y-4 p-8"
        role="status"
        aria-label="Loading the presentation"
      >
        <Skeleton className="h-12 w-1/2" />
        <Skeleton className="h-80 w-full" />
      </div>
    );
  return (
    <Presentation
      project={project}
      guide={guide.status === 'ready' ? guide.loaded.guide : null}
      definition={getDemo(project.id)}
    />
  );
}

const headingClasses =
  'text-[clamp(1.75rem,1.1rem+2.4vw,3.25rem)] leading-[1.08] font-extrabold tracking-[-0.02em] text-ink outline-none [font-stretch:115%]';
const bodyText = 'text-[clamp(1rem,0.85rem+0.55vw,1.4rem)] leading-relaxed text-ink-2';

function BulletItems({ items, more }: { items: readonly string[]; more?: number }) {
  return (
    <>
      <ul className={cn('space-y-3', bodyText)}>
        {items.map((item) => (
          <li key={item} className="flex gap-3">
            <span
              aria-hidden="true"
              className="mt-[0.6em] size-2 shrink-0 rounded-full bg-violet"
            />
            <span>{item}</span>
          </li>
        ))}
      </ul>
      {more ? (
        <p className="type-meta mt-4">And {more} more in the project’s documentation.</p>
      ) : null}
    </>
  );
}

function SlideContent({
  slide,
  project,
  demo,
  definition,
}: {
  slide: Slide;
  project: ProjectManifest;
  demo: LoadedDemo | null;
  definition: DemoDefinition | undefined;
}) {
  const { body } = slide;
  switch (body.kind) {
    case 'title':
      return (
        <div className="space-y-6">
          <p className={cn(bodyText, 'max-w-[40ch] text-[clamp(1.15rem,0.9rem+1vw,1.9rem)]')}>
            {body.tagline}
          </p>
          <ul className="flex flex-wrap gap-2">
            {body.facts.map((fact) => (
              <li
                key={fact}
                className="rounded-lg border border-line bg-surface px-3 py-1.5 text-sm text-ink-2"
              >
                {fact}
              </li>
            ))}
          </ul>
        </div>
      );
    case 'text':
      return (
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
          <div className="space-y-4">
            {body.paragraphs.map((paragraph) => (
              <p key={paragraph} className={bodyText}>
                {paragraph}
              </p>
            ))}
          </div>
          {body.list ? (
            <div className="rounded-2xl bg-raised p-5">
              <h2 className="type-eyebrow">{body.list.title}</h2>
              {body.list.items.map((item) => (
                <p key={item} className="mt-2 text-ink-2">
                  {item}
                </p>
              ))}
            </div>
          ) : null}
        </div>
      );
    case 'list':
      return <BulletItems items={body.items} {...(body.more ? { more: body.more } : {})} />;
    case 'layers':
      return (
        <div className="space-y-5">
          <p className={cn(bodyText, 'max-w-[70ch] text-base')}>{body.summary}</p>
          <ol className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {body.layers.map((layer, index) => (
              <li key={layer.label} className="rounded-xl border border-line bg-surface p-4">
                <span className="font-mono text-xs text-violet">Layer {index + 1}</span>
                <span className="mt-1 block font-semibold text-ink">{layer.label}</span>
                <span className="mt-1 block text-sm text-ink-2">{layer.description}</span>
              </li>
            ))}
          </ol>
        </div>
      );
    case 'flow':
      return (
        <div className="space-y-4">
          <p className="type-eyebrow text-violet">{body.title}</p>
          <ol className="space-y-3">
            {body.steps.map((step, index) => (
              <li key={`${index}-${step.component}`} className="flex gap-4">
                <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-violet-soft font-mono text-sm font-semibold text-violet">
                  {index + 1}
                </span>
                <span className="text-[clamp(0.95rem,0.85rem+0.35vw,1.2rem)]">
                  <span className="font-semibold text-ink">{step.component}: </span>
                  <span className="text-ink-2">{step.text}</span>
                </span>
              </li>
            ))}
          </ol>
        </div>
      );
    case 'facts':
      return (
        <div className="grid gap-6 md:grid-cols-3">
          {body.groups.map((group) => (
            <div key={group.title} className="space-y-2">
              <h2 className="type-eyebrow text-violet">{group.title}</h2>
              <ul className="space-y-1.5 text-ink-2">
                {group.items.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      );
    case 'demo-plan':
      return (
        <ol className="grid gap-3 md:grid-cols-2">
          {body.steps.map((step, index) => (
            <li
              key={step}
              className="flex gap-3 rounded-xl border border-line bg-surface p-4 text-ink-2"
            >
              <span className="font-mono text-sm font-semibold text-violet">{index + 1}</span>
              <span>{step}</span>
            </li>
          ))}
        </ol>
      );
    case 'demo':
      return demo && definition ? (
        <DemoSlide
          key={slide.id}
          project={project}
          demo={demo}
          definition={definition}
          step={body.step}
        />
      ) : (
        <div className="space-y-3" role="status" aria-label="Loading the demo">
          <Skeleton className="h-96 w-full" />
        </div>
      );
    case 'closing':
      return (
        <div className="grid gap-8 lg:grid-cols-2">
          <p className={cn(bodyText, 'text-[clamp(1.15rem,0.9rem+1vw,1.75rem)]')}>{body.tagline}</p>
          {body.improvements.length > 0 ? (
            <div className="space-y-3">
              <h2 className="type-eyebrow text-violet">Ideas for future work</h2>
              <BulletItems items={body.improvements} />
            </div>
          ) : null}
          <p className="text-[clamp(1.5rem,1rem+1.8vw,2.5rem)] font-extrabold text-ink lg:col-span-2">
            Thank you. Questions?
          </p>
        </div>
      );
  }
}

/** A demo step with the live demo. Its data is shared with the Demo Studio in this tab. */
function DemoSlide({
  project,
  demo,
  definition,
  step,
}: {
  project: ProjectManifest;
  demo: LoadedDemo;
  definition: DemoDefinition;
  step: PresentationStep;
}) {
  const { state, update: apply, reset } = useDemoStore(project.id, demo);
  const [feature, setFeature] = useState(step.feature);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [revision, setRevision] = useState(0);
  // Checks compare with the example data, the state the expected results assume.
  const [baseline] = useState(() => demo.createState());
  const check = demo.check(step.id, state, baseline);
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-ink-2">
          <span className="font-semibold text-ink">Do:</span> {step.action}
        </p>
        <Button
          size="sm"
          variant="ghost"
          icon={<RotateCcw aria-hidden="true" className="size-4" />}
          onClick={() => {
            reset();
            setRevision((value) => value + 1);
            setFeedback('The demo is back to the example data.');
          }}
        >
          Reset demo
        </Button>
      </div>
      {check ? <CheckLine check={check} /> : null}
      <DemoFrame
        definition={definition}
        feature={feature}
        onFeatureChange={setFeature}
        feedback={feedback}
        status={demo.describe(state)}
      >
        <div key={revision}>
          {demo.render({
            state,
            update: (change, message) => {
              apply(change);
              setFeedback(message);
            },
            announce: setFeedback,
            feature,
            selectFeature: setFeature,
            highlight: null,
          })}
        </div>
      </DemoFrame>
    </div>
  );
}

/** True when a key press belongs to a form control, a dialog or the live demo, not to the slides. */
function keyBelongsElsewhere(event: KeyboardEvent): boolean {
  if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey) return true;
  const target = event.target;
  if (!(target instanceof Element)) return false;
  return Boolean(
    target.closest(
      'input, textarea, select, [contenteditable="true"], dialog, [data-demo-frame]',
    ) ||
    (event.key === ' ' && target.closest('button, a, summary')),
  );
}

function Presentation({
  project,
  guide,
  definition,
}: {
  project: ProjectManifest;
  guide: LearningGuide | null;
  definition: DemoDefinition | undefined;
}) {
  const slides = buildSlides(project, guide, definition);
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const [notes, setNotes] = useState(true);
  const loaded = useLoadedDemo(project.id);
  const demo = definition && loaded.status === 'ready' ? loaded.demo : null;
  const headingRef = useRef<HTMLHeadingElement>(null);
  const pickerId = useId();
  const notesId = useId();

  const requested = slides.findIndex((item) => item.id === params.get('slide'));
  const index = requested === -1 ? 0 : requested;
  const slide = slides[index] ?? slides[0];
  const exitTo = `/projects/${project.slug}`;

  // flushSync applies each move at once, so a second key press starts from the new slide.
  function go(next: number) {
    const target = slides[Math.min(Math.max(next, 0), slides.length - 1)];
    if (target) setParams({ slide: target.id }, { replace: true, flushSync: true });
  }

  // In the same commit as the slide (a layout effect): the first slide appears after the page
  // has loaded on demand, and an ordinary effect could run later.
  useLayoutEffect(() => {
    headingRef.current?.focus();
  }, [index]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (keyBelongsElsewhere(event)) return;
      const actions: Record<string, () => void> = {
        ArrowRight: () => go(index + 1),
        PageDown: () => go(index + 1),
        ' ': () => go(index + 1),
        ArrowLeft: () => go(index - 1),
        PageUp: () => go(index - 1),
        Home: () => go(0),
        End: () => go(slides.length - 1),
        n: () => setNotes((value) => !value),
        N: () => setNotes((value) => !value),
        Escape: () => void navigate(exitTo),
      };
      const action = actions[event.key];
      if (!action) return;
      event.preventDefault();
      action();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  });

  if (!slide) return null;
  const progress = (index + 1) / slides.length;
  return (
    // The controls stay on screen while a long slide scrolls: the footer always, the header
    // from tablet width up (on phones it wraps to three rows). index.css adds scroll padding.
    <div data-presentation="" className="flex min-h-dvh flex-col bg-canvas text-ink">
      <header className="border-b border-line bg-surface sm:sticky sm:top-0 sm:z-20">
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 px-4 py-2.5 sm:px-6">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-ink">{project.name}</p>
            <p className="text-xs text-ink-3">Presentation mode · {slide.section}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <label htmlFor={pickerId} className="sr-only">
              Go to slide
            </label>
            <select
              id={pickerId}
              value={slide.id}
              onChange={(event) =>
                setParams({ slide: event.target.value }, { replace: true, flushSync: true })
              }
              className="h-9 max-w-52 rounded-lg border border-control bg-surface px-2 text-sm text-ink"
            >
              {slides.map((item, position) => (
                <option key={item.id} value={item.id}>
                  {position + 1}.{' '}
                  {item.section === 'Demo' && item.body.kind === 'demo'
                    ? `Demo: ${item.title}`
                    : item.title}
                </option>
              ))}
            </select>
            <Button
              size="sm"
              variant="secondary"
              aria-pressed={notes}
              aria-controls={notesId}
              icon={<NotebookText aria-hidden="true" className="size-4" />}
              onClick={() => setNotes((value) => !value)}
            >
              Speaking notes
            </Button>
            <Link
              to={exitTo}
              className="inline-flex h-8 items-center gap-1.5 rounded-lg px-3 text-sm font-semibold text-ink-2 transition-colors hover:bg-raised hover:text-ink"
            >
              <X aria-hidden="true" className="size-4" />
              Exit
            </Link>
          </div>
        </div>
        <div aria-hidden="true" className="h-1 bg-raised">
          <div
            className="h-full bg-violet transition-[width] duration-300 motion-reduce:transition-none"
            style={{ width: `${progress * 100}%` }}
          />
        </div>
      </header>

      <main className="flex flex-1 flex-col">
        <section
          aria-roledescription="slide"
          aria-labelledby="slide-title"
          className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-4 py-8 sm:px-8 md:py-12"
        >
          <div className="space-y-3">
            <p className="type-eyebrow text-violet">
              {slide.section} · Slide {index + 1} of {slides.length}
            </p>
            <h1 id="slide-title" ref={headingRef} tabIndex={-1} className={headingClasses}>
              {slide.title}
            </h1>
          </div>
          <div className="flex-1">
            <SlideContent slide={slide} project={project} demo={demo} definition={definition} />
          </div>
          <p className="text-xs text-ink-3">{SOURCE_LABELS[slide.source]}</p>
        </section>

        <aside
          id={notesId}
          aria-label="Speaking notes"
          hidden={!notes}
          className="border-t border-line bg-surface"
        >
          <div className="mx-auto max-w-6xl px-4 py-4 sm:px-8">
            <p className="type-eyebrow">
              Speaking notes · suggested by CampusKit · press N to hide them on a projector
            </p>
            <ul className="mt-2 grid gap-1.5 text-sm text-ink-2 md:grid-cols-2">
              {slide.notes.map((note) => (
                <li key={note} className="flex gap-2">
                  <span
                    aria-hidden="true"
                    className="mt-2 size-1.5 shrink-0 rounded-full bg-ink-3"
                  />
                  {note}
                </li>
              ))}
            </ul>
          </div>
        </aside>
      </main>

      <footer className="sticky bottom-0 z-20 border-t border-line bg-surface">
        <div className="flex items-center justify-between gap-3 px-4 py-2.5 sm:px-6">
          <Button
            variant="secondary"
            disabled={index === 0}
            onClick={() => go(index - 1)}
            icon={<ChevronLeft aria-hidden="true" className="size-4" />}
          >
            Previous
          </Button>
          <p className="hidden text-xs text-ink-3 md:block">
            Keys: ← → to move, N for notes, Esc to exit
          </p>
          <Button disabled={index === slides.length - 1} onClick={() => go(index + 1)}>
            Next
            <ChevronRight aria-hidden="true" className="size-4" />
          </Button>
        </div>
      </footer>
    </div>
  );
}
