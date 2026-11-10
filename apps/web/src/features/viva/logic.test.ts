import type { VivaQuestion } from '@campuskit/project-catalog';
import { describe, expect, it } from 'vitest';

import {
  EMPTY_VIVA_PROGRESS,
  recordRatings,
  type Ratings,
  type VivaProgress,
} from '../../lib/progress.ts';
import {
  addDays,
  checkConcepts,
  dueDate,
  dueQuestions,
  intervalDays,
  mentions,
  mockQuestions,
  topicStats,
  weakTopics,
  nextReviewDate,
  QUICK_PRACTICE_SIZE,
  reviewQuestions,
  selectedQuestionIds,
  selectQuestions,
  shuffle,
} from './logic.ts';

function question(id: string, category: VivaQuestion['category'] = 'basics'): VivaQuestion {
  return {
    id,
    category,
    difficulty: 'easy',
    question: `Question ${id}?`,
    answer: `Answer ${id}.`,
    keyConcepts: [
      { label: 'One', terms: ['one'] },
      { label: 'Two', terms: ['two'] },
    ],
    files: [],
    symbols: [],
  };
}

const questions = ['a', 'b', 'c', 'd', 'e', 'f', 'g'].map((id, index) =>
  question(id, index < 3 ? 'testing' : 'basics'),
);
const all = (rating: Ratings['correctness']): Ratings => ({
  correctness: rating,
  understanding: rating,
  clarity: rating,
  limitations: rating,
});

/** A repeatable stand-in for Math.random. */
function seeded(seed = 1): () => number {
  let value = seed;
  return () => {
    value = (value * 16807) % 2147483647;
    return (value - 1) / 2147483646;
  };
}

describe('selectQuestions', () => {
  it('quick practice takes five, starting with missed and unpractised questions', () => {
    let progress: VivaProgress = EMPTY_VIVA_PROGRESS;
    for (const id of ['a', 'b', 'c', 'd'])
      progress = recordRatings(progress, id, all('confident'), '2026-10-01');
    progress = recordRatings(progress, 'e', all('not-yet'), '2026-10-02');
    const picked = selectQuestions(questions, progress, { kind: 'quick' }, seeded()).map(
      (item) => item.id,
    );
    expect(picked).toHaveLength(QUICK_PRACTICE_SIZE);
    expect(picked[0]).toBe('e');
    expect(new Set(picked.slice(1, 3))).toEqual(new Set(['f', 'g']));
  });

  it('topic practice keeps only that topic, and mixed practice keeps every question', () => {
    const topic = selectQuestions(
      questions,
      EMPTY_VIVA_PROGRESS,
      { kind: 'topic', category: 'testing' },
      seeded(),
    );
    expect(topic.map((item) => item.id).sort()).toEqual(['a', 'b', 'c']);
    const mixed = selectQuestions(questions, EMPTY_VIVA_PROGRESS, { kind: 'mixed' }, seeded());
    expect(mixed.map((item) => item.id).sort()).toEqual(questions.map((item) => item.id));
  });

  it('review practice lists “Review again” before “Needs a little more work”', () => {
    let progress = recordRatings(
      EMPTY_VIVA_PROGRESS,
      'a',
      { ...all('confident'), clarity: 'partly' },
      '2026-10-01',
    );
    progress = recordRatings(progress, 'b', all('confident'), '2026-10-01');
    progress = recordRatings(
      progress,
      'c',
      { ...all('confident'), limitations: 'not-yet' },
      '2026-10-01',
    );
    expect(reviewQuestions(questions, progress).map((item) => item.id)).toEqual(['c', 'a']);
    expect(selectQuestions(questions, progress, { kind: 'review' }).map((item) => item.id)).toEqual(
      ['c', 'a'],
    );
  });

  it('selected practice keeps the chosen questions in the order given', () => {
    const picked = selectQuestions(questions, EMPTY_VIVA_PROGRESS, {
      kind: 'selected',
      ids: ['e', 'b'],
    });
    expect(picked.map((item) => item.id)).toEqual(['e', 'b']);
  });

  it('reads only known, distinct question ids from a link', () => {
    expect(selectedQuestionIds('e, b,zz,e', questions)).toEqual(['e', 'b']);
    expect(selectedQuestionIds(null, questions)).toEqual([]);
    expect(selectedQuestionIds('', questions)).toEqual([]);
  });

  it('shuffle keeps every item exactly once', () => {
    expect(shuffle([1, 2, 3, 4, 5], seeded(7)).sort()).toEqual([1, 2, 3, 4, 5]);
  });
});

