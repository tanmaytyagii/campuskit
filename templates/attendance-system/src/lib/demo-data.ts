/**
 * A fictional sample class used on first run (when "seedDemoData" is true in
 * src/app.config.json) and by "Load demo data" in Settings. All names are
 * invented for demonstration purposes.
 */
import type { AttendanceByDate, AttendanceData, AttendanceStatus, Student } from '../types';
import { previousWeekdays } from './dates';

const DEMO_STUDENTS: Array<Pick<Student, 'rollNumber' | 'name' | 'className'>> = [
  { rollNumber: '10A-01', name: 'Aarav Sharma', className: 'Class 10-A' },
  { rollNumber: '10A-02', name: 'Diya Patel', className: 'Class 10-A' },
  { rollNumber: '10A-03', name: 'Kabir Singh', className: 'Class 10-A' },
  { rollNumber: '10A-04', name: 'Meera Iyer', className: 'Class 10-A' },
  { rollNumber: '10A-05', name: 'Rohan Das', className: 'Class 10-A' },
  { rollNumber: '10A-06', name: 'Sara Thomas', className: 'Class 10-A' },
  { rollNumber: '10B-01', name: 'Ananya Reddy', className: 'Class 10-B' },
  { rollNumber: '10B-02', name: 'Arjun Nair', className: 'Class 10-B' },
  { rollNumber: '10B-03', name: 'Fatima Khan', className: 'Class 10-B' },
  { rollNumber: '10B-04', name: 'Ishaan Gupta', className: 'Class 10-B' },
  { rollNumber: '10B-05', name: 'Nisha Verma', className: 'Class 10-B' },
  { rollNumber: '10B-06', name: 'Vikram Joshi', className: 'Class 10-B' },
];

/**
 * How often each demo student is absent or late, so the sample includes a
 * realistic mix: most students attend regularly, two fall below 75 %.
 */
const PATTERNS: Array<{ absentEvery: number; lateEvery: number }> = [
  { absentEvery: 0, lateEvery: 0 },
  { absentEvery: 7, lateEvery: 0 },
  { absentEvery: 3, lateEvery: 5 },
  { absentEvery: 0, lateEvery: 4 },
  { absentEvery: 2, lateEvery: 0 },
  { absentEvery: 9, lateEvery: 0 },
  { absentEvery: 0, lateEvery: 0 },
  { absentEvery: 5, lateEvery: 3 },
  { absentEvery: 0, lateEvery: 6 },
  { absentEvery: 4, lateEvery: 7 },
  { absentEvery: 8, lateEvery: 0 },
  { absentEvery: 0, lateEvery: 0 },
];

/** Builds the demo data with ten school days ending the day before `reference`. */
export function createDemoData(reference: Date = new Date()): AttendanceData {
  const createdAt = new Date(reference.getTime() - 14 * 24 * 60 * 60 * 1000).toISOString();
  const students: Student[] = DEMO_STUDENTS.map((student, index) => ({
    ...student,
    id: `demo-${String(index + 1).padStart(2, '0')}`,
    createdAt,
  }));

  const attendance: AttendanceByDate = {};
  previousWeekdays(reference, 10).forEach((date, dayIndex) => {
    const marks: Record<string, AttendanceStatus> = {};
    students.forEach((student, studentIndex) => {
      const pattern = PATTERNS[studentIndex] ?? { absentEvery: 0, lateEvery: 0 };
      const day = dayIndex + studentIndex; // offset so absences don't all fall on one day
      if (pattern.absentEvery > 0 && day % pattern.absentEvery === 0) marks[student.id] = 'absent';
      else if (pattern.lateEvery > 0 && day % pattern.lateEvery === 0) marks[student.id] = 'late';
      else marks[student.id] = 'present';
    });
    attendance[date] = marks;
  });

  return { version: 1, students, attendance };
}

export function createEmptyData(): AttendanceData {
  return { version: 1, students: [], attendance: {} };
}
