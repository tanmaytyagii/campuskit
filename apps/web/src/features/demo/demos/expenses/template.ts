/**
 * The expense tracker template's own modules, imported unchanged from
 * templates/expense-tracker. Totals, filters, chart figures, the budget,
 * amount parsing and formatting, categories and the sample transactions all
 * come from this code. Only modules without dependencies are imported; the
 * template's React screens and its Recharts charts are re-created in the demo.
 */
export {
  budgetStatus,
  DEFAULT_FILTERS,
  filterTransactions,
  monthlyTotals,
  PERIODS,
  spendingByCategory,
  totals,
  type Filters,
  type PeriodId,
} from '../../../../../../../templates/expense-tracker/src/lib/analytics.ts';
export {
  categoriesFor,
  categoryLabel,
  getCategory,
  isCategoryFor,
} from '../../../../../../../templates/expense-tracker/src/lib/categories.ts';
export {
  formatDateKey,
  isValidDateKey,
  monthKeyOf,
  monthLabel,
  todayKey,
} from '../../../../../../../templates/expense-tracker/src/lib/dates.ts';
export {
  createDemoData,
  createEmptyData,
} from '../../../../../../../templates/expense-tracker/src/lib/demo-data.ts';
export {
  currencyDigits,
  formatMoney,
  formatMoneyCompact,
  majorToMinor,
  parseAmount,
  toAmountInput,
} from '../../../../../../../templates/expense-tracker/src/lib/money.ts';
export {
  STORAGE_KEY,
  validateData,
} from '../../../../../../../templates/expense-tracker/src/lib/storage.ts';
export { expenseReducer } from '../../../../../../../templates/expense-tracker/src/state/reducer.ts';
export {
  loadConfig,
  type CurrencyCode,
} from '../../../../../../../templates/expense-tracker/src/config.ts';
export type {
  ExpenseData,
  Transaction,
  TransactionType,
} from '../../../../../../../templates/expense-tracker/src/types.ts';
