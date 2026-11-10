/**
 * A simulation of the Student Management System's database and rules, for the Demo Studio.
 *
 * The real template is a Flask app: Python on a server, with SQLite. A browser can run
 * neither, so this module reproduces what the template does, in TypeScript:
 *  - validation.py (validateStudent, validateCourse, validateAttendanceDate);
 *  - the sample data seed_db() in db.py creates;
 *  - the queries in repository.py (search, filters, sorting, pages, statistics), including
 *    SQLite's behaviour: LIKE ignores the case of ASCII letters only, COLLATE NOCASE sorts,
 *    AUTOINCREMENT never reuses an id, and ON DELETE CASCADE removes dependent rows.
 * model.test.ts checks these against results recorded from the real Python code
 * (sms.fixture.json). Each change also records the SQL statement the real app runs, simplified
 * from repository.py, for the demo's query log.
 */

export const STATUSES = ['active', 'inactive', 'graduated'] as const;
export type StudentStatus = (typeof STATUSES)[number];
export const ATTENDANCE_STATUSES = ['present', 'late', 'absent'] as const;
export type AttendanceStatus = (typeof ATTENDANCE_STATUSES)[number];

/** Rows, with the database's own column names. */
export interface Student {
  id: number;
  roll_number: string;
  first_name: string;
  last_name: string;
  email: string | null;
  class_name: string;
  admission_date: string;
  status: StudentStatus;
}

export interface Course {
  id: number;
  code: string;
  title: string;
  credits: number;
  description: string;
}

export interface Enrollment {
  student_id: number;
  course_id: number;
  enrolled_on: string;
}

export interface Mark {
  student_id: number;
  course_id: number;
  date: string;
  status: AttendanceStatus;
}

/** A statement the real app would run for a change, with its parameters. */
export interface SqlEntry {
  sql: string;
  /** The values for the ? placeholders; for executemany(), those of the first row. */
  parameters: Array<string | number | null>;
  /** For executemany(): how many rows of parameters the statement ran with. */
  rows?: number;
  /** What happened, e.g. "1 row inserted" or "refused: UNIQUE constraint failed". */
  result: string;
}

export interface SmsState {
  version: 1;
  students: Student[];
  courses: Course[];
  enrollments: Enrollment[];
  attendance: Mark[];
  /** The next ids AUTOINCREMENT hands out; a deleted row's id is never used again. */
  nextStudentId: number;
  nextCourseId: number;
  /** The most recent statements, newest first. */
  log: SqlEntry[];
}

export const LOG_LIMIT = 12;

// ---------------------------------------------------------------------------
// Text helpers that behave like Python and SQLite
// ---------------------------------------------------------------------------

/**
 * Python's whitespace, as str.split() with no argument splits on it: JavaScript's whitespace
 * without U+FEFF, plus U+001C to U+001F and U+0085.
 */
// eslint-disable-next-line no-control-regex -- Python counts U+001C to U+001F as whitespace
const PY_SPACE = /[\t\n\v\f\r\x1c-\x1f \x85\xa0\u1680\u2000-\u200a\u2028\u2029\u202f\u205f\u3000]+/;

/** `" ".join(text.split())`: trimmed, with inner runs of whitespace collapsed. */
function clean(form: Readonly<Record<string, string | undefined>>, key: string): string {
  return String(form[key] ?? '')
    .split(PY_SPACE)
    .filter(Boolean)
    .join(' ');
}

/** Python's len(): characters, not UTF-16 code units. */
function length(text: string): number {
  return [...text].length;
}

/** SQLite's NOCASE and LIKE fold only the ASCII letters A–Z. */
export function asciiLower(text: string): string {
  return text.replace(/[A-Z]/g, (letter) => letter.toLowerCase());
}

function compareText(a: string, b: string): number {
  // SQLite compares UTF-8 bytes, which orders like code points.
  const left = [...a].map((character) => character.codePointAt(0) ?? 0);
  const right = [...b].map((character) => character.codePointAt(0) ?? 0);
  for (let index = 0; index < Math.min(left.length, right.length); index += 1) {
    const difference = (left[index] ?? 0) - (right[index] ?? 0);
    if (difference !== 0) return difference;
  }
  return left.length - right.length;
}

