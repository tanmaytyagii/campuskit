import { catalog, getProjectById } from '@campuskit/project-catalog';
import {
  ArrowRight,
  BookOpen,
  BrainCircuit,
  ChartColumn,
  Check,
  FileText,
  Globe,
  MessageCircleQuestion,
  Scale,
  Terminal,
} from 'lucide-react';
import { useId, useState, type ReactNode } from 'react';
import { Link } from 'react-router';

import { ProjectCard } from '../components/ProjectCard.tsx';
import { ButtonLink } from '../components/ui/Button.tsx';
import { CommandBlock } from '../components/ui/CommandBlock.tsx';
import { TextField } from '../components/ui/Field.tsx';
import { filterProjects, EMPTY_FILTERS } from '../features/gallery/filtering.ts';
import { SearchBox } from '../features/gallery/SearchBox.tsx';
import { KitPreview } from '../features/generator/KitPreview.tsx';
import { initialFormValues, previewValues } from '../features/generator/logic.ts';
import { ProductTour } from '../features/home/ProductTour.tsx';
import { useDocumentTitle } from '../hooks/useDocumentTitle.ts';
import { cn } from '../lib/cn.ts';
import { getTemplateStatus } from '../lib/verification.ts';

const SEARCH_IDEAS = ['attendance', 'React', 'pandas', 'charts', 'budget'];

/** The hero's live demo: type a name and see where the engine will write it. */
function HeroKit() {
  const [templateId, setTemplateId] = useState(catalog[0]?.id ?? '');
  const [name, setName] = useState('');
  const groupName = useId();
  const manifest = getProjectById(templateId) ?? catalog[0];
  if (!manifest) return null;
  const values = previewValues(manifest, {
    ...initialFormValues(manifest),
    projectName: name.trim() ? name : manifest.name,
  });
  const target = `/generate?template=${manifest.id}${name.trim() ? `&name=${encodeURIComponent(name.trim())}` : ''}`;

  return (
    <div className="overflow-hidden rounded-2xl border border-line bg-surface shadow-lift">
      <div className="space-y-4 border-b border-line p-5">
        <fieldset>
          <legend className="mb-2 text-sm font-semibold text-ink">Template</legend>
          <div className="flex flex-wrap gap-2">
            {catalog.map((project) => (
              <label
                key={project.id}
                className={cn(
                  'cursor-pointer rounded-md border px-2.5 py-1 text-sm font-medium transition-colors',
                  'has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-focus',
                  project.id === manifest.id
                    ? 'border-violet bg-violet-soft text-violet'
                    : 'border-line-strong text-ink-2 hover:border-control',
                )}
              >
                <input
                  type="radio"
                  name={groupName}
                  value={project.id}
                  checked={project.id === manifest.id}
                  onChange={() => setTemplateId(project.id)}
                  className="sr-only"
                />
                {project.name}
              </label>
            ))}
          </div>
        </fieldset>
        <TextField
          label="Name your project"
          placeholder={manifest.name}
          value={name}
          onChange={(event) => setName(event.target.value)}
          autoComplete="off"
        />
      </div>
      <KitPreview
        manifest={manifest}
        values={values}
        scope="name"
        className="rounded-none border-0 shadow-none"
      />
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line bg-raised px-5 py-4">
        <p className="max-w-[28ch] text-xs text-ink-3">
          Live: the real template engine, escaping your name for each file type.
        </p>
        <ButtonLink to={target} size="sm">
          Continue in the generator
        </ButtonLink>
      </div>
    </div>
  );
}

interface Collection {
  title: string;
  description: string;
  icon: ReactNode;
  count: number;
  to: string;
}

function collections(): Collection[] {
  const count = (filters: Partial<typeof EMPTY_FILTERS>) =>
    filterProjects(catalog, { ...EMPTY_FILTERS, ...filters }).length;
  const ai = count({ category: ['ai-ml'] });
  return [
    {
      title: 'Web development',
      description: 'React and TypeScript apps that run in the browser.',
      icon: <Globe aria-hidden="true" className="size-5" />,
      count: count({ category: ['web-development'] }),
      to: '/projects?category=web-development',
    },
    {
      title: 'Python',
      description: 'Projects written in Python, from scripts to data apps.',
      icon: <Terminal aria-hidden="true" className="size-5" />,
      count: count({ language: ['Python'] }),
      to: '/projects?language=Python',
    },
    {
      title: 'Data analysis',
      description: 'Clean, analyse and explain real datasets.',
      icon: <ChartColumn aria-hidden="true" className="size-5" />,
      count: count({ category: ['data-analysis'] }),
      to: '/projects?category=data-analysis',
    },
    {
      title: 'AI and machine learning',
      description:
        ai === 0
          ? 'No templates yet. Contribute the first one.'
          : 'Models you can train, run and explain.',
      icon: <BrainCircuit aria-hidden="true" className="size-5" />,
      count: ai,
      to: ai === 0 ? '/docs/adding-a-template' : '/projects?category=ai-ml',
    },
  ];
}

