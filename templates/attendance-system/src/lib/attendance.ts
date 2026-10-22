/**
 * Attendance calculations. Every number shown in the app comes from here.
 *
 * Rule used throughout: a student's attendance percentage is
 *   (days marked present + days marked late) / days marked at all × 100.
 * Days with no mark for a student (for example before they joined) are not
 * counted for that student.
 */
import type { AttendanceByDate, AttendanceStatus, Student } from '../types';

export interface StatusCounts {
  present: number;
  late: number;
  absent: number;
  /** present + late + absent */
  total: number;
}

export interface StudentSummary extends StatusCounts {
  student: Student;
  /** Attendance percentage rounded to one decimal place, or null with no marks. */
  percentage: number | null;
  belowThreshold: boolean;
}

export interface DateRange {
  from?: string;
  to?: string;
}

export function emptyCounts(): StatusCounts {
  return { present: 0, late: 0, absent: 0, total: 0 };
}

export function addStatus(counts: StatusCounts, status: AttendanceStatus): void {
  counts[status] += 1;
  counts.total += 1;
}

export function attendancePercentage(counts: StatusCounts): number | null {
  if (counts.total === 0) return null;
  return Math.round(((counts.present + counts.late) / counts.total) * 1000) / 10;
}

export function isInRange(date: string, range: DateRange = {}): boolean {
  if (range.from && date < range.from) return false;
  if (range.to && date > range.to) return false;
  return true;
}

/** Dates that have at least one mark, newest first. */
export function recordedDates(attendance: AttendanceByDate, range: DateRange = {}): string[] {
  return Object.keys(attendance)
    .filter((date) => Object.keys(attendance[date] ?? {}).length > 0 && isInRange(date, range))
    .sort((a, b) => (a < b ? 1 : -1));
}

export function summarizeStudent(
  student: Student,
  attendance: AttendanceByDate,
  threshold: number,
  range: DateRange = {},
): StudentSummary {
  const counts = emptyCounts();
  for (const [date, marks] of Object.entries(attendance)) {
    if (!isInRange(date, range)) continue;
    const status = marks[student.id];
    if (status) addStatus(counts, status);
  }
  const percentage = attendancePercentage(counts);
  return {
    ...counts,
    student,
    percentage,
    belowThreshold: percentage !== null && percentage < threshold,
  };
}

export function summarizeStudents(
  students: Student[],
  attendance: AttendanceByDate,
  threshold: number,
  range: DateRange = {},
): StudentSummary[] {
  return students.map((student) => summarizeStudent(student, attendance, threshold, range));
}

/** Counts every mark for the given students (all dates in range). */
export function overallCounts(
  students: Student[],
  attendance: AttendanceByDate,
  range: DateRange = {},
): StatusCounts {
  const ids = new Set(students.map((student) => student.id));
  const counts = emptyCounts();
  for (const [date, marks] of Object.entries(attendance)) {
    if (!isInRange(date, range)) continue;
    for (const [studentId, status] of Object.entries(marks)) {
      if (ids.has(studentId)) addStatus(counts, status);
    }
  }
  return counts;
}

export function countsForDate(
  students: Student[],
  attendance: AttendanceByDate,
  date: string,
): StatusCounts & { unmarked: number } {
  const marks = attendance[date] ?? {};
  const counts = emptyCounts();
  let unmarked = 0;
  for (const student of students) {
    const status = marks[student.id];
    if (status) addStatus(counts, status);
    else unmarked += 1;
  }
  return { ...counts, unmarked };
}

export interface ClassSummary extends StatusCounts {
  className: string;
  studentCount: number;
  percentage: number | null;
}

export function summarizeClasses(
  students: Student[],
  attendance: AttendanceByDate,
): ClassSummary[] {
  const byClass = new Map<string, Student[]>();
  for (const student of students) {
    const list = byClass.get(student.className) ?? [];
    list.push(student);
    byClass.set(student.className, list);
  }
  return [...byClass.entries()]
    .sort(([a], [b]) => a.localeCompare(b, undefined, { numeric: true }))
    .map(([className, members]) => {
      const counts = overallCounts(members, attendance);
      return {
        ...counts,
        className,
        studentCount: members.length,
        percentage: attendancePercentage(counts),
      };
    });
}

export function classNames(students: Student[]): string[] {
  return [...new Set(students.map((student) => student.className))].sort((a, b) =>
    a.localeCompare(b, undefined, { numeric: true }),
  );
}

export function sortStudents(students: Student[]): Student[] {
  return [...students].sort(
    (a, b) =>
      a.className.localeCompare(b.className, undefined, { numeric: true }) ||
      a.rollNumber.localeCompare(b.rollNumber, undefined, { numeric: true }) ||
      a.name.localeCompare(b.name),
  );
}

export function matchesSearch(student: Student, query: string): boolean {
  const needle = query.trim().toLocaleLowerCase();
  if (!needle) return true;
  return (
    student.name.toLocaleLowerCase().includes(needle) ||
    student.rollNumber.toLocaleLowerCase().includes(needle)
  );
}
