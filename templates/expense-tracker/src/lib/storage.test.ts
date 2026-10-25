import { describe, expect, it } from 'vitest';

import { parseConfig } from '../config';
import { createDemoData } from './demo-data';
import { totals } from './analytics';
import { BACKUP_KEY, loadData, parseBackup, saveData, STORAGE_KEY, validateData } from './storage';
import { escapeCsvCell } from './csv';
import { parseAmount } from './money';

const reference = new Date(2026, 9, 21);

describe('storage and backups', () => {
  it('round-trips data through localStorage', () => {
    const data = createDemoData('INR', reference);
    expect(saveData(window.localStorage, data)).toEqual({ ok: true });
    expect(loadData(window.localStorage)).toEqual({ status: 'loaded', data });
  });

  it('saves and loads the largest amount the form accepts', () => {
    // An amount just over the limit once passed the form but made the saved data unreadable.
    const data = createDemoData('INR', reference);
    const first = data.transactions[0];
    if (!first) throw new Error('demo data is empty');
    const largest = parseAmount('100,000,000', 'INR');
    if (!largest.ok) throw new Error(largest.error);
    const saved = { ...data, transactions: [{ ...first, amountMinor: largest.amountMinor }] };
    expect(validateData(saved)).toEqual(saved);
    expect(parseAmount('100,000,000.01', 'INR').ok).toBe(false);
  });

  it('recovers from corrupted saved data and keeps a backup', () => {
    window.localStorage.setItem(STORAGE_KEY, '[1,2');
    expect(loadData(window.localStorage)).toMatchObject({
      status: 'invalid',
      backupKey: BACKUP_KEY,
    });
    expect(window.localStorage.getItem(BACKUP_KEY)).toBe('[1,2');
  });

  it('keeps every readable transaction when one is malformed, and backs up the saved data', () => {
    const data = createDemoData('INR', reference);
    const broken = data.transactions.map((item, index) =>
      index === 2 ? { ...item, date: '2026-02-30' } : item,
    );
    const raw = JSON.stringify({ ...data, transactions: broken });
    window.localStorage.setItem(STORAGE_KEY, raw);
    const result = loadData(window.localStorage);
    expect(result).toMatchObject({
      status: 'partial',
      reason: 'transaction 3 has an invalid date',
      backupKey: BACKUP_KEY,
    });
    if (result.status !== 'partial') throw new Error(result.status);
    expect(result.data.transactions).toEqual(data.transactions.filter((_, index) => index !== 2));
    expect(result.data.settings).toEqual(data.settings);
    expect(window.localStorage.getItem(BACKUP_KEY)).toBe(raw);
  });

  it('keeps the first of two transactions with the same id, and the default budget for a bad one', () => {
    const data = createDemoData('INR', reference);
    const [first, second] = data.transactions;
    if (!first || !second) throw new Error('demo data is too small');
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        version: 1,
        transactions: [first, { ...second, id: first.id }, second],
        settings: { monthlyBudgetMinor: -5 },
      }),
    );
    expect(loadData(window.localStorage)).toEqual({
      status: 'partial',
      data: { version: 1, transactions: [first, second], settings: { monthlyBudgetMinor: null } },
      reason: 'transaction 2 has the same id as an earlier one, and 1 more problem',
      backupKey: BACKUP_KEY,
    });
  });

  it('never replaces an earlier backup copy with different data', () => {
    window.localStorage.setItem(BACKUP_KEY, 'the first unreadable data');
    window.localStorage.setItem(STORAGE_KEY, 'the second');
    const result = loadData(window.localStorage);
    if (result.status !== 'invalid') throw new Error(result.status);
    expect(result.backupKey).toMatch(/^campuskit-expenses:v1:unreadable-backup:\d{4}-\d\d-\d\dT/);
    expect(window.localStorage.getItem(BACKUP_KEY)).toBe('the first unreadable data');
    expect(window.localStorage.getItem(result.backupKey ?? '')).toBe('the second');
    // Loading the same unreadable data again doesn't add another copy.
    window.localStorage.setItem(BACKUP_KEY, 'the second');
    expect(loadData(window.localStorage)).toMatchObject({ backupKey: BACKUP_KEY });
  });

  it('says so, instead of crashing, when the browser refuses the backup copy', () => {
    const storage = window.localStorage;
    storage.setItem(STORAGE_KEY, '{"version":1,"transactions":[{}],"settings":{}}');
    const refusing = {
      getItem: (key: string) => storage.getItem(key),
      setItem: () => {
        throw new DOMException('The quota has been exceeded.', 'QuotaExceededError');
      },
    } as unknown as Storage;
    expect(loadData(refusing)).toMatchObject({ status: 'partial', backupKey: null });
  });

  it('rejects backups with invalid content and explains why', () => {
    const data = createDemoData('INR', reference);
    const first = data.transactions[0];
    if (!first) throw new Error('demo data is empty');
    expect(parseBackup('not json')).toBe('the file is not valid JSON');
    expect(validateData({ ...data, version: 2 })).toBe('unsupported data version 2');
    expect(validateData({ ...data, transactions: [{ ...first, amountMinor: -10 }] })).toBe(
      'transaction 1 has an invalid amount',
    );
    expect(validateData({ ...data, transactions: [{ ...first, amountMinor: 10.5 }] })).toBe(
      'transaction 1 has an invalid amount',
    );
    expect(
      validateData({ ...data, transactions: [{ ...first, categoryId: 'food', type: 'income' }] }),
    ).toBe('transaction 1 has an unknown category');
    expect(validateData({ ...data, transactions: [{ ...first, date: '2026-13-01' }] })).toBe(
      'transaction 1 has an invalid date',
    );
    expect(validateData({ ...data, transactions: [first, first] })).toBe(
      'transaction 2 has the same id as an earlier one',
    );
    expect(validateData({ ...data, settings: { monthlyBudgetMinor: 1.5 } })).toBe(
      'the monthly budget is invalid',
    );
  });

  it('accepts a backup exported by the app', () => {
    const data = createDemoData('USD', reference);
    expect(parseBackup(JSON.stringify(data, null, 2))).toEqual(data);
  });
});

