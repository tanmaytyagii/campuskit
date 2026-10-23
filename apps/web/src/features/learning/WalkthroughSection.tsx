import type { LearningGuide, ProjectManifest } from '@campuskit/project-catalog';
import { ChevronLeft, ChevronRight, CodeXml, FlaskConical } from 'lucide-react';
import { Link, useSearchParams } from 'react-router';

import { ButtonLink } from '../../components/ui/Button.tsx';
import { cn } from '../../lib/cn.ts';
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
          <p className="text-xs font-semibold text-ink-3">
            Step {index + 1} of {entries.length}
          </p>
          <h3 id="walkthrough-title" className="heading text-2xl text-ink">
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
                        className="font-mono text-sm text-ink hover:text-violet"
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
                        className="font-mono text-sm text-ink hover:text-violet"
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

        <div className="flex flex-wrap justify-between gap-3 border-t border-line pt-6">
          {previous ? (
            <ButtonLink
              to={entryHref(previous.id)}
              replace
              variant="secondary"
              icon={<ChevronLeft aria-hidden="true" className="size-4" />}
            >
              {previous.title}
            </ButtonLink>
          ) : (
            <span />
          )}
          {next ? (
            <ButtonLink to={entryHref(next.id)} replace variant="secondary">
              {next.title}
              <ChevronRight aria-hidden="true" className="size-4" />
            </ButtonLink>
          ) : (
            <ButtonLink to={studioHref(project, 'checklist')}>Check what you understand</ButtonLink>
          )}
        </div>
      </article>
    </div>
  );
}
