import type { LearningGuide, ProjectManifest } from '@campuskit/project-catalog';
import { ArrowRight, BookOpen, CodeXml, MessageCircleQuestion, Network } from 'lucide-react';
import { useId, type ReactNode } from 'react';
import { Link } from 'react-router';

import {
  architectureHref,
  sourceHref,
  vivaQuestionsHref,
  walkthroughHref,
} from '../learning/links.ts';
import type { DemoFeature, LearnRefs } from './types.ts';
import { Breakable } from './ui.tsx';

function Block({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="space-y-2">
      <h3 className="text-sm font-bold text-ink">{title}</h3>
      {children}
    </div>
  );
}

const linkRow =
  'group flex items-start gap-2.5 rounded-md py-1 text-sm text-ink-2 transition-colors hover:text-violet';

/**
 * Links from a demo feature (or a guided step) into the project's learning
 * material. Titles come from the learning guide; ids that don't resolve are
 * left out (the registry tests make sure they all do).
 */
export function LearnLinks({
  project,
  guide,
  learn,
}: {
  project: ProjectManifest;
  guide: LearningGuide | null;
  learn: LearnRefs;
}) {
  if (!guide) return <p className="type-meta">Loading the learning guide…</p>;
  const entries = (learn.walkthrough ?? [])
    .map((id) => guide.walkthrough.find((entry) => entry.id === id))
    .filter((entry) => entry !== undefined);
  const components = (learn.architecture ?? [])
    .map((id) => guide.architecture.components.find((component) => component.id === id))
    .filter((component) => component !== undefined);
  const questions = (learn.viva ?? [])
    .map((id) => guide.viva.find((question) => question.id === id))
    .filter((question) => question !== undefined);
  return (
    <ul className="space-y-0.5">
      {entries.map((entry) => (
        <li key={`walkthrough-${entry.id}`}>
          <Link to={walkthroughHref(project, entry.id)} className={linkRow}>
            <BookOpen aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-violet" />
            <span className="min-w-0">
              <span className="font-semibold text-ink group-hover:text-violet">{entry.title}</span>
              <span className="block text-xs text-ink-3">
                Code walkthrough · <Breakable text={entry.file} />
              </span>
            </span>
          </Link>
        </li>
      ))}
      {components.map((component) => (
        <li key={`architecture-${component.id}`}>
          <Link to={architectureHref(project, component.id)} className={linkRow}>
            <Network aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-violet" />
            <span className="min-w-0">
              <span className="font-semibold text-ink group-hover:text-violet">
                {component.name}
              </span>
              <span className="block text-xs text-ink-3">Architecture explorer</span>
            </span>
          </Link>
        </li>
      ))}
      {questions.length > 0 ? (
        <li>
          <Link
            to={vivaQuestionsHref(
              project,
              questions.map((question) => question.id),
            )}
            className={linkRow}
          >
            <MessageCircleQuestion
              aria-hidden="true"
              className="mt-0.5 size-4 shrink-0 text-violet"
            />
            <span className="min-w-0">
              <span className="font-semibold text-ink group-hover:text-violet">
                Practise {questions.length} related viva{' '}
                {questions.length === 1 ? 'question' : 'questions'}
              </span>
              <span className="block text-xs text-ink-3">
                {questions.map((question) => question.question).join(' · ')}
              </span>
            </span>
          </Link>
        </li>
      ) : null}
    </ul>
  );
}

/** What the current screen shows, how it maps to the template, and where to read more. */
export function FeaturePanel({
  project,
  feature,
  guide,
}: {
  project: ProjectManifest;
  feature: DemoFeature;
  guide: LearningGuide | null;
}) {
  const headingId = useId();
  return (
    <aside aria-labelledby={headingId} className="space-y-5">
      <div className="space-y-5 rounded-2xl border border-line bg-surface p-5 shadow-card">
        <div className="space-y-2">
          <p aria-hidden="true" className="type-eyebrow">
            About this screen
          </p>
          <h2 id={headingId} className="type-h3 text-ink">
            <span className="sr-only">About this screen:</span> {feature.label}
          </h2>
          <p className="text-sm text-ink-2">{feature.explanation}</p>
        </div>
        <Block title="Try this">
          <ul className="list-disc space-y-1.5 pl-5 text-sm text-ink-2 marker:text-ink-3">
            {feature.tryThis.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </Block>
        <Block title="Different in the full project">
          {feature.simplified.length > 0 ? (
            <ul className="list-disc space-y-1.5 pl-5 text-sm text-ink-2 marker:text-ink-3">
              {feature.simplified.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-ink-2">Nothing: this screen behaves as in the template.</p>
          )}
        </Block>
        <Block title="In the source code">
          <ul className="space-y-0.5">
            {feature.source.map((ref) => (
              <li key={`${ref.file}-${ref.symbol ?? ''}`}>
                <Link to={sourceHref(project, ref.file, ref.symbol)} className={linkRow}>
                  <CodeXml aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-violet" />
                  <span className="min-w-0">
                    <span className="font-mono text-[0.8125rem] font-semibold text-ink group-hover:text-violet">
                      <Breakable text={ref.symbol ?? ref.file} />
                    </span>
                    {ref.symbol ? (
                      <span className="block font-mono text-xs text-ink-3">
                        <Breakable text={ref.file} />
                      </span>
                    ) : null}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </Block>
        <Block title="Learn more">
          <LearnLinks project={project} guide={guide} learn={feature.learn} />
        </Block>
      </div>
      <Link
        to={`/projects/${project.slug}#setup`}
        className="group flex items-center justify-between gap-3 rounded-xl border border-line px-4 py-3 text-sm transition-colors hover:border-violet"
      >
        <span>
          <span className="block font-semibold text-ink group-hover:text-violet">
            Run the full project
          </span>
          <span className="type-meta block">Prerequisites, setup steps and limitations</span>
        </span>
        <ArrowRight
          aria-hidden="true"
          className="size-4 shrink-0 text-ink-3 group-hover:text-violet"
        />
      </Link>
    </aside>
  );
}
