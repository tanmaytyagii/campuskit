import { describe, expect, it } from 'vitest';

import {
  outcomeFor,
  readTicked,
  readVivaProgress,
  recordRatings,
  resetAllProgress,
  resetProgress,
  summarizeViva,
  writeTicked,
  writeVivaProgress,
  EMPTY_VIVA_PROGRESS,
  type Ratings,
} from './progress.ts';

const confident: Ratings = {
  correctness: 'confident',
  understanding: 'confident',
  clarity: 'confident',
  limitations: 'confident',
};

describe('learning progress', () => {
  it('saves ticked items and ignores ids that no longer exist', () => {
    writeTicked('checklist', 'demo', new Set(['a', 'b', 'gone']));
    expect([...readTicked('checklist', 'demo', ['a', 'b', 'c'])].sort()).toEqual(['a', 'b']);
    resetProgress('checklist', 'demo');
    expect(readTicked('checklist', 'demo', ['a']).size).toBe(0);
  });

  it('ignores edited or malformed saved values', () => {
    window.localStorage.setItem('campuskit:checklist:v1:demo', '{"version":1,"done":[1,2]}');
    expect(readTicked('checklist', 'demo', ['1']).size).toBe(0);
    window.localStorage.setItem('campuskit:viva:v1:demo', 'not json');
    expect(readVivaProgress('demo', ['q'])).toEqual(EMPTY_VIVA_PROGRESS);
  });

  it('works out outcomes with the published rule', () => {
    expect(outcomeFor(confident)).toBe('confident');
    expect(outcomeFor({ ...confident, clarity: 'partly' })).toBe('partly');
    expect(outcomeFor({ ...confident, clarity: 'partly', limitations: 'not-yet' })).toBe('missed');
  });

  it('records ratings, counts attempts and summarises practice', () => {
    let progress = recordRatings(
      EMPTY_VIVA_PROGRESS,
      'q1',
      { ...confident, correctness: 'not-yet' },
      '2026-10-22',
    );
    progress = recordRatings(progress, 'q1', confident, '2026-10-23');
    progress = recordRatings(progress, 'q2', { ...confident, clarity: 'partly' }, '2026-10-23');
    expect(progress.questions.q1).toMatchObject({
      outcome: 'confident',
      attempts: 2,
      lastPracticed: '2026-10-23',
    });
    writeVivaProgress('demo', progress);
    const restored = readVivaProgress('demo', ['q1', 'q2', 'q3']);
    expect(summarizeViva(restored, ['q1', 'q2', 'q3'])).toEqual({
      total: 3,
      practised: 2,
      confident: 1,
      partly: 1,
      missed: 0,
    });
  });

  it('drops saved ratings whose outcome does not match the rule', () => {
    window.localStorage.setItem(
      'campuskit:viva:v1:demo',
      JSON.stringify({
        version: 1,
        questions: {
          q1: {
            outcome: 'confident',
            ratings: { ...confident, clarity: 'not-yet' },
            attempts: 1,
            lastPracticed: '2026-10-23',
          },
        },
      }),
    );
    expect(readVivaProgress('demo', ['q1']).questions).toEqual({});
  });

  it('resets everything for one project only', () => {
    writeTicked('checklist', 'one', new Set(['a']));
    writeTicked('demo', 'one', new Set(['step-1']));
    writeVivaProgress('one', recordRatings(EMPTY_VIVA_PROGRESS, 'q', confident, '2026-10-23'));
    writeTicked('checklist', 'two', new Set(['a']));
    resetAllProgress('one');
    expect(readTicked('checklist', 'one', ['a']).size).toBe(0);
    expect(readTicked('demo', 'one', ['step-1']).size).toBe(0);
    expect(readVivaProgress('one', ['q']).questions).toEqual({});
    expect(readTicked('checklist', 'two', ['a']).size).toBe(1);
  });
});
