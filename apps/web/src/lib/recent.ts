/**
 * Pages the student visited recently, newest first, for the command palette and the dashboard.
 * Saved in this browser only, under campuskit:recent:v1; only the address and the page title.
 */
import { readStored, writeStored } from './storage.ts';

export const RECENT_KEY = 'campuskit:recent:v1';
export const MAX_RECENT = 8;

export interface RecentPage {
  /** Path and query, inside the site (for example /projects/expense-tracker/viva). */
  path: string;
  title: string;
  /** ISO date and time of the visit. */
  at: string;
}

function isRecentList(value: unknown): value is RecentPage[] {
  return (
    Array.isArray(value) &&
    value.every(
      (entry: unknown) =>
        typeof entry === 'object' &&
        entry !== null &&
        typeof (entry as RecentPage).path === 'string' &&
        (entry as RecentPage).path.startsWith('/') &&
        typeof (entry as RecentPage).title === 'string' &&
        typeof (entry as RecentPage).at === 'string',
    )
  );
}

export function readRecent(): RecentPage[] {
  return (readStored(RECENT_KEY, isRecentList) ?? []).slice(0, MAX_RECENT);
}

/** Puts the page first; a page already in the list moves up instead of appearing twice. */
export function recordVisit(path: string, title: string, at: string): void {
  if (!path.startsWith('/') || path.startsWith('//')) return;
  const entry = { path, title: title.slice(0, 120), at };
  writeStored(
    RECENT_KEY,
    [entry, ...readRecent().filter((page) => page.path !== path)].slice(0, MAX_RECENT),
  );
}
