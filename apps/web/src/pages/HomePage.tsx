import { catalog, CATEGORY_LABELS, getProjectById } from '@campuskit/project-catalog';
import { BrainCircuit, ChartColumn, Globe, Terminal } from 'lucide-react';
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
import { useDocumentTitle } from '../hooks/useDocumentTitle.ts';
import { cn } from '../lib/cn.ts';
import { formatIsoDate } from '../lib/format.ts';

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
    <div className="overflow-hidden rounded-[18px] border border-line bg-surface shadow-lift">
      <div className="space-y-4 border-b border-line p-5">
        <fieldset>
          <legend className="mb-2 text-sm font-semibold text-ink">Template</legend>
          <div className="flex flex-wrap gap-2">
            {catalog.map((project) => (
              <label
                key={project.id}
                className={cn(
                  'cursor-pointer rounded-md border px-2.5 py-1 text-sm font-medium',
                  'has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-focus',
                  project.id === manifest.id
                    ? 'border-violet bg-violet-soft text-violet'
                    : 'border-line-strong text-ink-2 hover:border-ink-3',
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
        <p className="max-w-[26ch] text-xs text-ink-3">
          The real template engine, escaping your name for each file type.
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
      title: 'AI and machine learning',
      description:
        ai === 0
          ? 'No templates yet. Contribute the first one.'
          : 'Models you can train, run and explain.',
      icon: <BrainCircuit aria-hidden="true" className="size-5" />,
      count: ai,
      to: ai === 0 ? '/docs/adding-a-template' : '/projects?category=ai-ml',
    },
    {
      title: 'Data analysis',
      description: 'Clean, analyse and explain real datasets.',
      icon: <ChartColumn aria-hidden="true" className="size-5" />,
      count: count({ category: ['data-analysis'] }),
      to: '/projects?category=data-analysis',
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
    text: 'Follow GETTING_STARTED.md, read the architecture notes and practise the viva questions that come with it.',
  },
];

export function HomePage() {
  useDocumentTitle(null);
  const featured = catalog.filter((project) => project.featured);
  const recent = [...catalog]
    .sort((a, b) => b.addedOn.localeCompare(a.addedOn) || a.name.localeCompare(b.name))
    .slice(0, 6);

  return (
    <>
      <section aria-labelledby="hero-title" className="border-b border-line">
        <div className="container-page grid items-center gap-12 py-14 md:py-20 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
          <div>
            <h1
              id="hero-title"
              className="display text-[2.2rem] text-ink min-[400px]:text-[2.6rem] sm:text-6xl lg:text-[4.1rem]"
            >
              <span className="block">Build it.</span> <span className="block">Understand it.</span>{' '}
              <span className="block">Present it.</span>
            </h1>
            <p className="mt-6 max-w-[54ch] text-lg text-ink-2">
              Free, open-source project templates for school and college students. Pick one, make it
              yours, download a ZIP that runs on your own computer, and walk into your viva knowing
              how it works.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <ButtonLink to="/generate" size="lg">
                Generate a project
              </ButtonLink>
              <ButtonLink to="/projects" size="lg" variant="secondary">
                Explore projects
              </ButtonLink>
            </div>
            <SearchBox className="mt-10 max-w-xl" />
            <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
              <span className="text-ink-3">Search ideas:</span>
              {SEARCH_IDEAS.map((idea) => (
                <Link
                  key={idea}
                  to={`/projects?q=${encodeURIComponent(idea)}`}
                  className="rounded-md border border-line px-2 py-0.5 text-ink-2 hover:border-violet hover:text-violet"
                >
                  {idea}
                </Link>
              ))}
            </div>
          </div>
          <div className="grid-texture rounded-[22px] border border-line p-3 sm:p-5">
            <HeroKit />
          </div>
        </div>
      </section>

      <section aria-labelledby="how-title" className="container-page py-16">
        <h2 id="how-title" className="heading text-3xl text-ink">
          How it works
        </h2>
        <div className="relative mt-8">
          <span
            aria-hidden="true"
            className="absolute top-5 right-[16%] left-[16%] hidden h-0.5 bg-line-strong md:block"
          />
          <ol className="relative grid gap-8 md:grid-cols-3">
            {STEPS.map((step, index) => (
              <li key={step.title} className="relative">
                <span className="relative z-10 flex size-10 items-center justify-center rounded-full border-2 border-violet bg-canvas font-mono text-sm font-medium text-violet">
                  {index + 1}
                </span>
                <h3 className="mt-4 text-lg font-bold text-ink">{step.title}</h3>
                <p className="mt-1.5 max-w-[34ch] text-ink-2">{step.text}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section aria-labelledby="featured-title" className="container-page py-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <h2 id="featured-title" className="heading text-3xl text-ink">
            Featured projects
          </h2>
          <Link to="/projects" className="link text-sm">
            See all {catalog.length} projects
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

      <section aria-labelledby="categories-title" className="container-page py-16">
        <h2 id="categories-title" className="heading text-3xl text-ink">
          Browse by category
        </h2>
        <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {collections().map((collection) => (
            <li key={collection.title}>
              <Link
                to={collection.to}
                className={cn(
                  'flex h-full flex-col gap-3 rounded-xl border bg-surface p-5 transition-colors hover:border-violet',
                  collection.count === 0 ? 'border-dashed border-line-strong' : 'border-line',
                )}
              >
                <span className="flex size-10 items-center justify-center rounded-lg bg-violet-soft text-violet">
                  {collection.icon}
                </span>
                <span className="text-lg font-bold text-ink">{collection.title}</span>
                <span className="text-sm text-ink-2">{collection.description}</span>
                <span className="mt-auto text-sm font-semibold text-ink-3">
                  {collection.count === 0
                    ? 'No projects yet'
                    : `${collection.count} ${collection.count === 1 ? 'project' : 'projects'}`}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="recent-title" className="container-page py-8">
        <h2 id="recent-title" className="heading text-3xl text-ink">
          Recently added
        </h2>
        <div
          role="region"
          aria-label="Projects by date added"
          tabIndex={0}
          className="mt-6 overflow-x-auto rounded-xl border border-line bg-surface"
        >
          <table className="w-full min-w-[34rem] text-left text-sm">
            <caption className="sr-only">Projects by date added</caption>
            <thead className="border-b border-line text-ink-3">
              <tr>
                <th scope="col" className="px-5 py-3 font-semibold">
                  Added
                </th>
                <th scope="col" className="px-5 py-3 font-semibold">
                  Project
                </th>
                <th scope="col" className="px-5 py-3 font-semibold">
                  Category
                </th>
                <th scope="col" className="px-5 py-3 font-semibold">
                  Version
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {recent.map((project) => (
                <tr key={project.id}>
                  <td className="px-5 py-3 whitespace-nowrap text-ink-3">
                    {formatIsoDate(project.addedOn)}
                  </td>
                  <td className="px-5 py-3">
                    <Link
                      to={`/projects/${project.slug}`}
                      className="font-semibold text-ink hover:text-violet hover:underline"
                    >
                      {project.name}
                    </Link>
                  </td>
                  <td className="px-5 py-3 text-ink-2">{CATEGORY_LABELS[project.category]}</td>
                  <td className="px-5 py-3 font-mono text-xs text-ink-2">{project.version}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section aria-labelledby="contribute-title" className="container-page py-16">
        <div className="grid gap-10 rounded-[22px] border border-line bg-surface p-6 shadow-card md:p-10 lg:grid-cols-2 lg:items-center">
          <div className="space-y-4">
            <h2 id="contribute-title" className="heading text-3xl text-ink">
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
    </>
  );
}
