/**
 * Learning progress saved in this browser only: which checklist items and
 * demonstration steps are done, and how the student rated each viva answer.
 * Nothing here is sent anywhere, and answers the student types are never
 * saved, only their own ratings. Every value is checked when it is read, so
 * an edited or outdated entry is ignored instead of breaking the page.
 */
import { readStored, removeStored, writeStored } from './storage.ts';

const KEYS = {
  checklist: (projectId: string) => `campuskit:checklist:v1:${projectId}`,
  demo: (projectId: string) => `campuskit:demo:v1:${projectId}`,
  viva: (projectId: string) => `campuskit:viva:v1:${projectId}`,
} as const;

export type ProgressKind = keyof typeof KEYS;

// ---------------------------------------------------------------------------
// Ticked lists (the learning checklist and the demonstration checklist)
// ---------------------------------------------------------------------------

interface TickedList {
  version: 1;
  done: string[];
}

function isTickedList(value: unknown): value is TickedList {
  if (typeof value !== 'object' || value === null) return false;
  const candidate = value as Partial<TickedList>;
  return (
    candidate.version === 1 &&
    Array.isArray(candidate.done) &&
    candidate.done.every((id) => typeof id === 'string')
  );
}

/** The ids that are ticked, limited to ids that still exist. */
export function readTicked(
  kind: 'checklist' | 'demo',
  projectId: string,
  validIds: readonly string[],
): Set<string> {
  const stored = readStored(KEYS[kind](projectId), isTickedList);
  const valid = new Set(validIds);
  return new Set((stored?.done ?? []).filter((id) => valid.has(id)));
}

export function writeTicked(
  kind: 'checklist' | 'demo',
  projectId: string,
  done: Set<string>,
): void {
  writeStored(KEYS[kind](projectId), { version: 1, done: [...done].sort() } satisfies TickedList);
}

// ---------------------------------------------------------------------------
// Viva practice
// ---------------------------------------------------------------------------

export const RATINGS = ['not-yet', 'partly', 'confident'] as const;
export type Rating = (typeof RATINGS)[number];

export const RATING_LABELS: Record<Rating, string> = {
  'not-yet': 'Not yet',
  partly: 'Partly',
  confident: 'Confident',
};

export const CRITERIA = ['correctness', 'understanding', 'clarity', 'limitations'] as const;
export type Criterion = (typeof CRITERIA)[number];

export const CRITERIA_LABELS: Record<Criterion, string> = {
  correctness: 'Correctness',
  understanding: 'Conceptual understanding',
  clarity: 'Explanation clarity',
  limitations: 'Awareness of limitations',
};

export const CRITERIA_QUESTIONS: Record<Criterion, string> = {
  correctness: 'Did your answer say what the project actually does?',
  understanding: 'Could you explain why it works that way, not only what it does?',
  clarity: 'Would an examiner follow your explanation without the code in front of them?',
  limitations: 'Did you mention the trade-offs or limits where they matter?',
};

export type Outcome = 'confident' | 'partly' | 'missed';

export const OUTCOME_LABELS: Record<Outcome, string> = {
  confident: 'Confident',
  partly: 'Needs a little more work',
  missed: 'Review again',
};

export type Ratings = Record<Criterion, Rating>;

export interface QuestionProgress {
  outcome: Outcome;
  ratings: Ratings;
  attempts: number;
  /** YYYY-MM-DD in the student's time zone. */
  lastPracticed: string;
}

export interface VivaProgress {
  version: 1;
  questions: Record<string, QuestionProgress>;
}

/**
 * The rule, shown to students as it is: any “Not yet” means the question is
 * reviewed again, any “Partly” means it needs a little more work, and only
 * four “Confident” ratings count as confident.
 */
export function outcomeFor(ratings: Ratings): Outcome {
  const values = CRITERIA.map((criterion) => ratings[criterion]);
  if (values.includes('not-yet')) return 'missed';
  if (values.includes('partly')) return 'partly';
  return 'confident';
}

function isRatings(value: unknown): value is Ratings {
  if (typeof value !== 'object' || value === null) return false;
  return CRITERIA.every((criterion) =>
    (RATINGS as readonly unknown[]).includes((value as Record<string, unknown>)[criterion]),
  );
}

function isQuestionProgress(value: unknown): value is QuestionProgress {
  if (typeof value !== 'object' || value === null) return false;
  const candidate = value as Partial<QuestionProgress>;
  return (
    isRatings(candidate.ratings) &&
    candidate.outcome === outcomeFor(candidate.ratings) &&
    typeof candidate.attempts === 'number' &&
    Number.isInteger(candidate.attempts) &&
    candidate.attempts >= 1 &&
    typeof candidate.lastPracticed === 'string' &&
    /^\d{4}-\d{2}-\d{2}$/.test(candidate.lastPracticed)
  );
}

function isVivaProgress(value: unknown): value is VivaProgress {
  if (typeof value !== 'object' || value === null) return false;
  const candidate = value as Partial<VivaProgress>;
  return (
    candidate.version === 1 &&
    typeof candidate.questions === 'object' &&
    candidate.questions !== null &&
    !Array.isArray(candidate.questions)
  );
}

export const EMPTY_VIVA_PROGRESS: VivaProgress = { version: 1, questions: {} };

/** Saved ratings for questions that still exist; anything malformed is dropped. */
export function readVivaProgress(projectId: string, validIds: readonly string[]): VivaProgress {
  const stored = readStored(KEYS.viva(projectId), isVivaProgress);
  if (!stored) return EMPTY_VIVA_PROGRESS;
  const valid = new Set(validIds);
  const questions: Record<string, QuestionProgress> = {};
  for (const [id, entry] of Object.entries(stored.questions)) {
    if (valid.has(id) && isQuestionProgress(entry)) questions[id] = entry;
  }
  return { version: 1, questions };
}

export function writeVivaProgress(projectId: string, progress: VivaProgress): void {
  writeStored(KEYS.viva(projectId), progress);
}

export function recordRatings(
  progress: VivaProgress,
  questionId: string,
  ratings: Ratings,
  today: string,
): VivaProgress {
  const previous = progress.questions[questionId];
  return {
    version: 1,
    questions: {
      ...progress.questions,
      [questionId]: {
        outcome: outcomeFor(ratings),
        ratings: { ...ratings },
        attempts: (previous?.attempts ?? 0) + 1,
        lastPracticed: today,
      },
    },
  };
}

export interface VivaSummary {
  total: number;
  practised: number;
  confident: number;
  partly: number;
  missed: number;
}

export function summarizeViva(progress: VivaProgress, questionIds: readonly string[]): VivaSummary {
  const summary: VivaSummary = {
    total: questionIds.length,
    practised: 0,
    confident: 0,
    partly: 0,
    missed: 0,
  };
  for (const id of questionIds) {
    const entry = progress.questions[id];
    if (!entry) continue;
    summary.practised += 1;
    summary[entry.outcome] += 1;
  }
  return summary;
}

// ---------------------------------------------------------------------------
// Resetting
// ---------------------------------------------------------------------------

export function resetProgress(kind: ProgressKind, projectId: string): void {
  removeStored(KEYS[kind](projectId));
}

/** Clears the checklist, demonstration steps and viva ratings for one project. */
export function resetAllProgress(projectId: string): void {
  for (const kind of Object.keys(KEYS) as ProgressKind[]) resetProgress(kind, projectId);
}
