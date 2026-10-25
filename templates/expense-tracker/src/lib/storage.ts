/**
 * Saves and loads data in the browser's localStorage, and validates backups.
 * Nothing is sent to a server. Loaded data is checked field by field, so a
 * corrupted value can never crash the app. One bad transaction doesn't cost the
 * others: it is left out, and the saved data is first copied to a backup key, so
 * nothing is thrown away.
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
  /**
   * Some of the saved data failed the checks and was left out; the rest was loaded.
   * `backupKey` is where the saved data was copied, or null if the browser refused.
   */
  | { status: 'partial'; data: ExpenseData; reason: string; backupKey: string | null }
  /** Nothing could be used. `backupKey` as above. */
  | { status: 'invalid'; reason: string; backupKey: string | null }
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

/**
 * Reads saved data, keeping every transaction that passes the checks. Returns the data and what
 * was wrong with the rest, or a reason when the data as a whole can't be used.
 */
export function recoverData(value: unknown): { data: ExpenseData; problems: string[] } | string {
  if (!isRecord(value)) return 'the data is not an object';
  if (value.version !== 1) return `unsupported data version ${String(value.version)}`;
  if (!Array.isArray(value.transactions)) return 'the transaction list is missing';
  const problems: string[] = [];
  const transactions: Transaction[] = [];
  const ids = new Set<string>();
  for (const [index, item] of value.transactions.entries()) {
    const problem = transactionProblem(item, index);
    if (problem) {
      problems.push(problem);
      continue;
    }
    const transaction = item as Transaction;
    if (ids.has(transaction.id)) {
      problems.push(`transaction ${index + 1} has the same id as an earlier one`);
      continue;
    }
    ids.add(transaction.id);
    transactions.push(transaction);
  }
  // Without a valid budget, the default from app.config.json is used (null).
  let budget: number | null = null;
  if (!isRecord(value.settings)) {
    problems.push('the settings are missing');
  } else {
    const saved = value.settings.monthlyBudgetMinor;
    if (saved === null || (typeof saved === 'number' && Number.isSafeInteger(saved) && saved >= 0))
      budget = saved;
    else problems.push('the monthly budget is invalid');
  }
  return {
    data: { version: 1, transactions, settings: { monthlyBudgetMinor: budget } },
    problems,
  };
}

/** Returns valid data, or a message explaining the first problem. Every part must pass. */
export function validateData(value: unknown): ExpenseData | string {
  const result = recoverData(value);
  if (typeof result === 'string') return result;
  return result.problems[0] ?? result.data;
}

/**
 * Copies saved data that couldn't be fully read to a backup key, and returns the key, or null
 * if the browser refused (for example, because its storage is full). An earlier copy with
 * different data is never replaced: the new one gets a key ending in the time.
 */
function keepCopy(storage: Storage, raw: string): string | null {
  const earlier = storage.getItem(BACKUP_KEY);
  const key =
    earlier === null || earlier === raw ? BACKUP_KEY : `${BACKUP_KEY}:${new Date().toISOString()}`;
  try {
    storage.setItem(key, raw);
    return key;
  } catch {
    return null;
  }
}

/** One problem, or the first one and how many more. */
function describeProblems(problems: string[]): string {
  const [first, ...rest] = problems;
  if (rest.length === 0) return first ?? '';
  return `${first}, and ${rest.length} more ${rest.length === 1 ? 'problem' : 'problems'}`;
}

export function loadData(storage: Storage | null): LoadResult {
  if (!storage) return { status: 'unavailable', reason: 'this browser is blocking local storage' };
  const raw = storage.getItem(STORAGE_KEY);
  if (raw === null) return { status: 'empty' };
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return {
      status: 'invalid',
      reason: 'the saved data is not valid JSON',
      backupKey: keepCopy(storage, raw),
    };
  }
  const result = recoverData(parsed);
  if (typeof result === 'string')
    return { status: 'invalid', reason: result, backupKey: keepCopy(storage, raw) };
  if (result.problems.length > 0) {
    return {
      status: 'partial',
      data: result.data,
      reason: describeProblems(result.problems),
      backupKey: keepCopy(storage, raw),
    };
  }
  return { status: 'loaded', data: result.data };
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
