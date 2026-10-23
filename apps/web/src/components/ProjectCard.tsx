import {
  AUDIENCE_LABELS,
  CATEGORY_LABELS,
  DIFFICULTY_LABELS,
  type ProjectManifest,
} from '@campuskit/project-catalog';
import { Link } from 'react-router';

import { cn } from '../lib/cn.ts';
import { PreviewImage } from './PreviewImage.tsx';
import { StatusBadge } from './StatusBadge.tsx';
import { Badge } from './ui/Badge.tsx';

interface ProjectCardProps {
  project: ProjectManifest;
  headingLevel?: 'h2' | 'h3';
  className?: string;
}

/** A gallery card. The whole card is clickable through a stretched link on the title. */
export function ProjectCard({ project, headingLevel = 'h3', className }: ProjectCardProps) {
  const Heading = headingLevel;
  const optionCount = project.customization.options.length;
  return (
    <article
      className={cn(
        'group relative flex flex-col overflow-hidden rounded-xl border border-line bg-surface shadow-card',
        'transition-[border-color,box-shadow] duration-150 hover:border-violet hover:shadow-lift',
        'has-[a:focus-visible]:outline-2 has-[a:focus-visible]:outline-offset-2 has-[a:focus-visible]:outline-focus',
        className,
      )}
    >
      <PreviewImage project={project} className="aspect-[16/10] border-b border-line" />
      <div className="flex flex-1 flex-col gap-3 p-5">
        <p className="text-sm font-medium text-ink-3">{CATEGORY_LABELS[project.category]}</p>
        <Heading className="heading text-xl text-ink">
          <Link
            to={`/projects/${project.slug}`}
            className="outline-none after:absolute after:inset-0 after:content-['']"
          >
            {project.name}
          </Link>
        </Heading>
        <p className="text-[0.95rem] text-ink-2">{project.tagline}</p>
        <div className="mt-auto flex flex-wrap gap-1.5 pt-2">
          <StatusBadge project={project} />
          <Badge tone="violet">{DIFFICULTY_LABELS[project.difficulty]}</Badge>
          <Badge>
            {project.audience.map((audience) => AUDIENCE_LABELS[audience]).join(' and ')}
          </Badge>
          {[...project.languages.filter((language) => language !== 'CSS'), ...project.frameworks]
            .slice(0, 3)
            .map((tech) => (
              <Badge key={tech} tone="outline">
                {tech}
              </Badge>
            ))}
        </div>
        <p className="text-sm text-ink-3">
          {optionCount} customizable {optionCount === 1 ? 'setting' : 'settings'}
        </p>
      </div>
    </article>
  );
}
