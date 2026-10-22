/** Data types shared across the app. */

export type TransactionType = 'expense' | 'income';

export interface Transaction {
  id: string;
  type: TransactionType;
  /**
   * Amount in the currency's smallest unit (paise, cents...), always positive.
   * Whole numbers avoid floating-point errors such as 0.1 + 0.2 !== 0.3.
   */
  amountMinor: number;
  categoryId: string;
  /** Local date, "YYYY-MM-DD". */
  date: string;
  note: string;
  /** ISO timestamp of when the transaction was created. */
  createdAt: string;
}

export interface ExpenseSettings {
  /** Monthly budget in minor units, or null to use the value from app.config.json. */
  monthlyBudgetMinor: number | null;
}

export interface ExpenseData {
  version: 1;
  transactions: Transaction[];
  settings: ExpenseSettings;
}
