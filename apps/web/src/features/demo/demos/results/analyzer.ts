/**
 * A TypeScript port of the Student Result Analyzer's Python code, so its
 * analysis can run in the browser. Each function mirrors one in the template:
 *
 *   validateResults      analyzer/validation.py  validate_results
 *   subjectStatistics    analyzer/analysis.py    subject_statistics
 *   studentResults       analyzer/analysis.py    student_results
 *   gradeDistribution    analyzer/analysis.py    grade_distribution
 *   subjectGrades        analyzer/analysis.py    subject_grades
 *   missingSummary       analyzer/analysis.py    missing_summary
 *   studentsWithMissing  analyzer/analysis.py    students_with_missing
 *   classSummary         analyzer/analysis.py    class_summary
 *   overview             analyzer/analysis.py    overview
 *   gradeFor             analyzer/grading.py     grade_for
 *   explain*             analyzer/explain.py     explain_*
 *
 * Sums, means, standard deviations, quantiles and rounding follow numpy and
 * pandas exactly (pairwise summation, Kahan summation for grouped means,
 * linear quantile interpolation, rounding ties to even), and analyzer.test.ts
 * compares every result with output produced by the real Python code.
 */
import { readCsv } from './csv.ts';
import { formatFixed, formatGeneral, roundLikeNumpy } from './pyformat.ts';

export const MAX_FILE_BYTES = 5 * 1024 * 1024;
export const MAX_STUDENTS = 10_000;
const MAX_LISTED = 8;

const ID_ALIASES = new Set([
  'student_id',
  'id',
  'roll_no',
  'roll_number',
  'roll',
  'admission_no',
  'admission_number',
  'enrolment_no',
  'enrollment_no',
]);
const NAME_ALIASES = new Set(['name', 'student_name', 'full_name']);
const CLASS_ALIASES = new Set(['class', 'section', 'class_section']);
const ABSENT_MARKERS = new Set(['ab', 'abs', 'absent', '-', 'na', 'n/a']);

export const GRADE_ORDER = ['A+', 'A', 'B', 'C', 'D', 'F'] as const;
export type Grade = (typeof GRADE_ORDER)[number];
const FIXED_BANDS: ReadonlyArray<readonly [Grade, number]> = [
  ['A+', 90],
  ['A', 80],
  ['B', 70],
  ['C', 60],
];

export type Result = 'Pass' | 'Fail' | 'Incomplete';

/** One student after validation: scores aligned with the subject list, null when missing. */
export interface StudentRow {
  line: number;
  id: string;
  name: string;
  className?: string;
  scores: (number | null)[];
}

export interface Validation {
  ok: boolean;
  errors: string[];
  warnings: string[];
  subjects: string[];
  hasClass: boolean;
  rows: StudentRow[] | null;
}

// ---------------------------------------------------------------------------
// numpy and pandas arithmetic
// ---------------------------------------------------------------------------

/** numpy's pairwise summation of float64 values (np.sum and pandas' sum). */
export function pairwiseSum(values: readonly number[], start = 0, count = values.length): number {
  if (count < 8) {
    let result = 0;
    for (let index = 0; index < count; index += 1) result += values[start + index] ?? 0;
    return result;
  }
  if (count <= 128) {
    const partial = Array.from({ length: 8 }, (_, offset) => values[start + offset] ?? 0);
    let index = 8;
    for (; index < count - (count % 8); index += 8) {
      for (let offset = 0; offset < 8; offset += 1)
        partial[offset] = (partial[offset] ?? 0) + (values[start + index + offset] ?? 0);
    }
    const [a = 0, b = 0, c = 0, d = 0, e = 0, f = 0, g = 0, h = 0] = partial;
    let result = a + b + (c + d) + (e + f + (g + h));
    for (; index < count; index += 1) result += values[start + index] ?? 0;
    return result;
  }
  let half = Math.floor(count / 2);
  half -= half % 8;
  return pairwiseSum(values, start, half) + pairwiseSum(values, start + half, count - half);
}

/** pandas' Series.mean(): missing values count as 0 in the sum and are left out of the count. */
function nanMean(values: readonly (number | null)[]): number | null {
  const count = values.filter((value) => value !== null).length;
  if (count === 0) return null;
  return pairwiseSum(values.map((value) => value ?? 0)) / count;
}

