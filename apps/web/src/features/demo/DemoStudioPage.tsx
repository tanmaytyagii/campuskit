import { getProjectBySlug, type ProjectManifest } from '@campuskit/project-catalog';
import { ArrowRight, ClipboardCheck, Compass, Presentation, Route, Wand } from 'lucide-react';
import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { Link, useParams, useSearchParams } from 'react-router';

import { Breadcrumbs } from '../../components/layout/Breadcrumbs.tsx';
import { Button, ButtonLink } from '../../components/ui/Button.tsx';
import { Callout } from '../../components/ui/Callout.tsx';
import { Skeleton } from '../../components/ui/Spinner.tsx';
import { useDocumentTitle } from '../../hooks/useDocumentTitle.ts';
import { useLearningGuide } from '../../hooks/useLearningGuide.ts';
import { NotFoundPage } from '../../pages/NotFoundPage.tsx';
import { presentationHref, readinessHref } from '../learning/links.ts';
import type { LoadedDemo } from './define.ts';
import { DemoFrame } from './DemoFrame.tsx';
import { DemoNotice } from './DemoNotice.tsx';
import { FeaturePanel } from './FeaturePanel.tsx';
import { GuidedSteps, type GuidedState } from './GuidedSteps.tsx';
import { getDemo } from './registry.ts';
import { TourPanel } from './TourPanel.tsx';
import type { DemoDefinition } from './types.ts';
import { useDemoStore } from './useDemoStore.ts';
import { useLoadedDemo } from './useLoadedDemo.ts';

export function DemoStudioPage() {
  const { slug = '' } = useParams();
  const project = getProjectBySlug(slug);
  const definition = project ? getDemo(project.id) : undefined;
  if (!project || !definition) return <NotFoundPage />;
  return <DemoLoader key={project.id} project={project} definition={definition} />;
}

function DemoLoader({
  project,
  definition,
}: {
  project: ProjectManifest;
  definition: DemoDefinition;
}) {
  useDocumentTitle(`Demo | ${project.name}`);
  const loaded = useLoadedDemo(project.id);
  if (loaded.status === 'ready')
    return <DemoWorkspace project={project} definition={definition} demo={loaded.demo} />;
  return (
    <div className="container-page pt-8 md:pt-12">
      <Breadcrumbs
        items={[
          { label: 'Projects', to: '/projects' },
          { label: project.name, to: `/projects/${project.slug}` },
        ]}
        current="Demo"
      />
      {loaded.status === 'loading' ? (
        <div className="space-y-4" role="status" aria-label="Loading the demo">
          <Skeleton className="h-12 w-1/2" />
          <Skeleton className="h-5 w-2/3" />
          <Skeleton className="h-96 w-full" />
        </div>
      ) : (
        <Callout tone="danger" title="The demo couldn’t be loaded" role="alert">
          <p>{loaded.message}</p>
          <Button size="sm" variant="secondary" className="mt-3" onClick={loaded.retry}>
            Try again
          </Button>
        </Callout>
      )}
    </div>
  );
}

type Assist = { kind: 'tour'; index: number } | { kind: 'guided'; guided: GuidedState } | null;

function NextLink({
  to,
  icon,
  title,
  text,
}: {
  to: string;
  icon: ReactNode;
  title: string;
  text: string;
}) {
  return (
    <Link
      to={to}
      className="group flex h-full items-start gap-3 rounded-xl border border-line bg-surface p-4 transition-colors hover:border-violet"
    >
      <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-violet-soft text-violet">
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block font-semibold text-ink group-hover:text-violet">{title}</span>
        <span className="mt-0.5 block text-sm text-ink-2">{text}</span>
      </span>
      <ArrowRight
        aria-hidden="true"
        className="mt-1 size-4 shrink-0 text-ink-3 transition-transform group-hover:translate-x-0.5 group-hover:text-violet motion-reduce:transition-none"
      />
    </Link>
  );
}

