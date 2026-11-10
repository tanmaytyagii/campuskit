/**
 * Viva progress across every template: practice in the last two weeks, each template's topics,
 * weak topics and questions to review, and a revision report to download. Everything comes from
 * the student's own ratings; nothing is estimated.
 */
import { catalog, VIVA_CATEGORY_LABELS, type ProjectManifest } from '@campuskit/project-catalog';
import { Download, FileText } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router';

import { Breadcrumbs } from '../../components/layout/Breadcrumbs.tsx';
import { PageHeader } from '../../components/layout/PageHeader.tsx';
import { Button, ButtonLink } from '../../components/ui/Button.tsx';
import { EmptyState } from '../../components/ui/EmptyState.tsx';
import { notify } from '../../components/ui/Toast.tsx';
import { useDocumentTitle } from '../../hooks/useDocumentTitle.ts';
import { useLearningGuide } from '../../hooks/useLearningGuide.ts';
import { readProjectProgress } from '../../lib/backup.ts';
import { cn } from '../../lib/cn.ts';
import { downloadFile } from '../../lib/download.ts';
import { formatIsoDate, todayIso } from '../../lib/format.ts';
import { loadLearningGuide } from '../../lib/learning.ts';
import type { VivaProgress } from '../../lib/progress.ts';
import { dailyCounts, readLog } from '../../lib/viva-log.ts';
import {
  StatGrid,
  StatTile,
  TableRegion,
  tableClasses,
  tdClasses,
  theadClasses,
  thClasses,
} from '../demo/ui.tsx';
import { vivaHref, vivaQuestionsHref } from '../learning/links.ts';
import { dueDate, topicStats, weakTopics } from './logic.ts';
import { revisionReport, type TemplatePractice } from './report.ts';

const dayFormatter = new Intl.DateTimeFormat('en-GB', {
  weekday: 'short',
  day: 'numeric',
  month: 'short',
});

function practiceOf(project: ProjectManifest): VivaProgress {
  return { version: 1, questions: readProjectProgress(project.id).viva ?? {} };
}

