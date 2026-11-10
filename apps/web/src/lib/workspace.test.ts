import { describe, expect, it } from 'vitest';

import {
  addMilestone,
  addResource,
  archiveProject,
  createProject,
  DEFAULT_QUERY,
  deleteProject,
  duplicateProject,
  EMPTY_WORKSPACE,
  findProjects,
  LIMITS,
  nextDeadline,
  normalizeStack,
  normalizeTags,
  parseWorkspace,
  readRecovery,
  RECOVERY_KEY,
  restoreProject,
  setNotes,
  setStatus,
  toggleFlag,
  toggleMilestone,
  updateDetails,
  validateDetails,
  WORKSPACE_KEY,
  WorkspaceFullError,
  workspaceStore,
  type ProjectDetails,
  type WorkspaceState,
} from './workspace.ts';

const T0 = '2026-10-31T10:00:00.000Z';
const T1 = '2026-10-31T11:00:00.000Z';
const T2 = '2026-10-31T13:30:00.000Z';

const DETAILS: ProjectDetails = {
  title: '  Hostel Mess Feedback ',
  description: 'Collects weekly feedback on the mess menu.',
  category: 'web',
  status: 'planning',
  tags: ['Flask', ' flask', 'Mini   Project'],
  stack: ['Python', 'Flask', 'python', 'SQLite'],
  templateId: 'student-management-system',
};

function create(state: WorkspaceState = EMPTY_WORKSPACE, details = DETAILS, id = 'p1', at = T0) {
  return createProject(state, details, at, id);
}

