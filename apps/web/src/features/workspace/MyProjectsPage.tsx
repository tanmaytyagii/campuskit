/**
 * My projects: the projects a student has worked on in this browser, with their saved progress,
 * a suggested next step, and backups they can restore on another computer. Everything is read
 * from this browser's storage; nothing is sent anywhere.
 */
import { catalog, type ProjectManifest } from '@campuskit/project-catalog';
import { FolderOpen, Trash2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router';

import { PageHeader } from '../../components/layout/PageHeader.tsx';
import { Button, ButtonLink } from '../../components/ui/Button.tsx';
import { Dialog } from '../../components/ui/Dialog.tsx';
import { EmptyState } from '../../components/ui/EmptyState.tsx';
import { Meter } from '../../components/ui/Meter.tsx';
import { useDocumentTitle } from '../../hooks/useDocumentTitle.ts';
import { useLearningGuide } from '../../hooks/useLearningGuide.ts';
import {
  deleteProjectProgress,
  hasProgress,
  readProjectProgress,
  type ProjectBackup,
} from '../../lib/backup.ts';
import { formatIsoDate, pluralize } from '../../lib/format.ts';
import { readTicked, readVivaProgress, summarizeViva } from '../../lib/progress.ts';
import { reportHref, studioHref, vivaHref } from '../learning/links.ts';
import { BackupPanel } from './BackupPanel.tsx';
import { ProjectsSection } from './ProjectsSection.tsx';
import { RecoveryNotice } from './RecoveryNotice.tsx';
import { useWorkspace } from './useWorkspace.ts';

interface Saved {
  project: ProjectManifest;
  progress: ProjectBackup;
}

const readAll = (): Saved[] =>
  catalog.map((project) => ({ project, progress: readProjectProgress(project.id) }));

const linkClasses =
  'rounded-md text-sm font-semibold text-ink-2 underline-offset-4 transition-colors hover:text-violet hover:underline';

export function MyProjectsPage() {
  useDocumentTitle('My projects');
  const [saved, setSaved] = useState(readAll);
  const workspace = useWorkspace();
  const [deleting, setDeleting] = useState<ProjectManifest | null>(null);
  const [message, setMessage] = useState({ text: '', count: 0 });
  const messageRef = useRef<HTMLParagraphElement>(null);

  // After a deletion the card is gone, so focus goes to the message that says what happened.
  useEffect(() => {
    if (message.count > 0) messageRef.current?.focus();
  }, [message]);

  const started = saved.filter(({ progress }) => hasProgress(progress));
  const others = saved.filter(({ progress }) => !hasProgress(progress));

  function show(text: string) {
    setSaved(readAll());
    setMessage((current) => ({ text, count: current.count + 1 }));
  }

  function confirmDelete() {
    if (!deleting) return;
    deleteProjectProgress(deleting.id);
    setDeleting(null);
    show(`Deleted your progress for ${deleting.name} from this browser.`);
  }

  return (
    <>
      <PageHeader
        eyebrow="Learn"
        title="My projects"
        description="Your own projects, your progress on CampusKit templates and a suggested next step. Everything is saved in this browser only: back it up to move it to another computer."
      />
      <div className="container-page space-y-14">
        <p
          ref={messageRef}
          tabIndex={-1}
          role="status"
          className={
            message.text
              ? 'rounded-xl border border-line bg-raised px-4 py-3 text-sm font-medium text-ink outline-none'
              : 'sr-only'
          }
        >
          {message.text}
        </p>

        <RecoveryNotice />
        <ProjectsSection />

        <section aria-labelledby="started-heading" className="space-y-5">
          <div className="max-w-2xl space-y-1">
            <h2 id="started-heading" className="type-h2 text-ink">
              Template progress
            </h2>
            <p className="text-ink-2">
              The CampusKit templates you’re learning: checklist, viva practice, guided demo, report
              and readiness.
            </p>
          </div>
          {started.length === 0 ? (
            <EmptyState
              icon={<FolderOpen aria-hidden="true" className="size-6" />}
              title="No template progress in this browser yet"
              actions={
                <>
                  <ButtonLink to="/learn" size="sm">
                    Start learning
                  </ButtonLink>
                  <ButtonLink to="/projects" size="sm" variant="secondary">
                    Browse projects
                  </ButtonLink>
                </>
              }
            >
              Tick the learning checklist, practise viva questions or draft a report, and the
              project appears here. If you made a backup elsewhere, restore it below.
            </EmptyState>
          ) : (
            <ul className="grid gap-6 lg:grid-cols-2">
              {started.map(({ project, progress }) => (
                <li key={project.id}>
                  <ProgressCard
                    project={project}
                    progress={progress}
                    onDelete={() => setDeleting(project)}
                  />
                </li>
              ))}
            </ul>
          )}
        </section>

        {others.length > 0 && started.length > 0 ? (
          <section aria-labelledby="others-heading" className="space-y-3">
            <h2 id="others-heading" className="type-h3 text-ink">
              Templates not started yet
            </h2>
            <ul className="flex flex-wrap gap-x-6 gap-y-2">
              {others.map(({ project }) => (
                <li key={project.id}>
                  <Link to={studioHref(project)} className={linkClasses}>
                    {project.name}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        <BackupPanel
          hasSaved={started.length > 0 || workspace.projects.length > 0}
          onRestored={({ templates, projects }) =>
            show(
              `Restored your backup: ${[
                projects > 0 ? pluralize(projects, 'project') : '',
                templates > 0 ? `progress for ${pluralize(templates, 'template')}` : '',
              ]
                .filter(Boolean)
                .join(' and ')}.`,
            )
          }
        />
      </div>

      <Dialog
        open={deleting !== null}
        onClose={() => setDeleting(null)}
        title={deleting ? `Delete your progress for ${deleting.name}?` : 'Delete progress?'}
        confirmation
        footer={
          <div className="flex flex-wrap justify-end gap-2">
            <Button variant="secondary" onClick={() => setDeleting(null)}>
              Cancel
            </Button>
            <Button variant="danger" onClick={confirmDelete}>
              Delete progress
            </Button>
          </div>
        }
      >
        <p className="text-ink-2">
          This deletes the checklist ticks, viva ratings, guided demo record, readiness
          confirmations and report draft for this project from this browser. It can’t be undone,
          unless you have a backup.
        </p>
      </Dialog>
    </>
  );
}

/** The next thing to do, by a fixed order: understand the code, then practise, then present. */
function nextStep(
  project: ProjectManifest,
  facts: {
    checklist: { done: number; total: number } | null;
    viva: { practised: number; total: number } | null;
    rehearsed: boolean;
    reported: boolean;
  },
): { label: string; to: string } {
  const { checklist, viva } = facts;
  if (!checklist || !viva) return { label: 'Open the learning studio', to: studioHref(project) };
  if (checklist.done < checklist.total)
    return { label: 'Continue the checklist', to: studioHref(project, 'checklist') };
  if (viva.practised < viva.total) return { label: 'Practise the viva', to: vivaHref(project) };
  if (!facts.rehearsed) return { label: 'Rehearse the demo', to: `/projects/${project.slug}/demo` };
  if (!facts.reported) return { label: 'Draft your report', to: reportHref(project) };
  return { label: 'Check your readiness', to: `/projects/${project.slug}/ready` };
}

function ProgressCard({
  project,
  progress,
  onDelete,
}: {
  project: ProjectManifest;
  progress: ProjectBackup;
  onDelete: () => void;
}) {
  const guide = useLearningGuide(project);
  const loaded = guide.status === 'ready' ? guide.loaded.guide : null;
  // Counted against the guide, so ids that no longer exist aren't counted.
  const checklistIds = loaded?.checklist.map((item) => item.id) ?? [];
  const questionIds = loaded?.viva.map((question) => question.id) ?? [];
  const ticked = loaded ? readTicked('checklist', project.id, checklistIds).size : 0;
  const viva = loaded
    ? summarizeViva(readVivaProgress(project.id, questionIds), questionIds)
    : null;
  const next = nextStep(project, {
    checklist: loaded ? { done: ticked, total: checklistIds.length } : null,
    viva: viva ? { practised: viva.practised, total: viva.total } : null,
    rehearsed: progress.rehearsal !== undefined,
    reported: progress.report !== undefined,
  });
  const headingId = `progress-${project.id}`;
  const title = progress.report?.info.title.trim();

  return (
    <article
      aria-labelledby={headingId}
      className="flex h-full flex-col gap-5 rounded-2xl border border-line bg-surface p-6 shadow-card"
    >
      <h3 id={headingId} className="type-h3 text-ink">
        <Link to={`/projects/${project.slug}`} className="hover:text-violet">
          {project.name}
        </Link>
      </h3>
      {loaded && viva ? (
        <dl className="space-y-3">
          <Meter
            label="Checklist"
            value={`${ticked} of ${checklistIds.length} ticked`}
            share={checklistIds.length ? ticked / checklistIds.length : 0}
          />
          <Meter
            label="Viva questions"
            value={`${viva.practised} of ${viva.total} practised${
              viva.practised > 0 ? `, ${viva.confident} confident` : ''
            }`}
            share={viva.total ? viva.practised / viva.total : 0}
          />
        </dl>
      ) : (
        <p className="type-meta">
          {guide.status === 'loading'
            ? 'Loading the learning guide…'
            : 'The learning guide isn’t available.'}
        </p>
      )}
      <dl className="grid gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
        <div>
          <dt className="text-ink-2">Guided demo</dt>
          <dd className="font-semibold text-ink">
            {progress.rehearsal
              ? `Completed on ${formatIsoDate(progress.rehearsal.completedOn)}`
              : 'Not rehearsed yet'}
          </dd>
        </div>
        <div>
          <dt className="text-ink-2">Report draft</dt>
          <dd className="font-semibold break-words text-ink">
            {progress.report ? (title ? `“${title}”` : 'Saved') : 'Not started'}
          </dd>
        </div>
        <div>
          <dt className="text-ink-2">Demonstration checklist</dt>
          <dd className="font-semibold text-ink">
            {progress.demo ? `${pluralize(progress.demo.length, 'step')} ticked` : 'Not started'}
          </dd>
        </div>
        <div>
          <dt className="text-ink-2">Readiness</dt>
          <dd className="font-semibold text-ink">
            {progress.readiness
              ? `${pluralize(progress.readiness.length, 'item')} you confirmed`
              : 'Nothing confirmed yet'}
          </dd>
        </div>
      </dl>
      <div className="mt-auto space-y-4 border-t border-line pt-4">
        <div className="flex flex-wrap items-center gap-3">
          <ButtonLink to={next.to} size="sm">
            {next.label} <span className="sr-only">for {project.name}</span>
          </ButtonLink>
          <span className="type-meta">Suggested next step</span>
        </div>
        <nav aria-label={`More for ${project.name}`} className="flex flex-wrap gap-x-4 gap-y-2">
          <Link to={studioHref(project)} className={linkClasses}>
            Learning studio
          </Link>
          <Link to={vivaHref(project)} className={linkClasses}>
            Viva practice
          </Link>
          <Link to={`/projects/${project.slug}/demo`} className={linkClasses}>
            Demo
          </Link>
          <Link to={reportHref(project)} className={linkClasses}>
            Report
          </Link>
          <Link to={`/projects/${project.slug}/ready`} className={linkClasses}>
            Readiness
          </Link>
        </nav>
        <Button
          size="sm"
          variant="ghost"
          icon={<Trash2 aria-hidden="true" className="size-4" />}
          onClick={onDelete}
        >
          Delete saved progress <span className="sr-only">for {project.name}</span>
        </Button>
      </div>
    </article>
  );
}