function DemoWorkspace({
  project,
  definition,
  demo,
}: {
  project: ProjectManifest;
  definition: DemoDefinition;
  demo: LoadedDemo;
}) {
  const { state, update: apply, reset, startEmpty } = useDemoStore(project.id, demo);
  // Changes after a reset, so every screen starts again from the new data.
  const [revision, setRevision] = useState(0);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [assist, setAssist] = useState<Assist>(null);
  const [params, setParams] = useSearchParams();
  const guide = useLearningGuide(project);
  const guideData = guide.status === 'ready' ? guide.loaded.guide : null;

  const features = definition.features;
  const feature = features.find((item) => item.id === params.get('feature')) ?? features[0];

  useEffect(() => {
    if (!feedback) return undefined;
    const timer = window.setTimeout(() => setFeedback(null), 8000);
    return () => window.clearTimeout(timer);
  }, [feedback]);

  // flushSync applies the change at once rather than in a transition, so the tabs, the
  // screen and the notes beside it change together (as the gallery filters do).
  const selectFeature = useCallback(
    (id: string) =>
      setParams(
        (current) => {
          const next = new URLSearchParams(current);
          next.set('feature', id);
          return next;
        },
        { replace: true, flushSync: true },
      ),
    [setParams],
  );
  const update = useCallback(
    (change: (current: unknown) => unknown, message: string) => {
      apply(change);
      setFeedback(message);
    },
    [apply],
  );

  function resetDemo(): unknown {
    const fresh = reset();
    setRevision((value) => value + 1);
    setFeedback('The demo is back to the example data.');
    return fresh;
  }

  function goToTourStep(index: number) {
    const step = definition.tour[index];
    if (!step) return;
    setAssist({ kind: 'tour', index });
    selectFeature(step.feature);
  }

  function goToGuidedStep(index: number) {
    if (assist?.kind !== 'guided') return;
    setAssist({ kind: 'guided', guided: { ...assist.guided, index } });
    const step = definition.presentation[index];
    if (step) selectFeature(step.feature);
  }

  if (!feature) return null;
  const highlight =
    assist?.kind === 'tour' ? (definition.tour[assist.index]?.highlight ?? null) : null;

  return (
    <article className="pb-8">
      <div className="container-page pt-8 md:pt-12">
        <Breadcrumbs
          items={[
            { label: 'Projects', to: '/projects' },
            { label: project.name, to: `/projects/${project.slug}` },
          ]}
          current="Demo"
        />
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
          <div className="space-y-3">
            <p className="type-eyebrow text-violet">Interactive demo</p>
            <h1 className="type-title text-ink">{project.name}</h1>
            <p className="type-lead max-w-[62ch]">{definition.summary}</p>
          </div>
          <div className="flex flex-wrap items-center gap-3 lg:justify-end">
            <Button
              icon={<Route aria-hidden="true" className="size-4" />}
              onClick={() => setAssist({ kind: 'guided', guided: { index: -1, start: state } })}
            >
              Practise the demo
            </Button>
            <Button
              variant="secondary"
              icon={<Compass aria-hidden="true" className="size-4" />}
              onClick={() => goToTourStep(0)}
            >
              Take the tour
            </Button>
          </div>
        </div>

        <div className="mt-8">
          <DemoNotice
            project={project}
            definition={definition}
            onReset={resetDemo}
            onStartEmpty={
              demo.createEmptyState
                ? () => {
                    startEmpty();
                    setRevision((value) => value + 1);
                    setFeedback(
                      'The demo has no data now. Use “Reset to the example” to bring it back.',
                    );
                  }
                : null
            }
          />
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_19rem] xl:grid-cols-[minmax(0,1fr)_21rem]">
          <div className="min-w-0 space-y-4">
            {assist?.kind === 'tour' ? (
              <TourPanel
                steps={definition.tour}
                index={assist.index}
                onIndexChange={goToTourStep}
                onClose={() => setAssist(null)}
              />
            ) : null}
            {assist?.kind === 'guided' ? (
              <GuidedSteps
                project={project}
                definition={definition}
                demo={demo}
                state={state}
                guided={assist.guided}
                guide={guideData}
                onStart={(fromSample) => {
                  const start = fromSample ? resetDemo() : state;
                  setAssist({ kind: 'guided', guided: { index: 0, start } });
                  const first = definition.presentation[0];
                  if (first) selectFeature(first.feature);
                }}
                onIndexChange={goToGuidedStep}
                onClose={() => setAssist(null)}
              />
            ) : null}
            <DemoFrame
              definition={definition}
              feature={feature.id}
              onFeatureChange={selectFeature}
              feedback={feedback}
              status={demo.describe(state)}
            >
              <div key={revision}>
                {demo.render({
                  state,
                  update,
                  announce: setFeedback,
                  feature: feature.id,
                  selectFeature,
                  highlight,
                })}
              </div>
            </DemoFrame>
          </div>
          <FeaturePanel project={project} feature={feature} guide={guideData} />
        </div>

        <section aria-labelledby="demo-next" className="mt-14 space-y-4">
          <h2 id="demo-next" className="type-h2 text-ink">
            From demo to your own project
          </h2>
          <ul className="grid gap-3 md:grid-cols-3">
            <li>
              <NextLink
                to={`/generate?template=${project.id}`}
                icon={<Wand aria-hidden="true" className="size-5" />}
                title="Customize and download"
                text="Name the project, choose its settings and get the full source as a ZIP."
              />
            </li>
            <li>
              <NextLink
                to={presentationHref(project)}
                icon={<Presentation aria-hidden="true" className="size-5" />}
                title="Present the project"
                text="Slides built from the project’s own details, with speaking notes and this demo."
              />
            </li>
            <li>
              <NextLink
                to={readinessHref(project)}
                icon={<ClipboardCheck aria-hidden="true" className="size-5" />}
                title="Check your readiness"
                text="What CampusKit verified, what you have done and what is still to do."
              />
            </li>
          </ul>
          <ButtonLink to={`/projects/${project.slug}`} variant="ghost" size="sm">
            Back to the project page
          </ButtonLink>
        </section>
      </div>
    </article>
  );
}
