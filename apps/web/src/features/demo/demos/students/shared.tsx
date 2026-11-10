/** Pieces shared by the student management demo's screens. */
import { Badge } from '../../../../components/ui/Badge.tsx';
import type { DemoViewProps } from '../../types.ts';
import {
  isoDay,
  percent,
  type SmsState,
  type SqlEntry,
  type Student,
  type StudentStatus,
} from './model.ts';

export type Props = DemoViewProps<SmsState>;

/** students_per_page in the template's app_config.json. */
export const PER_PAGE = 10;

/** Today on this computer, as YYYY-MM-DD: the day the template's views would use. */
export function today(): string {
  return isoDay(new Date());
}

export function fullName(student: Pick<Student, 'first_name' | 'last_name'>): string {
  return `${student.first_name} ${student.last_name}`;
}

export function plural(count: number, one: string, many: string): string {
  return `${count} ${count === 1 ? one : many}`;
}

/** The template's percent macro: one decimal place, or “No marks yet” when nothing was marked. */
export function rateLabel(part: number, whole: number): string {
  const value = percent(part, whole);
  return value === null ? 'No marks yet' : `${value.toFixed(1)}%`;
}

/** A day as the template prints it, e.g. “Friday 30 October 2026”. */
export function longDay(day: string): string {
  const [year, month, date] = day.split('-').map(Number) as [number, number, number];
  return new Date(year, month - 1, date).toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

export const STATUS_LABELS: Record<StudentStatus, string> = {
  active: 'Active',
  inactive: 'Inactive',
  graduated: 'Graduated',
};

export function StatusBadge({ status }: { status: StudentStatus }) {
  return (
    <Badge tone={status === 'active' ? 'violet' : status === 'graduated' ? 'neutral' : 'outline'}>
      {STATUS_LABELS[status]}
    </Badge>
  );
}

/** Moves focus to the first field, in form order, that has an error. Fields are found by name. */
export function focusFirstError(
  form: HTMLFormElement,
  names: readonly string[],
  errors: Record<string, string>,
) {
  const first = names.find((name) => errors[name]);
  const control = first ? form.elements.namedItem(first) : null;
  if (control instanceof HTMLElement) control.focus();
}

/** The values for the ? placeholders, written the way Python shows a tuple. */
export function pythonTuple(parameters: SqlEntry['parameters']): string {
  const values = parameters.map((value) => {
    if (value === null) return 'None';
    if (typeof value === 'number') return String(value);
    const escaped = value.replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/\t/g, '\\t');
    return escaped.includes("'") && !escaped.includes('"')
      ? `"${escaped}"`
      : `'${escaped.replace(/'/g, "\\'")}'`;
  });
  return `(${values.join(', ')}${values.length === 1 ? ',' : ''})`;
}

/** One statement from the log: the SQL, its parameters and what the database did. */
export function Statement({ entry }: { entry: SqlEntry }) {
  const refused = entry.result.startsWith('refused');
  return (
    <div className="space-y-1.5">
      <code className="block font-mono text-xs leading-relaxed break-words text-ink">
        {entry.sql}
      </code>
      <p className="font-mono text-xs break-words text-ink-2">
        {entry.rows === undefined
          ? `parameters: ${pythonTuple(entry.parameters)}`
          : `executemany() with ${plural(entry.rows, 'row', 'rows')} of parameters${
              entry.parameters.length > 0 ? `, the first ${pythonTuple(entry.parameters)}` : ''
            }`}
      </p>
      <p className={refused ? 'text-xs font-semibold text-danger' : 'text-xs text-ink-2'}>
        {entry.result}
      </p>
    </div>
  );
}

/** The statement behind the latest change, under the screen that made it. */
export function LastStatement({ state }: { state: SmsState }) {
  const entry = state.log[0];
  if (!entry) return null;
  return (
    <div className="rounded-xl border border-line bg-raised/60 p-4">
      <p className="type-meta mb-2">The SQL the real app runs for the last change</p>
      <Statement entry={entry} />
    </div>
  );
}
