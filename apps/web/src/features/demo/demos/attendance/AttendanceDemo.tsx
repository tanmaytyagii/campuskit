/**
 * The attendance demo's screens. They are re-created with CampusKit's
 * components, but every change goes through the template's reducer and every
 * figure and message comes from the template's own modules (see template.ts).
 */
import { Pencil, Trash2, TriangleAlert, UserPlus, Users } from 'lucide-react';
import { useId, useRef, useState, type FormEvent } from 'react';

import { Badge } from '../../../../components/ui/Badge.tsx';
import { Button } from '../../../../components/ui/Button.tsx';
import { Dialog } from '../../../../components/ui/Dialog.tsx';
import { EmptyState } from '../../../../components/ui/EmptyState.tsx';
import { SelectField, TextField } from '../../../../components/ui/Field.tsx';
import { cn } from '../../../../lib/cn.ts';
import { BarList, ChartCard } from '../../charts.tsx';
import { defineDemo } from '../../define.ts';
import type { DemoViewProps } from '../../types.ts';
import {
  highlightClasses,
  JsonView,
  ScreenHeading,
  StatGrid,
  StatTile,
  TableRegion,
  tableClasses,
  tdClasses,
  theadClasses,
  thClasses,
} from '../../ui.tsx';
import {
  ATTENDANCE_STATUSES,
  attendancePercentage,
  attendanceReducer,
  classNames,
  countsForDate,
  createDemoData,
  createEmptyData,
  formatDateKey,
  isValidDateKey,
  loadConfig,
  matchesSearch,
  normalizeStudentInput,
  overallCounts,
  recordedDates,
  sortStudents,
  STATUS_LABELS,
  STORAGE_KEY,
  summarizeClasses,
  summarizeStudent,
  summarizeStudents,
  todayKey,
  validateData,
  validateStudentInput,
  type AttendanceData,
  type AttendanceStatus,
  type Student,
  type StudentErrors,
  type StudentInput,
} from './template.ts';

type Props = DemoViewProps<AttendanceData>;

/** The template's default settings (src/app.config.json), including the 75 % threshold. */
const config = loadConfig();
const THRESHOLD = config.attendanceThreshold;

