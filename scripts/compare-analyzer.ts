/**
 * `pnpm demo:compare [--cases N] [--seed S]`
 *
 * Compares the Demo Studio's TypeScript port of the result analyzer with the template's
 * real Python code on generated CSV files, beyond the fixed cases in analyzer.fixture.json.
 * The files are made from a seeded random generator, so a run can be repeated exactly.
 * They mix header aliases, absent markers, boundary and malformed numbers, unusual
 * whitespace, quoting, blank and ragged lines, CR/CRLF line endings, duplicates, ties and
 * different pass marks. `--shapes N` adds files with shapes random ones rarely have (one
 * student, hundreds of ties, a subject nobody sat, ...). The Python output is the reference;
 * every case where the port gives a different value is listed with its first difference.
 *
 * Python comes from CAMPUSKIT_PYTHON (default: python on Windows, python3 elsewhere), with
 * the template's requirements installed, as for `pnpm demo:fixtures`: pandas 3 and PyArrow,
 * as a student has them. The Python script refuses to run without them.
 */
import { spawnSync } from 'node:child_process';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { pythonShape } from '../apps/web/src/features/demo/demos/results/parity.ts';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const python =
  process.env.CAMPUSKIT_PYTHON ?? (process.platform === 'win32' ? 'python' : 'python3');
const option = (name: string, fallback: number) => {
  const index = process.argv.indexOf(name);
  return index === -1 ? fallback : Number(process.argv[index + 1]);
};
const count = option('--cases', 400);
const shapeCount = option('--shapes', 70);
const seed = option('--seed', 1);

// ---------------------------------------------------------------------------
// Generated cases
// ---------------------------------------------------------------------------

/** mulberry32: a small seeded generator, so the same seed gives the same files. */
function generator(start: number) {
  let state = start >>> 0;
  const next = () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const int = (min: number, max: number) => min + Math.floor(next() * (max - min + 1));
  const pick = <T>(items: readonly T[]): T => items[int(0, items.length - 1)] as T;
  const chance = (p: number) => next() < p;
  return { next, int, pick, chance };
}

type Random = ReturnType<typeof generator>;

const ID_HEADERS = [
  'Student ID',
  'ID',
  'Roll No',
  'roll_number',
  ' Roll ',
  'Admission No',
  'Enrolment No',
];
const NAME_HEADERS = ['Name', 'Student Name', 'full name', ' NAME '];
const CLASS_HEADERS = ['Class', 'Section', 'class-section'];
const SUBJECTS = [
  'Mathematics',
  'Science',
  'English',
  'Social Studies',
  'Computer Science',
  'Hindi',
  'Physics',
  'Art',
  'गणित',
];
const FIRST = [
  'Aarav',
  'Diya',
  'Kabir',
  'Meera',
  'Rohan',
  'Sara',
  'Zoë',
  'José',
  'अनन्या',
  'தமிழ்',
  'Li Wei',
  "O'Brien",
  'Ann-Marie',
];
const LAST = [
  'Sharma',
  'Patel',
  'Singh',
  'Iyer',
  'Das',
  'Thomas',
  'Khan',
  'Gupta',
  'Nair',
  'Verma',
];
// Python's str.strip() treats \x1c-\x1f and \x85 as whitespace but not \ufeff; JavaScript's
// trim() is the other way round. NBSP and U+3000 are spaces in both. Inside names, pandas 3
// with PyArrow (which every student has) runs \s on RE2, which leaves out \v and \x1c-\x1f,
// unless the column has a non-ASCII character.
const SPACES = [' ', '  ', '\t', '\u00a0', '\u3000', '\u2003', '\x1f', '\x85', '\ufeff', '\u200b'];
const ABSENT = ['AB', 'ab', 'Absent', 'ABS', '-', 'NA', 'n/a', 'N/A'];
const ODD_NUMBERS = [
  '1e2',
  '5e1',
  '+5',
  '007',
  '-0',
  '0.0',
  '.5',
  '5.',
  '1e-400',
  '1e400',
  'inf',
  '-inf',
  'Infinity',
  'nan',
  'NaN',
  '1_000',
  '0x10',
  '١٢',
  '５０',
  '1,5',
  ' 7 ',
  '12x',
  'six',
  'True',
  '3.14159265358979',
  '99.999',
  '100.0000001',
  '-0.5',
  '40.00',
];

