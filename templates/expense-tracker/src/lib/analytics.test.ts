import { describe, expect, it } from 'vitest';

import type { Transaction } from '../types';
import {
  budgetStatus,
  DEFAULT_FILTERS,
  filterTransactions,
  monthlyTotals,
  periodRange,
  spendingByCategory,
  totals,
} from './analytics';

let counter = 0;
function txn(
  partial: Partial<Transaction> & Pick<Transaction, 'date' | 'amountMinor'>,
): Transaction {
  counter += 1;
  return {
    id: `t${counter}`,
    type: 'expense',
    categoryId: 'food',
    note: '',
    createdAt: `${partial.date}T10:00:${String(counter).padStart(2, '0')}.000Z`,
    ...partial,
  };
}

const data: Transaction[] = [
  txn({
    date: '2026-10-01',
    amountMinor: 900000,
    type: 'income',
    categoryId: 'allowance',
    note: 'Allowance',
  }),
  txn({ date: '2026-10-02', amountMinor: 450000, categoryId: 'housing', note: 'Hostel rent' }),
  txn({ date: '2026-10-05', amountMinor: 30000, categoryId: 'food', note: 'Groceries' }),
  txn({ date: '2026-10-06', amountMinor: 64000, categoryId: 'education', note: 'Textbook' }),
  txn({ date: '2026-09-20', amountMinor: 20000, categoryId: 'food', note: 'Café' }),
  txn({ date: '2026-09-01', amountMinor: 900000, type: 'income', categoryId: 'allowance' }),
  txn({ date: '2025-12-31', amountMinor: 5000, categoryId: 'transport' }),
];

const today = '2026-10-21';

describe('analytics', () => {
  it('computes date ranges for each period', () => {
    expect(periodRange({ period: 'this-month', from: '', to: '' }, today)).toEqual({
      from: '2026-10-01',
      to: '2026-10-31',
    });
    expect(periodRange({ period: 'last-month', from: '', to: '' }, today)).toEqual({
      from: '2026-09-01',
      to: '2026-09-30',
    });
    expect(periodRange({ period: 'last-30-days', from: '', to: '' }, today)).toEqual({
      from: '2026-09-22',
      to: today,
    });
    expect(periodRange({ period: 'last-month', from: '', to: '' }, '2026-01-15')).toEqual({
      from: '2025-12-01',
      to: '2025-12-31',
    });
  });

  it('filters by period, type, category and note text', () => {
    expect(filterTransactions(data, DEFAULT_FILTERS, today)).toHaveLength(4);
    expect(
      filterTransactions(data, { ...DEFAULT_FILTERS, period: 'all', type: 'income' }, today),
    ).toHaveLength(2);
    expect(
      filterTransactions(data, { ...DEFAULT_FILTERS, period: 'all', categoryId: 'food' }, today),
    ).toHaveLength(2);
    expect(
      filterTransactions(data, { ...DEFAULT_FILTERS, period: 'all', query: 'TEXTBOOK' }, today),
    ).toHaveLength(1);
    expect(
      filterTransactions(
        data,
        { ...DEFAULT_FILTERS, period: 'custom', from: '2026-09-15', to: '2026-10-02' },
        today,
      ).map((item) => item.note),
    ).toEqual(['Hostel rent', 'Allowance', 'Café']);
  });

  it('sorts newest first', () => {
    const dates = filterTransactions(data, { ...DEFAULT_FILTERS, period: 'all' }, today).map(
      (item) => item.date,
    );
    expect(dates).toEqual([...dates].sort().reverse());
  });

  it('totals income, spending and balance from the actual transactions', () => {
    const october = filterTransactions(data, DEFAULT_FILTERS, today);
    expect(totals(october)).toEqual({
      incomeMinor: 900000,
      expenseMinor: 544000,
      balanceMinor: 356000,
      count: 4,
    });
  });

  it('groups spending by category with shares', () => {
    const october = filterTransactions(data, DEFAULT_FILTERS, today);
    const groups = spendingByCategory(october);
    expect(groups.map((group) => group.categoryId)).toEqual(['housing', 'education', 'food']);
    expect(groups.reduce((sum, group) => sum + group.share, 0)).toBeCloseTo(1);
  });

  it('builds a monthly series with empty months included', () => {
    const series = monthlyTotals(data, '2026-10', 3);
    expect(series.map((month) => month.month)).toEqual(['2026-08', '2026-09', '2026-10']);
    expect(series[0]).toMatchObject({ incomeMinor: 0, expenseMinor: 0 });
    expect(series[1]).toMatchObject({ incomeMinor: 900000, expenseMinor: 20000 });
  });

  it('reports budget usage, including going over budget', () => {
    expect(budgetStatus(data, '2026-10', 1000000)).toEqual({
      budgetMinor: 1000000,
      spentMinor: 544000,
      remainingMinor: 456000,
      ratio: 0.544,
    });
    expect(budgetStatus(data, '2026-10', 500000)?.remainingMinor).toBe(-44000);
    expect(budgetStatus(data, '2026-10', 0)).toBeNull();
  });
});
