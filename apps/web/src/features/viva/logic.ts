/**
 * Choosing viva questions and checking an answer for key ideas. Everything
 * is deterministic local logic: there is no AI and nothing leaves the page.
 */
import { VIVA_CATEGORIES, type VivaCategory, type VivaQuestion } from '@campuskit/project-catalog';

import { streakOf, type QuestionProgress, type VivaProgress } from '../../lib/progress.ts';

export const QUICK_PRACTICE_SIZE = 5;

export type PracticeMode =
  | { kind: 'quick' }
  | { kind: 'topic'; category: VivaCategory }
  | { kind: 'mixed' }
  | { kind: 'review' }
  /** Spaced review: the questions whose next review date has come. */
  | { kind: 'due' }
  /** A timed run across topics, the way an examiner asks. */
  | { kind: 'mock' }
  /** Questions chosen elsewhere, for example by a Demo Studio screen, in that order. */
  | { kind: 'selected'; ids: readonly string[] };

/** Valid, distinct question ids from a "?questions=a,b" parameter, at most ten. */
export function selectedQuestionIds(
  value: string | null,
  questions: readonly VivaQuestion[],
): string[] {
  if (!value) return [];
  const known = new Set(questions.map((question) => question.id));
  return [...new Set(value.split(',').map((id) => id.trim()))]
    .filter((id) => known.has(id))
    .slice(0, 10);
}

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

// ---------------------------------------------------------------------------
// Spaced review
// ---------------------------------------------------------------------------

/** Days until a confident question comes back, by how many days in a row it was confident. */
export const CONFIDENT_INTERVALS = [3, 7, 14, 30] as const;

/**
 * How many days after it was last practised a question is due again. The rule is shown to
 * students as it is: “Not yet” on any criterion brings it back the next day, “Partly” after two
 * days, and confident answers wait longer each time they stay confident: 3, 7, 14, then 30 days.
 */
export function intervalDays(entry: QuestionProgress): number {
  if (entry.outcome === 'missed') return 1;
  if (entry.outcome === 'partly') return 2;
  const streak = Math.max(1, streakOf(entry));
  return CONFIDENT_INTERVALS[Math.min(streak, CONFIDENT_INTERVALS.length) - 1] ?? 30;
}

/** YYYY-MM-DD plus whole days, in calendar dates (no time zone or daylight-saving effects). */
export function addDays(day: string, days: number): string {
  const [year, month, date] = day.split('-').map(Number) as [number, number, number];
  return new Date(Date.UTC(year, month - 1, date + days)).toISOString().slice(0, 10);
}

export function dueDate(entry: QuestionProgress): string {
  return addDays(entry.lastPracticed, intervalDays(entry));
}

/**
 * Practised questions whose review date is today or earlier: the longest overdue first, and on
 * the same date, “Review again” before “Needs a little more work” before confident ones.
 * Questions never practised aren't due; quick practice offers them.
 */
export function dueQuestions(
  questions: readonly VivaQuestion[],
  progress: VivaProgress,
  today: string,
): VivaQuestion[] {
  const due = questions.flatMap((question) => {
    const entry = progress.questions[question.id];
    return entry && dueDate(entry) <= today ? [{ question, date: dueDate(entry) }] : [];
  });
  return due
    .sort(
      (a, b) =>
        (a.date < b.date ? -1 : a.date > b.date ? 1 : 0) ||
        priority(progress, a.question.id) - priority(progress, b.question.id),
    )
    .map(({ question }) => question);
}

/** The earliest review date after today, or null when nothing has been practised. */
export function nextReviewDate(
  questions: readonly VivaQuestion[],
  progress: VivaProgress,
  today: string,
): string | null {
  const dates = questions
    .map((question) => progress.questions[question.id])
    .filter((entry) => entry !== undefined)
    .map(dueDate)
    .filter((date) => date > today)
    .sort();
  return dates[0] ?? null;
}

export function selectQuestions(
  questions: readonly VivaQuestion[],
  progress: VivaProgress,
  mode: PracticeMode,
  random: () => number = Math.random,
  today = '',
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
    case 'due':
      return dueQuestions(questions, progress, today);
    case 'mock':
      return mockQuestions(questions, progress, random);
    case 'selected':
      return mode.ids
        .map((id) => questions.find((question) => question.id === id))
        .filter((question) => question !== undefined);
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

// ---------------------------------------------------------------------------
// Mock viva and weak topics
// ---------------------------------------------------------------------------

export const MOCK_SIZE = 8;
/** A guide for each answer, shown as a countdown; nothing happens automatically when it ends. */
export const MOCK_SECONDS = 120;

/**
 * Questions for a mock viva: taken from each topic in turn, as an examiner moves between topics,
 * and within a topic the ones that need work first (“Review again”, then never practised, then
 * “Needs a little more work”, then confident), with ties in random order.
 */
export function mockQuestions(
  questions: readonly VivaQuestion[],
  progress: VivaProgress,
  random: () => number = Math.random,
  size: number = MOCK_SIZE,
): VivaQuestion[] {
  const byTopic = VIVA_CATEGORIES.map((category) =>
    shuffle(
      questions.filter((question) => question.category === category),
      random,
    ).sort((a, b) => priority(progress, a.id) - priority(progress, b.id)),
  ).filter((list) => list.length > 0);
  const picked: VivaQuestion[] = [];
  for (let round = 0; picked.length < size; round += 1) {
    const before = picked.length;
    for (const list of byTopic) {
      const question = list[round];
      if (question && picked.length < size) picked.push(question);
    }
    if (picked.length === before) break;
  }
  return picked;
}

export interface TopicStats {
  category: VivaCategory;
  total: number;
  practised: number;
  confident: number;
  /** Practised but rated below confident. */
  needsWork: number;
}

/** Practice by topic, from the student's own ratings; only topics the guide has. */
export function topicStats(
  questions: readonly VivaQuestion[],
  progress: VivaProgress,
): TopicStats[] {
  return VIVA_CATEGORIES.map((category) => {
    const inTopic = questions.filter((question) => question.category === category);
    const entries = inTopic
      .map((question) => progress.questions[question.id])
      .filter((entry) => entry !== undefined);
    const confident = entries.filter((entry) => entry.outcome === 'confident').length;
    return {
      category,
      total: inTopic.length,
      practised: entries.length,
      confident,
      needsWork: entries.length - confident,
    };
  }).filter((stats) => stats.total > 0);
}

/**
 * Weak topics: practised ones where at least half of the practised questions are below
 * confident. A topic never practised is listed apart, as “not practised yet”, not as weak:
 * opening a question or not opening it says nothing about knowing it.
 */
export function weakTopics(stats: readonly TopicStats[]): TopicStats[] {
  return stats
    .filter((topic) => topic.practised > 0 && topic.needsWork * 2 >= topic.practised)
    .sort(
      (a, b) => b.needsWork / b.practised - a.needsWork / a.practised || b.needsWork - a.needsWork,
    );
}
