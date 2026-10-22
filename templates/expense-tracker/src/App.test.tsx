import { act, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { App } from './App';
import type { AppConfig } from './config';
import { STORAGE_KEY } from './lib/storage';

const config: AppConfig = {
  appName: 'Spend Smart',
  authorName: 'Kiran',
  currency: 'INR',
  monthlyBudget: 15000,
  theme: 'emerald',
  seedDemoData: false,
};

const plain = (text: string | null) => (text ?? '').replace(/[\u00a0\u202f]/g, ' ');

async function goTo(label: string) {
  const user = userEvent.setup();
  await user.click(screen.getByRole('link', { name: label }));
  await act(async () => {
    window.dispatchEvent(new HashChangeEvent('hashchange'));
  });
  return user;
}

async function addTransaction(
  user: ReturnType<typeof userEvent.setup>,
  values: { type?: 'Expense' | 'Income'; amount: string; category?: string; note?: string },
) {
  await user.click(
    screen.getAllByRole('button', { name: /Add (your first )?transaction/ })[0] as HTMLElement,
  );
  const dialog = screen.getByRole('dialog', { name: 'Add transaction' });
  if (values.type) await user.click(within(dialog).getByRole('radio', { name: values.type }));
  await user.type(within(dialog).getByLabelText(/Amount/), values.amount);
  if (values.category)
    await user.selectOptions(within(dialog).getByLabelText('Category'), values.category);
  if (values.note) await user.type(within(dialog).getByLabelText(/Note/), values.note);
  await user.click(within(dialog).getByRole('button', { name: 'Add transaction' }));
}

describe('Expense tracker', () => {
  // Demo data is generated relative to "today", so freeze the date (but not timers).
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(2026, 9, 21, 12, 0, 0));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('starts with an empty state and the configured name', () => {
    render(<App config={config} />);
    expect(screen.getByText('Spend Smart')).toBeInTheDocument();
    expect(screen.getByText('No transactions yet')).toBeInTheDocument();
    expect(screen.getByText(/Built by Kiran/)).toBeInTheDocument();
  });

  it('validates the amount before adding a transaction', async () => {
    const user = userEvent.setup();
    render(<App config={config} />);
    await user.click(screen.getByRole('button', { name: 'Add your first transaction' }));
    const dialog = screen.getByRole('dialog', { name: 'Add transaction' });
    await user.type(within(dialog).getByLabelText(/Amount/), '12.345');
    await user.click(within(dialog).getByRole('button', { name: 'Add transaction' }));
    expect(within(dialog).getByText('Use at most 2 decimal places.')).toBeInTheDocument();
  });

  it('adds income and expenses and computes totals and budget from them', async () => {
    const user = userEvent.setup();
    render(<App config={config} />);
    await addTransaction(user, {
      type: 'Income',
      amount: '9000',
      category: 'allowance',
      note: 'Monthly allowance',
    });
    await addTransaction(user, { amount: '1,250.50', category: 'education', note: 'Lab manual' });

    const stats = screen.getByRole('region', { name: /Totals for/ });
    expect(plain(stats.textContent)).toContain('₹9,000.00');
    expect(plain(stats.textContent)).toContain('₹1,250.50');
    expect(plain(stats.textContent)).toContain('₹7,749.50');
    expect(
      plain(
        screen.getByRole('progressbar', { name: 'Budget used' }).getAttribute('aria-valuetext'),
      ),
    ).toBe('8% of the budget used');

    const saved = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? '{}') as {
      transactions: unknown[];
    };
    expect(saved.transactions).toHaveLength(2);
  });

  it('shows chart data as an accessible table', async () => {
    const user = userEvent.setup();
    render(<App config={config} />);
    await addTransaction(user, { amount: '300', category: 'transport', note: 'Bus pass' });
    const chart = screen.getByRole('region', { name: 'Spending by category this month' });
    await user.click(within(chart).getByRole('button', { name: 'Show as table' }));
    expect(within(chart).getByRole('cell', { name: 'Transport' })).toBeInTheDocument();
    expect(
      plain(within(chart).getAllByRole('cell', { name: /₹300.00/ })[0]?.textContent ?? ''),
    ).toBe('₹300.00');
  });

  it('filters transactions and can delete one after confirmation', async () => {
    render(<App config={{ ...config, seedDemoData: true }} />);
    const user = await goTo('Transactions');
    await user.selectOptions(screen.getByLabelText('Period'), 'all');
    await user.type(screen.getByLabelText('Search notes'), 'textbook');
    expect(screen.getByText('6 matching transactions')).toBeInTheDocument();

    const [firstDelete] = screen.getAllByRole('button', {
      name: /^Delete Data structures textbook/,
    });
    await user.click(firstDelete as HTMLElement);
    const dialog = screen.getByRole('dialog', { name: 'Delete this transaction?' });
    await user.click(within(dialog).getByRole('button', { name: 'Delete transaction' }));
    expect(screen.getByText('5 matching transactions')).toBeInTheDocument();
  });

  it('edits a transaction and opens the form fresh every time', async () => {
    const user = userEvent.setup();
    render(<App config={config} />);
    await addTransaction(user, { amount: '300', category: 'transport', note: 'Bus pass' });
    await goTo('Transactions');

    await user.click(screen.getByRole('button', { name: /^Edit Bus pass/ }));
    const editDialog = screen.getByRole('dialog', { name: 'Edit transaction' });
    expect(within(editDialog).getByLabelText(/Amount/)).toHaveValue('300.00');
    await user.clear(within(editDialog).getByLabelText(/Amount/));
    await user.type(within(editDialog).getByLabelText(/Amount/), '320');
    await user.click(within(editDialog).getByRole('button', { name: 'Save changes' }));
    expect(screen.getByRole('status')).toHaveTextContent('Saved changes to the transaction.');
    expect(plain(screen.getByRole('table').textContent)).toContain('₹320.00');

    await user.click(
      screen.getAllByRole('button', { name: /Add (your first )?transaction/ })[0] as HTMLElement,
    );
    expect(
      within(screen.getByRole('dialog', { name: 'Add transaction' })).getByLabelText(/Amount/),
    ).toHaveValue('');
  });

  it('shows an empty state when no transactions match', async () => {
    render(<App config={{ ...config, seedDemoData: true }} />);
    const user = await goTo('Transactions');
    await user.type(screen.getByLabelText('Search notes'), 'no such note');
    expect(screen.getByText('No transactions match these filters')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Show all transactions' }));
    expect(screen.getByLabelText('Search notes')).toHaveValue('');
  });
});
