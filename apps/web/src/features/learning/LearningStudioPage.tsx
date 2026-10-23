import { getProjectBySlug, type ProjectManifest } from '@campuskit/project-catalog';
import { FileText, MessageCircleQuestion, RotateCcw, Wand } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { Link, Navigate, NavLink, useParams } from 'react-router';

import { Breadcrumbs } from '../../components/layout/Breadcrumbs.tsx';
import { StatusBadge } from '../../components/StatusBadge.tsx';
import { Button, ButtonLink } from '../../components/ui/Button.tsx';
import { Callout } from '../../components/ui/Callout.tsx';
import { EmptyState } from '../../components/ui/EmptyState.tsx';
import { Skeleton } from '../../components/ui/Spinner.tsx';
import { useDocumentTitle } from '../../hooks/useDocumentTitle.ts';
import { useLearningGuide } from '../../hooks/useLearningGuide.ts';
import { cn } from '../../lib/cn.ts';
import type { LoadedGuide } from '../../lib/learning.ts';
import { NotFoundPage } from '../../pages/NotFoundPage.tsx';
import { ArchitectureSection } from './ArchitectureSection.tsx';
import { ChecklistSection } from './ChecklistSection.tsx';
import {
  reportHref,
  STUDIO_SECTIONS,
  studioHref,
  vivaHref,
  type StudioSectionId,
} from './links.ts';
import { OverviewSection } from './OverviewSection.tsx';
import { TroubleshootingSection } from './TroubleshootingSection.tsx';
import { WalkthroughSection } from './WalkthroughSection.tsx';

function isSection(value: string): value is StudioSectionId {
  return STUDIO_SECTIONS.some((section) => section.id === value);
}

export function LearningStudioPage() {
  const { slug = '', section = 'overview' } = useParams();
  const project = getProjectBySlug(slug);
  if (!project) return <NotFoundPage />;
  if (!isSection(section)) return <Navigate to={studioHref(project)} replace />;
  return <Studio key={project.id} project={project} section={section} />;
}

function Studio({ project, section }: { project: ProjectManifest; section: StudioSectionId }) {
  const label = STUDIO_SECTIONS.find((item) => item.id === section)?.label ?? 'Overview';
  useDocumentTitle(`${label} | Learning studio | ${project.name}`);
  const guide = useLearningGuide(project);
  const heading = useRef<HTMLHeadingElement>(null);
  const previous = useRef(section);

  // Moving between sections keeps the page; focus moves to the new section's heading.
  useEffect(() => {
    if (previous.current === section) return;
    previous.current = section;
    heading.current?.focus();
  }, [section]);

  return (
    <div className="container-page pt-8 md:pt-12">
      <Breadcrumbs
        items={[
          { label: 'Projects', to: '/projects' },
          { label: project.name, to: `/projects/${project.slug}` },
        ]}
        current="Learning studio"
      />

      <div className="flex flex-wrap items-end justify-between gap-6">
        <div className="max-w-3xl space-y-3">
          <p className="flex flex-wrap items-center gap-2 text-sm font-semibold text-violet">
            {project.name}
            <StatusBadge project={project} />
          </p>
          <h1 className="type-title text-ink">Learning studio</h1>
          <p className="text-lg text-ink-2">
            Understand how the project works before you change it: its architecture, the important
            files, what to check you can explain, and what to do when something goes wrong.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <ButtonLink
            to={vivaHref(project)}
            icon={<MessageCircleQuestion aria-hidden="true" className="size-4" />}
          >
            Practise viva questions
          </ButtonLink>
          <ButtonLink
            to={reportHref(project)}
            variant="secondary"
            icon={<FileText aria-hidden="true" className="size-4" />}
          >
            Prepare your report
          </ButtonLink>
          <ButtonLink
            to={`/generate?template=${project.id}`}
            variant="ghost"
            icon={<Wand aria-hidden="true" className="size-4" />}
          >
            Customize and download
          </ButtonLink>
        </div>
      </div>

      <nav
        aria-label="Learning studio sections"
        className="mt-8 -mx-4 overflow-x-auto border-b border-line px-4 sm:mx-0 sm:px-0"
      >
        <ul className="flex min-w-max gap-1">
          {STUDIO_SECTIONS.map((item) => (
            <li key={item.id}>
              <NavLink
                to={studioHref(project, item.id)}
                end
                className={({ isActive }) =>
                  cn(
                    '-mb-px inline-block border-b-2 px-3 py-2.5 text-[0.95rem] font-semibold',
                    isActive
                      ? 'border-violet text-ink'
                      : 'border-transparent text-ink-2 hover:border-line-strong hover:text-ink',
                  )
                }
              >
                {item.label}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      <section aria-labelledby="studio-section-heading" className="py-8">
        <h2
          id="studio-section-heading"
          ref={heading}
          tabIndex={-1}
          className="type-h2 mb-6 text-ink outline-none"
        >
          {label}
        </h2>
        {guide.status === 'loading' ? (
          <div className="space-y-4" role="status" aria-label="Loading the learning guide">
            <Skeleton className="h-6 w-2/3" />
            <Skeleton className="h-64 w-full" />
          </div>
        ) : null}
        {guide.status === 'error' ? (
          <Callout tone="danger" title="The learning guide couldn’t be loaded" role="alert">
            <p>{guide.message}</p>
            <Button
              variant="secondary"
              size="sm"
              className="mt-3"
              onClick={guide.retry}
              icon={<RotateCcw aria-hidden="true" className="size-4" />}
            >
              Try again
            </Button>
          </Callout>
        ) : null}
        {guide.status === 'missing' ? (
          <EmptyState title="No learning guide yet">
            This template doesn’t have a learning guide yet. Its README, architecture notes and viva
            questions are on the{' '}
            <Link to={`/projects/${project.slug}`} className="link">
              project page
            </Link>
            .
          </EmptyState>
        ) : null}
        {guide.status === 'ready' ? (
          <SectionContent project={project} section={section} loaded={guide.loaded} />
        ) : null}
      </section>
    </div>
  );
}

function SectionContent({
  project,
  section,
  loaded,
}: {
  project: ProjectManifest;
  section: StudioSectionId;
  loaded: LoadedGuide;
}) {
  switch (section) {
    case 'overview':
      return <OverviewSection project={project} guide={loaded.guide} />;
    case 'architecture':
      return <ArchitectureSection project={project} guide={loaded.guide} />;
    case 'code':
      return <WalkthroughSection project={project} guide={loaded.guide} />;
    case 'checklist':
      return <ChecklistSection project={project} guide={loaded.guide} />;
    case 'troubleshooting':
      return <TroubleshootingSection project={project} entries={loaded.troubleshooting} />;
  }
}
