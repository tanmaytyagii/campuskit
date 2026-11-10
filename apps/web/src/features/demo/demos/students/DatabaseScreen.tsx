/**
 * What is inside instance/students.db: the four tables of schema.sql as the simulation holds
 * them, how they are linked, and the statements the demo's changes would run in the real app.
 */
import { useState } from 'react';

import { SelectField } from '../../../../components/ui/Field.tsx';
import { cn } from '../../../../lib/cn.ts';
import {
  highlightClasses,
  ScreenHeading,
  StatGrid,
  StatTile,
  TableRegion,
  tableClasses,
  tdClasses,
  theadClasses,
  thClasses,
} from '../../ui.tsx';
import type { SmsState } from './model.ts';
import { Statement, type Props } from './shared.tsx';

const TABLES = {
  students: [
    'id',
    'roll_number',
    'first_name',
    'last_name',
    'email',
    'class_name',
    'admission_date',
    'status',
  ],
  courses: ['id', 'code', 'title', 'credits', 'description'],
  enrollments: ['student_id', 'course_id', 'enrolled_on'],
  attendance: ['student_id', 'course_id', 'date', 'status'],
} as const;
type TableName = keyof typeof TABLES;

const SHOWN_ROWS = 20;

/** A column's value as text (every value in these tables is a string or a number). */
function cell(value: unknown): string {
  return typeof value === 'string' || typeof value === 'number' ? String(value) : '';
}

const LINKS = [
  {
    table: 'students',
    text: 'id is an INTEGER PRIMARY KEY AUTOINCREMENT, so a deleted student’s id is never used again. roll_number and email are UNIQUE COLLATE NOCASE: 24cs001 counts as a duplicate of 24CS001.',
  },
  {
    table: 'courses',
    text: 'code is UNIQUE, and a CHECK constraint keeps credits BETWEEN 1 AND 10.',
  },
  {
    table: 'enrollments',
    text: 'Links students and courses, a many-to-many relationship. The PRIMARY KEY (student_id, course_id) allows each pair once, and both columns REFERENCE their table ON DELETE CASCADE.',
  },
  {
    table: 'attendance',
    text: 'One mark per student, course and day: PRIMARY KEY (student_id, course_id, date). Its FOREIGN KEY points at enrollments ON DELETE CASCADE, so a mark exists only for a student taking the course.',
  },
] as const;

/** The table's rows in the order the screen lists them, each as a plain record of its columns. */
function rowsOf(state: SmsState, table: TableName): Array<Record<string, unknown>> {
  switch (table) {
    case 'students':
      return [...state.students].sort((a, b) => a.id - b.id).map((row) => ({ ...row }));
    case 'courses':
      return [...state.courses].sort((a, b) => a.id - b.id).map((row) => ({ ...row }));
    case 'enrollments':
      return [...state.enrollments]
        .sort((a, b) => a.student_id - b.student_id || a.course_id - b.course_id)
        .map((row) => ({ ...row }));
    case 'attendance':
      // The newest marks first, as they are the ones the demo changes.
      return [...state.attendance]
        .sort(
          (a, b) =>
            (a.date < b.date ? 1 : a.date > b.date ? -1 : 0) ||
            a.course_id - b.course_id ||
            a.student_id - b.student_id,
        )
        .map((row) => ({ ...row }));
  }
}

export function DatabaseScreen({ state, highlight }: Props) {
  const [table, setTable] = useState<TableName>('students');
  const rows = rowsOf(state, table);
  const columns = TABLES[table];

  return (
    <div className="space-y-6">
      <ScreenHeading
        title="Database"
        description="The tables of instance/students.db as they are now, simulated in this tab, and the SQL your changes would run in the real app."
      />
      <StatGrid>
        <StatTile label="students" value={state.students.length} detail="rows" />
        <StatTile label="courses" value={state.courses.length} detail="rows" />
        <StatTile label="enrollments" value={state.enrollments.length} detail="rows" />
        <StatTile label="attendance" value={state.attendance.length} detail="rows" />
      </StatGrid>

      <section
        aria-labelledby="sms-log-heading"
        className={cn('space-y-3', highlightClasses(highlight === 'sql-log'))}
      >
        <h3 id="sms-log-heading" className="font-semibold text-ink">
          Statements, newest first
        </h3>
        <p className="text-sm text-ink-2">
          Every value is passed as a parameter for a ? placeholder, never pasted into the SQL text,
          which is how repository.py prevents SQL injection.
        </p>
        {state.log.length > 0 ? (
          <ol className="divide-y divide-line rounded-xl border border-line">
            {state.log.map((entry, index) => (
              <li key={`${state.log.length - index}`} className="p-4">
                <Statement entry={entry} />
              </li>
            ))}
          </ol>
        ) : (
          <p className="rounded-xl border border-dashed border-line-strong px-4 py-6 text-sm text-ink-2">
            No statements yet. Add, change or delete something on the other screens, and the
            statements the real app would run appear here.
          </p>
        )}
      </section>

      <section aria-labelledby="sms-tables-heading" className="space-y-3">
        <h3 id="sms-tables-heading" className="font-semibold text-ink">
          Tables
        </h3>
        <SelectField
          label="Table"
          value={table}
          containerClassName="max-w-xs"
          onChange={(event) => setTable(event.target.value as TableName)}
        >
          {Object.keys(TABLES).map((name) => (
            <option key={name} value={name}>
              {name}
            </option>
          ))}
        </SelectField>
        <p className="type-meta" role="status">
          {rows.length > SHOWN_ROWS
            ? `Showing ${SHOWN_ROWS} of ${rows.length} rows${table === 'attendance' ? ', newest first' : ''}.`
            : `${rows.length} ${rows.length === 1 ? 'row' : 'rows'}.`}
          {table === 'students'
            ? ' The real table also has created_at and updated_at, which this simulation leaves out.'
            : ''}
        </p>
        {rows.length > 0 ? (
          <TableRegion label={`The ${table} table`}>
            <table className={cn(tableClasses, 'font-mono text-xs')}>
              <thead className={theadClasses}>
                <tr>
                  {columns.map((column) => (
                    <th key={column} scope="col" className={thClasses}>
                      {column}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {rows.slice(0, SHOWN_ROWS).map((row) => (
                  <tr key={columns.map((column) => cell(row[column])).join('|')}>
                    {columns.map((column) => {
                      const value = row[column];
                      return (
                        <td key={column} className={cn(tdClasses, 'whitespace-nowrap')}>
                          {value === null ? <span className="text-ink-3">NULL</span> : cell(value)}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </TableRegion>
        ) : null}
      </section>

      <section aria-labelledby="sms-links-heading" className="space-y-3">
        <h3 id="sms-links-heading" className="font-semibold text-ink">
          Keys and constraints in schema.sql
        </h3>
        <dl className="space-y-3 text-sm">
          {LINKS.map((link) => (
            <div key={link.table}>
              <dt className="font-mono text-xs font-semibold text-ink">{link.table}</dt>
              <dd className="mt-0.5 text-ink-2">{link.text}</dd>
            </div>
          ))}
        </dl>
        <p className="text-sm text-ink-2">
          SQLite checks foreign keys only when PRAGMA foreign_keys = ON, which connect() in
          studentms/db.py sets for every connection.
        </p>
      </section>
    </div>
  );
}
