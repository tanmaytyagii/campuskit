import {
  AUDIENCE_LABELS,
  DIFFICULTY_LABELS,
  DIFFICULTY_RANK,
  type ProjectManifest,
} from '@campuskit/project-catalog';
import { Compass } from 'lucide-react';
import { Link } from 'react-router';

import { StatusBadge } from '../../components/StatusBadge.tsx';

const TIPS = [
  {
    title: 'Your experience',
    text: 'New to programming? Start with a beginner project and read its architecture notes before changing anything. Intermediate projects add charts, data processing or more screens.',
  },
  {
    title: 'Your time',
    text: 'CampusKit gives no time estimates, because they depend on you. Compare the number of setup steps and features below, and leave time to understand the code and write your report.',
  },
  {
    title: 'Technologies',
    text: 'Pick a language your course uses or that you want to learn. The search box finds projects by language, framework or topic.',
  },
  {
    title: 'Servers and API keys',
    text: 'Every project listed here runs on your own computer. The table shows whether one needs the internet to run, an external service or an API key.',
  },
];

function requiredVariables(project: ProjectManifest): string {
  const names = project.environment.variables
    .filter((variable) => variable.required)
    .map((variable) => variable.name);
  return names.length === 0 ? 'None' : names.join(', ');
}

/** A short guide to choosing a project, with a comparison built only from manifest data. */
export function ChooseGuide({ projects }: { projects: readonly ProjectManifest[] }) {
  const rows = [...projects].sort(
    (a, b) =>
      DIFFICULTY_RANK[a.difficulty] - DIFFICULTY_RANK[b.difficulty] ||
      a.name.localeCompare(b.name, 'en'),
  );
  return (
    <details className="group rounded-xl border border-line bg-surface">
      <summary className="flex cursor-pointer items-center gap-2 px-4 py-3 font-semibold text-ink">
        <Compass aria-hidden="true" className="size-4 text-violet" />
        Not sure which project to choose?
      </summary>
      <div className="space-y-5 border-t border-line p-4">
        <ul className="grid gap-4 sm:grid-cols-2">
          {TIPS.map((tip) => (
            <li key={tip.title} className="text-sm">
              <p className="font-semibold text-ink">{tip.title}</p>
              <p className="mt-1 text-ink-2">{tip.text}</p>
            </li>
          ))}
        </ul>
        {/* The table scrolls sideways on small screens; the region makes it reachable by keyboard. */}
        <div
          role="region"
          aria-label="Compare projects"
          tabIndex={0}
          className="overflow-x-auto rounded-lg border border-line"
        >
          <table className="w-full min-w-[46rem] text-left text-sm">
            <caption className="sr-only">Compare projects</caption>
            <thead className="bg-raised text-ink">
              <tr>
                <th scope="col" className="px-3 py-2 font-semibold">
                  Project
                </th>
                <th scope="col" className="px-3 py-2 font-semibold">
                  Level
                </th>
                <th scope="col" className="px-3 py-2 font-semibold">
                  Install first
                </th>
                <th scope="col" className="px-3 py-2 font-semibold">
                  Setup steps
                </th>
                <th scope="col" className="px-3 py-2 font-semibold">
                  Features
                </th>
                <th scope="col" className="px-3 py-2 font-semibold">
                  Runs offline
                </th>
                <th scope="col" className="px-3 py-2 font-semibold">
                  API keys
                </th>
                <th scope="col" className="px-3 py-2 font-semibold">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line text-ink-2">
              {rows.map((project) => (
                <tr key={project.id}>
                  <th scope="row" className="px-3 py-2 font-semibold text-ink">
                    <Link to={`/projects/${project.slug}`} className="link">
                      {project.name}
                    </Link>
                  </th>
                  <td className="px-3 py-2">
                    {DIFFICULTY_LABELS[project.difficulty]}
                    <span className="block text-xs text-ink-3">
                      {project.audience.map((value) => AUDIENCE_LABELS[value]).join(', ')}
                    </span>
                  </td>
                  <td className="px-3 py-2">
                    {project.prerequisites.map((item) => item.name).join(', ')}
                  </td>
                  <td className="px-3 py-2">{project.setup.steps.length + 1}</td>
                  <td className="px-3 py-2">{project.features.length}</td>
                  <td className="px-3 py-2">{project.network.runsOffline ? 'Yes' : 'No'}</td>
                  <td className="px-3 py-2">{requiredVariables(project)}</td>
                  <td className="px-3 py-2">
                    <StatusBadge project={project} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </details>
  );
}
