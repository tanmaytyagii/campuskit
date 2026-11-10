import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import { renderRoute } from '../../test/render.tsx';
import {
  addMilestone,
  createProject,
  EMPTY_WORKSPACE,
  RECOVERY_KEY,
  WORKSPACE_KEY,
  workspaceStore,
  type ProjectDetails,
  type WorkspaceState,
} from '../../lib/workspace.ts';

const T = '2026-10-31T09:00:00.000Z';
const DETAILS: ProjectDetails = {
  title: 'Hostel Mess Feedback',
  description: 'Weekly feedback on the mess menu.',
  category: 'web',
  status: 'in-progress',
  tags: ['final year'],
  stack: ['Flask', 'SQLite'],
  templateId: 'student-management-system',
};

function seed(...projects: Array<[string, Partial<ProjectDetails>]>): WorkspaceState {
  let state = EMPTY_WORKSPACE;
  for (const [id, details] of projects)
    state = createProject(state, { ...DETAILS, ...details }, T, id).state;
  workspaceStore.update(() => state);
  return state;
}

function stored(): WorkspaceState {
  return JSON.parse(window.localStorage.getItem(WORKSPACE_KEY) ?? '{}') as WorkspaceState;
}

describe('workspace: the student’s own projects', () => {
  it('creates a project, refusing an empty title, and opens it', async () => {
    const user = userEvent.setup();
    renderRoute('/my-projects');
    expect(await screen.findByRole('heading', { name: 'No projects yet' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'New project' }));
    const dialog = await screen.findByRole('dialog', { name: 'New project' });
    await user.click(within(dialog).getByRole('button', { name: 'Create project' }));
    const title = within(dialog).getByRole('textbox', { name: 'Title' });
    expect(title).toHaveFocus();
    expect(title).toHaveAccessibleDescription('Enter a title for the project.');

    await user.type(title, 'Library Seat Finder');
    await user.type(
      within(dialog).getByRole('textbox', { name: /^Technology stack/ }),
      'React, Vite',
    );
    await user.type(within(dialog).getByRole('textbox', { name: /^Tags/ }), 'Mini Project, team');
    await user.click(within(dialog).getByRole('button', { name: 'Create project' }));

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Library Seat Finder' }),
    ).toBeInTheDocument();
    expect(screen.getByText('Created “Library Seat Finder”.')).toBeInTheDocument();
    expect(stored().projects[0]).toMatchObject({
      title: 'Library Seat Finder',
      stack: ['React', 'Vite'],
      tags: ['mini project', 'team'],
      status: 'planning',
    });
  });

  it('tracks milestones, notes and links on the project page, with a timeline', async () => {
    seed(['p1', {}]);
    const user = userEvent.setup();
    renderRoute('/my-projects/p1');
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Hostel Mess Feedback' }),
    ).toBeInTheDocument();

    const milestones = screen.getByRole('region', { name: 'Milestones' });
    await user.click(within(milestones).getByRole('button', { name: 'Add' }));
    expect(
      within(milestones).getByRole('textbox', { name: 'New milestone' }),
    ).toHaveAccessibleDescription('Enter what the milestone is.');
    await user.type(
      within(milestones).getByRole('textbox', { name: 'New milestone' }),
      'Database schema',
    );
    await user.type(within(milestones).getByLabelText(/^Due date/), '2026-11-05');
    await user.click(within(milestones).getByRole('button', { name: 'Add' }));
    const checkbox = within(milestones).getByRole('checkbox', { name: /Database schema/ });
    expect(within(milestones).getByText('0 of 1 done')).toBeInTheDocument();
    await user.click(checkbox);
    expect(within(milestones).getByText('1 of 1 done')).toBeInTheDocument();

    const notes = screen.getByRole('textbox', { name: 'Notes for this project' });
    await user.type(notes, 'Ask the guide about the menu data.');
    expect(stored().projects[0]?.notes).toBe('Ask the guide about the menu data.');

    const resources = screen.getByRole('region', { name: 'Resources' });
    await user.type(
      within(resources).getByRole('textbox', { name: 'Web address' }),
      'javascript:alert(1)',
    );
    await user.click(within(resources).getByRole('button', { name: 'Add' }));
    expect(
      within(resources).getByRole('textbox', { name: 'Web address' }),
    ).toHaveAccessibleDescription('Enter a web address that starts with https:// or http://.');
    const address = within(resources).getByRole('textbox', { name: 'Web address' });
    await user.clear(address);
    await user.type(address, 'https://flask.palletsprojects.com/');
    await user.type(within(resources).getByRole('textbox', { name: /^Link title/ }), 'Flask docs');
    await user.click(within(resources).getByRole('button', { name: 'Add' }));
    const link = within(resources).getByRole('link', { name: /Flask docs/ });
    expect(link).toHaveAttribute('href', 'https://flask.palletsprojects.com/');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');

    const timeline = screen.getByRole('region', { name: 'Activity' });
    expect(
      within(timeline)
        .getAllByRole('listitem')
        .map((item) => item.firstChild?.textContent),
    ).toEqual([
      'Resource “Flask docs” added',
      'Notes edited',
      'Milestone “Database schema” completed',
      'Milestone “Database schema” added',
      'Project created',
    ]);
    expect(screen.getByRole('link', { name: 'Learning studio' })).toHaveAttribute(
      'href',
      '/projects/student-management-system/learn',
    );
  });

  it('searches, filters, pins and favourites projects', async () => {
    seed(
      ['a', { title: 'Alpha Quiz', tags: ['ml'], status: 'done' }],
      ['b', { title: 'Beta Notes', tags: [] }],
    );
    const user = userEvent.setup();
    renderRoute('/my-projects');
    expect(await screen.findByText('Showing 2 of 2 projects')).toBeInTheDocument();
    await user.type(screen.getByRole('searchbox', { name: 'Search' }), 'quiz');
    expect(screen.getByText('Showing 1 of 2 projects')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Clear the filters' }));
    await user.selectOptions(screen.getByRole('combobox', { name: 'Tag' }), 'ml');
    expect(screen.getByRole('article', { name: 'Alpha Quiz' })).toBeInTheDocument();
    expect(screen.queryByRole('article', { name: 'Beta Notes' })).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Clear the filters' }));

    const pin = screen.getByRole('button', { name: 'Pin Beta Notes' });
    await user.click(pin);
    expect(pin).toHaveAttribute('aria-pressed', 'true');
    await user.click(screen.getByRole('button', { name: 'Favourite Alpha Quiz' }));
    expect(stored().projects.find((p) => p.id === 'a')?.favorite).toBe(true);
    await user.click(screen.getByRole('checkbox', { name: 'Favourites only' }));
    expect(screen.getByText('Showing 1 of 2 projects')).toBeInTheDocument();
  });

  it('archives a project, restores it, and deletes it only after a second confirmation', async () => {
    seed(['p1', {}]);
    const user = userEvent.setup();
    renderRoute('/my-projects/p1');
    await user.click(await screen.findByRole('button', { name: 'Archive' }));
    expect(await screen.findByText('This project is archived')).toBeInTheDocument();
    expect(screen.queryByRole('textbox', { name: 'New milestone' })).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Restore' }));
    expect(screen.queryByText('This project is archived')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Archive' }));
    await user.click(screen.getByRole('button', { name: 'Delete for good' }));
    const dialog = await screen.findByRole('alertdialog', {
      name: 'Delete “Hostel Mess Feedback” for good?',
    });
    await user.click(within(dialog).getByRole('button', { name: 'Delete for good' }));
    expect(
      await screen.findByRole('heading', { level: 1, name: 'My projects' }),
    ).toBeInTheDocument();
    expect(stored().projects).toEqual([]);
  });

  it('lists archived projects separately, with restore', async () => {
    let state = seed(['p1', {}], ['p2', { title: 'Second' }]);
    state = {
      version: 1,
      projects: state.projects.map((p) => (p.id === 'p2' ? { ...p, archivedAt: T } : p)),
    };
    workspaceStore.update(() => state);
    const user = userEvent.setup();
    renderRoute('/my-projects');
    expect(await screen.findByText('Showing 1 of 1 project')).toBeInTheDocument();
    await user.click(screen.getByRole('checkbox', { name: 'Show the archive' }));
    expect(screen.getByText('Showing 1 of 1 archived project')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Restore Second' }));
    expect(stored().projects.find((p) => p.id === 'p2')?.archivedAt).toBeNull();
  });

  it('duplicates a project and opens the copy', async () => {
    let state = seed(['p1', {}]);
    state = addMilestone(state, 'p1', { title: 'Report', due: null }, T);
    workspaceStore.update(() => state);
    const user = userEvent.setup();
    renderRoute('/my-projects/p1');
    await user.click(await screen.findByRole('button', { name: 'Duplicate' }));
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Hostel Mess Feedback (copy)' }),
    ).toBeInTheDocument();
    expect(stored().projects).toHaveLength(2);
    expect(screen.getByRole('checkbox', { name: /Report/ })).not.toBeChecked();
  });

  it('explains a project that isn’t in this browser', async () => {
    renderRoute('/my-projects/nowhere');
    expect(
      await screen.findByRole('heading', { name: 'This project isn’t in this browser' }),
    ).toBeInTheDocument();
  });

  it('keeps unreadable saved data aside and offers it for download', async () => {
    window.localStorage.setItem(
      WORKSPACE_KEY,
      JSON.stringify({ version: 1, projects: [{ id: 'broken', title: 42 }] }),
    );
    workspaceStore.reload();
    const user = userEvent.setup();
    renderRoute('/my-projects');
    expect(await screen.findByText('Some saved project data couldn’t be read')).toBeInTheDocument();
    expect(JSON.parse(window.localStorage.getItem(RECOVERY_KEY) ?? '[]')).toEqual([
      { id: 'broken', title: 42 },
    ]);
    await user.click(screen.getByRole('button', { name: 'Delete it' }));
    const dialog = await screen.findByRole('alertdialog', { name: 'Delete the unreadable data?' });
    await user.click(within(dialog).getByRole('button', { name: 'Delete it' }));
    await waitFor(() =>
      expect(
        screen.queryByText('Some saved project data couldn’t be read'),
      ).not.toBeInTheDocument(),
    );
    expect(window.localStorage.getItem(RECOVERY_KEY)).toBeNull();
  });
});
