import {
  AUDIENCE_LABELS,
  BACKEND_LABELS,
  DIFFICULTY_LABELS,
  PERSISTENCE_LABELS,
  type LearningGuide,
  type ProjectManifest,
} from '@campuskit/project-catalog';
import { Check, GraduationCap, Info, Trash } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { Link } from 'react-router';

import { Button, ButtonLink } from '../../components/ui/Button.tsx';
import { Dialog } from '../../components/ui/Dialog.tsx';
import { Meter } from '../../components/ui/Meter.tsx';
import {
  readTicked,
  readVivaProgress,
  resetAllProgress,
  summarizeViva,
} from '../../lib/progress.ts';
import { getTemplateStatus } from '../../lib/verification.ts';
import { setupFacts } from '../generator/logic.ts';
import { studioHref, vivaHref } from './links.ts';

/** A titled block of reading content, without a box around it. */
function Block({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <h3 className="type-h3 text-ink">{title}</h3>
      <div className="mt-3 text-[0.9375rem] text-ink-2">{children}</div>
    </section>
  );
}

function readSummary(project: ProjectManifest, guide: LearningGuide) {
  const checklistIds = guide.checklist.map((item) => item.id);
  const questionIds = guide.viva.map((question) => question.id);
  return {
    checklistDone: readTicked('checklist', project.id, checklistIds).size,
    checklistTotal: checklistIds.length,
    viva: summarizeViva(readVivaProgress(project.id, questionIds), questionIds),
  };
}

