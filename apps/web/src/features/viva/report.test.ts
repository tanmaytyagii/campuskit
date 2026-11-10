import { getProjectById, type LearningGuide } from '@campuskit/project-catalog';
import { describe, expect, it } from 'vitest';

import attendanceGuide from '../../../../../packages/project-catalog/learning/attendance-system.json';
import { dailyCounts, type LogEntry } from '../../lib/viva-log.ts';
import { EMPTY_VIVA_PROGRESS, recordRatings, type Ratings } from '../../lib/progress.ts';
import { revisionReport } from './report.ts';

const all = (rating: Ratings['correctness']): Ratings => ({
  correctness: rating,
  understanding: rating,
  clarity: rating,
  limitations: rating,
});

describe('revision report', () => {
  it('reports topics, weak topics and questions to review from the ratings only', () => {
    const guide = attendanceGuide as unknown as LearningGuide;
    const [first, second] = guide.viva;
    if (!first || !second) throw new Error('the guide changed');
    let progress = recordRatings(EMPTY_VIVA_PROGRESS, first.id, all('not-yet'), '2026-10-28');
    progress = recordRatings(progress, second.id, all('confident'), '2026-10-28');
    const report = revisionReport(
      [{ project: getProjectById('attendance-system')!, guide, progress }],
      '2026-10-30',
    );
    expect(report).toContain('# Viva revision report');
    expect(report).toContain(`2 of ${guide.viva.length} questions practised, 1 confident.`);
    expect(report).toContain('| Topic | Questions | Practised | Confident | Needs work |');
    expect(report).toContain(`- ${first.question} (review again, last practised 28 Oct 2026)`);
    expect(report).not.toContain(`- ${second.question}`);
    expect(report).toContain('**Not practised yet:**');
  });

  it('says when nothing has been practised', () => {
    expect(revisionReport([], '2026-10-30')).toContain(
      'No viva questions have been practised yet.',
    );
  });
});

describe('practice log', () => {
  it('counts ratings per day, with empty days, for the last days up to today', () => {
    const log: LogEntry[] = [
      { projectId: 'a', questionId: 'q1', outcome: 'confident', on: '2026-10-30', mock: false },
      { projectId: 'a', questionId: 'q2', outcome: 'missed', on: '2026-10-30', mock: true },
      { projectId: 'b', questionId: 'q1', outcome: 'partly', on: '2026-10-28', mock: false },
      { projectId: 'a', questionId: 'q1', outcome: 'confident', on: '2026-10-01', mock: false },
    ];
    expect(dailyCounts(log, '2026-10-30', 3)).toEqual([
      { day: '2026-10-28', rated: 1, confident: 0 },
      { day: '2026-10-29', rated: 0, confident: 0 },
      { day: '2026-10-30', rated: 2, confident: 1 },
    ]);
    expect(dailyCounts(log, '2026-10-30', 3, 'b').map((day) => day.rated)).toEqual([1, 0, 0]);
  });
});
