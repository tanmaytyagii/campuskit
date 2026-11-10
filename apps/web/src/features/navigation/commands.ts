/**
 * What the command palette can do, and how a query finds it. Plain data and functions, so the
 * matching rules are tested on their own: every word typed must appear in the command's label
 * or keywords, and matches in the label come first.
 */
import { catalog, CATEGORY_LABELS } from '@campuskit/project-catalog';

import type { ThemePreference } from '../../hooks/useTheme.tsx';
import type { RecentPage } from '../../lib/recent.ts';
import { REPO_DOCS } from '../../lib/repo-docs.ts';
import { STATUS_LABELS, type WorkspaceState } from '../../lib/workspace.ts';

export const GROUPS = [
  'Recent',
  'Actions',
  'Pages',
  'Your projects',
  'Templates',
  'Documentation',
] as const;
export type CommandGroup = (typeof GROUPS)[number];

export type CommandRun =
  | { kind: 'navigate'; to: string }
  | { kind: 'theme'; theme: ThemePreference }
  | { kind: 'shortcuts' };

export interface Command {
  id: string;
  group: CommandGroup;
  label: string;
  /** Other words that find it: synonyms, languages, tags. */
  keywords: string;
  /** Shown beside the label, such as a project's status. */
  hint?: string;
  run: CommandRun;
}

export const PAGES: ReadonlyArray<{ label: string; to: string; keywords: string }> = [
  { label: 'Dashboard', to: '/dashboard', keywords: 'overview home progress deadlines activity' },
  { label: 'Home', to: '/', keywords: 'start welcome' },
  { label: 'Project gallery', to: '/projects', keywords: 'templates browse catalog' },
  { label: 'Interactive demos', to: '/demos', keywords: 'try demo studio' },
  { label: 'Project generator', to: '/generate', keywords: 'download zip customize create' },
  { label: 'Learning center', to: '/learn', keywords: 'study guides understand' },
  { label: 'My projects', to: '/my-projects', keywords: 'workspace backup restore progress' },
  { label: 'Viva practice', to: '/viva', keywords: 'questions oral exam interview revise' },
  {
    label: 'Viva progress',
    to: '/viva/progress',
    keywords: 'statistics weak topics revision report history',
  },
  { label: 'Submission workspace', to: '/learn/report', keywords: 'report docx pdf write' },
  { label: 'Compare projects', to: '/compare', keywords: 'side by side choose' },
  { label: 'Settings', to: '/settings', keywords: 'profile preferences language theme' },
  { label: 'AI assistant', to: '/assistant', keywords: 'claude ai explain help optional' },
  { label: 'Documentation', to: '/docs', keywords: 'docs help guides' },
];

