/**
 * The expense tracker demo's screens. They are re-created with CampusKit's
 * components, but every change goes through the template's reducer and every
 * figure comes from the template's own modules (see template.ts).
 */
import { Pencil, Plus, ReceiptText, Trash2 } from 'lucide-react';
import { useId, useRef, useState, type FormEvent } from 'react';

import { Button } from '../../../../components/ui/Button.tsx';
import { Dialog } from '../../../../components/ui/Dialog.tsx';
import { EmptyState } from '../../../../components/ui/EmptyState.tsx';
import { SelectField, TextField } from '../../../../components/ui/Field.tsx';
import { cn } from '../../../../lib/cn.ts';
import { BarList, ChartCard, ColumnChart } from '../../charts.tsx';
import { defineDemo } from '../../define.ts';
import type { DemoViewProps } from '../../types.ts';
import {
  actionCellClasses,
  highlightClasses,
  JsonView,
  rowHeaderClasses,
  ScreenHeading,
  StatGrid,
  StatTile,
  TableRegion,
  tableClasses,
  tdClasses,
  theadClasses,
  thClasses,
  useFocusAfterDelete,
} from '../../ui.tsx';
import {
  NOTE_MAX_LENGTH,
  validateTransaction,
  type TransactionErrors,
  type TransactionInput,
  type TransactionValues,
} from './rules.ts';
import {
  budgetStatus,
  categoriesFor,
  categoryLabel,
  createDemoData,
  createEmptyData,
  DEFAULT_FILTERS,
  expenseReducer,
  filterTransactions,
  formatDateKey,
  formatMoney,
  formatMoneyCompact,
  loadConfig,
  majorToMinor,
  monthKeyOf,
  monthLabel,
  monthlyTotals,
  parseAmount,
  PERIODS,
  spendingByCategory,
  STORAGE_KEY,
  toAmountInput,
  todayKey,
  totals,
  validateData,
  type ExpenseData,
  type Filters,
  type PeriodId,
  type Transaction,
  type TransactionType,
} from './template.ts';

type Props = DemoViewProps<ExpenseData>;

/** The template's default settings (src/app.config.json): Indian rupees and a ₹15,000 budget. */
const config = loadConfig();
const CURRENCY = config.currency;
const DEFAULT_BUDGET_MINOR = majorToMinor(config.monthlyBudget, CURRENCY);

const money = (amountMinor: number) => formatMoney(amountMinor, CURRENCY);

function budgetOf(state: ExpenseData): number {
  return state.settings.monthlyBudgetMinor ?? DEFAULT_BUDGET_MINOR;
}

