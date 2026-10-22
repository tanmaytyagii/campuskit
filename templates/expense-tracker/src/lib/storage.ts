/**
 * Saves and loads data in the browser's localStorage, and validates backups.
 * Nothing is sent to a server. Loaded data is checked field by field, so a
 * corrupted value can never crash the app; unreadable data is kept under a
 * backup key instead of being thrown away.
 */
import type { ExpenseData, Transaction } from '../types';
import { isCategoryFor } from './categories';
import { isValidDateKey } from './dates';
import { MAX_AMOUNT } from './money';

export const STORAGE_KEY = 'campuskit-expenses:v1';
export const BACKUP_KEY = `${STORAGE_KEY}:unreadable-backup`;

export type LoadResult =
  | { status: 'empty' }
  | { status: 'loaded'; data: ExpenseData }
  | { status: 'invalid'; reason: string }
  | { status: 'unavailable'; reason: string };

export function getBrowserStorage(): Storage | null {
  try {
    const storage = window.localStorage;
    const probe = `${STORAGE_KEY}:probe`;
    storage.setItem(probe, '1');
    storage.removeItem(probe);
    return storage;
  } catch {
    return null;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function transactionProblem(value: unknown, index: number): string | null {
  const where = `transaction ${index + 1}`;
  if (!isRecord(value)) return `${where} is not an object`;
  if (typeof value.id !== 'string' || value.id === '') return `${where} has no id`;
  if (value.type !== 'expense' && value.type !== 'income') return `${where} has an unknown type`;
  if (
    typeof value.amountMinor !== 'number' ||
    !Number.isSafeInteger(value.amountMinor) ||
    value.amountMinor <= 0
  ) {
    return `${where} has an invalid amount`;
  }
  // Generous upper bound that also covers currencies without minor units.
  if (value.amountMinor > MAX_AMOUNT * 100) return `${where} has an amount that is too large`;
  if (typeof value.categoryId !== 'string' || !isCategoryFor(value.categoryId, value.type)) {
    return `${where} has an unknown category`;
  }
  if (typeof value.date !== 'string' || !isValidDateKey(value.date))
    return `${where} has an invalid date`;
  if (typeof value.note !== 'string' || value.note.length > 200)
    return `${where} has an invalid note`;
  if (typeof value.createdAt !== 'string') return `${where} has no creation time`;
  return null;
}

/** Returns valid data, or a message explaining what is wrong. */
export function validateData(value: unknown): ExpenseData | string {
  if (!isRecord(value)) return 'the data is not an object';
  if (value.version !== 1) return `unsupported data version ${String(value.version)}`;
  if (!Array.isArray(value.transactions)) return 'the transaction list is missing';
  for (const [index, transaction] of value.transactions.entries()) {
    const problem = transactionProblem(transaction, index);
    if (problem) return problem;
  }
  const ids = new Set((value.transactions as Transaction[]).map((transaction) => transaction.id));
  if (ids.size !== value.transactions.length) return 'two transactions share the same id';
  if (!isRecord(value.settings)) return 'the settings are missing';
  const budget = value.settings.monthlyBudgetMinor;
  if (
    budget !== null &&
    (typeof budget !== 'number' || !Number.isSafeInteger(budget) || budget < 0)
  ) {
    return 'the monthly budget is invalid';
  }
  return {
    version: 1,
    transactions: value.transactions as Transaction[],
    settings: { monthlyBudgetMinor: budget },
  };
}

export function loadData(storage: Storage | null): LoadResult {
  if (!storage) return { status: 'unavailable', reason: 'this browser is blocking local storage' };
  const raw = storage.getItem(STORAGE_KEY);
  if (raw === null) return { status: 'empty' };
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    storage.setItem(BACKUP_KEY, raw);
    return { status: 'invalid', reason: 'the saved data is not valid JSON' };
  }
  const result = validateData(parsed);
  if (typeof result === 'string') {
    storage.setItem(BACKUP_KEY, raw);
    return { status: 'invalid', reason: result };
  }
  return { status: 'loaded', data: result };
}

export function saveData(
  storage: Storage | null,
  data: ExpenseData,
): { ok: true } | { ok: false; reason: string } {
  if (!storage) return { ok: false, reason: 'this browser is blocking local storage' };
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(data));
    return { ok: true };
  } catch (error) {
    return { ok: false, reason: error instanceof Error ? error.message : 'unknown storage error' };
  }
}

/** Parses the text of a backup file exported from Settings. */
export function parseBackup(text: string): ExpenseData | string {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return 'the file is not valid JSON';
  }
  return validateData(parsed);
}
