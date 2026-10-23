import {
  AUDIENCE_LABELS,
  catalog,
  CATEGORY_LABELS,
  getProjectBySlug,
  PROJECT_TYPE_LABELS,
  setupSteps,
  type ProjectManifest,
} from '@campuskit/project-catalog';
import type { TemplateOption } from '@campuskit/template-engine';
import {
  BookOpen,
  Check,
  CodeXml,
  Download,
  FileText,
  GraduationCap,
  Info,
  Wand,
} from 'lucide-react';
import { useEffect, useState, type ReactNode } from 'react';
import { Link, useParams } from 'react-router';

import { DifficultyMeter } from '../../components/DifficultyMeter.tsx';
import { Breadcrumbs } from '../../components/layout/Breadcrumbs.tsx';
import { cardTechnologies, ProjectCard } from '../../components/ProjectCard.tsx';
import { SetupSteps } from '../../components/SetupSteps.tsx';
import { StatusBadge } from '../../components/StatusBadge.tsx';
import { Button, ButtonLink } from '../../components/ui/Button.tsx';
import { Callout } from '../../components/ui/Callout.tsx';
import { CommandBlock } from '../../components/ui/CommandBlock.tsx';
import { Skeleton } from '../../components/ui/Spinner.tsx';
import { useDocumentTitle } from '../../hooks/useDocumentTitle.ts';
import { loadTemplateDoc } from '../../lib/assets.ts';
import { formatIsoDate } from '../../lib/format.ts';
import { siteConfig } from '../../site.config.ts';
import { NotFoundPage } from '../../pages/NotFoundPage.tsx';
import { relatedProjects } from '../gallery/filtering.ts';
import { reportHref, studioHref, vivaHref } from '../learning/links.ts';
import { ScreenshotGallery } from './ScreenshotGallery.tsx';
import { useQuickDownload } from './useQuickDownload.ts';
import { VerificationPanel } from './VerificationPanel.tsx';

const SECTIONS = [
  { id: 'overview', label: 'Overview' },
  { id: 'setup', label: 'Setup' },
  { id: 'customization', label: 'Customization' },
  { id: 'testing', label: 'Testing' },
  { id: 'verification', label: 'Verification' },
  { id: 'learn', label: 'Learn and present' },
  { id: 'documentation', label: 'Documentation' },
] as const;

function Section({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section
      id={id}
      aria-labelledby={`${id}-heading`}
      className="scroll-mt-24 space-y-4 border-t border-line pt-10 first:border-t-0 first:pt-0"
    >
      <h2 id={`${id}-heading`} className="type-h2 text-ink">
        {title}
      </h2>
      {children}
    </section>
  );
}

function describeOption(option: TemplateOption): string {
  switch (option.type) {
    case 'text':
      return option.required
        ? `Text, ${option.minLength}–${option.maxLength} characters`
        : `Optional text, up to ${option.maxLength} characters`;
    case 'number':
      return `Whole number from ${option.min} to ${option.max}${option.unit ? ` ${option.unit}` : ''}`;
    case 'select':
      return option.choices.map((choice) => choice.label).join(', ');
    case 'boolean':
      return 'On or off';
  }
}

function defaultLabel(option: TemplateOption): string {
  if (option.type === 'boolean') return option.default ? 'On' : 'Off';
  if (option.type === 'select')
    return (
      option.choices.find((choice) => choice.value === option.default)?.label ?? option.default
    );
  if (option.type === 'number') return `${option.default}${option.unit ? ` ${option.unit}` : ''}`;
  return option.default || 'Empty';
}

