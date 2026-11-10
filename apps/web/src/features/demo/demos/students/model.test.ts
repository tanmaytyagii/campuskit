/**
 * The simulation against the real template: every validation case, the sample data, each
 * recorded query and the statistics must match what the Python code produced (sms.fixture.json,
 * written by `pnpm demo:fixtures:students`).
 */
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import {
  createSampleData,
  createStudent,
  deleteStudent,
  enroll,
  likePattern,
  listStudents,
  percent,
  readState,
  saveAttendance,
  statistics,
  unenroll,
  validateAttendanceDate,
  validateCourse,
  validateStudent,
  type StudentQuery,
} from './model.ts';
import fixture from './sms.fixture.json';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../../../../../../..');
const TODAY = fixture.today;

/** A query as the parity script recorded it, with list_students()'s defaults. */
function query(values: {
  search?: string;
  class_name?: string;
  status?: string;
  sort?: string;
  descending?: boolean;
  page?: number;
}): StudentQuery {
  return {
    search: values.search ?? '',
    className: values.class_name ?? '',
    status: values.status ?? '',
    sort: values.sort ?? 'name',
    descending: values.descending ?? false,
    page: values.page ?? 1,
  };
}

describe('the student management simulation matches the template', () => {
  it('was recorded from the current template files', () => {
    for (const [file, hash] of Object.entries(fixture.sources)) {
      const content = readFileSync(join(repoRoot, 'templates/student-management-system', file));
      expect(
        createHash('sha256').update(content).digest('hex'),
        `${file} changed: run pnpm demo:fixtures:students`,
      ).toBe(hash);
    }
  });

  for (const [name, recorded] of Object.entries(fixture.validation.students)) {
    it(`validates the student form: ${name}`, () => {
      const result = validateStudent(recorded.form, TODAY);
      expect(result.errors).toEqual(recorded.errors);
      expect(result.values).toEqual(recorded.values);
    });
  }

  for (const [name, recorded] of Object.entries(fixture.validation.courses)) {
    it(`validates the course form: ${name}`, () => {
      const result = validateCourse(recorded.form);
      expect(result.errors).toEqual(recorded.errors);
      expect(result.values).toEqual(recorded.values);
    });
  }

  it('validates attendance dates', () => {
    for (const [text, recorded] of Object.entries(fixture.validation.dates)) {
      const result = validateAttendanceDate(text, TODAY);
      expect(result, text).toEqual(typeof recorded === 'string' ? { day: recorded } : recorded);
    }
  });

  it('rounds percentages like round(), taking ties to the even digit', () => {
    for (const [part, whole, value] of fixture.percent as Array<[number, number, number | null]>)
      expect(percent(part, whole), `${part} of ${whole}`).toBe(value);
  });

  it('builds LIKE patterns the same way', () => {
    for (const [text, pattern] of Object.entries(fixture.likePatterns))
      expect(likePattern(text)).toBe(pattern);
  });

  it('creates the same sample data as seed_db()', () => {
    const state = createSampleData(TODAY);
    expect(state.students).toEqual(fixture.sample.students);
    expect(state.courses).toEqual(fixture.sample.courses);
    const byKey = <T extends object>(rows: T[]) =>
      [...rows].map((row) => JSON.stringify(row)).sort();
    expect(byKey(state.enrollments)).toEqual(byKey(fixture.sample.enrollments));
    expect(byKey(state.attendance)).toEqual(byKey(fixture.sample.attendance));
  });

  for (const [name, recorded] of Object.entries(fixture.queries)) {
    it(`lists students like list_students(): ${name}`, () => {
      const { rows, total } = listStudents(createSampleData(TODAY), query(recorded.query), 10);
      expect(rows.map((row) => row.id)).toEqual(recorded.ids);
      expect(total).toBe(recorded.total);
    });
  }

  it('calculates the same statistics', () => {
    expect(statistics(createSampleData(TODAY), TODAY)).toEqual(fixture.statistics);
  });
});

