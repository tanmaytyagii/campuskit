import { describe, expect, it } from 'vitest';

import {
  MIGRATIONS,
  workspaceMerge,
  backupFileName,
  BACKUP_FORMAT,
  createBackup,
  deleteProjectProgress,
  MAX_BACKUP_BYTES,
  parseBackup,
  readProjectProgress,
  restoreBackup,
} from './backup.ts';
import type { QuestionProgress } from './progress.ts';
import { isStoredReport } from './report-drafts.ts';
import {
  createProject,
  EMPTY_WORKSPACE,
  workspaceStore,
  type WorkspaceProject,
} from './workspace.ts';

const PARTLY: QuestionProgress = {
  outcome: 'partly',
  ratings: {
    correctness: 'confident',
    understanding: 'partly',
    clarity: 'confident',
    limitations: 'confident',
  },
  attempts: 2,
  lastPracticed: '2026-10-29',
};

const REPORT = {
  info: {
    title: 'Campus Attendance',
    team: 'Riya and Sam',
    guide: '',
    institution: '',
    department: '',
    academicYear: '2026–27',
  },
  sections: { abstract: 'Our own abstract.' },
};

function save(key: string, value: unknown) {
  window.localStorage.setItem(key, JSON.stringify(value));
}

function stored(key: string): unknown {
  const raw = window.localStorage.getItem(key);
  return raw === null ? null : JSON.parse(raw);
}

/** Progress for two projects, as the pages save it. */
function seed() {
  save('campuskit:checklist:v1:attendance-system', { version: 1, done: ['data-model', 'run'] });
  save('campuskit:demo:v1:attendance-system', { version: 1, done: ['step-1'] });
  save('campuskit:readiness:v1:attendance-system', { version: 1, done: ['installed'] });
  save('campuskit:viva:v1:attendance-system', { version: 1, questions: { storage: PARTLY } });
  save('campuskit:rehearsal:v1:attendance-system', {
    version: 1,
    completedOn: '2026-10-28',
    checkedSteps: 3,
  });
  save('campuskit:report:v1:attendance-system', REPORT);
  save('campuskit:checklist:v1:student-result-analyzer', { version: 1, done: ['pandas'] });
}

function fileWith(projects: Record<string, unknown>, extra: Record<string, unknown> = {}) {
  return JSON.stringify({
    format: BACKUP_FORMAT,
    version: 1,
    exportedOn: '2026-10-30',
    projects,
    ...extra,
  });
}

