import { screen, within } from '@testing-library/react';
import userEvent, { type UserEvent } from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import { renderRoute } from '../../test/render.tsx';

async function rateAll(user: UserEvent, rating: 'Not yet' | 'Partly' | 'Confident') {
  for (const criterion of [
    'Correctness',
    'Conceptual understanding',
    'Explanation clarity',
    'Awareness of limitations',
  ]) {
    const group = screen.getByRole('group', { name: criterion });
    await user.click(within(group).getByRole('radio', { name: rating }));
  }
}

describe('viva practice', () => {
  it('practises a topic: answer, compare, check key ideas, rate and save', async () => {
    const user = userEvent.setup();
    renderRoute('/projects/expense-tracker/viva');
    await user.selectOptions(
      await screen.findByRole('combobox', { name: 'Topic' }),
      'data-structures',
    );
    await user.click(screen.getByRole('button', { name: 'Start this topic' }));

    const heading = await screen.findByRole('heading', { level: 2, name: /\?$/ });
    expect(heading).toHaveFocus();
    expect(screen.getByText(/Question 1 of 3/)).toBeInTheDocument();
    const compare = screen.getByRole('button', { name: 'Compare with the model answer' });
    expect(compare).toBeDisabled();

    await user.type(screen.getByRole('textbox', { name: 'Your answer' }), 'Something about it.');
    await user.click(compare);
    expect(screen.getByRole('heading', { name: 'Model answer' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Key ideas in your answer' })).toBeInTheDocument();
    expect(screen.getByText(/It can’t tell whether your explanation is right/)).toBeInTheDocument();

    const save = screen.getByRole('button', { name: 'Save rating and continue' });
    expect(save).toBeDisabled();
    await rateAll(user, 'Partly');
    expect(screen.getByText('Result: Needs a little more work.')).toBeInTheDocument();
    await user.click(save);

    expect(await screen.findByText(/Question 2 of 3/)).toBeInTheDocument();
    const saved = JSON.parse(
      window.localStorage.getItem('campuskit:viva:v1:expense-tracker') ?? '{}',
    ) as {
      questions: Record<string, { outcome: string }>;
    };
    expect(Object.values(saved.questions).map((entry) => entry.outcome)).toEqual(['partly']);
    // Typed answers are never saved.
    expect(window.localStorage.getItem('campuskit:viva:v1:expense-tracker')).not.toContain(
      'Something about it',
    );
  });

  it('reveals the answer without one, skips without rating, and ends with a summary', async () => {
    const user = userEvent.setup();
    renderRoute('/projects/attendance-system/viva');
    await user.click(await screen.findByRole('button', { name: 'Start quick practice' }));
    await user.click(await screen.findByRole('button', { name: /I don’t know yet/ }));
    expect(screen.queryByRole('heading', { name: 'Key ideas in your answer' })).toBeNull();
    await user.click(screen.getByRole('button', { name: 'Skip without rating' }));
    await user.click(await screen.findByRole('button', { name: 'End session' }));

    expect(await screen.findByRole('heading', { name: 'Session complete' })).toHaveFocus();
    expect(screen.getByText(/1 skipped without a rating/)).toBeInTheDocument();
    expect(window.localStorage.getItem('campuskit:viva:v1:attendance-system')).toBeNull();
  });

  it('offers questions rated “Not yet” for review, and resets progress after confirmation', async () => {
    const user = userEvent.setup();
    renderRoute('/projects/attendance-system/viva');
    expect(await screen.findByRole('button', { name: 'Start review' })).toBeDisabled();

    await user.click(screen.getByRole('button', { name: 'Start quick practice' }));
    await user.click(await screen.findByRole('button', { name: /I don’t know yet/ }));
    await rateAll(user, 'Not yet');
    await user.click(screen.getByRole('button', { name: 'Save rating and continue' }));
    await user.click(await screen.findByRole('button', { name: 'End session' }));
    await user.click(await screen.findByRole('button', { name: 'Choose another practice mode' }));

    expect(
      await screen.findByText(/1 question you rated “Not yet” or “Partly”/),
    ).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Start review' }));
    expect(await screen.findByText(/Review · Question 1 of 1/)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'End session' }));
    await user.click(await screen.findByRole('button', { name: 'Choose another practice mode' }));

    await user.click(await screen.findByRole('button', { name: 'Reset viva progress' }));
    const dialog = await screen.findByRole('dialog', { name: 'Reset viva progress?' });
    await user.click(within(dialog).getByRole('button', { name: 'Reset viva progress' }));
    expect(screen.getByRole('button', { name: 'Start review' })).toBeDisabled();
    expect(window.localStorage.getItem('campuskit:viva:v1:attendance-system')).toBeNull();
  });
});
