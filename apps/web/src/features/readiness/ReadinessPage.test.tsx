import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import { renderRoute } from '../../test/render.tsx';

function item(title: string) {
  const heading = screen.getByRole('heading', { level: 3, name: title });
  const row = heading.closest('li');
  if (!row) throw new Error(`missing ${title}`);
  return within(row);
}

describe('readiness center', () => {
  it('shows verified items, progress and confirmations with a transparent score', async () => {
    window.localStorage.setItem(
      'campuskit:checklist:v1:attendance-system',
      JSON.stringify({ version: 1, done: ['architecture-layers', 'architecture-lib'] }),
    );
    window.localStorage.setItem(
      'campuskit:rehearsal:v1:attendance-system',
      JSON.stringify({ version: 1, completedOn: '2026-10-24', checkedSteps: 3 }),
    );
    renderRoute('/projects/attendance-system/ready');
    expect(
      await screen.findByRole('heading', {
        level: 1,
        name: 'Getting Student Attendance System ready',
      }),
    ).toBeInTheDocument();
    expect(item('The template passed CampusKit’s checks').getByText('Ready')).toBeInTheDocument();
    expect(item('Understand the architecture').getByText('Ready')).toBeInTheDocument();
    expect(
      item('Rehearse the demonstration').getByText(/Guided demo finished on 24 Oct 2026/),
    ).toBeInTheDocument();
    expect(item('Run the project on your computer').getByText('To do')).toBeInTheDocument();
    // template, setup, architecture and demo are ready: 4 of 11.
    expect(screen.getByText('36%')).toBeInTheDocument();
    expect(screen.getByText(/4 of 11 items/)).toBeInTheDocument();
    expect(screen.getByText(/it isn’t a grade/)).toBeInTheDocument();
    expect(
      item('Practise the viva questions').getByRole('link', { name: 'Viva practice' }),
    ).toHaveAttribute('href', '/projects/attendance-system/viva');
  });

  it('saves the student’s own confirmations and clears them on request', async () => {
    const user = userEvent.setup();
    renderRoute('/projects/attendance-system/ready');
    await screen.findByRole('heading', {
      level: 1,
      name: 'Getting Student Attendance System ready',
    });
    const tests = item('Run the project’s tests');
    await user.click(tests.getByRole('checkbox', { name: 'I’ve done this on my computer' }));
    expect(tests.getByText('Ready')).toBeInTheDocument();
    expect(
      JSON.parse(window.localStorage.getItem('campuskit:readiness:v1:attendance-system') ?? '{}'),
    ).toEqual({
      version: 1,
      done: ['tests'],
    });
    expect(screen.getByText('27%')).toBeInTheDocument();
    // The new score is announced, not only drawn.
    expect(
      screen.getByText(/^Your readiness is now 27%: [\d.]+ of \d+ items\.$/, {
        selector: '[role="status"]',
      }),
    ).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Clear my confirmations' }));
    const dialog = await screen.findByRole('alertdialog', { name: 'Clear your confirmations?' });
    await user.click(within(dialog).getByRole('button', { name: 'Clear confirmations' }));
    expect(item('Run the project’s tests').getByText('To do')).toBeInTheDocument();
    expect(window.localStorage.getItem('campuskit:readiness:v1:attendance-system')).toBeNull();
    expect(screen.getByText('Your confirmations were cleared.')).toBeInTheDocument();
  });

  it('counts a report draft only by its unfinished prompts', async () => {
    window.localStorage.setItem(
      'campuskit:report:v1:attendance-system',
      JSON.stringify({
        info: {},
        sections: { abstract: 'Text with [a prompt] and [another prompt].' },
      }),
    );
    renderRoute('/projects/attendance-system/ready');
    await screen.findByRole('heading', {
      level: 1,
      name: 'Getting Student Attendance System ready',
    });
    const report = item('Finish the report draft');
    expect(report.getByText('In progress')).toBeInTheDocument();
    expect(report.getByText('2 prompts left in your saved draft.')).toBeInTheDocument();
  });
});