describe('progress backups', () => {
  it('backs up only the projects with saved progress', () => {
    expect(createBackup('2026-10-30')).toEqual({
      format: 'campuskit-progress',
      version: 2,
      exportedOn: '2026-10-30',
      projects: {},
    });
    seed();
    const backup = createBackup('2026-10-30');
    expect(Object.keys(backup.projects)).toEqual(['attendance-system', 'student-result-analyzer']);
    expect(backup.projects['attendance-system']).toEqual({
      checklist: ['data-model', 'run'],
      demo: ['step-1'],
      readiness: ['installed'],
      viva: { storage: PARTLY },
      rehearsal: { completedOn: '2026-10-28', checkedSteps: 3 },
      report: REPORT,
    });
    expect(backupFileName('2026-10-30')).toBe('campuskit-progress-2026-10-30.json');
  });

  it('restores exactly what was backed up', () => {
    seed();
    const backup = createBackup('2026-10-30');
    const text = JSON.stringify(backup);
    window.localStorage.clear();
    const parsed = parseBackup(text);
    if (!parsed.ok) throw new Error(parsed.error);
    expect(parsed.unknownProjects).toEqual([]);
    expect(restoreBackup(parsed.backup)).toEqual(['attendance-system', 'student-result-analyzer']);
    expect(createBackup('2026-10-30')).toEqual(backup);
  });

  it('replaces the progress of the projects in the file and leaves the others alone', () => {
    seed();
    const parsed = parseBackup(fileWith({ 'attendance-system': { checklist: ['run'] } }));
    if (!parsed.ok) throw new Error(parsed.error);
    restoreBackup(parsed.backup);
    expect(readProjectProgress('attendance-system')).toEqual({ checklist: ['run'] });
    expect(stored('campuskit:report:v1:attendance-system')).toBeNull();
    expect(readProjectProgress('student-result-analyzer')).toEqual({ checklist: ['pandas'] });
  });

  it('keeps the readable viva ratings when one saved rating is malformed', () => {
    save('campuskit:viva:v1:expense-tracker', {
      version: 1,
      questions: { budget: PARTLY, broken: { ...PARTLY, outcome: 'confident' } },
    });
    expect(readProjectProgress('expense-tracker')).toEqual({ viva: { budget: PARTLY } });
  });

  it('lists projects this version doesn’t have and leaves them out', () => {
    const parsed = parseBackup(
      fileWith({ 'expense-tracker': { demo: ['step-2'] }, 'old-project': { checklist: ['a'] } }),
    );
    if (!parsed.ok) throw new Error(parsed.error);
    expect(parsed.unknownProjects).toEqual(['old-project']);
    expect(Object.keys(parsed.backup.projects)).toEqual(['expense-tracker']);
  });

  it('keeps only the report fields the report builder knows', () => {
    const parsed = parseBackup(
      fileWith({
        'expense-tracker': {
          report: {
            info: { ...REPORT.info, colour: 'red' },
            sections: { abstract: 'Text', notASection: 'x' },
          },
          rehearsal: { completedOn: '2026-10-01', checkedSteps: 2, extra: true },
        },
      }),
    );
    if (!parsed.ok) throw new Error(parsed.error);
    expect(parsed.backup.projects['expense-tracker']).toEqual({
      report: { info: REPORT.info, sections: { abstract: 'Text' } },
      rehearsal: { completedOn: '2026-10-01', checkedSteps: 2 },
    });
  });

  it.each([
    ['text that isn’t JSON', '{"format": ', 'it isn’t valid JSON'],
    [
      'another kind of file',
      JSON.stringify({ name: 'package' }),
      'isn’t a CampusKit progress file',
    ],
    ['a newer version', fileWith({}, { version: 3 }), 'made by a newer version of CampusKit'],
    ['a version that isn’t a number', fileWith({}, { version: '1' }), 'no valid version number'],
    ['a missing date', fileWith({}, { exportedOn: 'yesterday' }), 'no valid export date'],
    ['projects that aren’t a list', fileWith({}, { projects: [] }), 'no list of projects'],
  ])('refuses %s', (_, text, message) => {
    const parsed = parseBackup(text);
    expect(parsed.ok).toBe(false);
    if (!parsed.ok) expect(parsed.error).toContain(message);
  });

  it.each([
    ['a checklist that isn’t a list of ids', { checklist: [1, 2] }, 'the checklist list'],
    [
      'a rating that doesn’t match its outcome',
      { viva: { q: { ...PARTLY, outcome: 'missed' } } },
      'the viva ratings',
    ],
    ['a rehearsal without a date', { rehearsal: { checkedSteps: 2 } }, 'the guided demo record'],
    [
      'a report title that isn’t text',
      { report: { info: { title: 7 }, sections: {} } },
      'the report draft',
    ],
    ['an unknown part', { answers: ['typed text'] }, 'an unknown part, “answers”'],
  ])('refuses the whole file for %s, naming the project', (_, entry, part) => {
    seed();
    const before = createBackup('2026-10-30');
    const parsed = parseBackup(
      fileWith({ 'student-result-analyzer': {}, 'attendance-system': entry }),
    );
    expect(parsed).toEqual({
      ok: false,
      error: `In the progress for Student Attendance System, ${part} isn’t in the expected form.`,
    });
    expect(createBackup('2026-10-30')).toEqual(before);
  });

  it('refuses a file larger than any real backup', () => {
    const parsed = parseBackup(' '.repeat(MAX_BACKUP_BYTES + 1));
    expect(parsed).toEqual({
      ok: false,
      error: 'This file is too large to be a CampusKit progress file.',
    });
  });

  it('deletes everything saved for one project, its report draft included', () => {
    seed();
    deleteProjectProgress('attendance-system');
    expect(readProjectProgress('attendance-system')).toEqual({});
    expect(readProjectProgress('student-result-analyzer')).toEqual({ checklist: ['pandas'] });
  });
});

