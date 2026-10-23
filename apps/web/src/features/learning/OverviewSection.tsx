import {
  AUDIENCE_LABELS,
  BACKEND_LABELS,
  DIFFICULTY_LABELS,
  PERSISTENCE_LABELS,
  type LearningGuide,
  type ProjectManifest,
} from '@campuskit/project-catalog';
import { Trash } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { Link } from 'react-router';

import { Button, ButtonLink } from '../../components/ui/Button.tsx';
import { Dialog } from '../../components/ui/Dialog.tsx';
import {
  readTicked,
  readVivaProgress,
  resetAllProgress,
  summarizeViva,
} from '../../lib/progress.ts';
import { getTemplateStatus } from '../../lib/verification.ts';
import { setupFacts } from '../generator/logic.ts';
import { studioHref, vivaHref } from './links.ts';

function Card({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="rounded-xl border border-line bg-surface p-5">
      <h3 className="text-sm font-bold text-ink">{title}</h3>
      <div className="mt-3 text-[0.95rem] text-ink-2">{children}</div>
    </div>
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

  return (
    <div className="space-y-8">
      <p className="max-w-[70ch] text-ink-2">{project.description}</p>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card title="Who it is for">
          <p>{guide.audience.summary}</p>
          <p className="mt-2 text-sm text-ink-3">
            {DIFFICULTY_LABELS[project.difficulty]} level, for{' '}
            {project.audience
              .map((audience) => AUDIENCE_LABELS[audience].toLowerCase())
              .join(' and ')}{' '}
            students.
          </p>
        </Card>
        <Card title="You should already know">
          <ul className="list-disc space-y-1.5 pl-5">
            {guide.audience.knowledge.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </Card>
        <Card title="What you will learn">
          <ul className="list-disc space-y-1.5 pl-5">
            {project.learningObjectives.map((objective) => (
              <li key={objective}>{objective}</li>
            ))}
          </ul>
        </Card>
        <Card title="Before you start">
          <ul className="list-disc space-y-1.5 pl-5">
            {setupFacts(project).map((fact) => (
              <li key={fact}>{fact}</li>
            ))}
          </ul>
          <Link to={`/projects/${project.slug}#setup`} className="link mt-3 inline-block text-sm">
            See the setup steps
          </Link>
        </Card>
        <Card title="How it is built">
          <p>{project.stack.summary}</p>
          <dl className="mt-3 grid gap-2 text-sm">
            <div>
              <dt className="inline font-semibold text-ink">Server: </dt>
              <dd className="inline">{BACKEND_LABELS[project.stack.backend]}</dd>
            </div>
            <div>
              <dt className="inline font-semibold text-ink">Data: </dt>
              <dd className="inline">{PERSISTENCE_LABELS[project.stack.persistence]}</dd>
            </div>
            <div>
              <dt className="inline font-semibold text-ink">Built with: </dt>
              <dd className="inline">{[...project.languages, ...project.frameworks].join(', ')}</dd>
            </div>
          </dl>
          <Link to={studioHref(project, 'architecture')} className="link mt-3 inline-block text-sm">
            Explore the architecture
          </Link>
        </Card>
        <Card title="Key features and limitations">
          <ul className="list-disc space-y-1.5 pl-5">
            {project.features.slice(0, 4).map((feature) => (
              <li key={feature}>{feature}</li>
            ))}
          </ul>
          <p className="mt-3 text-sm font-semibold text-ink">Limitations</p>
          <ul className="mt-1 list-disc space-y-1.5 pl-5 text-sm">
            {project.limitations.map((limitation) => (
              <li key={limitation}>{limitation}</li>
            ))}
          </ul>
        </Card>
      </div>

      <section
        aria-labelledby="progress-heading"
        className="rounded-xl border border-line bg-raised p-5"
      >
        <h3 id="progress-heading" className="text-base font-bold text-ink">
          Your progress
        </h3>
        <p className="mt-1 text-sm text-ink-3">
          Saved in this browser only. Nothing is sent anywhere, and the answers you type in viva
          practice are never saved.
        </p>
        <dl className="mt-4 grid gap-4 sm:grid-cols-3">
          <div>
            <dt className="text-xs font-semibold text-ink-3">Checklist</dt>
            <dd className="text-lg font-semibold text-ink">
              {summary.checklistDone} of {summary.checklistTotal} ticked
            </dd>
          </div>
          <div>
            <dt className="text-xs font-semibold text-ink-3">Viva questions practised</dt>
            <dd className="text-lg font-semibold text-ink">
              {summary.viva.practised} of {summary.viva.total}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-semibold text-ink-3">Rated confident</dt>
            <dd className="text-lg font-semibold text-ink">{summary.viva.confident}</dd>
          </div>
        </dl>
        <div className="mt-5 flex flex-wrap gap-3">
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

      <p className="text-sm text-ink-3">
        Verification status: <span className="font-semibold text-ink-2">{status.label}</span>.{' '}
        {status.summary}{' '}
        <Link to={`/projects/${project.slug}#verification`} className="link">
          Details
        </Link>
      </p>

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
