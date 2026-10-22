/**
 * Fictional sample transactions for the six months up to `reference`,
 * used on first run (when "seedDemoData" is true) and by "Load demo data".
 * Amounts are written in Indian rupees and scaled to roughly similar values
 * for other currencies, so the demo looks plausible in any currency.
 */
import type { CurrencyCode } from '../config';
import type { ExpenseData, Transaction, TransactionType } from '../types';
import { addMonths, lastDayOfMonth, monthKeyOf, toDateKey } from './dates';
import { currencyDigits } from './money';

/** Approximate value of ₹1 in each currency, only for making demo amounts look realistic. */
const DEMO_SCALE: Record<CurrencyCode, number> = {
  INR: 1,
  USD: 0.012,
  EUR: 0.011,
  GBP: 0.0095,
  JPY: 1.8,
};

interface Entry {
  day: number;
  type: TransactionType;
  categoryId: string;
  rupees: number;
  note: string;
}

const MONTH_TEMPLATE: Entry[] = [
  { day: 1, type: 'income', categoryId: 'allowance', rupees: 9000, note: 'Monthly allowance' },
  { day: 2, type: 'expense', categoryId: 'housing', rupees: 4500, note: 'Hostel rent' },
  { day: 3, type: 'expense', categoryId: 'food', rupees: 260, note: 'Canteen lunch with friends' },
  { day: 4, type: 'expense', categoryId: 'transport', rupees: 120, note: 'Metro card top-up' },
  {
    day: 6,
    type: 'expense',
    categoryId: 'education',
    rupees: 640,
    note: 'Data structures textbook',
  },
  {
    day: 7,
    type: 'income',
    categoryId: 'stipend',
    rupees: 3500,
    note: 'Tutoring a Class 9 student',
  },
  { day: 9, type: 'expense', categoryId: 'food', rupees: 380, note: 'Groceries' },
  { day: 11, type: 'expense', categoryId: 'entertainment', rupees: 350, note: 'Movie ticket' },
  { day: 12, type: 'expense', categoryId: 'transport', rupees: 90, note: 'Auto rickshaw' },
  { day: 14, type: 'expense', categoryId: 'food', rupees: 210, note: 'Snacks during exam week' },
  {
    day: 15,
    type: 'expense',
    categoryId: 'housing',
    rupees: 499,
    note: 'Mobile and internet recharge',
  },
  { day: 17, type: 'expense', categoryId: 'health', rupees: 180, note: 'Pharmacy' },
  { day: 18, type: 'expense', categoryId: 'shopping', rupees: 899, note: 'Running shoes (sale)' },
  { day: 20, type: 'expense', categoryId: 'food', rupees: 420, note: 'Birthday dinner' },
  { day: 22, type: 'expense', categoryId: 'education', rupees: 150, note: 'Printing and binding' },
  { day: 24, type: 'expense', categoryId: 'transport', rupees: 160, note: 'Bus pass' },
  { day: 26, type: 'expense', categoryId: 'food', rupees: 300, note: 'Weekend café' },
  { day: 28, type: 'expense', categoryId: 'other-expense', rupees: 200, note: 'Club membership' },
];

function scaledMinor(rupees: number, currency: CurrencyCode): number {
  const digits = currencyDigits(currency);
  const amount = rupees * DEMO_SCALE[currency];
  // Round to a "nice" price: whole units for large amounts, halves otherwise.
  const step = digits === 0 ? 10 : amount >= 20 ? 1 : 0.5;
  const rounded = Math.max(step, Math.round(amount / step) * step);
  return Math.round(rounded * 10 ** digits);
}

export function createDemoData(currency: CurrencyCode, reference: Date = new Date()): ExpenseData {
  const today = toDateKey(reference);
  const currentMonth = monthKeyOf(today);
  const transactions: Transaction[] = [];
  let counter = 0;

  for (let offset = 5; offset >= 0; offset -= 1) {
    const month = addMonths(currentMonth, -offset);
    const lastDay = Number(lastDayOfMonth(month).slice(8));
    for (const entry of MONTH_TEMPLATE) {
      if (entry.day > lastDay) continue;
      const date = `${month}-${String(entry.day).padStart(2, '0')}`;
      if (date > today) continue; // no future transactions
      counter += 1;
      transactions.push({
        id: `demo-${String(counter).padStart(3, '0')}`,
        type: entry.type,
        amountMinor: scaledMinor(entry.rupees, currency),
        categoryId: entry.categoryId,
        date,
        note: entry.note,
        createdAt: `${date}T12:00:00.000Z`,
      });
    }
  }

  // One scholarship payment, three months ago.
  const scholarshipDate = `${addMonths(currentMonth, -3)}-10`;
  transactions.push({
    id: 'demo-scholarship',
    type: 'income',
    amountMinor: scaledMinor(12000, currency),
    categoryId: 'scholarship',
    date: scholarshipDate,
    note: 'Merit scholarship (semester)',
    createdAt: `${scholarshipDate}T12:00:00.000Z`,
  });

  return { version: 1, transactions, settings: { monthlyBudgetMinor: null } };
}

export function createEmptyData(): ExpenseData {
  return { version: 1, transactions: [], settings: { monthlyBudgetMinor: null } };
}
