/**
 * Shared add/edit/delete behaviour for transactions, used by the Overview and
 * Transactions screens. Returns functions to open the form plus the dialogs to
 * render.
 */
import { useState, type ReactNode } from 'react';

import type { CurrencyCode } from '../config';
import { formatDateKey } from '../lib/dates';
import { formatMoney } from '../lib/money';
import { useExpenses } from '../state/ExpenseContext';
import type { Transaction } from '../types';
import { ConfirmDialog } from './ConfirmDialog';
import { useNotify } from './Notices';
import { TransactionForm, type TransactionInput } from './TransactionForm';

function newId(): string {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `txn-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function useTransactionEditor(currency: CurrencyCode): {
  openAdd: () => void;
  openEdit: (transaction: Transaction) => void;
  requestDelete: (transaction: Transaction) => void;
  dialogs: ReactNode;
} {
  const { dispatch } = useExpenses();
  const notify = useNotify();
  const [formOpen, setFormOpen] = useState(false);
  // Changes every time the form opens, so the form starts fresh (see TransactionForm).
  const [formKey, setFormKey] = useState(0);
  const [editing, setEditing] = useState<Transaction | null>(null);
  const [deleting, setDeleting] = useState<Transaction | null>(null);

  function handleSave(input: TransactionInput) {
    if (editing) {
      dispatch({ type: 'transaction/update', transaction: { ...editing, ...input } });
      notify('Saved changes to the transaction.');
    } else {
      dispatch({
        type: 'transaction/add',
        transaction: { ...input, id: newId(), createdAt: new Date().toISOString() },
      });
      notify(
        `Added ${input.type === 'income' ? 'income' : 'expense'} of ${formatMoney(input.amountMinor, currency)}.`,
      );
    }
    setFormOpen(false);
  }

  const dialogs = (
    <>
      <TransactionForm
        key={formKey}
        open={formOpen}
        transaction={editing}
        currency={currency}
        onSave={handleSave}
        onClose={() => setFormOpen(false)}
      />
      <ConfirmDialog
        open={deleting !== null}
        title="Delete this transaction?"
        message={
          deleting
            ? `${formatMoney(deleting.amountMinor, currency)} on ${formatDateKey(deleting.date)}${deleting.note ? ` (${deleting.note})` : ''} will be removed. This can’t be undone.`
            : ''
        }
        confirmLabel="Delete transaction"
        tone="danger"
        onCancel={() => setDeleting(null)}
        onConfirm={() => {
          if (deleting) {
            dispatch({ type: 'transaction/delete', id: deleting.id });
            notify('Deleted the transaction.');
          }
          setDeleting(null);
        }}
      />
    </>
  );

  function openForm(transaction: Transaction | null) {
    setEditing(transaction);
    setFormKey((key) => key + 1);
    setFormOpen(true);
  }

  return {
    openAdd: () => openForm(null),
    openEdit: openForm,
    requestDelete: setDeleting,
    dialogs,
  };
}
