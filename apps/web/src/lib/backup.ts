/**
 * Backing up and restoring a student's progress as a JSON file, for moving to another browser
 * or computer. The file is made and read in the browser; nothing is uploaded.
 *
 * It holds what CampusKit saves for each template: the ticked checklist, demonstration and
 * readiness items, viva ratings, the guided demo record and the report draft. Since version 2 it
 * also holds the student's own projects (the workspace). Typed viva
 * answers are never saved, so they can't be in it. Demo data (kept only for the tab), the
 * generator's unfinished form and the colour theme are left out.
 */
import { catalog, emptyInfo, SECTION_IDS } from '@campuskit/project-catalog';

import {
  isQuestionProgress,
  isRehearsal,
  isTickedList,
  progressKey,
  type QuestionProgress,
} from './progress.ts';
import { isStoredReport, REPORT_STORAGE_PREFIX, type StoredReport } from './report-drafts.ts';
import { isProfile, PROFILE_KEY, profileStore, type Profile } from './profile.ts';
import { readStored, removeStored, writeStored } from './storage.ts';
import {
  isWorkspaceProject,
  LIMITS,
  WORKSPACE_KEY,
  workspaceStore,
  type WorkspaceProject,
} from './workspace.ts';

export const BACKUP_FORMAT = 'campuskit-progress';
/** The version this code writes. Older versions are upgraded by MIGRATIONS when they are read. */
export const BACKUP_VERSION = 2;
/** Far more than a real backup needs (a few kilobytes a project), little enough to read safely. */
export const MAX_BACKUP_BYTES = 2 * 1024 * 1024;

const TICKED = ['checklist', 'demo', 'readiness'] as const;
type TickedKind = (typeof TICKED)[number];

export interface ProjectBackup {
  checklist?: string[];
  demo?: string[];
  readiness?: string[];
  viva?: Record<string, QuestionProgress>;
  rehearsal?: { completedOn: string; checkedSteps: number };
  report?: StoredReport;
}

export interface ProgressBackup {
  format: typeof BACKUP_FORMAT;
  version: typeof BACKUP_VERSION;
  /** Local date, YYYY-MM-DD. */
  exportedOn: string;
  projects: Record<string, ProjectBackup>;
  /** The student's own projects, archived ones included. Absent when there are none. */
  workspace?: WorkspaceProject[];
  /** The profile and preferences from Settings. Absent when never set. */
  profile?: Profile;
}

/**
 * Upgrades a file written by an older version to the next version, keyed by the version it
 * upgrades from. The reader runs them in order, so a version 1 file is read as version 2.
 */
export const MIGRATIONS: Record<
  number,
  (file: Record<string, unknown>) => Record<string, unknown>
> = {
  // Version 2 added the workspace. A version 1 file has none, and its template progress has the
  // same form in both versions.
  1: (file) => ({ ...file, version: 2 }),
};

const reportKey = (projectId: string) => `${REPORT_STORAGE_PREFIX}${projectId}`;

/** What this browser has saved for a project; empty when nothing is saved. */
export function readProjectProgress(projectId: string): ProjectBackup {
  const project: ProjectBackup = {};
  for (const kind of TICKED) {
    const stored = readStored(progressKey(kind, projectId), isTickedList);
    if (stored && stored.done.length > 0) project[kind] = [...stored.done];
  }
  // Like readVivaProgress: a malformed rating is dropped, the others are kept.
  const viva = readStored(progressKey('viva', projectId), isVivaList);
  const questions = Object.entries(viva?.questions ?? {}).filter(([, entry]) =>
    isQuestionProgress(entry),
  );
  if (questions.length > 0)
    project.viva = Object.fromEntries(questions) as Record<string, QuestionProgress>;
  const rehearsal = readStored(progressKey('rehearsal', projectId), isRehearsal);
  if (rehearsal)
    project.rehearsal = {
      completedOn: rehearsal.completedOn,
      checkedSteps: rehearsal.checkedSteps,
    };
  const report = readStored(reportKey(projectId), isStoredReport);
  if (report) project.report = report;
  return project;
}

export function hasProgress(project: ProjectBackup): boolean {
  return Object.keys(project).length > 0;
}

/** Every project with saved progress in this browser, as a backup file's contents. */
export function createBackup(today: string): ProgressBackup {
  const projects: Record<string, ProjectBackup> = {};
  for (const { id } of catalog) {
    const project = readProjectProgress(id);
    if (hasProgress(project)) projects[id] = project;
  }
  const { projects: workspace } = workspaceStore.getSnapshot();
  const profile = readStored(PROFILE_KEY, isProfile);
  return {
    format: BACKUP_FORMAT,
    version: BACKUP_VERSION,
    exportedOn: today,
    projects,
    ...(workspace.length > 0 ? { workspace } : {}),
    ...(profile ? { profile } : {}),
  };
}