describe('workspace projects', () => {
  it('creates a project with tidy tags and stack and a first timeline entry', () => {
    const { state, project } = create();
    expect(project).toMatchObject({
      id: 'p1',
      title: 'Hostel Mess Feedback',
      tags: ['flask', 'mini project'],
      stack: ['Python', 'Flask', 'SQLite'],
      status: 'planning',
      archivedAt: null,
      activity: [{ at: T0, text: 'Project created' }],
    });
    expect(state.projects).toHaveLength(1);
  });

  it('checks the details a student types', () => {
    expect(validateDetails({ ...DETAILS, title: '   ' })).toEqual({
      title: 'Enter a title for the project.',
    });
    expect(validateDetails({ ...DETAILS, title: 'x'.repeat(121) }).title).toMatch(/120/);
    expect(validateDetails({ ...DETAILS, description: 'd'.repeat(2001) }).description).toMatch(
      /2000/,
    );
    expect(validateDetails(DETAILS)).toEqual({});
  });

  it('records status changes, milestones and resources in the timeline, newest first', () => {
    let { state } = create();
    state = setStatus(state, 'p1', 'in-progress', T1);
    state = addMilestone(state, 'p1', { title: 'Database schema', due: '2026-11-05' }, T1);
    const milestoneId = state.projects[0]!.milestones[0]!.id;
    state = toggleMilestone(state, 'p1', milestoneId, T2);
    state = addResource(
      state,
      'p1',
      { title: 'Flask docs', url: 'https://flask.palletsprojects.com/' },
      T2,
    );
    expect(state.projects[0]!.activity.map((entry) => entry.text)).toEqual([
      'Resource “Flask docs” added',
      'Milestone “Database schema” completed',
      'Milestone “Database schema” added',
      'Status changed to In progress',
      'Project created',
    ]);
    expect(state.projects[0]!.updatedAt).toBe(T2);
  });

  it('accepts only http and https links as resources', () => {
    const { state } = create();
    for (const url of [
      'javascript:alert(1)',
      'data:text/html,hi',
      'not a link',
      'file:///etc/passwd',
    ])
      expect(addResource(state, 'p1', { title: 'x', url }, T1)).toBe(state);
  });

  it('keeps one timeline entry for an hour of note editing', () => {
    let { state } = create();
    state = setNotes(state, 'p1', 'Draft', T1);
    state = setNotes(state, 'p1', 'Draft two', '2026-10-31T11:20:00.000Z');
    state = setNotes(state, 'p1', 'Draft three', '2026-10-31T12:30:00.000Z');
    expect(
      state.projects[0]!.activity.filter((entry) => entry.text === 'Notes edited'),
    ).toHaveLength(2);
    expect(state.projects[0]!.notes).toBe('Draft three');
  });

  it('edits details and says when the status changed', () => {
    const { state } = create();
    const next = updateDetails(
      state,
      'p1',
      { ...DETAILS, title: 'Mess Feedback', status: 'done' },
      T1,
    );
    expect(next.projects[0]).toMatchObject({ title: 'Mess Feedback', status: 'done' });
    expect(next.projects[0]!.activity[0]!.text).toBe('Status changed to Done');
  });

  it('duplicates with fresh ids, reopened milestones and a new timeline', () => {
    let { state } = create();
    state = addMilestone(state, 'p1', { title: 'Report', due: null }, T1);
    state = toggleMilestone(state, 'p1', state.projects[0]!.milestones[0]!.id, T1);
    state = toggleFlag(state, 'p1', 'favorite');
    const copy = duplicateProject(state, 'p1', T2);
    if (!copy) throw new Error('not copied');
    expect(copy.project).toMatchObject({
      title: 'Hostel Mess Feedback (copy)',
      favorite: false,
      activity: [{ at: T2, text: 'Duplicated from “Hostel Mess Feedback”' }],
    });
    expect(copy.project.id).not.toBe('p1');
    expect(copy.project.milestones[0]).toMatchObject({ title: 'Report', done: false });
    expect(copy.project.milestones[0]!.id).not.toBe(state.projects[0]!.milestones[0]!.id);
    expect(copy.state.projects).toHaveLength(2);
  });

  it('deletes only archived projects, and restores archived ones', () => {
    let { state } = create();
    expect(deleteProject(state, 'p1')).toBe(state);
    state = archiveProject(state, 'p1', T1);
    expect(state.projects[0]!.archivedAt).toBe(T1);
    state = restoreProject(state, 'p1', T2);
    expect(state.projects[0]!.archivedAt).toBeNull();
    expect(state.projects[0]!.activity[0]!.text).toBe('Restored from the archive');
    state = archiveProject(state, 'p1', T2);
    expect(deleteProject(state, 'p1').projects).toEqual([]);
  });

  it('refuses a project past the limit instead of losing one', () => {
    let state = EMPTY_WORKSPACE;
    for (let index = 0; index < LIMITS.projects; index += 1)
      state = createProject(state, DETAILS, T0, `p${index}`).state;
    expect(() => createProject(state, DETAILS, T0, 'extra')).toThrow(WorkspaceFullError);
  });

  it('normalises tags and stack', () => {
    expect(normalizeTags([' Final Year ', 'final year', '', 'IoT'])).toEqual(['final year', 'iot']);
    expect(normalizeStack(['React', 'react ', ' Node.js'])).toEqual(['React', 'Node.js']);
  });
});

