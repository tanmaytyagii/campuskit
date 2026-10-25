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
    expect(loadData(window.localStorage)).toMatchObject({
      status: 'invalid',
      backupKey: BACKUP_KEY,
    });
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
      backupKey: BACKUP_KEY,
    });
  });

  it('keeps every readable student and mark when one record is malformed', () => {
    const data = createDemoData(new Date(2026, 9, 21));
    const [first, second, third] = data.students;
    if (!first || !second || !third) throw new Error('demo data is too small');
    const raw = JSON.stringify({
      version: 1,
      students: [first, { ...second, name: '' }, third, { ...third, rollNumber: '10A-99' }],
      attendance: {
        '2026-10-20': { [first.id]: 'present', [second.id]: 'absent', [third.id]: 'sick' },
        '2026-02-30': { [first.id]: 'present' },
        '2026-10-21': { [first.id]: 'late', [third.id]: 'present' },
      },
    });
    window.localStorage.setItem(STORAGE_KEY, raw);
    expect(loadData(window.localStorage)).toEqual({
      status: 'partial',
      data: {
        version: 1,
        students: [first, third],
        attendance: {
          '2026-10-20': { [first.id]: 'present' },
          '2026-10-21': { [first.id]: 'late', [third.id]: 'present' },
        },
      },
      reason: 'student 2 has no name, and 3 more problems',
      backupKey: BACKUP_KEY,
    });
    expect(window.localStorage.getItem(BACKUP_KEY)).toBe(raw);
  });

  it('never replaces an earlier backup copy with different data', () => {
    window.localStorage.setItem(BACKUP_KEY, 'the first unreadable data');
    window.localStorage.setItem(STORAGE_KEY, 'the second');
    const result = loadData(window.localStorage);
    if (result.status !== 'invalid') throw new Error(result.status);
    expect(result.backupKey).toMatch(/^campuskit-attendance:v1:unreadable-backup:\d{4}-\d\d-\d\dT/);
    expect(window.localStorage.getItem(BACKUP_KEY)).toBe('the first unreadable data');
    expect(window.localStorage.getItem(result.backupKey ?? '')).toBe('the second');
  });

  it('says so, instead of crashing, when the browser refuses the backup copy', () => {
    const storage = window.localStorage;
    storage.setItem(STORAGE_KEY, '{not json');
    const refusing = {
      getItem: (key: string) => storage.getItem(key),
      setItem: () => {
        throw new DOMException('The quota has been exceeded.', 'QuotaExceededError');
      },
    } as unknown as Storage;
    expect(loadData(refusing)).toMatchObject({ status: 'invalid', backupKey: null });
  });

  it('reports when storage is unavailable', () => {
    expect(loadData(null)).toMatchObject({ status: 'unavailable' });
    expect(saveData(null, createDemoData())).toMatchObject({ ok: false });
  });

  it('validates statuses and dates, and drops marks for unknown students', () => {
    const base = createDemoData(new Date(2026, 9, 21));
    const [student] = base.students;
    if (!student) throw new Error('demo data is empty');
    expect(validateData({ ...base, students: [student, student] })).toBe(
      'student 2 has the same id as an earlier one',
    );
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
