import { act, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import { App } from './App';
import type { AppConfig } from './config';
import { STORAGE_KEY } from './lib/storage';

const config: AppConfig = {
  appName: 'Test Attendance',
  institutionName: 'Hill View School',
  authorName: 'Asha',
  theme: 'indigo',
  attendanceThreshold: 75,
  seedDemoData: true,
};

async function goTo(label: string) {
  const user = userEvent.setup();
  await user.click(screen.getByRole('link', { name: label }));
  // Hash navigation fires a hashchange event; wait for React to re-render.
  await act(async () => {
    window.dispatchEvent(new HashChangeEvent('hashchange'));
  });
  return user;
}

describe('Attendance app', () => {
  it('shows the configured names and a dashboard built from demo data', () => {
    render(<App config={config} />);
    expect(screen.getByText('Test Attendance')).toBeInTheDocument();
    expect(screen.getByText('Hill View School')).toBeInTheDocument();
    expect(screen.getByText(/Built by Asha/)).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1, name: 'Dashboard' })).toBeInTheDocument();
    const attention = screen
      .getByRole('heading', { name: 'Below the 75% threshold' })
      .closest('section');
    expect(within(attention as HTMLElement).getByText('Rohan Das')).toBeInTheDocument();
  });

  it('starts empty when demo data is turned off', () => {
    render(<App config={{ ...config, seedDemoData: false }} />);
    expect(screen.getByText('No students yet')).toBeInTheDocument();
  });

  it('validates and adds a student, then saves to localStorage', async () => {
    render(<App config={{ ...config, seedDemoData: false }} />);
    const user = await goTo('Students');
    await user.click(screen.getAllByRole('button', { name: 'Add student' })[0] as HTMLElement);

    const dialog = screen.getByRole('dialog', { name: 'Add student' });
    await user.click(within(dialog).getByRole('button', { name: 'Add student' }));
    expect(within(dialog).getByText('Enter a roll number.')).toBeInTheDocument();

    await user.type(within(dialog).getByLabelText('Full name'), 'Priya Menon');
    await user.type(within(dialog).getByLabelText('Roll number'), '10A-07');
    await user.type(within(dialog).getByLabelText('Class or section'), 'Class 10-A');
    await user.click(within(dialog).getByRole('button', { name: 'Add student' }));

    expect(await screen.findByRole('cell', { name: 'Priya Menon' })).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('Added Priya Menon.');
    const saved = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? '{}') as {
      students: unknown[];
    };
    expect(saved.students).toHaveLength(1);
  });

  it('marks and saves attendance for today', async () => {
    render(<App config={config} />);
    const user = await goTo('Mark attendance');
    expect(screen.getByText(/No attendance saved yet/)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Mark all present' }));
    const rohan = screen.getByRole('group', { name: /Rohan Das/ });
    await user.click(within(rohan).getByRole('radio', { name: 'Absent' }));
    await user.click(screen.getByRole('button', { name: 'Save attendance' }));

    expect(screen.getByRole('status')).toHaveTextContent(/Attendance saved for/);
    expect(screen.getByText(/Editing saved attendance/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Save attendance' })).toBeDisabled();
  });

  it('filters students by search text', async () => {
    render(<App config={config} />);
    const user = await goTo('Students');
    await user.type(screen.getByLabelText('Search'), 'fatima');
    expect(screen.getByText('Showing 1 of 12 students')).toBeInTheDocument();
    await user.clear(screen.getByLabelText('Search'));
    await user.type(screen.getByLabelText('Search'), 'zzz');
    expect(screen.getByText('No students match your search')).toBeInTheDocument();
  });

  it('edits a student and opens the form fresh every time', async () => {
    render(<App config={config} />);
    const user = await goTo('Students');
    await user.click(screen.getByRole('button', { name: 'Edit Kabir Singh' }));
    const editDialog = screen.getByRole('dialog', { name: 'Edit student' });
    const name = within(editDialog).getByLabelText('Full name');
    expect(name).toHaveValue('Kabir Singh');
    await user.clear(name);
    await user.type(name, 'Kabir S. Singh');
    await user.click(within(editDialog).getByRole('button', { name: 'Save changes' }));
    expect(await screen.findByRole('cell', { name: 'Kabir S. Singh' })).toBeInTheDocument();

    // Typing in the add form and cancelling leaves nothing behind for next time.
    await user.click(screen.getAllByRole('button', { name: 'Add student' })[0] as HTMLElement);
    await user.type(
      within(screen.getByRole('dialog', { name: 'Add student' })).getByLabelText('Full name'),
      'Draft name',
    );
    await user.click(
      within(screen.getByRole('dialog', { name: 'Add student' })).getByRole('button', {
        name: 'Cancel',
      }),
    );
    await user.click(screen.getAllByRole('button', { name: 'Add student' })[0] as HTMLElement);
    expect(
      within(screen.getByRole('dialog', { name: 'Add student' })).getByLabelText('Full name'),
    ).toHaveValue('');
  });

  it('asks for confirmation before deleting a student', async () => {
    render(<App config={config} />);
    const user = await goTo('Students');
    await user.click(screen.getByRole('button', { name: 'Delete Kabir Singh' }));
    const dialog = screen.getByRole('dialog', { name: 'Delete Kabir Singh?' });
    expect(dialog).toHaveTextContent('This also deletes 10 attendance marks');
    await user.click(within(dialog).getByRole('button', { name: 'Delete student' }));
    expect(screen.queryByRole('cell', { name: 'Kabir Singh' })).not.toBeInTheDocument();
  });
});
