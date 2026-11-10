/**
 * The student's own projects: a title, description, status, tags, stack, notes, milestones,
 * resources and an activity timeline, saved in this browser only under campuskit:workspace:v1.
 *
 * Every value is checked when it is read. A project that can't be read is never dropped: it is
 * kept under campuskit:workspace-recovery:v1, and the workspace offers it for download, so a
 * hand-edited or damaged entry costs nothing. The operations are pure functions (state in, new
 * state out) that also record what happened in the project's timeline.
 */
import { readStored, writeStored } from './storage.ts';

export const WORKSPACE_KEY = 'campuskit:workspace:v1';
export const RECOVERY_KEY = 'campuskit:workspace-recovery:v1';

export const STATUSES = ['planning', 'in-progress', 'review', 'done'] as const;
export type ProjectStatus = (typeof STATUSES)[number];
export const STATUS_LABELS: Record<ProjectStatus, string> = {
  planning: 'Planning',
  'in-progress': 'In progress',
  review: 'Reviewing',
  done: 'Done',
};

export const CATEGORIES = ['web', 'mobile', 'data', 'ai-ml', 'cs-lab', 'other'] as const;
export type ProjectCategory = (typeof CATEGORIES)[number];
export const CATEGORY_LABELS: Record<ProjectCategory, string> = {
  web: 'Web development',
  mobile: 'Mobile app',
  data: 'Data analysis',
  'ai-ml': 'AI and machine learning',
  'cs-lab': 'Computer science lab',
  other: 'Other',
};

/** Limits that keep one project comfortably inside browser storage. */
export const LIMITS = {
  title: 120,
  description: 2000,
  notes: 20_000,
  tag: 30,
  tags: 12,
  stack: 15,
  milestones: 50,
  resources: 30,
  activity: 100,
  projects: 200,
} as const;

export interface Milestone {
  id: string;
  title: string;
  /** YYYY-MM-DD, or null when there is no deadline. */
  due: string | null;
  done: boolean;
}

export interface Resource {
  id: string;
  title: string;
  /** http or https only. */
  url: string;
}

export interface ActivityEntry {
  /** ISO date and time. */
  at: string;
  text: string;
}

export interface WorkspaceProject {
  id: string;
  title: string;
  description: string;
  category: ProjectCategory;
  status: ProjectStatus;
  tags: string[];
  stack: string[];
  /** The CampusKit template it started from, linking its learning guide and viva questions. */
  templateId: string | null;
  favorite: boolean;
  pinned: boolean;
  notes: string;
  milestones: Milestone[];
  resources: Resource[];
  activity: ActivityEntry[];
  createdAt: string;
  updatedAt: string;
  /** When it was archived; archived projects can be restored or deleted. */
  archivedAt: string | null;
}

export interface WorkspaceState {
  version: 1;
  projects: WorkspaceProject[];
}

export const EMPTY_WORKSPACE: WorkspaceState = { version: 1, projects: [] };

// ---------------------------------------------------------------------------
// Checking stored values
// ---------------------------------------------------------------------------

const DAY = /^\d{4}-\d{2}-\d{2}$/;
const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);
const isText = (value: unknown, max: number): value is string =>
  typeof value === 'string' && value.length <= max;
const isTime = (value: unknown): value is string =>
  typeof value === 'string' && !Number.isNaN(Date.parse(value));
const isId = (value: unknown): value is string =>
  typeof value === 'string' && /^[A-Za-z0-9-]{1,64}$/.test(value);

export function isSafeUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'https:' || parsed.protocol === 'http:';
  } catch {
    return false;
  }
}

function isMilestone(value: unknown): value is Milestone {
  return (
    isRecord(value) &&
    isId(value.id) &&
    isText(value.title, LIMITS.title) &&
    value.title.trim() !== '' &&
    (value.due === null || (typeof value.due === 'string' && DAY.test(value.due))) &&
    typeof value.done === 'boolean'
  );
}

function isResource(value: unknown): value is Resource {
  return (
    isRecord(value) &&
    isId(value.id) &&
    isText(value.title, LIMITS.title) &&
    typeof value.url === 'string' &&
    value.url.length <= 2000 &&
    isSafeUrl(value.url)
  );
}

const isList = <T>(
  value: unknown,
  max: number,
  item: (entry: unknown) => entry is T,
): value is T[] => Array.isArray(value) && value.length <= max && value.every(item);