describe('demo data', () => {
  it('never contains future transactions and covers six months', () => {
    const data = createDemoData('INR', reference);
    expect(data.transactions.every((item) => item.date <= '2026-10-21')).toBe(true);
    const months = new Set(data.transactions.map((item) => item.date.slice(0, 7)));
    expect([...months].sort()).toEqual([
      '2026-05',
      '2026-06',
      '2026-07',
      '2026-08',
      '2026-09',
      '2026-10',
    ]);
  });

  it('scales amounts to the selected currency', () => {
    const inr = totals(createDemoData('INR', reference).transactions);
    const usd = totals(createDemoData('USD', reference).transactions);
    const jpy = createDemoData('JPY', reference);
    expect(usd.expenseMinor).toBeLessThan(inr.expenseMinor);
    expect(
      jpy.transactions.every(
        (item) => Number.isInteger(item.amountMinor) && item.amountMinor % 10 === 0,
      ),
    ).toBe(true);
  });
});

describe('config and CSV', () => {
  const valid = {
    appName: 'Spend Smart',
    authorName: '',
    currency: 'USD',
    monthlyBudget: 300,
    theme: 'ocean',
    seedDemoData: true,
  };

  it('validates app.config.json values', () => {
    expect(parseConfig(valid)).toEqual(valid);
    expect(() => parseConfig({ ...valid, currency: 'BTC' })).toThrow(/"currency" must be one of/);
    expect(() => parseConfig({ ...valid, monthlyBudget: -1 })).toThrow(/monthlyBudget/);
  });

  it('protects exported CSV from formula injection', () => {
    expect(escapeCsvCell('=SUM(A1:A2)')).toBe("'=SUM(A1:A2)");
  });
});