// Unusual but valid ways of writing a score, used in files meant to pass validation.
const VALID_ODD_NUMBERS = [
  '1e1',
  '+5',
  '007',
  '-0',
  '0.0',
  '.5',
  '5.',
  '1e-400',
  '3.14159265358979',
  '40.00',
  '0e0',
  '1.e1',
  '+.5e1',
];

function score(random: Random, maxMarks: number, passMark: number, messy: boolean): string {
  const pass = (passMark * maxMarks) / 100;
  const boundaries = [0, maxMarks, pass, pass - 0.5, pass + 0.5, pass - 1, maxMarks - 0.5];
  if (!messy) {
    const kind = random.next();
    if (kind < 0.6) return String(random.int(0, maxMarks));
    if (kind < 0.72) return String(random.pick(boundaries));
    if (kind < 0.84) return (random.next() * maxMarks).toFixed(random.int(1, 3));
    if (kind < 0.92) return random.pick([...ABSENT, '', ' ']);
    return random.pick(VALID_ODD_NUMBERS);
  }
  const kind = random.next();
  if (kind < 0.5) return String(random.int(0, maxMarks));
  if (kind < 0.62) return String(random.pick(boundaries));
  if (kind < 0.74) return (random.next() * maxMarks).toFixed(random.int(1, 3));
  if (kind < 0.84) return random.pick([...ABSENT, '', ' ']);
  if (kind < 0.93) return random.pick(ODD_NUMBERS);
  return String(random.pick([-1, maxMarks + 1, maxMarks * 2, -100]));
}