export function isWorkspaceProject(value: unknown): value is WorkspaceProject {
  return (
    isRecord(value) &&
    isId(value.id) &&
    isText(value.title, LIMITS.title) &&
    value.title.trim() !== '' &&
    isText(value.description, LIMITS.description) &&
    (CATEGORIES as readonly unknown[]).includes(value.category) &&
    (STATUSES as readonly unknown[]).includes(value.status) &&
    isList(value.tags, LIMITS.tags, (tag): tag is string => isText(tag, LIMITS.tag)) &&
    isList(value.stack, LIMITS.stack, (item): item is string => isText(item, LIMITS.tag)) &&
    (value.templateId === null || isText(value.templateId, 100)) &&
    typeof value.favorite === 'boolean' &&
    typeof value.pinned === 'boolean' &&
    isText(value.notes, LIMITS.notes) &&
    isList(value.milestones, LIMITS.milestones, isMilestone) &&
    isList(value.resources, LIMITS.resources, isResource) &&
    isList(
      value.activity,
      LIMITS.activity,
      (entry): entry is ActivityEntry =>
        isRecord(entry) && isTime(entry.at) && isText(entry.text, 300),
    ) &&
    isTime(value.createdAt) &&
    isTime(value.updatedAt) &&
    (value.archivedAt === null || isTime(value.archivedAt))
  );
}

export interface ReadResult {
  state: WorkspaceState;
  /** Values that couldn't be read, exactly as they were stored. */
  unreadable: unknown[];
}

/** The stored workspace, with anything unreadable separated out instead of dropped. */
export function parseWorkspace(value: unknown): ReadResult {
  if (value === null || value === undefined) return { state: EMPTY_WORKSPACE, unreadable: [] };
  if (!isRecord(value) || value.version !== 1 || !Array.isArray(value.projects))
    return { state: EMPTY_WORKSPACE, unreadable: [value] };
  const projects: WorkspaceProject[] = [];
  const unreadable: unknown[] = [];
  const seen = new Set<string>();
  for (const entry of value.projects) {
    if (isWorkspaceProject(entry) && !seen.has(entry.id)) {
      seen.add(entry.id);
      projects.push(entry);
    } else unreadable.push(entry);
  }
  return { state: { version: 1, projects }, unreadable };
}

// ---------------------------------------------------------------------------
// Operations
// ---------------------------------------------------------------------------

