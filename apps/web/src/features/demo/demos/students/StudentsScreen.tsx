/**
 * The student pages: the list with its search, filters, sorting and pages (students/list.html),
 * one student's record with their courses (students/detail.html), the add and edit form and the
 * delete confirmation. Messages are the template's own flash messages.
 */
import { ArrowLeft, GraduationCap, Pencil, Trash2, UserPlus } from 'lucide-react';
import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';

import { Button } from '../../../../components/ui/Button.tsx';
import { Dialog } from '../../../../components/ui/Dialog.tsx';
import { EmptyState } from '../../../../components/ui/EmptyState.tsx';
import { SelectField, TextField } from '../../../../components/ui/Field.tsx';
import { cn } from '../../../../lib/cn.ts';
import {
  actionCellClasses,
  highlightClasses,
  rowHeaderClasses,
  ScreenHeading,
  TableRegion,
  tableClasses,
  tdClasses,
  theadClasses,
  thClasses,
} from '../../ui.tsx';
import {
  classNames,
  createStudent,
  DEFAULT_QUERY,
  deleteStudent,
  enroll,
  listStudents,
  SORT_LABELS,
  STATUSES,
  studentCourses,
  unenroll,
  updateStudent,
  type DuplicateError,
  type SmsState,
  type Student,
  type StudentQuery,
  type StudentValues,
} from './model.ts';
import {
  fullName,
  LastStatement,
  PER_PAGE,
  plural,
  rateLabel,
  STATUS_LABELS,
  StatusBadge,
  today,
  type Props,
} from './shared.tsx';
import { StudentForm, type Refusal } from './StudentForm.tsx';

/** Where focus goes when the list comes back: the student just left, or the result count. */
type ListFocus = { student: number } | 'count' | null;

/** A saved student's id, or the unique value the database refused. */
type Saved = { state: SmsState; id: number } | { state: SmsState; error: DuplicateError };

export function StudentsScreen({ state, update, highlight, selectFeature }: Props) {
  const [query, setQuery] = useState<StudentQuery>(DEFAULT_QUERY);
  const [openId, setOpenId] = useState<number | null>(null);
  const [listFocus, setListFocus] = useState<ListFocus>(null);
  const [form, setForm] = useState<{ key: number; student: Student | null } | null>(null);
  const [deleting, setDeleting] = useState<Student | null>(null);

  const open = state.students.find((student) => student.id === openId) ?? null;

  // The tour points at the list, so it closes an open record.
  const [shownHighlight, setShownHighlight] = useState(highlight);
  if (highlight !== shownHighlight) {
    setShownHighlight(highlight);
    if (highlight === 'student-filters' || highlight === 'add-student') setOpenId(null);
  }

  function save(values: StudentValues): Refusal | null {
    const editing = form?.student ?? null;
    const run = (current: SmsState): Saved => {
      if (!editing) return createStudent(current, values);
      const saved = updateStudent(current, editing.id, values);
      return 'error' in saved ? saved : { ...saved, id: editing.id };
    };
    const outcome = run(state);
    if ('error' in outcome) {
      // The refused statement goes into the log, as the database refuses it.
      update((current) => run(current).state, outcome.error.message);
      return { field: outcome.error.field, message: outcome.error.message };
    }
    update(
      (current) => run(current).state,
      editing ? 'Saved the changes.' : `Added ${fullName(values)}.`,
    );
    setForm(null);
    // Like the real app, both go on to the student's own page.
    setOpenId(outcome.id);
    return null;
  }

  function confirmDelete() {
    if (!deleting) return;
    const { id } = deleting;
    update(
      (current) => deleteStudent(current, id),
      `Deleted ${fullName(deleting)} and their attendance records.`,
    );
    setDeleting(null);
    setOpenId(null);
    setListFocus('count');
  }

  const deletingCourses = deleting ? studentCourses(state, deleting.id) : [];
  const deletingMarks = deletingCourses.reduce((sum, row) => sum + row.marked, 0);

  return (
    <div className="space-y-5">
      {open ? (
        <StudentRecord
          key={open.id}
          student={open}
          state={state}
          update={update}
          onBack={() => {
            setOpenId(null);
            setListFocus({ student: open.id });
          }}
          onEdit={() => setForm({ key: Date.now(), student: open })}
          onDelete={() => setDeleting(open)}
          onAddCourse={() => selectFeature('courses')}
        />
      ) : (
        <StudentList
          state={state}
          query={query}
          setQuery={setQuery}
          highlight={highlight}
          focus={listFocus}
          onFocused={() => setListFocus(null)}
          onOpen={setOpenId}
          onAdd={() => setForm({ key: Date.now(), student: null })}
        />
      )}

      <LastStatement state={state} />

      {form ? (
        <StudentForm
          key={form.key}
          student={form.student}
          classes={classNames(state)}
          onSubmit={save}
          onClose={() => setForm(null)}
        />
      ) : null}

      <Dialog
        open={deleting !== null}
        onClose={() => setDeleting(null)}
        title={deleting ? `Delete ${fullName(deleting)}?` : 'Delete student?'}
        confirmation
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
        {deleting ? (
          <div className="space-y-2 text-ink-2">
            <p>
              This permanently deletes the student ({deleting.roll_number}, {deleting.class_name}),
              their {plural(deletingCourses.length, 'enrollment', 'enrollments')} and{' '}
              {plural(deletingMarks, 'attendance mark', 'attendance marks')}: the foreign keys
              cascade the deletion.
            </p>
            <p className="text-sm">
              The real app suggests running{' '}
              <code className="font-mono text-xs">flask --app studentms backup-db</code> first. In
              this demo, Reset brings the sample data back.
            </p>
          </div>
        ) : null}
      </Dialog>
    </div>
  );
}

