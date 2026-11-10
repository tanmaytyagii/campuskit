import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import { createProject, EMPTY_WORKSPACE, WORKSPACE_KEY } from '../../lib/workspace.ts';
import { renderRoute } from '../../test/render.tsx';

function save(templateId: string | null, description = '') {
  const { state } = createProject(
    EMPTY_WORKSPACE,
    {
      title: 'Library Seat Finder',
      description,
      category: 'web',
      status: 'in-progress',
      tags: [],
      stack: ['Flask'],
      templateId,
    },
    '2026-10-31T09:00:00.000Z',
    'p1',
  );
  window.localStorage.setItem(WORKSPACE_KEY, JSON.stringify(state));
}

describe('documentation studio', () => {
  it('drafts a README, listing the parts still to write', async () => {
    save(null);
    renderRoute('/my-projects/p1/docs');
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Documents for Library Seat Finder' }),
    ).toBeInTheDocument();
    expect(screen.getByText('4 parts still to write')).toBeInTheDocument();
    expect(screen.getByText('How to install and run it')).toBeInTheDocument();
    const preview = screen.getByRole('region', { name: 'Preview: README' });
    expect(
      within(preview).getByRole('heading', { name: 'Library Seat Finder' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'project page' })).toHaveAttribute(
      'href',
      '/my-projects/p1',
    );
    expect(screen.getByRole('button', { name: 'Download as Word (.docx)' })).toBeEnabled();
  });

  it('switches to the viva sheet with the linked template’s questions', async () => {
    save('student-management-system', 'Shows free seats.');
    const user = userEvent.setup();
    renderRoute('/my-projects/p1/docs');
    await user.click(await screen.findByRole('radio', { name: 'Viva preparation sheet' }));
    const preview = await screen.findByRole('region', { name: 'Preview: Viva preparation sheet' });
    expect(
      within(preview).getByRole('heading', { name: 'Practice questions' }),
    ).toBeInTheDocument();
    expect(within(preview).getAllByText(/\(not practised yet\)/).length).toBeGreaterThan(0);
  });

  it('is linked from the project page, and says so when the project isn’t here', async () => {
    save(null);
    const user = userEvent.setup();
    renderRoute('/my-projects/p1');
    await user.click(await screen.findByRole('link', { name: 'README and viva sheet' }));
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Documents for Library Seat Finder' }),
    ).toBeInTheDocument();
  });

  it('explains when the project isn’t in this browser', async () => {
    renderRoute('/my-projects/nope/docs');
    expect(await screen.findByText('This project isn’t in this browser')).toBeInTheDocument();
  });
});