export function buildCommands({
  workspace,
  recent,
  currentPath,
}: {
  workspace: WorkspaceState;
  recent: readonly RecentPage[];
  currentPath: string;
}): Command[] {
  const commands: Command[] = [];
  for (const page of recent) {
    if (page.path === currentPath) continue;
    commands.push({
      id: `recent:${page.path}`,
      group: 'Recent',
      label: page.title,
      keywords: page.path,
      run: { kind: 'navigate', to: page.path },
    });
  }
  commands.push(
    {
      id: 'action:new-project',
      group: 'Actions',
      label: 'New project',
      keywords: 'create add start workspace',
      run: { kind: 'navigate', to: '/my-projects?new=1' },
    },
    {
      id: 'action:theme-light',
      group: 'Actions',
      label: 'Use the light theme',
      keywords: 'colour color appearance mode',
      run: { kind: 'theme', theme: 'light' },
    },
    {
      id: 'action:theme-dark',
      group: 'Actions',
      label: 'Use the dark theme',
      keywords: 'colour color appearance mode night',
      run: { kind: 'theme', theme: 'dark' },
    },
    {
      id: 'action:theme-system',
      group: 'Actions',
      label: 'Use the system theme',
      keywords: 'colour color appearance mode automatic',
      run: { kind: 'theme', theme: 'system' },
    },
    {
      id: 'action:shortcuts',
      group: 'Actions',
      label: 'Keyboard shortcuts',
      keywords: 'keys help hotkeys',
      run: { kind: 'shortcuts' },
    },
  );
  for (const page of PAGES)
    commands.push({
      id: `page:${page.to}`,
      group: 'Pages',
      label: page.label,
      keywords: page.keywords,
      run: { kind: 'navigate', to: page.to },
    });
  for (const project of workspace.projects) {
    if (project.archivedAt) continue;
    commands.push({
      id: `workspace:${project.id}`,
      group: 'Your projects',
      label: project.title,
      keywords: [...project.tags, ...project.stack, project.description].join(' '),
      hint: STATUS_LABELS[project.status],
      run: { kind: 'navigate', to: `/my-projects/${project.id}` },
    });
  }
  for (const project of catalog) {
    const keywords = [
      ...project.languages,
      ...project.frameworks,
      CATEGORY_LABELS[project.category],
      project.tagline,
    ].join(' ');
    const base = `/projects/${project.slug}`;
    commands.push(
      {
        id: `template:${project.id}`,
        group: 'Templates',
        label: project.name,
        keywords,
        hint: 'Template',
        run: { kind: 'navigate', to: base },
      },
      {
        id: `template:${project.id}:demo`,
        group: 'Templates',
        label: `${project.name}: interactive demo`,
        keywords: `${keywords} try`,
        run: { kind: 'navigate', to: `${base}/demo` },
      },
      {
        id: `template:${project.id}:learn`,
        group: 'Templates',
        label: `${project.name}: learning studio`,
        keywords: `${keywords} architecture code walkthrough checklist`,
        run: { kind: 'navigate', to: `${base}/learn` },
      },
      {
        id: `template:${project.id}:viva`,
        group: 'Templates',
        label: `${project.name}: viva practice`,
        keywords: `${keywords} questions`,
        run: { kind: 'navigate', to: `${base}/viva` },
      },
    );
  }
  for (const doc of REPO_DOCS)
    commands.push({
      id: `doc:${doc.slug}`,
      group: 'Documentation',
      label: doc.title,
      keywords: doc.description,
      run: { kind: 'navigate', to: `/docs/${doc.slug}` },
    });
  return commands;
}

/** How many commands each group shows before anything is typed. */
const BROWSE_LIMITS: Partial<Record<CommandGroup, number>> = {
  Recent: 5,
  'Your projects': 5,
};
export const MAX_RESULTS = 40;

const normalize = (text: string) =>
  text
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '');

/**
 * The commands that match a query, best first. With no query: recent pages, actions, pages and
 * a few of the student's projects. Otherwise every word must appear in the label or keywords;
 * a label that starts with the query ranks first, then one that contains it, then one that
 * contains every word, then keyword-only matches.
 */
export function rankCommands(commands: readonly Command[], query: string): Command[] {
  const text = normalize(query.trim());
  if (!text) {
    const counts = new Map<CommandGroup, number>();
    return commands.filter((command) => {
      if (command.group === 'Templates' || command.group === 'Documentation') return false;
      const count = (counts.get(command.group) ?? 0) + 1;
      counts.set(command.group, count);
      return count <= (BROWSE_LIMITS[command.group] ?? Infinity);
    });
  }
  const words = text.split(/\s+/);
  const scored: Array<{ command: Command; score: number; index: number }> = [];
  commands.forEach((command, index) => {
    const label = normalize(command.label);
    const all = `${label} ${normalize(command.keywords)}`;
    if (!words.every((word) => all.includes(word))) return;
    const score = label.startsWith(text)
      ? 0
      : label.includes(text)
        ? 1
        : words.every((word) => label.includes(word))
          ? 2
          : 3;
    scored.push({ command, score, index });
  });
  // A recent page is also listed under its own group, so it appears once, in its better place.
  const seen = new Set<string>();
  return scored
    .sort(
      (a, b) =>
        a.score - b.score ||
        GROUPS.indexOf(a.command.group) - GROUPS.indexOf(b.command.group) ||
        a.index - b.index,
    )
    .filter(({ command }) => {
      const target = command.run.kind === 'navigate' ? command.run.to : command.id;
      if (seen.has(target)) return false;
      seen.add(target);
      return true;
    })
    .slice(0, MAX_RESULTS)
    .map(({ command }) => command);
}
