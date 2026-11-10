/**
 * The student management simulation in the Demo Studio: each screen behaves like the template's
 * pages, and the expected figures come from model.ts (which is checked against the Python code).
 */
import { screen, waitFor, within } from '@testing-library/react';
import userEvent, { type UserEvent } from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import { renderRoute } from '../../../../test/render.tsx';
import {
  attendanceSheet,
  createSampleData,
  createStudent,
  DEFAULT_QUERY,
  deleteStudent,
  enroll,
  isoDay,
  listStudents,
  saveAttendance,
  statistics,
  studentCourses,
} from './model.ts';
import { studentsImplementation } from './StudentsDemo.tsx';

const today = () => isoDay(new Date());

function frame() {
  return screen.getByRole('region', { name: 'Student Management System demo' });
}

/** Opens the demo at `path` and waits for its screens, which load on demand. */
async function openDemo(path: string) {
  renderRoute(`/projects/student-management-system/demo${path}`);
  await screen.findByRole('region', { name: 'Student Management System demo' });
}

/** The SQL panel under the screen, which shows the latest statement. */
function lastStatement() {
  const label = screen.getByText('The SQL the real app runs for the last change');
  const panel = label.parentElement;
  if (!panel) throw new Error('missing statement panel');
  return panel;
}

async function openAddForm(user: UserEvent) {
  await user.click(await within(frame()).findByRole('button', { name: 'Add a student' }));
  return screen.findByRole('dialog', { name: 'Add a student' });
}

async function type(user: UserEvent, dialog: HTMLElement, label: string, value: string) {
  const input = within(dialog).getByLabelText(label);
  await user.clear(input);
  await user.type(input, value);
}