export function newId(): string {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

/** Tags in a consistent form: trimmed, lower case, inner spaces collapsed, no duplicates. */
export function normalizeTags(values: readonly string[], max: number = LIMITS.tags): string[] {
  const tags: string[] = [];
  for (const raw of values) {
    const tag = raw.trim().toLowerCase().replace(/\s+/g, ' ').slice(0, LIMITS.tag);
    if (tag && !tags.includes(tag)) tags.push(tag);
  }
  return tags.slice(0, max);
}

/** The stack keeps the student's own spelling (React, scikit-learn), without duplicates. */
export function normalizeStack(values: readonly string[]): string[] {
  const stack: string[] = [];
  for (const raw of values) {
    const item = raw.trim().replace(/\s+/g, ' ').slice(0, LIMITS.tag);
    if (item && !stack.some((existing) => existing.toLowerCase() === item.toLowerCase()))
      stack.push(item);
  }
  return stack.slice(0, LIMITS.stack);
}

export interface ProjectDetails {
  title: string;
  description: string;
  category: ProjectCategory;
  status: ProjectStatus;
  tags: string[];
  stack: string[];
  templateId: string | null;
}

/** Problems with the details a student typed, by field. */
export function validateDetails(
  details: ProjectDetails,
): Partial<Record<keyof ProjectDetails, string>> {
  const errors: Partial<Record<keyof ProjectDetails, string>> = {};
  const title = details.title.trim();
  if (!title) errors.title = 'Enter a title for the project.';
  else if (title.length > LIMITS.title)
    errors.title = `Keep the title to ${LIMITS.title} characters.`;
  if (details.description.length > LIMITS.description)
    errors.description = `Keep the description to ${LIMITS.description} characters.`;
  return errors;
}

function withActivity(project: WorkspaceProject, text: string, now: string): WorkspaceProject {
  return {
    ...project,
    updatedAt: now,
    activity: [{ at: now, text }, ...project.activity].slice(0, LIMITS.activity),
  };
}

function replace(state: WorkspaceState, project: WorkspaceProject): WorkspaceState {
  return {
    version: 1,
    projects: state.projects.map((item) => (item.id === project.id ? project : item)),
  };
}

export function findProject(state: WorkspaceState, id: string): WorkspaceProject | undefined {
  return state.projects.find((project) => project.id === id);
}

export class WorkspaceFullError extends Error {
  constructor() {
    super(`The workspace holds up to ${LIMITS.projects} projects. Archive and delete some first.`);
  }
}

export function createProject(
  state: WorkspaceState,
  details: ProjectDetails,
  now: string,
  id: string = newId(),
): { state: WorkspaceState; project: WorkspaceProject } {
  if (state.projects.length >= LIMITS.projects) throw new WorkspaceFullError();
  const project: WorkspaceProject = {
    id,
    title: details.title.trim(),
    description: details.description.trim(),
    category: details.category,
    status: details.status,
    tags: normalizeTags(details.tags),
    stack: normalizeStack(details.stack),
    templateId: details.templateId,
    favorite: false,
    pinned: false,
    notes: '',
    milestones: [],
    resources: [],
    activity: [{ at: now, text: 'Project created' }],
    createdAt: now,
    updatedAt: now,
    archivedAt: null,
  };
  return { state: { version: 1, projects: [project, ...state.projects] }, project };
}

export function updateDetails(
  state: WorkspaceState,
  id: string,
  details: ProjectDetails,
  now: string,
): WorkspaceState {
  const project = findProject(state, id);
  if (!project) return state;
  const changes: string[] = [];
  if (project.status !== details.status)
    changes.push(`Status changed to ${STATUS_LABELS[details.status]}`);
  const next = {
    ...project,
    title: details.title.trim(),
    description: details.description.trim(),
    category: details.category,
    status: details.status,
    tags: normalizeTags(details.tags),
    stack: normalizeStack(details.stack),
    templateId: details.templateId,
  };
  return replace(state, withActivity(next, changes[0] ?? 'Details edited', now));
}

export function setStatus(
  state: WorkspaceState,
  id: string,
  status: ProjectStatus,
  now: string,
): WorkspaceState {
  const project = findProject(state, id);
  if (!project || project.status === status) return state;
  return replace(
    state,
    withActivity({ ...project, status }, `Status changed to ${STATUS_LABELS[status]}`, now),
  );
}

/** Favourite and pinned are preferences, not work, so they don't change the timeline. */
export function toggleFlag(
  state: WorkspaceState,
  id: string,
  flag: 'favorite' | 'pinned',
): WorkspaceState {
  const project = findProject(state, id);
  return project ? replace(state, { ...project, [flag]: !project[flag] }) : state;
}

export function setNotes(
  state: WorkspaceState,
  id: string,
  notes: string,
  now: string,
): WorkspaceState {
  const project = findProject(state, id);
  if (!project || project.notes === notes) return state;
  // Typing doesn't flood the timeline: one entry per hour of note editing.
  const last = project.activity[0];
  const recent =
    last?.text === 'Notes edited' && Date.parse(now) - Date.parse(last.at) < 60 * 60 * 1000;
  const next = { ...project, notes: notes.slice(0, LIMITS.notes) };
  return replace(
    state,
    recent ? { ...next, updatedAt: now } : withActivity(next, 'Notes edited', now),
  );
}

export function addMilestone(
  state: WorkspaceState,
  id: string,
  milestone: { title: string; due: string | null },
  now: string,
): WorkspaceState {
  const project = findProject(state, id);
  const title = milestone.title.trim().slice(0, LIMITS.title);
  if (!project || !title || project.milestones.length >= LIMITS.milestones) return state;
  const next = {
    ...project,
    milestones: [...project.milestones, { id: newId(), title, due: milestone.due, done: false }],
  };
  return replace(state, withActivity(next, `Milestone “${title}” added`, now));
}

export function toggleMilestone(
  state: WorkspaceState,
  id: string,
  milestoneId: string,
  now: string,
): WorkspaceState {
  const project = findProject(state, id);
  const milestone = project?.milestones.find((item) => item.id === milestoneId);
  if (!project || !milestone) return state;
  const next = {
    ...project,
    milestones: project.milestones.map((item) =>
      item.id === milestoneId ? { ...item, done: !item.done } : item,
    ),
  };
  return replace(
    state,
    withActivity(
      next,
      milestone.done
        ? `Milestone “${milestone.title}” reopened`
        : `Milestone “${milestone.title}” completed`,
      now,
    ),
  );
}

export function removeMilestone(
  state: WorkspaceState,
  id: string,
  milestoneId: string,
  now: string,
): WorkspaceState {
  const project = findProject(state, id);
  const milestone = project?.milestones.find((item) => item.id === milestoneId);
  if (!project || !milestone) return state;
  const next = {
    ...project,
    milestones: project.milestones.filter((item) => item.id !== milestoneId),
  };
  return replace(state, withActivity(next, `Milestone “${milestone.title}” removed`, now));
}

export function addResource(
  state: WorkspaceState,
  id: string,
  resource: { title: string; url: string },
  now: string,
): WorkspaceState {
  const project = findProject(state, id);
  const url = resource.url.trim();
  const title = (resource.title.trim() || url).slice(0, LIMITS.title);
  if (!project || !isSafeUrl(url) || project.resources.length >= LIMITS.resources) return state;
  const next = { ...project, resources: [...project.resources, { id: newId(), title, url }] };
  return replace(state, withActivity(next, `Resource “${title}” added`, now));
}

export function removeResource(
  state: WorkspaceState,
  id: string,
  resourceId: string,
  now: string,
): WorkspaceState {
  const project = findProject(state, id);
  const resource = project?.resources.find((item) => item.id === resourceId);
  if (!project || !resource) return state;
  const next = {
    ...project,
    resources: project.resources.filter((item) => item.id !== resourceId),
  };
  return replace(state, withActivity(next, `Resource “${resource.title}” removed`, now));
}

/** A copy with fresh ids and timeline, not archived; milestones are reopened. */
export function duplicateProject(
  state: WorkspaceState,
  id: string,
  now: string,
): { state: WorkspaceState; project: WorkspaceProject } | null {
  const project = findProject(state, id);
  if (!project) return null;
  if (state.projects.length >= LIMITS.projects) throw new WorkspaceFullError();
  const copy: WorkspaceProject = {
    ...project,
    id: newId(),
    title: `${project.title} (copy)`.slice(0, LIMITS.title),
    favorite: false,
    pinned: false,
    milestones: project.milestones.map((item) => ({ ...item, id: newId(), done: false })),
    resources: project.resources.map((item) => ({ ...item, id: newId() })),
    activity: [{ at: now, text: `Duplicated from “${project.title}”` }],
    createdAt: now,
    updatedAt: now,
    archivedAt: null,
  };
  return { state: { version: 1, projects: [copy, ...state.projects] }, project: copy };
}

export function archiveProject(state: WorkspaceState, id: string, now: string): WorkspaceState {
  const project = findProject(state, id);
  if (!project || project.archivedAt) return state;
  return replace(
    state,
    withActivity({ ...project, archivedAt: now, pinned: false }, 'Archived', now),
  );
}

export function restoreProject(state: WorkspaceState, id: string, now: string): WorkspaceState {
  const project = findProject(state, id);
  if (!project?.archivedAt) return state;
  return replace(
    state,
    withActivity({ ...project, archivedAt: null }, 'Restored from the archive', now),
  );
}

/** Only archived projects can be deleted, so a deletion always takes two deliberate steps. */
export function deleteProject(state: WorkspaceState, id: string): WorkspaceState {
  const project = findProject(state, id);
  if (!project?.archivedAt) return state;
  return { version: 1, projects: state.projects.filter((item) => item.id !== id) };
}

// ---------------------------------------------------------------------------
// Finding projects
// ---------------------------------------------------------------------------

export const SORTS = {
  updated: 'Last changed',
  created: 'Newest first',
  title: 'Title, A to Z',
  deadline: 'Next deadline',
} as const;
export type SortKey = keyof typeof SORTS;

export interface ProjectQuery {
  search: string;
  status: ProjectStatus | 'all';
  category: ProjectCategory | 'all';
  tag: string;
  favorites: boolean;
  archived: boolean;
  sort: SortKey;
}

export const DEFAULT_QUERY: ProjectQuery = {
  search: '',
  status: 'all',
  category: 'all',
  tag: '',
  favorites: false,
  archived: false,
  sort: 'updated',
};

/** The earliest deadline among open milestones, or null. */
export function nextDeadline(project: WorkspaceProject): string | null {
  const due = project.milestones
    .filter((item) => !item.done && item.due)
    .map((item) => item.due as string)
    .sort();
  return due[0] ?? null;
}

export function progressOf(project: WorkspaceProject): { done: number; total: number } {
  return {
    done: project.milestones.filter((item) => item.done).length,
    total: project.milestones.length,
  };
}

/** Matching projects: pinned ones first, then in the chosen order. */
export function findProjects(state: WorkspaceState, query: ProjectQuery): WorkspaceProject[] {
  const words = query.search.toLowerCase().split(/\s+/).filter(Boolean);
  const matches = state.projects.filter((project) => {
    if (Boolean(project.archivedAt) !== query.archived) return false;
    if (query.status !== 'all' && project.status !== query.status) return false;
    if (query.category !== 'all' && project.category !== query.category) return false;
    if (query.tag && !project.tags.includes(query.tag)) return false;
    if (query.favorites && !project.favorite) return false;
    const haystack = [project.title, project.description, ...project.tags, ...project.stack]
      .join(' ')
      .toLowerCase();
    return words.every((word) => haystack.includes(word));
  });
  const order: Record<SortKey, (a: WorkspaceProject, b: WorkspaceProject) => number> = {
    updated: (a, b) => b.updatedAt.localeCompare(a.updatedAt),
    created: (a, b) => b.createdAt.localeCompare(a.createdAt),
    title: (a, b) => a.title.localeCompare(b.title, 'en', { sensitivity: 'base' }),
    deadline: (a, b) => {
      const [x, y] = [nextDeadline(a), nextDeadline(b)];
      if (x === y) return 0;
      if (x === null) return 1;
      if (y === null) return -1;
      return x.localeCompare(y);
    },
  };
  return matches.sort((a, b) => Number(b.pinned) - Number(a.pinned) || order[query.sort](a, b));
}

export function allTags(state: WorkspaceState): string[] {
  return [...new Set(state.projects.flatMap((project) => project.tags))].sort();
}

// ---------------------------------------------------------------------------
// The store: one copy of the workspace shared by every page, saved on each change
// ---------------------------------------------------------------------------

type Listener = () => void;

let current: WorkspaceState | null = null;
let saveFailed = false;
const listeners = new Set<Listener>();

function readRaw(key: string): unknown {
  try {
    const raw = window.localStorage.getItem(key);
    if (raw === null) return null;
    try {
      return JSON.parse(raw) as unknown;
    } catch {
      // Text that isn't JSON is kept as it is, for recovery.
      return { unparsable: raw };
    }
  } catch {
    return null;
  }
}

/** Keeps values that couldn't be read, adding to what was kept before. */
function keepForRecovery(values: unknown[]): void {
  if (values.length === 0) return;
  writeStored(RECOVERY_KEY, [...readRecovery(), ...values]);
}

function load(): WorkspaceState {
  const { state, unreadable } = parseWorkspace(readRaw(WORKSPACE_KEY));
  if (unreadable.length > 0) {
    keepForRecovery(unreadable);
    // Rewritten without the unreadable entries, which are now safe in the recovery key.
    writeStored(WORKSPACE_KEY, state);
  }
  return state;
}

export const workspaceStore = {
  getSnapshot: (): WorkspaceState => {
    current ??= load();
    return current;
  },
  getServerSnapshot: (): WorkspaceState => EMPTY_WORKSPACE,
  subscribe: (listener: Listener): (() => void) => {
    listeners.add(listener);
    const onStorage = (event: StorageEvent) => {
      // Another tab changed the workspace: read it again.
      if (event.key === WORKSPACE_KEY || event.key === null) {
        current = load();
        listener();
      }
    };
    window.addEventListener('storage', onStorage);
    return () => {
      listeners.delete(listener);
      window.removeEventListener('storage', onStorage);
    };
  },
  /** Applies a change and saves it. Returns false when the browser refused to save it. */
  update: (change: (state: WorkspaceState) => WorkspaceState): boolean => {
    const next = change(workspaceStore.getSnapshot());
    if (next === current) return true;
    current = next;
    saveFailed = !writeStored(WORKSPACE_KEY, next);
    for (const listener of listeners) listener();
    return !saveFailed;
  },
  /** True when the last change couldn't be saved (storage full or blocked); it is kept in memory. */
  saveFailed: (): boolean => {
    return saveFailed;
  },
  /** Reads storage again, after a restore or a reset: on the next read, not now. */
  reload: (): void => {
    current = null;
    for (const listener of listeners) listener();
  },
};

/** Values kept aside because they couldn't be read. */
export function readRecovery(): unknown[] {
  return readStored(RECOVERY_KEY, (value): value is unknown[] => Array.isArray(value)) ?? [];
}

export function clearRecovery(): void {
  try {
    window.localStorage.removeItem(RECOVERY_KEY);
  } catch {
    // Nothing to do: storage is unavailable.
  }
}