const STEPS = [
  {
    title: 'Pick a template',
    text: 'Every project is complete and tested, with real screenshots, its features and its known limitations.',
  },
  {
    title: 'Customize and download',
    text: 'Name it and choose the options that template supports. You get a ZIP with the code and your exact setup steps.',
  },
  {
    title: 'Run it and present it',
    text: 'Follow GETTING_STARTED.md, learn the architecture in the studio and practise the viva questions.',
  },
];

const LEARNING = [
  {
    title: 'Learning studio',
    text: 'Architecture explorer, a guided walkthrough of the important files, a checklist and troubleshooting for each project.',
    icon: <BookOpen aria-hidden="true" className="size-5" />,
    to: '/learn',
  },
  {
    title: 'Viva practice',
    text: 'Questions with model answers based on the code. Write your answer, compare it and rate yourself honestly.',
    icon: <MessageCircleQuestion aria-hidden="true" className="size-5" />,
    to: '/viva',
  },
  {
    title: 'Submission workspace',
    text: 'Report drafts built from the project’s real features and limitations, with CampusKit’s facts kept apart from your writing.',
    icon: <FileText aria-hidden="true" className="size-5" />,
    to: '/learn/report',
  },
  {
    title: 'Compare projects',
    text: 'Side-by-side facts and goal-based suggestions that follow written rules, not popularity.',
    icon: <Scale aria-hidden="true" className="size-5" />,
    to: '/compare',
  },
];

