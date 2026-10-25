import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import { renderRoute } from '../../test/render.tsx';

describe('presentation mode', () => {
  it('moves through the slides with the keyboard and buttons', async () => {
    const user = userEvent.setup();
    const { router } = renderRoute('/projects/attendance-system/present');
    const title = await screen.findByRole('heading', {
      level: 1,
      name: 'Student Attendance System',
    });
    await waitFor(() => expect(title).toHaveFocus());
    expect(screen.getByText(/Introduction · Slide 1 of \d+/)).toBeInTheDocument();
    expect(screen.getByText('From the project’s manifest')).toBeInTheDocument();
    // No site header or footer: the slide fills the screen.
    expect(screen.queryByRole('navigation', { name: 'Main' })).not.toBeInTheDocument();

    await user.keyboard('{ArrowRight}');
    expect(await screen.findByRole('heading', { level: 1, name: 'The problem' })).toHaveFocus();
    expect(router.state.location.search).toBe('?slide=problem');
    await user.keyboard('{End}');
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Conclusion' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Next' })).toBeDisabled();
    await user.keyboard('{Home}');
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Student Attendance System' }),
    ).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Next' }));
    await user.click(screen.getByRole('button', { name: 'Next' }));
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Learning objectives' }),
    ).toBeInTheDocument();
    await user.keyboard('{ArrowLeft}');
    expect(
      await screen.findByRole('heading', { level: 1, name: 'The problem' }),
    ).toBeInTheDocument();
  });

  it('shows and hides the speaking notes, labelled as CampusKit’s suggestions', async () => {
    const user = userEvent.setup();
    renderRoute('/projects/attendance-system/present?slide=architecture');
    await screen.findByRole('heading', { level: 1, name: 'Architecture' });
    const notes = screen.getByRole('complementary', { name: 'Speaking notes' });
    expect(within(notes).getByText(/suggested by CampusKit/)).toBeInTheDocument();
    expect(
      screen.getByText('From the project’s learning guide, checked against its code'),
    ).toBeInTheDocument();
    const toggle = screen.getByRole('button', { name: 'Speaking notes' });
    expect(toggle).toHaveAttribute('aria-pressed', 'true');
    await user.keyboard('n');
    expect(toggle).toHaveAttribute('aria-pressed', 'false');
    expect(screen.queryByRole('complementary', { name: 'Speaking notes' })).not.toBeInTheDocument();
    await user.click(toggle);
    expect(screen.getByRole('complementary', { name: 'Speaking notes' })).toBeInTheDocument();
  });

  it('runs the live demo on demo slides without the keys moving the slides', async () => {
    const user = userEvent.setup();
    const { router } = renderRoute('/projects/attendance-system/present?slide=demo-search');
    await screen.findByRole('heading', { level: 1, name: 'Find students' });
    const search = await screen.findByRole('searchbox', { name: 'Search' });
    await user.type(search, 'Diya ');
    await user.keyboard('{ArrowRight}');
    expect(router.state.location.search).toBe('?slide=demo-search');
    expect(screen.getByText('Showing 1 of 12 students')).toBeInTheDocument();
  });

  it('jumps to a slide from the list and exits with Escape', async () => {
    const user = userEvent.setup();
    const { router } = renderRoute('/projects/student-result-analyzer/present');
    await screen.findByRole('heading', { level: 1, name: 'Student Result Analyzer' });
    await user.selectOptions(screen.getByRole('combobox', { name: 'Go to slide' }), 'limitations');
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Limitations' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Exit' })).toHaveAttribute(
      'href',
      '/projects/student-result-analyzer',
    );
    await user.keyboard('{Escape}');
    await waitFor(() =>
      expect(router.state.location.pathname).toBe('/projects/student-result-analyzer'),
    );
  });
});