/** numpy's add.reduceat over one group, as pandas 3 uses it: the first value plus a pairwise sum of the rest. */
function reduceatMean(values: readonly number[]): number {
  const [first = 0] = values;
  const sum = values.length === 1 ? first : first + pairwiseSum(values, 1, values.length - 1);
  return sum / values.length;
}

/** pandas' groupby mean, which adds with Kahan compensation. */
function kahanMean(values: readonly (number | null)[]): number | null {
  let sum = 0;
  let compensation = 0;
  let count = 0;
  for (const value of values) {
    if (value === null) continue;
    const corrected = value - compensation;
    const total = sum + corrected;
    compensation = total - sum - corrected;
    sum = total;
    count += 1;
  }
  return count === 0 ? null : sum / count;
}

function sortedNumbers(values: readonly number[]): number[] {
  return [...values].sort((a, b) => a - b);
}

function median(values: readonly number[]): number | null {
  const sorted = sortedNumbers(values);
  const count = sorted.length;
  if (count === 0) return null;
  const middle = Math.floor(count / 2);
  // numpy takes the mean of the middle value(s), adding from +0, so a zero median is never -0.
  return count % 2 === 1
    ? 0 + (sorted[middle] ?? 0)
    : (0 + (sorted[middle - 1] ?? 0) + (sorted[middle] ?? 0)) / 2;
}

/** numpy's linear interpolation between two neighbouring values. */
function lerp(a: number, b: number, t: number): number {
  const difference = b - a;
  return t >= 0.5 ? b - difference * (1 - t) : a + difference * t;
}

/** pandas' Series.quantile(q) with the default linear method. */
function quantile(values: readonly number[], q: number): number | null {
  const sorted = sortedNumbers(values);
  if (sorted.length === 0) return null;
  const position = (sorted.length - 1) * q;
  // At or past the last index, numpy uses the last value on both sides and measures the
  // weight from index -1 (so one value is returned exactly, a -0 included).
  if (position >= sorted.length - 1) {
    const last = sorted[sorted.length - 1] ?? 0;
    return lerp(last, last, position + 1);
  }
  const lower = Math.floor(position);
  return lerp(sorted[lower] ?? 0, sorted[lower + 1] ?? 0, position - lower);
}

/** pandas' Series.std(ddof=1). */
function standardDeviation(values: readonly number[]): number | null {
  if (values.length < 2) return null;
  const mean = pairwiseSum(values) / values.length;
  return Math.sqrt(pairwiseSum(values.map((value) => (mean - value) ** 2)) / (values.length - 1));
}