describe('the simulated database', () => {
  const values = {
    roll_number: '25CS200',
    first_name: 'Kavya',
    last_name: 'Rao',
    email: null,
    class_name: 'BCA 1-C',
    admission_date: '2025-07-15',
    status: 'active' as const,
  };

  it('refuses a duplicate roll number, ignoring case, and logs the refusal', () => {
    const result = createStudent(createSampleData(TODAY), { ...values, roll_number: '24cs001' });
    expect('error' in result && result.error.field).toBe('roll_number');
    expect(result.state.students).toHaveLength(12);
    expect(result.state.log[0]?.result).toBe(
      'refused: UNIQUE constraint failed: students.roll_number',
    );
  });

  it('never reuses an id, as AUTOINCREMENT does', () => {
    let state = createSampleData(TODAY);
    const first = createStudent(state, values);
    if (!('id' in first)) throw new Error('not added');
    state = deleteStudent(first.state, first.id);
    const second = createStudent(state, values);
    expect('id' in second && second.id).toBe(first.id + 1);
  });

  it('cascades a deletion to enrollments and attendance', () => {
    const state = deleteStudent(createSampleData(TODAY), 1);
    expect(state.enrollments.some((row) => row.student_id === 1)).toBe(false);
    expect(state.attendance.some((mark) => mark.student_id === 1)).toBe(false);
    expect(state.log[0]?.result).toBe(
      '1 row deleted; ON DELETE CASCADE removed 3 enrollments and 30 attendance marks',
    );
  });

  it('upserts attendance and skips students who don’t take the course', () => {
    const start = createSampleData(TODAY);
    const first = saveAttendance(
      start,
      1,
      TODAY,
      new Map([
        [1, 'present' as const],
        [9, 'present' as const],
      ]),
    );
    expect(first.saved).toBe(1);
    const second = saveAttendance(first.state, 1, TODAY, new Map([[1, 'late' as const]]));
    const marks = second.state.attendance.filter(
      (mark) => mark.course_id === 1 && mark.date === TODAY,
    );
    expect(marks).toEqual([{ student_id: 1, course_id: 1, date: TODAY, status: 'late' }]);
    expect(second.state.log[0]).toMatchObject({
      parameters: [1, 1, TODAY, 'late'],
      rows: 1,
      result: '0 inserted, 1 updated',
    });
  });

  it('removes a course’s attendance with the enrollment, and refuses a second enrollment', () => {
    const start = createSampleData(TODAY);
    expect(enroll(start, 1, 1, TODAY).added).toBe(false);
    const state = unenroll(start, 1, 1);
    expect(state.attendance.some((mark) => mark.student_id === 1 && mark.course_id === 1)).toBe(
      false,
    );
    expect(enroll(state, 1, 1, TODAY).added).toBe(true);
  });

  it('reads back only data that satisfies the schema’s constraints', () => {
    const state = createSampleData(TODAY);
    expect(readState(JSON.parse(JSON.stringify(state)))).toEqual(state);
    expect(readState({ ...state, version: 2 })).toBeNull();
    const orphanMark = {
      ...state,
      attendance: [
        ...state.attendance,
        { student_id: 9, course_id: 1, date: TODAY, status: 'present' },
      ],
    };
    expect(readState(orphanMark)).toBeNull();
    const duplicateEnrollment = {
      ...state,
      enrollments: [...state.enrollments, state.enrollments[0]],
    };
    expect(readState(duplicateEnrollment)).toBeNull();
    expect(readState({ ...state, courses: [{ ...state.courses[0], credits: 11 }] })).toBeNull();
  });

  it('drops log entries that are not statements', () => {
    const saved = saveAttendance(
      createSampleData(TODAY),
      1,
      TODAY,
      new Map([[1, 'late' as const]]),
    );
    const stored = JSON.parse(JSON.stringify(saved.state)) as Record<string, unknown>;
    const log = [
      ...(stored.log as unknown[]),
      { sql: 'SELECT 1', parameters: [{}], result: 'x' },
      { sql: 'SELECT 1', parameters: [], rows: 'many', result: 'x' },
      42,
    ];
    expect(readState({ ...stored, log })?.log).toEqual(saved.state.log);
  });
});