/** repository.like_pattern(): the text anywhere, with % and _ matched literally. */
export function likePattern(text: string): string {
  return `%${text.replace(/\\/g, '\\\\').replace(/%/g, '\\%').replace(/_/g, '\\_')}%`;
}

/** Whether `value` contains `search`, as `value LIKE likePattern(search) ESCAPE '\'` decides. */
function likeContains(value: string | null, search: string): boolean {
  return value !== null && asciiLower(value).includes(asciiLower(search));
}

// ---------------------------------------------------------------------------
// Validation (validation.py)
// ---------------------------------------------------------------------------

export interface Result<Values> {
  values: Values;
  errors: Record<string, string>;
}

const ROLL_PATTERN = /^[A-Za-z0-9][A-Za-z0-9/-]{1,19}$/;
const EMAIL_PATTERN = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
const COURSE_CODE_PATTERN = /^[A-Za-z]{2,4}[0-9]{2,4}$/;

export function isoDay(day: Date): string {
  return `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, '0')}-${String(day.getDate()).padStart(2, '0')}`;
}

/** A real calendar date written as YYYY-MM-DD (date.fromisoformat), or null. */
export function parseDate(text: string): string | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(text);
  if (!match) return null;
  const [year, month, day] = [Number(match[1]), Number(match[2]), Number(match[3])];
  // Checked by hand, because new Date() reads the years 0 to 99 as 1900 to 1999.
  const leap = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  const days = [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][month - 1] ?? 0;
  return year >= 1 && day >= 1 && day <= days ? text : null;
}

/** validation.whole_number(): only the digits 0 to 9. */
export function wholeNumber(text: string): number | null {
  return /^[0-9]{1,9}$/.test(text) ? Number(text) : null;
}

export type StudentValues = Omit<Student, 'id'>;

export function validateStudent(
  form: Readonly<Record<string, string | undefined>>,
  today: string,
): Result<StudentValues> {
  const errors: Record<string, string> = {};
  const roll = clean(form, 'roll_number').toUpperCase();
  if (!roll) errors.roll_number = 'Enter a roll number.';
  else if (!ROLL_PATTERN.test(roll))
    errors.roll_number = 'Use 2 to 20 letters, digits, / or -, for example 24CS001.';
  const names: Record<'first_name' | 'last_name', string> = { first_name: '', last_name: '' };
  for (const [key, label] of [
    ['first_name', 'first name'],
    ['last_name', 'last name'],
  ] as const) {
    const value = clean(form, key);
    if (!value) errors[key] = `Enter the ${label}.`;
    else if (length(value) > 50) errors[key] = `Keep the ${label} to 50 characters.`;
    names[key] = value;
  }
  const email = clean(form, 'email').toLowerCase();
  if (email && (length(email) > 120 || !EMAIL_PATTERN.test(email)))
    errors.email = 'Enter an email address like name@example.edu, or leave it empty.';
  const className = clean(form, 'class_name');
  if (!className) errors.class_name = 'Enter the class or section, for example BCA 1-A.';
  else if (length(className) > 30) errors.class_name = 'Keep the class to 30 characters.';
  const admittedText = clean(form, 'admission_date');
  const admitted = parseDate(admittedText);
  if (admitted === null) errors.admission_date = 'Enter the admission date as YYYY-MM-DD.';
  else if (admitted > today) errors.admission_date = 'The admission date can’t be in the future.';
  const status = clean(form, 'status') || 'active';
  if (!(STATUSES as readonly string[]).includes(status))
    errors.status = 'Choose active, inactive or graduated.';
  return {
    values: {
      ...names,
      roll_number: roll,
      email: email || null,
      class_name: className,
      admission_date: admittedText,
      status: status as StudentStatus,
    },
    errors,
  };
}

export interface CourseValues {
  code: string;
  title: string;
  credits: number | null;
  description: string;
}

