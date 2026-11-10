/**
 * The student management demo: an educational simulation of the template's Flask app. The
 * screens are re-created; the rules, sample data, queries and statistics come from model.ts,
 * which is tested against results recorded from the template's Python code.
 */
import { defineDemo } from '../../define.ts';
import { AttendanceScreen } from './AttendanceScreen.tsx';
import { CoursesScreen } from './CoursesScreen.tsx';
import { DashboardScreen } from './DashboardScreen.tsx';
import { DatabaseScreen } from './DatabaseScreen.tsx';
import { createEmptyData, createSampleData, readState, type Mark, type SmsState } from './model.ts';
import { fullName, plural, today, type Props } from './shared.tsx';
import { StudentsScreen } from './StudentsScreen.tsx';

function StudentsDemoView(props: Props) {
  switch (props.feature) {
    case 'students':
      return <StudentsScreen {...props} />;
    case 'courses':
      return <CoursesScreen {...props} />;
    case 'attendance':
      return <AttendanceScreen {...props} />;
    case 'database':
      return <DatabaseScreen {...props} />;
    default:
      return <DashboardScreen {...props} />;
  }
}

const markKey = (mark: Mark) => `${mark.student_id}:${mark.course_id}:${mark.date}`;

function courseCode(state: SmsState, id: number): string {
  return state.courses.find((course) => course.id === id)?.code ?? `course ${id}`;
}

export const studentsImplementation = defineDemo<SmsState>({
  createState: () => createSampleData(today()),
  createEmptyState: createEmptyData,
  readState,
  View: StudentsDemoView,
  checks: {
    'add-student': (state, start) => {
      const before = new Set(start.students.map((student) => student.id));
      const added = state.students.filter((student) => !before.has(student.id));
      return added.length > 0
        ? {
            done: true,
            detail: `Added ${added.map((student) => `${fullName(student)} (${student.roll_number})`).join(', ')}.`,
          }
        : { done: false, detail: 'No new student in the students table yet.' };
    },
    enroll: (state, start) => {
      const before = new Set(start.enrollments.map((row) => `${row.student_id}:${row.course_id}`));
      const added = state.enrollments.filter(
        (row) => !before.has(`${row.student_id}:${row.course_id}`),
      );
      const names = added.map((row) => {
        const student = state.students.find((item) => item.id === row.student_id);
        return `${student ? fullName(student) : `student ${row.student_id}`} in ${courseCode(state, row.course_id)}`;
      });
      return names.length > 0
        ? { done: true, detail: `Enrolled ${names.join(', ')}.` }
        : { done: false, detail: 'No new enrollment yet.' };
    },
    'mark-attendance': (state, start) => {
      const before = new Map(start.attendance.map((mark) => [markKey(mark), mark.status]));
      const changed = state.attendance.filter((mark) => before.get(markKey(mark)) !== mark.status);
      const latest = changed.reduce<Mark | null>(
        (found, mark) => (found === null || mark.date > found.date ? mark : found),
        null,
      );
      return latest
        ? {
            done: true,
            detail: `${plural(changed.length, 'mark', 'marks')} saved or changed, the latest for ${courseCode(state, latest.course_id)} on ${latest.date}.`,
          }
        : { done: false, detail: 'No attendance has been saved since you started.' };
    },
    'delete-student': (state, start) => {
      const now = new Set(state.students.map((student) => student.id));
      const deleted = start.students.filter((student) => !now.has(student.id));
      return deleted.length > 0
        ? { done: true, detail: `Deleted ${deleted.map(fullName).join(', ')}.` }
        : { done: false, detail: 'No student has been deleted since you started.' };
    },
  },
  describe: (state) =>
    [
      plural(state.students.length, 'student', 'students'),
      plural(state.courses.length, 'course', 'courses'),
      plural(state.attendance.length, 'attendance mark', 'attendance marks'),
    ].join(' · '),
});
