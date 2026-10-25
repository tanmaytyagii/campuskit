import type { DemoDefinition } from '../../types.ts';

export const expenseDemo: DemoDefinition = {
  projectId: 'expense-tracker',
  appName: 'Personal Expense Tracker',
  fidelity: 'template-logic',
  summary:
    'Add, edit and filter transactions, set a monthly budget and watch the totals and charts follow, using the template’s own calculations and sample data.',
  notice:
    'A re-created version of the app for trying out with fictional data. The screens and charts are rebuilt with CampusKit’s components, while the totals, filters, budget, amount parsing and data updates run the template’s own code.',
  runs: {
    files: [
      'src/lib/analytics.ts',
      'src/lib/money.ts',
      'src/lib/categories.ts',
      'src/lib/dates.ts',
      'src/lib/demo-data.ts',
      'src/lib/storage.ts',
      'src/state/reducer.ts',
      'src/config.ts',
      'src/types.ts',
    ],
    description:
      'Filtering, totals, the figures behind both charts, the budget, amount parsing and formatting, the categories, the reducer that applies every change, the check on saved data and the sample transactions are the template’s own modules, imported unchanged. The form’s checks mirror validateTransaction in src/components/TransactionForm.tsx, and a test fails if that function’s messages change.',
  },
  data: {
    description:
      'The template’s fictional sample transactions for the last six months: an allowance, tutoring income, hostel rent, food, travel, books and a scholarship, in Indian rupees.',
    editable: true,
    persistence: 'session',
    reset: '“Reset to the example” brings back the sample transactions and the default budget.',
  },
  features: [
    {
      id: 'overview',
      label: 'Overview',
      explanation:
        'This month’s income, spending and balance, the budget bar and two charts. Every figure is calculated from the transactions by src/lib/analytics.ts, with amounts kept as whole paise so the totals never drift. In the template this is the Overview screen.',
      tryThis: [
        'Add an expense on Transactions, then come back to see the totals, the budget bar and the charts change.',
        'Open “Table view” on a chart to read the exact figures.',
      ],
      simplified: [
        'The template draws its charts with the Recharts library, including a donut chart for categories; the demo draws bar charts from the same figures.',
      ],
      source: [
        { file: 'src/lib/analytics.ts', symbol: 'totals' },
        { file: 'src/lib/analytics.ts', symbol: 'spendingByCategory' },
        { file: 'src/lib/analytics.ts', symbol: 'monthlyTotals' },
        { file: 'src/lib/analytics.ts', symbol: 'budgetStatus' },
        { file: 'src/views/OverviewView.tsx', symbol: 'OverviewView' },
      ],
      learn: {
        walkthrough: ['analytics', 'charts', 'money'],
        architecture: ['analytics', 'views'],
        viva: ['totals', 'empty-months', 'minor-units'],
      },
    },
    {
      id: 'transactions',
      label: 'Transactions',
      explanation:
        'Every transaction, newest first, filtered by period, type, category and note with filterTransactions. Adding or editing parses the amount with the template’s parseAmount, so amounts like 12.345 are refused with its own message.',
      tryThis: [
        'Add an expense with the amount 12.345, read the message, then correct it.',
        'Filter to last month and one category, and compare the totals for the filtered list.',
        'Edit or delete a transaction.',
      ],
      simplified: [
        'The template can export the filtered list as CSV; the demo can’t.',
        'The form is CampusKit’s; its checks mirror validateTransaction in the template’s src/components/TransactionForm.tsx.',
      ],
      source: [
        { file: 'src/lib/analytics.ts', symbol: 'filterTransactions' },
        { file: 'src/lib/analytics.ts', symbol: 'periodRange' },
        { file: 'src/lib/money.ts', symbol: 'parseAmount' },
        { file: 'src/components/TransactionForm.tsx', symbol: 'validateTransaction' },
        { file: 'src/views/TransactionsView.tsx', symbol: 'TransactionsView' },
      ],
      learn: {
        walkthrough: ['form', 'editor', 'transactions-view'],
        architecture: ['ui-components', 'categories-dates'],
        viva: ['date-filter', 'category-type', 'fresh-form'],
      },
    },
    {
      id: 'budget',
      label: 'Budget',
      explanation:
        'The monthly budget the overview compares spending against. The template keeps a default in src/app.config.json and saves your own value with its data; 0 turns the budget off.',
      tryThis: [
        'Set the budget to 5000, then open Overview to see the budget bar change.',
        'Go back to the default budget from the configuration file.',
      ],
      simplified: [
        'In the template this is part of the Budget & data screen, which also downloads and imports JSON backups.',
      ],
      source: [
        { file: 'src/views/SettingsView.tsx', symbol: 'saveBudget' },
        { file: 'src/views/SettingsView.tsx', symbol: 'resetToDefaultBudget' },
        { file: 'src/lib/analytics.ts', symbol: 'budgetStatus' },
        { file: 'src/state/reducer.ts', symbol: 'expenseReducer' },
      ],
      learn: {
        walkthrough: ['settings-view', 'reducer'],
        architecture: ['state', 'config'],
        viva: ['budget', 'reducer-context'],
      },
    },
    {
      id: 'data',
      label: 'Data model',
      explanation:
        'The demo’s data in the shape the template saves: a list of transactions with amounts in paise (amountMinor), and the budget setting. The JSON below is the demo’s data as it is now.',
      tryThis: ['Add a transaction and find it here: ₹120.50 is stored as 12050.'],
      simplified: [
        'The template saves this object in localStorage under “campuskit-expenses:v1”; the demo keeps it in this tab only.',
      ],
      source: [
        { file: 'src/types.ts', symbol: 'Transaction' },
        { file: 'src/types.ts', symbol: 'ExpenseData' },
        { file: 'src/lib/storage.ts', symbol: 'validateData' },
        { file: 'src/lib/money.ts', symbol: 'toAmountInput' },
      ],
      learn: {
        walkthrough: ['types', 'storage', 'money'],
        architecture: ['storage', 'money'],
        viva: ['minor-units', 'storage', 'privacy'],
      },
    },
  ],
  tour: [
    {
      id: 'totals',
      feature: 'overview',
      title: 'This month at a glance',
      text: 'Income, spending and balance for the current month, calculated by totals() in src/lib/analytics.ts from the template’s own sample transactions.',
      highlight: 'month-totals',
    },
    {
      id: 'charts',
      feature: 'overview',
      title: 'Charts from the same numbers',
      text: 'Both charts use figures from spendingByCategory() and monthlyTotals(). Months with no transactions still appear, with zero, so the chart never skips a month.',
      highlight: 'charts',
    },
    {
      id: 'list',
      feature: 'transactions',
      title: 'Transactions and filters',
      text: 'The list is filterTransactions() with the period, type, category and note you choose. The totals under the filters describe only the filtered transactions.',
      highlight: 'transaction-list',
    },
    {
      id: 'budget',
      feature: 'budget',
      title: 'The monthly budget',
      text: 'The budget comes from src/app.config.json until you set your own. budgetStatus() compares it with this month’s spending.',
      highlight: 'budget-form',
    },
    {
      id: 'model',
      feature: 'data',
      title: 'Whole numbers of paise',
      text: 'Every amount is stored as an integer number of paise, so adding hundreds of transactions never produces rounding errors such as 0.1 + 0.2 = 0.30000000000000004.',
      highlight: 'data-json',
    },
  ],
  presentation: [
    {
      id: 'introduce',
      feature: 'overview',
      title: 'Introduce the project',
      say: 'This app helps a student record income and spending, keep to a monthly budget and see where the money goes. Everything stays in the browser.',
      action:
        'Point at this month’s totals, the budget bar and the note that the transactions are fictional.',
      expect: 'Income, spending and balance for this month, a budget bar and two charts.',
      concept: 'The problem the project solves and its scope',
      learn: { viva: ['problem'] },
    },
    {
      id: 'add-expense',
      feature: 'transactions',
      title: 'Add an expense, with validation',
      say: 'Amounts are checked before they are saved. They are parsed as text, so no floating-point rounding can creep in.',
      action:
        'Select “Add transaction”, type 12.345 as the amount and save. Read the message, change the amount to 120, choose Food & dining and save.',
      expect:
        'The first save is refused with “Use at most 2 decimal places.”; after the change the expense appears at the top of the list.',
      concept: 'Input validation with parseAmount and the transaction/add action',
      learn: { walkthrough: ['money', 'form'], viva: ['minor-units'] },
    },
    {
      id: 'totals-update',
      feature: 'overview',
      title: 'Show the totals and charts update',
      say: 'Nothing is stored about totals. Every figure is recalculated from the list of transactions.',
      action:
        'Open Overview, compare this month’s spending, then switch the category chart to its table view.',
      expect:
        'This month’s spending includes the new expense, and Food & dining shows the extra amount.',
      concept: 'Derived data: totals and charts from one list of transactions',
      learn: { walkthrough: ['analytics'], viva: ['totals'] },
    },
    {
      id: 'filter',
      feature: 'transactions',
      title: 'Filter the transactions',
      say: 'Filters are one pure function over the list, which makes them simple to test.',
      action:
        'On Transactions, choose “Last month” as the period and Food & dining as the category.',
      expect: 'Only last month’s food expenses are listed, and the totals describe just those.',
      concept: 'filterTransactions and date ranges from periodRange',
      learn: { walkthrough: ['analytics'], viva: ['date-filter'] },
    },
    {
      id: 'budget',
      feature: 'budget',
      title: 'Change the monthly budget',
      say: 'The default budget comes from the configuration file, which the generator customizes. A student can set their own.',
      action: 'On Budget, set the budget to 5000 and save, then open Overview.',
      expect: 'The budget bar and the amount left or over budget change to match the new budget.',
      concept: 'Configuration defaults and the budget/set action',
      learn: { walkthrough: ['settings-view'], viva: ['budget'] },
    },
    {
      id: 'data-model',
      feature: 'data',
      title: 'Explain the data model and limitations',
      say: 'Amounts are whole numbers of paise. The data lives only in this browser’s localStorage, so it isn’t shared between devices or backed up automatically.',
      action: 'Open Data model and find the ₹120 expense you added.',
      expect: 'It is stored with amountMinor 12000.',
      concept: 'Money as integers and the limits of browser storage',
      learn: { walkthrough: ['types', 'storage'], viva: ['limitations', 'storage'] },
    },
  ],
  fullProjectAdds: [
    'Saves to the browser’s localStorage, so the data is still there after closing the browser. If a saved transaction is damaged, it loads the others and keeps a backup copy.',
    'CSV export of the filtered transactions, and JSON backups you can download and import.',
    'Charts drawn with Recharts, including a donut chart of spending by category, each with a table view.',
    'A choice of currencies (₹, $, €, £, ¥), the app name, accent colour and default budget in src/app.config.json, which the generator customizes.',
    'Automated tests (npm test) for the money handling, analytics, storage and screens.',
  ],
  limitations: [
    'The transactions are fictional and kept only in this browser tab. Reset, or closing the tab, brings back the sample data.',
    'Amounts are in Indian rupees, the template’s default currency.',
    'Dates come from your computer’s clock, so the sample covers the six months up to today.',
  ],
};
