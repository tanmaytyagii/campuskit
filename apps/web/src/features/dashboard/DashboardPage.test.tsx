import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import {
  addMilestone,
  createProject,
  EMPTY_WORKSPACE,
  setStatus,
  workspaceStore,
} from '../../lib/workspace.ts';
import { addDays } from '../viva/logic.ts';
import { todayIso } from '../../lib/format.ts';
import { renderRoute } from '../../test/render.tsx';

const NOW = '2026-10-31T09:00:00.000Z';

function details(title: string) {
  return {
    title,
    description: '',
    category: 'web' as const,
    status: 'planning' as const,
    tags: [],
    stack: [],
    templateId: null,
  };
}

describe('dashboard', () => {
  it('starts empty and offers the welcome guide, which can be put off', async () => {
    const user = userEvent.setup();
    renderRoute('/dashboard');
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Your dashboard' }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        'No open milestones with a deadline. Add milestones to a project to see them here.',
      ),
    ).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Not now' }));
    expect(screen.queryByText('New to CampusKit?')).not.toBeInTheDocument();
  });

  it('counts projects and shows deadlines and activity from them', async () => {
    const today = todayIso();
    let state = createProject(EMPTY_WORKSPACE, details('Alpha'), NOW, 'a').state;
    state = createProject(state, details('Beta'), NOW, 'b').state;
    state = setStatus(state, 'a', 'in-progress', NOW);
    state = addMilestone(state, 'a', { title: 'Late step', due: addDays(today, -2) }, NOW);
    state = addMilestone(state, 'b', { title: 'Soon step', due: addDays(today, 3) }, NOW);
    state = addMilestone(state, 'b', { title: 'Far step', due: addDays(today, 40) }, NOW);
    workspaceStore.update(() => state);
    window.localStorage.setItem(
      'campuskit:viva:v1:expense-tracker',
      JSON.stringify({
        version: 1,
        questions: {
          budget: {
            outcome: 'missed',
            ratings: {
              correctness: 'not-yet',
              understanding: 'not-yet',
              clarity: 'not-yet',
              limitations: 'not-yet',
            },
            attempts: 1,
            lastPracticed: addDays(today, -3),
          },
        },
      }),
    );
    renderRoute('/dashboard');
    await screen.findByRole('heading', { level: 1 });
    const tile = (label: string) => screen.getByText(label, { selector: 'dt' }).parentElement;
    expect(tile('Projects')).toHaveTextContent('2');
    expect(tile('In progress')).toHaveTextContent('1');
    expect(tile('Deadlines in the next 14 days')).toHaveTextContent('2' + '1 overdue');
    const deadlines = screen.getByRole('region', { name: 'Upcoming deadlines' });
    expect(
      within(deadlines)
        .getAllByRole('listitem')
        .map((item) => item.textContent),
    ).toEqual([
      expect.stringContaining('Late step'),
      expect.stringContaining('Soon step'),
      expect.stringContaining('Far step'),
    ]);
    expect(within(deadlines).getByText(/overdue/)).toBeInTheDocument();
    const activity = screen.getByRole('region', { name: 'Recent activity' });
    expect(within(activity).getAllByText(/Milestone “/).length).toBeGreaterThan(0);
    const viva = screen.getByRole('region', { name: 'Viva preparation' });
    expect(viva).toHaveTextContent('1 question practised, 0 confident, 1 due for review');
  });

  it('greets the student by the name in their profile', async () => {
    window.localStorage.setItem(
      'campuskit:profile:v1',
      JSON.stringify({ version: 1, name: 'Asha', level: null, interests: [], onboarded: true }),
    );
    renderRoute('/dashboard');
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Welcome back, Asha' }),
    ).toBeInTheDocument();
    expect(screen.queryByText('New to CampusKit?')).not.toBeInTheDocument();
  });
});
