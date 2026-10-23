import { catalog } from '@campuskit/project-catalog';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import { missingRepoDocs, REPO_DOCS } from './lib/repo-docs.ts';
import { getTemplateStatus } from './lib/verification.ts';
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

    // The verification claim in the hero is counted from the real records, not written by hand.
    const verified = catalog.filter(
      (project) => getTemplateStatus(project).id === 'verified',
    ).length;
    expect(
      screen.getByText(`${verified} of ${catalog.length} templates verified end to end`),
    ).toBeInTheDocument();

    // The product tour shows labelled screenshots of the real pages, one tab per feature.
    const tour = screen.getByRole('tablist', { name: 'CampusKit features' });
    expect(within(tour).getAllByRole('tab')).toHaveLength(5);
    expect(within(tour).getByRole('tab', { name: 'Discover' })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    expect(screen.getByText(/Screenshots of the real pages/)).toBeInTheDocument();

    const learning = screen.getByRole('region', {
      name: 'Learn the project well enough to explain it',
    });
    for (const [name, href] of [
      [/Learning studio/, '/learn'],
      [/Viva practice/, '/viva'],
      [/Submission workspace/, '/learn/report'],
      [/Compare projects/, '/compare'],
    ] as const) {
      expect(within(learning).getByRole('link', { name })).toHaveAttribute('href', href);
    }

    const closing = screen.getByRole('region', { name: 'Ready when you are' });
    expect(within(closing).getByRole('link', { name: 'Browse all projects' })).toHaveAttribute(
      'href',
      '/projects',
    );
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

  it('lists every main section in the header navigation', () => {
    renderRoute('/');
    const nav = screen.getAllByRole('navigation', { name: 'Main' })[0];
    if (!nav) throw new Error('missing main navigation');
    expect(
      within(nav)
        .getAllByRole('link')
        .map((link) => link.textContent),
    ).toEqual(['Projects', 'Generator', 'Learn', 'Viva practice', 'Compare', 'Docs']);
    expect(within(nav).getByRole('link', { name: 'Compare' })).toHaveAttribute('href', '/compare');
  });

  it('searches the gallery from the header search field', async () => {
    const user = userEvent.setup();
    const { router } = renderRoute('/compare');
    const [search] = screen.getAllByRole('searchbox', { name: 'Search projects' });
    if (!search) throw new Error('missing header search');

    await user.type(search, 'budget tracker{Enter}');
    expect(router.state.location.pathname).toBe('/projects');
    expect(new URLSearchParams(router.state.location.search).get('q')).toBe('budget tracker');
    expect(await screen.findByRole('heading', { level: 1, name: 'Projects' })).toBeInTheDocument();
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
