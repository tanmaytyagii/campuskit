import {
  getProjectBySlug,
  VIVA_CATEGORIES,
  VIVA_CATEGORY_LABELS,
  VIVA_DIFFICULTY_LABELS,
  type LearningGuide,
  type ProjectManifest,
  type VivaCategory,
  type VivaQuestion,
} from '@campuskit/project-catalog';
import {
  CircleCheck,
  CircleDashed,
  ExternalLink,
  ListFilter,
  RotateCcw,
  Shuffle,
  Trash,
  Zap,
} from 'lucide-react';
import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { Link, useParams } from 'react-router';

import { Breadcrumbs } from '../../components/layout/Breadcrumbs.tsx';
import { StatusBadge } from '../../components/StatusBadge.tsx';
import { Badge } from '../../components/ui/Badge.tsx';
import { Button, ButtonLink } from '../../components/ui/Button.tsx';
import { Callout } from '../../components/ui/Callout.tsx';
import { Dialog } from '../../components/ui/Dialog.tsx';
import { controlClasses, SelectField } from '../../components/ui/Field.tsx';
import { EmptyState } from '../../components/ui/EmptyState.tsx';
import { Skeleton } from '../../components/ui/Spinner.tsx';
import { useDocumentTitle } from '../../hooks/useDocumentTitle.ts';
import { useLearningGuide } from '../../hooks/useLearningGuide.ts';
import { cn } from '../../lib/cn.ts';
import { todayIso } from '../../lib/format.ts';
import {
  CRITERIA,
  CRITERIA_LABELS,
  CRITERIA_QUESTIONS,
  OUTCOME_LABELS,
  outcomeFor,
  RATING_LABELS,
  RATINGS,
  readVivaProgress,
  recordRatings,
  resetProgress,
  summarizeViva,
  writeVivaProgress,
  type Criterion,
  type Outcome,
  type Rating,
  type Ratings,
  type VivaProgress,
} from '../../lib/progress.ts';
import { NotFoundPage } from '../../pages/NotFoundPage.tsx';
import { sourceHref, studioHref } from '../learning/links.ts';
import {
  checkConcepts,
  QUICK_PRACTICE_SIZE,
  reviewQuestions,
  selectQuestions,
  type PracticeMode,
} from './logic.ts';

type SessionResult = { questionId: string; outcome: Outcome | 'skipped' };

type Phase =
  | { kind: 'setup' }
  | {
      kind: 'session';
      mode: PracticeMode;
      questions: VivaQuestion[];
      index: number;
      results: SessionResult[];
    }
  | { kind: 'summary'; questions: VivaQuestion[]; results: SessionResult[] };

const MODE_LABELS: Record<PracticeMode['kind'], string> = {
  quick: 'Quick practice',
  topic: 'Practice by topic',
  mixed: 'Mixed practice',
  review: 'Review',
};

const OUTCOME_TONES: Record<Outcome | 'skipped', 'lime' | 'warn' | 'outline' | 'neutral'> = {
  confident: 'lime',
  partly: 'outline',
  missed: 'warn',
  skipped: 'neutral',
};

export function VivaPracticePage() {
  const { slug = '' } = useParams();
  const project = getProjectBySlug(slug);
  if (!project) return <NotFoundPage />;
  return <VivaPractice key={project.id} project={project} />;
}

function VivaPractice({ project }: { project: ProjectManifest }) {
  useDocumentTitle(`Viva practice | ${project.name}`);
  const guide = useLearningGuide(project);

  return (
    <div className="container-page pt-8 pb-8 md:pt-12">
      <Breadcrumbs
        items={[
          { label: 'Projects', to: '/projects' },
          { label: project.name, to: `/projects/${project.slug}` },
        ]}
        current="Viva practice"
      />
      <div className="mb-8 max-w-3xl space-y-3">
        <p className="flex flex-wrap items-center gap-2 text-sm font-semibold text-violet">
          {project.name}
          <StatusBadge project={project} />
        </p>
        <h1 className="type-title text-ink">Viva practice</h1>
        <p className="text-lg text-ink-2">
          Questions an examiner may ask about this project, with model answers based on its actual
          code. Answer first, then compare and judge your own answer honestly.
        </p>
      </div>

      {guide.status === 'loading' ? (
        <div className="space-y-4" role="status" aria-label="Loading the questions">
          <Skeleton className="h-40 w-full" />
        </div>
      ) : null}
      {guide.status === 'error' ? (
        <Callout tone="danger" title="The questions couldn’t be loaded" role="alert">
          <p>{guide.message}</p>
          <Button
            variant="secondary"
            size="sm"
            className="mt-3"
            onClick={guide.retry}
            icon={<RotateCcw aria-hidden="true" className="size-4" />}
          >
            Try again
          </Button>
        </Callout>
      ) : null}
      {guide.status === 'missing' ? (
        <EmptyState title="No viva practice for this template yet">
          Its viva questions are in{' '}
          <Link to={`/projects/${project.slug}/docs/viva`} className="link">
            the project’s documentation
          </Link>
          .
        </EmptyState>
      ) : null}
      {guide.status === 'ready' ? <Practice project={project} guide={guide.loaded.guide} /> : null}
    </div>
  );
}