describe('finding projects', () => {
  function sample() {
    let state = create(EMPTY_WORKSPACE, { ...DETAILS, title: 'Beta', tags: ['ml'] }, 'b', T0).state;
    state = create(
      state,
      { ...DETAILS, title: 'alpha', category: 'ai-ml', tags: ['ml'] },
      'a',
      T1,
    ).state;
    state = create(state, { ...DETAILS, title: 'Gamma', status: 'done', tags: [] }, 'g', T2).state;
    state = addMilestone(state, 'b', { title: 'Viva', due: '2026-11-20' }, T2);
    state = addMilestone(state, 'g', { title: 'Demo', due: '2026-11-02' }, T2);
    return state;
  }

  it('searches titles, descriptions, tags and stack, ignoring case', () => {
    const state = sample();
    expect(findProjects(state, { ...DEFAULT_QUERY, search: 'ALPHA' }).map((p) => p.id)).toEqual([
      'a',
    ]);
    expect(findProjects(state, { ...DEFAULT_QUERY, search: 'flask mess' })).toHaveLength(3);
  });

  it('filters by status, category, tag, favourites and archive', () => {
    let state = sample();
    expect(findProjects(state, { ...DEFAULT_QUERY, status: 'done' }).map((p) => p.id)).toEqual([
      'g',
    ]);
    expect(findProjects(state, { ...DEFAULT_QUERY, category: 'ai-ml' }).map((p) => p.id)).toEqual([
      'a',
    ]);
    expect(
      findProjects(state, { ...DEFAULT_QUERY, tag: 'ml', sort: 'title' }).map((p) => p.id),
    ).toEqual(['a', 'b']);
    state = toggleFlag(state, 'g', 'favorite');
    expect(findProjects(state, { ...DEFAULT_QUERY, favorites: true }).map((p) => p.id)).toEqual([
      'g',
    ]);
    state = archiveProject(state, 'b', T2);
    expect(findProjects(state, DEFAULT_QUERY).map((p) => p.id)).not.toContain('b');
    expect(findProjects(state, { ...DEFAULT_QUERY, archived: true }).map((p) => p.id)).toEqual([
      'b',
    ]);
  });

  it('sorts, with pinned projects first and projects without deadlines last', () => {
    let state = sample();
    expect(findProjects(state, { ...DEFAULT_QUERY, sort: 'title' }).map((p) => p.id)).toEqual([
      'a',
      'b',
      'g',
    ]);
    expect(findProjects(state, { ...DEFAULT_QUERY, sort: 'deadline' }).map((p) => p.id)).toEqual([
      'g',
      'b',
      'a',
    ]);
    expect(findProjects(state, { ...DEFAULT_QUERY, sort: 'created' }).map((p) => p.id)).toEqual([
      'g',
      'a',
      'b',
    ]);
    state = toggleFlag(state, 'b', 'pinned');
    expect(findProjects(state, { ...DEFAULT_QUERY, sort: 'title' }).map((p) => p.id)).toEqual([
      'b',
      'a',
      'g',
    ]);
    expect(nextDeadline(state.projects.find((p) => p.id === 'a')!)).toBeNull();
  });
});

describe('reading the saved workspace', () => {
  it('keeps unreadable projects aside instead of dropping them', () => {
    const good = create().project;
    const parsed = parseWorkspace({
      version: 1,
      projects: [good, { ...good, id: 'bad', status: 'abandoned' }, good, 'text'],
    });
    expect(parsed.state.projects).toEqual([good]);
    // The duplicate id and the malformed entries are all kept.
    expect(parsed.unreadable).toHaveLength(3);
    expect(parseWorkspace({ version: 9 })).toEqual({
      state: EMPTY_WORKSPACE,
      unreadable: [{ version: 9 }],
    });
    expect(parseWorkspace(null)).toEqual({ state: EMPTY_WORKSPACE, unreadable: [] });
  });

  it('moves unreadable entries to the recovery key when it loads', () => {
    const good = create().project;
    window.localStorage.setItem(
      WORKSPACE_KEY,
      JSON.stringify({ version: 1, projects: [good, { id: 'broken' }] }),
    );
    workspaceStore.reload();
    expect(workspaceStore.getSnapshot().projects).toEqual([good]);
    expect(readRecovery()).toEqual([{ id: 'broken' }]);
    expect(JSON.parse(window.localStorage.getItem(WORKSPACE_KEY)!)).toEqual({
      version: 1,
      projects: [good],
    });
  });

  it('keeps text that isn’t JSON for recovery too', () => {
    window.localStorage.setItem(WORKSPACE_KEY, '{oops');
    workspaceStore.reload();
    expect(workspaceStore.getSnapshot()).toEqual(EMPTY_WORKSPACE);
    expect(JSON.parse(window.localStorage.getItem(RECOVERY_KEY)!)).toEqual([
      { unparsable: '{oops' },
    ]);
  });

  it('saves every change and tells listeners', () => {
    let calls = 0;
    const unsubscribe = workspaceStore.subscribe(() => {
      calls += 1;
    });
    expect(workspaceStore.update((state) => create(state).state)).toBe(true);
    unsubscribe();
    expect(calls).toBe(1);
    const saved = JSON.parse(window.localStorage.getItem(WORKSPACE_KEY)!) as WorkspaceState;
    expect(saved.projects[0]?.id).toBe('p1');
  });
});
