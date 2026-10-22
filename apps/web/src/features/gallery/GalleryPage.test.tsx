import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import { renderRoute } from '../../test/render.tsx';

function resultNames(): string[] {
  const list = screen.queryAllByRole('list').find((element) => element.querySelector('article'));
  if (!list) return [];
  return within(list)
    .getAllByRole('heading', { level: 2 })
    .map((heading) => heading.textContent ?? '');
}

function sidebar() {
  return within(screen.getByRole('complementary', { name: 'Filters' }));
}

describe('project gallery', () => {
  it('lists every project with its real count', () => {
    renderRoute('/projects');
    expect(screen.getByRole('status')).toHaveTextContent('3 projects');
    expect(resultNames()).toEqual([
      'Personal Expense Tracker',
      'Student Attendance System',
      'Student Result Analyzer',
    ]);
  });

  it('restores filters from a shared URL and shows them as removable chips', async () => {
    const user = userEvent.setup();
    const { router } = renderRoute('/projects?q=pandas&difficulty=intermediate');
    expect(screen.getByRole('searchbox', { name: 'Search' })).toHaveValue('pandas');
    expect(screen.getByRole('status')).toHaveTextContent('Showing 1 of 3 projects');
    expect(resultNames()).toEqual(['Student Result Analyzer']);

    const chips = within(screen.getByRole('group', { name: 'Active filters' }));
    await user.click(chips.getByRole('button', { name: 'Remove filter “pandas”' }));
    expect(router.state.location.search).toBe('?difficulty=intermediate');
    expect(resultNames()).toEqual(['Personal Expense Tracker', 'Student Result Analyzer']);
  });

  it('searches as you type, keeping spaces between words', async () => {
    const user = userEvent.setup();
    const { router } = renderRoute('/projects');
    const search = screen.getByRole('searchbox', { name: 'Search' });
    await user.type(search, 'react typescript ');
    expect(search).toHaveValue('react typescript ');
    expect(router.state.location.search).toBe('?q=react+typescript');
    expect(resultNames()).toEqual(['Personal Expense Tracker', 'Student Attendance System']);

    // Changing the address elsewhere (here: removing the filter chip) updates the box.
    await user.click(screen.getByRole('button', { name: 'Remove filter “react typescript”' }));
    expect(search).toHaveValue('');
    expect(resultNames()).toHaveLength(3);
  });

  it('filters with checkboxes, keeps the URL in sync and shows counts per option', async () => {
    const user = userEvent.setup();
    const { router } = renderRoute('/projects');
    const panel = sidebar();
    expect(panel.getByRole('checkbox', { name: 'Beginner, 1 project' })).toBeInTheDocument();

    await user.click(panel.getByRole('checkbox', { name: /^TypeScript/ }));
    expect(router.state.location.search).toBe('?language=TypeScript');
    expect(resultNames()).toEqual(['Personal Expense Tracker', 'Student Attendance System']);
    // Counts in other groups reflect the current results.
    expect(panel.getByRole('checkbox', { name: 'Data analysis, 0 projects' })).toBeInTheDocument();

    await user.click(panel.getByRole('checkbox', { name: /^Beginner/ }));
    expect(router.state.location.search).toBe('?difficulty=beginner&language=TypeScript');
    expect(resultNames()).toEqual(['Student Attendance System']);
  });

  it('sorts results', async () => {
    const user = userEvent.setup();
    const { router } = renderRoute('/projects');
    await user.selectOptions(screen.getByRole('combobox', { name: 'Sort by' }), 'difficulty');
    expect(router.state.location.search).toBe('?sort=difficulty');
    expect(resultNames()[0]).toBe('Student Attendance System');
  });

  it('explains empty results and resets the filters', async () => {
    const user = userEvent.setup();
    const { router } = renderRoute('/projects?category=ai-ml&sort=newest');
    expect(
      screen.getByRole('heading', { name: 'No projects match these filters' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Propose a project' })).toHaveAttribute(
      'href',
      '/docs/adding-a-template',
    );

    await user.click(screen.getAllByRole('button', { name: 'Reset filters' })[0] as HTMLElement);
    expect(router.state.location.search).toBe('?sort=newest');
    expect(resultNames()).toHaveLength(3);
  });

  it('opens the filter dialog on small screens', async () => {
    const user = userEvent.setup();
    renderRoute('/projects?language=Python');
    await user.click(screen.getByRole('button', { name: 'Filters (1)' }));
    const dialog = screen.getByRole('dialog', { name: 'Filter projects' });
    expect(within(dialog).getByRole('checkbox', { name: /^Python/ })).toBeChecked();
    await user.click(within(dialog).getByRole('button', { name: 'Show 1 project' }));
    expect(screen.queryByRole('dialog')).toBeNull();
  });
});