describe('key ideas', () => {
  it('matches terms at the start of words, and short terms only as whole words', () => {
    expect(mentions('Data is saved in localStorage.', 'localstorage')).toBe(true);
    expect(mentions('Custom categories would help.', 'categor')).toBe(true);
    expect(mentions('The table shows grades.', 'ab')).toBe(false);
    expect(mentions('Students marked AB are absent.', 'ab')).toBe(true);
    expect(mentions('It uses the “reducer” pattern', 'reducer')).toBe(true);
    expect(mentions('Résumé', 'resume')).toBe(true);
  });

  it('reports each concept as mentioned or not', () => {
    expect(checkConcepts('Only one idea here', question('x').keyConcepts)).toEqual([
      { label: 'One', mentioned: true },
      { label: 'Two', mentioned: false },
    ]);
  });
});

describe('spaced review', () => {
  const rate = (progress: VivaProgress, id: string, rating: Ratings['correctness'], day: string) =>
    recordRatings(progress, id, all(rating), day);

  it('adds calendar days across months, years and daylight-saving changes', () => {
    expect(addDays('2026-10-30', 3)).toBe('2026-11-02');
    expect(addDays('2026-12-30', 2)).toBe('2027-01-01');
    expect(addDays('2028-02-28', 1)).toBe('2028-02-29');
    expect(addDays('2026-03-28', 2)).toBe('2026-03-30');
  });

  it('brings a question back sooner the less sure the student was', () => {
    const day = '2026-10-20';
    const missed = rate(EMPTY_VIVA_PROGRESS, 'a', 'not-yet', day).questions.a;
    const partly = rate(EMPTY_VIVA_PROGRESS, 'a', 'partly', day).questions.a;
    const confident = rate(EMPTY_VIVA_PROGRESS, 'a', 'confident', day).questions.a;
    if (!missed || !partly || !confident) throw new Error('not recorded');
    expect([intervalDays(missed), intervalDays(partly), intervalDays(confident)]).toEqual([
      1, 2, 3,
    ]);
    expect(dueDate(missed)).toBe('2026-10-21');
    expect(dueDate(confident)).toBe('2026-10-23');
  });

  it('waits 3, 7, 14, then 30 days while the answers stay confident, and starts again after a miss', () => {
    let progress = EMPTY_VIVA_PROGRESS;
    let day = '2026-10-01';
    const intervals: number[] = [];
    for (let review = 0; review < 5; review += 1) {
      progress = rate(progress, 'a', 'confident', day);
      const entry = progress.questions.a;
      if (!entry) throw new Error('not recorded');
      intervals.push(intervalDays(entry));
      day = dueDate(entry);
    }
    expect(intervals).toEqual([3, 7, 14, 30, 30]);
    progress = rate(progress, 'a', 'partly', day);
    expect(progress.questions.a?.confidentStreak).toBe(0);
    progress = rate(progress, 'a', 'confident', addDays(day, 2));
    expect(intervalDays(progress.questions.a!)).toBe(3);
  });

  it('counts a streak in days, so rating twice on one day doesn’t skip ahead', () => {
    let progress = rate(EMPTY_VIVA_PROGRESS, 'a', 'confident', '2026-10-01');
    progress = rate(progress, 'a', 'confident', '2026-10-01');
    expect(progress.questions.a?.confidentStreak).toBe(1);
    progress = rate(progress, 'a', 'not-yet', '2026-10-01');
    progress = rate(progress, 'a', 'confident', '2026-10-01');
    expect(progress.questions.a?.confidentStreak).toBe(1);
  });

  it('treats progress saved before streaks existed as a first confident review', () => {
    const saved = rate(EMPTY_VIVA_PROGRESS, 'a', 'confident', '2026-10-01').questions.a!;
    const { confidentStreak: _omitted, ...old } = saved;
    expect(intervalDays(old)).toBe(3);
  });

  it('offers the questions that are due, the longest overdue first', () => {
    let progress = rate(EMPTY_VIVA_PROGRESS, 'a', 'confident', '2026-10-01'); // due 10-04
    progress = rate(progress, 'b', 'not-yet', '2026-10-05'); // due 10-06
    progress = rate(progress, 'c', 'partly', '2026-10-04'); // due 10-06
    progress = rate(progress, 'd', 'confident', '2026-10-06'); // due 10-09
    expect(dueQuestions(questions, progress, '2026-10-03').map((item) => item.id)).toEqual([]);
    expect(dueQuestions(questions, progress, '2026-10-06').map((item) => item.id)).toEqual([
      'a',
      'b',
      'c',
    ]);
    expect(nextReviewDate(questions, progress, '2026-10-06')).toBe('2026-10-09');
    expect(nextReviewDate(questions, EMPTY_VIVA_PROGRESS, '2026-10-06')).toBeNull();
    expect(
      selectQuestions(questions, progress, { kind: 'due' }, () => 0, '2026-10-09').map(
        (item) => item.id,
      ),
    ).toEqual(['a', 'b', 'c', 'd']);
  });
});

