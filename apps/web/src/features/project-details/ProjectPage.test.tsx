import { getProjectById } from '@campuskit/project-catalog';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import { renderRoute } from '../../test/render.tsx';

describe('project page', () => {
  it('shows everything a student needs from the manifest', async () => {
    const project = getProjectById('student-result-analyzer');
    if (!project) throw new Error('missing project');
    renderRoute(`/projects/${project.slug}`);

    expect(screen.getByRole('heading', { level: 1, name: project.name })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Customize and download' })).toHaveAttribute(
      'href',
      `/generate?template=${project.id}`,
    );

    const overview = within(screen.getByRole('region', { name: 'Overview' }));
    for (const feature of project.features) expect(overview.getByText(feature)).toBeInTheDocument();
    for (const limitation of project.limitations)
      expect(overview.getByText(limitation)).toBeInTheDocument();

    const setup = within(screen.getByRole('region', { name: 'Setup' }));
    for (const prerequisite of project.prerequisites)
      expect(setup.getAllByText(prerequisite.name).length).toBeGreaterThan(0);
    const commands = (platform: string) =>
      project.setup.steps.flatMap((step) =>
        step.commands
          .filter((command) => command.platform === platform)
          .map((command) => command.command),
      );
    // jsdom's user agent is not Windows, so macOS / Linux commands are shown first.
    for (const command of [...commands('all'), ...commands('macos-linux')])
      expect(setup.getAllByText(command).length).toBeGreaterThan(0);
    expect(setup.queryByText('python -m venv .venv')).toBeNull();
    await userEvent.setup().click(setup.getByRole('radio', { name: 'Windows' }));
    for (const command of [...commands('all'), ...commands('windows')])
      expect(setup.getAllByText(command).length).toBeGreaterThan(0);
    expect(setup.queryByText('source .venv/bin/activate')).toBeNull();

    const customization = within(screen.getByRole('region', { name: 'Customization' }));
    for (const option of project.customization.options)
      expect(customization.getByText(option.label)).toBeInTheDocument();

    const testing = within(screen.getByRole('region', { name: 'Testing' }));
    expect(testing.getAllByText('python -m pytest').length).toBeGreaterThan(0);

    const learn = within(screen.getByRole('region', { name: 'Learn and present' }));
    for (const objective of project.learningObjectives)
      expect(learn.getByText(objective)).toBeInTheDocument();

    const documentation = within(screen.getByRole('region', { name: 'Documentation' }));
    for (const doc of project.docs) {
      expect(documentation.getByRole('link', { name: new RegExp(doc.title) })).toHaveAttribute(
        'href',
        `/projects/${project.slug}/docs/${doc.kind}`,
      );
    }
  });

  it('shows real screenshots with alt text', () => {
    const project = getProjectById('attendance-system');
    if (!project) throw new Error('missing project');
    renderRoute(`/projects/${project.slug}`);
    const first = project.media.screenshots[0];
    if (!first) throw new Error('missing screenshot');
    expect(
      screen.getByRole('button', { name: `Enlarge screenshot: ${first.caption ?? first.alt}` }),
    ).toBeInTheDocument();
    expect(screen.getAllByRole('img', { name: first.alt }).length).toBeGreaterThan(0);
  });

  it('shows the not-found page for an unknown project', () => {
    renderRoute('/projects/does-not-exist');
    expect(
      screen.getByRole('heading', { level: 1, name: 'This page doesn’t exist' }),
    ).toBeInTheDocument();
  });

  it('explains the template’s verification status and suggests related projects', () => {
    renderRoute('/projects/attendance-system');
    const verification = within(screen.getByRole('region', { name: 'Verification' }));
    expect(
      verification.getByRole('heading', { name: 'Checked before every release of this site' }),
    ).toBeInTheDocument();
    expect(
      verification.getByText('pnpm verify:generated attendance-system --record'),
    ).toBeInTheDocument();

    const related = within(screen.getByRole('region', { name: 'Related projects' }));
    expect(related.getByRole('link', { name: 'Personal Expense Tracker' })).toBeInTheDocument();
    expect(related.getByText(/Also uses TypeScript, React/)).toBeInTheDocument();
  });
});