function newId(): string {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `transaction-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function SignedAmount({ transaction }: { transaction: Transaction }) {
  const income = transaction.type === 'income';
  return (
    <span
      className={cn(
        'font-semibold whitespace-nowrap tabular-nums',
        income ? 'text-lime-text' : 'text-ink',
      )}
    >
      {income ? '+' : '−'}
      {money(transaction.amountMinor)}
      <span className="sr-only">{income ? ' income' : ' expense'}</span>
    </span>
  );
}

const iconButton =
  'inline-flex size-8 items-center justify-center rounded-md text-ink-2 transition-colors hover:bg-raised';

/** How many transactions the list shows at first, and how many more each time. */
const PAGE_SIZE = 25;

// ---------------------------------------------------------------------------
// The budget bar (overview and budget screens)
// ---------------------------------------------------------------------------

function BudgetPanel({
  state,
  onChange,
  className,
}: {
  state: ExpenseData;
  onChange?: () => void;
  className?: string;
}) {
  const month = monthKeyOf(todayKey());
  const status = budgetStatus(state.transactions, month, budgetOf(state));
  return (
    <section
      aria-labelledby="budget-heading"
      className={cn('space-y-3 rounded-xl border border-line p-4', className)}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 id="budget-heading" className="font-semibold text-ink">
          Monthly budget
        </h3>
        {onChange ? (
          <button type="button" onClick={onChange} className="link text-sm">
            Change budget
          </button>
        ) : null}
      </div>
      {status ? (
        <>
          <div aria-hidden="true" className="h-2.5 overflow-hidden rounded-full bg-raised">
            <div
              className={cn(
                'h-full rounded-full transition-[width] duration-300 motion-reduce:transition-none',
                status.ratio > 1 ? 'bg-danger' : status.ratio > 0.85 ? 'bg-warn' : 'bg-violet',
              )}
              style={{ width: `${Math.min(status.ratio, 1) * 100}%` }}
            />
          </div>
          <p className="text-sm text-ink-2">
            {money(status.spentMinor)} of {money(status.budgetMinor)} spent (
            {Math.round(status.ratio * 100)}%).{' '}
            {status.remainingMinor >= 0 ? (
              <strong className="text-ink">{money(status.remainingMinor)} left this month.</strong>
            ) : (
              <strong className="text-danger">{money(-status.remainingMinor)} over budget.</strong>
            )}
          </p>
        </>
      ) : (
        <p className="text-sm text-ink-2">
          No monthly budget is set. Set one on the Budget screen to track spending against it.
        </p>
      )}
    </section>
  );
}

// ---------------------------------------------------------------------------
// Overview
// ---------------------------------------------------------------------------

function OverviewScreen({ state, selectFeature, highlight }: Props) {
  const today = todayKey();
  const month = monthKeyOf(today);
  if (state.transactions.length === 0) {
    return (
      <EmptyState
        icon={<ReceiptText aria-hidden="true" className="size-6" />}
        title="No transactions yet"
        actions={
          <Button size="sm" onClick={() => selectFeature('transactions')}>
            Go to Transactions
          </Button>
        }
      >
        Record what you spend and receive. Totals, budget progress and charts appear here once there
        is something to count.
      </EmptyState>
    );
  }
  const thisMonth = filterTransactions(
    state.transactions,
    { ...DEFAULT_FILTERS, period: 'this-month' },
    today,
  );
  const monthTotals = totals(thisMonth);
  const categories = spendingByCategory(thisMonth);
  const months = monthlyTotals(state.transactions, month, 6);
  const recent = filterTransactions(
    state.transactions,
    { ...DEFAULT_FILTERS, period: 'all' },
    today,
  ).slice(0, 5);

  return (
    <div className="space-y-6">
      <ScreenHeading
        title={monthLabel(month, 'long')}
        description="Calculated from the transactions every time this screen opens."
        actions={
          <Button size="sm" variant="secondary" onClick={() => selectFeature('transactions')}>
            All transactions
          </Button>
        }
      />
      <div className={highlightClasses(highlight === 'month-totals')}>
        <StatGrid columns={3}>
          <StatTile label="Income" value={money(monthTotals.incomeMinor)} />
          <StatTile label="Spending" value={money(monthTotals.expenseMinor)} />
          <StatTile
            label="Balance"
            value={money(monthTotals.balanceMinor)}
            tone={monthTotals.balanceMinor < 0 ? 'attention' : 'default'}
            detail={`${monthTotals.count} transactions this month`}
          />
        </StatGrid>
      </div>
      <BudgetPanel state={state} onChange={() => selectFeature('budget')} />
      <div className={cn('grid gap-5 xl:grid-cols-2', highlightClasses(highlight === 'charts'))}>
        <ChartCard
          title="Spending by category this month"
          description="Income is not included"
          summary={
            categories.length === 0
              ? 'No spending this month.'
              : `Spending by category this month: ${categories
                  .map((item) => `${item.label} ${money(item.totalMinor)}`)
                  .join(', ')}.`
          }
          table={
            <TableRegion label="Spending by category this month">
              <table className={tableClasses}>
                <thead className={theadClasses}>
                  <tr>
                    <th scope="col" className={thClasses}>
                      Category
                    </th>
                    <th scope="col" className={cn(thClasses, 'text-right')}>
                      Spent
                    </th>
                    <th scope="col" className={cn(thClasses, 'text-right')}>
                      Share
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line tabular-nums">
                  {categories.map((item) => (
                    <tr key={item.categoryId}>
                      <th scope="row" className={rowHeaderClasses}>
                        {item.label}
                      </th>
                      <td className={cn(tdClasses, 'text-right')}>{money(item.totalMinor)}</td>
                      <td className={cn(tdClasses, 'text-right')}>
                        {(item.share * 100).toFixed(1)}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </TableRegion>
          }
        >
          {categories.length === 0 ? (
            <p className="text-sm text-ink-2">No spending recorded this month.</p>
          ) : (
            <BarList
              data={categories.map((item) => ({
                id: item.categoryId,
                label: item.label,
                value: item.totalMinor,
                display: money(item.totalMinor),
                note: `${(item.share * 100).toFixed(1)}% of spending`,
              }))}
            />
          )}
        </ChartCard>
        <ChartCard
          title="Income and spending, last 6 months"
          description="Months with no transactions show zero"
          summary={`Income and spending by month: ${months
            .map(
              (item) =>
                `${item.label} income ${money(item.incomeMinor)}, spending ${money(item.expenseMinor)}`,
            )
            .join('; ')}.`}
          table={
            <TableRegion label="Income and spending, last 6 months">
              <table className={tableClasses}>
                <thead className={theadClasses}>
                  <tr>
                    <th scope="col" className={thClasses}>
                      Month
                    </th>
                    <th scope="col" className={cn(thClasses, 'text-right')}>
                      Income
                    </th>
                    <th scope="col" className={cn(thClasses, 'text-right')}>
                      Spending
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line tabular-nums">
                  {months.map((item) => (
                    <tr key={item.month}>
                      <th scope="row" className={rowHeaderClasses}>
                        {monthLabel(item.month, 'long')}
                      </th>
                      <td className={cn(tdClasses, 'text-right')}>{money(item.incomeMinor)}</td>
                      <td className={cn(tdClasses, 'text-right')}>{money(item.expenseMinor)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </TableRegion>
          }
        >
          <ColumnChart
            categories={months.map((item) => item.label)}
            series={[
              {
                id: 'income',
                label: 'Income',
                tone: 'chart-1',
                values: months.map((item) => item.incomeMinor),
              },
              {
                id: 'spending',
                label: 'Spending',
                tone: 'chart-2',
                values: months.map((item) => item.expenseMinor),
              },
            ]}
            format={money}
            formatTick={(value) => formatMoneyCompact(value, CURRENCY)}
          />
        </ChartCard>
      </div>
      <section aria-labelledby="recent-heading" className="space-y-3">
        <h3 id="recent-heading" className="font-semibold text-ink">
          Recent transactions
        </h3>
        <ul className="divide-y divide-line rounded-xl border border-line">
          {recent.map((transaction) => (
            <li
              key={transaction.id}
              className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm"
            >
              <span className="min-w-0">
                <span className="block truncate font-medium text-ink">
                  {transaction.note || categoryLabel(transaction.categoryId)}
                </span>
                <span className="type-meta block">
                  {formatDateKey(transaction.date)} · {categoryLabel(transaction.categoryId)}
                </span>
              </span>
              <SignedAmount transaction={transaction} />
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Transactions
// ---------------------------------------------------------------------------

function initialValues(transaction: Transaction | null): TransactionValues {
  if (transaction) {
    return {
      type: transaction.type,
      amount: toAmountInput(transaction.amountMinor, CURRENCY),
      categoryId: transaction.categoryId,
      date: transaction.date,
      note: transaction.note,
    };
  }
  return { type: 'expense', amount: '', categoryId: 'food', date: todayKey(), note: '' };
}

function TransactionForm({
  transaction,
  onSave,
  onClose,
}: {
  transaction: Transaction | null;
  onSave: (input: TransactionInput) => void;
  onClose: () => void;
}) {
  const [values, setValues] = useState<TransactionValues>(() => initialValues(transaction));
  const [errors, setErrors] = useState<TransactionErrors>({});
  const formId = useId();
  const typeName = useId();
  const amountRef = useRef<HTMLInputElement>(null);
  const categoryRef = useRef<HTMLSelectElement>(null);
  const dateRef = useRef<HTMLInputElement>(null);
  const noteRef = useRef<HTMLInputElement>(null);
  const today = todayKey();

  function change<K extends keyof TransactionValues>(field: K, value: TransactionValues[K]) {
    setValues((current) => {
      const next = { ...current, [field]: value };
      // Each category belongs to one type; switching type picks that type's first category.
      if (field === 'type' && value !== current.type)
        next.categoryId = categoriesFor(value as TransactionType)[0]?.id ?? '';
      return next;
    });
    if (errors[field]) setErrors((current) => ({ ...current, [field]: undefined }));
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const result = validateTransaction(values, CURRENCY, today);
    setErrors(result.errors);
    if (!result.input) {
      const refs = { amount: amountRef, categoryId: categoryRef, date: dateRef, note: noteRef };
      const first = (['amount', 'categoryId', 'date', 'note'] as const).find(
        (key) => result.errors[key],
      );
      if (first) refs[first].current?.focus();
      return;
    }
    onSave(result.input);
  }

  return (
    <Dialog
      open
      onClose={onClose}
      title={transaction ? 'Edit transaction' : 'Add transaction'}
      footer={
        <div className="flex flex-wrap justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" form={formId}>
            {transaction ? 'Save changes' : 'Add transaction'}
          </Button>
        </div>
      }
    >
      <form id={formId} noValidate onSubmit={submit} className="space-y-4">
        <fieldset>
          <legend className="mb-1.5 text-sm font-semibold text-ink">Type</legend>
          <div className="inline-flex rounded-lg border border-control p-0.5">
            {(['expense', 'income'] as const).map((type) => (
              <label
                key={type}
                className={cn(
                  'cursor-pointer rounded-md px-3 py-1.5 text-sm font-semibold transition-colors',
                  'has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-1 has-[:focus-visible]:outline-focus',
                  values.type === type
                    ? 'bg-violet-soft text-violet'
                    : 'text-ink-2 hover:bg-raised',
                )}
              >
                <input
                  type="radio"
                  name={typeName}
                  value={type}
                  checked={values.type === type}
                  onChange={() => change('type', type)}
                  className="sr-only"
                />
                {type === 'expense' ? 'Expense' : 'Income'}
              </label>
            ))}
          </div>
        </fieldset>
        <TextField
          ref={amountRef}
          label={`Amount (${CURRENCY})`}
          inputMode="decimal"
          placeholder="e.g. 250.50"
          autoComplete="off"
          value={values.amount}
          error={errors.amount}
          onChange={(event) => change('amount', event.target.value)}
        />
        <SelectField
          ref={categoryRef}
          label="Category"
          value={values.categoryId}
          error={errors.categoryId}
          onChange={(event) => change('categoryId', event.target.value)}
        >
          {categoriesFor(values.type).map((category) => (
            <option key={category.id} value={category.id}>
              {category.label}
            </option>
          ))}
        </SelectField>
        <TextField
          ref={dateRef}
          type="date"
          label="Date"
          max={today}
          value={values.date}
          error={errors.date}
          onChange={(event) => change('date', event.target.value)}
        />
        <TextField
          ref={noteRef}
          label="Note"
          optional
          maxLength={NOTE_MAX_LENGTH + 20}
          placeholder="e.g. Canteen lunch"
          autoComplete="off"
          value={values.note}
          error={errors.note}
          onChange={(event) => change('note', event.target.value)}
        />
        <p className="type-meta">
          Amounts are parsed by the template’s parseAmount; the other checks mirror its
          validateTransaction.
        </p>
      </form>
    </Dialog>
  );
}

function TransactionsScreen({ state, update, highlight }: Props) {
  const [filters, setFilters] = useState<Filters>({ ...DEFAULT_FILTERS, period: 'all' });
  const [form, setForm] = useState<{ key: number; transaction: Transaction | null } | null>(null);
  const [deleting, setDeleting] = useState<Transaction | null>(null);
  const [shown, setShown] = useState(PAGE_SIZE);
  const { rowsRef, fallbackRef, deleting: willDelete } = useFocusAfterDelete();
  const today = todayKey();

  const visible = filterTransactions(state.transactions, filters, today);
  const page = visible.slice(0, shown);
  const filteredTotals = totals(visible);
  const filtered =
    filters.period !== 'all' ||
    filters.type !== 'all' ||
    filters.categoryId !== 'all' ||
    filters.query.trim() !== '';
  const categoryOptions =
    filters.type === 'all'
      ? [...categoriesFor('expense'), ...categoriesFor('income')]
      : categoriesFor(filters.type);

  function resetFilters() {
    setShown(PAGE_SIZE);
    setFilters({ ...DEFAULT_FILTERS, period: 'all' });
  }

  function set<K extends keyof Filters>(key: K, value: Filters[K]) {
    setShown(PAGE_SIZE);
    setFilters((current) => {
      const next = { ...current, [key]: value };
      // A category of the other type would match nothing, so it is cleared.
      if (
        key === 'type' &&
        value !== 'all' &&
        next.categoryId !== 'all' &&
        !categoriesFor(value as TransactionType).some((category) => category.id === next.categoryId)
      )
        next.categoryId = 'all';
      return next;
    });
  }

  function save(input: TransactionInput) {
    const editing = form?.transaction;
    if (editing) {
      update(
        (current) =>
          expenseReducer(current, {
            type: 'transaction/update',
            transaction: { ...editing, ...input },
          }),
        'Saved changes to the transaction.',
      );
    } else {
      update(
        (current) =>
          expenseReducer(current, {
            type: 'transaction/add',
            transaction: { ...input, id: newId(), createdAt: new Date().toISOString() },
          }),
        `Added ${input.type === 'income' ? 'income' : 'expense'} of ${money(input.amountMinor)}.`,
      );
    }
    setForm(null);
  }

  function confirmDelete() {
    if (!deleting) return;
    const { id } = deleting;
    willDelete(page.findIndex((transaction) => transaction.id === id));
    update(
      (current) => expenseReducer(current, { type: 'transaction/delete', id }),
      'Deleted the transaction.',
    );
    setDeleting(null);
  }

  return (
    <div className="space-y-5">
      <ScreenHeading
        title="Transactions"
        description={`${state.transactions.length} transactions, newest first.`}
        actions={
          <Button
            size="sm"
            icon={<Plus aria-hidden="true" className="size-4" />}
            onClick={() => setForm({ key: Date.now(), transaction: null })}
          >
            Add transaction
          </Button>
        }
      />
      {state.transactions.length === 0 ? (
        <EmptyState
          icon={<ReceiptText aria-hidden="true" className="size-6" />}
          title="No transactions yet"
          headingRef={fallbackRef}
          actions={
            <Button size="sm" onClick={() => setForm({ key: Date.now(), transaction: null })}>
              Add your first transaction
            </Button>
          }
        >
          Record an expense or some income. Reset the demo to bring back the sample transactions.
        </EmptyState>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <SelectField
              label="Period"
              value={filters.period}
              onChange={(event) => set('period', event.target.value as PeriodId)}
            >
              {PERIODS.map((period) => (
                <option key={period.id} value={period.id}>
                  {period.label}
                </option>
              ))}
            </SelectField>
            <SelectField
              label="Type"
              value={filters.type}
              onChange={(event) => set('type', event.target.value as Filters['type'])}
            >
              <option value="all">Income and expenses</option>
              <option value="expense">Expenses</option>
              <option value="income">Income</option>
            </SelectField>
            <SelectField
              label="Category"
              value={filters.categoryId}
              onChange={(event) => set('categoryId', event.target.value)}
            >
              <option value="all">All categories</option>
              {categoryOptions.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.label}
                </option>
              ))}
            </SelectField>
            <TextField
              type="search"
              label="Search notes"
              placeholder="e.g. textbook"
              maxLength={60}
              value={filters.query}
              onChange={(event) => set('query', event.target.value)}
            />
            {filters.period === 'custom' ? (
              <>
                <TextField
                  type="date"
                  label="From"
                  value={filters.from}
                  max={filters.to || today}
                  onChange={(event) => set('from', event.target.value)}
                />
                <TextField
                  type="date"
                  label="To"
                  value={filters.to}
                  min={filters.from || undefined}
                  max={today}
                  onChange={(event) => set('to', event.target.value)}
                />
              </>
            ) : null}
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="type-meta" role="status">
              {visible.length === state.transactions.length
                ? `Showing all ${visible.length} transactions`
                : `Showing ${visible.length} of ${state.transactions.length} transactions`}
            </p>
            {filtered ? (
              <Button size="sm" variant="ghost" onClick={resetFilters}>
                Reset filters
              </Button>
            ) : null}
          </div>
          <StatGrid columns={3}>
            <StatTile label="Income" value={money(filteredTotals.incomeMinor)} />
            <StatTile label="Spending" value={money(filteredTotals.expenseMinor)} />
            <StatTile
              label="Net"
              value={money(filteredTotals.balanceMinor)}
              tone={filteredTotals.balanceMinor < 0 ? 'attention' : 'default'}
              detail="For the transactions shown"
            />
          </StatGrid>
          {visible.length === 0 ? (
            <div className="rounded-xl border border-dashed border-line-strong px-4 py-8 text-center text-sm text-ink-2">
              <p className="font-semibold text-ink">No transactions match these filters.</p>
              <p className="mt-1">Choose a longer period or another category.</p>
              <Button
                ref={fallbackRef}
                size="sm"
                variant="secondary"
                className="mt-3"
                onClick={resetFilters}
              >
                Reset filters
              </Button>
            </div>
          ) : (
            <div className={highlightClasses(highlight === 'transaction-list')}>
              <TableRegion label="Transactions">
                <table className={tableClasses}>
                  <caption className="sr-only">Transactions, newest first</caption>
                  <thead className={theadClasses}>
                    <tr>
                      <th scope="col" className={thClasses}>
                        Transaction
                      </th>
                      <th scope="col" className={cn(thClasses, 'hidden md:table-cell')}>
                        Category
                      </th>
                      <th scope="col" className={cn(thClasses, 'text-right')}>
                        Amount
                      </th>
                      <th scope="col" className={thClasses}>
                        <span className="sr-only">Actions</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody ref={rowsRef} className="divide-y divide-line">
                    {page.map((transaction) => (
                      <tr key={transaction.id}>
                        <td className={tdClasses}>
                          <span className="block font-medium text-ink">
                            {transaction.note || categoryLabel(transaction.categoryId)}
                          </span>
                          <span className="type-meta block">
                            {formatDateKey(transaction.date)}
                            <span className="md:hidden">
                              {' '}
                              · {categoryLabel(transaction.categoryId)}
                            </span>
                          </span>
                        </td>
                        <td className={cn(tdClasses, 'hidden md:table-cell')}>
                          {categoryLabel(transaction.categoryId)}
                        </td>
                        <td className={cn(tdClasses, 'text-right')}>
                          <SignedAmount transaction={transaction} />
                        </td>
                        <td className={actionCellClasses}>
                          <button
                            type="button"
                            className={cn(iconButton, 'hover:text-ink')}
                            aria-label={`Edit ${transaction.note || categoryLabel(transaction.categoryId)} on ${formatDateKey(transaction.date)}`}
                            onClick={() => setForm({ key: Date.now(), transaction })}
                          >
                            <Pencil aria-hidden="true" className="size-4" />
                          </button>
                          <button
                            type="button"
                            className={cn(iconButton, 'hover:text-danger')}
                            aria-label={`Delete ${transaction.note || categoryLabel(transaction.categoryId)} on ${formatDateKey(transaction.date)}`}
                            data-delete=""
                            onClick={() => setDeleting(transaction)}
                          >
                            <Trash2 aria-hidden="true" className="size-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </TableRegion>
              {visible.length > page.length ? (
                <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                  <p className="type-meta">
                    Showing the newest {page.length} of {visible.length}
                  </p>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => setShown((value) => value + PAGE_SIZE)}
                  >
                    Show {Math.min(PAGE_SIZE, visible.length - page.length)} more
                  </Button>
                </div>
              ) : null}
            </div>
          )}
        </>
      )}
      {form ? (
        <TransactionForm
          key={form.key}
          transaction={form.transaction}
          onSave={save}
          onClose={() => setForm(null)}
        />
      ) : null}
      <Dialog
        open={deleting !== null}
        onClose={() => setDeleting(null)}
        title="Delete this transaction?"
        confirmation
        footer={
          <div className="flex flex-wrap justify-end gap-2">
            <Button variant="secondary" onClick={() => setDeleting(null)}>
              Cancel
            </Button>
            <Button variant="danger" onClick={confirmDelete}>
              Delete transaction
            </Button>
          </div>
        }
      >
        <p className="text-ink-2">
          {deleting
            ? `${money(deleting.amountMinor)} on ${formatDateKey(deleting.date)}${deleting.note ? ` (${deleting.note})` : ''} will be removed. In this demo, Reset brings the sample data back.`
            : ''}
        </p>
      </Dialog>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Budget
// ---------------------------------------------------------------------------

function BudgetScreen({ state, update, highlight }: Props) {
  const budgetMinor = budgetOf(state);
  const [input, setInput] = useState(budgetMinor > 0 ? toAmountInput(budgetMinor, CURRENCY) : '0');
  const [error, setError] = useState<string | undefined>(undefined);

  // The same rules as saveBudget in the template's SettingsView.
  function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (input.trim() === '0') {
      setError(undefined);
      update(
        (current) => expenseReducer(current, { type: 'budget/set', monthlyBudgetMinor: 0 }),
        'Monthly budget turned off.',
      );
      return;
    }
    const parsed = parseAmount(input, CURRENCY);
    if (!parsed.ok) {
      setError(`${parsed.error} Enter 0 to turn the budget off.`);
      return;
    }
    setError(undefined);
    update(
      (current) =>
        expenseReducer(current, { type: 'budget/set', monthlyBudgetMinor: parsed.amountMinor }),
      `Monthly budget set to ${money(parsed.amountMinor)}.`,
    );
  }

  function useDefault() {
    setError(undefined);
    setInput(DEFAULT_BUDGET_MINOR > 0 ? toAmountInput(DEFAULT_BUDGET_MINOR, CURRENCY) : '0');
    update(
      (current) => expenseReducer(current, { type: 'budget/set', monthlyBudgetMinor: null }),
      'Using the default budget from app.config.json.',
    );
  }

  return (
    <div className="space-y-6">
      <ScreenHeading
        title="Budget"
        description="Spending this month is compared with this amount on the overview."
      />
      <form
        noValidate
        onSubmit={save}
        className={cn(
          'grid gap-4 rounded-xl border border-line p-4 sm:grid-cols-[minmax(0,16rem)_auto] sm:items-end',
          highlightClasses(highlight === 'budget-form'),
        )}
      >
        <TextField
          label={`Monthly budget (${CURRENCY})`}
          description="Enter 0 to turn the budget off."
          inputMode="decimal"
          value={input}
          error={error}
          onChange={(event) => setInput(event.target.value)}
        />
        <div className="flex flex-wrap gap-2">
          <Button type="submit">Save budget</Button>
          <Button variant="secondary" onClick={useDefault}>
            Use the default ({money(DEFAULT_BUDGET_MINOR)})
          </Button>
        </div>
      </form>
      <p className="text-sm text-ink-2">
        {state.settings.monthlyBudgetMinor === null
          ? `Now using the default from src/app.config.json: ${money(DEFAULT_BUDGET_MINOR)}.`
          : state.settings.monthlyBudgetMinor === 0
            ? 'The budget is turned off.'
            : `Now using your own budget: ${money(state.settings.monthlyBudgetMinor)}.`}
      </p>
      <BudgetPanel state={state} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Data model
// ---------------------------------------------------------------------------

function DataScreen({ state, highlight }: Props) {
  const newest = filterTransactions(
    state.transactions,
    { ...DEFAULT_FILTERS, period: 'all' },
    todayKey(),
  ).slice(0, 3);
  return (
    <div className="space-y-5">
      <ScreenHeading
        title="Data model"
        description={
          <>
            The demo’s data, in the shape the template saves to localStorage under the key{' '}
            <code className="rounded bg-raised px-1 font-mono text-xs">{STORAGE_KEY}</code>.
          </>
        }
      />
      <StatGrid columns={3}>
        <StatTile label="version" value={state.version} />
        <StatTile
          label="transactions"
          value={state.transactions.length}
          detail="objects in a list"
        />
        <StatTile
          label="settings.monthlyBudgetMinor"
          value={state.settings.monthlyBudgetMinor ?? 'null'}
          detail={
            state.settings.monthlyBudgetMinor === null
              ? 'null means the default budget'
              : 'in paise'
          }
        />
      </StatGrid>
      <div className={cn('space-y-3', highlightClasses(highlight === 'data-json'))}>
        <h3 className="font-semibold text-ink">The newest transactions</h3>
        <p className="type-meta">
          amountMinor is a whole number of paise: {money(12050)} is stored as 12050.
        </p>
        <JsonView value={newest} />
      </div>
      <details className="rounded-xl border border-line">
        <summary className="cursor-pointer rounded-xl px-4 py-3 text-sm font-semibold text-ink hover:bg-raised/60">
          The whole object ({state.transactions.length} transactions)
        </summary>
        <div className="border-t border-line p-3">
          <JsonView value={state} />
        </div>
      </details>
    </div>
  );
}

// ---------------------------------------------------------------------------
// The demo
// ---------------------------------------------------------------------------

function ExpenseDemoView(props: Props) {
  switch (props.feature) {
    case 'transactions':
      return <TransactionsScreen {...props} />;
    case 'budget':
      return <BudgetScreen {...props} />;
    case 'data':
      return <DataScreen {...props} />;
    default:
      return <OverviewScreen {...props} />;
  }
}

function addedTransactions(state: ExpenseData, start: ExpenseData): Transaction[] {
  const before = new Set(start.transactions.map((transaction) => transaction.id));
  return state.transactions.filter((transaction) => !before.has(transaction.id));
}

export const expenseImplementation = defineDemo<ExpenseData>({
  createState: () => createDemoData(CURRENCY, new Date()),
  createEmptyState: () => createEmptyData(),
  readState: (value) => {
    // The template's own check on saved data: anything malformed is rejected.
    const result = validateData(value);
    return typeof result === 'string' ? null : result;
  },
  View: ExpenseDemoView,
  checks: {
    'add-expense': (state, start) => {
      const added = addedTransactions(state, start).filter((item) => item.type === 'expense');
      return added.length > 0
        ? {
            done: true,
            detail: `Added ${added.map((item) => `${money(item.amountMinor)} (${categoryLabel(item.categoryId)})`).join(', ')}.`,
          }
        : { done: false, detail: 'No new expense in the list yet.' };
    },
    budget: (state, start) =>
      state.settings.monthlyBudgetMinor !== start.settings.monthlyBudgetMinor
        ? {
            done: true,
            detail:
              state.settings.monthlyBudgetMinor === null
                ? `Back to the default budget of ${money(DEFAULT_BUDGET_MINOR)}.`
                : state.settings.monthlyBudgetMinor === 0
                  ? 'The budget was turned off.'
                  : `The budget is now ${money(state.settings.monthlyBudgetMinor)}.`,
          }
        : { done: false, detail: 'The budget hasn’t been changed yet.' },
    'data-model': (state, start) => {
      const added = addedTransactions(state, start);
      const last = added[added.length - 1];
      return last
        ? {
            done: true,
            detail: `Your newest transaction is stored with amountMinor ${last.amountMinor}.`,
          }
        : { done: false, detail: 'Add a transaction first, so there is something new to find.' };
    },
  },
  describe: (state) => {
    const budget = budgetOf(state);
    return `${state.transactions.length} transactions · budget ${budget > 0 ? money(budget) : 'off'} · amounts in ${CURRENCY}`;
  },
});
