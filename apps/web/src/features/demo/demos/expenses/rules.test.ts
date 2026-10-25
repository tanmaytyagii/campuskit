/**
 * The demo's transaction form mirrors validateTransaction in the template's
 * src/components/TransactionForm.tsx, which can't be imported (the file also
 * holds the template's React form). These tests fail if the template's
 * messages or limits change, so the mirror can't drift silently.
 */
import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { NOTE_MAX_LENGTH, validateTransaction, type TransactionValues } from './rules.ts';

const templateForm = readFileSync(
  join(
    resolve(
      dirname(fileURLToPath(import.meta.url)),
      '../../../../../../../templates/expense-tracker',
    ),
    'src/components/TransactionForm.tsx',
  ),
  'utf8',
);

const valid: TransactionValues = {
  type: 'expense',
  amount: '120',
  categoryId: 'food',
  date: '2026-10-20',
  note: '  Canteen lunch  ',
};
const today = '2026-10-24';

describe('transaction form rules', () => {
  it('uses the template’s messages and note limit', () => {
    expect(templateForm).toContain(`export const NOTE_MAX_LENGTH = ${NOTE_MAX_LENGTH};`);
    for (const message of [
      "'Choose a category.'",
      "'Enter a valid date.'",
      "'The date can’t be in the future.'",
      '`Keep the note under ${NOTE_MAX_LENGTH} characters.`',
      'const amount = parseAmount(values.amount, currency);',
      'if (!isCategoryFor(values.categoryId, values.type)) errors.categoryId',
    ])
      expect(templateForm, message).toContain(message);
  });

  it('accepts a valid expense and trims the note', () => {
    const { errors, input } = validateTransaction(valid, 'INR', today);
    expect(errors).toEqual({});
    expect(input).toEqual({
      type: 'expense',
      amountMinor: 12000,
      categoryId: 'food',
      date: '2026-10-20',
      note: 'Canteen lunch',
    });
  });

  it('reports each problem with the template’s message', () => {
    expect(validateTransaction({ ...valid, amount: '12.345' }, 'INR', today).errors.amount).toBe(
      'Use at most 2 decimal places.',
    );
    expect(validateTransaction({ ...valid, amount: '' }, 'INR', today).errors.amount).toBe(
      'Enter an amount.',
    );
    expect(validateTransaction({ ...valid, categoryId: 'allowance' }, 'INR', today).errors).toEqual(
      {
        categoryId: 'Choose a category.',
      },
    );
    expect(validateTransaction({ ...valid, date: '2026-02-30' }, 'INR', today).errors.date).toBe(
      'Enter a valid date.',
    );
    expect(validateTransaction({ ...valid, date: '2026-10-25' }, 'INR', today).errors.date).toBe(
      'The date can’t be in the future.',
    );
    const long = validateTransaction({ ...valid, note: 'x'.repeat(121) }, 'INR', today);
    expect(long.errors.note).toBe('Keep the note under 120 characters.');
    expect(long.input).toBeNull();
  });
});