export function VivaProgressPage() {
  useDocumentTitle('Viva progress');
  const today = todayIso();
  const [log] = useState(readLog);
  const practised = catalog
    .map((project) => ({ project, progress: practiceOf(project) }))
    .filter(({ progress }) => Object.keys(progress.questions).length > 0);
  const entries = practised.flatMap(({ progress }) => Object.values(progress.questions));
  const history = dailyCounts(log, today, 14);
  const lastTwoWeeks = history.reduce((sum, day) => sum + day.rated, 0);
  const busiest = Math.max(1, ...history.map((day) => day.rated));

  async function download(format: 'md' | 'docx') {
    try {
      const practice: TemplatePractice[] = [];
      for (const { project, progress } of practised) {
        const loaded = await loadLearningGuide(project);
        if (loaded) practice.push({ project, guide: loaded.guide, progress });
      }
      const markdown = revisionReport(practice, today);
      if (format === 'md') {
        downloadFile(markdown, `viva-revision-report-${today}.md`, 'text/markdown');
        return;
      }
      const { DOCX_MIME_TYPE, markdownToDocx } = await import('../../lib/docx.ts');
      downloadFile(
        await markdownToDocx(markdown, { title: 'Viva revision report', date: today }),
        `viva-revision-report-${today}.docx`,
        DOCX_MIME_TYPE,
      );
    } catch {
      notify('The report couldn’t be made. Try again, or download the Markdown version.', 'error');
    }
  }

  return (
    <>
      <PageHeader
        eyebrow="Viva practice"
        title="Viva progress"
        description="What you’ve practised, by template and topic, from your own ratings. A question counts as confident only when you rated all four criteria “Confident”."
        actions={
          practised.length > 0 ? (
            <>
              <Button
                icon={<FileText aria-hidden="true" className="size-4" />}
                onClick={() => void download('docx')}
              >
                Download revision report (.docx)
              </Button>
              <Button
                variant="secondary"
                icon={<Download aria-hidden="true" className="size-4" />}
                onClick={() => void download('md')}
              >
                Markdown (.md)
              </Button>
            </>
          ) : undefined
        }
      >
        <Breadcrumbs items={[{ label: 'Viva practice', to: '/viva' }]} current="Viva progress" />
      </PageHeader>
      <div className="container-page space-y-8 pb-16">
        {practised.length === 0 ? (
          <EmptyState
            title="No viva practice yet"
            actions={
              <ButtonLink to="/viva" size="sm">
                Choose a project to practise
              </ButtonLink>
            }
          >
            Answer a question, compare it with the model answer and rate yourself; your progress
            appears here.
          </EmptyState>
        ) : (
          <>
            <StatGrid>
              <StatTile label="Questions practised" value={entries.length} />
              <StatTile
                label="Confident"
                value={entries.filter((entry) => entry.outcome === 'confident').length}
              />
              <StatTile label="Ratings in the last 14 days" value={lastTwoWeeks} />
              <StatTile
                label="Due for review today"
                value={entries.filter((entry) => dueDate(entry) <= today).length}
              />
            </StatGrid>

            <section aria-labelledby="history-heading" className="space-y-3">
              <h2 id="history-heading" className="type-h2 text-ink">
                The last 14 days
              </h2>
              <TableRegion label="Ratings per day">
                <table className={tableClasses}>
                  <caption className="sr-only">
                    Questions you rated each day, and how many were confident
                  </caption>
                  <thead className={theadClasses}>
                    <tr>
                      <th scope="col" className={thClasses}>
                        Day
                      </th>
                      <th scope="col" className={cn(thClasses, 'text-right')}>
                        Rated
                      </th>
                      <th scope="col" className={cn(thClasses, 'text-right')}>
                        Confident
                      </th>
                      <th scope="col" className={cn(thClasses, 'w-1/2')}>
                        <span className="sr-only">Bar</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {history.map((day) => (
                      <tr key={day.day}>
                        <th
                          scope="row"
                          className="px-3 py-2 text-left font-normal whitespace-nowrap text-ink-2"
                        >
                          {dayFormatter.format(new Date(`${day.day}T12:00:00Z`))}
                        </th>
                        <td className={cn(tdClasses, 'py-2 text-right')}>{day.rated}</td>
                        <td className={cn(tdClasses, 'py-2 text-right')}>{day.confident}</td>
                        <td className="px-3 py-2" aria-hidden="true">
                          <div className="h-2 overflow-hidden rounded-full bg-raised">
                            <div
                              className="h-full rounded-full bg-violet"
                              style={{ width: `${(day.rated / busiest) * 100}%` }}
                            />
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </TableRegion>
              <p className="type-meta">
                Counted from ratings you saved in this browser
                {log.length === 0 ? ' since this page was added to CampusKit' : ''}.
              </p>
            </section>

            {practised.map(({ project, progress }) => (
              <TemplateProgress
                key={project.id}
                project={project}
                progress={progress}
                today={today}
              />
            ))}
          </>
        )}
      </div>
    </>
  );
}

function TemplateProgress({
  project,
  progress,
  today,
}: {
  project: ProjectManifest;
  progress: VivaProgress;
  today: string;
}) {
  const guide = useLearningGuide(project);
  const headingId = `progress-${project.id}`;
  if (guide.status !== 'ready')
    return (
      <section
        aria-labelledby={headingId}
        className="rounded-2xl border border-line bg-surface p-6"
      >
        <h2 id={headingId} className="type-h3 text-ink">
          {project.name}
        </h2>
        <p className="type-meta mt-2">
          {guide.status === 'loading'
            ? 'Loading the questions…'
            : 'The questions couldn’t be loaded.'}
        </p>
      </section>
    );
  const { viva } = guide.loaded.guide;
  const stats = topicStats(viva, progress);
  const weak = weakTopics(stats);
  const review = viva.filter((question) => {
    const entry = progress.questions[question.id];
    return entry && entry.outcome !== 'confident';
  });
  const due = viva.filter((question) => {
    const entry = progress.questions[question.id];
    return entry && dueDate(entry) <= today;
  });
  return (
    <section
      aria-labelledby={headingId}
      className="space-y-4 rounded-2xl border border-line bg-surface p-6 shadow-card"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <h2 id={headingId} className="type-h3 text-ink">
          <Link to={vivaHref(project)} className="hover:text-violet">
            {project.name}
          </Link>
        </h2>
        {due.length > 0 ? (
          <ButtonLink
            to={vivaQuestionsHref(
              project,
              due.map((question) => question.id),
            )}
            size="sm"
          >
            Review {due.length} due {due.length === 1 ? 'question' : 'questions'}
          </ButtonLink>
        ) : null}
      </div>
      <TableRegion label={`${project.name}: practice by topic`}>
        <table className={tableClasses}>
          <thead className={theadClasses}>
            <tr>
              <th scope="col" className={thClasses}>
                Topic
              </th>
              <th scope="col" className={cn(thClasses, 'text-right')}>
                Practised
              </th>
              <th scope="col" className={cn(thClasses, 'text-right')}>
                Confident
              </th>
              <th scope="col" className={cn(thClasses, 'text-right')}>
                Needs work
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {stats.map((topic) => (
              <tr key={topic.category}>
                <th scope="row" className="px-3 py-2.5 text-left font-semibold text-ink">
                  {VIVA_CATEGORY_LABELS[topic.category]}
                </th>
                <td className={cn(tdClasses, 'text-right')}>
                  {topic.practised} of {topic.total}
                </td>
                <td className={cn(tdClasses, 'text-right')}>{topic.confident}</td>
                <td className={cn(tdClasses, 'text-right')}>{topic.needsWork}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </TableRegion>
      <p className="text-sm text-ink-2">
        {weak.length > 0
          ? `Topics that need work: ${weak.map((topic) => VIVA_CATEGORY_LABELS[topic.category]).join(', ')}. At least half of the questions you practised there are below confident.`
          : 'No weak topics: in every topic you practised, most answers are confident.'}
      </p>
      {review.length > 0 ? (
        <details className="rounded-xl border border-line">
          <summary className="cursor-pointer px-4 py-3 text-sm font-semibold text-ink">
            {review.length} {review.length === 1 ? 'question' : 'questions'} below confident
          </summary>
          <ul className="space-y-2 border-t border-line px-4 py-3 text-sm">
            {review.map((question) => (
              <li key={question.id}>
                <span className="text-ink">{question.question}</span>{' '}
                <span className="type-meta">
                  last practised{' '}
                  {formatIsoDate(progress.questions[question.id]?.lastPracticed ?? today)}
                </span>
              </li>
            ))}
          </ul>
        </details>
      ) : null}
    </section>
  );
}
