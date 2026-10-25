/**
 * The result analyzer demo. The real template is a Python and Streamlit app;
 * this demo runs a TypeScript port of its analysis (analyzer.ts), checked
 * against the Python code's output, on the template's own sample files.
 */
import { CircleAlert, FileWarning } from 'lucide-react';
import { useId, useMemo, useState } from 'react';

import sampleWithErrors from '../../../../../../../templates/student-result-analyzer/data/sample_with_errors.csv?raw';
import sampleResults from '../../../../../../../templates/student-result-analyzer/data/sample_results.csv?raw';
import templateConfig from '../../../../../../../templates/student-result-analyzer/app_config.json';
import { Button } from '../../../../components/ui/Button.tsx';
import { Callout } from '../../../../components/ui/Callout.tsx';
import { EmptyState } from '../../../../components/ui/EmptyState.tsx';
import { SelectField, TextareaField, TextField } from '../../../../components/ui/Field.tsx';
import { cn } from '../../../../lib/cn.ts';
import { ChartCard, ColumnChart } from '../../charts.tsx';
import { defineDemo } from '../../define.ts';
import type { DemoViewProps } from '../../types.ts';
import {
  highlightClasses,
  rowHeaderClasses,
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
  analyse,
  classifyScore,
  describeScale,
  findColumns,
  GLOSSARY,
  GRADE_ORDER,
  gradeDistribution,
  MAX_FILE_BYTES,
  passScore,
  pyStrip,
  subjectGrades,
  validateResults,
  type Analysis,
  type GradeCount,
  type Result,
  type ScoreKind,
  type Validation,
} from './analyzer.ts';
import { readCsv } from './csv.ts';
import { formatFixed } from './pyformat.ts';

/** The template's default settings (app_config.json): a 40% pass mark and 100 marks per subject. */
const PASS_MARK = templateConfig.pass_mark;
const MAX_MARKS = templateConfig.max_marks;

const SAMPLES = {
  sample: {
    label: 'Sample class',
    file: 'sample_results.csv',
    description: '40 fictional students, five subjects and a few missing scores.',
    csv: sampleResults,
  },
  errors: {
    label: 'File with mistakes',
    file: 'sample_with_errors.csv',
    description: 'Five students and deliberate errors, to show the validation messages.',
    csv: sampleWithErrors,
  },
} as const;

type Source = keyof typeof SAMPLES | 'custom';

export interface ResultsState {
  version: 1;
  source: Source;
  csv: string;
}

type Props = DemoViewProps<ResultsState>;

interface ViewProps extends Props {
  validation: Validation;
  analysis: Analysis | null;
}

const one = (value: number | null) => (value === null ? '—' : formatFixed(value, 1));

function sourceName(state: ResultsState): string {
  return state.source === 'custom'
    ? 'your edited file'
    : `${SAMPLES[state.source].file} (fictional sample data)`;
}

/** A short, cheap fingerprint of the CSV text, so the editor starts again when the data changes. */
function textKey(text: string): string {
  let hash = 5381;
  for (let index = 0; index < text.length; index += 1)
    hash = ((hash << 5) + hash + text.charCodeAt(index)) | 0;
  return `${text.length}-${hash}`;
}

function NotAnalysable({ selectFeature }: { selectFeature: (feature: string) => void }) {
  return (
    <EmptyState
      icon={<FileWarning aria-hidden="true" className="size-6" />}
      title="This file can’t be analysed yet"
      actions={
        <Button size="sm" onClick={() => selectFeature('dataset')}>
          Go to Dataset
        </Button>
      }
    >
      Like the real app, the analyzer stops when validation finds errors, so no wrong results are
      shown. Fix the problems on the Dataset screen, or choose the sample class.
    </EmptyState>
  );
}

function BulletList({ lines }: { lines: readonly string[] }) {
  return (
    <ul className="list-disc space-y-1.5 pl-5 text-sm text-ink-2 marker:text-ink-3">
      {lines.map((line) => (
        <li key={line}>{line}</li>
      ))}
    </ul>
  );
}

// ---------------------------------------------------------------------------
// Dataset
// ---------------------------------------------------------------------------

const CELL_STYLES: Record<ScoreKind, string> = {
  score: 'text-ink',
  absent: 'text-ink-3 italic',
  empty: 'text-ink-3',
  'not-a-number': 'font-semibold text-danger',
  'out-of-range': 'font-semibold text-danger',
};