export function validateCourse(
  form: Readonly<Record<string, string | undefined>>,
): Result<CourseValues> {
  const errors: Record<string, string> = {};
  const code = clean(form, 'code').toUpperCase();
  if (!COURSE_CODE_PATTERN.test(code))
    errors.code = 'Use 2 to 4 letters and 2 to 4 digits, for example CS101.';
  const title = clean(form, 'title');
  if (!title) errors.title = 'Enter the course title.';
  else if (length(title) > 80) errors.title = 'Keep the title to 80 characters.';
  const credits = wholeNumber(clean(form, 'credits'));
  if (credits === null || credits < 1 || credits > 10)
    errors.credits = 'Enter a whole number of credits from 1 to 10.';
  const description = String(form.description ?? '').trim();
  if (length(description) > 500) errors.description = 'Keep the description to 500 characters.';
  return { values: { code, title, credits, description }, errors };
}

/** The day to mark attendance for, or an error message. */
export function validateAttendanceDate(
  text: string,
  today: string,
): { day: string } | { error: string } {
  const day = parseDate(text.trim());
  if (day === null) return { error: 'Choose a date as YYYY-MM-DD.' };
  if (day > today) return { error: 'Attendance can’t be marked for a future date.' };
  return { day };
}

// ---------------------------------------------------------------------------
// Sample data (db.seed_db)
// ---------------------------------------------------------------------------

const SAMPLE_COURSES: ReadonlyArray<readonly [string, string, number, string]> = [
  [
    'CS101',
    'Introduction to Programming',
    4,
    'Variables, control flow, functions and debugging in Python.',
  ],
  ['MA102', 'Discrete Mathematics', 3, 'Sets, logic, relations, counting and graphs.'],
  ['EN103', 'Technical Communication', 2, 'Writing reports, presenting and documenting software.'],
  ['CS201', 'Database Systems', 4, 'Relational design, SQL, normalisation and transactions.'],
];

const SAMPLE_STUDENTS: ReadonlyArray<
  readonly [string, string, string, string | null, string, StudentStatus]
> = [
  ['24CS001', 'Aarav', 'Sharma', 'aarav.sharma@example.edu', 'BCA 1-A', 'active'],
  ['24CS002', 'Diya', 'Patel', 'diya.patel@example.edu', 'BCA 1-A', 'active'],
  ['24CS003', 'Kabir', 'Singh', null, 'BCA 1-A', 'active'],
  ['24CS004', 'Meera', 'Iyer', 'meera.iyer@example.edu', 'BCA 1-A', 'active'],
  ['24CS005', 'Rohan', 'Das', 'rohan.das@example.edu', 'BCA 1-B', 'active'],
  ['24CS006', 'Sara', 'Thomas', 'sara.thomas@example.edu', 'BCA 1-B', 'active'],
  ['24CS007', 'Arjun', 'Nair', null, 'BCA 1-B', 'inactive'],
  ['24CS008', 'Ananya', 'Gupta', 'ananya.gupta@example.edu', 'BCA 1-B', 'active'],
  ['23CS011', 'Vikram', 'Rao', 'vikram.rao@example.edu', 'BCA 2-A', 'active'],
  ['23CS012', 'Zoya', 'Khan', 'zoya.khan@example.edu', 'BCA 2-A', 'active'],
  ['23CS013', 'Ishaan', 'Verma', null, 'BCA 2-A', 'active'],
  ['22CS021', 'Priya', 'Menon', 'priya.menon@example.edu', 'BCA 3-A', 'graduated'],
];

function addDays(day: string, days: number): string {
  const [year, month, date] = day.split('-').map(Number) as [number, number, number];
  return isoDay(new Date(year, month - 1, date + days));
}

function weekday(day: string): number {
  const [year, month, date] = day.split('-').map(Number) as [number, number, number];
  // Python's weekday(): Monday is 0, Sunday is 6.
  return (new Date(year, month - 1, date).getDay() + 6) % 7;
}

