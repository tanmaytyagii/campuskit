import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import { createProject, EMPTY_WORKSPACE, workspaceStore } from '../../lib/workspace.ts';
import { renderRoute } from '../../test/render.tsx';

describe('command palette and shortcuts', () => {
  it('opens with Ctrl+K, finds a page as you type, and opens it with Enter', async () => {
    const user = userEvent.setup();
    renderRoute('/');
    await screen.findByRole('heading', { level: 1 });
    await user.keyboard('{Control>}k{/Control}');
    const dialog = await screen.findByRole('dialog', { name: 'Go to anything' });
    const input = within(dialog).getByRole('combobox', { name: /Search pages, projects/ });
    expect(input).toHaveFocus();
    await user.type(input, 'expense viva');
    const option = within(dialog).getByRole('option', {
      name: 'Personal Expense Tracker: viva practice',
    });
    expect(option).toHaveAttribute('aria-selected', 'true');
    expect(input).toHaveAttribute('aria-activedescendant', option.id);
    await user.keyboard('{Enter}');
    expect(
      await screen.findByRole('heading', { level: 1, name: /Viva practice/ }),
    ).toBeInTheDocument();
    expect(screen.queryByRole('dialog', { name: 'Go to anything' })).not.toBeInTheDocument();
  });

  it('moves through results with the arrow keys and offers your own projects', async () => {
    workspaceStore.update(
      () =>
        createProject(
          EMPTY_WORKSPACE,
          {
            title: 'Library Seat Finder',
            description: '',
            category: 'web',
            status: 'review',
            tags: [],
            stack: [],
            templateId: null,
          },
          '2026-10-31T09:00:00.000Z',
          'p1',
        ).state,
    );
    const user = userEvent.setup();
    renderRoute('/projects');
    await screen.findByRole('heading', { level: 1 });
    await user.click(screen.getByRole('button', { name: 'Go to anything' }));
    const dialog = await screen.findByRole('dialog', { name: 'Go to anything' });
    const input = within(dialog).getByRole('combobox');
    await user.type(input, 'library');
    expect(within(dialog).getByRole('option', { name: /Library Seat Finder/ })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    await user.clear(input);
    const first = within(dialog).getAllByRole('option')[0];
    await user.keyboard('{ArrowDown}');
    expect(first).toHaveAttribute('aria-selected', 'false');
    await user.keyboard('{ArrowUp}{ArrowUp}');
    const all = within(dialog).getAllByRole('option');
    expect(all[all.length - 1]).toHaveAttribute('aria-selected', 'true');
    await user.type(input, 'nothing matches this');
    expect(within(dialog).getByText(/Nothing matches/)).toBeInTheDocument();
  });

  it('runs actions: the dark theme, and the shortcut list', async () => {
    const user = userEvent.setup();
    renderRoute('/');
    await screen.findByRole('heading', { level: 1 });
    await user.keyboard('{Control>}k{/Control}');
    const palette = await screen.findByRole('dialog', { name: 'Go to anything' });
    await user.type(within(palette).getByRole('combobox'), 'dark theme{Enter}');
    await waitFor(() => expect(document.documentElement).toHaveClass('dark'));
    await user.keyboard('?');
    const shortcuts = await screen.findByRole('dialog', { name: 'Keyboard shortcuts' });
    expect(within(shortcuts).getByText('Show these shortcuts')).toBeInTheDocument();
  });

  it('doesn’t open the shortcut list while typing in a field', async () => {
    const user = userEvent.setup();
    renderRoute('/projects');
    await user.type(await screen.findByRole('searchbox', { name: 'Search' }), '?');
    expect(screen.queryByRole('dialog', { name: 'Keyboard shortcuts' })).not.toBeInTheDocument();
  });

  it('remembers visited pages and offers them first', async () => {
    const user = userEvent.setup();
    renderRoute('/demos');
    await screen.findByRole('heading', { level: 1, name: 'Interactive demos' });
    await user.click(screen.getAllByRole('link', { name: 'Projects' })[0]!);
    await screen.findByRole('heading', { level: 1, name: 'Projects' });
    await user.keyboard('{Control>}k{/Control}');
    const dialog = await screen.findByRole('dialog', { name: 'Go to anything' });
    const recent = within(dialog).getByRole('group', { name: 'Recent' });
    expect(within(recent).getByRole('option', { name: 'Interactive demos' })).toBeInTheDocument();
  });
});