function newId(): string {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `student-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function percentText(value: number | null): string {
  return value === null ? 'No marks yet' : `${value.toFixed(1)}%`;
}

function Percentage({ value }: { value: number | null }) {
  if (value === null) return <span className="text-ink-3">No marks yet</span>;
  const below = value < THRESHOLD;
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 font-semibold tabular-nums',
        below ? 'text-danger' : 'text-ink',
      )}
    >
      {below ? <TriangleAlert aria-hidden="true" className="size-3.5" /> : null}
      {value.toFixed(1)}%
      {below ? <span className="sr-only">, below the {THRESHOLD}% threshold</span> : null}
    </span>
  );
}

const iconButton =
  'inline-flex size-8 items-center justify-center rounded-md text-ink-2 transition-colors hover:bg-raised hover:text-ink';

// ---------------------------------------------------------------------------
// Students
// ---------------------------------------------------------------------------

function StudentForm({
  student,
  students,
  classes,
  defaultClass,
  onSave,
  onClose,
}: {
  student: Student | null;
  students: Student[];
  classes: string[];
  defaultClass: string;
  onSave: (input: StudentInput) => void;
  onClose: () => void;
}) {
  const [values, setValues] = useState<StudentInput>(() =>
    student
      ? { name: student.name, rollNumber: student.rollNumber, className: student.className }
      : { name: '', rollNumber: '', className: defaultClass },
  );
  const [errors, setErrors] = useState<StudentErrors>({});
  const formId = useId();
  const listId = useId();
  const refs = {
    name: useRef<HTMLInputElement>(null),
    rollNumber: useRef<HTMLInputElement>(null),
    className: useRef<HTMLInputElement>(null),
  };

  function change(field: keyof StudentInput, value: string) {
    setValues((current) => ({ ...current, [field]: value }));
    if (errors[field]) setErrors((current) => ({ ...current, [field]: undefined }));
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const found = validateStudentInput(values, students, student?.id);
    setErrors(found);
    const firstInvalid = (['name', 'rollNumber', 'className'] as const).find((key) => found[key]);
    if (firstInvalid) {
      refs[firstInvalid].current?.focus();
      return;
    }
    onSave(normalizeStudentInput(values));
  }

  return (
    <Dialog
      open
      onClose={onClose}
      title={student ? 'Edit student' : 'Add student'}
      footer={
        <div className="flex flex-wrap justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" form={formId}>
            {student ? 'Save changes' : 'Add student'}
          </Button>
        </div>
      }
    >
      <form id={formId} noValidate onSubmit={submit} className="space-y-4">
        <TextField
          ref={refs.name}
          label="Full name"
          placeholder="e.g. Priya Menon"
          autoComplete="off"
          value={values.name}
          error={errors.name}
          onChange={(event) => change('name', event.target.value)}
        />
        <TextField
          ref={refs.rollNumber}
          label="Roll number"
          placeholder="e.g. 10A-07"
          autoComplete="off"
          value={values.rollNumber}
          error={errors.rollNumber}
          onChange={(event) => change('rollNumber', event.target.value)}
        />
        <TextField
          ref={refs.className}
          label="Class or section"
          placeholder="e.g. Class 10-A"
          autoComplete="off"
          list={listId}
          value={values.className}
          error={errors.className}
          onChange={(event) => change('className', event.target.value)}
        />
        <datalist id={listId}>
          {classes.map((name) => (
            <option key={name} value={name} />
          ))}
        </datalist>
        <p className="type-meta">
          Checked with validateStudentInput from the template’s src/lib/validation.ts.
        </p>
      </form>
    </Dialog>
  );
}

function StudentsScreen({ state, update, highlight }: Props) {
  const [query, setQuery] = useState('');
  const [classFilter, setClassFilter] = useState('all');
  const [form, setForm] = useState<{ key: number; student: Student | null } | null>(null);
  const [deleting, setDeleting] = useState<Student | null>(null);
  const searchId = useId();

  const classes = classNames(state.students);
  const shownClass = classes.includes(classFilter) ? classFilter : 'all';
  const visible = sortStudents(state.students).filter(
    (student) =>
      (shownClass === 'all' || student.className === shownClass) && matchesSearch(student, query),
  );

  function save(input: StudentInput) {
    const editing = form?.student;
    if (editing) {
      update(
        (current) =>
          attendanceReducer(current, { type: 'student/update', student: { ...editing, ...input } }),
        `Saved changes to ${input.name}.`,
      );
    } else {
      update(
        (current) =>
          attendanceReducer(current, {
            type: 'student/add',
            student: { ...input, id: newId(), createdAt: new Date().toISOString() },
          }),
        `Added ${input.name}.`,
      );
    }
    setForm(null);
  }

  function confirmDelete() {
    if (!deleting) return;
    const { id, name } = deleting;
    update(
      (current) => attendanceReducer(current, { type: 'student/delete', studentId: id }),
      `Deleted ${name} and their attendance history.`,
    );
    setDeleting(null);
  }

  const deletingMarks = deleting
    ? Object.values(state.attendance).filter((marks) => marks[deleting.id] !== undefined).length
    : 0;

  return (
    <div className="space-y-5">
      <ScreenHeading
        title="Students"
        description={`${state.students.length} ${state.students.length === 1 ? 'student' : 'students'} in ${classes.length} ${classes.length === 1 ? 'class' : 'classes'}.`}
        actions={
          <span className={cn('inline-flex', highlightClasses(highlight === 'add-student'))}>
            <Button
              size="sm"
              icon={<UserPlus aria-hidden="true" className="size-4" />}
              onClick={() => setForm({ key: Date.now(), student: null })}
            >
              Add student
            </Button>
          </span>
        }
      />

      {state.students.length === 0 ? (
        <EmptyState
          icon={<Users aria-hidden="true" className="size-6" />}
          title="No students yet"
          actions={
            <Button size="sm" onClick={() => setForm({ key: Date.now(), student: null })}>
              Add your first student
            </Button>
          }
        >
          Add the students in your class, then mark attendance each day. Reset the demo to bring
          back the sample class.
        </EmptyState>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_13rem]">
            <TextField
              id={searchId}
              type="search"
              label="Search"
              placeholder="Name or roll number"
              value={query}
              maxLength={60}
              onChange={(event) => setQuery(event.target.value)}
            />
            <SelectField
              label="Class"
              value={shownClass}
              onChange={(event) => setClassFilter(event.target.value)}
            >
              <option value="all">All classes</option>
              {classes.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </SelectField>
          </div>
          <p className="type-meta" role="status">
            Showing {visible.length} of {state.students.length} students
          </p>
          {visible.length === 0 ? (
            <div className="rounded-xl border border-dashed border-line-strong px-4 py-8 text-center text-sm text-ink-2">
              <p>No students match these filters.</p>
              <Button
                size="sm"
                variant="secondary"
                className="mt-3"
                onClick={() => {
                  setQuery('');
                  setClassFilter('all');
                }}
              >
                Clear the filters
              </Button>
            </div>
          ) : (
            <div className={highlightClasses(highlight === 'student-list')}>
              <TableRegion label="Students">
                <table className={tableClasses}>
                  <caption className="sr-only">Students and their attendance so far</caption>
                  <thead className={theadClasses}>
                    <tr>
                      <th scope="col" className={thClasses}>
                        Student
                      </th>
                      <th scope="col" className={cn(thClasses, 'hidden sm:table-cell')}>
                        Roll no.
                      </th>
                      <th scope="col" className={cn(thClasses, 'hidden md:table-cell')}>
                        Class
                      </th>
                      <th scope="col" className={cn(thClasses, 'text-right')}>
                        Attendance
                      </th>
                      <th scope="col" className={thClasses}>
                        <span className="sr-only">Actions</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {visible.map((student) => {
                      const summary = summarizeStudent(student, state.attendance, THRESHOLD);
                      return (
                        <tr key={student.id}>
                          <td className={tdClasses}>
                            <span className="font-semibold text-ink">{student.name}</span>
                            <span className="type-meta block md:hidden">
                              <span className="sm:hidden">{student.rollNumber} · </span>
                              {student.className}
                            </span>
                          </td>
                          <td className={cn(tdClasses, 'hidden font-mono text-xs sm:table-cell')}>
                            {student.rollNumber}
                          </td>
                          <td className={cn(tdClasses, 'hidden md:table-cell')}>
                            {student.className}
                          </td>
                          <td className={cn(tdClasses, 'text-right')}>
                            <Percentage value={summary.percentage} />
                          </td>
                          <td className={cn(tdClasses, 'py-1.5 text-right whitespace-nowrap')}>
                            <button
                              type="button"
                              className={iconButton}
                              aria-label={`Edit ${student.name}`}
                              onClick={() => setForm({ key: Date.now(), student })}
                            >
                              <Pencil aria-hidden="true" className="size-4" />
                            </button>
                            <button
                              type="button"
                              className={cn(iconButton, 'hover:text-danger')}
                              aria-label={`Delete ${student.name}`}
                              onClick={() => setDeleting(student)}
                            >
                              <Trash2 aria-hidden="true" className="size-4" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </TableRegion>
            </div>
          )}
        </>
      )}

      {form ? (
        <StudentForm
          key={form.key}
          student={form.student}
          students={state.students}
          classes={classes}
          defaultClass={form.student?.className ?? (shownClass === 'all' ? (classes[0] ?? '') : shownClass)}
          onSave={save}
          onClose={() => setForm(null)}
        />
      ) : null}

      <Dialog
        open={deleting !== null}
        onClose={() => setDeleting(null)}
        title={deleting ? `Delete ${deleting.name}?` : 'Delete student?'}
        footer={
          <div className="flex flex-wrap justify-end gap-2">
            <Button variant="secondary" onClick={() => setDeleting(null)}>
              Cancel
            </Button>
            <Button variant="danger" onClick={confirmDelete}>
              Delete student
            </Button>
          </div>
        }
      >
        <p className="text-ink-2">
          This also deletes {deletingMarks} attendance {deletingMarks === 1 ? 'mark' : 'marks'} for
          this student. In this demo, Reset brings the sample class back.
        </p>
      </Dialog>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Mark attendance
// ---------------------------------------------------------------------------

type Draft = Record<string, AttendanceStatus>;

const STATUS_STYLES: Record<AttendanceStatus, string> = {
  present: 'bg-violet-soft text-violet',
  late: 'bg-warn-soft text-ink',
  absent: 'bg-danger-soft text-danger',
};

function MarkScreen({ state, update, selectFeature, highlight }: Props) {
  const today = todayKey();
  const [date, setDate] = useState(today);
  const [dateInput, setDateInput] = useState(today);
  const [classFilter, setClassFilter] = useState('all');
  const [draft, setDraft] = useState<Draft>(() => ({ ...(state.attendance[today] ?? {}) }));
  const [pendingDate, setPendingDate] = useState<string | null>(null);
  const groupName = useId();

  const saved = state.attendance[date] ?? {};
  const classes = classNames(state.students);
  const shownClass = classes.includes(classFilter) ? classFilter : 'all';
  const visible = sortStudents(state.students).filter(
    (student) => shownClass === 'all' || student.className === shownClass,
  );
  const changed = visible.filter((student) => draft[student.id] !== saved[student.id]);
  const markedCount = visible.filter((student) => draft[student.id]).length;
  // The same rules as the template's MarkAttendanceView.
  const dateError = !isValidDateKey(dateInput)
    ? 'Enter a valid date.'
    : dateInput > today
      ? 'Attendance can’t be marked for a future date.'
      : undefined;

  function switchDate(next: string) {
    setDate(next);
    setDraft({ ...(state.attendance[next] ?? {}) });
  }

  function requestDate(next: string) {
    setDateInput(next);
    if (!isValidDateKey(next) || next > today || next === date) return;
    if (changed.length > 0) setPendingDate(next);
    else switchDate(next);
  }

  function markAllPresent() {
    setDraft((current) => {
      const next = { ...current };
      for (const student of visible) next[student.id] = 'present';
      return next;
    });
  }

  function save() {
    const marks: Draft = {};
    for (const student of visible) {
      const status = draft[student.id];
      if (status) marks[student.id] = status;
    }
    update(
      (current) => attendanceReducer(current, { type: 'attendance/save', date, marks }),
      `Attendance saved for ${formatDateKey(date)}.`,
    );
  }

  if (state.students.length === 0) {
    return (
      <EmptyState
        icon={<Users aria-hidden="true" className="size-6" />}
        title="Add students before marking attendance"
        actions={
          <Button size="sm" onClick={() => selectFeature('students')}>
            Go to Students
          </Button>
        }
      >
        Attendance is marked for the students in your roster.
      </EmptyState>
    );
  }

  return (
    <div className="space-y-5">
      <ScreenHeading
        title="Mark attendance"
        description="Set each student’s status for the date, then save. Saved marks for a date can be changed later."
      />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[11rem_12rem_minmax(0,1fr)] lg:items-end">
        <TextField
          type="date"
          label="Date"
          value={dateInput}
          max={today}
          error={dateError}
          onChange={(event) => requestDate(event.target.value)}
        />
        <SelectField
          label="Class"
          value={shownClass}
          onChange={(event) => setClassFilter(event.target.value)}
        >
          <option value="all">All classes</option>
          {classes.map((name) => (
            <option key={name} value={name}>
              {name}
            </option>
          ))}
        </SelectField>
        <div className="flex flex-wrap gap-2 sm:col-span-2 lg:col-span-1 lg:justify-end">
          <Button variant="secondary" onClick={markAllPresent}>
            Mark all present
          </Button>
          <Button onClick={save} disabled={changed.length === 0}>
            Save attendance
          </Button>
        </div>
      </div>
      <p className="type-meta" role="status">
        {formatDateKey(date, 'long')}: {markedCount} of {visible.length} marked ·{' '}
        {changed.length === 0
          ? 'everything is saved'
          : `${changed.length} unsaved ${changed.length === 1 ? 'change' : 'changes'}`}
      </p>
      <ul
        className={cn(
          'divide-y divide-line overflow-hidden rounded-xl border border-line',
          highlightClasses(highlight === 'mark-list'),
        )}
      >
        {visible.map((student) => {
          const status = draft[student.id];
          const isChanged = status !== saved[student.id];
          return (
            <li
              key={student.id}
              className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 px-4 py-3"
            >
              <div className="min-w-0">
                <p className="font-semibold text-ink">
                  {student.name}
                  {isChanged ? (
                    <Badge tone="violet" className="ml-2 align-middle">
                      Not saved
                    </Badge>
                  ) : null}
                </p>
                <p className="type-meta">
                  {student.rollNumber} · {student.className}
                </p>
              </div>
              <fieldset>
                <legend className="sr-only">{student.name}</legend>
                <div className="inline-flex rounded-lg border border-control p-0.5">
                  {ATTENDANCE_STATUSES.map((option) => (
                    <label
                      key={option}
                      className={cn(
                        'cursor-pointer rounded-md px-2.5 py-1 text-sm font-semibold transition-colors',
                        'has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-1 has-[:focus-visible]:outline-focus',
                        status === option ? STATUS_STYLES[option] : 'text-ink-2 hover:bg-raised',
                      )}
                    >
                      <input
                        type="radio"
                        name={`${groupName}-${student.id}`}
                        value={option}
                        checked={status === option}
                        onChange={() =>
                          setDraft((current) => ({ ...current, [student.id]: option }))
                        }
                        className="sr-only"
                      />
                      {STATUS_LABELS[option]}
                    </label>
                  ))}
                </div>
              </fieldset>
            </li>
          );
        })}
      </ul>

      <Dialog
        open={pendingDate !== null}
        onClose={() => {
          setPendingDate(null);
          setDateInput(date);
        }}
        title="Discard unsaved marks?"
        footer={
          <div className="flex flex-wrap justify-end gap-2">
            <Button
              variant="secondary"
              onClick={() => {
                setPendingDate(null);
                setDateInput(date);
              }}
            >
              Keep editing
            </Button>
            <Button
              variant="danger"
              onClick={() => {
                if (pendingDate) switchDate(pendingDate);
                setPendingDate(null);
              }}
            >
              Discard and change date
            </Button>
          </div>
        }
      >
        <p className="text-ink-2">
          {formatDateKey(date)} has {changed.length} unsaved{' '}
          {changed.length === 1 ? 'change' : 'changes'}. Changing the date discards them.
        </p>
      </Dialog>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Summary
// ---------------------------------------------------------------------------

function SummaryScreen({ state, selectFeature, highlight }: Props) {
  const today = todayKey();
  if (state.students.length === 0) {
    return (
      <EmptyState
        icon={<Users aria-hidden="true" className="size-6" />}
        title="No students yet"
        actions={
          <Button size="sm" onClick={() => selectFeature('students')}>
            Go to Students
          </Button>
        }
      >
        The summary is calculated from the students and their saved marks.
      </EmptyState>
    );
  }

  const summaries = summarizeStudents(state.students, state.attendance, THRESHOLD);
  const overall = overallCounts(state.students, state.attendance);
  const overallPercentage = attendancePercentage(overall);
  const below = summaries
    .filter((summary) => summary.belowThreshold)
    .sort((a, b) => (a.percentage ?? 0) - (b.percentage ?? 0));
  const todayCounts = countsForDate(state.students, state.attendance, today);
  const days = recordedDates(state.attendance).length;
  const classes = summarizeClasses(state.students, state.attendance);
  const ordered = sortStudents(state.students).map(
    (student) => summaries.find((summary) => summary.student.id === student.id) ?? null,
  );

  return (
    <div className="space-y-6">
      <ScreenHeading
        title="Summary"
        description="Calculated from the saved marks each time this screen opens. Nothing here is stored."
      />
      <section aria-labelledby="today-heading" className="rounded-xl bg-raised px-4 py-3">
        <h3 id="today-heading" className="font-semibold text-ink">
          Today, {formatDateKey(today, 'long')}
        </h3>
        <p className="text-sm text-ink-2">
          {todayCounts.total === 0
            ? 'Attendance for today hasn’t been marked yet.'
            : `${todayCounts.present} present, ${todayCounts.late} late, ${todayCounts.absent} absent${
                todayCounts.unmarked > 0 ? `, ${todayCounts.unmarked} not marked` : ''
              }.`}
        </p>
      </section>
      <div className={highlightClasses(highlight === 'summary-figures')}>
        <StatGrid>
          <StatTile label="Students" value={state.students.length} />
          <StatTile label="School days recorded" value={days} />
          <StatTile
            label="Overall attendance"
            value={percentText(overallPercentage)}
            detail={`${overall.present + overall.late} of ${overall.total} marks`}
          />
          <StatTile
            label={`Below ${THRESHOLD}%`}
            value={below.length}
            tone={below.length > 0 ? 'attention' : 'default'}
          />
        </StatGrid>
      </div>
      <div className="grid gap-5 xl:grid-cols-2">
        <ChartCard
          title="Attendance by class"
          description="(present + late) ÷ marks, for every student in the class"
          summary={`Attendance by class: ${classes
            .map((item) => `${item.className} ${percentText(item.percentage)}`)
            .join(', ')}.`}
          table={
            <TableRegion label="Attendance by class">
              <table className={tableClasses}>
                <thead className={theadClasses}>
                  <tr>
                    <th scope="col" className={thClasses}>
                      Class
                    </th>
                    <th scope="col" className={cn(thClasses, 'text-right')}>
                      Students
                    </th>
                    <th scope="col" className={cn(thClasses, 'text-right')}>
                      Attended
                    </th>
                    <th scope="col" className={cn(thClasses, 'text-right')}>
                      Marks
                    </th>
                    <th scope="col" className={cn(thClasses, 'text-right')}>
                      Attendance
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line tabular-nums">
                  {classes.map((item) => (
                    <tr key={item.className}>
                      <th scope="row" className={cn(tdClasses, 'font-semibold text-ink')}>
                        {item.className}
                      </th>
                      <td className={cn(tdClasses, 'text-right')}>{item.studentCount}</td>
                      <td className={cn(tdClasses, 'text-right')}>{item.present + item.late}</td>
                      <td className={cn(tdClasses, 'text-right')}>{item.total}</td>
                      <td className={cn(tdClasses, 'text-right')}>
                        {percentText(item.percentage)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </TableRegion>
          }
        >
          <BarList
            max={100}
            data={classes.map((item) => ({
              id: item.className,
              label: item.className,
              value: item.percentage ?? 0,
              display: percentText(item.percentage),
              note: `${item.studentCount} students`,
            }))}
          />
        </ChartCard>
        <section aria-labelledby="below-heading" className="rounded-xl border border-line p-4">
          <h3 id="below-heading" className="text-[0.9375rem] font-semibold text-ink">
            Below the {THRESHOLD}% threshold
          </h3>
          {below.length === 0 ? (
            <p className="mt-2 text-sm text-ink-2">Every student is at or above {THRESHOLD}%.</p>
          ) : (
            <ul className="mt-3 divide-y divide-line">
              {below.map((summary) => (
                <li
                  key={summary.student.id}
                  className="flex items-center justify-between gap-3 py-2 text-sm"
                >
                  <span className="min-w-0">
                    <span className="font-semibold text-ink">{summary.student.name}</span>
                    <span className="type-meta block">{summary.student.className}</span>
                  </span>
                  <Percentage value={summary.percentage} />
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
      <section aria-labelledby="every-student-heading" className="space-y-3">
        <div>
          <h3 id="every-student-heading" className="font-semibold text-ink">
            Every student
          </h3>
          <p className="type-meta">Attendance = (present + late) ÷ days marked × 100</p>
        </div>
        <TableRegion label="Attendance for every student">
          <table className={cn(tableClasses, 'min-w-[34rem]')}>
            <thead className={theadClasses}>
              <tr>
                <th scope="col" className={thClasses}>
                  Student
                </th>
                {(['Present', 'Late', 'Absent', 'Days marked', 'Attendance'] as const).map(
                  (heading) => (
                    <th key={heading} scope="col" className={cn(thClasses, 'text-right')}>
                      {heading}
                    </th>
                  ),
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-line tabular-nums">
              {ordered.map((summary) =>
                summary ? (
                  <tr key={summary.student.id}>
                    <th scope="row" className={cn(tdClasses, 'font-semibold text-ink')}>
                      {summary.student.name}
                      <span className="type-meta block font-normal">
                        {summary.student.className}
                      </span>
                    </th>
                    <td className={cn(tdClasses, 'text-right')}>{summary.present}</td>
                    <td className={cn(tdClasses, 'text-right')}>{summary.late}</td>
                    <td className={cn(tdClasses, 'text-right')}>{summary.absent}</td>
                    <td className={cn(tdClasses, 'text-right')}>{summary.total}</td>
                    <td className={cn(tdClasses, 'text-right')}>
                      <Percentage value={summary.percentage} />
                    </td>
                  </tr>
                ) : null,
              )}
            </tbody>
          </table>
        </TableRegion>
      </section>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Data model
// ---------------------------------------------------------------------------

function DataScreen({ state, highlight }: Props) {
  const dates = recordedDates(state.attendance);
  const recent = [...dates.slice(0, 3)].reverse();
  const marks = Object.values(state.attendance).reduce(
    (sum, day) => sum + Object.keys(day).length,
    0,
  );
  return (
    <div className="space-y-5">
      <ScreenHeading
        title="Data model"
        description={
          <>
            The demo’s data, in the shape the template saves to localStorage under the key{' '}
            <code className="rounded bg-raised px-1 font-mono text-xs">{STORAGE_KEY}</code>.
          </>
        }
      />
      <StatGrid>
        <StatTile label="version" value={state.version} />
        <StatTile label="students" value={state.students.length} detail="objects in a list" />
        <StatTile label="attendance" value={dates.length} detail="dates with marks" />
        <StatTile label="marks" value={marks} detail="one status per student per date" />
      </StatGrid>
      <div className={cn('space-y-3', highlightClasses(highlight === 'data-json'))}>
        <h3 className="font-semibold text-ink">Attendance for the latest dates</h3>
        <p className="type-meta">
          Keyed by date (“YYYY-MM-DD”), then by student id. Showing {recent.length} of{' '}
          {dates.length} dates.
        </p>
        <JsonView
          value={Object.fromEntries(recent.map((date) => [date, state.attendance[date] ?? {}]))}
        />
      </div>
      <details className="group rounded-xl border border-line">
        <summary className="cursor-pointer rounded-xl px-4 py-3 text-sm font-semibold text-ink hover:bg-raised/60">
          The whole object ({state.students.length} students, {dates.length} dates)
        </summary>
        <div className="border-t border-line p-3">
          <JsonView value={state} />
        </div>
      </details>
    </div>
  );
}

// ---------------------------------------------------------------------------
// The demo
// ---------------------------------------------------------------------------

function AttendanceDemoView(props: Props) {
  switch (props.feature) {
    case 'mark':
      return <MarkScreen {...props} />;
    case 'summary':
      return <SummaryScreen {...props} />;
    case 'data':
      return <DataScreen {...props} />;
    default:
      return <StudentsScreen {...props} />;
  }
}

function changedDates(state: AttendanceData, start: AttendanceData): string[] {
  const dates = new Set([...Object.keys(state.attendance), ...Object.keys(start.attendance)]);
  return [...dates]
    .filter(
      (date) =>
        JSON.stringify(state.attendance[date] ?? {}) !==
        JSON.stringify(start.attendance[date] ?? {}),
    )
    .sort();
}

export const attendanceImplementation = defineDemo<AttendanceData>({
  createState: () => createDemoData(new Date()),
  createEmptyState: () => createEmptyData(),
  readState: (value) => {
    // The template's own check on saved data: anything malformed is rejected.
    const result = validateData(value);
    return typeof result === 'string' ? null : result;
  },
  View: AttendanceDemoView,
  checks: {
    'add-student': (state, start) => {
      const before = new Set(start.students.map((student) => student.id));
      const added = state.students.filter((student) => !before.has(student.id));
      return added.length > 0
        ? { done: true, detail: `Added ${added.map((student) => student.name).join(', ')}.` }
        : { done: false, detail: 'No new student in the list yet.' };
    },
    'mark-attendance': (state, start) => {
      const dates = changedDates(state, start);
      const latest = dates[dates.length - 1];
      return latest
        ? {
            done: true,
            detail: `Saved marks for ${formatDateKey(latest)} (${Object.keys(state.attendance[latest] ?? {}).length} students).`,
          }
        : { done: false, detail: 'No attendance has been saved since you started.' };
    },
    'data-model': (state, start) => {
      const dates = changedDates(state, start);
      return dates.length > 0 || state.students.length !== start.students.length
        ? { done: true, detail: 'Your changes are in the data, ready to point at.' }
        : { done: false, detail: 'Nothing has changed yet, so there is nothing new to find.' };
    },
  },
  describe: (state) =>
    `${state.students.length} students · ${recordedDates(state.attendance).length} school days with marks`,
});
