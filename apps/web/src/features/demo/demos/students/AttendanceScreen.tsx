/**
 * The attendance sheet (attendance/mark.html): one course on one day, every active student taking
 * it, marked present, late or absent. Saving is an upsert, so a day can be marked again.
 */
import { ClipboardCheck } from 'lucide-react';
import { useId, useState, type FormEvent } from 'react';

import { Button } from '../../../../components/ui/Button.tsx';
import { EmptyState } from '../../../../components/ui/EmptyState.tsx';
import { SelectField, TextField } from '../../../../components/ui/Field.tsx';
import {
  highlightClasses,
  rowHeaderClasses,
  ScreenHeading,
  TableRegion,
  tableClasses,
  theadClasses,
  thClasses,
} from '../../ui.tsx';
import {
  ATTENDANCE_STATUSES,
  attendanceSheet,
  attended,
  saveAttendance,
  validateAttendanceDate,
  type AttendanceStatus,
  type Course,
  type Mark,
  type SmsState,
} from './model.ts';
import {
  fullName,
  LastStatement,
  longDay,
  plural,
  rateLabel,
  today,
  type Props,
} from './shared.tsx';

const LABELS: Record<AttendanceStatus, string> = {
  present: 'Present',
  late: 'Late',
  absent: 'Absent',
};

// Narrower than the shared table cells, so the three choices fit beside a name on a phone.
const radioHeaderClasses = 'px-2 py-2.5 text-center font-semibold whitespace-nowrap sm:px-3';
const radioCellClasses = 'px-2 py-2.5 text-center align-middle sm:px-3';

/** strftime("%d %B %Y"), as the template's message prints the day. */
function messageDay(day: string): string {
  const [year, month, date] = day.split('-').map(Number) as [number, number, number];
  const name = new Date(year, month - 1, date).toLocaleDateString('en-GB', { month: 'long' });
  return `${String(date).padStart(2, '0')} ${name} ${year}`;
}

/** marked_dates(): the latest ten days with marks for the course, with counts. */
function markedDates(state: SmsState, courseId: number) {
  const days = new Map<string, Mark[]>();
  for (const mark of state.attendance)
    if (mark.course_id === courseId) days.set(mark.date, [...(days.get(mark.date) ?? []), mark]);
  return [...days]
    .sort(([a], [b]) => (a < b ? 1 : -1))
    .slice(0, 10)
    .map(([date, marks]) => ({ date, marked: marks.length, attended: attended(marks) }));
}

export function AttendanceScreen({ state, update, highlight, selectFeature }: Props) {
  const courses = [...state.courses].sort((a, b) => (a.code < b.code ? -1 : 1));
  const [courseId, setCourseId] = useState<number | null>(null);
  const [day, setDay] = useState(today);
  const course = courses.find((item) => item.id === courseId) ?? courses[0];

  if (!course)
    return (
      <div className="space-y-5">
        <ScreenHeading title="Attendance" />
        <EmptyState
          icon={<ClipboardCheck aria-hidden="true" className="size-6" />}
          title="No courses yet"
          actions={
            <Button size="sm" onClick={() => selectFeature('courses')}>
              Add a course
            </Button>
          }
        >
          Attendance is marked for each course. Add a course first, then enroll students in it.
        </EmptyState>
      </div>
    );

  return (
    <div className="space-y-5">
      <ScreenHeading
        title={`Attendance for ${course.code}`}
        description="Choose a course and a day. Students without a mark are saved as present."
      />
      <SelectField
        label="Course"
        value={String(course.id)}
        containerClassName="max-w-md"
        onChange={(event) => setCourseId(Number(event.target.value))}
      >
        {courses.map((item) => (
          <option key={item.id} value={item.id}>
            {item.code} {item.title}
          </option>
        ))}
      </SelectField>
      <DayForm day={day} onShow={setDay} />
      <div className={highlightClasses(highlight === 'attendance-sheet')}>
        <Sheet
          key={`${course.id}:${day}`}
          state={state}
          course={course}
          day={day}
          update={update}
        />
      </div>
      <RecentDays state={state} course={course} current={day} onOpen={setDay} />
      <LastStatement state={state} />
    </div>
  );
}

function DayForm({ day, onShow }: { day: string; onShow: (day: string) => void }) {
  const [text, setText] = useState(day);
  const [error, setError] = useState<string | undefined>();
  // A day opened from the list below replaces whatever was typed.
  const [shown, setShown] = useState(day);
  if (shown !== day) {
    setShown(day);
    setText(day);
    setError(undefined);
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const result = validateAttendanceDate(text, today());
    if ('error' in result) {
      setError(result.error);
      return;
    }
    setError(undefined);
    onShow(result.day);
  }

  return (
    <form
      noValidate
      aria-label="Choose the day"
      onSubmit={submit}
      className="flex flex-wrap items-end gap-3"
    >
      <TextField
        label="Day"
        type="date"
        max={today()}
        value={text}
        error={error}
        containerClassName="w-full sm:w-56"
        onChange={(event) => {
          setText(event.target.value);
          setError(undefined);
        }}
      />
      <Button type="submit" variant="secondary">
        Show
      </Button>
    </form>
  );
}

