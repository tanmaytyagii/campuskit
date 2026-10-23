import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import { renderRoute } from '../../test/render.tsx';

describe('compare page', () => {
  it('compares the projects chosen, from their manifests', async () => {
    const user = userEvent.setup();
    const { router } = renderRoute('/compare');
    expect(
      await screen.findByText('Choose at least two projects to see the comparison.'),
    ).toBeInTheDocument();
    await user.click(screen.getByRole('checkbox', { name: /Student Attendance System/ }));
    await user.click(screen.getByRole('checkbox', { name: /Student Result Analyzer/ }));
    expect(router.state.location.search).toBe('?ids=attendance-system%2Cstudent-result-analyzer');

    const table = within(screen.getByRole('table', { name: 'Project comparison' }));
    expect(table.getByRole('rowheader', { name: 'Server' })).toBeInTheDocument();
    expect(table.getByText('No server: everything runs in the browser')).toBeInTheDocument();
    expect(table.getByText('A small server that runs on your own computer')).toBeInTheDocument();
    expect(screen.getByText('Both run offline once installed.')).toBeInTheDocument();
  });

  it('groups the comparison by attribute for small screens', async () => {
    renderRoute('/compare?ids=attendance-system,student-result-analyzer');
    // jsdom applies no CSS, so both layouts are present. The phone layout lists
    // each attribute with every chosen project's value under it.
    const server = within(await screen.findByRole('region', { name: 'Server' }));
    expect(server.getAllByRole('term').map((term) => term.textContent)).toEqual([
      'Student Attendance System',
      'Student Result Analyzer',
    ]);
    expect(server.getByText('No server: everything runs in the browser')).toBeInTheDocument();
    expect(server.getByText('A small server that runs on your own computer')).toBeInTheDocument();
  });

  it('allows at most three projects', async () => {
    renderRoute('/compare?ids=attendance-system,expense-tracker,student-result-analyzer');
    const boxes = await screen.findAllByRole('checkbox');
    expect(boxes.every((box) => (box as HTMLInputElement).checked)).toBe(true);
    expect(screen.getByText(/3 of 3 chosen/)).toBeInTheDocument();
  });

  it('suggests projects for a goal with the rule it used', async () => {
    const user = userEvent.setup();
    renderRoute('/compare');
    await user.click(await screen.findByRole('radio', { name: 'A database-oriented project' }));
    expect(screen.getByText('It saves data between runs.')).toBeInTheDocument();
    expect(screen.getByText(/No project uses a database yet/)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Compare these' }));
    expect(await screen.findByRole('table', { name: 'Project comparison' })).toBeInTheDocument();
  });
});
