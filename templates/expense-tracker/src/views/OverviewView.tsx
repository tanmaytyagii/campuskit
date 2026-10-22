import { CategoryChart, MonthlyChart } from '../components/Charts';
import { EmptyState } from '../components/EmptyState';
import { TransactionList } from '../components/TransactionList';
import { useTransactionEditor } from '../components/useTransactionEditor';
import type { AppConfig } from '../config';
import {
  budgetStatus,
  DEFAULT_FILTERS,
  filterTransactions,
  monthlyTotals,
  spendingByCategory,
  totals,
} from '../lib/analytics';
import { monthKeyOf, monthLabel, todayKey } from '../lib/dates';
import { formatMoney } from '../lib/money';
import { viewHref } from '../lib/useHashRoute';
import { useExpenses } from '../state/ExpenseContext';

export function OverviewView({ config }: { config: AppConfig }) {
  const { data, budgetMinor } = useExpenses();
  const editor = useTransactionEditor(config.currency);
  const today = todayKey();
  const month = monthKeyOf(today);
  const currency = config.currency;

  if (data.transactions.length === 0) {
    return (
      <>
        <EmptyState
          title="No transactions yet"
          action={
            <button type="button" className="button button-primary" onClick={editor.openAdd}>
              Add your first transaction
            </button>
          }
        >
          Record what you spend and receive. Totals, budget progress and charts appear here
          automatically.
        </EmptyState>
        {editor.dialogs}
      </>
    );
  }

  const thisMonth = filterTransactions(
    data.transactions,
    { ...DEFAULT_FILTERS, period: 'this-month' },
    today,
  );
  const monthTotals = totals(thisMonth);
  const budget = budgetStatus(data.transactions, month, budgetMinor);
  const recent = filterTransactions(
    data.transactions,
    { ...DEFAULT_FILTERS, period: 'all' },
    today,
  ).slice(0, 5);

  return (
    <div className="stack">
      <div className="heading-row">
        <h2 className="section-title">{monthLabel(month, 'long')}</h2>
        <button type="button" className="button button-primary" onClick={editor.openAdd}>
          Add transaction
        </button>
      </div>

      <section className="stats" aria-label={`Totals for ${monthLabel(month, 'long')}`}>
        <div className="stat">
          <span className="stat-label">Income</span>
          <span className="stat-value amount-income">
            {formatMoney(monthTotals.incomeMinor, currency)}
          </span>
        </div>
        <div className="stat">
          <span className="stat-label">Spending</span>
          <span className="stat-value">{formatMoney(monthTotals.expenseMinor, currency)}</span>
        </div>
        <div className="stat">
          <span className="stat-label">Balance</span>
          <span className={`stat-value${monthTotals.balanceMinor < 0 ? ' amount-negative' : ''}`}>
            {formatMoney(monthTotals.balanceMinor, currency)}
          </span>
        </div>
      </section>

      <section className="panel budget" aria-labelledby="budget-heading">
        <div className="panel-heading">
          <h2 id="budget-heading">Monthly budget</h2>
          <a href={viewHref('settings')} className="text-link">
            Change budget
          </a>
        </div>
        {budget ? (
          <>
            <div
              className="budget-track"
              role="progressbar"
              aria-label="Budget used"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={Math.round(Math.min(budget.ratio, 1) * 100)}
              aria-valuetext={`${Math.round(budget.ratio * 100)}% of the budget used`}
            >
              <span
                className={`budget-fill${budget.ratio > 1 ? ' budget-fill-over' : budget.ratio > 0.85 ? ' budget-fill-warn' : ''}`}
                style={{ width: `${Math.min(budget.ratio, 1) * 100}%` }}
              />
            </div>
            <p>
              {formatMoney(budget.spentMinor, currency)} of{' '}
              {formatMoney(budget.budgetMinor, currency)} spent ({Math.round(budget.ratio * 100)}%).{' '}
              {budget.remainingMinor >= 0 ? (
                <strong>{formatMoney(budget.remainingMinor, currency)} left this month.</strong>
              ) : (
                <strong className="amount-negative">
                  {formatMoney(-budget.remainingMinor, currency)} over budget.
                </strong>
              )}
            </p>
          </>
        ) : (
          <p className="muted">
            No monthly budget is set. Set one under Budget &amp; data to track your spending against
            it.
          </p>
        )}
      </section>

      <div className="grid-2">
        <CategoryChart
          data={spendingByCategory(thisMonth)}
          currency={currency}
          title="Spending by category this month"
        />
        <MonthlyChart data={monthlyTotals(data.transactions, month, 6)} currency={currency} />
      </div>

      <section className="panel" aria-labelledby="recent-heading">
        <div className="panel-heading">
          <h2 id="recent-heading">Recent transactions</h2>
          <a href={viewHref('transactions')} className="text-link">
            View all transactions
          </a>
        </div>
        <TransactionList
          transactions={recent}
          currency={currency}
          onEdit={editor.openEdit}
          onDelete={editor.requestDelete}
        />
      </section>
      {editor.dialogs}
    </div>
  );
}
