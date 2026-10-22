import { describe, expect, it } from 'vitest';

import type { AttendanceByDate, Student } from '../types';
import {
  attendancePercentage,
  countsForDate,
  overallCounts,
  recordedDates,
  summarizeClasses,
  summarizeStudent,
} from './attendance';

const student = (id: string, className = 'Class 10-A'): Student => ({
  id,
  rollNumber: id.toUpperCase(),
  name: `Student ${id}`,
  className,
  createdAt: '2026-10-01T00:00:00.000Z',
});

const students = [student('a'), student('b'), student('c', 'Class 10-B')];

const attendance: AttendanceByDate = {
  '2026-10-12': { a: 'present', b: 'absent', c: 'present' },
  '2026-10-13': { a: 'late', b: 'absent', c: 'present' },
  '2026-10-14': { a: 'present', b: 'present' },
  '2026-10-15': { a: 'absent', b: 'present', c: 'late' },
};

describe('attendance calculations', () => {
  it('counts late as attended and ignores days without a mark', () => {
    const summary = summarizeStudent(student('c', 'Class 10-B'), attendance, 75);
    expect(summary).toMatchObject({ present: 2, late: 1, absent: 0, total: 3, percentage: 100 });
  });

  it('flags students below the threshold', () => {
    const summary = summarizeStudent(student('b'), attendance, 75);
    expect(summary.percentage).toBe(50);
    expect(summary.belowThreshold).toBe(true);
  });

  it('returns null instead of 0% when a student has no marks', () => {
    const summary = summarizeStudent(student('new'), attendance, 75);
    expect(summary.percentage).toBeNull();
    expect(summary.belowThreshold).toBe(false);
  });

  it('rounds percentages to one decimal place', () => {
    expect(attendancePercentage({ present: 2, late: 0, absent: 1, total: 3 })).toBe(66.7);
  });

  it('limits summaries to a date range', () => {
    const summary = summarizeStudent(student('a'), attendance, 75, {
      from: '2026-10-14',
      to: '2026-10-15',
    });
    expect(summary).toMatchObject({ present: 1, absent: 1, total: 2, percentage: 50 });
  });

  it('computes overall counts from actual marks', () => {
    expect(overallCounts(students, attendance)).toEqual({
      present: 6,
      late: 2,
      absent: 3,
      total: 11,
    });
  });

  it('reports unmarked students for a date', () => {
    expect(countsForDate(students, attendance, '2026-10-14')).toMatchObject({
      present: 2,
      unmarked: 1,
    });
    expect(countsForDate(students, attendance, '2026-10-20')).toMatchObject({
      total: 0,
      unmarked: 3,
    });
  });

  it('summarises each class', () => {
    expect(summarizeClasses(students, attendance)).toEqual([
      expect.objectContaining({
        className: 'Class 10-A',
        studentCount: 2,
        total: 8,
        percentage: 62.5,
      }),
      expect.objectContaining({
        className: 'Class 10-B',
        studentCount: 1,
        total: 3,
        percentage: 100,
      }),
    ]);
  });

  it('lists recorded dates newest first', () => {
    expect(recordedDates(attendance)).toEqual([
      '2026-10-15',
      '2026-10-14',
      '2026-10-13',
      '2026-10-12',
    ]);
  });
});
