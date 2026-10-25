/**
 * Saves and loads the app's data in the browser's localStorage.
 *
 * Nothing is sent to a server: the data lives only in this browser profile.
 * Loaded data is checked before use, so a corrupted or hand-edited value can
 * never crash the app. One bad record doesn't cost the others: it is left out,
 * and the saved data is first copied to a backup key, so nothing is thrown away.
 */
import {
  ATTENDANCE_STATUSES,
  type AttendanceData,
  type AttendanceStatus,
  type Student,
} from '../types';
import { isValidDateKey } from './dates';

export const STORAGE_KEY = 'campuskit-attendance:v1';
export const BACKUP_KEY = `${STORAGE_KEY}:unreadable-backup`;

export type LoadResult =
  | { status: 'empty' }
  | { status: 'loaded'; data: AttendanceData }
  /**
   * Some of the saved data failed the checks and was left out; the rest was loaded.
   * `backupKey` is where the saved data was copied, or null if the browser refused.
   */
  | { status: 'partial'; data: AttendanceData; reason: string; backupKey: string | null }
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

const STUDENT_FIELDS = {
  id: 'id',
  rollNumber: 'roll number',
  name: 'name',
  className: 'class',
  createdAt: 'creation time',
} as const;

/** The first problem with one student, or null. */
function studentProblem(value: unknown, index: number): string | null {
  const where = `student ${index + 1}`;
  if (!isRecord(value)) return `${where} is not an object`;
  for (const [key, label] of Object.entries(STUDENT_FIELDS)) {
    const field = value[key];
    if (typeof field !== 'string' || field.length === 0) return `${where} has no ${label}`;
  }
  return null;
}

function isStatus(value: unknown): value is AttendanceStatus {
  return typeof value === 'string' && (ATTENDANCE_STATUSES as readonly string[]).includes(value);
}

/**
 * Reads saved data, keeping every student, date and mark that passes the checks. Returns the
 * data and what was wrong with the rest, or a reason when the data as a whole can't be used.
 */
export function recoverData(value: unknown): { data: AttendanceData; problems: string[] } | string {
  if (!isRecord(value)) return 'the saved value is not an object';
  if (value.version !== 1) return `unsupported data version ${String(value.version)}`;
  if (!Array.isArray(value.students)) return 'the student list is malformed';
  if (!isRecord(value.attendance)) return 'the attendance records are malformed';

  const problems: string[] = [];
  const students: Student[] = [];
  const ids = new Set<string>();
  for (const [index, item] of value.students.entries()) {
    const problem = studentProblem(item, index);
    if (problem) {
      problems.push(problem);
      continue;
    }
    const student = item as Student;
    if (ids.has(student.id)) {
      problems.push(`student ${index + 1} has the same id as an earlier one`);
      continue;
    }
    ids.add(student.id);
    students.push(student);
  }

  const attendance: AttendanceData['attendance'] = {};
  for (const [date, marks] of Object.entries(value.attendance)) {
    if (!isValidDateKey(date)) {
      problems.push(`"${date}" is not a valid date`);
      continue;
    }
    if (!isRecord(marks)) {
      problems.push(`attendance for ${date} is malformed`);
      continue;
    }
    const clean: Record<string, AttendanceStatus> = {};
    for (const [studentId, status] of Object.entries(marks)) {
      if (!isStatus(status)) {
        problems.push(`unknown status "${String(status)}" on ${date}`);
        continue;
      }
      // Marks for students that no longer exist are dropped quietly.
      if (ids.has(studentId)) clean[studentId] = status;
    }
    if (Object.keys(clean).length > 0) attendance[date] = clean;
  }
  return { data: { version: 1, students, attendance }, problems };
}

/** Returns valid data, or a message explaining the first problem. Every part must pass. */
export function validateData(value: unknown): AttendanceData | string {
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
  data: AttendanceData,
): { ok: true } | { ok: false; reason: string } {
  if (!storage) return { ok: false, reason: 'this browser is blocking local storage' };
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(data));
    return { ok: true };
  } catch (error) {
    return { ok: false, reason: error instanceof Error ? error.message : 'unknown storage error' };
  }
}

export function clearSavedData(storage: Storage | null): void {
  storage?.removeItem(STORAGE_KEY);
}