/** The database a new install of the template starts with: what seed_db() adds for `today`. */
export function createSampleData(today: string): SmsState {
  const courses: Course[] = SAMPLE_COURSES.map(([code, title, credits, description], index) => ({
    id: index + 1,
    code,
    title,
    credits,
    description,
  }));
  const students: Student[] = SAMPLE_STUDENTS.map(
    ([roll, first, last, email, className, status], index) => ({
      id: index + 1,
      roll_number: roll,
      first_name: first,
      last_name: last,
      email,
      class_name: className,
      // The roll number starts with the year of admission: 24CS001 joined in July 2024.
      admission_date: `20${roll.slice(0, 2)}-07-15`,
      status,
    }),
  );
  const termStart = addDays(today, -30);
  const enrollments: Enrollment[] = [];
  for (const student of students) {
    for (const course of courses) {
      const firstYear = student.class_name.startsWith('BCA 1');
      if (course.code === 'CS201' && firstYear) continue;
      if (course.code === 'CS101' && !firstYear) continue;
      enrollments.push({ student_id: student.id, course_id: course.id, enrolled_on: termStart });
    }
  }
  const schoolDays = Array.from({ length: 14 }, (_, offset) => addDays(today, -(offset + 1)))
    .filter((day) => weekday(day) < 5)
    .slice(0, 10);
  const active = new Set(
    students.filter((student) => student.status === 'active').map((student) => student.id),
  );
  const attendance: Mark[] = [];
  schoolDays.forEach((day, dayIndex) => {
    for (const row of enrollments) {
      if (!active.has(row.student_id)) continue;
      const pattern = (row.student_id * 7 + row.course_id * 3 + dayIndex) % 13;
      const status: AttendanceStatus =
        pattern === 0 ? 'absent' : pattern === 1 ? 'late' : 'present';
      attendance.push({ student_id: row.student_id, course_id: row.course_id, date: day, status });
    }
  });
  return {
    version: 1,
    students,
    courses,
    enrollments,
    attendance,
    nextStudentId: students.length + 1,
    nextCourseId: courses.length + 1,
    log: [],
  };
}

export function createEmptyData(): SmsState {
  return {
    version: 1,
    students: [],
    courses: [],
    enrollments: [],
    attendance: [],
    nextStudentId: 1,
    nextCourseId: 1,
    log: [],
  };
}

// ---------------------------------------------------------------------------
// Queries (repository.py)
// ---------------------------------------------------------------------------

export const SORT_LABELS = {
  name: 'Name',
  roll: 'Roll number',
  class: 'Class',
  admitted: 'Admission date',
} as const;
export type SortKey = keyof typeof SORT_LABELS;

export interface StudentQuery {
  search: string;
  className: string;
  status: string;
  sort: string;
  descending: boolean;
  page: number;
}

export const DEFAULT_QUERY: StudentQuery = {
  search: '',
  className: '',
  status: '',
  sort: 'name',
  descending: false,
  page: 1,
};

/** The ORDER BY columns SORT_COLUMNS allows, as values to compare (NOCASE where the SQL says so). */
const SORT_COLUMNS: Record<SortKey, Array<(student: Student) => string>> = {
  name: [(s) => asciiLower(s.last_name), (s) => asciiLower(s.first_name)],
  roll: [(s) => asciiLower(s.roll_number)],
  class: [(s) => asciiLower(s.class_name), (s) => asciiLower(s.last_name)],
  admitted: [(s) => s.admission_date, (s) => s.roll_number],
};

export function listStudents(
  state: SmsState,
  query: StudentQuery,
  perPage: number,
): { rows: Student[]; total: number } {
  const matching = state.students.filter(
    (student) =>
      (!query.search ||
        likeContains(`${student.first_name} ${student.last_name}`, query.search) ||
        likeContains(student.roll_number, query.search) ||
        likeContains(student.email, query.search)) &&
      (!query.className || student.class_name === query.className) &&
      (!query.status || student.status === query.status),
  );
  const columns = SORT_COLUMNS[query.sort as SortKey] ?? SORT_COLUMNS.name;
  const direction = query.descending ? -1 : 1;
  const sorted = [...matching].sort((a, b) => {
    for (const column of columns) {
      const difference = compareText(column(a), column(b));
      if (difference !== 0) return difference * direction;
    }
    // Ties keep the table's order, as SQLite's sort does with rows read by id.
    return a.id - b.id;
  });
  const page = Math.max(1, query.page);
  return { rows: sorted.slice((page - 1) * perPage, page * perPage), total: matching.length };
}

export function classNames(state: SmsState): string[] {
  return [...new Set(state.students.map((student) => student.class_name))].sort(compareText);
}