describe('demo studio: student management simulation', () => {
  it('says it is a simulation that runs no Python, and starts from the template’s sample data', async () => {
    await openDemo('');
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Student Management System' }),
    ).toBeInTheDocument();
    expect(screen.getByText(/The browser runs no Python and no SQL\./)).toBeInTheDocument();
    const stats = statistics(createSampleData(today()), today());
    const tile = (label: string) =>
      within(frame()).getByText(label, { selector: 'dt' }).parentElement;
    expect(await within(frame()).findByText('Attendance, last 30 days')).toBeInTheDocument();
    expect(tile('Students')).toHaveTextContent(`${stats.students}${stats.by_status.active} active`);
    expect(tile('Attendance, last 30 days')).toHaveTextContent(
      `${stats.attendance_rate?.toFixed(1)}%${stats.marks_last_30_days} marks`,
    );
  });

  it('adds a student with the template’s validation, and the database refuses a duplicate', async () => {
    const user = userEvent.setup();
    await openDemo('?feature=students');
    const dialog = await openAddForm(user);
    await type(user, dialog, 'Roll number', '24cs001');
    await user.click(within(dialog).getByRole('button', { name: 'Add student' }));
    const first = within(dialog).getByLabelText('First name');
    expect(first).toHaveFocus();
    expect(first).toHaveAccessibleDescription('Enter the first name.');
    expect(within(dialog).getByLabelText('Class or section')).toHaveAccessibleDescription(
      'For example BCA 1-A. Enter the class or section, for example BCA 1-A.',
    );

    await type(user, dialog, 'First name', 'Kavya');
    await type(user, dialog, 'Last name', 'Rao');
    await type(user, dialog, 'Class or section', 'BCA 1-C');
    await user.click(within(dialog).getByRole('button', { name: 'Add student' }));
    const roll = within(dialog).getByLabelText('Roll number');
    expect(roll).toHaveFocus();
    expect(roll).toHaveAccessibleDescription(/Another student already has this roll number\.$/);
    expect(lastStatement()).toHaveTextContent(
      'refused: UNIQUE constraint failed: students.roll_number',
    );

    await type(user, dialog, 'Roll number', '25cs201');
    await user.click(within(dialog).getByRole('button', { name: 'Add student' }));
    const heading = await within(frame()).findByRole('heading', { level: 2, name: 'Kavya Rao' });
    await waitFor(() => expect(heading).toHaveFocus());
    expect(screen.getByText('Added Kavya Rao.')).toBeInTheDocument();
    expect(within(frame()).getByText('25CS201')).toBeInTheDocument();
    expect(lastStatement()).toHaveTextContent('1 row inserted, id 13');
  });

  it('enrolls a student and removes them from a course, showing the statements', async () => {
    const user = userEvent.setup();
    const start = createSampleData(today());
    // The first student on the list's first page.
    const student = listStudents(start, DEFAULT_QUERY, 10).rows[0];
    if (!student) throw new Error('no sample student');
    const taken = new Set(studentCourses(start, student.id).map((row) => row.course.id));
    const other = start.courses.find((course) => !taken.has(course.id));
    if (!other) throw new Error('the first student takes every course');

    await openDemo('?feature=students');
    const name = `${student.first_name} ${student.last_name}`;
    await user.click(await within(frame()).findByRole('button', { name }));
    await user.selectOptions(
      within(frame()).getByRole('combobox', { name: 'Enroll in a course' }),
      `${other.code} ${other.title}`,
    );
    await user.click(within(frame()).getByRole('button', { name: 'Enroll' }));
    expect(screen.getByText(`Enrolled in ${other.code} ${other.title}.`)).toBeInTheDocument();
    const courses = within(frame()).getByRole('region', { name: 'Courses table' });
    expect(
      within(courses).getByRole('rowheader', { name: new RegExp(other.code) }),
    ).toBeInTheDocument();
    expect(lastStatement()).toHaveTextContent(
      `INSERT INTO enrollments (student_id, course_id, enrolled_on) VALUES (?, ?, ?)parameters: (${student.id}, ${other.id}, '${today()}')1 row inserted`,
    );

    await user.click(within(courses).getByRole('button', { name: `Remove from ${other.code}` }));
    expect(within(frame()).getByRole('heading', { name: 'Courses', level: 3 })).toHaveFocus();
    expect(lastStatement()).toHaveTextContent(
      '1 row deleted; ON DELETE CASCADE removed 0 attendance marks',
    );
  });

  it('searches, filters and pages the list like list_students()', async () => {
    const user = userEvent.setup();
    const start = createSampleData(today());
    await openDemo('?feature=students');
    expect(await within(frame()).findByText('Showing 1–10 of 12 students.')).toBeInTheDocument();
    const pages = within(frame()).getByRole('navigation', { name: 'Pages of students' });
    await user.click(within(pages).getByRole('button', { name: 'Page 2' }));
    expect(within(frame()).getByText('Showing 11–12 of 12 students.')).toBeInTheDocument();
    expect(within(pages).getByRole('button', { name: 'Page 2' })).toHaveAttribute(
      'aria-current',
      'page',
    );

    await user.type(within(frame()).getByRole('searchbox', { name: 'Search' }), 'sharma');
    const { rows, total } = listStudents(start, { ...DEFAULT_QUERY, search: 'sharma' }, 10);
    expect(
      within(frame()).getByText(
        `Showing 1–${rows.length} of ${total} ${total === 1 ? 'student' : 'students'}.`,
      ),
    ).toBeInTheDocument();
    const table = within(frame()).getByRole('table');
    expect(
      within(table)
        .getAllByRole('rowheader')
        .map((cell) => cell.textContent),
    ).toEqual(
      rows.map((row) => expect.stringContaining(`${row.first_name} ${row.last_name}`) as unknown),
    );

    await user.selectOptions(
      within(frame()).getByRole('combobox', { name: 'Status' }),
      'Graduated',
    );
    await user.click(within(frame()).getByRole('button', { name: 'Show all students' }));
    expect(within(frame()).getByText('Showing 1–10 of 12 students.')).toBeInTheDocument();
  });

  it('deletes a student after a confirmation that says what the cascade removes', async () => {
    const user = userEvent.setup();
    const start = createSampleData(today());
    // The first student on the list's first page.
    const student = listStudents(start, DEFAULT_QUERY, 10).rows[0];
    if (!student) throw new Error('no sample student');
    const enrollments = start.enrollments.filter((row) => row.student_id === student.id).length;
    const marks = start.attendance.filter((mark) => mark.student_id === student.id).length;
    const name = `${student.first_name} ${student.last_name}`;

    await openDemo('?feature=students');
    await user.click(await within(frame()).findByRole('button', { name }));
    await user.click(within(frame()).getByRole('button', { name: 'Delete' }));
    const dialog = await screen.findByRole('alertdialog', { name: `Delete ${name}?` });
    expect(dialog).toHaveTextContent(
      `their ${enrollments} enrollments and ${marks} attendance marks`,
    );
    await user.click(within(dialog).getByRole('button', { name: 'Delete student' }));

    const count = await within(frame()).findByText('Showing 1–10 of 11 students.');
    await waitFor(() => expect(count).toHaveFocus());
    expect(screen.getByText(`Deleted ${name} and their attendance records.`)).toBeInTheDocument();
    expect(within(frame()).queryByRole('button', { name })).not.toBeInTheDocument();
    expect(lastStatement()).toHaveTextContent(
      `1 row deleted; ON DELETE CASCADE removed ${enrollments} enrollments and ${marks} attendance marks`,
    );
  });

  it('marks attendance with an upsert: inserted the first time, updated the second', async () => {
    const user = userEvent.setup();
    const start = createSampleData(today());
    const course = [...start.courses].sort((a, b) => (a.code < b.code ? -1 : 1))[0];
    if (!course) throw new Error('no sample course');
    const sheet = attendanceSheet(start, course.id, today());
    const first = sheet[0]?.student;
    if (!first) throw new Error('nobody takes the first course');
    const row = `${first.first_name} ${first.last_name} ${first.roll_number}`;

    await openDemo('?feature=attendance');
    expect(
      await within(frame()).findByRole('heading', { name: `Attendance for ${course.code}` }),
    ).toBeInTheDocument();
    await user.click(within(frame()).getByRole('radio', { name: `${row} Late` }));
    await user.click(within(frame()).getByRole('button', { name: 'Save attendance' }));
    expect(
      screen.getByText(new RegExp(`^Saved attendance for ${sheet.length} students on `)),
    ).toBeInTheDocument();
    expect(lastStatement()).toHaveTextContent(`${sheet.length} inserted, 0 updated`);
    expect(lastStatement()).toHaveTextContent(
      `executemany() with ${sheet.length} rows of parameters, the first (${first.id}, ${course.id}, '${today()}', 'late')`,
    );

    await user.click(within(frame()).getByRole('radio', { name: `${row} Present` }));
    expect(within(frame()).getByText('Not saved yet.')).toBeInTheDocument();
    await user.click(within(frame()).getByRole('button', { name: 'Save attendance' }));
    expect(lastStatement()).toHaveTextContent(`0 inserted, ${sheet.length} updated`);
    expect(
      within(frame()).getByText('Saved: these are the marks in the database.'),
    ).toBeInTheDocument();
  });

  it('refuses a future day, as validate_attendance_date() does', async () => {
    const user = userEvent.setup();
    await openDemo('?feature=attendance');
    const day = await within(frame()).findByLabelText('Day');
    await user.clear(day);
    await user.type(day, '2999-01-01');
    await user.click(within(frame()).getByRole('button', { name: 'Show' }));
    expect(day).toHaveAccessibleDescription('Attendance can’t be marked for a future date.');
  });

  it('shows the tables and the statement log on the Database screen', async () => {
    const user = userEvent.setup();
    const start = createSampleData(today());
    await openDemo('?feature=database');
    expect(await within(frame()).findByText(/^No statements yet\./)).toBeInTheDocument();
    expect(
      within(frame()).getByText(`${start.students.length} rows.`, { exact: false }),
    ).toBeInTheDocument();
    await user.selectOptions(
      within(frame()).getByRole('combobox', { name: 'Table' }),
      'attendance',
    );
    expect(
      within(frame()).getByText(`Showing 20 of ${start.attendance.length} rows, newest first.`),
    ).toBeInTheDocument();
    const table = within(frame()).getByRole('region', { name: 'The attendance table' });
    expect(
      within(table)
        .getAllByRole('columnheader')
        .map((cell) => cell.textContent),
    ).toEqual(['student_id', 'course_id', 'date', 'status']);
  });

  it('shows the empty app when started with no data', async () => {
    const user = userEvent.setup();
    await openDemo('');
    await user.click(await screen.findByRole('button', { name: 'Start with no data' }));
    expect(
      await within(frame()).findByRole('heading', { name: 'No data yet' }),
    ).toBeInTheDocument();
    await user.click(within(frame()).getByRole('button', { name: 'Add a course' }));
    expect(
      await within(frame()).findByRole('heading', { name: 'No courses yet' }),
    ).toBeInTheDocument();
  });
});

