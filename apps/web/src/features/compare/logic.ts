/**
 * Project comparison and goal-based suggestions. Every suggestion comes from
 * a written rule over manifest data (shown to students next to the result)
 * and the template's verification status. There are no popularity numbers,
 * time estimates or success predictions.
 */
import {
  BACKEND_LABELS,
  DIFFICULTY_LABELS,
  DIFFICULTY_RANK,
  PERSISTENCE_LABELS,
  type BackendKind,
  type PersistenceKind,
  type ProjectManifest,
  type TemplateStatusId,
} from '@campuskit/project-catalog';

export const MAX_COMPARED = 3;

export interface GoalRule {
  /** The rule in plain words, shown next to every suggestion. */
  description: string;
  matches: (project: ProjectManifest, status: TemplateStatusId) => boolean;
}

export interface Goal {
  id: string;
  label: string;
  rule: GoalRule;
  /** Used only when nothing matches the rule, with a note saying so. */
  fallback?: GoalRule & { note: string };
}

export const GOALS: readonly Goal[] = [
  {
    id: 'first-project',
    label: 'My first programming project',
    rule: {
      description: 'Its difficulty is Beginner.',
      matches: (project) => project.difficulty === 'beginner',
    },
  },
  {
    id: 'frontend',
    label: 'A frontend development project',
    rule: {
      description: 'It is a web app in the Web development category.',
      matches: (project) =>
        project.category === 'web-development' && project.projectType === 'web-app',
    },
  },
  {
    id: 'python',
    label: 'A Python project',
    rule: {
      description: 'Python is one of its languages.',
      matches: (project) => project.languages.includes('Python'),
    },
  },
  {
    id: 'ai-ml',
    label: 'An AI or machine learning project',
    rule: {
      description: 'Its category is AI / ML.',
      matches: (project) => project.category === 'ai-ml',
    },
    fallback: {
      description: 'Its category is Data analysis.',
      matches: (project) => project.category === 'data-analysis',
      note: 'There is no AI or machine learning project yet. These projects analyse data, which machine learning projects also start with.',
    },
  },
  {
    id: 'database',
    label: 'A database-oriented project',
    rule: {
      description: 'It stores its data in a database.',
      matches: (project) => project.stack.persistence === 'database',
    },
    fallback: {
      description: 'It saves data between runs.',
      matches: (project) => project.stack.persistence !== 'none',
      note: 'No project uses a database yet. These projects save data between runs; their architecture notes describe how the data could be stored in database tables, which you could build as an extension.',
    },
  },
  {
    id: 'software-engineering',
    label: 'Demonstrating software engineering practice',
    rule: {
      description: 'It has automated tests and architecture notes, and its status is Verified.',
      matches: (project, status) =>
        project.testing.commands.length > 0 &&
        project.docs.some((doc) => doc.kind === 'architecture') &&
        status === 'verified',
    },
  },
];

export interface GoalResult {
  goal: Goal;
  projects: ProjectManifest[];
  /** The rule that produced `projects`. */
  rule: GoalRule;
  /** Set when the fallback rule was used because nothing matched. */
  note: string | null;
}

function byDifficultyThenName(a: ProjectManifest, b: ProjectManifest): number {
  return (
    DIFFICULTY_RANK[a.difficulty] - DIFFICULTY_RANK[b.difficulty] ||
    a.name.localeCompare(b.name, 'en')
  );
}

export function suggestForGoal(
  goal: Goal,
  projects: readonly ProjectManifest[],
  statusOf: (project: ProjectManifest) => TemplateStatusId,
): GoalResult {
  const matching = projects.filter((project) => goal.rule.matches(project, statusOf(project)));
  if (matching.length > 0 || !goal.fallback) {
    return { goal, projects: matching.sort(byDifficultyThenName), rule: goal.rule, note: null };
  }
  const fallback = goal.fallback;
  return {
    goal,
    projects: projects
      .filter((project) => fallback.matches(project, statusOf(project)))
      .sort(byDifficultyThenName),
    rule: fallback,
    note: fallback.note,
  };
}

/** Parses ?ids=a,b,c keeping known, unique ids, at most MAX_COMPARED. */
export function parseCompared(
  value: string | null,
  projects: readonly ProjectManifest[],
): string[] {
  const known = new Set(projects.map((project) => project.id));
  const ids: string[] = [];
  for (const id of (value ?? '').split(',')) {
    if (known.has(id) && !ids.includes(id) && ids.length < MAX_COMPARED) ids.push(id);
  }
  return ids;
}

