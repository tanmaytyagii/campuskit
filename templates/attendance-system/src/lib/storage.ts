/**
 * Saves and loads the app's data in the browser's localStorage.
 *
 * Nothing is sent to a server: the data lives only in this browser profile.
 * Loaded data is checked before use, so a corrupted or hand-edited value can
 * never crash the app. If saved data cannot be read, it is kept under a backup
 * key instead of being thrown away.
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

function isStudent(value: unknown): value is Student {
  if (!isRecord(value)) return false;
  return ['id', 'rollNumber', 'name', 'className', 'createdAt'].every(
    (key) => typeof value[key] === 'string' && (value[key] as string).length > 0,
  );
}

function isStatus(value: unknown): value is AttendanceStatus {
  return typeof value === 'string' && (ATTENDANCE_STATUSES as readonly string[]).includes(value);
}

/** Returns valid data, or a message explaining what is wrong. */
export function validateData(value: unknown): AttendanceData | string {
  if (!isRecord(value)) return 'the saved value is not an object';
  if (value.version !== 1) return `unsupported data version ${String(value.version)}`;
  if (!Array.isArray(value.students) || !value.students.every(isStudent))
    return 'the student list is malformed';
  if (!isRecord(value.attendance)) return 'the attendance records are malformed';

  const students = value.students as Student[];
  const ids = new Set(students.map((student) => student.id));
  if (ids.size !== students.length) return 'two students share the same id';

  const attendance: AttendanceData['attendance'] = {};
  for (const [date, marks] of Object.entries(value.attendance)) {
    if (!isValidDateKey(date)) return `"${date}" is not a valid date`;
    if (!isRecord(marks)) return `attendance for ${date} is malformed`;
    const clean: Record<string, AttendanceStatus> = {};
    for (const [studentId, status] of Object.entries(marks)) {
      if (!isStatus(status)) return `unknown status "${String(status)}" on ${date}`;
      // Marks for students that no longer exist are dropped quietly.
      if (ids.has(studentId)) clean[studentId] = status;
    }
    if (Object.keys(clean).length > 0) attendance[date] = clean;
  }
  return { version: 1, students, attendance };
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