function Sheet({
  state,
  course,
  day,
  update,
}: {
  state: SmsState;
  course: Course;
  day: string;
  update: Props['update'];
}) {
  const sheet = attendanceSheet(state, course.id, day);
  const [marks, setMarks] = useState(
    () => new Map(sheet.map(({ student, status }) => [student.id, status ?? 'present'])),
  );
  const ids = useId();
  const markedCount = sheet.filter((row) => row.status !== null).length;
  const unsaved = sheet.some(({ student, status }) => marks.get(student.id) !== status);

  if (sheet.length === 0)
    return (
      <p className="rounded-xl border border-dashed border-line-strong px-4 py-6 text-sm text-ink-2">
        No active students are enrolled in this course. Enroll students from their own pages, on the
        Students screen.
      </p>
    );

  function save() {
    // The form sends a status for every student on the sheet.
    const chosen = new Map(
      sheet.map(({ student }) => [student.id, marks.get(student.id) ?? 'present'] as const),
    );
    const { saved } = saveAttendance(state, course.id, day, chosen);
    update(
      (current) => saveAttendance(current, course.id, day, chosen).state,
      `Saved attendance for ${saved} students on ${messageDay(day)}.`,
    );
  }

  return (
    <section aria-labelledby={`${ids}-heading`} className="space-y-3">
      <h3 id={`${ids}-heading`} className="font-semibold text-ink">
        {longDay(day)}
      </h3>
      <p className="text-sm text-ink-2">
        {markedCount} of {plural(sheet.length, 'student', 'students')} marked. Students without a
        mark are saved as present.
      </p>
      <TableRegion label="Attendance sheet">
        <table className={tableClasses}>
          <thead className={theadClasses}>
            <tr>
              <th scope="col" className={thClasses}>
                Student
              </th>
              {ATTENDANCE_STATUSES.map((status) => (
                <th key={status} scope="col" className={radioHeaderClasses}>
                  {LABELS[status]}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {sheet.map(({ student }) => {
              const rowId = `${ids}-student-${student.id}`;
              return (
                <tr key={student.id}>
                  <th scope="row" id={rowId} className={rowHeaderClasses}>
                    {fullName(student)}{' '}
                    <span className="font-mono text-xs font-normal text-ink-3">
                      {student.roll_number}
                    </span>
                  </th>
                  {ATTENDANCE_STATUSES.map((status) => {
                    const inputId = `${rowId}-${status}`;
                    return (
                      <td key={status} className={radioCellClasses}>
                        <input
                          type="radio"
                          id={inputId}
                          name={`${ids}-status-${student.id}`}
                          value={status}
                          checked={marks.get(student.id) === status}
                          aria-labelledby={`${rowId} ${inputId}-label`}
                          className="size-5 accent-violet"
                          onChange={() =>
                            setMarks((current) => new Map(current).set(student.id, status))
                          }
                        />
                        <label id={`${inputId}-label`} htmlFor={inputId} className="sr-only">
                          {LABELS[status]}
                        </label>
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </TableRegion>
      <div className="flex flex-wrap items-center gap-3">
        <Button onClick={save}>Save attendance</Button>
        <p className="type-meta">
          {unsaved ? 'Not saved yet.' : 'Saved: these are the marks in the database.'}
        </p>
      </div>
    </section>
  );
}

function RecentDays({
  state,
  course,
  current,
  onOpen,
}: {
  state: SmsState;
  course: Course;
  current: string;
  onOpen: (day: string) => void;
}) {
  const days = markedDates(state, course.id);
  if (days.length === 0) return null;
  return (
    <section aria-labelledby="sms-recent-days" className="space-y-2">
      <h3 id="sms-recent-days" className="font-semibold text-ink">
        Days with marks for {course.code}
      </h3>
      <ul className="flex flex-wrap gap-2">
        {days.map(({ date, marked, attended: present }) => (
          <li key={date}>
            <Button
              size="sm"
              variant={date === current ? 'primary' : 'secondary'}
              aria-current={date === current ? 'date' : undefined}
              onClick={() => onOpen(date)}
            >
              {longDay(date)}: {rateLabel(present, marked)}
            </Button>
          </li>
        ))}
      </ul>
    </section>
  );
}
