import { CATEGORY_LABELS, type ProjectManifest } from '@campuskit/project-catalog';
import { Link } from 'react-router';

import { cn } from '../lib/cn.ts';
import { DifficultyMeter } from './DifficultyMeter.tsx';
import { PreviewImage } from './PreviewImage.tsx';
import { StatusBadge } from './StatusBadge.tsx';

interface ProjectCardProps {
  project: ProjectManifest;
  headingLevel?: 'h2' | 'h3';
  className?: string;
}

/** Technologies worth showing on a card: styling languages are left out. */
export function cardTechnologies(project: ProjectManifest): string[] {
  return [
    ...project.languages.filter((language) => language !== 'CSS' && language !== 'HTML'),
    ...project.frameworks,
  ].slice(0, 4);
}

/**
 * A gallery card: screenshot with the verification status, category, name,
 * one-line description, then difficulty and stack. The whole card is
 * clickable through a stretched link on the title.
 */
export function ProjectCard({ project, headingLevel = 'h3', className }: ProjectCardProps) {
  const Heading = headingLevel;
  return (
    <article
      className={cn(
        'group relative flex flex-col overflow-hidden rounded-xl border border-line bg-surface shadow-card',
        'transition-[border-color,box-shadow] hover:border-line-strong hover:shadow-lift',
        'has-[a:focus-visible]:outline-2 has-[a:focus-visible]:outline-offset-2 has-[a:focus-visible]:outline-focus',
        className,
      )}
    >
      <div className="relative">
        <PreviewImage project={project} className="aspect-[16/9] border-b border-line" />
        <div className="absolute top-3 left-3 rounded-md bg-surface/90 shadow-card">
          <StatusBadge project={project} />
        </div>
      </div>
      <div className="flex flex-1 flex-col p-5">
        <p className="type-eyebrow">{CATEGORY_LABELS[project.category]}</p>
        <Heading className="type-h3 mt-2 text-lg text-ink">
          <Link
            to={`/projects/${project.slug}`}
            className="outline-none after:absolute after:inset-0 after:content-[''] group-hover:text-violet"
          >
            {project.name}
          </Link>
        </Heading>
        <p className="mt-2 text-[0.9375rem] text-ink-2">{project.tagline}</p>
        <div className="mt-auto pt-5">
          <dl className="grid gap-1.5 border-t border-line pt-4 text-sm">
            <div>
              <dt className="sr-only">Difficulty</dt>
              <dd className="font-medium text-ink-2">
                <DifficultyMeter difficulty={project.difficulty} />
              </dd>
            </div>
            <div className="min-w-0">
              <dt className="sr-only">Built with</dt>
              <dd className="truncate font-mono text-xs text-ink-3">
                {cardTechnologies(project).join(' · ')}
              </dd>
            </div>
          </dl>
        </div>
      </div>
    </article>
  );
}
