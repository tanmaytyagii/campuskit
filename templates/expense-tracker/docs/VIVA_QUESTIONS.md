# Viva questions

Questions an examiner may ask about this project, with answers based on how this code actually works. Read the referenced files and be ready to explain each answer in your own words.

## 1. What problem does the project solve?

Students often lose track of small daily spending. The app records income and expenses, groups them by category, compares spending with a monthly budget and shows trends, so it is easy to see where money goes.

## 2. Why are amounts stored as integers?

JavaScript numbers are binary floating point, so `0.1 + 0.2` is not exactly `0.3`. Storing the smallest unit (paise or cents) as an integer makes every sum exact. `parseAmount` in `src/lib/money.ts` converts typed text such as `1,250.50` to `125050` using string arithmetic rather than `parseFloat`.

## 3. How do you format money for different currencies?

With the built-in `Intl.NumberFormat` API, using a locale per currency (for example `en-IN` for INR, which produces Indian grouping like ₹1,50,000.00). The number of decimal places comes from the formatter itself, which is why JPY has none.

## 4. How are the totals and charts calculated?

`src/lib/analytics.ts` filters the transactions for the selected period and filters, then `totals`, `spendingByCategory` and `monthlyTotals` loop over them and add up `amountMinor`. Nothing is cached or estimated; every render recalculates from the saved data.

## 5. How is the date filter implemented?

Each period is converted to a `from`/`to` pair of `YYYY-MM-DD` strings (`periodRange`). Because this format sorts like the dates it represents, filtering is a simple string comparison: `date >= from && date <= to`.

## 6. Where is the data stored and how is it protected from corruption?

In localStorage under `campuskit-expenses:v1`. On load, `validateData` checks every transaction (type, positive integer amount, known category for that type, valid date). If anything is wrong the app starts fresh and keeps the unreadable value under a backup key. Imported backups go through the same validation.

## 7. Why use a reducer and context?

All changes (add, update, delete, set budget, replace data) are handled by one pure function, `expenseReducer`. Context (`ExpenseProvider` and `useExpenses`) gives every screen access to the data and `dispatch` without passing props through each level, and an effect saves the data whenever it changes.

## 8. Which charting library did you use and why?

Recharts, a React charting library that draws SVG and is MIT licensed. It integrates naturally with React components. To keep charts accessible, each has an `aria-label` summary and a table view with the same numbers.

## 9. How does the budget feature work?

The default budget comes from `monthlyBudget` in `app.config.json`. The user can override it on the Budget & data screen; the override is saved in `settings.monthlyBudgetMinor` (or `null` to use the default). `budgetStatus` adds this month’s expenses and divides by the budget to get the percentage used.

## 10. What does the CSV export protect against?

Values with commas, quotes or line breaks are quoted (RFC 4180). Cells beginning with `=`, `+`, `-` or `@` get an apostrophe prefix so spreadsheet programs don’t run them as formulas (CSV injection).

## 11. How did you test it?

`npm test` runs Vitest. Unit tests check money parsing/formatting, period ranges, filters, totals, category shares, monthly series, budget status, backup validation and demo data. Component tests render the app in jsdom and simulate adding transactions, validation errors, switching a chart to its table, filtering and deleting.

## 12. What are the limitations and possible improvements?

Data stays in one browser, there is no bank integration, categories are fixed and currency changes don’t convert old amounts. Improvements include recurring transactions, custom categories, per-category budgets, and a backend with accounts for syncing.
