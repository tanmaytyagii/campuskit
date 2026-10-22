/** Add or edit a transaction in a modal dialog, with inline validation. */
import { useEffect, useId, useRef, useState, type FormEvent } from 'react';

import type { CurrencyCode } from '../config';
import { categoriesFor, isCategoryFor } from '../lib/categories';
import { isValidDateKey, todayKey } from '../lib/dates';
import { currencyDigits, parseAmount, toAmountInput } from '../lib/money';
import type { Transaction, TransactionType } from '../types';

export interface TransactionInput {
  type: TransactionType;
  amountMinor: number;
  categoryId: string;
  date: string;
  note: string;
}

interface FormValues {
  type: TransactionType;
  amount: string;
  categoryId: string;
  date: string;
  note: string;
}

type Errors = Partial<Record<keyof FormValues, string>>;

export const NOTE_MAX_LENGTH = 120;

export function validateTransaction(
  values: FormValues,
  currency: CurrencyCode,
  today: string,
): { errors: Errors; input: TransactionInput | null } {
  const errors: Errors = {};
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

interface TransactionFormProps {
  open: boolean;
  transaction: Transaction | null;
  currency: CurrencyCode;
  onSave: (input: TransactionInput) => void;
  onClose: () => void;
}

function initialValues(transaction: Transaction | null, currency: CurrencyCode): FormValues {
  if (transaction) {
    return {
      type: transaction.type,
      amount: toAmountInput(transaction.amountMinor, currency),
      categoryId: transaction.categoryId,
      date: transaction.date,
      note: transaction.note,
    };
  }
  return { type: 'expense', amount: '', categoryId: 'food', date: todayKey(), note: '' };
}

/**
 * The parent gives this component a new `key` every time it opens the form,
 * so React creates a fresh form whose fields start from `transaction`.
 */
export function TransactionForm({
  open,
  transaction,
  currency,
  onSave,
  onClose,
}: TransactionFormProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [values, setValues] = useState<FormValues>(() => initialValues(transaction, currency));
  const [errors, setErrors] = useState<Errors>({});
  const id = useId();
  const today = todayKey();

  // Show or hide the native <dialog>, which handles focus and the Escape key.
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  function update<K extends keyof FormValues>(field: K, value: FormValues[K]) {
    setValues((current) => {
      const next = { ...current, [field]: value };
      // Switching between expense and income picks a matching category.
      if (field === 'type' && !isCategoryFor(next.categoryId, next.type)) {
        next.categoryId = categoriesFor(next.type)[0]?.id ?? '';
      }
      return next;
    });
    setErrors((current) => ({ ...current, [field]: undefined }));
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const result = validateTransaction(values, currency, today);
    setErrors(result.errors);
    if (!result.input) {
      const first = Object.keys(result.errors)[0];
      if (first) document.getElementById(`${id}-${first}`)?.focus();
      return;
    }
    onSave(result.input);
  }

  const describedBy = (field: keyof FormValues) =>
    errors[field] ? `${id}-${field}-error` : undefined;
  const errorText = (field: keyof FormValues) =>
    errors[field] ? (
      <p id={`${id}-${field}-error`} className="field-error">
        {errors[field]}
      </p>
    ) : null;

  return (
    <dialog
      ref={dialogRef}
      className="dialog"
      aria-labelledby={`${id}-title`}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
    >
      <form onSubmit={handleSubmit} noValidate>
        <h2 id={`${id}-title`} className="dialog-title">
          {transaction ? 'Edit transaction' : 'Add transaction'}
        </h2>

        <fieldset className="type-toggle">
          <legend>Type</legend>
          {(['expense', 'income'] as const).map((type) => (
            <label key={type} className={`type-option type-option-${type}`}>
              <input
                type="radio"
                name={`${id}-type`}
                checked={values.type === type}
                onChange={() => update('type', type)}
              />
              <span>{type === 'expense' ? 'Expense' : 'Income'}</span>
            </label>
          ))}
        </fieldset>

        <div className="field">
          <label htmlFor={`${id}-amount`}>Amount ({currency})</label>
          <input
            id={`${id}-amount`}
            inputMode={currencyDigits(currency) === 0 ? 'numeric' : 'decimal'}
            autoComplete="off"
            placeholder={currencyDigits(currency) === 0 ? 'e.g. 1200' : 'e.g. 250.50'}
            value={values.amount}
            onChange={(event) => update('amount', event.target.value)}
            aria-invalid={errors.amount ? true : undefined}
            aria-describedby={describedBy('amount')}
          />
          {errorText('amount')}
        </div>

        <div className="field">
          <label htmlFor={`${id}-categoryId`}>Category</label>
          <select
            id={`${id}-categoryId`}
            value={values.categoryId}
            onChange={(event) => update('categoryId', event.target.value)}
            aria-invalid={errors.categoryId ? true : undefined}
            aria-describedby={describedBy('categoryId')}
          >
            {categoriesFor(values.type).map((category) => (
              <option key={category.id} value={category.id}>
                {category.label}
              </option>
            ))}
          </select>
          {errorText('categoryId')}
        </div>

        <div className="field">
          <label htmlFor={`${id}-date`}>Date</label>
          <input
            id={`${id}-date`}
            type="date"
            max={today}
            value={values.date}
            onChange={(event) => update('date', event.target.value)}
            aria-invalid={errors.date ? true : undefined}
            aria-describedby={describedBy('date')}
          />
          {errorText('date')}
        </div>

        <div className="field">
          <label htmlFor={`${id}-note`}>
            Note <span className="muted">(optional)</span>
          </label>
          <input
            id={`${id}-note`}
            autoComplete="off"
            maxLength={NOTE_MAX_LENGTH + 20}
            placeholder="e.g. Lab manual"
            value={values.note}
            onChange={(event) => update('note', event.target.value)}
            aria-invalid={errors.note ? true : undefined}
            aria-describedby={describedBy('note')}
          />
          {errorText('note')}
        </div>

        <div className="dialog-actions">
          <button type="button" className="button button-secondary" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="button button-primary">
            {transaction ? 'Save changes' : 'Add transaction'}
          </button>
        </div>
      </form>
    </dialog>
  );
}
