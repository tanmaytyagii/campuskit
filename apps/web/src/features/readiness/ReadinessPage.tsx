import {
  getProjectBySlug,
  type LearningGuide,
  type ProjectManifest,
} from '@campuskit/project-catalog';
import { ArrowRight, CircleCheck, CircleDashed, CircleDot, RotateCcw } from 'lucide-react';
import { useState } from 'react';
import { Link, useParams } from 'react-router';

import { Breadcrumbs } from '../../components/layout/Breadcrumbs.tsx';
import { Badge } from '../../components/ui/Badge.tsx';
import { Button } from '../../components/ui/Button.tsx';
import { Dialog } from '../../components/ui/Dialog.tsx';
import { Checkbox } from '../../components/ui/Field.tsx';
import { Skeleton } from '../../components/ui/Spinner.tsx';
import { useDocumentTitle } from '../../hooks/useDocumentTitle.ts';
import { useLearningGuide } from '../../hooks/useLearningGuide.ts';
import { cn } from '../../lib/cn.ts';
import {
  readRehearsal,
  readTicked,
  readVivaProgress,
  resetProgress,
  summarizeViva,
  writeTicked,
} from '../../lib/progress.ts';
import { readReportDraft } from '../../lib/report-drafts.ts';
import { getTemplateStatus, verificationLines } from '../../lib/verification.ts';
import { NotFoundPage } from '../../pages/NotFoundPage.tsx';
import { hasDemo } from '../demo/registry.ts';
import {
  CONFIRM_IDS,
  evaluateReadiness,
  KIND_LABELS,
  scoreReadiness,
  STAGE_LABELS,
  STATUS_LABELS,
  type ReadinessItem,
  type ReadinessKind,
  type ReadinessStage,
} from './readiness.ts';

export function ReadinessPage() {
  const { slug = '' } = useParams();
  const project = getProjectBySlug(slug);
  if (!project) return <NotFoundPage />;
  return <ReadinessLoader key={project.id} project={project} />;
}

function ReadinessLoader({ project }: { project: ProjectManifest }) {
  useDocumentTitle(`Readiness | ${project.name}`);
  const guide = useLearningGuide(project);
  return (
    <article className="pb-8">
      <div className="container-page pt-8 md:pt-12">
        <Breadcrumbs
          items={[
            { label: 'Projects', to: '/projects' },
            { label: project.name, to: `/projects/${project.slug}` },
          ]}
          current="Readiness"
        />
        {guide.status === 'loading' ? (
          <div className="space-y-4" role="status" aria-label="Loading your progress">
            <Skeleton className="h-12 w-1/2" />
            <Skeleton className="h-64 w-full" />
          </div>
        ) : (
          <Readiness
            project={project}
            guide={guide.status === 'ready' ? guide.loaded.guide : null}
          />
        )}
      </div>
    </article>
  );
}

const KIND_DESCRIPTIONS: Record<ReadinessKind, string> = {
  verified:
    'CampusKit checked this itself, from its verification records, the demo’s checks or your saved draft.',
  progress: 'Worked out from your own ticks in the learning checklist and your viva ratings.',
  confirm: 'CampusKit can’t see your computer, so only you can tick these.',
};

const KIND_TONES: Record<ReadinessKind, 'lime' | 'violet' | 'outline'> = {
  verified: 'lime',
  progress: 'violet',
  confirm: 'outline',
};

function StatusMark({ status }: { status: ReadinessItem['status'] }) {
  const Icon = status === 'ready' ? CircleCheck : status === 'partial' ? CircleDot : CircleDashed;
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 text-sm font-semibold whitespace-nowrap',
        status === 'ready' ? 'text-lime-text' : status === 'partial' ? 'text-warn' : 'text-ink-3',
      )}
    >
      <Icon aria-hidden="true" className="size-4" />
      {STATUS_LABELS[status]}
    </span>
  );
}