function Practice({ project, guide }: { project: ProjectManifest; guide: LearningGuide }) {
  const questionIds = guide.viva.map((question) => question.id);
  const [progress, setProgress] = useState<VivaProgress>(() =>
    readVivaProgress(project.id, questionIds),
  );
  const [phase, setPhase] = useState<Phase>({ kind: 'setup' });

  function start(mode: PracticeMode) {
    const questions = selectQuestions(guide.viva, progress, mode);
    if (questions.length === 0) return;
    setPhase({ kind: 'session', mode, questions, index: 0, results: [] });
  }

  function finishQuestion(result: SessionResult, ratings: Ratings | null) {
    if (phase.kind !== 'session') return;
    if (ratings) {
      const next = recordRatings(progress, result.questionId, ratings, todayIso());
      setProgress(next);
      writeVivaProgress(project.id, next);
    }
    const results = [...phase.results, result];
    if (phase.index + 1 < phase.questions.length) {
      setPhase({ ...phase, index: phase.index + 1, results });
    } else {
      setPhase({ kind: 'summary', questions: phase.questions, results });
    }
  }

  function endSession() {
    if (phase.kind !== 'session') return;
    setPhase({
      kind: 'summary',
      questions: phase.questions.slice(0, phase.results.length),
      results: phase.results,
    });
  }

  function reset() {
    resetProgress('viva', project.id);
    setProgress(readVivaProgress(project.id, questionIds));
  }

  if (phase.kind === 'session') {
    const question = phase.questions[phase.index];
    if (!question) return null;
    return (
      <div className="mx-auto max-w-3xl space-y-6">
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm font-semibold text-ink-2">
              {MODE_LABELS[phase.mode.kind]}
              {phase.mode.kind === 'topic'
                ? `: ${VIVA_CATEGORY_LABELS[phase.mode.category]}`
                : ''}{' '}
              · Question {phase.index + 1} of {phase.questions.length}
            </p>
            <Button variant="ghost" size="sm" onClick={endSession}>
              End session
            </Button>
          </div>
          <div aria-hidden="true" className="h-1.5 overflow-hidden rounded-full bg-raised">
            <div
              className="h-full rounded-full bg-violet transition-[width] duration-300 motion-reduce:transition-none"
              style={{ width: `${((phase.index + 1) / phase.questions.length) * 100}%` }}
            />
          </div>
        </div>
        <QuestionCard
          key={`${question.id}-${phase.index}`}
          project={project}
          question={question}
          onDone={finishQuestion}
        />
      </div>
    );
  }

  if (phase.kind === 'summary') {
    return (
      <SessionSummary
        project={project}
        questions={phase.questions}
        results={phase.results}
        reviewCount={reviewQuestions(guide.viva, progress).length}
        onReview={() => start({ kind: 'review' })}
        onBack={() => setPhase({ kind: 'setup' })}
      />
    );
  }

  return (
    <ModeChooser
      project={project}
      guide={guide}
      progress={progress}
      onStart={start}
      onReset={reset}
    />
  );
}

/** The small icon tile at the top of each practice mode card. */
function ModeIcon({ icon }: { icon: ReactNode }) {
  return (
    <span
      aria-hidden="true"
      className="flex size-10 items-center justify-center rounded-lg bg-violet-soft text-violet"
    >
      {icon}
    </span>
  );
}

