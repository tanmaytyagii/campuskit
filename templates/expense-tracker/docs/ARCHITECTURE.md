# Architecture

This document explains how the expense tracker is put together.

## Overview

A **single-page application** built with React and TypeScript, bundled by Vite. All logic runs in the browser and data is kept in localStorage.

```text
 app.config.json ──► config.ts ──► main.tsx ──► <App>
                                                 │
                         ┌───────────────────────┼─────────────────────┐
                         ▼                       ▼                     ▼
                  ExpenseProvider          NoticeProvider        useHashRoute()
            (data, dispatch, budget)       (toast messages)      (current view)
                         │
          ┌──────────────┼────────────────────┐
          ▼              ▼                    ▼
    OverviewView   TransactionsView     SettingsView
          │              │                    │
          └──── lib/analytics.ts (filters, totals, chart data)
                lib/money.ts (parse/format) · lib/storage.ts (localStorage)
```

## Layers

| Layer         | Files                                                  | Responsibility                                                                              |
| ------------- | ------------------------------------------------------ | ------------------------------------------------------------------------------------------- |
| Configuration | `src/app.config.json`, `src/config.ts`                 | Editable settings, themes and currency list, validated at start-up.                         |
| Types         | `src/types.ts`                                         | `Transaction`, `ExpenseData`.                                                               |
| Logic         | `src/lib/*.ts`                                         | Pure functions with no React: money, dates, categories, analytics, storage, CSV, demo data. |
| State         | `src/state/reducer.ts`, `src/state/ExpenseContext.tsx` | A reducer owns every change; the context shares data and saves it.                          |
| Views         | `src/views/*.tsx`                                      | One component per screen.                                                                   |
| Components    | `src/components/*.tsx`                                 | Charts, the transaction form and list, dialogs, notices.                                    |

## Data model

```ts
interface Transaction {
  id: string;
  type: 'expense' | 'income';
  amountMinor: number; // smallest currency unit, e.g. paise
  categoryId: string; // see src/lib/categories.ts
  date: string; // local "YYYY-MM-DD"
  note: string;
  createdAt: string; // ISO timestamp
}

interface ExpenseData {
  version: 1;
  transactions: Transaction[];
  settings: { monthlyBudgetMinor: number | null }; // null = use app.config.json
}
```

The `version` field lets a future release migrate old saved data safely.

As a relational database this would be:

| Table          | Columns                                                                                                                           |
| -------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| `categories`   | `id` (primary key), `label`, `type`, `colour`                                                                                     |
| `transactions` | `id` (primary key), `type`, `amount_minor` (integer), `category_id` (foreign key → `categories.id`), `date`, `note`, `created_at` |
| `settings`     | `key`, `value` (for the monthly budget)                                                                                           |

## How numbers are produced

1. `filterTransactions` applies the period, type, category and search filters (`src/lib/analytics.ts`).
2. `totals` adds income and spending separately and subtracts them for the balance.
3. `spendingByCategory` groups expenses by category and computes each share.
4. `monthlyTotals` builds a fixed window of months (including empty ones) for the bar chart.
5. `budgetStatus` compares this month’s spending with the budget.

Because these are pure functions, each one has unit tests with hand-checked expected values (`src/lib/analytics.test.ts`).

## Charts and accessibility

Charts use [Recharts](https://github.com/recharts/recharts), which renders SVG. Every chart has a text alternative (`aria-label` with a summary) and a **Show as table** button that displays the same numbers as a table, so no information depends on colour alone. On small screens the transaction table becomes stacked rows; ARIA table roles keep it readable by screen readers.

## Design decisions

- **Integer minor units** avoid floating-point rounding errors in money.
- **String parsing of amounts** (`parseAmount`) avoids `parseFloat` rounding and gives clear error messages.
- **localStorage** keeps the project runnable offline with no setup; the trade-off is no sync between devices.
- **A reducer** keeps every data change in one testable place.
- **Validated backups** mean an edited or damaged JSON file is rejected with a reason instead of breaking the app.
- **CSV export** quotes values and neutralises cells that start with `=`, `+`, `-` or `@` to prevent formula injection in spreadsheets.

## Ideas for extending the project

- Recurring transactions (rent, subscriptions).
- Custom categories stored with the data.
- Per-category budgets and alerts.
- A backend with user accounts to sync between devices.
- Import from a bank statement CSV.