function readInputs(project: ProjectManifest, guide: LearningGuide | null) {
  const checklistIds = guide?.checklist.map((item) => item.id) ?? [];
  const questionIds = guide?.viva.map((question) => question.id) ?? [];
  const demoStepIds = (guide?.demo ?? []).map((_, index) => `step-${index + 1}`);
  return {
    checklistDone: readTicked('checklist', project.id, checklistIds),
    viva:
      questionIds.length > 0
        ? summarizeViva(readVivaProgress(project.id, questionIds), questionIds)
        : null,
    rehearsal: readRehearsal(project.id),
    demoChecklist:
      demoStepIds.length > 0
        ? { done: readTicked('demo', project.id, demoStepIds).size, total: demoStepIds.length }
        : null,
    report: readReportDraft(project.id),
  };
}

function Readiness({ project, guide }: { project: ProjectManifest; guide: LearningGuide | null }) {
  const [saved] = useState(() => readInputs(project, guide));
  const [confirmed, setConfirmed] = useState(() =>
    readTicked('readiness', project.id, CONFIRM_IDS),
  );
  const [resetting, setResetting] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  // Ticking a box changes the score on screen; this says so to screen-reader users too.
  const [announcement, setAnnouncement] = useState('');

  const itemsFor = (ticked: ReadonlySet<string>) =>
    evaluateReadiness({
      project,
      guide,
      templateStatus: getTemplateStatus(project),
      verificationLines: verificationLines(project),
      confirmed: ticked,
      hasDemo: hasDemo(project),
      ...saved,
    });
  const items = itemsFor(confirmed);
  const score = scoreReadiness(items);

  function toggle(id: string, checked: boolean) {
    const next = new Set(confirmed);
    if (checked) next.add(id);
    else next.delete(id);
    setConfirmed(next);
    writeTicked('readiness', project.id, next);
    const updated = scoreReadiness(itemsFor(next));
    setAnnouncement(
      `Your readiness is now ${updated.percent}%: ${updated.points} of ${updated.total} items.`,
    );
  }

  return (
    <>
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_21rem] lg:items-start">
        <div className="space-y-3">
          <p className="type-eyebrow text-violet">Readiness check</p>
          <h1 className="type-title text-ink">Getting {project.name} ready</h1>
          <p className="type-lead max-w-[62ch]">
            What CampusKit has verified, what you have done and what is left before you submit and
            present the project. Opening a page never counts as doing it.
          </p>
        </div>
        <section
          aria-labelledby="score-heading"
          className="space-y-3 rounded-2xl border border-line bg-surface p-5 shadow-card"
        >
          <h2 id="score-heading" className="type-eyebrow">
            Your readiness
          </h2>
          <p className="text-4xl font-extrabold text-ink">{score.percent}%</p>
          <p role="status" className="sr-only">
            {announcement}
          </p>
          <p className="text-sm text-ink-2">
            {score.points} of {score.total} items (
            {items.filter((item) => item.status === 'ready').length} ready,{' '}
            {items.filter((item) => item.status === 'partial').length} in progress)
          </p>
          <div aria-hidden="true" className="h-2 overflow-hidden rounded-full bg-raised">
            <div
              className="h-full rounded-full bg-violet transition-[width] duration-300 motion-reduce:transition-none"
              style={{ width: `${score.percent}%` }}
            />
          </div>
          <details className="text-sm">
            <summary className="cursor-pointer font-semibold text-ink-2 hover:text-ink">
              How this is worked out
            </summary>
            <p className="mt-2 text-ink-2">
              Every item counts once: Ready counts 1, In progress counts ½ and To do counts 0. The
              percentage is the total divided by {score.total}. It describes your preparation in
              CampusKit, not the quality of your project, and it isn’t a grade.
            </p>
          </details>
        </section>
      </div>

      <ul className="mt-8 grid gap-3 md:grid-cols-3">
        {(['verified', 'progress', 'confirm'] as const).map((kind) => (
          <li key={kind} className="rounded-xl border border-line p-4 text-sm">
            <Badge tone={KIND_TONES[kind]}>{KIND_LABELS[kind]}</Badge>
            <p className="mt-2 text-ink-2">{KIND_DESCRIPTIONS[kind]}</p>
          </li>
        ))}
      </ul>

      <div className="mt-10 space-y-10">
        {(['run', 'understand', 'present'] as ReadinessStage[]).map((stage) => (
          <section key={stage} aria-labelledby={`stage-${stage}`} className="space-y-3">
            <h2 id={`stage-${stage}`} className="type-h2 text-ink">
              {STAGE_LABELS[stage]}
            </h2>
            <ol className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-surface">
              {items
                .filter((item) => item.stage === stage)
                .map((item) => (
                  <li key={item.id} className="grid gap-3 p-5 md:grid-cols-[minmax(0,1fr)_auto]">
                    <div className="min-w-0 space-y-2">
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                        <h3 className="type-h3 text-ink">{item.title}</h3>
                        <Badge tone={KIND_TONES[item.kind]}>{KIND_LABELS[item.kind]}</Badge>
                      </div>
                      <p className="text-sm text-ink-2">{item.summary}</p>
                      {item.evidence.length > 0 ? (
                        <ul className="space-y-1 text-sm text-ink-3">
                          {item.evidence.map((line) => (
                            <li key={line} className="flex gap-2">
                              <span
                                aria-hidden="true"
                                className="mt-2 size-1 shrink-0 rounded-full bg-ink-3"
                              />
                              {line}
                            </li>
                          ))}
                        </ul>
                      ) : null}
                      <div className="flex flex-wrap gap-x-4 gap-y-1 pt-1">
                        {item.actions.map((action) => (
                          <Link
                            key={action.label}
                            to={action.to}
                            className="link inline-flex items-center gap-1 text-sm"
                          >
                            {action.label}
                            <ArrowRight aria-hidden="true" className="size-3.5" />
                          </Link>
                        ))}
                      </div>
                      {item.kind === 'confirm' ? (
                        <Checkbox
                          className="pt-2"
                          label="I’ve done this on my computer"
                          checked={confirmed.has(item.id)}
                          onChange={(event) => toggle(item.id, event.target.checked)}
                        />
                      ) : null}
                    </div>
                    <div className="md:pt-0.5">
                      <StatusMark status={item.status} />
                    </div>
                  </li>
                ))}
            </ol>
          </section>
        ))}
      </div>

      <div className="mt-10 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-6">
        <p className="max-w-[70ch] text-sm text-ink-3">
          Your ticks, ratings, guided demo record and report draft are saved in this browser only,
          and nothing here is sent anywhere.
        </p>
        <div className="flex flex-wrap items-center gap-3">
          {notice ? (
            <p role="status" className="text-sm text-ink-2">
              {notice}
            </p>
          ) : null}
          <Button
            variant="ghost"
            size="sm"
            disabled={confirmed.size === 0}
            icon={<RotateCcw aria-hidden="true" className="size-4" />}
            onClick={() => setResetting(true)}
          >
            Clear my confirmations
          </Button>
        </div>
      </div>

      <Dialog
        open={resetting}
        onClose={() => setResetting(false)}
        title="Clear your confirmations?"
        confirmation
        footer={
          <div className="flex flex-wrap justify-end gap-2">
            <Button variant="secondary" onClick={() => setResetting(false)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={() => {
                resetProgress('readiness', project.id);
                setConfirmed(new Set());
                setResetting(false);
                setNotice('Your confirmations were cleared.');
              }}
            >
              Clear confirmations
            </Button>
          </div>
        }
      >
        <p className="text-ink-2">
          This unticks the three items you confirmed yourself. Your learning checklist, viva
          ratings, guided demo record and report draft are not changed.
        </p>
      </Dialog>
    </>
  );
}