/** Python's default string ordering (by code point), used by pandas when sorting names. */
function compareText(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

// ---------------------------------------------------------------------------
// Validation (analyzer/validation.py)
// ---------------------------------------------------------------------------

/*
 * Python's whitespace: what str.strip() removes and the regular expression \s matches. It is
 * JavaScript's whitespace without U+FEFF, plus U+001C to U+001F and U+0085, so trim() and
 * \s would treat some names, IDs and scores differently from the real analyzer.
 */
const PY_SPACE =
  '\\t\\n\\v\\f\\r\\x1c-\\x1f \\x85\\xa0\\u1680\\u2000-\\u200a\\u2028\\u2029\\u202f\\u205f\\u3000';
const PY_EDGES = new RegExp(`^[${PY_SPACE}]+|[${PY_SPACE}]+$`, 'g');
const PY_RUNS = new RegExp(`[${PY_SPACE}]+`, 'g');
/*
 * RE2's \s. Students' pandas 3 has PyArrow (Streamlit installs it), which runs
 * str.replace(r"\s+", " ") on RE2 when a column is all ASCII, and on Python's re otherwise
 * (pandas' _needs_python_regex). RE2's \s leaves out \v and U+001C to U+001F.
 */
const RE2_RUNS = /[\t\n\f\r ]+/g;

/** Whether text has a character outside ASCII. */
function hasNonAscii(text: string): boolean {
  for (let index = 0; index < text.length; index += 1)
    if (text.charCodeAt(index) > 0x7f) return true;
  return false;
}

/** Python's str.strip(). */
export function pyStrip(value: string): string {
  return value.replace(PY_EDGES, '');
}

/** "Student ID " -> "student_id", "Social Studies" -> "social_studies". */
export function normalizeHeader(name: string): string {
  return pyStrip(name)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

function listLines(lines: readonly number[]): string {
  const shown = lines.slice(0, MAX_LISTED).join(', ');
  const extra = lines.length - MAX_LISTED;
  return extra > 0 ? `${shown} and ${extra} more` : shown;
}

/**
 * pandas.to_numeric(errors="coerce") for a stripped cell: NaN when it isn't a number. In
 * pandas 3, which the template installs, a number too large for a float ("1e400") becomes
 * infinity, like "inf" (pandas 2.2 called it not a number).
 */
function toNumber(cell: string): number {
  if (/^[+-]?(\d+\.?\d*|\.\d+)([eE][+-]?\d+)?$/.test(cell)) return Number(cell);
  const infinity = /^([+-]?)(inf|infinity)$/i.exec(cell);
  if (infinity) return infinity[1] === '-' ? -Infinity : Infinity;
  return Number.NaN;
}

export interface ColumnRoles {
  idIndex: number | null;
  nameIndex: number | null;
  classIndex: number | null;
  subjectIndexes: number[];
}

/** Which columns hold the student ID, name, class and subject scores (header cells already stripped). */
export function findColumns(header: readonly string[]): ColumnRoles {
  const normalized = header.map(normalizeHeader);
  const find = (aliases: Set<string>) => {
    const index = normalized.findIndex((key) => aliases.has(key));
    return index === -1 ? null : index;
  };
  const idIndex = find(ID_ALIASES);
  const nameIndex = find(NAME_ALIASES);
  const classIndex = find(CLASS_ALIASES);
  const known = new Set([idIndex, nameIndex, classIndex].filter((index) => index !== null));
  const subjectIndexes = header
    .map((name, index) => (!known.has(index) && name ? index : null))
    .filter((index) => index !== null);
  return { idIndex, nameIndex, classIndex, subjectIndexes };
}

export type ScoreKind = 'score' | 'absent' | 'empty' | 'not-a-number' | 'out-of-range';

/** How validation treats one score cell, for showing problems in a table. */
export function classifyScore(cell: string, maxMarks: number): ScoreKind {
  const value = pyStrip(cell);
  if (ABSENT_MARKERS.has(value.toLowerCase())) return 'absent';
  if (value === '') return 'empty';
  const number = toNumber(value);
  if (Number.isNaN(number)) return 'not-a-number';
  return number < 0 || number > maxMarks ? 'out-of-range' : 'score';
}

export function validateResults(text: string, maxMarks: number): Validation {
  const result: Validation = {
    ok: false,
    errors: [],
    warnings: [],
    subjects: [],
    hasClass: false,
    rows: null,
  };
  if (text.length === 0) {
    result.errors.push('The file is empty.');
    return result;
  }
  if (new TextEncoder().encode(text).length > MAX_FILE_BYTES) {
    result.errors.push('The file is larger than 5 MB. Split it into smaller files.');
    return result;
  }
  const table = readCsv(text);
  if (!table.ok) {
    result.errors.push(table.error);
    return result;
  }
  const [headerRow = [], ...body] = table.rows;
  const header = headerRow.map(pyStrip);

  // --- Header checks ---
  const emptyHeaders = header
    .map((name, position) => (name ? null : String(position + 1)))
    .filter((value) => value !== null);
  if (emptyHeaders.length > 0)
    result.errors.push(`Column(s) ${emptyHeaders.join(', ')} have no name in the first row.`);
  const normalized = header.map(normalizeHeader);
  const seen = new Map<string, string>();
  header.forEach((original, index) => {
    // A name without ASCII letters or digits normalizes to "", so it is compared as written.
    const key = (normalized[index] ?? '') || original;
    const first = seen.get(key);
    if (key && first !== undefined)
      result.errors.push(`The columns “${first}” and “${original}” have the same name.`);
    if (!seen.has(key)) seen.set(key, original);
  });

  const { idIndex, nameIndex, classIndex, subjectIndexes } = findColumns(header);
  const missing = [
    ['Student ID', idIndex],
    ['Name', nameIndex],
  ]
    .filter(([, index]) => index === null)
    .map(([label]) => label);
  if (missing.length > 0) {
    const found = header.filter((name) => name).join(', ') || 'no column names';
    result.errors.push(
      `Required column(s) missing: ${missing.join(', ')}. The first row must name the columns, for example: Student ID, Name, Class, Mathematics, Science. Found: ${found}.`,
    );
  }
  if (subjectIndexes.length === 0)
    result.errors.push('No subject columns were found. Add one column of scores per subject.');
  if (result.errors.length > 0 || idIndex === null || nameIndex === null) return result;

  // --- Rows ---  (line numbers match a spreadsheet: the header is line 1)
  const rows = body
    .map((cells, position) => ({ cells, line: position + 2 }))
    .filter(({ cells }) => !cells.every((value) => pyStrip(value) === ''));
  if (rows.length === 0) {
    result.errors.push('The file has column names but no student rows.');
    return result;
  }
  if (rows.length > MAX_STUDENTS) {
    result.errors.push(`The file has more than ${MAX_STUDENTS.toLocaleString('en-US')} students.`);
    return result;
  }

  const ids = rows.map(({ cells }) => pyStrip(cells[idIndex] ?? ''));
  const stripped = rows.map(({ cells }) => pyStrip(cells[nameIndex] ?? ''));
  const runs = stripped.some(hasNonAscii) ? PY_RUNS : RE2_RUNS;
  const names = stripped.map((name) => name.replace(runs, ' '));
  const emptyIds = rows.filter((_, index) => ids[index] === '').map(({ line }) => line);
  if (emptyIds.length > 0)
    result.errors.push(`Student ID is empty on line(s) ${listLines(emptyIds)}.`);
  const emptyNames = rows.filter((_, index) => names[index] === '').map(({ line }) => line);
  if (emptyNames.length > 0)
    result.errors.push(`Name is empty on line(s) ${listLines(emptyNames)}.`);
  const linesById = new Map<string, number[]>();
  ids.forEach((id, index) => {
    if (id === '') return;
    const list = linesById.get(id) ?? [];
    list.push(rows[index]?.line ?? 0);
    linesById.set(id, list);
  });
  for (const [id, lines] of linesById) {
    if (lines.length > 1)
      result.errors.push(`Student ID “${id}” appears more than once (lines ${listLines(lines)}).`);
  }

  const subjects: string[] = [];
  const scoreColumns: (number | null)[][] = [];
  let absentCount = 0;
  let missingCells = 0;
  for (const index of subjectIndexes) {
    const label = header[index] ?? '';
    const cells = rows.map(({ cells: row }) => pyStrip(row[index] ?? ''));
    const numbers = cells.map((cell) => {
      const absent = ABSENT_MARKERS.has(cell.toLowerCase());
      if (absent) absentCount += 1;
      if (absent || cell === '') {
        missingCells += 1;
        return null;
      }
      return toNumber(cell);
    });
    const notNumeric = cells
      .map((cell, row) => ({ cell, line: rows[row]?.line ?? 0, value: numbers[row] }))
      .filter(({ value }) => value !== null && value !== undefined && Number.isNaN(value));
    if (notNumeric.length > 0) {
      const examples = notNumeric
        .slice(0, MAX_LISTED)
        .map(({ cell, line }) => `“${cell}” (line ${line})`)
        .join(', ');
      result.errors.push(`${label}: scores must be numbers, but found ${examples}.`);
    }
    const outOfRange = numbers
      .map((value, row) => ({ value, line: rows[row]?.line ?? 0 }))
      .filter(
        ({ value }) => value !== null && !Number.isNaN(value) && (value < 0 || value > maxMarks),
      );
    if (outOfRange.length > 0) {
      const examples = outOfRange
        .slice(0, MAX_LISTED)
        .map(({ value, line }) => `${formatGeneral(value ?? 0)} (line ${line})`)
        .join(', ');
      result.errors.push(
        `${label}: scores must be between 0 and ${maxMarks}, but found ${examples}.`,
      );
    }
    // pandas reads a column whose every cell is a plain integer ("44", "+5", "-0") as integers,
    // which have no negative zero, before turning it into floats; any other cell keeps -0.0.
    const integers = cells.every(
      (cell) => /^[+-]?\d+$/.test(cell) && Math.abs(Number(cell)) < 2 ** 63,
    );
    subjects.push(label);
    scoreColumns.push(
      numbers.map((value) =>
        value === null || Number.isNaN(value) ? null : integers ? value + 0 : value,
      ),
    );
  }

  if (absentCount > 0)
    result.warnings.push(
      `${absentCount} score(s) marked as absent (for example “AB”) are treated as missing.`,
    );
  if (missingCells > 0)
    result.warnings.push(
      `${missingCells} score(s) are missing. Averages for those subjects use only the students who have a score; see the Missing data tab for details.`,
    );
  // pandas keeps one column per name, so a later subject column with the same name replaces
  // an earlier one when Python checks for rows without scores (the file has an error anyway).
  const lastColumn = new Map(subjects.map((label, column) => [label, column]));
  const noScores = rows
    .filter((_, row) =>
      subjects.every((label) => scoreColumns[lastColumn.get(label) ?? 0]?.[row] === null),
    )
    .map(({ line }) => line);
  if (noScores.length > 0)
    result.warnings.push(`Line(s) ${listLines(noScores)} have no scores in any subject.`);

  if (result.errors.length > 0) return result;
  result.ok = true;
  result.subjects = subjects;
  result.hasClass = classIndex !== null;
  result.rows = rows.map(({ cells, line }, row) => ({
    line,
    id: ids[row] ?? '',
    name: names[row] ?? '',
    ...(classIndex !== null ? { className: pyStrip(cells[classIndex] ?? '') } : {}),
    scores: scoreColumns.map((column) => column[row] ?? null),
  }));
  return result;
}

// ---------------------------------------------------------------------------
// Grading (analyzer/grading.py)
// ---------------------------------------------------------------------------

export function gradeFor(percentage: number | null, passMark: number): Grade | null {
  if (percentage === null || Number.isNaN(percentage)) return null;
  for (const [grade, minimum] of FIXED_BANDS) if (percentage >= minimum) return grade;
  return percentage >= passMark ? 'D' : 'F';
}

/** The grading scale in words, as the app shows it. */
export function describeScale(passMark: number): Array<[Grade, string]> {
  return [
    ['A+', '90% and above'],
    ['A', '80% to below 90%'],
    ['B', '70% to below 80%'],
    ['C', '60% to below 70%'],
    ['D', passMark < 60 ? `${passMark}% to below 60%` : 'not used (the pass mark is 60%)'],
    ['F', `below ${passMark}%`],
  ];
}

// ---------------------------------------------------------------------------
// Analysis (analyzer/analysis.py)
// ---------------------------------------------------------------------------

export function passScore(passMark: number, maxMarks: number): number {
  return (passMark / 100) * maxMarks;
}

export interface SubjectStatistics {
  subject: string;
  count: number;
  missing: number;
  mean: number | null;
  median: number | null;
  stdDev: number | null;
  min: number | null;
  q1: number | null;
  q3: number | null;
  max: number | null;
  passed: number;
  passRate: number | null;
}

export function subjectStatistics(
  rows: readonly StudentRow[],
  subjects: readonly string[],
  passMark: number,
  maxMarks: number,
): SubjectStatistics[] {
  const threshold = passScore(passMark, maxMarks);
  return subjects.map((subject, column) => {
    const all = rows.map((row) => row.scores[column] ?? null);
    const scores = all.filter((value) => value !== null);
    const count = scores.length;
    const passed = scores.filter((value) => value >= threshold).length;
    return {
      subject,
      count,
      missing: all.length - count,
      mean: count ? pairwiseSum(scores) / count : null,
      median: median(scores),
      stdDev: standardDeviation(scores),
      min: count ? Math.min(...scores) : null,
      q1: quantile(scores, 0.25),
      q3: quantile(scores, 0.75),
      max: count ? Math.max(...scores) : null,
      passed,
      passRate: count ? (passed / count) * 100 : null,
    };
  });
}

export interface StudentResult {
  id: string;
  name: string;
  className?: string;
  total: number | null;
  subjectsScored: number;
  /** Rounded to two decimals, as the app shows it. */
  percentage: number | null;
  grade: Grade | null;
  result: Result;
  rank: number | null;
  belowPassMarkIn: string;
}

export function studentResults(
  rows: readonly StudentRow[],
  subjects: readonly string[],
  passMark: number,
  maxMarks: number,
  hasClass: boolean,
): StudentResult[] {
  const threshold = passScore(passMark, maxMarks);
  const computed = rows.map((row) => {
    const scored = row.scores.filter((value) => value !== null);
    const total = scored.length > 0 ? scored.reduce((sum, value) => sum + value, 0) : null;
    const percentage =
      total !== null && scored.length > 0 ? (total / (scored.length * maxMarks)) * 100 : null;
    const failed = scored.some((value) => value < threshold);
    const missingAny = row.scores.some((value) => value === null);
    return { row, scored, total, percentage, failed, missingAny };
  });
  const ranked = computed.map((item) => {
    const rank =
      item.percentage === null
        ? null
        : 1 +
          computed.filter(
            (other) => other.percentage !== null && other.percentage > (item.percentage ?? 0),
          ).length;
    const result: StudentResult = {
      id: item.row.id,
      name: item.row.name,
      ...(hasClass ? { className: item.row.className ?? '' } : {}),
      total: item.total,
      subjectsScored: item.scored.length,
      percentage: item.percentage === null ? null : roundLikeNumpy(item.percentage, 2),
      grade: gradeFor(item.percentage, passMark),
      result: item.failed ? 'Fail' : item.missingAny ? 'Incomplete' : 'Pass',
      rank,
      belowPassMarkIn: subjects
        .filter((_, column) => {
          const value = item.row.scores[column];
          return value !== null && value !== undefined && value < threshold;
        })
        .join(', '),
    };
    return result;
  });
  // Sorted by rank (missing ranks last), then by name; ties keep the file's order.
  return ranked
    .map((item, index) => ({ item, index }))
    .sort((a, b) => {
      const rankA = a.item.rank ?? Number.POSITIVE_INFINITY;
      const rankB = b.item.rank ?? Number.POSITIVE_INFINITY;
      return rankA - rankB || compareText(a.item.name, b.item.name) || a.index - b.index;
    })
    .map(({ item }) => item);
}

export interface GradeCount {
  grade: Grade;
  students: number;
  share: number;
}

export function gradeDistribution(grades: readonly (Grade | null)[]): GradeCount[] {
  const present = grades.filter((grade) => grade !== null);
  const total = present.length;
  return GRADE_ORDER.map((grade) => {
    const students = present.filter((item) => item === grade).length;
    return { grade, students, share: total ? (students / total) * 100 : 0 };
  });
}

export function subjectGrades(
  rows: readonly StudentRow[],
  column: number,
  passMark: number,
  maxMarks: number,
): (Grade | null)[] {
  return rows.map((row) => {
    const value = row.scores[column];
    return value === null || value === undefined
      ? null
      : gradeFor((value / maxMarks) * 100, passMark);
  });
}

export interface MissingCount {
  subject: string;
  missing: number;
  share: number;
}

export function missingSummary(
  rows: readonly StudentRow[],
  subjects: readonly string[],
): MissingCount[] {
  return subjects.map((subject, column) => {
    const missing = rows.filter((row) => row.scores[column] === null).length;
    return { subject, missing, share: rows.length ? (missing / rows.length) * 100 : 0 };
  });
}

export interface StudentWithMissing {
  id: string;
  name: string;
  missingSubjects: string;
}

export function studentsWithMissing(
  rows: readonly StudentRow[],
  subjects: readonly string[],
): StudentWithMissing[] {
  return rows
    .filter((row) => row.scores.some((value) => value === null))
    .map((row) => ({
      id: row.id,
      name: row.name,
      missingSubjects: subjects.filter((_, column) => row.scores[column] === null).join(', '),
    }));
}

export interface ClassSummary {
  className: string;
  students: number;
  averagePercentage: number | null;
  passed: number;
  passRate: number;
}

export function classSummary(
  results: readonly StudentResult[],
  hasClass: boolean,
): ClassSummary[] | null {
  if (!hasClass) return null;
  const classes = results.map((result) => result.className ?? '');
  const names = [...new Set(classes)].sort(compareText);
  // pandas 3, which the template installs, adds each class with numpy's reduceat when the rows
  // are already in class order and no percentage is missing; otherwise it uses Kahan summation.
  const reduceat =
    classes.every(
      (name, index) => index === 0 || compareText(classes[index - 1] ?? '', name) <= 0,
    ) && results.every((result) => result.percentage !== null);
  return names.map((className) => {
    const members = results.filter((result) => (result.className ?? '') === className);
    const passed = members.filter((result) => result.result === 'Pass').length;
    const percentages = members.map((result) => result.percentage);
    return {
      className,
      students: members.length,
      averagePercentage: reduceat
        ? reduceatMean(percentages.map((value) => value ?? 0))
        : kahanMean(percentages),
      passed,
      passRate: (passed / members.length) * 100,
    };
  });
}

export interface Overview {
  students: number;
  subjects: number;
  averagePercentage: number | null;
  medianPercentage: number | null;
  passed: number;
  failed: number;
  incomplete: number;
  highestSubject: string | null;
  lowestSubject: string | null;
}

/** Stable ascending order, as pandas' sort_values gives for a few rows. */
function ascendingBy<T>(items: readonly T[], key: (item: T) => number): T[] {
  return items
    .map((item, index) => ({ item, index }))
    .sort((a, b) => key(a.item) - key(b.item) || a.index - b.index)
    .map(({ item }) => item);
}

export function overview(
  results: readonly StudentResult[],
  statistics: readonly SubjectStatistics[],
): Overview {
  const means = ascendingBy(
    statistics.filter((item) => item.mean !== null),
    (item) => item.mean ?? 0,
  );
  const percentages = results.map((result) => result.percentage);
  return {
    students: results.length,
    subjects: statistics.length,
    averagePercentage: nanMean(percentages),
    medianPercentage: median(percentages.filter((value) => value !== null)),
    passed: results.filter((result) => result.result === 'Pass').length,
    failed: results.filter((result) => result.result === 'Fail').length,
    incomplete: results.filter((result) => result.result === 'Incomplete').length,
    highestSubject: means[means.length - 1]?.subject ?? null,
    lowestSubject: means[0]?.subject ?? null,
  };
}

// ---------------------------------------------------------------------------
// Explanations (analyzer/explain.py)
// ---------------------------------------------------------------------------

export const GLOSSARY: ReadonlyArray<readonly [string, string]> = [
  ['Count', 'How many students have a score in the subject. Missing scores are not counted.'],
  [
    'Mean',
    'The average: add all scores and divide by the count. Very high or low scores pull it up or down.',
  ],
  [
    'Median',
    'The middle score when all scores are sorted. Half the students scored at or below it.',
  ],
  [
    'Std dev',
    'Standard deviation: how spread out the scores are. A small value means most students scored close to the mean; a large value means scores vary a lot.',
  ],
  ['Q1 / Q3', 'Quartiles: 25% of students scored at or below Q1, and 75% at or below Q3.'],
  ['Min / Max', 'The lowest and highest score in the subject.'],
  ['Pass rate %', 'The share of students with a score who reached the pass mark.'],
];

const fmt = (value: number | null, digits = 1) => formatFixed(value ?? Number.NaN, digits);

export function explainOverview(summary: Overview, passMark: number): string[] {
  const average = summary.averagePercentage ?? Number.NaN;
  const middle = summary.medianPercentage ?? Number.NaN;
  const lines = [
    `The file contains ${summary.students} students and ${summary.subjects} subjects.`,
    // Every score is missing, so there is nothing to average (and no "nan%" to show).
    summary.averagePercentage === null
      ? 'No student has a score yet, so there is no average or median percentage.'
      : `The average overall percentage is ${fmt(average)}% and the median is ${fmt(middle)}%.`,
  ];
  if (average - middle > 3)
    lines.push(
      'The average is noticeably higher than the median, so a few high scorers are lifting the average.',
    );
  else if (middle - average > 3)
    lines.push(
      'The average is noticeably lower than the median, so a few low scores are pulling the average down.',
    );
  lines.push(
    `${summary.passed} students passed every subject (pass mark ${passMark}%), ${summary.failed} scored below the pass mark in at least one subject` +
      (summary.incomplete
        ? `, and ${summary.incomplete} have a missing score with no failed subject.`
        : '.'),
  );
  return lines;
}

export function explainSubjects(statistics: readonly SubjectStatistics[]): string[] {
  const valid = statistics.filter((item) => item.mean !== null);
  if (valid.length === 0) return ['No subject has any scores yet.'];
  const byMean = ascendingBy(valid, (item) => item.mean ?? 0);
  const highest = byMean[byMean.length - 1];
  const lowest = byMean[0];
  if (!highest || !lowest) return [];
  const lines = [
    `${highest.subject} has the highest average (${fmt(highest.mean)}) and ${lowest.subject} the lowest (${fmt(lowest.mean)}).`,
  ];
  const spread = ascendingBy(
    valid.filter((item) => item.stdDev !== null),
    (item) => item.stdDev ?? 0,
  );
  const widest = spread[spread.length - 1];
  const narrowest = spread[0];
  if (widest && narrowest)
    lines.push(
      `Scores vary most in ${widest.subject} (standard deviation ${fmt(widest.stdDev)}) and least in ${narrowest.subject} (${fmt(narrowest.stdDev)}).`,
    );
  const weakest = ascendingBy(valid, (item) => item.passRate ?? 0)[0];
  if (weakest && (weakest.passRate ?? 0) < 100)
    lines.push(
      `${weakest.subject} has the lowest pass rate: ${weakest.passed} of ${weakest.count} students (${fmt(weakest.passRate)}%) reached the pass mark.`,
    );
  else lines.push('Every student with a score reached the pass mark in every subject.');
  return lines;
}

export function explainGrades(distribution: readonly GradeCount[]): string[] {
  const total = distribution.reduce((sum, item) => sum + item.students, 0);
  if (total === 0) return ['No grades could be calculated.'];
  // The first of the most common grades, in A+ … F order (pandas' descending sort keeps ties in order).
  const most = Math.max(...distribution.map((item) => item.students));
  const top = distribution.find((item) => item.students === most);
  const topTwo = distribution
    .filter((item) => item.grade === 'A+' || item.grade === 'A')
    .reduce((sum, item) => sum + item.students, 0);
  const failing = distribution.find((item) => item.grade === 'F')?.students ?? 0;
  return [
    `The most common overall grade is ${top?.grade ?? ''} (${top?.students ?? 0} of ${total} students).`,
    `${topTwo} students (${fmt((topTwo / total) * 100)}%) earned A or A+, and ${failing} (${fmt((failing / total) * 100)}%) have an overall F.`,
  ];
}

export function explainMissing(
  missing: readonly MissingCount[],
  affectedStudents: number,
): string[] {
  const total = missing.reduce((sum, item) => sum + item.missing, 0);
  if (total === 0) return ['No scores are missing, so every statistic uses every student.'];
  const affected = missing.filter((item) => item.missing > 0);
  const subjects = affected.map((item) => `${item.subject} (${item.missing})`).join(', ');
  return [
    `${total} score(s) are missing across ${affected.length} subject(s): ${subjects}.`,
    'Missing scores are left out of averages and other statistics rather than counted as zero, so those figures describe only the students who have a score.',
    `Students with a missing score are marked “Incomplete” unless they already scored below the pass mark in another subject. Check the records of these ${affectedStudents} student(s) before publishing results.`,
  ];
}

// ---------------------------------------------------------------------------
// Everything the app computes for one file
// ---------------------------------------------------------------------------

export interface Analysis {
  statistics: SubjectStatistics[];
  results: StudentResult[];
  summary: Overview;
  distribution: GradeCount[];
  missing: MissingCount[];
  studentsWithMissing: StudentWithMissing[];
  classes: ClassSummary[] | null;
  explanations: { overview: string[]; subjects: string[]; grades: string[]; missing: string[] };
}

/** The same sequence of calls as the analysis section of the template's app.py. */
export function analyse(
  validation: Validation,
  passMark: number,
  maxMarks: number,
): Analysis | null {
  if (!validation.ok || !validation.rows) return null;
  const { rows, subjects, hasClass } = validation;
  const statistics = subjectStatistics(rows, subjects, passMark, maxMarks);
  const results = studentResults(rows, subjects, passMark, maxMarks, hasClass);
  const summary = overview(results, statistics);
  const distribution = gradeDistribution(results.map((result) => result.grade));
  const missing = missingSummary(rows, subjects);
  const withMissing = studentsWithMissing(rows, subjects);
  return {
    statistics,
    results,
    summary,
    distribution,
    missing,
    studentsWithMissing: withMissing,
    classes: classSummary(results, hasClass),
    explanations: {
      overview: explainOverview(summary, passMark),
      subjects: explainSubjects(statistics),
      grades: explainGrades(distribution),
      missing: explainMissing(missing, withMissing.length),
    },
  };
}
