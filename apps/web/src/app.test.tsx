import { catalog } from '@campuskit/project-catalog';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import { missingRepoDocs, REPO_DOCS } from './lib/repo-docs.ts';
import { renderRoute } from './test/render.tsx';

const NOT_FOUND = 'This page doesn’t exist';

describe('site shell and navigation', () => {
  it('renders the home page with its main actions and real catalog content', () => {
    renderRoute('/');
    expect(
      screen.getByRole('heading', { level: 1, name: 'Build it. Understand it. Present it.' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Generate a project' })).toHaveAttribute(
      'href',
      '/generate',
    );
    expect(screen.getByRole('link', { name: 'Explore projects' })).toHaveAttribute(
      'href',
      '/projects',
    );

    const featured = screen.getByRole('region', { name: 'Featured projects' });
    for (const project of catalog.filter((item) => item.featured)) {
      expect(within(featured).getByRole('heading', { name: project.name })).toBeInTheDocument();
    }
    // Category counts come from the catalog; empty categories say so instead of showing a fake number.
    const categories = screen.getByRole('region', { name: 'Browse by category' });
    expect(
      within(categories).getByRole('link', { name: /AI and machine learning.*No projects yet/ }),
    ).toHaveAttribute('href', '/docs/adding-a-template');
    expect(within(categories).getByRole('link', { name: /Python.*1 project$/ })).toHaveAttribute(
      'href',
      '/projects?language=Python',
    );

    const recent = screen.getByRole('table', { name: 'Projects by date added' });
    expect(within(recent).getAllByRole('row')).toHaveLength(catalog.length + 1);
  });

  it('navigates between pages from the header', async () => {
    const user = userEvent.setup();
    const { router } = renderRoute('/');
    const nav = screen.getAllByRole('navigation', { name: 'Main' })[0];
    if (!nav) throw new Error('missing main navigation');

    await user.click(within(nav).getByRole('link', { name: 'Projects' }));
    expect(router.state.location.pathname).toBe('/projects');
    expect(await screen.findByRole('heading', { level: 1, name: 'Projects' })).toBeInTheDocument();
    expect(within(nav).getByRole('link', { name: 'Projects' })).toHaveAttribute(
      'aria-current',
      'page',
    );

    await user.click(within(nav).getByRole('link', { name: 'Generator' }));
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Generate a project' }),
    ).toBeInTheDocument();
    // Focus moves to the new page content after navigating.
    expect(screen.getByRole('main')).toHaveFocus();
  });

  it('shows a helpful 404 page for unknown addresses', () => {
    renderRoute('/no-such-page');
    expect(screen.getByRole('heading', { level: 1, name: NOT_FOUND })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Browse projects' })).toHaveAttribute(
      'href',
      '/projects',
    );
  });

  it('opens and closes the mobile menu with the keyboard', async () => {
    const user = userEvent.setup();
    renderRoute('/');
    const toggle = screen.getByRole('button', { name: 'Open menu' });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');

    await user.click(toggle);
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    expect(toggle).toHaveAccessibleName('Close menu');
    const menu = document.getElementById(toggle.getAttribute('aria-controls') ?? '');
    expect(menu).toBeVisible();

    await user.keyboard('{Escape}');
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(toggle).toHaveFocus();

    // Choosing a page closes the menu.
    await user.click(toggle);
    if (!menu) throw new Error('missing menu');
    await user.click(within(menu).getByRole('link', { name: 'Learn' }));
    await waitFor(() => expect(toggle).toHaveAttribute('aria-expanded', 'false'));
  });

  it('switches and remembers the colour theme', async () => {
    const user = userEvent.setup();
    const first = renderRoute('/');
    await user.click(screen.getByRole('radio', { name: 'Dark theme' }));
    expect(document.documentElement).toHaveClass('dark');
    expect(window.localStorage.getItem('campuskit:theme')).toBe('"dark"');
    first.unmount();

    renderRoute('/projects');
    expect(screen.getByRole('radio', { name: 'Dark theme' })).toBeChecked();
    expect(document.documentElement).toHaveClass('dark');
  });

  it('suggests projects while typing in the home search', async () => {
    const user = userEvent.setup();
    const { router } = renderRoute('/');
    const search = screen.getByRole('combobox', { name: 'Search projects' });

    await user.type(search, 'pandas');
    const list = screen.getByRole('listbox', { name: 'Suggestions' });
    expect(
      within(list).getByRole('option', { name: /Student Result Analyzer/ }),
    ).toBeInTheDocument();

    await user.keyboard('{ArrowDown}');
    expect(search).toHaveAttribute('aria-activedescendant');
    await user.keyboard('{Enter}');
    expect(router.state.location.pathname).toBe('/projects/student-result-analyzer');
  });

  it('searches the gallery when no suggestion is chosen', async () => {
    const user = userEvent.setup();
    const { router } = renderRoute('/');
    await user.type(screen.getByRole('combobox', { name: 'Search projects' }), 'charts{Enter}');
    expect(router.state.location.pathname).toBe('/projects');
    expect(router.state.location.search).toBe('?q=charts');
  });
});

describe('links', () => {
  it('includes every document the site links to', () => {
    expect(missingRepoDocs()).toEqual([]);
  });

  it('has no internal links to missing pages', async () => {
    const pages = [
      '/',
      '/projects',
      '/learn',
      '/viva',
      '/compare',
      '/docs',
      ...catalog.map((project) => `/projects/${project.slug}`),
      ...catalog.map((project) => `/projects/${project.slug}/learn`),
    ];
    const targets = new Set<string>();
    for (const page of pages) {
      const view = renderRoute(page);
      await screen.findAllByRole('heading', { level: 1 });
      for (const link of view.container.querySelectorAll<HTMLAnchorElement>('a[href^="/"]')) {
        targets.add(link.getAttribute('href') ?? '');
      }
      view.unmount();
    }
    for (const doc of REPO_DOCS) expect(targets).toContain(`/docs/${doc.slug}`);

    for (const target of targets) {
      const view = renderRoute(target);
      await screen.findAllByRole('heading', { level: 1 });
      expect(
        screen.queryByRole('heading', { name: NOT_FOUND }),
        `${target} should not be a dead link`,
      ).toBeNull();
      view.unmount();
    }
  });
});
