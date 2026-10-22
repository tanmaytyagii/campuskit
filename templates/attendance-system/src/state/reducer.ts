/**
 * All changes to the app's data go through this reducer. Keeping updates in
 * one pure function makes them easy to test and to explain: given the current
 * data and an action, it returns the new data without modifying the old one.
 */
import type { AttendanceData, AttendanceStatus, Student } from '../types';

export type AttendanceAction =
  | { type: 'student/add'; student: Student }
  | { type: 'student/update'; student: Student }
  | { type: 'student/delete'; studentId: string }
  | { type: 'attendance/save'; date: string; marks: Record<string, AttendanceStatus> }
  | { type: 'data/replace'; data: AttendanceData };

export function attendanceReducer(state: AttendanceData, action: AttendanceAction): AttendanceData {
  switch (action.type) {
    case 'student/add':
      return { ...state, students: [...state.students, action.student] };

    case 'student/update':
      return {
        ...state,
        students: state.students.map((student) =>
          student.id === action.student.id ? action.student : student,
        ),
      };

    case 'student/delete': {
      // Remove the student and every attendance mark that belongs to them.
      const attendance: AttendanceData['attendance'] = {};
      for (const [date, marks] of Object.entries(state.attendance)) {
        const { [action.studentId]: _removed, ...rest } = marks;
        if (Object.keys(rest).length > 0) attendance[date] = rest;
      }
      return {
        ...state,
        students: state.students.filter((student) => student.id !== action.studentId),
        attendance,
      };
    }

    case 'attendance/save': {
      const merged = { ...(state.attendance[action.date] ?? {}), ...action.marks };
      const attendance = { ...state.attendance };
      if (Object.keys(merged).length > 0) attendance[action.date] = merged;
      else delete attendance[action.date];
      return { ...state, attendance };
    }

    case 'data/replace':
      return action.data;
  }
}
