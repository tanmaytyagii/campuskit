import { screen, waitFor, within } from '@testing-library/react';
import userEvent, { type UserEvent } from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { downloadFile } from '../../lib/download.ts';
import { readLog } from '../../lib/viva-log.ts';
import { renderRoute } from '../../test/render.tsx';

vi.mock('../../lib/download.ts', () => ({ downloadFile: vi.fn() }));

async function rateAll(user: UserEvent, rating: 'Not yet' | 'Partly' | 'Confident') {
  for (const criterion of [
    'Correctness',
    'Conceptual understanding',
    'Explanation clarity',
    'Awareness of limitations',
  ]) {
    await user.click(
      within(screen.getByRole('group', { name: criterion })).getByRole('radio', { name: rating }),
    );
  }
}

describe('mock viva and viva progress', () => {
  it('runs a mock viva with a timer that can be hidden, and logs each rating', async () => {
    const user = userEvent.setup();
    renderRoute('/projects/attendance-system/viva');
    await user.click(await screen.findByRole('button', { name: 'Start a mock viva' }));
    expect(await screen.findByText(/Mock viva · Question 1 of 8/)).toBeInTheDocument();
    expect(screen.getByText(/Time left for this answer/)).toHaveTextContent(
      'Time left for this answer: 2:00',
    );
    await user.click(screen.getByRole('button', { name: 'Hide the timer' }));
    expect(screen.getByText('Timer hidden')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /I don’t know yet/ }));
    await rateAll(user, 'Partly');
    await user.click(screen.getByRole('button', { name: 'Save rating and continue' }));
    expect(await screen.findByText(/Mock viva · Question 2 of 8/)).toBeInTheDocument();
    expect(readLog()).toEqual([
      expect.objectContaining({ projectId: 'attendance-system', outcome: 'partly', mock: true }),
    ]);
  });

  it('shows practice by template and topic, and downloads a revision report', async () => {
    const user = userEvent.setup();
    renderRoute('/projects/attendance-system/viva');
    await user.click(await screen.findByRole('button', { name: 'Start quick practice' }));
    await user.click(await screen.findByRole('button', { name: /I don’t know yet/ }));
    await rateAll(user, 'Not yet');
    await user.click(screen.getByRole('button', { name: 'Save rating and continue' }));
    await user.click(await screen.findByRole('button', { name: 'End session' }));

    renderRoute('/viva/progress');
    const tiles = await screen.findAllByText('Questions practised', { selector: 'dt' });
    expect(tiles.at(-1)?.parentElement).toHaveTextContent('1');
    const section = await screen.findByRole('region', { name: 'Student Attendance System' });
    expect(await within(section).findByText(/Topics that need work:/)).toBeInTheDocument();
    const history = screen.getAllByRole('region', { name: 'Ratings per day' }).at(-1)!;
    expect(within(history).getAllByRole('row')).toHaveLength(15);

    await user.click(screen.getAllByRole('button', { name: 'Markdown (.md)' }).at(-1)!);
    await waitFor(() => expect(vi.mocked(downloadFile)).toHaveBeenCalled());
    const [text, name] = vi.mocked(downloadFile).mock.calls[0] ?? [];
    expect(name).toMatch(/^viva-revision-report-\d{4}-\d{2}-\d{2}\.md$/);
    expect(text).toContain('## Student Attendance System');
    expect(text).toContain('review again');
  });

  it('explains that there is nothing yet', async () => {
    renderRoute('/viva/progress');
    expect(
      await screen.findByRole('heading', { name: 'No viva practice yet' }),
    ).toBeInTheDocument();
  });
});