/** The first few questions of the template's viva document. */
function VivaPreview({ project }: { project: ProjectManifest }) {
  const doc = project.docs.find((item) => item.kind === 'viva');
  const [text, setText] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!doc) return undefined;
    let cancelled = false;
    const loading = loadTemplateDoc(project.template.directory, doc.file);
    if (!loading) {
      queueMicrotask(() => setFailed(true));
      return undefined;
    }
    loading.then(
      (markdown) => {
        if (!cancelled) setText(markdown);
      },
      () => {
        if (!cancelled) setFailed(true);
      },
    );
    return () => {
      cancelled = true;
    };
  }, [doc, project.template.directory]);

  if (!doc) return null;
  if (failed)
    return (
      <Callout tone="warn">
        The viva questions couldn’t be loaded. Open the documentation below instead.
      </Callout>
    );
  if (text === null) return <Skeleton className="h-40" />;

  const questions = [...text.matchAll(/^#{2,3}\s+\d+\.\s+(.+)$/gm)]
    .map((match) => match[1] ?? '')
    .slice(0, 4);
  return (
    <div className="rounded-xl border border-line bg-surface p-5">
      <h3 className="text-sm font-bold text-ink">Questions you should be able to answer</h3>
      <ol className="mt-3 list-decimal space-y-1.5 pl-5 text-ink-2">
        {questions.map((question) => (
          <li key={question}>{question}</li>
        ))}
      </ol>
      <Link to={`/projects/${project.slug}/docs/viva`} className="link mt-4 inline-block text-sm">
        Read all questions with explanatory answers
      </Link>
    </div>
  );
}

/** "School and college", from the manifest's audience list. */
function audienceText(project: ProjectManifest): string {
  const text = project.audience
    .map((audience) => AUDIENCE_LABELS[audience].toLowerCase())
    .join(' and ');
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export function ProjectPage() {
  const { slug = '' } = useParams();
  const project = getProjectBySlug(slug);
  if (!project) return <NotFoundPage />;
  return <ProjectDetails key={project.id} project={project} />;
}

function ProjectDetails({ project }: { project: ProjectManifest }) {
  useDocumentTitle(project.name);
  const quick = useQuickDownload(project);
  const steps = setupSteps(project);
  const programmingLanguages = project.languages;
  const related = relatedProjects(project, catalog);

  return (
    <article className="pb-8">
      <div className="container-page pt-8 md:pt-12">
        <Breadcrumbs items={[{ label: 'Projects', to: '/projects' }]} current={project.name} />

        <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] lg:items-start lg:gap-14">
          <div className="space-y-6">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
              <StatusBadge project={project} />
              <span className="type-eyebrow">
                {CATEGORY_LABELS[project.category]} · {PROJECT_TYPE_LABELS[project.projectType]}
              </span>
            </div>
            <div className="space-y-4">
              <h1 className="type-title text-ink">{project.name}</h1>
              <p className="type-lead">{project.tagline}</p>
            </div>
            <dl className="grid grid-cols-2 gap-x-6 gap-y-4 border-y border-line py-4 text-sm sm:grid-cols-4">
              <div>
                <dt className="type-meta">Difficulty</dt>
                <dd className="mt-1 font-medium text-ink">
                  <DifficultyMeter difficulty={project.difficulty} />
                </dd>
              </div>
              <div>
                <dt className="type-meta">For</dt>
                <dd className="mt-1 font-medium text-ink">{audienceText(project)}</dd>
              </div>
              <div>
                <dt className="type-meta">Built with</dt>
                <dd className="mt-1 font-medium text-ink">
                  {cardTechnologies(project).slice(0, 2).join(', ')}
                </dd>
              </div>
              <div>
                <dt className="type-meta">Works offline</dt>
                <dd className="mt-1 font-medium text-ink">
                  {project.network.runsOffline ? 'After installing' : 'No'}
                </dd>
              </div>
            </dl>
            <div className="flex flex-wrap items-center gap-3">
              <ButtonLink
                to={`/generate?template=${project.id}`}
                size="lg"
                icon={<Wand aria-hidden="true" className="size-5" />}
              >
                Customize and download
              </ButtonLink>
              <Button
                size="lg"
                variant="secondary"
                onClick={() => void quick.download()}
                disabled={quick.state.status === 'working'}
                icon={<Download aria-hidden="true" className="size-5" />}
              >
                {quick.state.status === 'working' ? 'Preparing ZIP…' : 'Download with defaults'}
              </Button>
              <Link
                to={`/projects/${project.slug}/source`}
                className="link inline-flex items-center gap-1.5 px-1 text-[0.9375rem]"
              >
                <CodeXml aria-hidden="true" className="size-4" />
                Browse source
              </Link>
            </div>
            <div aria-live="polite">
              {quick.state.status === 'done' ? (
                <Callout tone="success">
                  Downloaded {quick.state.fileName}. Follow the setup steps below, or read
                  GETTING_STARTED.md inside the ZIP.
                </Callout>
              ) : null}
              {quick.state.status === 'error' ? (
                <Callout tone="danger" title="The download failed" role="alert">
                  {quick.state.message}
                </Callout>
              ) : null}
            </div>
          </div>
          <ScreenshotGallery project={project} />
        </div>
      </div>

      <div className="container-page mt-14 grid gap-12 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div className="min-w-0 space-y-12">
          <nav aria-label="On this page" className="flex flex-wrap gap-2 lg:hidden">
            {SECTIONS.map((section) => (
              <a
                key={section.id}
                href={`#${section.id}`}
                className="rounded-md border border-line px-3 py-1.5 text-sm font-medium text-ink-2 hover:border-violet hover:text-violet"
              >
                {section.label}
              </a>
            ))}
          </nav>

          <Section id="overview" title="Overview">
            <p className="max-w-[70ch] text-ink-2">{project.description}</p>
            <div className="grid gap-8 md:grid-cols-2 md:gap-10">
              <div>
                <h3 className="type-h3 text-ink">What it does</h3>
                <ul className="mt-4 space-y-3 text-[0.9375rem] text-ink-2">
                  {project.features.map((feature) => (
                    <li key={feature} className="flex gap-3">
                      <Check aria-hidden="true" className="mt-1 size-4 shrink-0 text-violet" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="md:border-l md:border-line md:pl-10">
                <h3 className="type-h3 text-ink">Known limitations</h3>
                <ul className="mt-4 space-y-3 text-[0.9375rem] text-ink-2">
                  {project.limitations.map((limitation) => (
                    <li key={limitation} className="flex gap-3">
                      <Info aria-hidden="true" className="mt-1 size-4 shrink-0 text-ink-3" />
                      <span>{limitation}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </Section>

          <Section id="setup" title="Setup">
            <div className="rounded-xl bg-raised p-5">
              <h3 className="text-sm font-bold text-ink">Prerequisites</h3>
              <ul className="mt-2 space-y-1.5 text-ink-2">
                {project.prerequisites.map((item) => (
                  <li key={item.name}>
                    {item.url ? (
                      <a href={item.url} target="_blank" rel="noopener noreferrer" className="link">
                        {item.name}
                      </a>
                    ) : (
                      <span className="font-semibold text-ink">{item.name}</span>
                    )}
                    {item.version ? ` ${item.version}` : ''}
                    {item.note ? <span className="text-ink-3">: {item.note}</span> : null}
                  </li>
                ))}
              </ul>
            </div>
            <SetupSteps steps={steps} />
            {project.setup.notes.length > 0 ? (
              <ul className="list-disc space-y-1.5 pl-5 text-sm text-ink-3">
                {project.setup.notes.map((note) => (
                  <li key={note}>{note}</li>
                ))}
              </ul>
            ) : null}
          </Section>

          <Section id="customization" title="Customization">
            <p className="max-w-[70ch] text-ink-2">
              The generator can change these settings. Each one is written only to the files listed
              below; everything else in the template stays exactly as published.
            </p>
            {/* The table scrolls sideways on small screens; the region makes it reachable by keyboard. */}
            <div
              role="region"
              aria-label="Settings you can customize"
              tabIndex={0}
              className="overflow-x-auto rounded-xl border border-line"
            >
              <table className="w-full min-w-[36rem] text-left text-sm">
                <caption className="sr-only">Settings you can customize</caption>
                <thead className="bg-raised text-ink">
                  <tr>
                    <th scope="col" className="px-4 py-3 font-semibold">
                      Setting
                    </th>
                    <th scope="col" className="px-4 py-3 font-semibold">
                      Allowed values
                    </th>
                    <th scope="col" className="px-4 py-3 font-semibold">
                      Default
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {project.customization.options.map((option) => (
                    <tr key={option.id}>
                      <th scope="row" className="px-4 py-3 font-semibold text-ink">
                        {option.label}
                        {option.description ? (
                          <span className="mt-0.5 block font-normal text-ink-3">
                            {option.description}
                          </span>
                        ) : null}
                      </th>
                      <td className="px-4 py-3 text-ink-2">{describeOption(option)}</td>
                      <td className="px-4 py-3 text-ink-2">{defaultLabel(option)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div>
              <h3 className="text-sm font-bold text-ink">Files the generator edits</h3>
              <ul className="mt-2 flex flex-wrap gap-2">
                {[...new Set(project.customization.edits.map((edit) => edit.file))].map((file) => (
                  <li key={file}>
                    <Link
                      to={`/projects/${project.slug}/source?file=${encodeURIComponent(file)}`}
                      className="inline-block rounded-md bg-raised px-2.5 py-1 font-mono text-xs text-ink hover:text-violet"
                    >
                      {file}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </Section>

          <Section id="testing" title="Testing">
            <p className="text-ink-2">
              The project includes automated tests written with {project.testing.tools.join(', ')}.
              Run them after installing the dependencies:
            </p>
            <CommandBlock commands={project.testing.commands.map((command) => command.command)} />
            <h3 className="text-sm font-bold text-ink">What the tests cover</h3>
            <ul className="list-disc space-y-1.5 pl-5 text-[0.95rem] text-ink-2">
              {project.testing.covers.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </Section>

          <Section id="verification" title="Verification">
            <VerificationPanel project={project} />
          </Section>

          <Section id="learn" title="Learn and present">
            <div className="grid gap-6 md:grid-cols-2">
              <div className="rounded-xl border border-line bg-surface p-5">
                <h3 className="flex items-center gap-2 text-sm font-bold text-ink">
                  <GraduationCap aria-hidden="true" className="size-4 text-violet" />
                  You will learn to
                </h3>
                <ul className="mt-3 list-disc space-y-2 pl-5 text-[0.95rem] text-ink-2">
                  {project.learningObjectives.map((objective) => (
                    <li key={objective}>{objective}</li>
                  ))}
                </ul>
              </div>
              <VivaPreview project={project} />
            </div>
            <div className="rounded-xl bg-raised p-5">
              <p className="max-w-[70ch] text-ink-2">
                The learning studio explains this project’s architecture and important files, with a
                checklist and troubleshooting. Viva practice asks you its questions one at a time,
                and the submission workspace drafts your report from the project’s real features and
                limitations.
              </p>
              <div className="mt-4 flex flex-wrap gap-3">
                <ButtonLink to={studioHref(project)} size="sm">
                  Open the learning studio
                </ButtonLink>
                <ButtonLink to={vivaHref(project)} size="sm" variant="secondary">
                  Practise viva questions
                </ButtonLink>
                <ButtonLink to={reportHref(project)} size="sm" variant="secondary">
                  Prepare your report
                </ButtonLink>
                <ButtonLink to={studioHref(project, 'troubleshooting')} size="sm" variant="ghost">
                  Troubleshooting
                </ButtonLink>
              </div>
            </div>
          </Section>

          <Section id="documentation" title="Documentation">
            <ul className="grid gap-3 sm:grid-cols-2">
              {project.docs.map((doc) => (
                <li key={doc.file}>
                  <Link
                    to={`/projects/${project.slug}/docs/${doc.kind}`}
                    className="flex items-start gap-3 rounded-xl border border-line bg-surface p-4 hover:border-violet"
                  >
                    {doc.kind === 'readme' ? (
                      <BookOpen aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-violet" />
                    ) : (
                      <FileText aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-violet" />
                    )}
                    <span>
                      <span className="block font-semibold text-ink">{doc.title}</span>
                      <span className="font-mono text-xs text-ink-3">{doc.file}</span>
                    </span>
                  </Link>
                </li>
              ))}
              <li>
                <Link
                  to={`/projects/${project.slug}/source`}
                  className="flex items-start gap-3 rounded-xl border border-line bg-surface p-4 hover:border-violet"
                >
                  <CodeXml aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-violet" />
                  <span>
                    <span className="block font-semibold text-ink">Source code</span>
                    <span className="text-xs text-ink-3">Every file in the template</span>
                  </span>
                </Link>
              </li>
            </ul>
          </Section>
        </div>

        <aside aria-label="At a glance" className="space-y-6 lg:sticky lg:top-24 lg:self-start">
          <nav aria-label="On this page" className="hidden lg:block">
            <h2 className="text-sm font-bold text-ink">On this page</h2>
            <ul className="mt-2 space-y-1">
              {SECTIONS.map((section) => (
                <li key={section.id}>
                  <a
                    href={`#${section.id}`}
                    className="block rounded-md px-2 py-1 text-sm text-ink-2 hover:bg-raised hover:text-ink"
                  >
                    {section.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
          <dl className="space-y-4 rounded-xl border border-line bg-surface p-5 text-sm">
            <div>
              <dt className="font-semibold text-ink-3">Languages</dt>
              <dd className="text-ink">{programmingLanguages.join(', ')}</dd>
            </div>
            <div>
              <dt className="font-semibold text-ink-3">Frameworks and libraries</dt>
              <dd className="text-ink">{project.frameworks.join(', ')}</dd>
            </div>
            <div>
              <dt className="font-semibold text-ink-3">Environment variables</dt>
              <dd className="text-ink">
                {project.environment.variables.length === 0
                  ? 'None needed'
                  : project.environment.variables.map((variable) => variable.name).join(', ')}
              </dd>
            </div>
            <div>
              <dt className="font-semibold text-ink-3">Internet and services</dt>
              <dd className="text-ink">
                {project.network.installNeedsInternet
                  ? 'Internet needed once to install packages. '
                  : ''}
                {project.network.runsOffline
                  ? 'Runs offline afterwards.'
                  : 'Needs a connection to run.'}
                {project.network.externalServices.length === 0
                  ? ' No external services or API keys.'
                  : ` Uses: ${project.network.externalServices.join(', ')}.`}
              </dd>
            </div>
            <div>
              <dt className="font-semibold text-ink-3">Template version</dt>
              <dd className="text-ink">
                {project.version}, updated {formatIsoDate(project.updatedOn)}
              </dd>
            </div>
            <div>
              <dt className="font-semibold text-ink-3">License</dt>
              <dd className="text-ink">
                <Link to="/docs/license" className="link">
                  {project.license.spdx}
                </Link>
                <span className="block text-ink-3">{project.license.attribution}</span>
              </dd>
            </div>
            <div>
              <dt className="font-semibold text-ink-3">Source repository</dt>
              <dd className="text-ink">
                {(project.repositoryUrl ?? siteConfig.repositoryUrl) ? (
                  <a
                    href={project.repositoryUrl ?? siteConfig.repositoryUrl ?? ''}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="link"
                  >
                    View on the web
                  </a>
                ) : (
                  <>
                    Included with CampusKit in{' '}
                    <span className="font-mono text-xs">{project.template.directory}</span>.{' '}
                    <Link to={`/projects/${project.slug}/source`} className="link">
                      Browse it here
                    </Link>
                    .
                  </>
                )}
              </dd>
            </div>
          </dl>
          <div className="rounded-xl border border-line bg-surface p-5 text-sm">
            <h2 className="font-semibold text-ink-3">Built with</h2>
            <ul className="mt-2 space-y-1">
              {project.license.thirdParty.map((item) => (
                <li key={item.name} className="flex justify-between gap-3">
                  <a
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-ink hover:text-violet hover:underline"
                  >
                    {item.name}
                  </a>
                  <span className="text-ink-3">{item.license}</span>
                </li>
              ))}
            </ul>
          </div>
        </aside>
      </div>

      {related.length > 0 ? (
        <section aria-labelledby="related-heading" className="container-page mt-16 space-y-5">
          <h2 id="related-heading" className="type-h2 text-ink">
            Related projects
          </h2>
          <ul className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {related.map(({ project: item, shared, sameCategory }) => (
              <li key={item.id} className="flex flex-col gap-2">
                <ProjectCard project={item} className="w-full flex-1" />
                <p className="text-sm text-ink-3">
                  {shared.length > 0
                    ? `Also uses ${shared.slice(0, 3).join(', ')}`
                    : `Also a ${CATEGORY_LABELS[item.category].toLowerCase()} project`}
                  {shared.length > 0 && sameCategory
                    ? `; also ${CATEGORY_LABELS[item.category].toLowerCase()}`
                    : ''}
                  .
                </p>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </article>
  );
}
