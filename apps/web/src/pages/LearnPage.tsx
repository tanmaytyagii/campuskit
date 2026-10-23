import { catalog } from '@campuskit/project-catalog';
import { BookOpen, Presentation, ShieldCheck, Terminal } from 'lucide-react';
import type { ReactNode } from 'react';
import { Link, Navigate, useSearchParams } from 'react-router';

import { PageHeader } from '../components/layout/PageHeader.tsx';
import { ButtonLink } from '../components/ui/Button.tsx';
import { ProjectLearningCard } from '../features/learning/ProjectLearningCard.tsx';
import { useDocumentTitle } from '../hooks/useDocumentTitle.ts';
import { getRepoDoc } from '../lib/repo-docs.ts';

const GUIDES: Array<{ slug: string; icon: ReactNode }> = [
  { slug: 'run-a-react-project', icon: <Terminal aria-hidden="true" className="size-5" /> },
  { slug: 'run-a-python-project', icon: <Terminal aria-hidden="true" className="size-5" /> },
  { slug: 'prepare-for-your-viva', icon: <Presentation aria-hidden="true" className="size-5" /> },
  { slug: 'using-templates-honestly', icon: <ShieldCheck aria-hidden="true" className="size-5" /> },
];

export function LearnPage() {
  useDocumentTitle('Learning center');
  const [params] = useSearchParams();
  // The report builder used to live here (/learn?project=…); keep old links working.
  const project = params.get('project');
  if (project)
    return <Navigate to={`/learn/report?project=${encodeURIComponent(project)}`} replace />;

  return (
    <>
      <PageHeader
        title="Learning center"
        description="Understand your project, practise explaining it and prepare your report. Your progress is saved in this browser only."
      />
      <div className="container-page space-y-14">
        <section aria-labelledby="projects-heading" className="space-y-4">
          <div className="max-w-3xl space-y-2">
            <h2 id="projects-heading" className="heading text-2xl text-ink">
              Choose a project
            </h2>
            <p className="text-ink-2">
              Each project has a learning studio (architecture, code walkthrough, checklist and
              troubleshooting), viva practice and a report workspace.
            </p>
          </div>
          <ul className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {catalog.map((item) => (
              <li key={item.id}>
                <ProjectLearningCard project={item} />
              </li>
            ))}
          </ul>
        </section>

        <section
          aria-labelledby="report-heading"
          className="flex flex-wrap items-center justify-between gap-6 rounded-[18px] border border-line bg-surface p-6 shadow-card"
        >
          <div className="max-w-2xl space-y-2">
            <h2 id="report-heading" className="heading flex items-center gap-2 text-2xl text-ink">
              <BookOpen aria-hidden="true" className="size-6 text-violet" />
              Submission workspace
            </h2>
            <p className="text-ink-2">
              Draft every section of a project report from the project’s real features and
              limitations, keep CampusKit’s facts separate from what you write, and prepare your
              demonstration. Download it as Markdown to paste into your institution’s template.
            </p>
          </div>
          <ButtonLink to="/learn/report">Open the workspace</ButtonLink>
        </section>

        <section aria-labelledby="guides-heading">
          <h2 id="guides-heading" className="heading text-xl text-ink">
            Guides
          </h2>
          <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {GUIDES.map(({ slug, icon }) => {
              const doc = getRepoDoc(slug);
              if (!doc) return null;
              return (
                <li key={slug}>
                  <Link
                    to={`/docs/${slug}`}
                    className="flex h-full flex-col gap-2 rounded-xl border border-line bg-surface p-4 hover:border-violet"
                  >
                    <span className="flex size-9 items-center justify-center rounded-lg bg-violet-soft text-violet">
                      {icon}
                    </span>
                    <span className="font-semibold text-ink">{doc.title}</span>
                    <span className="text-sm text-ink-3">{doc.description}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      </div>
    </>
  );
}
