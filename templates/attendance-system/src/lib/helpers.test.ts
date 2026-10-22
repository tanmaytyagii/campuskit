import { describe, expect, it } from 'vitest';

import { parseConfig } from '../config';
import type { Student } from '../types';
import { escapeCsvCell, toCsv } from './csv';
import { isValidDateKey, previousWeekdays, toDateKey } from './dates';
import { createDemoData } from './demo-data';
import { summarizeStudents } from './attendance';
import { validateStudentInput } from './validation';

describe('dates', () => {
  it('formats local dates without shifting to UTC', () => {
    expect(toDateKey(new Date(2026, 0, 5, 23, 59))).toBe('2026-01-05');
  });

  it('rejects impossible dates', () => {
    expect(isValidDateKey('2026-02-29')).toBe(false);
    expect(isValidDateKey('2028-02-29')).toBe(true);
    expect(isValidDateKey('21-10-2026')).toBe(false);
  });

  it('lists previous weekdays oldest first', () => {
    // 2026-10-19 is a Monday, so the previous weekdays skip the weekend.
    expect(previousWeekdays(new Date(2026, 9, 19), 3)).toEqual([
      '2026-10-14',
      '2026-10-15',
      '2026-10-16',
    ]);
  });
});

describe('csv', () => {
  it('quotes commas, quotes and line breaks', () => {
    expect(escapeCsvCell('Das, Rohan')).toBe('"Das, Rohan"');
    expect(escapeCsvCell('say "hi"')).toBe('"say ""hi"""');
    expect(toCsv(['A', 'B'], [['x', 1]])).toBe('A,B\r\nx,1\r\n');
  });

  it('neutralises spreadsheet formulas', () => {
    expect(escapeCsvCell('=HYPERLINK("http://example.com")')).toBe(
      '"\'=HYPERLINK(""http://example.com"")"',
    );
    expect(escapeCsvCell('@cmd')).toBe("'@cmd");
    expect(escapeCsvCell(-5)).toBe('-5');
  });
});

describe('student validation', () => {
  const existing: Student[] = [
    { id: '1', rollNumber: '10A-01', name: 'Aarav Sharma', className: 'Class 10-A', createdAt: '' },
  ];

  it('requires name, roll number and class', () => {
    expect(validateStudentInput({ name: ' ', rollNumber: '', className: '' }, existing)).toEqual({
      name: expect.stringContaining('name'),
      rollNumber: 'Enter a roll number.',
      className: expect.stringContaining('class'),
    });
  });

  it('rejects duplicate roll numbers in the same class, case-insensitively', () => {
    const errors = validateStudentInput(
      { name: 'New', rollNumber: '10a-01', className: 'class 10-a' },
      existing,
    );
    expect(errors.rollNumber).toMatch(/already used by Aarav Sharma/);
  });

  it('allows the same roll number in a different class, and the student’s own number when editing', () => {
    expect(
      validateStudentInput(
        { name: 'New', rollNumber: '10A-01', className: 'Class 10-B' },
        existing,
      ),
    ).toEqual({});
    expect(
      validateStudentInput(
        { name: 'Aarav', rollNumber: '10A-01', className: 'Class 10-A' },
        existing,
        '1',
      ),
    ).toEqual({});
  });

  it('accepts Unicode names', () => {
    expect(
      validateStudentInput(
        { name: 'Zoë Ñúñez — ज़ोया', rollNumber: '7', className: '10-A' },
        existing,
      ),
    ).toEqual({});
  });
});

describe('config', () => {
  const valid = {
    appName: 'Attendance',
    institutionName: '',
    authorName: '',
    theme: 'teal',
    attendanceThreshold: 75,
    seedDemoData: false,
  };

  it('accepts a valid config', () => {
    expect(parseConfig(valid)).toEqual(valid);
  });

  it('explains which setting is wrong', () => {
    expect(() => parseConfig({ ...valid, theme: 'neon' })).toThrow(/"theme" must be one of/);
    expect(() => parseConfig({ ...valid, attendanceThreshold: 150 })).toThrow(
      /attendanceThreshold/,
    );
    expect(() => parseConfig({ ...valid, appName: '  ' })).toThrow(/"appName" must not be empty/);
  });
});

describe('demo data', () => {
  it('creates ten school days with two students below 75%', () => {
    const data = createDemoData(new Date(2026, 9, 21));
    expect(Object.keys(data.attendance)).toHaveLength(10);
    const below = summarizeStudents(data.students, data.attendance, 75).filter(
      (summary) => summary.belowThreshold,
    );
    expect(below.map((summary) => summary.student.name)).toEqual(['Kabir Singh', 'Rohan Das']);
  });
});
