import { describe, expect, it } from 'vitest';

import { parseConfig } from '../config';
import { createDemoData } from './demo-data';
import { totals } from './analytics';
import { BACKUP_KEY, loadData, parseBackup, saveData, STORAGE_KEY, validateData } from './storage';
import { escapeCsvCell } from './csv';

const reference = new Date(2026, 9, 21);

describe('storage and backups', () => {
  it('round-trips data through localStorage', () => {
    const data = createDemoData('INR', reference);
    expect(saveData(window.localStorage, data)).toEqual({ ok: true });
    expect(loadData(window.localStorage)).toEqual({ status: 'loaded', data });
  });

  it('recovers from corrupted saved data and keeps a backup', () => {
    window.localStorage.setItem(STORAGE_KEY, '[1,2');
    expect(loadData(window.localStorage)).toMatchObject({ status: 'invalid' });
    expect(window.localStorage.getItem(BACKUP_KEY)).toBe('[1,2');
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
      'two transactions share the same id',
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
