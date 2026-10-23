import type { VivaQuestion } from '@campuskit/project-catalog';
import { describe, expect, it } from 'vitest';

import {
  EMPTY_VIVA_PROGRESS,
  recordRatings,
  type Ratings,
  type VivaProgress,
} from '../../lib/progress.ts';
import {
  checkConcepts,
  mentions,
  QUICK_PRACTICE_SIZE,
  reviewQuestions,
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
