import { describe, expect, it } from 'vitest';

import { MAX_RECENT, readRecent, recordVisit } from '../../lib/recent.ts';
import { createProject, EMPTY_WORKSPACE } from '../../lib/workspace.ts';
import { buildCommands, rankCommands, type Command } from './commands.ts';

const workspace = createProject(
  EMPTY_WORKSPACE,
  {
    title: 'Library Seat Finder',
    description: '',
    category: 'web',
    status: 'in-progress',
    tags: ['final year'],
    stack: ['React'],
    templateId: null,
  },
  '2026-10-31T09:00:00.000Z',
  'p1',
).state;

const commands = buildCommands({
  workspace,
  recent: [
    { path: '/viva', title: 'Viva practice', at: '2026-10-31T10:00:00.000Z' },
    { path: '/learn', title: 'Learning center', at: '2026-10-31T09:00:00.000Z' },
  ],
  currentPath: '/learn',
});

const labels = (found: Command[]) => found.map((command) => command.label);

describe('command palette matching', () => {
  it('offers recent pages, actions, pages and your projects before anything is typed', () => {
    const found = rankCommands(commands, '');
    expect(found[0]).toMatchObject({ group: 'Recent', label: 'Viva practice' });
    // The page the student is on isn't offered as a recent page.
    expect(found.filter((command) => command.group === 'Recent')).toHaveLength(1);
    expect(found.some((command) => command.group === 'Templates')).toBe(false);
    expect(labels(found)).toContain('Library Seat Finder');
  });

  it('puts labels that start with the query first, then labels that contain it', () => {
    const found = rankCommands(commands, 'viva');
    expect(found[0]?.label).toBe('Viva practice');
    const firstContaining = found.findIndex(
      (command) => !command.label.toLowerCase().startsWith('viva'),
    );
    expect(
      found
        .slice(firstContaining)
        .every((command) => !command.label.toLowerCase().startsWith('viva')),
    ).toBe(true);
    expect(labels(found)).toContain('Personal Expense Tracker: viva practice');
  });

  it('needs every word, in the label or the keywords, ignoring case and accents', () => {
    expect(labels(rankCommands(commands, 'expense demo'))).toEqual([
      'Personal Expense Tracker: interactive demo',
    ]);
    expect(labels(rankCommands(commands, 'FINAL YEAR'))).toContain('Library Seat Finder');
    expect(labels(rankCommands(commands, 'flask')).length).toBeGreaterThan(0);
    expect(rankCommands(commands, 'blockchain quantum')).toEqual([]);
  });

  it('finds templates by language and documents by description', () => {
    const python = rankCommands(commands, 'python');
    expect(labels(python)).toContain('Student Result Analyzer');
    expect(labels(python)).toContain('Student Management System');
    expect(
      rankCommands(commands, 'contributing').some((command) => command.group === 'Documentation'),
    ).toBe(true);
  });

  it('lists a page once, even when it is also a recent page', () => {
    const found = rankCommands(commands, 'viva practice');
    expect(
      found.filter((command) => command.run.kind === 'navigate' && command.run.to === '/viva'),
    ).toHaveLength(1);
  });

  it('leaves archived projects out', () => {
    const archived = {
      version: 1 as const,
      projects: workspace.projects.map((project) => ({
        ...project,
        archivedAt: '2026-10-31T11:00:00.000Z',
      })),
    };
    const found = rankCommands(
      buildCommands({ workspace: archived, recent: [], currentPath: '/' }),
      'library',
    );
    expect(labels(found)).not.toContain('Library Seat Finder');
  });
});

describe('recent pages', () => {
  it('keeps the newest visits first, without repeats, up to a limit', () => {
    for (let index = 0; index < MAX_RECENT + 3; index += 1)
      recordVisit(
        `/page-${index}`,
        `Page ${index}`,
        `2026-10-31T10:${String(index).padStart(2, '0')}:00.000Z`,
      );
    recordVisit('/page-5', 'Page 5 again', '2026-10-31T11:00:00.000Z');
    const recent = readRecent();
    expect(recent).toHaveLength(MAX_RECENT);
    expect(recent[0]).toMatchObject({ path: '/page-5', title: 'Page 5 again' });
    expect(recent.filter((page) => page.path === '/page-5')).toHaveLength(1);
  });

  it('ignores addresses outside the site', () => {
    recordVisit('https://example.com/', 'Elsewhere', '2026-10-31T10:00:00.000Z');
    recordVisit('//example.com/', 'Elsewhere', '2026-10-31T10:00:00.000Z');
    expect(readRecent()).toEqual([]);
  });
});
