import {
  AUDIENCE_LABELS,
  catalog,
  DIFFICULTY_LABELS,
  PLATFORM_LABELS,
  type ProjectManifest,
} from '@campuskit/project-catalog';
import { useId, type ReactNode } from 'react';
import { Link, useSearchParams } from 'react-router';

import { PageHeader } from '../../components/layout/PageHeader.tsx';
import { StatusBadge } from '../../components/StatusBadge.tsx';
import { Button } from '../../components/ui/Button.tsx';
import { Callout } from '../../components/ui/Callout.tsx';
import { useDocumentTitle } from '../../hooks/useDocumentTitle.ts';
import { cn } from '../../lib/cn.ts';
import { getTemplateStatus } from '../../lib/verification.ts';
import {
  backendLabel,
  GOALS,
  MAX_COMPARED,
  parseCompared,
  persistenceLabel,
  suggestForGoal,
  tradeOffs,
} from './logic.ts';

interface Row {
  label: string;
  value: (project: ProjectManifest) => ReactNode;
}

const ROWS: Row[] = [
  { label: 'Difficulty', value: (project) => DIFFICULTY_LABELS[project.difficulty] },
  {
    label: 'For',
    value: (project) => project.audience.map((audience) => AUDIENCE_LABELS[audience]).join(', '),
  },
  { label: 'Languages', value: (project) => project.languages.join(', ') },
  { label: 'Frameworks and libraries', value: (project) => project.frameworks.join(', ') },
  {
    label: 'Install first',
    value: (project) =>
      project.prerequisites
        .map((item) => `${item.name}${item.version ? ` ${item.version}` : ''}`)
        .join('; '),
  },
  { label: 'Server', value: backendLabel },
  { label: 'Data', value: persistenceLabel },
  {
    label: 'Works offline',
    value: (project) =>
      project.network.runsOffline
        ? `Yes, after installing${project.network.installNeedsInternet ? ' (installing needs the internet)' : ''}`
        : 'No',
  },
  {
    label: 'External services and API keys',
    value: (project) => {
      const keys = project.environment.variables.filter((variable) => variable.required);
      const services = project.network.externalServices;
      if (keys.length === 0 && services.length === 0) return 'None';
      return [...services, ...keys.map((variable) => `${variable.name} (required)`)].join('; ');
    },
  },
  {
    label: 'You will learn to',
    value: (project) => (
      <ul className="list-disc space-y-1 pl-4">
        {project.learningObjectives.map((objective) => (
          <li key={objective}>{objective}</li>
        ))}
      </ul>
    ),
  },
  {
    label: 'Verification',
    value: (project) => {
      const status = getTemplateStatus(project);
      return (
        <span className="space-y-1">
          <StatusBadge project={project} />
          {status.current.length > 0 ? (
            <span className="block text-xs text-ink-3">
              Verified on{' '}
              {status.current.map((entry) => PLATFORM_LABELS[entry.platform]).join(', ')}
            </span>
          ) : null}
        </span>
      );
    },
  },
];

