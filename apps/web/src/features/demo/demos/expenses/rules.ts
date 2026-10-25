/**
 * The transaction form's checks. They mirror validateTransaction in the
 * template's src/components/TransactionForm.tsx, which can't be imported here
 * because that file also contains the template's React form; rules.test.ts
 * fails if the template's messages or limits change. The amount itself is
 * parsed by the template's own parseAmount.
 */
import {
  isCategoryFor,
  isValidDateKey,
  parseAmount,
  type CurrencyCode,
  type TransactionType,
} from './template.ts';

export const NOTE_MAX_LENGTH = 120;

export interface TransactionValues {
  type: TransactionType;
  amount: string;
  categoryId: string;
  date: string;
  note: string;
}

export interface TransactionInput {
  type: TransactionType;
  amountMinor: number;
  categoryId: string;
  date: string;
  note: string;
}

export type TransactionErrors = Partial<Record<keyof TransactionValues, string>>;

export function validateTransaction(
  values: TransactionValues,
  currency: CurrencyCode,
  today: string,
): { errors: TransactionErrors; input: TransactionInput | null } {
  const errors: TransactionErrors = {};
  const amount = parseAmount(values.amount, currency);
  if (!amount.ok) errors.amount = amount.error;
  if (!isCategoryFor(values.categoryId, values.type)) errors.categoryId = 'Choose a category.';
  if (!isValidDateKey(values.date)) errors.date = 'Enter a valid date.';
  else if (values.date > today) errors.date = 'The date can’t be in the future.';
  const note = values.note.trim();
  if (note.length > NOTE_MAX_LENGTH)
    errors.note = `Keep the note under ${NOTE_MAX_LENGTH} characters.`;
  if (Object.keys(errors).length > 0 || !amount.ok) return { errors, input: null };
  return {
    errors,
    input: {
      type: values.type,
      amountMinor: amount.amountMinor,
      categoryId: values.categoryId,
      date: values.date,
      note,
    },
  };
}