export function HomePage() {
  useDocumentTitle(null);
  const featured = catalog.filter((project) => project.featured);
  const verified = catalog.filter((project) => getTemplateStatus(project).id === 'verified').length;
  const facts = [
    `${verified} of ${catalog.length} templates verified end to end`,
    'Runs on your own computer, offline after installing',
    'No accounts, tracking or AI service',
  ];

  return (
    <>
      <section aria-labelledby="hero-title" className="border-b border-line">
        <div className="container-page grid items-center gap-12 py-14 md:py-20 lg:grid-cols-[minmax(0,1.08fr)_minmax(0,0.92fr)] lg:gap-16">
          <div>
            <p className="flex items-start gap-2.5 text-sm font-semibold text-ink-2">
              <span aria-hidden="true" className="mt-1.5 size-2 shrink-0 rounded-full bg-violet" />
              Free and open source for school and college students
            </p>
            <h1 id="hero-title" className="type-display mt-6 text-ink">
              <span className="block">Build it.</span> <span className="block">Understand it.</span>{' '}
              <span className="block">Present it.</span>
            </h1>
            <p className="type-lead mt-6 max-w-[52ch]">
              Pick a complete project, make it yours, download a ZIP that runs on your own computer,
              and walk into your viva knowing how it works.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <ButtonLink to="/projects" size="lg">
                Explore projects
              </ButtonLink>
              <ButtonLink to="/generate" size="lg" variant="secondary">
                Generate a project
              </ButtonLink>
            </div>
            <ul className="mt-8 grid gap-2 text-sm text-ink-2 sm:grid-cols-1">
              {facts.map((fact) => (
                <li key={fact} className="flex items-start gap-2">
                  <Check aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-violet" />
                  {fact}
                </li>
              ))}
            </ul>
            <SearchBox className="mt-8 max-w-xl" />
            <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
              <span className="text-ink-3">Search ideas:</span>
              {SEARCH_IDEAS.map((idea) => (
                <Link
                  key={idea}
                  to={`/projects?q=${encodeURIComponent(idea)}`}
                  className="rounded-md border border-line bg-surface px-2 py-0.5 text-ink-2 transition-colors hover:border-violet hover:text-violet"
                >
                  {idea}
                </Link>
              ))}
            </div>
          </div>
          <div className="grid-texture rounded-2xl border border-line p-3 sm:p-5">
            <HeroKit />
          </div>
        </div>
      </section>

      <section aria-labelledby="tour-title" className="container-page py-16 md:py-24">
        <div className="mb-8 max-w-2xl space-y-3">
          <p className="type-eyebrow text-violet">See it in action</p>
          <h2 id="tour-title" className="type-h2 text-ink">
            One place to choose, build, learn and present
          </h2>
        </div>
        <ProductTour />
      </section>

      <section aria-labelledby="how-title" className="border-y border-line bg-surface">
        <div className="container-page py-16">
          <h2 id="how-title" className="type-h2 text-ink">
            How it works
          </h2>
          <ol className="mt-10 grid gap-10 md:grid-cols-3 md:gap-8">
            {STEPS.map((step, index) => (
              <li key={step.title} className="relative md:pr-6">
                <span className="font-mono text-sm font-medium text-violet">0{index + 1}</span>
                <span aria-hidden="true" className="mt-3 block h-px bg-line-strong" />
                <h3 className="type-h3 mt-5 text-ink">{step.title}</h3>
                <p className="mt-2 max-w-[36ch] text-ink-2">{step.text}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section aria-labelledby="featured-title" className="container-page py-16 md:py-20">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="space-y-3">
            <p className="type-eyebrow text-violet">Start here</p>
            <h2 id="featured-title" className="type-h2 text-ink">
              Featured projects
            </h2>
          </div>
          <Link to="/projects" className="link inline-flex items-center gap-1.5 text-sm">
            See all {catalog.length} projects
            <ArrowRight aria-hidden="true" className="size-4" />
          </Link>
        </div>
        <ul className="mt-8 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {featured.map((project) => (
            <li key={project.id} className="flex">
              <ProjectCard project={project} className="w-full" />
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="learning-title" className="container-page py-8 md:py-12">
        <div className="grid gap-10 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] lg:gap-16">
          <div className="space-y-4">
            <p className="type-eyebrow text-violet">More than a download</p>
            <h2 id="learning-title" className="type-h2 text-ink">
              Learn the project well enough to explain it
            </h2>
            <p className="text-ink-2">
              Every template comes with tools for understanding it, practising your viva and writing
              your report. They use the project’s real code and documentation, and your progress
              stays in your browser.
            </p>
          </div>
          <ul className="divide-y divide-line border-y border-line">
            {LEARNING.map((item) => (
              <li key={item.title}>
                <Link
                  to={item.to}
                  className="group flex items-start gap-4 py-5 transition-colors hover:text-violet"
                >
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-violet-soft text-violet">
                    {item.icon}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="type-h3 block text-ink group-hover:text-violet">
                      {item.title}
                    </span>
                    <span className="mt-1 block text-sm text-ink-2">{item.text}</span>
                  </span>
                  <ArrowRight
                    aria-hidden="true"
                    className="mt-3 size-4 shrink-0 text-ink-3 transition-transform group-hover:translate-x-0.5 group-hover:text-violet motion-reduce:transition-none"
                  />
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section aria-labelledby="categories-title" className="container-page py-16 md:py-20">
        <h2 id="categories-title" className="type-h2 text-ink">
          Browse by category
        </h2>
        <ul className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {collections().map((collection) => (
            <li key={collection.title}>
              <Link
                to={collection.to}
                className={cn(
                  'group flex h-full items-start gap-3 rounded-xl border bg-surface p-4 transition-colors hover:border-violet',
                  collection.count === 0 ? 'border-dashed border-line-strong' : 'border-line',
                )}
              >
                <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-raised text-violet">
                  {collection.icon}
                </span>
                <span className="min-w-0">
                  <span className="block font-semibold text-ink group-hover:text-violet">
                    {collection.title}
                  </span>
                  <span className="mt-0.5 block text-sm text-ink-2">{collection.description}</span>
                  <span className="type-meta mt-2 block font-semibold">
                    {collection.count === 0
                      ? 'No projects yet'
                      : `${collection.count} ${collection.count === 1 ? 'project' : 'projects'}`}
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="contribute-title" className="container-page pb-16 md:pb-20">
        <div className="grid gap-10 rounded-2xl border border-line bg-surface p-6 md:p-10 lg:grid-cols-2 lg:items-center">
          <div className="space-y-4">
            <p className="type-eyebrow text-violet">Open source</p>
            <h2 id="contribute-title" className="type-h2 text-ink">
              Add the project you wish you’d had
            </h2>
            <p className="text-ink-2">
              CampusKit is open source under the MIT License. A template is a working project folder
              plus a manifest that describes it. Automated checks make sure every published template
              installs, customizes and explains itself.
            </p>
            <div className="flex flex-wrap gap-3">
              <ButtonLink to="/docs/adding-a-template">Read the template guide</ButtonLink>
              <ButtonLink to="/docs/contributing" variant="secondary">
                How to contribute
              </ButtonLink>
            </div>
            <p className="text-sm text-ink-3">
              Before you open a pull request, work through the{' '}
              <Link to="/docs/new-project-checklist" className="link">
                new project checklist
              </Link>
              .
            </p>
          </div>
          <CommandBlock
            label="Check your template before submitting it"
            commands={[
              'pnpm install',
              'pnpm validate:catalog',
              'pnpm test',
              'pnpm verify:generated',
            ]}
          />
        </div>
      </section>

      <section aria-labelledby="start-title" className="container-page">
        <div className="flex flex-col items-start justify-between gap-6 rounded-2xl bg-inverse px-6 py-10 text-on-inverse md:flex-row md:items-center md:px-10">
          <div className="max-w-xl space-y-2">
            <h2 id="start-title" className="type-h2">
              Ready when you are
            </h2>
            <p className="text-on-inverse/80">
              Every project runs on your own computer. Pick one, read how it works, and download it
              when it feels right.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link
              to="/projects"
              className="inline-flex h-12 items-center justify-center rounded-lg bg-on-inverse px-5 font-semibold text-inverse transition-colors hover:bg-white focus-visible:outline-on-inverse active:translate-y-px motion-reduce:active:translate-y-0"
            >
              Browse all projects
            </Link>
            <Link
              to="/generate"
              className="inline-flex h-12 items-center justify-center rounded-lg border border-on-inverse/40 px-5 font-semibold text-on-inverse transition-colors hover:border-on-inverse hover:bg-on-inverse/10 focus-visible:outline-on-inverse active:translate-y-px motion-reduce:active:translate-y-0"
            >
              Open the generator
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
