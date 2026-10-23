import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import { renderRoute } from '../../test/render.tsx';

describe('learning studio', () => {
  it('opens on the overview and moves between sections with the section links', async () => {
    const user = userEvent.setup();
    const { router } = renderRoute('/projects/attendance-system/learn');
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Learning studio' }),
    ).toBeInTheDocument();
    expect(
      await screen.findByRole('heading', { name: 'You should already know' }),
    ).toBeInTheDocument();
    expect(screen.getByText(/0 of 16 ticked/)).toBeInTheDocument();

    const sections = within(screen.getByRole('navigation', { name: 'Learning studio sections' }));
    await user.click(sections.getByRole('link', { name: 'Architecture' }));
    expect(router.state.location.pathname).toBe('/projects/attendance-system/learn/architecture');
    expect(await screen.findByRole('heading', { level: 2, name: 'Architecture' })).toHaveFocus();
  });

  it('explains each component with links to the real files and definitions', async () => {
    const user = userEvent.setup();
    renderRoute('/projects/attendance-system/learn/architecture');
    await user.click(await screen.findByRole('button', { name: 'localStorage persistence' }));
    expect(screen.getByRole('button', { name: 'localStorage persistence' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(screen.getByRole('link', { name: 'src/lib/storage.ts' })).toHaveAttribute(
      'href',
      '/projects/attendance-system/source?file=src%2Flib%2Fstorage.ts',
    );
    expect(screen.getByRole('link', { name: 'validateData' })).toHaveAttribute(
      'href',
      '/projects/attendance-system/source?file=src%2Flib%2Fstorage.ts&symbol=validateData',
    );
    expect(screen.getByRole('heading', { name: /Saving a day.s attendance/ })).toBeInTheDocument();
  });

  it('walks through files one at a time', async () => {
    const user = userEvent.setup();
    const { router } = renderRoute('/projects/student-result-analyzer/learn/code');
    expect(await screen.findByRole('heading', { name: 'The Streamlit app' })).toBeInTheDocument();
    await user.click(screen.getByRole('link', { name: /Validating the CSV/ }));
    expect(router.state.location.search).toBe('?entry=validation');
    expect(await screen.findByRole('link', { name: 'validate_results' })).toHaveAttribute(
      'href',
      '/projects/student-result-analyzer/source?file=analyzer%2Fvalidation.py&symbol=validate_results',
    );
  });

  it('saves checklist ticks in this browser and resets them after confirmation', async () => {
    const user = userEvent.setup();
    const first = renderRoute('/projects/expense-tracker/learn/checklist');
    const item = await screen.findByRole('checkbox', {
      name: /Explain why amounts are stored in minor units/,
    });
    await user.click(item);
    expect(screen.getByText('1 of 16 ticked')).toBeInTheDocument();
    first.unmount();

    renderRoute('/projects/expense-tracker/learn/checklist');
    expect(
      await screen.findByRole('checkbox', {
        name: /Explain why amounts are stored in minor units/,
      }),
    ).toBeChecked();
    await user.click(screen.getByRole('button', { name: 'Reset checklist' }));
    const dialog = await screen.findByRole('dialog', { name: 'Reset the checklist?' });
    await user.click(within(dialog).getByRole('button', { name: 'Reset checklist' }));
    expect(screen.getByText('0 of 16 ticked')).toBeInTheDocument();
    expect(window.localStorage.getItem('campuskit:checklist:v1:expense-tracker')).toBeNull();
  });

  it('separates problems seen during verification from general advice, and filters them', async () => {
    const user = userEvent.setup();
    renderRoute('/projects/student-result-analyzer/learn/troubleshooting');
    expect(
      await screen.findByText('Creating .venv fails with an ensurepip error'),
    ).toBeInTheDocument();
    expect(screen.getAllByText('Seen during verification')).toHaveLength(1);
    expect(screen.getAllByText('General advice').length).toBeGreaterThan(5);

    await user.type(
      screen.getByRole('searchbox', { name: /Search by error message/ }),
      'ensurepip',
    );
    expect(screen.getByText(/1 of \d+ problems match/)).toBeInTheDocument();
    await user.clear(screen.getByRole('searchbox', { name: /Search by error message/ }));
    await user.type(screen.getByRole('searchbox', { name: /Search by error message/ }), 'zzzz');
    expect(screen.getByText('Nothing matches “zzzz”.')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Show all problems' }));
    expect(screen.getByText(/^\d+ problems$/)).toBeInTheDocument();
  });

  it('redirects unknown sections to the overview', async () => {
    const { router } = renderRoute('/projects/attendance-system/learn/nope');
    await screen.findByRole('heading', { level: 1, name: 'Learning studio' });
    expect(router.state.location.pathname).toBe('/projects/attendance-system/learn');
  });
});
