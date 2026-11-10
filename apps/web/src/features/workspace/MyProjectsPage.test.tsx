import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import attendanceGuide from '../../../../../packages/project-catalog/learning/attendance-system.json';
import { renderRoute } from '../../test/render.tsx';

const RATED = {
  outcome: 'confident',
  ratings: {
    correctness: 'confident',
    understanding: 'confident',
    clarity: 'confident',
    limitations: 'confident',
  },
  attempts: 1,
  lastPracticed: '2026-10-29',
};

function save(key: string, value: unknown) {
  window.localStorage.setItem(key, JSON.stringify(value));
}

/** Two ticked checklist items and one rated question for the attendance project. */
function seedAttendance() {
  const [first, second] = attendanceGuide.checklist;
  const question = attendanceGuide.viva[0];
  if (!first || !second || !question) throw new Error('the guide changed');
  save('campuskit:checklist:v1:attendance-system', { version: 1, done: [first.id, second.id] });
  save('campuskit:viva:v1:attendance-system', {
    version: 1,
    questions: { [question.id]: RATED },
  });
}

function backupFile(projects: Record<string, unknown>) {
  return new File(
    [
      JSON.stringify({
        format: 'campuskit-progress',
        version: 1,
        exportedOn: '2026-10-29',
        projects,
      }),
    ],
    'campuskit-progress-2026-10-29.json',
    { type: 'application/json' },
  );
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('my projects', () => {
  it('says when nothing is saved, and has nothing to back up', async () => {
    renderRoute('/my-projects');
    expect(
      await screen.findByRole('heading', { name: 'No template progress in this browser yet' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Download backup' })).toBeDisabled();
    expect(screen.getByText('Nothing to back up yet.')).toBeInTheDocument();
  });

  it('shows the saved progress of each started project with a suggested next step', async () => {
    seedAttendance();
    renderRoute('/my-projects');
    const card = await screen.findByRole('article', { name: 'Student Attendance System' });
    expect(
      await within(card).findByText(`2 of ${attendanceGuide.checklist.length} ticked`),
    ).toBeInTheDocument();
    expect(
      within(card).getByText(`1 of ${attendanceGuide.viva.length} practised, 1 confident`),
    ).toBeInTheDocument();
    expect(within(card).getByText('Not rehearsed yet')).toBeInTheDocument();
    expect(
      within(card).getByRole('link', {
        name: 'Continue the checklist for Student Attendance System',
      }),
    ).toHaveAttribute('href', '/projects/attendance-system/learn/checklist');
    const others = screen.getByRole('region', { name: 'Templates not started yet' });
    expect(within(others).getByRole('link', { name: 'Personal Expense Tracker' })).toBeVisible();
  });

  it('downloads a backup of the saved progress', async () => {
    seedAttendance();
    const blobs: Blob[] = [];
    const names: string[] = [];
    URL.createObjectURL = vi.fn((blob: Blob) => {
      blobs.push(blob);
      return 'blob:backup';
    });
    URL.revokeObjectURL = vi.fn();
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (
      this: HTMLAnchorElement,
    ) {
      names.push(this.download);
    });
    const user = userEvent.setup();
    renderRoute('/my-projects');
    await user.click(await screen.findByRole('button', { name: 'Download backup' }));
    expect(names).toEqual([expect.stringMatching(/^campuskit-progress-\d{4}-\d{2}-\d{2}\.json$/)]);
    const file = JSON.parse(await blobs[0]!.text()) as {
      format: string;
      projects: Record<string, { checklist: string[] }>;
    };
    expect(file.format).toBe('campuskit-progress');
    expect(Object.keys(file.projects)).toEqual(['attendance-system']);
    expect(file.projects['attendance-system']?.checklist).toHaveLength(2);
  });

  it('previews a backup before restoring it, then shows the restored project', async () => {
    const user = userEvent.setup();
    renderRoute('/my-projects');
    const input = await screen.findByLabelText('Backup file (.json)');
    await user.upload(
      input,
      backupFile({
        'expense-tracker': { checklist: ['a', 'b', 'c'] },
        'retired-project': { checklist: ['x'] },
      }),
    );
    const dialog = await screen.findByRole('dialog', { name: 'Restore this backup?' });
    expect(dialog).toHaveTextContent('exported on 29 Oct 2026');
    expect(dialog).toHaveTextContent('In the file: 3 checklist items ticked');
    expect(dialog).toHaveTextContent('In this browser now: no saved progress');
    expect(dialog).toHaveTextContent(
      'Left out, because this version of CampusKit doesn’t have it: retired-project.',
    );
    await user.click(within(dialog).getByRole('button', { name: 'Restore this backup' }));
    expect(
      await screen.findByText('Restored your backup: progress for 1 template.'),
    ).toBeInTheDocument();
    expect(screen.getByRole('article', { name: 'Personal Expense Tracker' })).toBeInTheDocument();
  });

  it('refuses a file that isn’t a backup and changes nothing', async () => {
    seedAttendance();
    const user = userEvent.setup();
    renderRoute('/my-projects');
    const input = await screen.findByLabelText('Backup file (.json)');
    await user.upload(input, new File(['{"name": "my-app"}'], 'package.json'));
    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('This file isn’t a CampusKit progress file.');
    expect(input).toHaveAccessibleDescription('This file isn’t a CampusKit progress file.');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getByRole('article', { name: 'Student Attendance System' })).toBeInTheDocument();
  });

  it('deletes a project’s progress after asking, and says so', async () => {
    seedAttendance();
    const user = userEvent.setup();
    renderRoute('/my-projects');
    await user.click(
      await screen.findByRole('button', {
        name: 'Delete saved progress for Student Attendance System',
      }),
    );
    const dialog = await screen.findByRole('alertdialog', {
      name: 'Delete your progress for Student Attendance System?',
    });
    await user.click(within(dialog).getByRole('button', { name: 'Delete progress' }));
    const message = await screen.findByText(
      'Deleted your progress for Student Attendance System from this browser.',
    );
    await waitFor(() => expect(message).toHaveFocus());
    expect(window.localStorage.getItem('campuskit:checklist:v1:attendance-system')).toBeNull();
    expect(
      screen.getByRole('heading', { name: 'No template progress in this browser yet' }),
    ).toBeInTheDocument();
  });

  it('is linked from the learning center', async () => {
    renderRoute('/learn');
    expect(await screen.findByRole('link', { name: 'My projects and backups' })).toHaveAttribute(
      'href',
      '/my-projects',
    );
  });
});
