/** Data types shared across the app. */

export type AttendanceStatus = 'present' | 'absent' | 'late';

export const ATTENDANCE_STATUSES: readonly AttendanceStatus[] = ['present', 'late', 'absent'];

export const STATUS_LABELS: Record<AttendanceStatus, string> = {
  present: 'Present',
  late: 'Late',
  absent: 'Absent',
};

export interface Student {
  id: string;
  /** Roll numbers are unique within a class, e.g. "10A-07". */
  rollNumber: string;
  name: string;
  /** Class or section label, e.g. "Class 10-A". */
  className: string;
  /** ISO timestamp of when the student was added. */
  createdAt: string;
}

/**
 * Attendance is stored per date ("YYYY-MM-DD"), then per student id:
 * { "2026-10-20": { "student-id": "present" } }
 */
export type AttendanceByDate = Record<string, Record<string, AttendanceStatus>>;

export interface AttendanceData {
  version: 1;
  students: Student[];
  attendance: AttendanceByDate;
}