/** Present and late both count as attending. */
export function attended(marks: readonly Mark[]): number {
  return marks.filter((mark) => mark.status === 'present' || mark.status === 'late').length;
}

/**
 * repository.percent(): round(100 * part / whole, 1), or null when nothing was marked. Python
 * rounds the float's exact value and takes a tie to the even digit (13 of 16 is 81.25, shown
 * as 81.2), where Math.round would go up. A float is a tie at one decimal place only when four
 * times it is an odd whole number, as with 81.25 or 18.75.
 */
export function percent(part: number, whole: number): number | null {
  if (!whole) return null;
  const value = (100 * part) / whole;
  const quarters = value * 4;
  if (Number.isInteger(quarters) && quarters % 2 !== 0) {
    const tenths = Math.floor(value * 10);
    return (tenths % 2 === 0 ? tenths : tenths + 1) / 10;
  }
  return Number(value.toFixed(1));
}

export interface Statistics {
  students: number;
  by_status: Record<StudentStatus, number>;
  courses: number;
  enrollments: number;
  attendance_rate: number | null;
  marks_last_30_days: number;
  by_class: Array<{ class_name: string; count: number }>;
  by_course: Array<{
    id: number;
    code: string;
    title: string;
    students: number;
    marked: number;
    attended: number;
  }>;
  newest: Array<
    Pick<
      Student,
      'id' | 'roll_number' | 'first_name' | 'last_name' | 'class_name' | 'admission_date'
    >
  >;
}

export function statistics(state: SmsState, today: string): Statistics {
  const since = addDays(today, -30);
  const recent = state.attendance.filter((mark) => mark.date >= since);
  const byStatus = { active: 0, inactive: 0, graduated: 0 };
  for (const student of state.students) byStatus[student.status] += 1;
  return {
    students: state.students.length,
    by_status: byStatus,
    courses: state.courses.length,
    enrollments: state.enrollments.length,
    attendance_rate: percent(attended(recent), recent.length),
    marks_last_30_days: recent.length,
    by_class: classNames(state).map((name) => ({
      class_name: name,
      count: state.students.filter((student) => student.class_name === name).length,
    })),
    by_course: [...state.courses]
      .sort((a, b) => compareText(a.code, b.code))
      .map((course) => {
        const enrolled = new Set(
          state.enrollments
            .filter((row) => row.course_id === course.id)
            .map((row) => row.student_id),
        );
        const marks = state.attendance.filter(
          (mark) => mark.course_id === course.id && enrolled.has(mark.student_id),
        );
        return {
          id: course.id,
          code: course.code,
          title: course.title,
          students: enrolled.size,
          marked: marks.length,
          attended: attended(marks),
        };
      }),
    newest: [...state.students]
      .sort((a, b) => compareText(b.admission_date, a.admission_date) || b.id - a.id)
      .slice(0, 5)
      .map(({ id, roll_number, first_name, last_name, class_name, admission_date }) => ({
        id,
        roll_number,
        first_name,
        last_name,
        class_name,
        admission_date,
      })),
  };
}

/** The student's courses, each with their attendance (student_courses). */
export function studentCourses(state: SmsState, studentId: number) {
  return state.enrollments
    .filter((row) => row.student_id === studentId)
    .map((row) => {
      const course = state.courses.find((item) => item.id === row.course_id);
      const marks = state.attendance.filter(
        (mark) => mark.student_id === studentId && mark.course_id === row.course_id,
      );
      return { course: course as Course, marked: marks.length, attended: attended(marks) };
    })
    .sort((a, b) => compareText(a.course.code, b.course.code));
}

/** Every active student taking the course, with their mark for `day` (attendance_sheet). */
export function attendanceSheet(state: SmsState, courseId: number, day: string) {
  const enrolled = new Set(
    state.enrollments.filter((row) => row.course_id === courseId).map((row) => row.student_id),
  );
  return state.students
    .filter((student) => enrolled.has(student.id) && student.status === 'active')
    .sort(
      (a, b) => compareText(a.last_name, b.last_name) || compareText(a.first_name, b.first_name),
    )
    .map((student) => ({
      student,
      status:
        state.attendance.find(
          (mark) =>
            mark.student_id === student.id && mark.course_id === courseId && mark.date === day,
        )?.status ?? null,
    }));
}

