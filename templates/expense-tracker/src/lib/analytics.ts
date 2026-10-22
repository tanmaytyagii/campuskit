/**
 * Filtering and totals. Every figure and chart in the app is computed here
 * from the actual transactions; nothing is estimated or hard-coded.
 */
import type { Transaction, TransactionType } from '../types';
import { CATEGORIES, getCategory } from './categories';
import {
  addDays,
  addMonths,
  firstDayOfMonth,
  lastDayOfMonth,
  monthKeyOf,
  monthLabel,
} from './dates';

export const PERIODS = [
  { id: 'this-month', label: 'This month' },
  { id: 'last-month', label: 'Last month' },
  { id: 'last-30-days', label: 'Last 30 days' },
  { id: 'this-year', label: 'This year' },
  { id: 'all', label: 'All time' },
  { id: 'custom', label: 'Custom range' },
] as const;

export type PeriodId = (typeof PERIODS)[number]['id'];

export interface Filters {
  period: PeriodId;
  /** Used when period is "custom". */
  from: string;
  to: string;
  type: 'all' | TransactionType;
  categoryId: 'all' | string;
  query: string;
}

export const DEFAULT_FILTERS: Filters = {
  period: 'this-month',
  from: '',
  to: '',
  type: 'all',
  categoryId: 'all',
  query: '',
};

export interface DateRange {
  from?: string;
  to?: string;
}

export function periodRange(
  filters: Pick<Filters, 'period' | 'from' | 'to'>,
  today: string,
): DateRange {
  const month = monthKeyOf(today);
  switch (filters.period) {
    case 'this-month':
      return { from: firstDayOfMonth(month), to: lastDayOfMonth(month) };
    case 'last-month': {
      const previous = addMonths(month, -1);
      return { from: firstDayOfMonth(previous), to: lastDayOfMonth(previous) };
    }
    case 'last-30-days':
      return { from: addDays(today, -29), to: today };
    case 'this-year':
      return { from: `${today.slice(0, 4)}-01-01`, to: `${today.slice(0, 4)}-12-31` };
    case 'all':
      return {};
    case 'custom':
      return {
        ...(filters.from ? { from: filters.from } : {}),
        ...(filters.to ? { to: filters.to } : {}),
      };
  }
}

export function inRange(date: string, range: DateRange): boolean {
  return (!range.from || date >= range.from) && (!range.to || date <= range.to);
}

export function filterTransactions(
  transactions: Transaction[],
  filters: Filters,
  today: string,
): Transaction[] {
  const range = periodRange(filters, today);
  const query = filters.query.trim().toLocaleLowerCase();
  return transactions
    .filter(
      (transaction) =>
        inRange(transaction.date, range) &&
        (filters.type === 'all' || transaction.type === filters.type) &&
        (filters.categoryId === 'all' || transaction.categoryId === filters.categoryId) &&
        (!query ||
          transaction.note.toLocaleLowerCase().includes(query) ||
          (getCategory(transaction.categoryId)?.label.toLocaleLowerCase().includes(query) ??
            false)),
    )
    .sort((a, b) =>
      a.date === b.date ? b.createdAt.localeCompare(a.createdAt) : a.date < b.date ? 1 : -1,
    );
}

export interface Totals {
  incomeMinor: number;
  expenseMinor: number;
  /** income − expenses */
  balanceMinor: number;
  count: number;
}

export function totals(transactions: Transaction[]): Totals {
  let incomeMinor = 0;
  let expenseMinor = 0;
  for (const transaction of transactions) {
    if (transaction.type === 'income') incomeMinor += transaction.amountMinor;
    else expenseMinor += transaction.amountMinor;
  }
  return {
    incomeMinor,
    expenseMinor,
    balanceMinor: incomeMinor - expenseMinor,
    count: transactions.length,
  };
}

export interface CategoryTotal {
  categoryId: string;
  label: string;
  colour: string;
  totalMinor: number;
  /** Share of all spending in the set, 0–1. */
  share: number;
}

/** Spending per category, largest first. Income is ignored. */
export function spendingByCategory(transactions: Transaction[]): CategoryTotal[] {
  const sums = new Map<string, number>();
  let all = 0;
  for (const transaction of transactions) {
    if (transaction.type !== 'expense') continue;
    sums.set(
      transaction.categoryId,
      (sums.get(transaction.categoryId) ?? 0) + transaction.amountMinor,
    );
    all += transaction.amountMinor;
  }
  return [...sums.entries()]
    .map(([categoryId, totalMinor]) => {
      const category = getCategory(categoryId) ?? CATEGORIES[CATEGORIES.length - 1];
      return {
        categoryId,
        label: category?.label ?? categoryId,
        colour: category?.colour ?? '#64748B',
        totalMinor,
        share: all === 0 ? 0 : totalMinor / all,
      };
    })
    .sort((a, b) => b.totalMinor - a.totalMinor);
}

export interface MonthTotal {
  month: string;
  label: string;
  incomeMinor: number;
  expenseMinor: number;
}

/** Income and spending for the `count` months ending with `endMonth`, oldest first. */
export function monthlyTotals(
  transactions: Transaction[],
  endMonth: string,
  count = 6,
): MonthTotal[] {
  const months: MonthTotal[] = [];
  for (let offset = count - 1; offset >= 0; offset -= 1) {
    const month = addMonths(endMonth, -offset);
    months.push({ month, label: monthLabel(month), incomeMinor: 0, expenseMinor: 0 });
  }
  const byMonth = new Map(months.map((entry) => [entry.month, entry]));
  for (const transaction of transactions) {
    const entry = byMonth.get(monthKeyOf(transaction.date));
    if (!entry) continue;
    if (transaction.type === 'income') entry.incomeMinor += transaction.amountMinor;
    else entry.expenseMinor += transaction.amountMinor;
  }
  return months;
}

export interface BudgetStatus {
  budgetMinor: number;
  spentMinor: number;
  remainingMinor: number;
  /** spent / budget; can exceed 1 when over budget. */
  ratio: number;
}

export function budgetStatus(
  transactions: Transaction[],
  month: string,
  budgetMinor: number,
): BudgetStatus | null {
  if (budgetMinor <= 0) return null;
  const spentMinor = transactions
    .filter(
      (transaction) => transaction.type === 'expense' && monthKeyOf(transaction.date) === month,
    )
    .reduce((sum, transaction) => sum + transaction.amountMinor, 0);
  return {
    budgetMinor,
    spentMinor,
    remainingMinor: budgetMinor - spentMinor,
    ratio: spentMinor / budgetMinor,
  };
}
