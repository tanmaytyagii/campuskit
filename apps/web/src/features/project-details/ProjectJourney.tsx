import {
  BACKEND_LABELS,
  PERSISTENCE_LABELS,
  type ProjectManifest,
} from '@campuskit/project-catalog';
import { ArrowRight, MonitorPlay } from 'lucide-react';
import { Link } from 'react-router';

import { ButtonLink } from '../../components/ui/Button.tsx';
import { Callout } from '../../components/ui/Callout.tsx';
import type { DemoDefinition } from '../demo/types.ts';
import { demoHref, presentationHref, readinessHref, studioHref } from '../learning/links.ts';

/** The four steps from looking at a project to presenting it, each with its next action. */
export function ProjectJourney({
  project,
  hasDemo,
}: {
  project: ProjectManifest;
  hasDemo: boolean;
}) {
  const steps = [
    {
      title: 'Explore it',
      text: hasDemo
        ? 'Try the interactive demo with fictional sample data.'
        : 'Look through the screenshots, features and limitations.',
      links: [
        hasDemo
          ? { to: demoHref(project), label: 'Open the demo' }
          : { to: '#overview', label: 'See the overview' },
      ],
    },
    {
      title: 'Build it',
      text: 'Customize the project and download its full source code as a ZIP.',
      links: [{ to: `/generate?template=${project.id}`, label: 'Open the generator' }],
    },
    {
      title: 'Understand it',
      text: 'Learn the architecture and the important files, with a checklist and troubleshooting.',
      links: [{ to: studioHref(project), label: 'Open the learning studio' }],
    },
    {
      title: 'Demonstrate it',
      text: 'Practise the viva, present with slides built from the project, and check you are ready.',
      links: [
        { to: presentationHref(project), label: 'Present the project' },
        { to: readinessHref(project), label: 'Readiness check' },
      ],
    },
  ];
  return (
    <section aria-labelledby="journey-heading" className="container-page mt-12">
      <h2 id="journey-heading" className="type-eyebrow">
        Your path with this project
      </h2>
      <ol className="mt-3 grid gap-px overflow-hidden rounded-2xl border border-line bg-line sm:grid-cols-2 lg:grid-cols-4">
        {steps.map((step, index) => (
          <li key={step.title} className="flex flex-col gap-2 bg-surface p-5">
            <span className="font-mono text-sm font-medium text-violet">0{index + 1}</span>
            <h3 className="type-h3 text-ink">{step.title}</h3>
            <p className="flex-1 text-sm text-ink-2">{step.text}</p>
            <div className="flex flex-wrap gap-x-4 gap-y-1 pt-1">
              {step.links.map((link) =>
                link.to.startsWith('#') ? (
                  <a
                    key={link.label}
                    href={link.to}
                    className="link inline-flex items-center gap-1 text-sm"
                  >
                    {link.label}
                    <ArrowRight aria-hidden="true" className="size-3.5" />
                  </a>
                ) : (
                  <Link
                    key={link.label}
                    to={link.to}
                    className="link inline-flex items-center gap-1 text-sm"
                  >
                    {link.label}
                    <ArrowRight aria-hidden="true" className="size-3.5" />
                  </Link>
                ),
              )}
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}

/** What the demo shows, what it simplifies, what the full project adds and what it needs to run. */
export function DemoSummary({ project, demo }: { project: ProjectManifest; demo: DemoDefinition }) {
  const simplified = [...new Set(demo.features.flatMap((feature) => feature.simplified))];
  const services = project.network.externalServices;
  const variables = project.environment.variables;
  return (
    <div className="space-y-6">
      <p className="max-w-[70ch] text-ink-2">{demo.summary}</p>
      <Callout title="A demonstration with fictional sample data">{demo.notice}</Callout>
      <div className="grid gap-8 md:grid-cols-2 md:gap-10">
        <div>
          <h3 className="type-h3 text-ink">What you can try</h3>
          <ul className="mt-4 space-y-3 text-[0.9375rem] text-ink-2">
            {demo.features.map((feature) => (
              <li key={feature.id}>
                <span className="font-semibold text-ink">{feature.label}: </span>
                {feature.tryThis[0]}
              </li>
            ))}
          </ul>
        </div>
        <div className="md:border-l md:border-line md:pl-10">
          <h3 className="type-h3 text-ink">What the full project adds</h3>
          <ul className="mt-4 list-disc space-y-2 pl-5 text-[0.9375rem] text-ink-2 marker:text-ink-3">
            {demo.fullProjectAdds.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      </div>
      {simplified.length > 0 ? (
        <details className="rounded-xl border border-line">
          <summary className="cursor-pointer rounded-xl px-4 py-3 text-sm font-semibold text-ink hover:bg-raised/60">
            Simplified in the demo
          </summary>
          <ul className="list-disc space-y-1.5 border-t border-line py-3 pr-4 pl-9 text-sm text-ink-2 marker:text-ink-3">
            {simplified.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </details>
      ) : null}
      <dl className="grid gap-4 rounded-xl bg-raised p-5 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <dt className="type-meta">The full project needs</dt>
          <dd className="mt-1 text-sm font-medium text-ink">
            {BACKEND_LABELS[project.stack.backend]}
          </dd>
        </div>
        <div>
          <dt className="type-meta">Data</dt>
          <dd className="mt-1 text-sm font-medium text-ink">
            {PERSISTENCE_LABELS[project.stack.persistence]}
          </dd>
        </div>
        <div>
          <dt className="type-meta">Online services</dt>
          <dd className="mt-1 text-sm font-medium text-ink">
            {services.length > 0 ? services.join('; ') : 'None'}
          </dd>
        </div>
        <div>
          <dt className="type-meta">API keys and settings</dt>
          <dd className="mt-1 text-sm font-medium text-ink">
            {variables.length > 0
              ? `${variables.length} environment ${variables.length === 1 ? 'variable' : 'variables'}: ${variables.map((variable) => variable.name).join(', ')}`
              : 'None needed'}
          </dd>
        </div>
      </dl>
      <div className="flex flex-wrap gap-3">
        <ButtonLink
          to={demoHref(project)}
          size="sm"
          icon={<MonitorPlay aria-hidden="true" className="size-4" />}
        >
          Open the demo
        </ButtonLink>
        <ButtonLink to={presentationHref(project)} size="sm" variant="secondary">
          Present the project
        </ButtonLink>
      </div>
    </div>
  );
}
