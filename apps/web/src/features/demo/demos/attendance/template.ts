/**
 * The attendance template's own modules, imported unchanged from
 * templates/attendance-system. The demo's figures, validation messages, data
 * updates and sample class all come from this code, so they behave exactly
 * as they do in the downloaded project. Only modules without dependencies are
 * imported; the template's React screens are re-created in the demo.
 */
export {
  attendancePercentage,
  classNames,
  countsForDate,
  matchesSearch,
  overallCounts,
  recordedDates,
  sortStudents,
  summarizeClasses,
  summarizeStudent,
  summarizeStudents,
  type StudentSummary,
} from '../../../../../../../templates/attendance-system/src/lib/attendance.ts';
export {
  normalizeStudentInput,
  validateStudentInput,
  type StudentErrors,
  type StudentInput,
} from '../../../../../../../templates/attendance-system/src/lib/validation.ts';
export {
  formatDateKey,
  isValidDateKey,
  todayKey,
} from '../../../../../../../templates/attendance-system/src/lib/dates.ts';
export {
  createDemoData,
  createEmptyData,
} from '../../../../../../../templates/attendance-system/src/lib/demo-data.ts';
export {
  STORAGE_KEY,
  validateData,
} from '../../../../../../../templates/attendance-system/src/lib/storage.ts';
export { attendanceReducer } from '../../../../../../../templates/attendance-system/src/state/reducer.ts';
export { loadConfig } from '../../../../../../../templates/attendance-system/src/config.ts';
export {
  ATTENDANCE_STATUSES,
  STATUS_LABELS,
  type AttendanceData,
  type AttendanceStatus,
  type Student,
} from '../../../../../../../templates/attendance-system/src/types.ts';