function quote(field: string, random: Random): string {
  if (/[",\r\n]/.test(field) || (field !== '' && random.chance(0.05)))
    return `"${field.replace(/"/g, '""')}"`;
  return field;
}

type Role = 'id' | 'name' | 'class' | 'subject' | 'extra';

function makeCase(random: Random, index: number) {
  // Most files are meant to pass validation, so the statistics, grades and explanations are
  // compared too; the rest add invalid values, header problems and broken rows.
  const messy = random.chance(0.3);
  const passMark = random.chance(0.75) ? 40 : random.pick([33, 35, 50, 60]);
  const maxMarks = random.chance(0.8) ? 100 : random.pick([50, 80]);
  const subjects = [...SUBJECTS].sort(() => random.next() - 0.5).slice(0, random.int(1, 6));
  const columns: Array<{ label: string; role: Role }> = [
    { label: random.pick(ID_HEADERS), role: 'id' },
    { label: random.pick(NAME_HEADERS), role: 'name' },
  ];
  if (random.chance(0.6)) columns.push({ label: random.pick(CLASS_HEADERS), role: 'class' });
  columns.push(...subjects.map((label) => ({ label, role: 'subject' as const })));
  if (messy && random.chance(0.2))
    columns.push({
      label: random.pick(['', 'maths', subjects[0]?.toUpperCase() ?? 'X']), // header problems
      role: 'extra',
    });
  if (messy && random.chance(0.1)) columns.splice(random.int(0, 1), 1); // a required column missing
  if (random.chance(0.2)) columns.sort(() => random.next() - 0.5);

  const width = columns.length;
  const lines = [columns.map((column) => quote(column.label, random)).join(',')];
  const studentCount =
    messy && random.chance(0.1) ? 0 : random.int(1, random.chance(0.2) ? 60 : 15);
  const usedIds: string[] = [];
  for (let student = 0; student < studentCount; student += 1) {
    if (random.chance(0.05)) lines.push(random.chance(0.5) ? '' : ','.repeat(width - 1)); // blank lines
    let id = `S${String(student + 1).padStart(3, '0')}`;
    if (messy && random.chance(0.05) && usedIds.length > 0) id = random.pick(usedIds); // duplicate id
    if (messy && random.chance(0.04)) id = random.pick(['', ' ', '\x1f']);
    usedIds.push(id);
    let name = `${random.pick(FIRST)} ${random.pick(LAST)}`;
    if (random.chance(0.15))
      name = `${random.pick(SPACES)}${name.replace(' ', random.pick(SPACES))}${random.pick(SPACES)}`;
    if (random.chance(0.03))
      name = random.pick(
        messy ? ['', '   ', '\x85'] : ['Line\nBreak', 'Comma, Inside', 'Say "Hi"', 'Ünïcode ✓'],
      );
    const cells = columns.map(({ role }) => {
      if (role === 'id') return random.chance(0.08) ? `${random.pick(SPACES)}${id}` : id;
      if (role === 'name') return name;
      if (role === 'class') return random.pick(['10-A', '10-B', '9-C', '', 'दस', ' 10-A ']);
      return score(random, maxMarks, passMark, messy);
    });
    if (messy && random.chance(0.05)) cells.push('extra'); // a ragged row
    if (random.chance(0.03)) cells.splice(-random.int(1, Math.min(2, cells.length - 1))); // padded
    lines.push(cells.map((cell) => quote(cell, random)).join(','));
  }
  const newline = random.pick(['\n', '\n', '\n', '\r\n', '\r']);
  let csv = lines.join(newline) + (random.chance(0.85) ? newline : '');
  if (random.chance(0.05)) csv = `\ufeff${csv}`;
  if (messy && random.chance(0.05))
    csv = random.pick(['', '   ', '\n\n', '\ufeff', '\x1f', `\n${csv}`, ` \n${csv}`]);
  return { name: `case-${seed}-${index}`, csv, passMark, maxMarks };
}

const SHAPES = [
  'one student',
  'identical scores',
  'a subject nobody sat',
  'everyone absent',
  'hundreds of ties',
  'every subject',
  'averages that round',
] as const;

// Scores whose averages and percentages end in 5 at the third decimal or beyond, where
// rounding rules differ (Python rounds half to even, and binary fractions round unevenly).
const ROUNDING_FRACTIONS = ['.125', '.375', '.625', '.875', '.5', '.25', '.005', '.015', '.045'];

/**
 * A file with one of SHAPES, all otherwise valid. These come from their own generator, so
 * adding them doesn't change the random files for a seed.
 */
function makeShapedCase(random: Random, index: number) {
  const shape = SHAPES[index % SHAPES.length] ?? 'one student';
  const passMark = random.pick([33, 35, 40, 50, 60]);
  const maxMarks = random.pick([50, 80, 100]);
  const pass = (passMark * maxMarks) / 100;
  const subjects =
    shape === 'every subject'
      ? [...SUBJECTS]
      : [...SUBJECTS].sort(() => random.next() - 0.5).slice(0, random.int(2, 4));
  const studentCount =
    shape === 'one student'
      ? 1
      : shape === 'hundreds of ties'
        ? random.int(200, 400)
        : random.int(3, 25);
  const same = String(random.int(0, maxMarks));
  const lines = [['Student ID', 'Name', 'Class', ...subjects].join(',')];
  for (let student = 0; student < studentCount; student += 1) {
    const cells = [
      `S${String(student + 1).padStart(3, '0')}`,
      quote(`${random.pick(FIRST)} ${random.pick(LAST)}`, random),
      random.pick(['10-A', '10-B', '9-C']),
    ];
    subjects.forEach((_, column) => {
      if (shape === 'identical scores') cells.push(same);
      else if (shape === 'everyone absent') cells.push(random.pick(ABSENT));
      else if (shape === 'a subject nobody sat' && column === 0) cells.push(random.pick(ABSENT));
      else if (shape === 'hundreds of ties')
        cells.push(String(random.pick([0, pass, maxMarks / 2, maxMarks])));
      else if (shape === 'averages that round')
        cells.push(`${random.int(0, maxMarks - 1)}${random.pick(ROUNDING_FRACTIONS)}`);
      else cells.push(String(random.int(0, maxMarks)));
    });
    lines.push(cells.join(','));
  }
  return {
    name: `shape-${index} (${shape})`,
    csv: `${lines.join('\n')}\n`,
    passMark,
    maxMarks,
  };
}

// ---------------------------------------------------------------------------
// Comparison
// ---------------------------------------------------------------------------

const showNumber = (value: number) => (Object.is(value, -0) ? '-0' : String(value));

/** The first place two JSON values differ, or null. Numbers must be identical, sign of zero included. */
function firstDifference(expected: unknown, actual: unknown, path = ''): string | null {
  if (typeof expected === 'number' && typeof actual === 'number')
    return Object.is(expected, actual)
      ? null
      : `${path}: Python ${showNumber(expected)}, port ${showNumber(actual)}`;
  if (
    expected === null ||
    actual === null ||
    typeof expected !== 'object' ||
    typeof actual !== 'object'
  )
    return Object.is(expected, actual) || expected === actual
      ? null
      : `${path}: Python ${JSON.stringify(expected)}, port ${JSON.stringify(actual)}`;
  if (Array.isArray(expected) !== Array.isArray(actual)) return `${path}: different types`;
  const keys = new Set([...Object.keys(expected), ...Object.keys(actual)]);
  for (const key of keys)
    if (key !== 'name' && key !== 'csv') {
      const difference = firstDifference(
        (expected as Record<string, unknown>)[key],
        (actual as Record<string, unknown>)[key],
        `${path}.${key}`,
      );
      if (difference) return difference;
    }
  return null;
}

const random = generator(seed);
const shapeRandom = generator(seed + 0x5eed);
const cases = [
  ...Array.from({ length: count }, (_, index) => makeCase(random, index)),
  ...Array.from({ length: shapeCount }, (_, index) => makeShapedCase(shapeRandom, index)),
];
const workDir = await mkdtemp(join(tmpdir(), 'campuskit-compare-'));
try {
  const casesFile = join(workDir, 'cases.json');
  await writeFile(casesFile, JSON.stringify(cases));
  const result = spawnSync(
    python,
    [
      join(repoRoot, 'scripts/python/analyzer_parity.py'),
      join(repoRoot, 'templates/student-result-analyzer'),
      '--cases',
      casesFile,
    ],
    {
      encoding: 'utf8',
      env: { ...process.env, PYTHONDONTWRITEBYTECODE: '1', PYTHONIOENCODING: 'utf-8' },
      maxBuffer: 512 * 1024 * 1024,
    },
  );
  if (result.error || result.status !== 0) {
    console.error(
      `Could not run the analyzer with ${python}: ${result.error?.message ?? result.stderr}`,
    );
    process.exit(1);
  }
  const reference = JSON.parse(result.stdout) as Array<Record<string, unknown>>;
  const mismatches: string[] = [];
  let pythonErrors = 0;
  let valid = 0;
  reference.forEach((expected, index) => {
    const input = cases[index];
    if (!input) return;
    if (typeof expected.error === 'string') {
      pythonErrors += 1;
      mismatches.push(
        `${input.name}: the Python analyzer raised ${expected.error}\n${JSON.stringify(input.csv)}`,
      );
      return;
    }
    let actual: unknown;
    try {
      actual = pythonShape(input.csv, input.passMark, input.maxMarks);
    } catch (error) {
      mismatches.push(
        `${input.name}: the port threw ${(error as Error).message}\n${JSON.stringify(input.csv)}`,
      );
      return;
    }
    if ((expected.validation as { ok?: boolean } | undefined)?.ok) valid += 1;
    const difference = firstDifference(expected, actual);
    if (difference)
      mismatches.push(
        `${input.name} (pass mark ${input.passMark}, max ${input.maxMarks}): ${difference}\n${JSON.stringify(input.csv)}`,
      );
  });
  console.log(
    `${cases.length} generated files (seed ${seed}; ${count} random, ${shapeCount} shaped): ${valid} valid, ${cases.length - valid} rejected by validation, ${pythonErrors} Python exceptions.`,
  );
  if (mismatches.length > 0) {
    console.log(`\n${mismatches.length} case(s) differ from the Python output:\n`);
    console.log(mismatches.slice(0, 40).join('\n\n'));
    process.exitCode = 1;
  } else {
    console.log('The port matched the Python output for every file.');
  }
} finally {
  await rm(workDir, { recursive: true, force: true });
}
