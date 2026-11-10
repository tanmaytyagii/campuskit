import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import { aiKeyStore } from '../../lib/ai.ts';
import { PROFILE_KEY } from '../../lib/profile.ts';
import { WORKSPACE_KEY, type WorkspaceState } from '../../lib/workspace.ts';
import { renderRoute } from '../../test/render.tsx';
import { SAMPLE_MILESTONES } from './WelcomePage.tsx';

const profile = () =>
  JSON.parse(window.localStorage.getItem(PROFILE_KEY) ?? 'null') as Record<string, unknown> | null;

describe('welcome guide', () => {
  it('walks through three steps and creates a sample project from a suggestion', async () => {
    const user = userEvent.setup();
    renderRoute('/welcome');
    expect(await screen.findByText('Step 1 of 3')).toBeInTheDocument();
    await user.type(screen.getByRole('textbox', { name: /^Your first name/ }), 'Asha');
    await user.click(screen.getByRole('radio', { name: /^Undergraduate/ }));
    await user.click(screen.getByRole('button', { name: 'Next' }));
    expect(screen.getByRole('heading', { level: 2, name: 'Your interests' })).toHaveFocus();
    await user.click(screen.getByRole('checkbox', { name: 'Databases and SQL' }));
    await user.click(screen.getByRole('button', { name: 'Next' }));
    expect(screen.getByText('Step 3 of 3')).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { level: 3, name: 'Student Management System' }),
    ).toBeInTheDocument();
    expect(screen.getByText('Matches your interest: Databases and SQL')).toBeInTheDocument();
    await user.click(
      screen.getByRole('button', { name: 'Start a sample project from Student Management System' }),
    );

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Sample: Student Management System' }),
    ).toBeInTheDocument();
    const saved = JSON.parse(window.localStorage.getItem(WORKSPACE_KEY) ?? '{}') as WorkspaceState;
    expect(saved.projects[0]).toMatchObject({
      tags: ['sample'],
      templateId: 'student-management-system',
    });
    expect(saved.projects[0]?.milestones.map((item) => item.title)).toEqual(SAMPLE_MILESTONES);
    expect(profile()).toMatchObject({
      name: 'Asha',
      level: 'undergraduate',
      interests: ['databases'],
      onboarded: true,
    });
  });

  it('can be skipped from any step', async () => {
    const user = userEvent.setup();
    renderRoute('/welcome');
    await user.click(await screen.findByRole('button', { name: 'Skip setup' }));
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Your dashboard' }),
    ).toBeInTheDocument();
    expect(profile()).toMatchObject({ onboarded: true });
    expect(screen.queryByText('New to CampusKit?')).not.toBeInTheDocument();
  });
});

describe('settings', () => {
  it('edits the profile and the theme', async () => {
    const user = userEvent.setup();
    renderRoute('/settings');
    await user.type(await screen.findByRole('textbox', { name: /^First name/ }), 'Ravi');
    await user.selectOptions(
      screen.getByRole('combobox', { name: 'Where you’re studying' }),
      'school',
    );
    await user.click(screen.getByRole('checkbox', { name: 'Python' }));
    await user.click(screen.getByRole('button', { name: 'Save profile' }));
    expect(await screen.findByText('Saved your profile.')).toBeInTheDocument();
    expect(profile()).toMatchObject({ name: 'Ravi', level: 'school', interests: ['python'] });
    await user.click(screen.getByRole('radio', { name: 'Dark' }));
    await waitFor(() => expect(document.documentElement).toHaveClass('dark'));
  });

  it('deletes everything CampusKit saved, after a confirmation, and nothing else', async () => {
    window.localStorage.setItem(
      'campuskit:checklist:v1:expense-tracker',
      '{"version":1,"done":["a"]}',
    );
    window.localStorage.setItem('someone-else', 'keep me');
    aiKeyStore.set('sk-ant-test-not-a-real-key-0001', false);
    const user = userEvent.setup();
    renderRoute('/settings');
    await user.click(
      await screen.findByRole('button', { name: 'Delete all CampusKit data in this browser' }),
    );
    const dialog = await screen.findByRole('alertdialog', {
      name: 'Delete all CampusKit data in this browser?',
    });
    await user.click(within(dialog).getByRole('button', { name: 'Delete everything' }));
    expect(
      await screen.findByText('Deleted everything CampusKit saved in this browser.'),
    ).toBeInTheDocument();
    expect(Object.keys(window.localStorage).filter((key) => key.startsWith('campuskit:'))).toEqual(
      [],
    );
    expect(window.localStorage.getItem('someone-else')).toBe('keep me');
    expect(aiKeyStore.getSnapshot().key).toBe('');
  });

  it('reopens the welcome guide', async () => {
    const user = userEvent.setup();
    renderRoute('/settings');
    await user.click(await screen.findByRole('button', { name: 'Open the welcome guide' }));
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Set up CampusKit' }),
    ).toBeInTheDocument();
  });
});
