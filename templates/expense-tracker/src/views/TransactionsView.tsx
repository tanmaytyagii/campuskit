import { useId, useState } from 'react';

import { EmptyState } from '../components/EmptyState';
import { useNotify } from '../components/Notices';
import { TransactionList } from '../components/TransactionList';
import { useTransactionEditor } from '../components/useTransactionEditor';
import type { AppConfig } from '../config';
import {
  DEFAULT_FILTERS,
  filterTransactions,
  PERIODS,
  totals,
  type Filters,
  type PeriodId,
} from '../lib/analytics';
import { CATEGORIES, categoryLabel } from '../lib/categories';
import { downloadTextFile, toCsv } from '../lib/csv';
import { todayKey } from '../lib/dates';
import { currencyDigits, formatMoney } from '../lib/money';
import { useExpenses } from '../state/ExpenseContext';

const MAX_ROWS = 300;

export function TransactionsView({ config }: { config: AppConfig }) {
  const { data } = useExpenses();
  const notify = useNotify();
  const editor = useTransactionEditor(config.currency);
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);
  const ids = {
    period: useId(),
    from: useId(),
    to: useId(),
    type: useId(),
    category: useId(),
    search: useId(),
  };
  const today = todayKey();
  const currency = config.currency;

  const rangeError =
    filters.period === 'custom' && filters.from && filters.to && filters.from > filters.to
      ? 'The start date is after the end date.'
      : null;
  const effectiveFilters: Filters = rangeError ? { ...filters, from: '', to: '' } : filters;
  const visible = filterTransactions(data.transactions, effectiveFilters, today);
  const sum = totals(visible);
  const filtersChanged = JSON.stringify(filters) !== JSON.stringify(DEFAULT_FILTERS);

  function set<K extends keyof Filters>(key: K, value: Filters[K]) {
    setFilters((current) => {
      const next = { ...current, [key]: value };
      // A category only makes sense for its own type.
      if (key === 'type' && next.categoryId !== 'all') {
        const category = CATEGORIES.find((item) => item.id === next.categoryId);
        if (category && value !== 'all' && category.type !== value) next.categoryId = 'all';
      }
      return next;
    });
  }

  function exportCsv() {
    const digits = currencyDigits(currency);
    const csv = toCsv(
      ['Date', 'Type', 'Category', 'Note', `Amount (${currency})`],
      visible.map((item) => [
        item.date,
        item.type === 'income' ? 'Income' : 'Expense',
        categoryLabel(item.categoryId),
        item.note,
        (item.amountMinor / 10 ** digits).toFixed(digits),
      ]),
    );
    downloadTextFile('transactions.csv', csv, 'text/csv');
    notify(
      `Exported ${visible.length} ${visible.length === 1 ? 'transaction' : 'transactions'} to transactions.csv.`,
    );
  }

  const categoryOptions = CATEGORIES.filter(
    (category) => filters.type === 'all' || category.type === filters.type,
  );

  return (
    <div className="stack">
      <div className="heading-row">
        <p className="muted">
          {data.transactions.length}{' '}
          {data.transactions.length === 1 ? 'transaction' : 'transactions'} saved
        </p>
        <button type="button" className="button button-primary" onClick={editor.openAdd}>
          Add transaction
        </button>
      </div>

      {data.transactions.length === 0 ? (
        <EmptyState
          title="No transactions yet"
          action={
            <button type="button" className="button button-primary" onClick={editor.openAdd}>
              Add transaction
            </button>
          }
        >
          Add your income and spending to start tracking.
        </EmptyState>
      ) : (
        <>
          <fieldset className="panel filters">
            <legend>Filter transactions</legend>
            <div className="filters-grid">
              <div className="field">
                <label htmlFor={ids.period}>Period</label>
                <select
                  id={ids.period}
                  value={filters.period}
                  onChange={(event) => set('period', event.target.value as PeriodId)}
                >
                  {PERIODS.map((period) => (
                    <option key={period.id} value={period.id}>
                      {period.label}
                    </option>
                  ))}
                </select>
              </div>
              {filters.period === 'custom' ? (
                <>
                  <div className="field">
                    <label htmlFor={ids.from}>From</label>
                    <input
                      id={ids.from}
                      type="date"
                      value={filters.from}
                      onChange={(event) => set('from', event.target.value)}
                    />
                  </div>
                  <div className="field">
                    <label htmlFor={ids.to}>To</label>
                    <input
                      id={ids.to}
                      type="date"
                      value={filters.to}
                      onChange={(event) => set('to', event.target.value)}
                      aria-invalid={rangeError ? true : undefined}
                      aria-describedby={rangeError ? `${ids.to}-error` : undefined}
                    />
                    {rangeError ? (
                      <p id={`${ids.to}-error`} className="field-error">
                        {rangeError}
                      </p>
                    ) : null}
                  </div>
                </>
              ) : null}
              <div className="field">
                <label htmlFor={ids.type}>Type</label>
                <select
                  id={ids.type}
                  value={filters.type}
                  onChange={(event) => set('type', event.target.value as Filters['type'])}
                >
                  <option value="all">Income and expenses</option>
                  <option value="expense">Expenses only</option>
                  <option value="income">Income only</option>
                </select>
              </div>
              <div className="field">
                <label htmlFor={ids.category}>Category</label>
                <select
                  id={ids.category}
                  value={filters.categoryId}
                  onChange={(event) => set('categoryId', event.target.value)}
                >
                  <option value="all">All categories</option>
                  {categoryOptions.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label htmlFor={ids.search}>Search notes</label>
                <input
                  id={ids.search}
                  type="search"
                  placeholder="e.g. textbook"
                  value={filters.query}
                  onChange={(event) => set('query', event.target.value)}
                />
              </div>
            </div>
            <div className="filters-actions">
              <button
                type="button"
                className="button button-secondary"
                disabled={!filtersChanged}
                onClick={() => setFilters(DEFAULT_FILTERS)}
              >
                Reset filters
              </button>
              <button
                type="button"
                className="button button-secondary"
                disabled={visible.length === 0}
                onClick={exportCsv}
              >
                Export CSV
              </button>
            </div>
          </fieldset>

          <section className="stats" aria-label="Totals for the filtered transactions">
            <div className="stat">
              <span className="stat-label">Income</span>
              <span className="stat-value amount-income">
                {formatMoney(sum.incomeMinor, currency)}
              </span>
            </div>
            <div className="stat">
              <span className="stat-label">Spending</span>
              <span className="stat-value">{formatMoney(sum.expenseMinor, currency)}</span>
            </div>
            <div className="stat">
              <span className="stat-label">Net</span>
              <span className={`stat-value${sum.balanceMinor < 0 ? ' amount-negative' : ''}`}>
                {formatMoney(sum.balanceMinor, currency)}
              </span>
            </div>
          </section>

          {visible.length === 0 ? (
            <EmptyState
              title="No transactions match these filters"
              action={
                <button
                  type="button"
                  className="button button-secondary"
                  onClick={() => setFilters({ ...DEFAULT_FILTERS, period: 'all' })}
                >
                  Show all transactions
                </button>
              }
            >
              Try another period, type or category, or clear the search.
            </EmptyState>
          ) : (
            <section className="panel" aria-label="Transactions">
              <p className="muted table-caption" aria-live="polite">
                {visible.length > MAX_ROWS
                  ? `Showing the latest ${MAX_ROWS} of ${visible.length} matching transactions. Export CSV to get all of them.`
                  : `${visible.length} matching ${visible.length === 1 ? 'transaction' : 'transactions'}`}
              </p>
              <TransactionList
                transactions={visible.slice(0, MAX_ROWS)}
                currency={currency}
                onEdit={editor.openEdit}
                onDelete={editor.requestDelete}
              />
            </section>
          )}
        </>
      )}
      {editor.dialogs}
    </div>
  );
}