/** What restoring a backup's workspace would do to this browser's projects. */
export interface WorkspaceMerge {
  added: number;
  replaced: number;
  /** Replaced projects whose copy in the file was changed less recently than the browser's. */
  replacedWithOlder: number;
  /** How many projects the browser would hold afterwards. */
  total: number;
}

export function workspaceMerge(
  current: readonly WorkspaceProject[],
  incoming: readonly WorkspaceProject[],
): WorkspaceMerge {
  const byId = new Map(current.map((project) => [project.id, project]));
  let replaced = 0;
  let replacedWithOlder = 0;
  for (const project of incoming) {
    const existing = byId.get(project.id);
    if (!existing) continue;
    replaced += 1;
    if (project.updatedAt < existing.updatedAt) replacedWithOlder += 1;
  }
  return {
    added: incoming.length - replaced,
    replaced,
    replacedWithOlder,
    total: current.length + incoming.length - replaced,
  };
}

export function backupFileName(today: string): string {
  return `campuskit-progress-${today}.json`;
}

export type ParsedBackup =
  { ok: true; backup: ProgressBackup; unknownProjects: string[] } | { ok: false; error: string };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isVivaList(value: unknown): value is { version: 1; questions: Record<string, unknown> } {
  return isRecord(value) && value.version === 1 && isRecord(value.questions);
}

const isIdList = (value: unknown): value is string[] =>
  Array.isArray(value) && value.every((id) => typeof id === 'string' && id.length <= 200);

/**
 * A project's entry rebuilt from the parts this version knows, or the name of the first part
 * that isn't in the expected form.
 */
function cleanProject(entry: Record<string, unknown>): ProjectBackup | string {
  const known = new Set(['checklist', 'demo', 'readiness', 'viva', 'rehearsal', 'report']);
  const unknown = Object.keys(entry).find((key) => !known.has(key));
  if (unknown) return `an unknown part, “${unknown}”`;
  const project: ProjectBackup = {};
  for (const kind of TICKED) {
    const list = entry[kind];
    if (list === undefined) continue;
    if (!isIdList(list)) return `the ${kind} list`;
    project[kind] = [...list];
  }
  if (entry.viva !== undefined) {
    if (!isRecord(entry.viva) || !Object.values(entry.viva).every(isQuestionProgress))
      return 'the viva ratings';
    project.viva = entry.viva as Record<string, QuestionProgress>;
  }
  if (entry.rehearsal !== undefined) {
    const rehearsal = { ...asRecord(entry.rehearsal), version: 1 };
    if (!isRehearsal(rehearsal)) return 'the guided demo record';
    project.rehearsal = {
      completedOn: rehearsal.completedOn,
      checkedSteps: rehearsal.checkedSteps,
    };
  }
  if (entry.report !== undefined) {
    if (!isStoredReport(entry.report)) return 'the report draft';
    // Only the fields the report builder knows, so nothing else reaches storage.
    const { info, sections } = entry.report;
    project.report = {
      info: { ...emptyInfo(null), ...pick(info, Object.keys(emptyInfo(null))) },
      sections: pick(sections, SECTION_IDS),
    };
  }
  return project;
}

function pick<T extends object>(value: T, keys: readonly string[]): Partial<T> {
  return Object.fromEntries(
    Object.entries(value).filter(([key, item]) => keys.includes(key) && item !== undefined),
  ) as Partial<T>;
}

const asRecord = (value: unknown): Record<string, unknown> => (isRecord(value) ? value : {});

/**
 * Reads a backup file's text. Every part is checked before anything is restored: a file that
 * isn't a CampusKit backup, was made by a newer version or has a malformed part is refused
 * whole, with the reason. Projects this version doesn't have are listed and left out.
 */