// ---------------------------------------------------------------------------
// Changes, each with the SQL the real app runs
// ---------------------------------------------------------------------------

function logged(state: SmsState, entry: SqlEntry): SmsState {
  return { ...state, log: [entry, ...state.log].slice(0, LOG_LIMIT) };
}

/** A unique value already in use, as SQLite reports it and the app explains it. */
export class DuplicateError extends Error {
  constructor(
    readonly field: string,
    message: string,
  ) {
    super(message);
  }
}

const INSERT_STUDENT =
  'INSERT INTO students (roll_number, first_name, last_name, email, class_name, admission_date, status) VALUES (?, ?, ?, ?, ?, ?, ?)';

function studentParameters(values: StudentValues): Array<string | null> {
  return [
    values.roll_number,
    values.first_name,
    values.last_name,
    values.email,
    values.class_name,
    values.admission_date,
    values.status,
  ];
}

/** The UNIQUE COLLATE NOCASE checks on roll_number and email, ignoring the row being edited. */
function duplicate(
  state: SmsState,
  values: StudentValues,
  exceptId: number | null,
): DuplicateError | null {
  const others = state.students.filter((student) => student.id !== exceptId);
  if (others.some((student) => asciiLower(student.roll_number) === asciiLower(values.roll_number)))
    return new DuplicateError('roll_number', 'Another student already has this roll number.');
  if (
    values.email !== null &&
    others.some(
      (student) =>
        student.email !== null && asciiLower(student.email) === asciiLower(values.email ?? ''),
    )
  )
    return new DuplicateError('email', 'Another student already has this email address.');
  return null;
}

/** create_student(): the new state, or the duplicate the database refused (also logged). */
export function createStudent(
  state: SmsState,
  values: StudentValues,
): { state: SmsState; id: number } | { state: SmsState; error: DuplicateError } {
  const error = duplicate(state, values, null);
  if (error) {
    const column = error.field;
    return {
      state: logged(state, {
        sql: INSERT_STUDENT,
        parameters: studentParameters(values),
        result: `refused: UNIQUE constraint failed: students.${column}`,
      }),
      error,
    };
  }
  const id = state.nextStudentId;
  return {
    id,
    state: logged(
      {
        ...state,
        students: [...state.students, { id, ...values }],
        nextStudentId: id + 1,
      },
      {
        sql: INSERT_STUDENT,
        parameters: studentParameters(values),
        result: `1 row inserted, id ${id}`,
      },
    ),
  };
}

const UPDATE_STUDENT =
  "UPDATE students SET roll_number = ?, first_name = ?, last_name = ?, email = ?, class_name = ?, admission_date = ?, status = ?, updated_at = datetime('now') WHERE id = ?";

export function updateStudent(
  state: SmsState,
  id: number,
  values: StudentValues,
): { state: SmsState } | { state: SmsState; error: DuplicateError } {
  const error = duplicate(state, values, id);
  const parameters = [...studentParameters(values), id];
  if (error)
    return {
      state: logged(state, {
        sql: UPDATE_STUDENT,
        parameters,
        result: `refused: UNIQUE constraint failed: students.${error.field}`,
      }),
      error,
    };
  return {
    state: logged(
      {
        ...state,
        students: state.students.map((student) =>
          student.id === id ? { id, ...values } : student,
        ),
      },
      { sql: UPDATE_STUDENT, parameters, result: '1 row updated' },
    ),
  };
}

/** delete_student(): ON DELETE CASCADE also removes the enrollments and their attendance. */
export function deleteStudent(state: SmsState, id: number): SmsState {
  const enrollments = state.enrollments.filter((row) => row.student_id === id).length;
  const marks = state.attendance.filter((mark) => mark.student_id === id).length;
  return logged(
    {
      ...state,
      students: state.students.filter((student) => student.id !== id),
      enrollments: state.enrollments.filter((row) => row.student_id !== id),
      attendance: state.attendance.filter((mark) => mark.student_id !== id),
    },
    {
      sql: 'DELETE FROM students WHERE id = ?',
      parameters: [id],
      result: `1 row deleted; ON DELETE CASCADE removed ${enrollments} enrollments and ${marks} attendance marks`,
    },
  );
}

