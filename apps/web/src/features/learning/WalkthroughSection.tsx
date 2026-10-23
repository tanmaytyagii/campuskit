import type { LearningGuide, ProjectManifest } from '@campuskit/project-catalog';
import { ChevronLeft, ChevronRight, CodeXml, FlaskConical } from 'lucide-react';
import { Link, useSearchParams } from 'react-router';

import { ButtonLink } from '../../components/ui/Button.tsx';
import { cn } from '../../lib/cn.ts';

/** Previous and next steps: bordered links whose titles can wrap on narrow screens. */
const pagerClasses =
  'group flex min-w-0 flex-col gap-0.5 rounded-xl border border-line bg-surface px-4 py-3 transition-colors hover:border-violet';
import { fileHref, sourceHref, studioHref } from './links.ts';

/**
 * A guided tour of the important files. Each explanation links to the real
 * file in the source browser, and each function link opens it at the line
 * where the function is defined.
 */
export function WalkthroughSection({
  project,
  guide,
}: {
  project: ProjectManifest;
  guide: LearningGuide;
}) {
  const [params] = useSearchParams();
  const entries = guide.walkthrough;
  const index = Math.max(
    0,
    entries.findIndex((entry) => entry.id === params.get('entry')),
  );
  const entry = entries[index];
  const previous = entries[index - 1];
  const next = entries[index + 1];
  const entryHref = (id: string) =>
    `${studioHref(project, 'code')}?entry=${encodeURIComponent(id)}`;

  if (!entry) return null;
  return (
    <div className="grid gap-8 lg:grid-cols-[17rem_minmax(0,1fr)]">
      <nav aria-label="Files in this walkthrough" className="lg:sticky lg:top-24 lg:self-start">
        <ol className="space-y-1">
          {entries.map((item, itemIndex) => (
            <li key={item.id}>
              <Link
                to={entryHref(item.id)}
                replace
                aria-current={item.id === entry.id ? 'step' : undefined}
                className={cn(
                  'flex gap-2 rounded-md px-2.5 py-1.5 text-sm',
                  item.id === entry.id
                    ? 'bg-violet-soft font-semibold text-violet'
                    : 'text-ink-2 hover:bg-raised hover:text-ink',
                )}
              >
                <span
                  aria-hidden="true"
                  className="w-5 shrink-0 text-right font-mono text-xs leading-5"
                >
                  {itemIndex + 1}
                </span>
                <span>{item.title}</span>
              </Link>
            </li>
          ))}
        </ol>
      </nav>

      <article aria-labelledby="walkthrough-title" className="min-w-0 space-y-6">
        <div className="space-y-2">
          <p className="type-eyebrow text-violet">
            Step {index + 1} of {entries.length}
          </p>
          <h3 id="walkthrough-title" className="type-h2 text-ink">
            {entry.title}
          </h3>
          <p className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <code className="rounded-md bg-raised px-2 py-1 font-mono text-sm text-ink">
              {entry.file}
            </code>
            <Link
              to={sourceHref(project, entry.file)}
              className="link inline-flex items-center gap-1 text-sm"
            >
              <CodeXml aria-hidden="true" className="size-4" />
              Open in the source browser
            </Link>
          </p>
        </div>
        <p className="font-semibold text-ink">{entry.role}</p>
        <p className="max-w-[75ch] text-ink-2">{entry.explanation}</p>

        {entry.symbols.length > 0 ? (
          <div>
            <h4 className="text-base font-bold text-ink">Key code in this file</h4>
            <dl className="mt-3 divide-y divide-line rounded-xl border border-line bg-surface">
              {entry.symbols.map((symbol) => (
                <div
                  key={symbol.name}
                  className="grid gap-1 p-4 sm:grid-cols-[12rem_minmax(0,1fr)] sm:gap-4"
                >
                  <dt>
                    <Link
                      to={sourceHref(project, entry.file, symbol.name)}
                      className="font-mono text-sm font-semibold text-violet hover:underline"
                    >
                      {symbol.name}
                    </Link>
                  </dt>
                  <dd className="text-sm text-ink-2">{symbol.explanation}</dd>
                </div>
              ))}
            </dl>
            <p className="mt-2 text-xs text-ink-3">
              Each name opens the source browser at the line where it is defined.
            </p>
          </div>
        ) : null}

        {entry.related.length > 0 || entry.tests.length > 0 ? (
          <div className="grid gap-6 sm:grid-cols-2">
            {entry.related.length > 0 ? (
              <div>
                <h4 className="text-sm font-bold text-ink">Related files</h4>
                <ul className="mt-2 space-y-1">
                  {entry.related.map((file) => (
                    <li key={file}>
                      <Link
                        to={fileHref(project, file)}
                        className="font-mono text-sm text-ink underline decoration-line-strong underline-offset-4 hover:text-violet hover:decoration-violet"
                      >
                        {file}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
            {entry.tests.length > 0 ? (
              <div>
                <h4 className="flex items-center gap-1.5 text-sm font-bold text-ink">
                  <FlaskConical aria-hidden="true" className="size-4 text-violet" />
                  Tests that cover it
                </h4>
                <ul className="mt-2 space-y-1">
                  {entry.tests.map((file) => (
                    <li key={file}>
                      <Link
                        to={sourceHref(project, file)}
                        className="font-mono text-sm text-ink underline decoration-line-strong underline-offset-4 hover:text-violet hover:decoration-violet"
                      >
                        {file}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        ) : null}

        <div className="grid gap-3 border-t border-line pt-6 sm:grid-cols-2">
          {previous ? (
            <Link to={entryHref(previous.id)} replace className={pagerClasses}>
              <span className="type-meta inline-flex items-center gap-1">
                <ChevronLeft aria-hidden="true" className="size-3.5" />
                Previous
              </span>
              <span className="font-semibold text-ink group-hover:text-violet">
                {previous.title}
              </span>
            </Link>
          ) : (
            <span className="hidden sm:block" />
          )}
          {next ? (
            <Link
              to={entryHref(next.id)}
              replace
              className={cn(pagerClasses, 'sm:items-end sm:text-right')}
            >
              <span className="type-meta inline-flex items-center gap-1">
                Next
                <ChevronRight aria-hidden="true" className="size-3.5" />
              </span>
              <span className="font-semibold text-ink group-hover:text-violet">{next.title}</span>
            </Link>
          ) : (
            <ButtonLink to={studioHref(project, 'checklist')} className="sm:justify-self-end">
              Check what you understand
            </ButtonLink>
          )}
        </div>
      </article>
    </div>
  );
}