describe('mock viva and topics', () => {
  it('takes questions from each topic in turn, the ones that need work first', () => {
    // a, b, c are testing questions; d to g are basics.
    let progress = recordRatings(EMPTY_VIVA_PROGRESS, 'b', all('not-yet'), '2026-10-01');
    progress = recordRatings(progress, 'e', all('not-yet'), '2026-10-01');
    progress = recordRatings(progress, 'a', all('confident'), '2026-10-01');
    const picked = mockQuestions(questions, progress, () => 0, 4).map((item) => item.id);
    expect(picked).toHaveLength(4);
    expect(picked[0]).toBe('e');
    expect(picked[1]).toBe('b');
    // Alternates between topics while both have questions left, confident ones last.
    expect(picked.slice(0, 4).filter((id) => ['a', 'b', 'c'].includes(id))).toEqual(['b', 'c']);
  });

  it('stops when every question is taken', () => {
    expect(mockQuestions(questions.slice(0, 2), EMPTY_VIVA_PROGRESS, () => 0, 8)).toHaveLength(2);
  });

  it('counts practice by topic and calls a topic weak only from ratings', () => {
    let progress = recordRatings(EMPTY_VIVA_PROGRESS, 'a', all('partly'), '2026-10-01');
    progress = recordRatings(progress, 'b', all('confident'), '2026-10-01');
    progress = recordRatings(progress, 'd', all('confident'), '2026-10-01');
    progress = recordRatings(progress, 'e', all('confident'), '2026-10-01');
    progress = recordRatings(progress, 'f', all('not-yet'), '2026-10-01');
    const stats = topicStats(questions, progress);
    expect(stats).toEqual([
      { category: 'basics', total: 4, practised: 3, confident: 2, needsWork: 1 },
      { category: 'testing', total: 3, practised: 2, confident: 1, needsWork: 1 },
    ]);
    // Half below confident counts as weak; a third doesn't.
    expect(weakTopics(stats).map((topic) => topic.category)).toEqual(['testing']);
    // Never practised is not weak.
    expect(weakTopics(topicStats(questions, EMPTY_VIVA_PROGRESS))).toEqual([]);
  });
});
