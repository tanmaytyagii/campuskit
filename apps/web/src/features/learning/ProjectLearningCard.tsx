import { DIFFICULTY_LABELS, type ProjectManifest } from '@campuskit/project-catalog';
import { BookOpen, FileText, MessageCircleQuestion } from 'lucide-react';

import { StatusBadge } from '../../components/StatusBadge.tsx';
import { Badge } from '../../components/ui/Badge.tsx';
import { ButtonLink } from '../../components/ui/Button.tsx';
import { useLearningGuide } from '../../hooks/useLearningGuide.ts';
import { readTicked, readVivaProgress, summarizeViva } from '../../lib/progress.ts';
import { reportHref, studioHref, vivaHref } from './links.ts';

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
  let progress: string | null = null;
  if (guide.status === 'ready') {
    const { checklist, viva } = guide.loaded.guide;
    const ticked = readTicked(
      'checklist',
      project.id,
      checklist.map((item) => item.id),
    ).size;
    const questionIds = viva.map((question) => question.id);
    const summary = summarizeViva(readVivaProgress(project.id, questionIds), questionIds);
    progress = `Checklist: ${ticked} of ${checklist.length} ticked · Viva: ${summary.practised} of ${summary.total} practised, ${summary.confident} confident`;
  }

  return (
    <article className="flex h-full flex-col gap-4 rounded-xl border border-line bg-surface p-5 shadow-card">
      <div className="space-y-2">
        <div className="flex flex-wrap gap-1.5">
          <StatusBadge project={project} />
          <Badge tone="violet">{DIFFICULTY_LABELS[project.difficulty]}</Badge>
        </div>
        <h3 className="heading text-xl text-ink">{project.name}</h3>
        <p className="text-sm text-ink-2">{project.tagline}</p>
      </div>
      <p className="text-sm text-ink-3" aria-live="polite">
        {guide.status === 'loading' ? 'Loading your progress…' : null}
        {guide.status === 'missing' ? 'No learning guide for this project yet.' : null}
        {guide.status === 'error' ? 'Your progress couldn’t be loaded.' : null}
        {progress}
      </p>
      <div className="mt-auto flex flex-wrap gap-2">
        <ButtonLink
          to={studioHref(project)}
          size="sm"
          variant={emphasis === 'studio' ? 'primary' : 'secondary'}
          icon={<BookOpen aria-hidden="true" className="size-4" />}
          aria-label={`Learning studio for ${project.name}`}
        >
          Learning studio
        </ButtonLink>
        <ButtonLink
          to={vivaHref(project)}
          size="sm"
          variant={emphasis === 'viva' ? 'primary' : 'secondary'}
          icon={<MessageCircleQuestion aria-hidden="true" className="size-4" />}
          aria-label={`Viva practice for ${project.name}`}
        >
          Viva practice
        </ButtonLink>
        <ButtonLink
          to={reportHref(project)}
          size="sm"
          variant="ghost"
          icon={<FileText aria-hidden="true" className="size-4" />}
          aria-label={`Report workspace for ${project.name}`}
        >
          Report
        </ButtonLink>
      </div>
    </article>
  );
}