export function OverviewSection({
  project,
  guide,
}: {
  project: ProjectManifest;
  guide: LearningGuide;
}) {
  const [summary, setSummary] = useState(() => readSummary(project, guide));
  const [confirming, setConfirming] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const status = getTemplateStatus(project);

  function reset() {
    resetAllProgress(project.id);
    setSummary(readSummary(project, guide));
    setConfirming(false);
    setNotice(
      'Your checklist, demonstration steps and viva ratings for this project were cleared.',
    );
  }

  const checklistShare = summary.checklistTotal
    ? summary.checklistDone / summary.checklistTotal
    : 0;
  const vivaShare = summary.viva.total ? summary.viva.practised / summary.viva.total : 0;

  return (
    <div className="grid gap-10 lg:grid-cols-[minmax(0,1.65fr)_minmax(0,1fr)] lg:gap-14">
      <div className="min-w-0 space-y-10">
        <p className="type-lead max-w-[65ch]">{project.description}</p>

        <Block title="Who it is for">
          <p className="max-w-[65ch]">{guide.audience.summary}</p>
          <p className="type-meta mt-2">
            {DIFFICULTY_LABELS[project.difficulty]} level, for{' '}
            {project.audience
              .map((audience) => AUDIENCE_LABELS[audience].toLowerCase())
              .join(' and ')}{' '}
            students.
          </p>
        </Block>

        <div className="grid gap-10 sm:grid-cols-2">
          <Block title="You should already know">
            <ul className="space-y-2.5">
              {guide.audience.knowledge.map((item) => (
                <li key={item} className="flex gap-3">
                  <span
                    aria-hidden="true"
                    className="mt-2.5 size-1.5 shrink-0 rounded-full bg-ink-3"
                  />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </Block>
          <Block title="What you will learn">
            <ul className="space-y-2.5">
              {project.learningObjectives.map((objective) => (
                <li key={objective} className="flex gap-3">
                  <GraduationCap aria-hidden="true" className="mt-1 size-4 shrink-0 text-violet" />
                  <span>{objective}</span>
                </li>
              ))}
            </ul>
          </Block>
        </div>

        <div className="grid gap-10 border-t border-line pt-10 sm:grid-cols-2">
          <Block title="Key features">
            <ul className="space-y-2.5">
              {project.features.slice(0, 5).map((feature) => (
                <li key={feature} className="flex gap-3">
                  <Check aria-hidden="true" className="mt-1 size-4 shrink-0 text-violet" />
                  <span>{feature}</span>
                </li>
              ))}
            </ul>
          </Block>
          <Block title="Limitations">
            <ul className="space-y-2.5">
              {project.limitations.map((limitation) => (
                <li key={limitation} className="flex gap-3">
                  <Info aria-hidden="true" className="mt-1 size-4 shrink-0 text-ink-3" />
                  <span>{limitation}</span>
                </li>
              ))}
            </ul>
          </Block>
        </div>
      </div>

      <aside
        aria-label="Progress and setup"
        className="space-y-6 lg:sticky lg:top-24 lg:self-start"
      >
        <section
          aria-labelledby="progress-heading"
          className="rounded-xl border border-line bg-surface p-5"
        >
          <h3 id="progress-heading" className="type-h3 text-ink">
            Your progress
          </h3>
          <p className="type-meta mt-1">
            Saved in this browser only. The answers you type in viva practice are never saved.
          </p>
          <dl className="mt-4 space-y-4">
            <Meter
              label="Checklist"
              value={`${summary.checklistDone} of ${summary.checklistTotal} ticked`}
              share={checklistShare}
            />
            <Meter
              label="Viva questions practised"
              value={`${summary.viva.practised} of ${summary.viva.total}`}
              share={vivaShare}
            />
            <div className="flex items-baseline justify-between gap-3 text-sm">
              <dt className="text-ink-2">Rated confident</dt>
              <dd className="font-semibold text-ink">{summary.viva.confident}</dd>
            </div>
          </dl>
          <div className="mt-5 grid gap-2">
            <ButtonLink to={studioHref(project, 'checklist')} variant="secondary" size="sm">
              Open the checklist
            </ButtonLink>
            <ButtonLink to={vivaHref(project)} variant="secondary" size="sm">
              Practise viva questions
            </ButtonLink>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setConfirming(true)}
              icon={<Trash aria-hidden="true" className="size-4" />}
            >
              Reset all progress for this project
            </Button>
          </div>
          {notice ? (
            <p role="status" className="mt-3 text-sm text-ink-2">
              {notice}
            </p>
          ) : null}
        </section>

        <section
          aria-labelledby="start-heading"
          className="rounded-xl border border-line bg-surface p-5"
        >
          <h3 id="start-heading" className="type-h3 text-ink">
            Before you start
          </h3>
          <ul className="mt-3 space-y-2 text-sm text-ink-2">
            {setupFacts(project).map((fact) => (
              <li key={fact} className="flex gap-2.5">
                <Check aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-violet" />
                <span>{fact}</span>
              </li>
            ))}
          </ul>
          <Link to={`/projects/${project.slug}#setup`} className="link mt-3 inline-block text-sm">
            See the setup steps
          </Link>
        </section>

        <section
          aria-labelledby="built-heading"
          className="rounded-xl border border-line bg-surface p-5"
        >
          <h3 id="built-heading" className="type-h3 text-ink">
            How it is built
          </h3>
          <p className="mt-2 text-sm text-ink-2">{project.stack.summary}</p>
          <dl className="mt-3 space-y-1.5 text-sm">
            <div>
              <dt className="inline font-semibold text-ink">Server: </dt>
              <dd className="inline text-ink-2">{BACKEND_LABELS[project.stack.backend]}</dd>
            </div>
            <div>
              <dt className="inline font-semibold text-ink">Data: </dt>
              <dd className="inline text-ink-2">{PERSISTENCE_LABELS[project.stack.persistence]}</dd>
            </div>
            <div>
              <dt className="inline font-semibold text-ink">Built with: </dt>
              <dd className="inline text-ink-2">
                {[...project.languages, ...project.frameworks].join(', ')}
              </dd>
            </div>
          </dl>
          <Link to={studioHref(project, 'architecture')} className="link mt-3 inline-block text-sm">
            Explore the architecture
          </Link>
        </section>

        <p className="type-meta">
          Verification status: <span className="font-semibold text-ink-2">{status.label}</span>.{' '}
          {status.summary}{' '}
          <Link to={`/projects/${project.slug}#verification`} className="link">
            Details
          </Link>
        </p>
      </aside>

      <Dialog
        open={confirming}
        onClose={() => setConfirming(false)}
        title="Reset all progress for this project?"
        footer={
          <div className="flex flex-wrap justify-end gap-3">
            <Button variant="secondary" onClick={() => setConfirming(false)}>
              Cancel
            </Button>
            <Button variant="danger" onClick={reset}>
              Reset progress
            </Button>
          </div>
        }
      >
        <p className="text-ink-2">
          This clears your checklist ticks, demonstration checklist and viva ratings for{' '}
          {project.name} in this browser. Your report draft is kept; clear it in the report
          workspace if you want to.
        </p>
      </Dialog>
    </div>
  );
}