const CELL_NOTES: Partial<Record<ScoreKind, string>> = {
  absent: 'absent, treated as missing',
  empty: 'missing',
  'not-a-number': 'not a number',
  'out-of-range': `not between 0 and ${MAX_MARKS}`,
};

function DataTable({ csv }: { csv: string }) {
  const [showAll, setShowAll] = useState(false);
  const table = readCsv(csv);
  if (!table.ok) return null;
  const [header = [], ...body] = table.rows;
  const cleanHeader = header.map(pyStrip);
  const roles = findColumns(cleanHeader);
  const subjects = new Set(roles.subjectIndexes);
  const rows = body
    .map((cells, index) => ({ cells, line: index + 2 }))
    .filter(({ cells }) => !cells.every((cell) => pyStrip(cell) === ''));
  const shown = showAll ? rows : rows.slice(0, 10);
  return (
    <div className="space-y-2">
      <TableRegion label="The file’s rows">
        <table className={cn(tableClasses, 'min-w-[40rem]')}>
          <caption className="sr-only">The file’s rows, with problem scores marked</caption>
          <thead className={theadClasses}>
            <tr>
              <th scope="col" className={cn(thClasses, 'w-12 text-right font-mono text-xs')}>
                Line
              </th>
              {cleanHeader.map((name, index) => (
                <th
                  key={`${index}-${name}`}
                  scope="col"
                  className={cn(thClasses, subjects.has(index) && 'text-right')}
                >
                  {name || <span className="text-danger">(no name)</span>}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {shown.map(({ cells, line }) => (
              <tr key={line}>
                <td className={cn(tdClasses, 'text-right font-mono text-xs text-ink-3')}>{line}</td>
                {cleanHeader.map((_, index) => {
                  const cell = cells[index] ?? '';
                  if (!subjects.has(index))
                    return (
                      <td key={index} className={cn(tdClasses, 'whitespace-nowrap')}>
                        {pyStrip(cell) || (
                          <span className="font-semibold text-danger">(empty)</span>
                        )}
                      </td>
                    );
                  const kind = classifyScore(cell, MAX_MARKS);
                  const note = CELL_NOTES[kind];
                  return (
                    <td key={index} className={cn(tdClasses, 'text-right tabular-nums')}>
                      <span className={CELL_STYLES[kind]}>
                        {pyStrip(cell) || '—'}
                        {note ? <span className="sr-only"> ({note})</span> : null}
                      </span>
                      {kind === 'not-a-number' || kind === 'out-of-range' ? (
                        <CircleAlert
                          aria-hidden="true"
                          className="ml-1 inline size-3.5 align-[-0.15em] text-danger"
                        />
                      ) : null}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </TableRegion>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="type-meta">
          — and AB mean a missing score; red values are errors. Showing {shown.length} of{' '}
          {rows.length} rows.
        </p>
        {rows.length > 10 ? (
          <Button size="sm" variant="ghost" onClick={() => setShowAll((value) => !value)}>
            {showAll ? 'Show the first 10 rows' : `Show all ${rows.length} rows`}
          </Button>
        ) : null}
      </div>
    </div>
  );
}

function CsvEditor({ state, update }: Pick<Props, 'state' | 'update'>) {
  const [draft, setDraft] = useState(state.csv);
  const [error, setError] = useState<string | undefined>(undefined);
  const changed = draft !== state.csv;
  return (
    <div className="space-y-3">
      <TextareaField
        label="CSV text"
        description="The first row names the columns: Student ID, Name, optional Class, then one column per subject."
        rows={10}
        spellCheck={false}
        value={draft}
        error={error}
        onChange={(event) => {
          setDraft(event.target.value);
          setError(undefined);
        }}
        className="font-mono text-xs leading-relaxed"
      />
      <div className="flex flex-wrap gap-2">
        <Button
          disabled={!changed}
          onClick={() => {
            if (new TextEncoder().encode(draft).length > MAX_FILE_BYTES) {
              setError('The file is larger than 5 MB. Split it into smaller files.');
              return;
            }
            update(
              (current) => ({ ...current, source: 'custom', csv: draft }),
              'Analysed your edited file.',
            );
          }}
        >
          Analyse this file
        </Button>
        <Button variant="secondary" disabled={!changed} onClick={() => setDraft(state.csv)}>
          Discard changes
        </Button>
      </div>
    </div>
  );
}

function DatasetScreen({ state, update, validation, highlight }: ViewProps) {
  const groupName = useId();
  const choices: Array<{ id: Source; label: string; description: string }> = [
    ...(['sample', 'errors'] as const).map((id) => ({
      id,
      label: SAMPLES[id].label,
      description: `${SAMPLES[id].file}: ${SAMPLES[id].description}`,
    })),
    ...(state.source === 'custom'
      ? [
          {
            id: 'custom' as const,
            label: 'Your edited file',
            description: 'The CSV text you analysed.',
          },
        ]
      : []),
  ];
  return (
    <div className="space-y-6">
      <ScreenHeading
        title="Dataset"
        description="Choose a file, or edit the text. The file is checked before anything is calculated."
      />
      <fieldset>
        <legend className="mb-2 text-sm font-semibold text-ink">File</legend>
        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
          {choices.map((choice) => (
            <label
              key={choice.id}
              className={cn(
                'flex cursor-pointer gap-3 rounded-xl border p-3 text-sm transition-colors',
                'has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-focus',
                state.source === choice.id
                  ? 'border-violet bg-violet-soft/60'
                  : 'border-line hover:border-control',
              )}
            >
              <input
                type="radio"
                name={groupName}
                value={choice.id}
                checked={state.source === choice.id}
                onChange={() => {
                  if (choice.id === 'custom') return;
                  const sample = SAMPLES[choice.id];
                  update(
                    (current) => ({ ...current, source: choice.id, csv: sample.csv }),
                    `Loaded ${sample.file}.`,
                  );
                }}
                className="mt-0.5 size-4 shrink-0 accent-violet"
              />
              <span>
                <span className="block font-semibold text-ink">{choice.label}</span>
                <span className="block text-ink-2">{choice.description}</span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      <div className={cn('space-y-3', highlightClasses(highlight === 'validation'))}>
        {validation.ok && validation.rows ? (
          <Callout tone="success" title="Validation passed">
            Analysing <strong>{sourceName(state)}</strong>: {validation.rows.length} students and{' '}
            {validation.subjects.length} subjects passed validation.
          </Callout>
        ) : (
          <Callout tone="danger" title="This file can’t be analysed yet">
            <p>
              <strong>{sourceName(state)}</strong> has problems. Fix them and analyse the file
              again.
            </p>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              {validation.errors.map((error) => (
                <li key={error}>{error}</li>
              ))}
            </ul>
          </Callout>
        )}
        {validation.warnings.length > 0 ? (
          <Callout tone="warn" title={validation.ok ? 'Warnings' : 'Also'}>
            <ul className="list-disc space-y-1 pl-5">
              {validation.warnings.map((warning) => (
                <li key={warning}>{warning}</li>
              ))}
            </ul>
          </Callout>
        ) : null}
      </div>

      <div className="space-y-3">
        <h3 className="font-semibold text-ink">The file’s rows</h3>
        <DataTable key={textKey(state.csv)} csv={state.csv} />
      </div>

      <details className="rounded-xl border border-line">
        <summary className="cursor-pointer rounded-xl px-4 py-3 text-sm font-semibold text-ink hover:bg-raised/60">
          Edit the CSV text
        </summary>
        <div className="border-t border-line p-4">
          <CsvEditor key={textKey(state.csv)} state={state} update={update} />
        </div>
      </details>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Analysis screens
// ---------------------------------------------------------------------------

function OverviewScreen({ analysis, highlight }: ViewProps & { analysis: Analysis }) {
  const { summary, classes, explanations } = analysis;
  return (
    <div className="space-y-6">
      <ScreenHeading title="Overview" description="The class at a glance, explained in words." />
      <div className={highlightClasses(highlight === 'headline')}>
        <StatGrid>
          <StatTile label="Students" value={summary.students} />
          <StatTile label="Subjects" value={summary.subjects} />
          <StatTile
            label="Average percentage"
            value={`${one(summary.averagePercentage)}%`}
            detail={`Median ${one(summary.medianPercentage)}%`}
          />
          <StatTile
            label="Passed every subject"
            value={`${summary.passed} of ${summary.students}`}
            detail={`${summary.failed} failed · ${summary.incomplete} incomplete`}
          />
        </StatGrid>
      </div>
      <section aria-labelledby="numbers-heading" className="space-y-2">
        <h3 id="numbers-heading" className="font-semibold text-ink">
          What the numbers say
        </h3>
        <BulletList lines={[...explanations.overview, ...explanations.subjects.slice(0, 1)]} />
        <p className="type-meta">
          Generated from the results by explain_overview and explain_subjects.
        </p>
      </section>
      {classes ? (
        <section aria-labelledby="classes-heading" className="space-y-3">
          <h3 id="classes-heading" className="font-semibold text-ink">
            By class
          </h3>
          <TableRegion label="Results by class">
            <table className={tableClasses}>
              <thead className={theadClasses}>
                <tr>
                  <th scope="col" className={thClasses}>
                    Class
                  </th>
                  {['Students', 'Average %', 'Passed', 'Pass rate %'].map((heading) => (
                    <th key={heading} scope="col" className={cn(thClasses, 'text-right')}>
                      {heading}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-line tabular-nums">
                {classes.map((item) => (
                  <tr key={item.className}>
                    <th scope="row" className={rowHeaderClasses}>
                      {item.className || '(no class)'}
                    </th>
                    <td className={cn(tdClasses, 'text-right')}>{item.students}</td>
                    <td className={cn(tdClasses, 'text-right')}>{one(item.averagePercentage)}</td>
                    <td className={cn(tdClasses, 'text-right')}>{item.passed}</td>
                    <td className={cn(tdClasses, 'text-right')}>{one(item.passRate)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableRegion>
        </section>
      ) : null}
    </div>
  );
}

function SubjectsScreen({ analysis, highlight }: ViewProps & { analysis: Analysis }) {
  const { statistics, explanations } = analysis;
  const passMarks = passScore(PASS_MARK, MAX_MARKS);
  const headings = [
    'Count',
    'Missing',
    'Mean',
    'Median',
    'Std dev',
    'Min',
    'Q1',
    'Q3',
    'Max',
    'Pass rate %',
  ];
  return (
    <div className="space-y-6">
      <ScreenHeading
        title="Subjects"
        description="Missing scores are left out of every figure; Count shows how many students each is based on."
      />
      <ChartCard
        title="Average score per subject"
        description={`The dashed line is the pass mark (${formatFixed(passMarks, 0)} of ${MAX_MARKS} marks).`}
        summary={`Average score per subject: ${statistics
          .map((item) => `${item.subject} ${one(item.mean)}`)
          .join(', ')}. Pass mark ${formatFixed(passMarks, 0)}.`}
        table={
          <TableRegion label="Average score per subject">
            <table className={tableClasses}>
              <thead className={theadClasses}>
                <tr>
                  <th scope="col" className={thClasses}>
                    Subject
                  </th>
                  <th scope="col" className={cn(thClasses, 'text-right')}>
                    Average
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line tabular-nums">
                {statistics.map((item) => (
                  <tr key={item.subject}>
                    <th scope="row" className={rowHeaderClasses}>
                      {item.subject}
                    </th>
                    <td className={cn(tdClasses, 'text-right')}>{one(item.mean)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableRegion>
        }
      >
        <ColumnChart
          categories={statistics.map((item) => item.subject)}
          series={[
            {
              id: 'mean',
              label: 'Average score',
              tone: 'chart-1',
              values: statistics.map((item) => item.mean ?? 0),
            },
          ]}
          format={(value) => formatFixed(value, 1)}
          formatTick={(value) => formatFixed(value, 0)}
          max={MAX_MARKS}
          reference={{ value: passMarks, label: `Pass mark ${formatFixed(passMarks, 0)}` }}
          capLabels
        />
      </ChartCard>
      <div className="space-y-3">
        <h3 className="font-semibold text-ink">Descriptive statistics</h3>
        <div className={highlightClasses(highlight === 'statistics')}>
          <TableRegion label="Descriptive statistics">
            <table className={cn(tableClasses, 'min-w-[48rem]')}>
              <thead className={theadClasses}>
                <tr>
                  <th scope="col" className={thClasses}>
                    Subject
                  </th>
                  {headings.map((heading) => (
                    <th key={heading} scope="col" className={cn(thClasses, 'text-right')}>
                      {heading}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-line tabular-nums">
                {statistics.map((item) => (
                  <tr key={item.subject}>
                    <th scope="row" className={rowHeaderClasses}>
                      {item.subject}
                    </th>
                    {[
                      String(item.count),
                      String(item.missing),
                      one(item.mean),
                      one(item.median),
                      one(item.stdDev),
                      one(item.min),
                      one(item.q1),
                      one(item.q3),
                      one(item.max),
                      one(item.passRate),
                    ].map((value, index) => (
                      <td key={headings[index]} className={cn(tdClasses, 'text-right')}>
                        {value}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </TableRegion>
        </div>
        <BulletList lines={explanations.subjects} />
      </div>
      <details className="rounded-xl border border-line">
        <summary className="cursor-pointer rounded-xl px-4 py-3 text-sm font-semibold text-ink hover:bg-raised/60">
          What do these statistics mean?
        </summary>
        <dl className="space-y-2 border-t border-line p-4 text-sm">
          {GLOSSARY.map(([term, meaning]) => (
            <div key={term}>
              <dt className="inline font-semibold text-ink">{term}: </dt>
              <dd className="inline text-ink-2">{meaning}</dd>
            </div>
          ))}
        </dl>
      </details>
    </div>
  );
}

function GradeChart({
  distribution,
  title,
  description,
}: {
  distribution: GradeCount[];
  title: string;
  description: string;
}) {
  return (
    <ChartCard
      title={title}
      description={description}
      summary={`${title}: ${distribution.map((item) => `${item.grade} ${item.students}`).join(', ')}.`}
      table={
        <TableRegion label={title}>
          <table className={tableClasses}>
            <thead className={theadClasses}>
              <tr>
                <th scope="col" className={thClasses}>
                  Grade
                </th>
                <th scope="col" className={cn(thClasses, 'text-right')}>
                  Students
                </th>
                <th scope="col" className={cn(thClasses, 'text-right')}>
                  Share %
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line tabular-nums">
              {distribution.map((item) => (
                <tr key={item.grade}>
                  <th scope="row" className={rowHeaderClasses}>
                    {item.grade}
                  </th>
                  <td className={cn(tdClasses, 'text-right')}>{item.students}</td>
                  <td className={cn(tdClasses, 'text-right')}>{one(item.share)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableRegion>
      }
    >
      <ColumnChart
        categories={[...GRADE_ORDER]}
        series={[
          {
            id: 'students',
            label: 'Students',
            tone: 'chart-1',
            values: distribution.map((item) => item.students),
          },
        ]}
        format={(value) => String(value)}
        integer
        capLabels
        height={180}
      />
    </ChartCard>
  );
}

function GradesScreen({ validation, analysis, highlight }: ViewProps & { analysis: Analysis }) {
  const [subject, setSubject] = useState(0);
  const rows = validation.rows ?? [];
  const subjectName = validation.subjects[subject] ?? validation.subjects[0] ?? '';
  const subjectDistribution = gradeDistribution(subjectGrades(rows, subject, PASS_MARK, MAX_MARKS));
  return (
    <div className="space-y-6">
      <ScreenHeading
        title="Grades"
        description="Overall grades use each student’s percentage; subject grades use each score as a percentage of the maximum."
      />
      <div className="grid gap-5 xl:grid-cols-2">
        <div className="space-y-3">
          <GradeChart
            distribution={analysis.distribution}
            title="Overall grade distribution"
            description="One grade per student with at least one score"
          />
          <BulletList lines={analysis.explanations.grades} />
        </div>
        <div className="space-y-3">
          <SelectField
            label="Grades in one subject"
            value={String(subject)}
            onChange={(event) => setSubject(Number(event.target.value))}
          >
            {validation.subjects.map((name, index) => (
              <option key={name} value={index}>
                {name}
              </option>
            ))}
          </SelectField>
          <GradeChart
            distribution={subjectDistribution}
            title={`Grades in ${subjectName}`}
            description={`Each score as a percentage of ${MAX_MARKS} marks, graded on the same bands`}
          />
        </div>
      </div>
      <section
        aria-labelledby="scale-heading"
        className={cn(
          'space-y-2 rounded-xl border border-line p-4',
          highlightClasses(highlight === 'scale'),
        )}
      >
        <h3 id="scale-heading" className="font-semibold text-ink">
          The grading scale
        </h3>
        <p className="text-sm text-ink-2">
          These bands come from the template’s analyzer/grading.py with a pass mark of {PASS_MARK}%.
          They are the template’s assumption, not a universal academic standard; an institution
          would change them to match its own rules.
        </p>
        <dl className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm sm:grid-cols-3">
          {describeScale(PASS_MARK).map(([grade, band]) => (
            <div key={grade} className="flex gap-2">
              <dt className="w-8 font-semibold text-ink">{grade}</dt>
              <dd className="text-ink-2">{band}</dd>
            </div>
          ))}
        </dl>
      </section>
    </div>
  );
}

function MissingScreen({ analysis }: ViewProps & { analysis: Analysis }) {
  return (
    <div className="space-y-6">
      <ScreenHeading
        title="Missing data"
        description="Empty cells and absence markers (AB, absent, -, NA) count as missing, never as zero."
      />
      <BulletList lines={analysis.explanations.missing} />
      <div className="grid gap-5 xl:grid-cols-2">
        <TableRegion label="Missing scores per subject">
          <table className={tableClasses}>
            <thead className={theadClasses}>
              <tr>
                <th scope="col" className={thClasses}>
                  Subject
                </th>
                <th scope="col" className={cn(thClasses, 'text-right')}>
                  Missing
                </th>
                <th scope="col" className={cn(thClasses, 'text-right')}>
                  Missing %
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line tabular-nums">
              {analysis.missing.map((item) => (
                <tr key={item.subject}>
                  <th scope="row" className={rowHeaderClasses}>
                    {item.subject}
                  </th>
                  <td className={cn(tdClasses, 'text-right')}>{item.missing}</td>
                  <td className={cn(tdClasses, 'text-right')}>{one(item.share)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableRegion>
        {analysis.studentsWithMissing.length > 0 ? (
          <TableRegion label="Students with missing scores">
            <table className={tableClasses}>
              <thead className={theadClasses}>
                <tr>
                  <th scope="col" className={thClasses}>
                    Student
                  </th>
                  <th scope="col" className={thClasses}>
                    Missing subjects
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {analysis.studentsWithMissing.map((item) => (
                  <tr key={item.id}>
                    <th scope="row" className={rowHeaderClasses}>
                      {item.name}
                      <span className="type-meta block font-normal">{item.id}</span>
                    </th>
                    <td className={tdClasses}>{item.missingSubjects}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableRegion>
        ) : (
          <p className="text-sm text-ink-2">No student has a missing score.</p>
        )}
      </div>
    </div>
  );
}

const RESULT_STYLES: Record<Result, string> = {
  Pass: 'text-ink',
  Fail: 'font-semibold text-danger',
  Incomplete: 'text-warn',
};

function StudentsScreen({ analysis, highlight }: ViewProps & { analysis: Analysis }) {
  const [query, setQuery] = useState('');
  const [outcome, setOutcome] = useState<'All' | Result>('All');
  const needle = query.trim().toLowerCase();
  const shown = analysis.results.filter(
    (item) =>
      (!needle ||
        item.name.toLowerCase().includes(needle) ||
        item.id.toLowerCase().includes(needle)) &&
      (outcome === 'All' || item.result === outcome),
  );
  const hasClass = analysis.classes !== null;
  return (
    <div className="space-y-5">
      <ScreenHeading
        title="Students"
        description="Percentage = total of the subjects scored ÷ (subjects scored × maximum marks) × 100. Equal percentages share a rank."
      />
      <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_12rem]">
        <TextField
          type="search"
          label="Search by name or student ID"
          placeholder="e.g. Sharma or S2026005"
          maxLength={60}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
        <SelectField
          label="Result"
          value={outcome}
          onChange={(event) => setOutcome(event.target.value as 'All' | Result)}
        >
          {(['All', 'Pass', 'Fail', 'Incomplete'] as const).map((value) => (
            <option key={value} value={value}>
              {value}
            </option>
          ))}
        </SelectField>
      </div>
      <p className="type-meta" role="status">
        Showing {shown.length} of {analysis.results.length} students
      </p>
      {shown.length === 0 ? (
        <div className="rounded-xl border border-dashed border-line-strong px-4 py-8 text-center text-sm text-ink-2">
          <p>No students match. Clear the search or choose another result.</p>
          <Button
            size="sm"
            variant="secondary"
            className="mt-3"
            onClick={() => {
              setQuery('');
              setOutcome('All');
            }}
          >
            Show every student
          </Button>
        </div>
      ) : (
        <div className={highlightClasses(highlight === 'results')}>
          <TableRegion label="Results for every student">
            <table className={cn(tableClasses, 'min-w-[46rem]')}>
              <caption className="sr-only">Results for every student, by rank</caption>
              <thead className={theadClasses}>
                <tr>
                  <th scope="col" className={cn(thClasses, 'text-right')}>
                    Rank
                  </th>
                  <th scope="col" className={thClasses}>
                    Student
                  </th>
                  {hasClass ? (
                    <th scope="col" className={thClasses}>
                      Class
                    </th>
                  ) : null}
                  <th scope="col" className={cn(thClasses, 'text-right')}>
                    Total
                  </th>
                  <th scope="col" className={cn(thClasses, 'text-right')}>
                    Percentage
                  </th>
                  <th scope="col" className={thClasses}>
                    Grade
                  </th>
                  <th scope="col" className={thClasses}>
                    Result
                  </th>
                  <th scope="col" className={thClasses}>
                    Below the pass mark in
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line tabular-nums">
                {shown.map((item) => (
                  <tr key={item.id}>
                    <td className={cn(tdClasses, 'text-right')}>{item.rank ?? '—'}</td>
                    <th scope="row" className={rowHeaderClasses}>
                      {item.name}
                      <span className="type-meta block font-normal">
                        {item.id} · {item.subjectsScored} subjects scored
                      </span>
                    </th>
                    {hasClass ? <td className={tdClasses}>{item.className}</td> : null}
                    <td className={cn(tdClasses, 'text-right')}>{one(item.total)}</td>
                    <td className={cn(tdClasses, 'text-right')}>
                      {item.percentage === null ? '—' : formatFixed(item.percentage, 2)}
                    </td>
                    <td className={tdClasses}>{item.grade ?? '—'}</td>
                    <td className={tdClasses}>
                      <span className={RESULT_STYLES[item.result]}>{item.result}</span>
                    </td>
                    <td className={tdClasses}>{item.belowPassMarkIn || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableRegion>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// The demo
// ---------------------------------------------------------------------------

function ResultsDemoView(props: Props) {
  const { state } = props;
  const validation = useMemo(() => validateResults(state.csv, MAX_MARKS), [state.csv]);
  const analysis = useMemo(() => analyse(validation, PASS_MARK, MAX_MARKS), [validation]);
  const view: ViewProps = { ...props, validation, analysis };
  if (props.feature === 'dataset') return <DatasetScreen {...view} />;
  if (!analysis) return <NotAnalysable selectFeature={props.selectFeature} />;
  switch (props.feature) {
    case 'subjects':
      return <SubjectsScreen {...view} analysis={analysis} />;
    case 'grades':
      return <GradesScreen {...view} analysis={analysis} />;
    case 'missing':
      return <MissingScreen {...view} analysis={analysis} />;
    case 'students':
      return <StudentsScreen {...view} analysis={analysis} />;
    default:
      return <OverviewScreen {...view} analysis={analysis} />;
  }
}

function isResultsState(value: unknown): value is ResultsState {
  if (typeof value !== 'object' || value === null) return false;
  const candidate = value as Partial<ResultsState>;
  return (
    candidate.version === 1 &&
    (candidate.source === 'sample' ||
      candidate.source === 'errors' ||
      candidate.source === 'custom') &&
    typeof candidate.csv === 'string' &&
    candidate.csv.length <= MAX_FILE_BYTES
  );
}

export const resultsImplementation = defineDemo<ResultsState>({
  createState: () => ({ version: 1, source: 'sample', csv: SAMPLES.sample.csv }),
  readState: (value) => (isResultsState(value) ? value : null),
  View: ResultsDemoView,
  checks: {
    validation: (state) => {
      const validation = validateResults(state.csv, MAX_MARKS);
      return validation.errors.length > 0
        ? {
            done: true,
            detail: `${validation.errors.length} errors are shown for ${state.source === 'errors' ? SAMPLES.errors.file : 'the file'}.`,
          }
        : { done: false, detail: 'The current file has no errors; choose “File with mistakes”.' };
    },
  },
  describe: (state) => {
    const validation = validateResults(state.csv, MAX_MARKS);
    const file = state.source === 'custom' ? 'Edited file' : SAMPLES[state.source].file;
    return `${file} · ${validation.ok && validation.rows ? `${validation.rows.length} students` : 'not valid yet'} · pass mark ${PASS_MARK}% · TypeScript port of the Python analyzer`;
  },
});
