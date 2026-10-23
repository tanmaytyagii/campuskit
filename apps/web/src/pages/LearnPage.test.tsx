import { screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { renderRoute } from '../test/render.tsx';

describe('learning center', () => {
  it('lists every project with its saved progress and ways to continue', async () => {
    window.localStorage.setItem(
      'campuskit:checklist:v1:attendance-system',
      JSON.stringify({ version: 1, done: ['setup-run', 'setup-tests'] }),
    );
    renderRoute('/learn');
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Learning center' }),
    ).toBeInTheDocument();
    const card = screen
      .getByRole('heading', { name: 'Student Attendance System' })
      .closest('article');
    if (!card) throw new Error('missing card');
    // Saved progress is shown as labelled amounts (the bars are decoration).
    expect(await within(card).findByText('2 of 16 ticked')).toBeInTheDocument();
    expect(within(card).getByText('Checklist')).toBeInTheDocument();
    expect(within(card).getByText('0 of 20 practised')).toBeInTheDocument();
    expect(
      within(card).getByRole('link', { name: 'Learning studio for Student Attendance System' }),
    ).toHaveAttribute('href', '/projects/attendance-system/learn');
    expect(
      within(card).getByRole('link', { name: 'Report workspace for Student Attendance System' }),
    ).toHaveAttribute('href', '/learn/report?project=attendance-system');
    expect(screen.getByRole('link', { name: 'Open the workspace' })).toHaveAttribute(
      'href',
      '/learn/report',
    );
  });

  it('sends old report links to the submission workspace', async () => {
    const { router } = renderRoute('/learn?project=expense-tracker');
    await screen.findByRole('heading', { level: 1, name: 'Submission workspace' });
    expect(router.state.location.pathname).toBe('/learn/report');
    expect(router.state.location.search).toBe('?project=expense-tracker');
  });

  it('lists projects for viva practice', async () => {
    renderRoute('/viva');
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Viva practice' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: 'Viva practice for Student Result Analyzer' }),
    ).toHaveAttribute('href', '/projects/student-result-analyzer/viva');
  });
});
