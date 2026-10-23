/**
 * Choosing viva questions and checking an answer for key ideas. Everything
 * is deterministic local logic: there is no AI and nothing leaves the page.
 */
import type { VivaCategory, VivaQuestion } from '@campuskit/project-catalog';

import type { VivaProgress } from '../../lib/progress.ts';

export const QUICK_PRACTICE_SIZE = 5;

export type PracticeMode =
  | { kind: 'quick' }
  | { kind: 'topic'; category: VivaCategory }
  | { kind: 'mixed' }
  | { kind: 'review' };

/** Fisher–Yates shuffle; `random` is injectable so tests are repeatable. */
export function shuffle<T>(items: readonly T[], random: () => number = Math.random): T[] {
  const copy = [...items];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const other = Math.floor(random() * (index + 1));
    [copy[index], copy[other]] = [copy[other] as T, copy[index] as T];
  }
  return copy;
}

/** Lower numbers come first in quick practice. */
function priority(progress: VivaProgress, id: string): number {
  const outcome = progress.questions[id]?.outcome;
  if (outcome === 'missed') return 0;
  if (outcome === undefined) return 1;
  if (outcome === 'partly') return 2;
  return 3;
}

/** Questions that still need work: “Review again” first, then “Needs a little more work”. */
export function reviewQuestions(
  questions: readonly VivaQuestion[],
  progress: VivaProgress,
): VivaQuestion[] {
  return questions
    .filter((question) => {
      const outcome = progress.questions[question.id]?.outcome;
      return outcome === 'missed' || outcome === 'partly';
    })
    .sort((a, b) => priority(progress, a.id) - priority(progress, b.id));
}

export function selectQuestions(
  questions: readonly VivaQuestion[],
  progress: VivaProgress,
  mode: PracticeMode,
  random: () => number = Math.random,
): VivaQuestion[] {
  switch (mode.kind) {
    case 'quick': {
      // Shuffle first so questions with the same priority come in a different order each time.
      const ranked = shuffle(questions, random).sort((a, b) => {
        const byPriority = priority(progress, a.id) - priority(progress, b.id);
        if (byPriority !== 0) return byPriority;
        const aDate = progress.questions[a.id]?.lastPracticed ?? '';
        const bDate = progress.questions[b.id]?.lastPracticed ?? '';
        return aDate < bDate ? -1 : aDate > bDate ? 1 : 0;
      });
      return ranked.slice(0, QUICK_PRACTICE_SIZE);
    }
    case 'topic':
      return shuffle(
        questions.filter((question) => question.category === mode.category),
        random,
      );
    case 'mixed':
      return shuffle(questions, random);
    case 'review':
      return reviewQuestions(questions, progress);
  }
}

// ---------------------------------------------------------------------------
// Key ideas
// ---------------------------------------------------------------------------

function normalize(text: string): string {
  return text
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/\s+/g, ' ');
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Whether `answer` contains `term` at the start of a word. Short terms (three
 * characters or fewer) must be a whole word, so “ab” doesn't match “table”;
 * longer terms may be the start of a word, so “categor” matches “categories”.
 */
export function mentions(answer: string, term: string): boolean {
  const needle = normalize(term.trim());
  if (!needle) return false;
  const start = '(^|[^a-z0-9])';
  const pattern =
    needle.length <= 3
      ? new RegExp(`${start}${escapeRegExp(needle)}($|[^a-z0-9])`)
      : new RegExp(`${start}${escapeRegExp(needle)}`);
  return pattern.test(normalize(answer));
}

export interface ConceptCheck {
  label: string;
  mentioned: boolean;
}

/** For each key idea, whether the answer mentions any of its words. */
export function checkConcepts(
  answer: string,
  concepts: VivaQuestion['keyConcepts'],
): ConceptCheck[] {
  return concepts.map((concept) => ({
    label: concept.label,
    mentioned: concept.terms.some((term) => mentions(answer, term)),
  }));
}
