/**
 * A log of viva practice: which question was rated, the outcome and the day. It feeds the
 * progress page (history and statistics). Only the student's own ratings are logged, never
 * what they typed, and it is saved in this browser only under campuskit:viva-log:v1.
 */
import type { Outcome } from './progress.ts';
import { readStored, writeStored } from './storage.ts';

export const VIVA_LOG_KEY = 'campuskit:viva-log:v1';
/** Years of daily practice; the oldest entries are dropped beyond this. */
export const MAX_LOG = 3000;

export interface LogEntry {
  projectId: string;
  questionId: string;
  outcome: Outcome;
  /** YYYY-MM-DD in the student's time zone. */
  on: string;
  /** Rated during a mock viva. */
  mock: boolean;
}

const OUTCOMES: readonly string[] = ['confident', 'partly', 'missed'];

export function isLogEntry(value: unknown): value is LogEntry {
  if (typeof value !== 'object' || value === null) return false;
  const entry = value as Partial<LogEntry>;
  return (
    typeof entry.projectId === 'string' &&
    typeof entry.questionId === 'string' &&
    typeof entry.outcome === 'string' &&
    OUTCOMES.includes(entry.outcome) &&
    typeof entry.on === 'string' &&
    /^\d{4}-\d{2}-\d{2}$/.test(entry.on) &&
    typeof entry.mock === 'boolean'
  );
}

/** The log, oldest first; entries that can't be read are skipped. */
export function readLog(): LogEntry[] {
  const stored =
    readStored(VIVA_LOG_KEY, (value): value is unknown[] => Array.isArray(value)) ?? [];
  return stored.filter(isLogEntry);
}

export function appendLog(entry: LogEntry): void {
  writeStored(VIVA_LOG_KEY, [...readLog(), entry].slice(-MAX_LOG));
}

export interface DayCount {
  day: string;
  rated: number;
  confident: number;
}

/** Ratings per day for the last `days` days up to `today`, oldest first, zeros included. */
export function dailyCounts(
  log: readonly LogEntry[],
  today: string,
  days: number,
  projectId?: string,
): DayCount[] {
  const result: DayCount[] = [];
  const [year, month, date] = today.split('-').map(Number) as [number, number, number];
  for (let offset = days - 1; offset >= 0; offset -= 1) {
    const day = new Date(Date.UTC(year, month - 1, date - offset)).toISOString().slice(0, 10);
    const entries = log.filter(
      (entry) => entry.on === day && (!projectId || entry.projectId === projectId),
    );
    result.push({
      day,
      rated: entries.length,
      confident: entries.filter((entry) => entry.outcome === 'confident').length,
    });
  }
  return result;
}