function StudentList({
  state,
  query,
  setQuery,
  highlight,
  focus,
  onFocused,
  onOpen,
  onAdd,
}: {
  state: SmsState;
  query: StudentQuery;
  setQuery: (query: StudentQuery) => void;
  highlight: string | null;
  focus: ListFocus;
  onFocused: () => void;
  onOpen: (id: number) => void;
  onAdd: () => void;
}) {
  const tableRef = useRef<HTMLDivElement>(null);
  const countRef = useRef<HTMLParagraphElement>(null);

  const first = listStudents(state, query, PER_PAGE);
  const pages = Math.max(1, Math.ceil(first.total / PER_PAGE));
  // Like the real view, a page past the end shows the last page.
  const page = Math.min(query.page, pages);
  const { rows, total } =
    page === query.page ? first : listStudents(state, { ...query, page }, PER_PAGE);
  const filtered = Boolean(query.search || query.className || query.status);
  const classes = classNames(state);

  useEffect(() => {
    if (focus === null) return;
    const button =
      typeof focus === 'object'
        ? tableRef.current?.querySelector<HTMLElement>(`[data-student="${focus.student}"]`)
        : null;
    (button ?? countRef.current)?.focus();
    onFocused();
  }, [focus, onFocused]);

  const change = (changes: Partial<StudentQuery>) => setQuery({ ...query, page: 1, ...changes });

  return (
    <>
      <ScreenHeading
        title="Students"
        description="The template’s student list: search, filters and sorting run as one SQL query, ten students to a page."
        actions={
          <span className={cn('inline-flex', highlightClasses(highlight === 'add-student'))}>
            <Button
              size="sm"
              icon={<UserPlus aria-hidden="true" className="size-4" />}
              onClick={onAdd}
            >
              Add a student
            </Button>
          </span>
        }
      />

      {state.students.length === 0 ? (
        <EmptyState
          icon={<GraduationCap aria-hidden="true" className="size-6" />}
          title="No students yet"
          actions={
            <Button size="sm" onClick={onAdd}>
              Add the first one
            </Button>
          }
        >
          Reset the demo to bring back the sample data.
        </EmptyState>
      ) : (
        <>
          {/* Sized by the demo frame, not the window: the frame shares the page with a side panel. */}
          <div
            role="search"
            aria-label="Find students"
            className={cn('@container', highlightClasses(highlight === 'student-filters'))}
          >
            <div className="grid gap-3 @md:grid-cols-2 @4xl:grid-cols-4">
              <TextField
                type="search"
                label="Search"
                placeholder="Name, roll number or email"
                value={query.search}
                maxLength={60}
                containerClassName="@md:col-span-2 @4xl:col-span-4"
                onChange={(event) => change({ search: event.target.value })}
              />
              <SelectField
                label="Class"
                value={query.className}
                onChange={(event) => change({ className: event.target.value })}
              >
                <option value="">All classes</option>
                {classes.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </SelectField>
              <SelectField
                label="Status"
                value={query.status}
                onChange={(event) => change({ status: event.target.value })}
              >
                <option value="">Any status</option>
                {STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {STATUS_LABELS[status]}
                  </option>
                ))}
              </SelectField>
              <SelectField
                label="Sort by"
                value={query.sort}
                onChange={(event) => change({ sort: event.target.value })}
              >
                {Object.entries(SORT_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </SelectField>
              <SelectField
                label="Order"
                value={query.descending ? 'desc' : 'asc'}
                onChange={(event) => change({ descending: event.target.value === 'desc' })}
              >
                <option value="asc">A to Z, oldest first</option>
                <option value="desc">Z to A, newest first</option>
              </SelectField>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2">
            <p ref={countRef} tabIndex={-1} role="status" className="type-meta outline-none">
              {total === 0
                ? 'No students match.'
                : `Showing ${(page - 1) * PER_PAGE + 1}–${(page - 1) * PER_PAGE + rows.length} of ${plural(total, 'student', 'students')}.`}
            </p>
            {filtered ? (
              <Button size="sm" variant="ghost" onClick={() => setQuery(DEFAULT_QUERY)}>
                Show all students
              </Button>
            ) : null}
          </div>

          {rows.length > 0 ? (
            <div ref={tableRef}>
              <TableRegion label="Students">
                <table className={tableClasses}>
                  <caption className="sr-only">
                    Students, page {page} of {pages}
                  </caption>
                  <thead className={theadClasses}>
                    <tr>
                      <th scope="col" className={thClasses}>
                        Name
                      </th>
                      <th scope="col" className={cn(thClasses, 'hidden sm:table-cell')}>
                        Roll number
                      </th>
                      <th scope="col" className={cn(thClasses, 'hidden md:table-cell')}>
                        Class
                      </th>
                      <th scope="col" className={thClasses}>
                        Status
                      </th>
                      <th scope="col" className={cn(thClasses, 'hidden text-right lg:table-cell')}>
                        Courses
                      </th>
                      <th scope="col" className={cn(thClasses, 'hidden lg:table-cell')}>
                        Admitted
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {rows.map((student) => (
                      <tr key={student.id}>
                        <th scope="row" className={rowHeaderClasses}>
                          <button
                            type="button"
                            data-student={student.id}
                            className="text-left font-semibold text-violet underline-offset-2 hover:underline"
                            onClick={() => onOpen(student.id)}
                          >
                            {fullName(student)}
                          </button>
                          <span className="type-meta block font-normal md:hidden">
                            <span className="whitespace-nowrap sm:hidden">
                              {student.roll_number} ·{' '}
                            </span>
                            <span className="whitespace-nowrap">{student.class_name}</span>
                          </span>
                        </th>
                        <td className={cn(tdClasses, 'hidden font-mono text-xs sm:table-cell')}>
                          {student.roll_number}
                        </td>
                        <td className={cn(tdClasses, 'hidden md:table-cell')}>
                          {student.class_name}
                        </td>
                        <td className={tdClasses}>
                          <StatusBadge status={student.status} />
                        </td>
                        <td className={cn(tdClasses, 'hidden text-right lg:table-cell')}>
                          {state.enrollments.filter((row) => row.student_id === student.id).length}
                        </td>
                        <td className={cn(tdClasses, 'hidden whitespace-nowrap lg:table-cell')}>
                          {student.admission_date}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </TableRegion>
            </div>
          ) : null}

          {pages > 1 ? (
            <nav aria-label="Pages of students">
              <ul className="flex flex-wrap gap-1.5">
                {Array.from({ length: pages }, (_, index) => index + 1).map((number) => (
                  <li key={number}>
                    <Button
                      size="sm"
                      variant={number === page ? 'primary' : 'secondary'}
                      aria-current={number === page ? 'page' : undefined}
                      aria-label={`Page ${number}`}
                      onClick={() => setQuery({ ...query, page: number })}
                    >
                      {number}
                    </Button>
                  </li>
                ))}
              </ul>
            </nav>
          ) : null}
        </>
      )}
    </>
  );
}

function StudentRecord({
  student,
  state,
  update,
  onBack,
  onEdit,
  onDelete,
  onAddCourse,
}: {
  student: Student;
  state: SmsState;
  update: Props['update'];
  onBack: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onAddCourse: () => void;
}) {
  const headingRef = useRef<HTMLHeadingElement>(null);
  const coursesRef = useRef<HTMLHeadingElement>(null);
  const focusCourses = useRef(false);
  const [courseId, setCourseId] = useState('');

  const courses = studentCourses(state, student.id);
  const details: Array<{ label: string; value: ReactNode }> = [
    { label: 'Roll number', value: student.roll_number },
    { label: 'Class', value: student.class_name },
    { label: 'Status', value: <StatusBadge status={student.status} /> },
    { label: 'Email', value: student.email ?? 'Not given' },
    { label: 'Admission date', value: student.admission_date },
    { label: 'Enrolled in', value: plural(courses.length, 'course', 'courses') },
  ];
  const available = state.courses
    .filter((course) => !courses.some((row) => row.course.id === course.id))
    .sort((a, b) => (a.code < b.code ? -1 : 1));
  const chosen = available.find((course) => String(course.id) === courseId) ?? available[0];

  useEffect(() => headingRef.current?.focus(), []);
  // A removed course takes its button with it, so focus goes to the courses heading.
  useLayoutEffect(() => {
    if (!focusCourses.current) return;
    focusCourses.current = false;
    coursesRef.current?.focus();
  });

  return (
    <>
      <Button
        size="sm"
        variant="ghost"
        icon={<ArrowLeft aria-hidden="true" className="size-4" />}
        onClick={onBack}
      >
        All students
      </Button>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h2 ref={headingRef} tabIndex={-1} className="type-h3 text-ink outline-none">
          {fullName(student)}
        </h2>
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            variant="secondary"
            icon={<Pencil aria-hidden="true" className="size-4" />}
            onClick={onEdit}
          >
            Edit
          </Button>
          <Button
            size="sm"
            variant="danger"
            icon={<Trash2 aria-hidden="true" className="size-4" />}
            onClick={onDelete}
          >
            Delete
          </Button>
        </div>
      </div>

      <dl className="grid gap-px overflow-hidden rounded-xl border border-line bg-line text-sm sm:grid-cols-2 lg:grid-cols-3">
        {details.map(({ label, value }) => (
          <div key={label} className="bg-surface px-4 py-3">
            <dt className="type-meta">{label}</dt>
            <dd className="mt-1 break-words text-ink">{value}</dd>
          </div>
        ))}
      </dl>

      <section aria-labelledby="sms-record-courses" className="space-y-3">
        <h3
          id="sms-record-courses"
          ref={coursesRef}
          tabIndex={-1}
          className="font-semibold text-ink outline-none"
        >
          Courses
        </h3>
        {courses.length > 0 ? (
          <TableRegion label="Courses table">
            <table className={tableClasses}>
              <thead className={theadClasses}>
                <tr>
                  <th scope="col" className={thClasses}>
                    Course
                  </th>
                  <th scope="col" className={cn(thClasses, 'text-right')}>
                    Credits
                  </th>
                  <th scope="col" className={thClasses}>
                    Attendance
                  </th>
                  <th scope="col" className={thClasses}>
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {courses.map(({ course, marked, attended }) => (
                  <tr key={course.id}>
                    <th scope="row" className={rowHeaderClasses}>
                      {course.code} <span className="font-normal text-ink-2">{course.title}</span>
                    </th>
                    <td className={cn(tdClasses, 'text-right')}>{course.credits}</td>
                    <td className={cn(tdClasses, 'whitespace-nowrap')}>
                      {rateLabel(attended, marked)}
                      {marked > 0 ? (
                        <span className="text-ink-3">
                          {' '}
                          ({attended} of {marked})
                        </span>
                      ) : null}
                    </td>
                    <td className={actionCellClasses}>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          focusCourses.current = true;
                          update(
                            (current) => unenroll(current, student.id, course.id),
                            'Removed from the course, with the attendance marks for it.',
                          );
                        }}
                      >
                        Remove from {course.code}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableRegion>
        ) : (
          <p className="text-sm text-ink-2">Not enrolled in any course yet.</p>
        )}

        {chosen ? (
          <div className="flex flex-wrap items-end gap-3">
            <SelectField
              label="Enroll in a course"
              value={String(chosen.id)}
              containerClassName="w-full sm:w-80"
              onChange={(event) => setCourseId(event.target.value)}
            >
              {available.map((course) => (
                <option key={course.id} value={course.id}>
                  {course.code} {course.title}
                </option>
              ))}
            </SelectField>
            <Button
              onClick={() =>
                update(
                  (current) => enroll(current, student.id, chosen.id, today()).state,
                  `Enrolled in ${chosen.code} ${chosen.title}.`,
                )
              }
            >
              Enroll
            </Button>
          </div>
        ) : state.courses.length === 0 ? (
          <p className="text-sm text-ink-2">
            There are no courses yet.{' '}
            <Button size="sm" variant="ghost" onClick={onAddCourse}>
              Add a course
            </Button>
          </p>
        ) : (
          <p className="text-sm text-ink-2">Enrolled in every course.</p>
        )}
      </section>
    </>
  );
}
