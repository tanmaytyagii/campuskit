/**
 * The revision report: what the student has practised for each template, by topic, which topics
 * need work and which questions to review, as Markdown (downloaded as .md or .docx). Built only
 * from the student's own ratings; it never claims more than they rated.
 */
import {
  VIVA_CATEGORY_LABELS,
  type LearningGuide,
  type ProjectManifest,
} from '@campuskit/project-catalog';

import { formatIsoDate } from '../../lib/format.ts';
import type { VivaProgress } from '../../lib/progress.ts';
import { dueDate, nextReviewDate, topicStats, weakTopics } from './logic.ts';

export interface TemplatePractice {
  project: ProjectManifest;
  guide: LearningGuide;
  progress: VivaProgress;
}

export function revisionReport(practice: readonly TemplatePractice[], today: string): string {
  const lines = [
    '# Viva revision report',
    '',
    `Made with CampusKit on ${formatIsoDate(today)}, from your own ratings in viva practice. A question counts as confident only when you rated all four criteria “Confident”.`,
    '',
  ];
  if (practice.length === 0) lines.push('No viva questions have been practised yet.', '');
  for (const { project, guide, progress } of practice) {
    const stats = topicStats(guide.viva, progress);
    const practised = stats.reduce((sum, topic) => sum + topic.practised, 0);
    const confident = stats.reduce((sum, topic) => sum + topic.confident, 0);
    const weak = weakTopics(stats);
    const untouched = stats.filter((topic) => topic.practised === 0);
    const review = guide.viva.filter((question) => {
      const entry = progress.questions[question.id];
      return entry && entry.outcome !== 'confident';
    });
    const due = guide.viva.filter((question) => {
      const entry = progress.questions[question.id];
      return entry && dueDate(entry) <= today;
    }).length;
    const next = nextReviewDate(guide.viva, progress, today);
    lines.push(
      `## ${project.name}`,
      '',
      `${practised} of ${guide.viva.length} questions practised, ${confident} confident. ${due} due for spaced review today${next ? `; the next review after that is on ${formatIsoDate(next)}` : ''}.`,
      '',
      '| Topic | Questions | Practised | Confident | Needs work |',
      '| --- | --- | --- | --- | --- |',
      ...stats.map(
        (topic) =>
          `| ${VIVA_CATEGORY_LABELS[topic.category]} | ${topic.total} | ${topic.practised} | ${topic.confident} | ${topic.needsWork} |`,
      ),
      '',
    );
    if (weak.length > 0)
      lines.push(
        `**Topics that need work:** ${weak.map((topic) => VIVA_CATEGORY_LABELS[topic.category]).join(', ')}.`,
        '',
      );
    if (untouched.length > 0)
      lines.push(
        `**Not practised yet:** ${untouched.map((topic) => VIVA_CATEGORY_LABELS[topic.category]).join(', ')}.`,
        '',
      );
    if (review.length > 0)
      lines.push(
        '### Questions to review',
        '',
        ...review.map((question) => {
          const entry = progress.questions[question.id];
          const label = entry?.outcome === 'missed' ? 'review again' : 'needs a little more work';
          return `- ${question.question} (${label}, last practised ${formatIsoDate(entry?.lastPracticed ?? today)})`;
        }),
        '',
      );
  }
  return `${lines.join('\n').trim()}\n`;
}
