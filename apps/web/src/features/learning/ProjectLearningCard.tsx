import type { ProjectManifest } from '@campuskit/project-catalog';
import { BookOpen, MessageCircleQuestion } from 'lucide-react';
import { Link } from 'react-router';

import { DifficultyMeter } from '../../components/DifficultyMeter.tsx';
import { StatusBadge } from '../../components/StatusBadge.tsx';
import { ButtonLink } from '../../components/ui/Button.tsx';
import { Meter } from '../../components/ui/Meter.tsx';
import { useLearningGuide } from '../../hooks/useLearningGuide.ts';
import { readTicked, readVivaProgress, summarizeViva } from '../../lib/progress.ts';
import { reportHref, studioHref, vivaHref } from './links.ts';

const secondaryLinkClasses =
  'rounded-md text-sm font-semibold text-ink-2 underline-offset-4 transition-colors hover:text-violet hover:underline';

/** A project with its saved learning progress and the ways to continue. */
export function ProjectLearningCard({
  project,
  emphasis = 'studio',
}: {
  project: ProjectManifest;
  /** Which action is the primary button. */
  emphasis?: 'studio' | 'viva';
}) {
  const guide = useLearningGuide(project);
  let progress = null;
  if (guide.status === 'ready') {
    const { checklist, viva } = guide.loaded.guide;
    const ticked = readTicked(
      'checklist',
      project.id,
      checklist.map((item) => item.id),
    ).size;
    const questionIds = viva.map((question) => question.id);
    const summary = summarizeViva(readVivaProgress(project.id, questionIds), questionIds);
    progress = (
      <dl className="space-y-3">
        <Meter
          label="Checklist"
          value={`${ticked} of ${checklist.length} ticked`}
          share={checklist.length ? ticked / checklist.length : 0}
        />
        <Meter
          label="Viva questions"
          value={`${summary.practised} of ${summary.total} practised${
            summary.practised > 0 ? `, ${summary.confident} confident` : ''
          }`}
          share={summary.total ? summary.practised / summary.total : 0}
        />
      </dl>
    );
  }

  const studio = {
    to: studioHref(project),
    label: 'Learning studio',
    name: `Learning studio for ${project.name}`,
    icon: <BookOpen aria-hidden="true" className="size-4" />,
  };
  const viva = {
    to: vivaHref(project),
    label: 'Viva practice',
    name: `Viva practice for ${project.name}`,
    icon: <MessageCircleQuestion aria-hidden="true" className="size-4" />,
  };
  const [primary, secondary] = emphasis === 'viva' ? [viva, studio] : [studio, viva];

  return (
    <article className="flex h-full flex-col rounded-xl border border-line bg-surface p-5 shadow-card">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <StatusBadge project={project} />
        <DifficultyMeter difficulty={project.difficulty} className="type-meta font-medium" />
      </div>
      <h3 className="type-h3 mt-3 text-ink">{project.name}</h3>
      <p className="mt-1 text-sm text-ink-2">{project.tagline}</p>
      <div className="mt-5" aria-live="polite">
        {guide.status === 'loading' ? <p className="type-meta">Loading your progress…</p> : null}
        {guide.status === 'missing' ? (
          <p className="type-meta">No learning guide for this project yet.</p>
        ) : null}
        {guide.status === 'error' ? (
          <p className="type-meta">Your progress couldn’t be loaded.</p>
        ) : null}
        {progress}
      </div>
      <div className="mt-auto pt-5">
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3 border-t border-line pt-4">
          <ButtonLink to={primary.to} size="sm" icon={primary.icon} aria-label={primary.name}>
            {primary.label}
          </ButtonLink>
          <div className="flex items-center gap-4">
            <Link to={secondary.to} aria-label={secondary.name} className={secondaryLinkClasses}>
              {secondary.label}
            </Link>
            <Link
              to={reportHref(project)}
              aria-label={`Report workspace for ${project.name}`}
              className={secondaryLinkClasses}
            >
              Report
            </Link>
          </div>
        </div>
      </div>
    </article>
  );
}