const INSERT_ENROLLMENT =
  'INSERT INTO enrollments (student_id, course_id, enrolled_on) VALUES (?, ?, ?)';

/** enroll(): false when the student already takes the course. */
export function enroll(
  state: SmsState,
  studentId: number,
  courseId: number,
  today: string,
): { state: SmsState; added: boolean } {
  const exists = state.enrollments.some(
    (row) => row.student_id === studentId && row.course_id === courseId,
  );
  const parameters = [studentId, courseId, today];
  if (exists)
    return {
      added: false,
      state: logged(state, {
        sql: INSERT_ENROLLMENT,
        parameters,
        result: 'refused: UNIQUE constraint failed: enrollments.student_id, enrollments.course_id',
      }),
    };
  return {
    added: true,
    state: logged(
      {
        ...state,
        enrollments: [
          ...state.enrollments,
          { student_id: studentId, course_id: courseId, enrolled_on: today },
        ],
      },
      { sql: INSERT_ENROLLMENT, parameters, result: '1 row inserted' },
    ),
  };
}

/** unenroll(): the course's attendance for the student goes with the enrollment. */
export function unenroll(state: SmsState, studentId: number, courseId: number): SmsState {
  const marks = state.attendance.filter(
    (mark) => mark.student_id === studentId && mark.course_id === courseId,
  ).length;
  return logged(
    {
      ...state,
      enrollments: state.enrollments.filter(
        (row) => !(row.student_id === studentId && row.course_id === courseId),
      ),
      attendance: state.attendance.filter(
        (mark) => !(mark.student_id === studentId && mark.course_id === courseId),
      ),
    },
    {
      sql: 'DELETE FROM enrollments WHERE student_id = ? AND course_id = ?',
      parameters: [studentId, courseId],
      result: `1 row deleted; ON DELETE CASCADE removed ${marks} attendance marks`,
    },
  );
}

const INSERT_COURSE = 'INSERT INTO courses (code, title, credits, description) VALUES (?, ?, ?, ?)';

export function createCourse(
  state: SmsState,
  values: CourseValues & { credits: number },
): { state: SmsState; id: number } | { state: SmsState; error: DuplicateError } {
  const parameters = [values.code, values.title, values.credits, values.description];
  if (state.courses.some((course) => asciiLower(course.code) === asciiLower(values.code)))
    return {
      state: logged(state, {
        sql: INSERT_COURSE,
        parameters,
        result: 'refused: UNIQUE constraint failed: courses.code',
      }),
      error: new DuplicateError('code', 'Another course already has this code.'),
    };
  const id = state.nextCourseId;
  return {
    id,
    state: logged(
      { ...state, courses: [...state.courses, { id, ...values }], nextCourseId: id + 1 },
      { sql: INSERT_COURSE, parameters, result: `1 row inserted, id ${id}` },
    ),
  };
}

/**
 * save_attendance(): one mark per enrolled student for the day, inserting or replacing the
 * existing mark (an upsert). Students who don't take the course are skipped.
 */
export function saveAttendance(
  state: SmsState,
  courseId: number,
  day: string,
  marks: ReadonlyMap<number, AttendanceStatus>,
): { state: SmsState; saved: number } {
  const enrolled = new Set(
    state.enrollments.filter((row) => row.course_id === courseId).map((row) => row.student_id),
  );
  const rows = [...marks].filter(([studentId]) => enrolled.has(studentId));
  const replaced = new Set(rows.map(([studentId]) => studentId));
  const kept = state.attendance.filter(
    (mark) => !(mark.course_id === courseId && mark.date === day && replaced.has(mark.student_id)),
  );
  const updated = rows.filter(([studentId]) =>
    state.attendance.some(
      (mark) => mark.course_id === courseId && mark.date === day && mark.student_id === studentId,
    ),
  ).length;
  return {
    saved: rows.length,
    state: logged(
      {
        ...state,
        attendance: [
          ...kept,
          ...rows.map(([studentId, status]) => ({
            student_id: studentId,
            course_id: courseId,
            date: day,
            status,
          })),
        ],
      },
      {
        sql: 'INSERT INTO attendance (student_id, course_id, date, status) VALUES (?, ?, ?, ?) ON CONFLICT (student_id, course_id, date) DO UPDATE SET status = excluded.status',
        parameters: rows[0] ? [rows[0][0], courseId, day, rows[0][1]] : [],
        rows: rows.length,
        result: `${rows.length - updated} inserted, ${updated} updated`,
      },
    ),
  };
}

