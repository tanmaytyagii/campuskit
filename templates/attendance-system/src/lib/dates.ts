/**
 * Dates are stored as local "YYYY-MM-DD" strings. Using local dates (not
 * `toISOString()`, which is UTC) means attendance marked late in the evening
 * is saved for the correct day in every time zone.
 */

const DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

export function toDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function todayKey(now: Date = new Date()): string {
  return toDateKey(now);
}

/** Parses "YYYY-MM-DD" as a local date; returns null for invalid dates. */
export function parseDateKey(key: string): Date | null {
  const match = DATE_PATTERN.exec(key);
  if (!match) return null;
  const [, year, month, day] = match;
  const date = new Date(Number(year), Number(month) - 1, Number(day));
  return toDateKey(date) === key ? date : null;
}

export function isValidDateKey(key: string): boolean {
  return parseDateKey(key) !== null;
}

export function formatDateKey(key: string, style: 'medium' | 'long' = 'medium'): string {
  const date = parseDateKey(key);
  if (!date) return key;
  return new Intl.DateTimeFormat(undefined, { dateStyle: style }).format(date);
}

/** The `count` most recent weekdays (Mon–Fri) before `reference`, oldest first. */
export function previousWeekdays(reference: Date, count: number): string[] {
  const days: string[] = [];
  const cursor = new Date(reference.getFullYear(), reference.getMonth(), reference.getDate());
  while (days.length < count) {
    cursor.setDate(cursor.getDate() - 1);
    const weekday = cursor.getDay();
    if (weekday !== 0 && weekday !== 6) days.push(toDateKey(cursor));
  }
  return days.reverse();
}