function ModeChooser({
  project,
  guide,
  progress,
  onStart,
  onReset,
}: {
  project: ProjectManifest;
  guide: LearningGuide;
  progress: VivaProgress;
  onStart: (mode: PracticeMode) => void;
  onReset: () => void;
}) {
  const questionIds = guide.viva.map((question) => question.id);
  const summary = summarizeViva(progress, questionIds);
  const reviewCount = reviewQuestions(guide.viva, progress).length;
  const categories = VIVA_CATEGORIES.filter((category) =>
    guide.viva.some((question) => question.category === category),
  );
  const [category, setCategory] = useState<VivaCategory>(categories[0] ?? 'basics');
  const [confirming, setConfirming] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const topicId = useId();

  const card = 'flex flex-col gap-3 rounded-xl border border-line bg-surface p-5 shadow-card';
  const stats = [
    { label: 'Practised', value: summary.practised, of: summary.total },
    { label: OUTCOME_LABELS.confident, value: summary.confident },
    { label: OUTCOME_LABELS.partly, value: summary.partly },
    { label: OUTCOME_LABELS.missed, value: summary.missed },
  ];
  return (
    <div className="space-y-8">
      <section
        aria-labelledby="viva-progress"
        className="rounded-2xl border border-line bg-surface p-5 shadow-card sm:p-6"
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1">
            <h2 id="viva-progress" className="type-h3 text-ink">
              Your practice so far
            </h2>
            <p className="type-meta">
              Your ratings are saved in this browser only. The answers you type are never saved.
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            disabled={summary.practised === 0}
            onClick={() => setConfirming(true)}
            icon={<Trash aria-hidden="true" className="size-4" />}
          >
            Reset viva progress
          </Button>
        </div>
        <dl className="mt-5 grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-line bg-line sm:grid-cols-4">
          {stats.map((stat) => (
            <div key={stat.label} className="bg-surface px-4 py-3">
              <dt className="type-meta">{stat.label}</dt>
              <dd className="mt-1 text-2xl font-bold text-ink tabular-nums">
                {stat.value}
                {stat.of !== undefined ? (
                  <span className="text-base font-semibold text-ink-3"> of {stat.of}</span>
                ) : null}
              </dd>
            </div>
          ))}
        </dl>
        {notice ? (
          <p role="status" className="mt-3 text-sm text-ink-2">
            {notice}
          </p>
        ) : null}
      </section>

      <div className="grid gap-5 md:grid-cols-2">
        <section aria-labelledby="mode-quick" className={card}>
          <ModeIcon icon={<Zap className="size-5" />} />
          <h2 id="mode-quick" className="type-h3 text-ink">
            Quick practice
          </h2>
          <p className="flex-1 text-sm text-ink-2">
            {Math.min(QUICK_PRACTICE_SIZE, guide.viva.length)} questions, starting with the ones you
            marked “Review again”, then ones you haven’t practised yet.
          </p>
          <Button className="mt-2 self-start" onClick={() => onStart({ kind: 'quick' })}>
            Start quick practice
          </Button>
        </section>

        <section aria-labelledby="mode-topic" className={card}>
          <ModeIcon icon={<ListFilter className="size-5" />} />
          <h2 id="mode-topic" className="type-h3 text-ink">
            Practice by topic
          </h2>
          <div className="flex-1">
            <SelectField
              id={topicId}
              label="Topic"
              value={category}
              onChange={(event) => setCategory(event.target.value as VivaCategory)}
            >
              {categories.map((value) => (
                <option key={value} value={value}>
                  {VIVA_CATEGORY_LABELS[value]} (
                  {guide.viva.filter((question) => question.category === value).length})
                </option>
              ))}
            </SelectField>
          </div>
          <Button
            variant="secondary"
            className="mt-2 self-start"
            onClick={() => onStart({ kind: 'topic', category })}
          >
            Start this topic
          </Button>
        </section>

        <section aria-labelledby="mode-mixed" className={card}>
          <ModeIcon icon={<Shuffle className="size-5" />} />
          <h2 id="mode-mixed" className="type-h3 text-ink">
            Mixed practice
          </h2>
          <p className="flex-1 text-sm text-ink-2">
            All {guide.viva.length} questions from every topic in a random order, like a real viva.
            You can end the session at any time.
          </p>
          <Button
            variant="secondary"
            className="mt-2 self-start"
            onClick={() => onStart({ kind: 'mixed' })}
          >
            Start mixed practice
          </Button>
        </section>

        <section aria-labelledby="mode-review" className={card}>
          <ModeIcon icon={<RotateCcw className="size-5" />} />
          <h2 id="mode-review" className="type-h3 text-ink">
            Review questions to work on
          </h2>
          <p className="flex-1 text-sm text-ink-2">
            {reviewCount === 0
              ? 'Nothing to review yet. Questions you rate “Not yet” or “Partly” on any criterion appear here.'
              : `${reviewCount} ${reviewCount === 1 ? 'question' : 'questions'} you rated “Not yet” or “Partly” on at least one criterion.`}
          </p>
          <Button
            variant="secondary"
            className="mt-2 self-start"
            disabled={reviewCount === 0}
            onClick={() => onStart({ kind: 'review' })}
          >
            Start review
          </Button>
        </section>
      </div>

      <section
        aria-labelledby="viva-how"
        className="rounded-xl border border-line p-5 text-sm text-ink-2 sm:p-6"
      >
        <h2 id="viva-how" className="type-h3 text-ink">
          How practice works
        </h2>
        <ul className="mt-3 max-w-[80ch] list-disc space-y-1.5 pl-5">
          <li>
            Write your answer the way you would say it, then compare it with the model answer.
          </li>
          <li>
            The key-idea check only looks for certain words in what you wrote. It can’t tell whether
            your explanation is correct; that judgement is yours.
          </li>
          <li>
            Rate yourself on four criteria. Any “Not yet” puts the question in your review list, any
            “Partly” marks it as needing a little more work, and four “Confident” ratings mark it as
            confident.
          </li>
          <li>
            No AI is involved and nothing is sent anywhere. Model answers come from the project’s
            learning guide, which is checked against the template’s code.
          </li>
        </ul>
        <p className="mt-3">
          Want to understand an answer better? Use the{' '}
          <Link to={studioHref(project, 'code')} className="link">
            code walkthrough
          </Link>
          .
        </p>
      </section>

      <Dialog
        open={confirming}
        onClose={() => setConfirming(false)}
        title="Reset viva progress?"
        footer={
          <div className="flex flex-wrap justify-end gap-3">
            <Button variant="secondary" onClick={() => setConfirming(false)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={() => {
                onReset();
                setConfirming(false);
                setNotice('Your viva ratings for this project were cleared.');
              }}
            >
              Reset viva progress
            </Button>
          </div>
        }
      >
        <p className="text-ink-2">
          This clears your ratings for all {summary.practised} practised questions about{' '}
          {project.name} in this browser.
        </p>
      </Dialog>
    </div>
  );
}

function QuestionCard({
  project,
  question,
  onDone,
}: {
  project: ProjectManifest;
  question: VivaQuestion;
  onDone: (result: SessionResult, ratings: Ratings | null) => void;
}) {
  const [answer, setAnswer] = useState('');
  const [revealed, setRevealed] = useState(false);
  const [ratings, setRatings] = useState<Partial<Ratings>>({});
  const heading = useRef<HTMLHeadingElement>(null);
  const answerRegion = useRef<HTMLDivElement>(null);
  const groupName = useId();
  const answerId = useId();

  useEffect(() => {
    heading.current?.focus();
  }, []);

  const complete = CRITERIA.every((criterion) => ratings[criterion] !== undefined);
  const concepts = answer.trim() ? checkConcepts(answer, question.keyConcepts) : null;

  function reveal() {
    setRevealed(true);
    // Let the answer render, then move focus to it so keyboard users land on it.
    requestAnimationFrame(() => answerRegion.current?.focus());
  }

  function rate(criterion: Criterion, rating: Rating) {
    setRatings((current) => ({ ...current, [criterion]: rating }));
  }

  return (
    <article
      aria-labelledby="question-heading"
      className="space-y-6 rounded-2xl border border-line bg-surface p-5 shadow-card sm:p-8"
    >
      <div className="space-y-3">
        <div className="flex flex-wrap gap-1.5">
          <Badge tone="violet">{VIVA_CATEGORY_LABELS[question.category]}</Badge>
          <Badge tone="outline">{VIVA_DIFFICULTY_LABELS[question.difficulty]}</Badge>
        </div>
        <h2
          id="question-heading"
          ref={heading}
          tabIndex={-1}
          className="type-h2 text-ink outline-none"
        >
          {question.question}
        </h2>
      </div>

      <div className="space-y-1.5">
        <label htmlFor={answerId} className="text-sm font-semibold text-ink">
          Your answer
        </label>
        <p id={`${answerId}-hint`} className="text-sm text-ink-3">
          Optional, and never saved. Write it as you would say it in your viva.
        </p>
        <textarea
          id={answerId}
          aria-describedby={`${answerId}-hint`}
          value={answer}
          onChange={(event) => setAnswer(event.target.value)}
          rows={5}
          maxLength={2000}
          readOnly={revealed}
          className={cn(controlClasses, 'min-h-32 py-2.5 leading-6')}
        />
      </div>

      {!revealed ? (
        <div className="flex flex-wrap gap-3">
          <Button onClick={reveal} disabled={!answer.trim()}>
            Compare with the model answer
          </Button>
          <Button variant="secondary" onClick={reveal}>
            I don’t know yet: show the answer
          </Button>
        </div>
      ) : (
        <div ref={answerRegion} tabIndex={-1} className="space-y-6 outline-none">
          {concepts ? (
            <section aria-labelledby="concepts-heading" className="rounded-xl bg-raised p-4">
              <h3 id="concepts-heading" className="text-sm font-bold text-ink">
                Key ideas in your answer
              </h3>
              <ul className="mt-2 space-y-1.5 text-sm">
                {concepts.map((concept) => (
                  <li key={concept.label} className="flex items-start gap-2">
                    {concept.mentioned ? (
                      <CircleCheck
                        aria-hidden="true"
                        className="mt-0.5 size-4 shrink-0 text-lime-text"
                      />
                    ) : (
                      <CircleDashed
                        aria-hidden="true"
                        className="mt-0.5 size-4 shrink-0 text-ink-3"
                      />
                    )}
                    <span className={concept.mentioned ? 'text-ink' : 'text-ink-2'}>
                      {concept.label}
                      <span className="sr-only">
                        {concept.mentioned ? ': mentioned' : ': not found in your answer'}
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
              <p className="mt-3 text-xs text-ink-3">
                This only checks whether your answer uses certain words. It can’t tell whether your
                explanation is right, and a good answer may use other words. Judge your answer with
                the criteria below.
              </p>
            </section>
          ) : null}

          <section
            aria-labelledby="model-heading"
            className="rounded-xl border-2 border-violet/40 p-4"
          >
            <h3 id="model-heading" className="text-sm font-bold text-ink">
              Model answer
            </h3>
            <p className="mt-2 text-ink-2">{question.answer}</p>
            {question.explanation ? (
              <details className="mt-3">
                <summary className="cursor-pointer text-sm font-semibold text-violet">
                  More detail
                </summary>
                <p className="mt-2 text-sm text-ink-2">{question.explanation}</p>
              </details>
            ) : null}
            {question.files.length > 0 || question.symbols.length > 0 ? (
              <div className="mt-4">
                <h4 className="text-xs font-bold text-ink-3">Where to look in the code</h4>
                <ul className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm">
                  {question.symbols.map((symbol) => (
                    <li key={`${symbol.file}#${symbol.name}`}>
                      <a
                        href={sourceHref(project, symbol.file, symbol.name)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="link inline-flex items-center gap-1 font-mono"
                      >
                        {symbol.name}
                        <ExternalLink aria-hidden="true" className="size-3.5" />
                        <span className="sr-only">(in {symbol.file}, opens in a new tab)</span>
                      </a>
                    </li>
                  ))}
                  {question.files
                    .filter((file) => !question.symbols.some((symbol) => symbol.file === file))
                    .map((file) => (
                      <li key={file}>
                        <a
                          href={sourceHref(project, file)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="link inline-flex items-center gap-1 font-mono"
                        >
                          {file}
                          <ExternalLink aria-hidden="true" className="size-3.5" />
                          <span className="sr-only">(opens in a new tab)</span>
                        </a>
                      </li>
                    ))}
                </ul>
              </div>
            ) : null}
          </section>

          <section aria-labelledby="assess-heading" className="space-y-4">
            <div>
              <h3 id="assess-heading" className="text-base font-bold text-ink">
                Rate your answer
              </h3>
              <p className="text-sm text-ink-3">
                Optional. Ratings decide which questions you review again.
              </p>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              {CRITERIA.map((criterion) => (
                <fieldset key={criterion} className="rounded-xl border border-line p-4">
                  <legend className="px-1 text-sm font-semibold text-ink">
                    {CRITERIA_LABELS[criterion]}
                  </legend>
                  <p className="text-xs text-ink-3">{CRITERIA_QUESTIONS[criterion]}</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {RATINGS.map((rating) => (
                      <label
                        key={rating}
                        className={cn(
                          'cursor-pointer rounded-lg border px-3 py-1.5 text-sm font-semibold',
                          'has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-focus',
                          ratings[criterion] === rating
                            ? 'border-violet bg-violet-soft text-violet'
                            : 'border-line-strong text-ink-2 hover:border-ink-3',
                        )}
                      >
                        <input
                          type="radio"
                          name={`${groupName}-${criterion}`}
                          value={rating}
                          checked={ratings[criterion] === rating}
                          onChange={() => rate(criterion, rating)}
                          className="sr-only"
                        />
                        {RATING_LABELS[rating]}
                      </label>
                    ))}
                  </div>
                </fieldset>
              ))}
            </div>
            <p className="text-sm text-ink-2" aria-live="polite">
              {complete
                ? `Result: ${OUTCOME_LABELS[outcomeFor(ratings as Ratings)]}.`
                : 'Rate all four criteria to record a result, or skip.'}
            </p>
            <div className="flex flex-wrap gap-3">
              <Button
                disabled={!complete}
                onClick={() =>
                  onDone(
                    { questionId: question.id, outcome: outcomeFor(ratings as Ratings) },
                    ratings as Ratings,
                  )
                }
              >
                Save rating and continue
              </Button>
              <Button
                variant="secondary"
                onClick={() => onDone({ questionId: question.id, outcome: 'skipped' }, null)}
              >
                Skip without rating
              </Button>
            </div>
          </section>
        </div>
      )}
    </article>
  );
}

function SessionSummary({
  project,
  questions,
  results,
  reviewCount,
  onReview,
  onBack,
}: {
  project: ProjectManifest;
  questions: VivaQuestion[];
  results: SessionResult[];
  reviewCount: number;
  onReview: () => void;
  onBack: () => void;
}) {
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    heading.current?.focus();
  }, []);
  const count = (outcome: Outcome | 'skipped') =>
    results.filter((result) => result.outcome === outcome).length;

  return (
    <section
      aria-labelledby="summary-heading"
      className="mx-auto max-w-3xl space-y-6 rounded-2xl border border-line bg-surface p-5 shadow-card sm:p-8"
    >
      <h2
        id="summary-heading"
        ref={heading}
        tabIndex={-1}
        className="type-h2 text-ink outline-none"
      >
        Session complete
      </h2>
      {results.length === 0 ? (
        <p className="text-ink-2">You ended the session before answering any questions.</p>
      ) : (
        <>
          <p className="text-ink-2">
            You answered {results.length} {results.length === 1 ? 'question' : 'questions'}:{' '}
            {count('confident')} confident, {count('partly')} needing a little more work,{' '}
            {count('missed')} to review again
            {count('skipped') > 0 ? ` and ${count('skipped')} skipped without a rating` : ''}.
          </p>
          <ul className="divide-y divide-line rounded-xl border border-line">
            {results.map((result) => {
              const question = questions.find((item) => item.id === result.questionId);
              return (
                <li
                  key={result.questionId}
                  className="flex flex-wrap items-center justify-between gap-2 px-4 py-3"
                >
                  <span className="text-sm text-ink">{question?.question}</span>
                  <Badge tone={OUTCOME_TONES[result.outcome]}>
                    {result.outcome === 'skipped' ? 'Skipped' : OUTCOME_LABELS[result.outcome]}
                  </Badge>
                </li>
              );
            })}
          </ul>
        </>
      )}
      <div className="flex flex-wrap gap-3 border-t border-line pt-6">
        {reviewCount > 0 ? (
          <Button onClick={onReview}>
            Review {reviewCount} {reviewCount === 1 ? 'question' : 'questions'} to work on
          </Button>
        ) : null}
        <Button variant="secondary" onClick={onBack}>
          Choose another practice mode
        </Button>
        <ButtonLink to={studioHref(project, 'code')} variant="ghost">
          Study the code walkthrough
        </ButtonLink>
      </div>
    </section>
  );
}