// ---------------------------------------------------------------------------
// Stored demo data
// ---------------------------------------------------------------------------

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

const isId = (value: unknown): value is number =>
  typeof value === 'number' && Number.isSafeInteger(value) && value > 0;
const isText = (value: unknown): value is string => typeof value === 'string';

/** Checks demo data read back from sessionStorage, the way the schema's constraints would. */
export function readState(value: unknown): SmsState | null {
  if (!isRecord(value) || value.version !== 1) return null;
  const { students, courses, enrollments, attendance, nextStudentId, nextCourseId, log } = value;
  if (![students, courses, enrollments, attendance, log].every(Array.isArray)) return null;
  if (!isId(nextStudentId) || !isId(nextCourseId)) return null;
  const studentOk = (row: unknown): row is Student =>
    isRecord(row) &&
    isId(row.id) &&
    row.id < nextStudentId &&
    [row.roll_number, row.first_name, row.last_name, row.class_name, row.admission_date].every(
      isText,
    ) &&
    (row.email === null || isText(row.email)) &&
    (STATUSES as readonly unknown[]).includes(row.status);
  const courseOk = (row: unknown): row is Course =>
    isRecord(row) &&
    isId(row.id) &&
    row.id < nextCourseId &&
    isText(row.code) &&
    isText(row.title) &&
    isText(row.description) &&
    typeof row.credits === 'number' &&
    Number.isInteger(row.credits) &&
    row.credits >= 1 &&
    row.credits <= 10;
  if (!(students as unknown[]).every(studentOk) || !(courses as unknown[]).every(courseOk))
    return null;
  const studentIds = new Set((students as Student[]).map((row) => row.id));
  const courseIds = new Set((courses as Course[]).map((row) => row.id));
  if (
    studentIds.size !== (students as unknown[]).length ||
    courseIds.size !== (courses as unknown[]).length
  )
    return null;
  const pairs = new Set<string>();
  for (const row of enrollments as unknown[]) {
    if (
      !isRecord(row) ||
      !studentIds.has(row.student_id as number) ||
      !courseIds.has(row.course_id as number) ||
      !isText(row.enrolled_on)
    )
      return null;
    const key = `${String(row.student_id)}:${String(row.course_id)}`;
    if (pairs.has(key)) return null;
    pairs.add(key);
  }
  const marks = new Set<string>();
  for (const row of attendance as unknown[]) {
    if (
      !isRecord(row) ||
      !pairs.has(`${String(row.student_id)}:${String(row.course_id)}`) ||
      parseDate(String(row.date)) === null ||
      !(ATTENDANCE_STATUSES as readonly unknown[]).includes(row.status)
    )
      return null;
    const key = `${String(row.student_id)}:${String(row.course_id)}:${String(row.date)}`;
    if (marks.has(key)) return null;
    marks.add(key);
  }
  const isParameter = (item: unknown) =>
    item === null || isText(item) || (typeof item === 'number' && Number.isFinite(item));
  const entries = (log as unknown[]).filter(
    (entry): entry is SqlEntry =>
      isRecord(entry) &&
      isText(entry.sql) &&
      isText(entry.result) &&
      Array.isArray(entry.parameters) &&
      entry.parameters.every(isParameter) &&
      (entry.rows === undefined ||
        (typeof entry.rows === 'number' && Number.isSafeInteger(entry.rows) && entry.rows >= 0)),
  );
  return {
    version: 1,
    students: students as Student[],
    courses: courses as Course[],
    enrollments: enrollments as Enrollment[],
    attendance: attendance as Mark[],
    nextStudentId,
    nextCourseId,
    log: entries.slice(0, LOG_LIMIT),
  };
}
