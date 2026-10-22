/**
 * Dates are stored as local "YYYY-MM-DD" strings and months as "YYYY-MM".
 * Building them from local date parts (not `toISOString()`, which is UTC)
 * keeps late-evening transactions on the correct day in every time zone.
 */

const DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

export function toDateKey(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

export function todayKey(now: Date = new Date()): string {
  return toDateKey(now);
}

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

export function formatDateKey(key: string): string {
  const date = parseDateKey(key);
  return date ? new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(date) : key;
}

/** "2026-10-21" -> "2026-10" */
export function monthKeyOf(dateKey: string): string {
  return dateKey.slice(0, 7);
}

/** Moves a month key by `delta` months: addMonths("2026-01", -1) === "2025-12". */
export function addMonths(monthKey: string, delta: number): string {
  const [year, month] = monthKey.split('-').map(Number);
  const date = new Date(year ?? 1970, (month ?? 1) - 1 + delta, 1);
  return toDateKey(date).slice(0, 7);
}

export function monthLabel(monthKey: string, style: 'short' | 'long' = 'short'): string {
  const [year, month] = monthKey.split('-').map(Number);
  const date = new Date(year ?? 1970, (month ?? 1) - 1, 1);
  return new Intl.DateTimeFormat(
    undefined,
    style === 'short' ? { month: 'short' } : { month: 'long', year: 'numeric' },
  ).format(date);
}

export function firstDayOfMonth(monthKey: string): string {
  return `${monthKey}-01`;
}

export function lastDayOfMonth(monthKey: string): string {
  const [year, month] = monthKey.split('-').map(Number);
  return toDateKey(new Date(year ?? 1970, month ?? 1, 0));
}

export function addDays(dateKey: string, delta: number): string {
  const date = parseDateKey(dateKey) ?? new Date();
  date.setDate(date.getDate() + delta);
  return toDateKey(date);
}
