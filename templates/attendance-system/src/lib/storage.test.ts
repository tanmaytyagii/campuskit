import { describe, expect, it } from 'vitest';

import { createDemoData } from './demo-data';
import { BACKUP_KEY, loadData, saveData, STORAGE_KEY, validateData } from './storage';

describe('storage', () => {
  it('reports empty storage', () => {
    expect(loadData(window.localStorage)).toEqual({ status: 'empty' });
  });

  it('round-trips saved data', () => {
    const data = createDemoData(new Date(2026, 9, 21));
    expect(saveData(window.localStorage, data)).toEqual({ ok: true });
    expect(loadData(window.localStorage)).toEqual({ status: 'loaded', data });
  });

  it('keeps a backup when saved data is not valid JSON', () => {
    window.localStorage.setItem(STORAGE_KEY, '{not json');
    expect(loadData(window.localStorage)).toMatchObject({ status: 'invalid' });
    expect(window.localStorage.getItem(BACKUP_KEY)).toBe('{not json');
  });

  it('rejects data with the wrong shape', () => {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ version: 1, students: 'nope', attendance: {} }),
    );
    expect(loadData(window.localStorage)).toEqual({
      status: 'invalid',
      reason: 'the student list is malformed',
    });
  });

  it('reports when storage is unavailable', () => {
    expect(loadData(null)).toMatchObject({ status: 'unavailable' });
    expect(saveData(null, createDemoData())).toMatchObject({ ok: false });
  });

  it('validates statuses and dates, and drops marks for unknown students', () => {
    const base = createDemoData(new Date(2026, 9, 21));
    expect(validateData({ ...base, attendance: { '2026-02-30': {} } })).toBe(
      '"2026-02-30" is not a valid date',
    );
    expect(validateData({ ...base, attendance: { '2026-10-01': { 'demo-01': 'sick' } } })).toBe(
      'unknown status "sick" on 2026-10-01',
    );
    const cleaned = validateData({
      ...base,
      attendance: { '2026-10-01': { ghost: 'present', 'demo-01': 'late' } },
    });
    expect(typeof cleaned === 'string' ? cleaned : cleaned.attendance).toEqual({
      '2026-10-01': { 'demo-01': 'late' },
    });
  });
});