export function ComparePage() {
  useDocumentTitle('Compare projects');
  const [params, setParams] = useSearchParams();
  const selected = parseCompared(params.get('ids'), catalog);
  const goal = GOALS.find((item) => item.id === params.get('goal'));
  const projects = selected
    .map((id) => catalog.find((project) => project.id === id))
    .filter((project): project is ProjectManifest => Boolean(project));
  const goalResult = goal
    ? suggestForGoal(goal, catalog, (project) => getTemplateStatus(project).id)
    : null;
  const goalName = useId();

  function update(next: { ids?: string[]; goal?: string | null }) {
    const updated = new URLSearchParams(params);
    if (next.ids) {
      if (next.ids.length > 0) updated.set('ids', next.ids.join(','));
      else updated.delete('ids');
    }
    if (next.goal !== undefined) {
      if (next.goal) updated.set('goal', next.goal);
      else updated.delete('goal');
    }
    setParams(updated, { replace: true, flushSync: true });
  }

  function toggle(id: string, checked: boolean) {
    update({ ids: checked ? [...selected, id] : selected.filter((item) => item !== id) });
  }

  return (
    <>
      <PageHeader
        title="Compare projects"
        description="Choose a goal for suggestions, or pick two or three projects to compare side by side. Everything here comes from the projects’ own documentation and verification records."
      />
      <div className="container-page space-y-12">
        <section aria-labelledby="goal-heading" className="space-y-4">
          <h2 id="goal-heading" className="heading text-xl text-ink">
            What do you want from your project?
          </h2>
          <fieldset>
            <legend className="sr-only">Goal</legend>
            <div className="flex flex-wrap gap-2">
              {GOALS.map((item) => (
                <label
                  key={item.id}
                  className={cn(
                    'cursor-pointer rounded-lg border px-3 py-2 text-sm font-semibold',
                    'has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-focus',
                    goal?.id === item.id
                      ? 'border-violet bg-violet-soft text-violet'
                      : 'border-line-strong bg-surface text-ink-2 hover:border-ink-3',
                  )}
                >
                  <input
                    type="radio"
                    name={goalName}
                    value={item.id}
                    checked={goal?.id === item.id}
                    onChange={() => update({ goal: item.id })}
                    className="sr-only"
                  />
                  {item.label}
                </label>
              ))}
            </div>
          </fieldset>

          {goalResult ? (
            <div
              className="space-y-3 rounded-xl border border-line bg-surface p-5"
              aria-live="polite"
            >
              <p className="text-sm text-ink-3">
                Rule used:{' '}
                <span className="font-semibold text-ink-2">{goalResult.rule.description}</span>
              </p>
              {goalResult.note ? <Callout tone="info">{goalResult.note}</Callout> : null}
              {goalResult.projects.length === 0 ? (
                <p className="text-ink-2">
                  No project matches this goal yet. You could{' '}
                  <Link to="/docs/adding-a-template" className="link">
                    propose or contribute one
                  </Link>
                  .
                </p>
              ) : (
                <>
                  <ul className="grid gap-3 sm:grid-cols-2">
                    {goalResult.projects.map((project) => (
                      <li key={project.id} className="rounded-lg bg-raised p-4">
                        <Link
                          to={`/projects/${project.slug}`}
                          className="font-semibold text-ink hover:text-violet"
                        >
                          {project.name}
                        </Link>
                        <p className="mt-1 text-sm text-ink-2">{project.tagline}</p>
                      </li>
                    ))}
                  </ul>
                  {goalResult.projects.length >= 2 ? (
                    <Button
                      variant="secondary"
                      onClick={() =>
                        update({
                          ids: goalResult.projects
                            .slice(0, MAX_COMPARED)
                            .map((project) => project.id),
                        })
                      }
                    >
                      Compare{' '}
                      {goalResult.projects.length > MAX_COMPARED
                        ? `the first ${MAX_COMPARED}`
                        : 'these'}
                    </Button>
                  ) : null}
                </>
              )}
            </div>
          ) : (
            <p className="text-sm text-ink-3">
              Suggestions follow written rules over each project’s documentation. There are no
              popularity rankings or time estimates.
            </p>
          )}
        </section>

        <section aria-labelledby="pick-heading" className="space-y-4">
          <h2 id="pick-heading" className="heading text-xl text-ink">
            Compare side by side
          </h2>
          <fieldset>
            <legend className="text-sm text-ink-3">
              Choose two or three projects ({selected.length} of {MAX_COMPARED} chosen).
            </legend>
            <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {catalog.map((project) => {
                const checked = selected.includes(project.id);
                const disabled = !checked && selected.length >= MAX_COMPARED;
                return (
                  <label
                    key={project.id}
                    className={cn(
                      'flex items-start gap-3 rounded-xl border p-3',
                      'has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-focus',
                      checked ? 'border-violet bg-violet-soft' : 'border-line-strong bg-surface',
                      disabled ? 'opacity-60' : 'cursor-pointer',
                    )}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      disabled={disabled}
                      onChange={(event) => toggle(project.id, event.target.checked)}
                      className="mt-1 size-4 shrink-0 accent-violet"
                    />
                    <span className="min-w-0">
                      <span className="block font-semibold text-ink">{project.name}</span>
                      <span className="block text-sm text-ink-3">
                        {DIFFICULTY_LABELS[project.difficulty]} · {project.languages.join(', ')}
                      </span>
                    </span>
                  </label>
                );
              })}
            </div>
          </fieldset>

          {projects.length < 2 ? (
            <p className="rounded-xl border border-line bg-surface p-5 text-ink-2" role="status">
              Choose at least two projects to see the comparison.
            </p>
          ) : (
            <div className="space-y-6">
              <div>
                <h3 className="text-base font-bold text-ink">What differs</h3>
                <ul className="mt-2 list-disc space-y-1.5 pl-5 text-ink-2">
                  {tradeOffs(projects).map((sentence) => (
                    <li key={sentence}>{sentence}</li>
                  ))}
                </ul>
              </div>
              {/* The table scrolls sideways on small screens; the region makes it reachable by keyboard. */}
              <div
                role="region"
                aria-label="Project comparison"
                tabIndex={0}
                className="overflow-x-auto rounded-xl border border-line"
              >
                <table className="w-full min-w-[40rem] text-left text-sm">
                  <caption className="sr-only">Project comparison</caption>
                  <thead className="bg-raised text-ink">
                    <tr>
                      <td className="w-40 px-4 py-3" />
                      {projects.map((project) => (
                        <th key={project.id} scope="col" className="px-4 py-3 font-semibold">
                          <Link to={`/projects/${project.slug}`} className="link">
                            {project.name}
                          </Link>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line align-top text-ink-2">
                    {ROWS.map((row) => (
                      <tr key={row.label}>
                        <th scope="row" className="px-4 py-3 font-semibold text-ink">
                          {row.label}
                        </th>
                        {projects.map((project) => (
                          <td key={project.id} className="px-4 py-3">
                            {row.value(project)}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </section>
      </div>
    </>
  );
}
