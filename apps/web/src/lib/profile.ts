/**
 * The student's profile and preferences, saved in this browser only under campuskit:profile:v1:
 * an optional first name, their level, the topics they're interested in, and whether they have
 * finished or skipped the welcome guide. Everything is optional and can be changed in Settings.
 * The profile picks recommended templates by written rules; nothing is sent anywhere.
 */
import { catalog, DIFFICULTY_RANK, type ProjectManifest } from '@campuskit/project-catalog';
import { useSyncExternalStore } from 'react';

import { readStored, writeStored } from './storage.ts';

export const PROFILE_KEY = 'campuskit:profile:v1';

export const LEVELS = ['school', 'undergraduate', 'postgraduate', 'self-taught'] as const;
export type Level = (typeof LEVELS)[number];
export const LEVEL_LABELS: Record<Level, string> = {
  school: 'School',
  undergraduate: 'Undergraduate (diploma, BCA, BTech, BSc)',
  postgraduate: 'Postgraduate (MCA, MTech, MSc)',
  'self-taught': 'Learning on my own',
};

export const INTERESTS = ['web', 'python', 'javascript', 'databases', 'data', 'ai-ml'] as const;
export type Interest = (typeof INTERESTS)[number];
export const INTEREST_LABELS: Record<Interest, string> = {
  web: 'Websites and web apps',
  python: 'Python',
  javascript: 'JavaScript and TypeScript',
  databases: 'Databases and SQL',
  data: 'Data analysis',
  'ai-ml': 'AI and machine learning',
};

export interface Profile {
  version: 1;
  /** A first name for greetings, or empty. */
  name: string;
  level: Level | null;
  interests: Interest[];
  /** Finished or skipped the welcome guide, so it isn't offered again. */
  onboarded: boolean;
}

export const EMPTY_PROFILE: Profile = {
  version: 1,
  name: '',
  level: null,
  interests: [],
  onboarded: false,
};
export const MAX_NAME = 60;

export function isProfile(value: unknown): value is Profile {
  if (typeof value !== 'object' || value === null) return false;
  const candidate = value as Partial<Profile>;
  return (
    candidate.version === 1 &&
    typeof candidate.name === 'string' &&
    candidate.name.length <= MAX_NAME &&
    (candidate.level === null || (LEVELS as readonly unknown[]).includes(candidate.level)) &&
    Array.isArray(candidate.interests) &&
    candidate.interests.every((item) => (INTERESTS as readonly unknown[]).includes(item)) &&
    typeof candidate.onboarded === 'boolean'
  );
}

let current: Profile | null = null;
const listeners = new Set<() => void>();

export const profileStore = {
  getSnapshot: (): Profile => {
    current ??= readStored(PROFILE_KEY, isProfile) ?? EMPTY_PROFILE;
    return current;
  },
  subscribe: (listener: () => void): (() => void) => {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
  /** Saves a change; returns false when the browser refused to store it. */
  update: (change: (profile: Profile) => Profile): boolean => {
    const next = change(profileStore.getSnapshot());
    current = {
      ...next,
      name: next.name.trim().slice(0, MAX_NAME),
      interests: [...new Set(next.interests)],
    };
    const saved = writeStored(PROFILE_KEY, current);
    for (const listener of listeners) listener();
    return saved;
  },
  reload: (): void => {
    current = null;
    for (const listener of listeners) listener();
  },
};

export function useProfile(): Profile {
  return useSyncExternalStore(
    profileStore.subscribe,
    profileStore.getSnapshot,
    () => EMPTY_PROFILE,
  );
}

const INTEREST_MATCHES: Record<Interest, (project: ProjectManifest) => boolean> = {
  web: (project) => project.category === 'web-development',
  python: (project) => project.languages.includes('Python'),
  javascript: (project) =>
    project.languages.some((language) => ['JavaScript', 'TypeScript'].includes(language)),
  databases: (project) =>
    project.stack.persistence === 'database' || project.languages.includes('SQL'),
  data: (project) => project.category === 'data-analysis',
  'ai-ml': (project) => project.category === 'ai-ml',
};

export interface Recommendation {
  project: ProjectManifest;
  /** Why it was picked, in words the student can check. */
  reasons: string[];
}

/**
 * Templates for the profile, best first, by written rules: one point for each interest a
 * template matches, and a point when its difficulty suits the level (beginner for school,
 * intermediate or below for everyone else). Templates matching nothing are left out, unless no
 * interest was chosen, when all are offered by difficulty.
 */
export function recommendTemplates(
  profile: Profile,
  projects: readonly ProjectManifest[] = catalog,
): Recommendation[] {
  const easiest = profile.level === 'school' ? 'beginner' : 'intermediate';
  const scored = projects.map((project) => {
    const reasons = profile.interests
      .filter((interest) => INTEREST_MATCHES[interest](project))
      .map((interest) => `Matches your interest: ${INTEREST_LABELS[interest]}`);
    const suits = DIFFICULTY_RANK[project.difficulty] <= DIFFICULTY_RANK[easiest];
    if (profile.level && suits)
      reasons.push(`Its difficulty (${project.difficulty}) suits your level`);
    return { project, reasons, interestMatches: reasons.length - (profile.level && suits ? 1 : 0) };
  });
  return scored
    .filter((item) => profile.interests.length === 0 || item.interestMatches > 0)
    .sort(
      (a, b) =>
        b.reasons.length - a.reasons.length ||
        DIFFICULTY_RANK[a.project.difficulty] - DIFFICULTY_RANK[b.project.difficulty] ||
        a.project.name.localeCompare(b.project.name),
    )
    .map(({ project, reasons }) => ({ project, reasons }));
}