describe('the student management demo’s guided steps', () => {
  const TODAY = '2026-10-21';
  const start = createSampleData(TODAY);
  const values = {
    roll_number: '25CS201',
    first_name: 'Kavya',
    last_name: 'Rao',
    email: null,
    class_name: 'BCA 1-C',
    admission_date: '2025-07-15',
    status: 'active' as const,
  };

  it('sees each action in the data, and nothing before it is done', () => {
    const check = (id: string, state: typeof start) =>
      studentsImplementation.check(id, state, start);
    for (const id of ['add-student', 'enroll', 'mark-attendance', 'delete-student'])
      expect(check(id, start)?.done, id).toBe(false);

    const added = createStudent(start, values);
    if (!('id' in added)) throw new Error('not added');
    expect(check('add-student', added.state)).toEqual({
      done: true,
      detail: 'Added Kavya Rao (25CS201).',
    });
    expect(check('enroll', enroll(added.state, added.id, 1, TODAY).state)?.detail).toBe(
      'Enrolled Kavya Rao in CS101.',
    );
    const marked = saveAttendance(start, 1, TODAY, new Map([[1, 'late' as const]])).state;
    expect(check('mark-attendance', marked)?.detail).toBe(
      '1 mark saved or changed, the latest for CS101 on 2026-10-21.',
    );
    expect(check('delete-student', deleteStudent(start, 1))?.detail).toBe('Deleted Aarav Sharma.');
    expect(studentsImplementation.describe(start)).toBe(
      `12 students · 4 courses · ${start.attendance.length} attendance marks`,
    );
  });
});