function list(names: string[]): string {
  if (names.length <= 1) return names[0] ?? '';
  return `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;
}

/** A phrase about one project, and the same phrase for several. */
interface Phrase {
  one: string;
  many: string;
}

/**
 * One sentence about a property: stated once when every project shares it
 * (“Both run offline …”), otherwise per group (“A needs Node.js; B needs …”).
 */
function sentence(
  projects: readonly ProjectManifest[],
  describe: (project: ProjectManifest) => Phrase,
): string {
  const groups = new Map<string, { phrase: Phrase; names: string[] }>();
  for (const project of projects) {
    const phrase = describe(project);
    const group = groups.get(phrase.one) ?? { phrase, names: [] };
    group.names.push(project.name);
    groups.set(phrase.one, group);
  }
  const all = [...groups.values()];
  if (all.length === 1) {
    return `${projects.length === 2 ? 'Both' : 'All of them'} ${all[0]?.phrase.many ?? ''}.`;
  }
  return `${all
    .map(({ phrase, names }) => `${list(names)} ${names.length === 1 ? phrase.one : phrase.many}`)
    .join('; ')}.`;
}

const PERSISTENCE_PHRASES: Record<PersistenceKind, Phrase> = {
  'browser-storage': {
    one: 'saves its data in the browser (localStorage)',
    many: 'save their data in the browser (localStorage)',
  },
  files: {
    one: 'saves its data in files on your computer',
    many: 'save their data in files on your computer',
  },
  database: { one: 'saves its data in a database', many: 'save their data in a database' },
  none: { one: 'saves nothing between runs', many: 'save nothing between runs' },
};

const BACKEND_PHRASES: Record<BackendKind, Phrase> = {
  none: {
    one: 'runs entirely in the browser, with no server',
    many: 'run entirely in the browser, with no server',
  },
  'local-server': {
    one: 'runs a small server on your own computer',
    many: 'run a small server on your own computer',
  },
  'remote-server': { one: 'needs an online server', many: 'need an online server' },
};

function toolsPhrase(project: ProjectManifest): Phrase {
  const tools = list(
    project.prerequisites
      .filter((item) => item.version)
      .map((item) => `${item.name} ${item.version ?? ''}`.trim()),
  );
  return tools
    ? { one: `needs ${tools}`, many: `need ${tools}` }
    : { one: 'needs only a web browser', many: 'need only a web browser' };
}

function keysPhrase(project: ProjectManifest): Phrase {
  const keys = project.environment.variables.filter((variable) => variable.required).length;
  if (keys > 0) return { one: 'needs API keys or secrets', many: 'need API keys or secrets' };
  if (project.network.externalServices.length > 0)
    return { one: 'uses an external service', many: 'use external services' };
  return {
    one: 'needs no API keys, accounts or external services',
    many: 'need no API keys, accounts or external services',
  };
}

/**
 * Beginner-friendly sentences about how the selected projects differ, each
 * built from manifest fields. Facts the projects share are stated once.
 */
export function tradeOffs(projects: readonly ProjectManifest[]): string[] {
  if (projects.length < 2) return [];
  const sentences = [
    sentence(projects, (project) => {
      const level = DIFFICULTY_LABELS[project.difficulty].toLowerCase();
      return { one: `is ${level} level`, many: `are ${level} level` };
    }),
  ];
  const easiest = Math.min(...projects.map((project) => DIFFICULTY_RANK[project.difficulty]));
  const gentle = projects.filter((project) => DIFFICULTY_RANK[project.difficulty] === easiest);
  if (gentle.length < projects.length) {
    sentences.push(
      `For a first project, ${list(gentle.map((project) => project.name))} ${gentle.length === 1 ? 'is' : 'are'} the gentler start.`,
    );
  }
  sentences.push(
    sentence(projects, toolsPhrase),
    sentence(projects, (project) => BACKEND_PHRASES[project.stack.backend]),
    sentence(projects, (project) => PERSISTENCE_PHRASES[project.stack.persistence]),
    sentence(projects, (project) =>
      project.network.runsOffline
        ? { one: 'runs offline once installed', many: 'run offline once installed' }
        : {
            one: 'needs an internet connection to run',
            many: 'need an internet connection to run',
          },
    ),
    sentence(projects, keysPhrase),
  );
  return sentences;
}

/** The backend label used in the comparison table. */
export function backendLabel(project: ProjectManifest): string {
  return BACKEND_LABELS[project.stack.backend];
}

/** The storage label used in the comparison table. */
export function persistenceLabel(project: ProjectManifest): string {
  return PERSISTENCE_LABELS[project.stack.persistence];
}