describe('saved report drafts', () => {
  it('are refused when a field the builder edits as text isn’t text', () => {
    expect(isStoredReport(REPORT)).toBe(true);
    expect(isStoredReport({ info: { ...REPORT.info, title: 7 }, sections: {} })).toBe(false);
    expect(isStoredReport({ info: {}, sections: { abstract: ['x'] } })).toBe(false);
  });
});

describe('backups of the student’s own projects', () => {
  const T = '2026-10-31T09:00:00.000Z';
  const project = (id: string, title: string, updatedAt = T): WorkspaceProject => ({
    ...createProject(
      EMPTY_WORKSPACE,
      {
        title,
        description: '',
        category: 'web',
        status: 'planning',
        tags: [],
        stack: [],
        templateId: null,
      },
      T,
      id,
    ).project,
    updatedAt,
  });

  it('reads a version 1 file as version 2, which simply has no projects of its own', () => {
    expect(MIGRATIONS[1]?.({ format: BACKUP_FORMAT, version: 1, projects: {} })).toEqual({
      format: BACKUP_FORMAT,
      version: 2,
      projects: {},
    });
    const parsed = parseBackup(fileWith({ 'expense-tracker': { demo: ['step-2'] } }));
    if (!parsed.ok) throw new Error(parsed.error);
    expect(parsed.backup.version).toBe(2);
    expect(parsed.backup.workspace).toBeUndefined();
  });

  it('backs up and restores the projects, keeping ones that are only in this browser', () => {
    workspaceStore.update(() => ({
      version: 1,
      projects: [project('a', 'Alpha'), project('b', 'Beta')],
    }));
    const backup = createBackup('2026-10-31');
    expect(backup.workspace?.map((item) => item.id)).toEqual(['a', 'b']);
    const text = JSON.stringify(backup);

    // Meanwhile, this browser renamed Alpha and gained Gamma.
    workspaceStore.update(() => ({
      version: 1,
      projects: [project('a', 'Alpha renamed', '2026-10-31T12:00:00.000Z'), project('g', 'Gamma')],
    }));
    const parsed = parseBackup(text);
    if (!parsed.ok) throw new Error(parsed.error);
    expect(
      workspaceMerge(workspaceStore.getSnapshot().projects, parsed.backup.workspace ?? []),
    ).toEqual({
      added: 1,
      replaced: 1,
      replacedWithOlder: 1,
      total: 3,
    });
    restoreBackup(parsed.backup);
    expect(workspaceStore.getSnapshot().projects.map((item) => `${item.id}:${item.title}`)).toEqual(
      ['a:Alpha', 'b:Beta', 'g:Gamma'],
    );
  });

  it.each([
    ['a list that isn’t a list', { workspace: { a: 1 } }, 'The list of your projects in this file'],
    [
      'a project with a status it can’t have',
      { workspace: [{ ...project('a', 'A'), status: 'lost' }] },
      'Your project number 1',
    ],
    [
      'two projects with the same id',
      { workspace: [project('a', 'A'), project('a', 'B')] },
      'Your project number 2',
    ],
    [
      'a link that isn’t a web address',
      {
        workspace: [
          {
            ...project('a', 'A'),
            resources: [{ id: 'r', title: 'x', url: 'javascript:alert(1)' }],
          },
        ],
      },
      'Your project number 1',
    ],
  ])('refuses %s', (_, extra, message) => {
    const parsed = parseBackup(fileWith({}, { version: 2, ...extra }));
    expect(parsed.ok).toBe(false);
    if (!parsed.ok) expect(parsed.error).toContain(message);
  });
});
