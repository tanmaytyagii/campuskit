import { getProjectById } from '@campuskit/project-catalog';
import { ArrowRight, MonitorPlay } from 'lucide-react';
import { Link } from 'react-router';

import { PageHeader } from '../components/layout/PageHeader.tsx';
import { StatusBadge } from '../components/StatusBadge.tsx';
import { Badge } from '../components/ui/Badge.tsx';
import { ButtonLink } from '../components/ui/Button.tsx';
import { DEMOS } from '../features/demo/registry.ts';
import { demoHref, presentationHref, readinessHref } from '../features/learning/links.ts';
import { useDocumentTitle } from '../hooks/useDocumentTitle.ts';

const FIDELITY_LABELS = {
  'template-logic': 'Runs the template’s own code',
  'browser-port': 'Browser version of a Python app',
} as const;

const POINTS = [
  {
    title: 'Fictional data, in this tab only',
    text: 'Every demo starts from the template’s own sample data. Your changes stay in this browser tab and nothing is sent anywhere.',
  },
  {
    title: 'Honest about what runs',
    text: 'The React demos call the templates’ own calculations, validation and data updates. The Python analyzer is re-implemented in TypeScript and tested against the real code’s output.',
  },
  {
    title: 'Ready for your presentation',
    text: 'Each demo has a short tour, a guided demo that checks your actions, and slides for presenting the project.',
  },
];

export function DemosPage() {
  useDocumentTitle('Interactive demos');
  return (
    <>
      <PageHeader
        eyebrow="Explore"
        title="Interactive demos"
        description="Try each project in your browser with fictional sample data, before you download it. The demos are demonstrations, not live systems."
      />
      <div className="container-page space-y-14">
        <ul className="grid gap-6 lg:grid-cols-3">
          {DEMOS.map((demo) => {
            const project = getProjectById(demo.projectId);
            if (!project) return null;
            return (
              <li key={demo.projectId}>
                <article className="flex h-full flex-col rounded-xl border border-line bg-surface p-5 shadow-card">
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusBadge project={project} />
                    <Badge tone="outline">{FIDELITY_LABELS[demo.fidelity]}</Badge>
                  </div>
                  <h2 className="type-h3 mt-3 text-ink">{project.name}</h2>
                  <p className="mt-1 text-sm text-ink-2">{demo.summary}</p>
                  <p className="type-meta mt-3">
                    Screens: {demo.features.map((feature) => feature.label).join(' · ')}
                  </p>
                  <div className="mt-auto space-y-3 pt-5">
                    <div className="border-t border-line pt-4">
                      <ButtonLink
                        to={demoHref(project)}
                        size="sm"
                        icon={<MonitorPlay aria-hidden="true" className="size-4" />}
                        aria-label={`Open the demo: ${project.name}`}
                      >
                        Open the demo
                      </ButtonLink>
                    </div>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
                      <Link
                        to={presentationHref(project)}
                        aria-label={`Present it: ${project.name}`}
                        className="font-semibold text-ink-2 underline-offset-4 hover:text-violet hover:underline"
                      >
                        Present it
                      </Link>
                      <Link
                        to={readinessHref(project)}
                        aria-label={`Readiness check: ${project.name}`}
                        className="font-semibold text-ink-2 underline-offset-4 hover:text-violet hover:underline"
                      >
                        Readiness check
                      </Link>
                      <Link
                        to={`/projects/${project.slug}`}
                        aria-label={`Project page: ${project.name}`}
                        className="font-semibold text-ink-2 underline-offset-4 hover:text-violet hover:underline"
                      >
                        Project page
                      </Link>
                    </div>
                  </div>
                </article>
              </li>
            );
          })}
        </ul>

        <section aria-labelledby="demos-how" className="border-y border-line py-10">
          <h2 id="demos-how" className="type-h2 text-ink">
            How the demos work
          </h2>
          <ol className="mt-8 grid gap-8 md:grid-cols-3">
            {POINTS.map((point, index) => (
              <li key={point.title} className="space-y-2">
                <span className="font-mono text-sm font-medium text-violet">0{index + 1}</span>
                <h3 className="type-h3 text-ink">{point.title}</h3>
                <p className="max-w-[40ch] text-sm text-ink-2">{point.text}</p>
              </li>
            ))}
          </ol>
          <Link
            to="/docs/demo-studio"
            className="link mt-8 inline-flex items-center gap-1.5 text-sm"
          >
            How the Demo Studio is built, and how to add a demo
            <ArrowRight aria-hidden="true" className="size-4" />
          </Link>
        </section>
      </div>
    </>
  );
}