export function parseBackup(text: string): ParsedBackup {
  if (text.length > MAX_BACKUP_BYTES)
    return { ok: false, error: 'This file is too large to be a CampusKit progress file.' };
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    return { ok: false, error: 'This file isn’t a CampusKit progress file: it isn’t valid JSON.' };
  }
  if (!isRecord(data) || data.format !== BACKUP_FORMAT)
    return { ok: false, error: 'This file isn’t a CampusKit progress file.' };
  const { version } = data;
  if (typeof version !== 'number' || !Number.isInteger(version) || version < 1)
    return { ok: false, error: 'This progress file has no valid version number.' };
  if (version > BACKUP_VERSION)
    return {
      ok: false,
      error:
        'This file was made by a newer version of CampusKit. Reload this page to get the latest version, then try again.',
    };
  let file = data;
  for (let from = version; from < BACKUP_VERSION; from += 1) {
    const migrate = MIGRATIONS[from];
    if (!migrate) return { ok: false, error: `Progress files of version ${from} can’t be read.` };
    file = migrate(file);
  }
  if (typeof file.exportedOn !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(file.exportedOn))
    return { ok: false, error: 'This progress file has no valid export date.' };
  if (!isRecord(file.projects))
    return { ok: false, error: 'This progress file has no list of projects.' };
  let workspace: WorkspaceProject[] | undefined;
  if (file.workspace !== undefined) {
    if (!Array.isArray(file.workspace) || file.workspace.length > LIMITS.projects)
      return {
        ok: false,
        error: 'The list of your projects in this file isn’t in the expected form.',
      };
    const ids = new Set<string>();
    for (const [index, entry] of file.workspace.entries()) {
      if (!isWorkspaceProject(entry) || ids.has(entry.id))
        return {
          ok: false,
          error: `Your project number ${index + 1} in this file isn’t in the expected form.`,
        };
      ids.add(entry.id);
    }
    workspace = file.workspace as WorkspaceProject[];
  }
  if (file.profile !== undefined && !isProfile(file.profile))
    return { ok: false, error: 'The profile in this file isn’t in the expected form.' };
  const profile = file.profile;

  const names = new Map(catalog.map((project) => [project.id, project.name]));
  const projects: Record<string, ProjectBackup> = {};
  const unknownProjects: string[] = [];
  for (const [id, entry] of Object.entries(file.projects)) {
    const name = names.get(id);
    if (!name) {
      unknownProjects.push(id);
      continue;
    }
    if (!isRecord(entry))
      return { ok: false, error: `The progress for ${name} isn’t in the expected form.` };
    const project = cleanProject(entry);
    if (typeof project === 'string')
      return {
        ok: false,
        error: `In the progress for ${name}, ${project} isn’t in the expected form.`,
      };
    projects[id] = project;
  }
  return {
    ok: true,
    backup: {
      format: BACKUP_FORMAT,
      version: BACKUP_VERSION,
      exportedOn: file.exportedOn,
      projects,
      ...(workspace ? { workspace } : {}),
      ...(profile ? { profile } : {}),
    },
    unknownProjects,
  };
}

/**
 * Replaces this browser's progress for every template in the backup with the backup's. A part
 * the backup doesn't have is removed, so the template's progress ends up exactly as it was saved.
 * Templates that aren't in the backup are left alone. The student's own projects are merged: a
 * project with the same id is replaced by the file's copy, new ones are added, and projects only
 * in this browser are kept. Returns the ids of the templates restored.
 */
export function restoreBackup(backup: ProgressBackup): string[] {
  if (backup.workspace && backup.workspace.length > 0) {
    const incoming = new Map(backup.workspace.map((project) => [project.id, project]));
    const kept = workspaceStore
      .getSnapshot()
      .projects.filter((project) => !incoming.has(project.id));
    writeStored(WORKSPACE_KEY, { version: 1, projects: [...backup.workspace, ...kept] });
    workspaceStore.reload();
  }
  if (backup.profile) {
    writeStored(PROFILE_KEY, backup.profile);
    profileStore.reload();
  }
  const restored: string[] = [];
  for (const [projectId, project] of Object.entries(backup.projects)) {
    for (const kind of TICKED) writeOrRemove(progressKey(kind, projectId), ticked(project, kind));
    writeOrRemove(
      progressKey('viva', projectId),
      project.viva ? { version: 1, questions: project.viva } : null,
    );
    writeOrRemove(
      progressKey('rehearsal', projectId),
      project.rehearsal ? { version: 1, ...project.rehearsal } : null,
    );
    writeOrRemove(reportKey(projectId), project.report ?? null);
    restored.push(projectId);
  }
  return restored;
}

function ticked(project: ProjectBackup, kind: TickedKind) {
  const done = project[kind];
  return done && done.length > 0 ? { version: 1, done: [...new Set(done)].sort() } : null;
}

function writeOrRemove(key: string, value: unknown) {
  if (value === null) removeStored(key);
  else writeStored(key, value);
}

/** Deletes everything this browser has saved for a project, its report draft included. */
export function deleteProjectProgress(projectId: string): void {
  restoreBackup({
    format: BACKUP_FORMAT,
    version: BACKUP_VERSION,
    exportedOn: '',
    projects: { [projectId]: {} },
  });
}
