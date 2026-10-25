import type { ProjectManifest } from '@campuskit/project-catalog';
import { FlaskConical, RotateCcw } from 'lucide-react';
import { Link } from 'react-router';

import { Button } from '../../components/ui/Button.tsx';
import { sourceHref } from '../learning/links.ts';
import type { DemoDefinition } from './types.ts';

/**
 * The label every demo carries: it is a demonstration with fictional data,
 * what is re-created, what runs the real code, what the full project adds,
 * and how to reset it.
 */
export function DemoNotice({
  project,
  definition,
  onReset,
  onStartEmpty,
}: {
  project: ProjectManifest;
  definition: DemoDefinition;
  onReset: () => void;
  onStartEmpty: (() => void) | null;
}) {
  const ported = definition.fidelity === 'browser-port';
  return (
    <section
      aria-labelledby="demo-notice-title"
      className="rounded-xl border border-line bg-raised p-4 sm:p-5"
    >
      <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-3">
        <div className="flex min-w-0 max-w-3xl gap-3">
          <FlaskConical aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-violet" />
          <div className="space-y-1">
            <h2 id="demo-notice-title" className="font-semibold text-ink">
              A demonstration with fictional sample data, not a live system
            </h2>
            <p className="text-sm text-ink-2">{definition.notice}</p>
            <p className="text-sm text-ink-2">
              Changes stay in this browser tab until you close it, and nothing is sent anywhere.{' '}
              {definition.data.reset}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            variant="secondary"
            onClick={onReset}
            icon={<RotateCcw aria-hidden="true" className="size-4" />}
          >
            Reset to the example
          </Button>
          {onStartEmpty ? (
            <Button size="sm" variant="ghost" onClick={onStartEmpty}>
              Start with no data
            </Button>
          ) : null}
        </div>
      </div>
      <details className="mt-3 border-t border-line pt-3">
        <summary className="cursor-pointer text-sm font-semibold text-ink-2 hover:text-ink">
          {ported
            ? 'How this differs from the real project'
            : 'What runs here, and what the full project adds'}
        </summary>
        <div className="mt-3 grid gap-6 text-sm md:grid-cols-2">
          <div className="space-y-2">
            <h3 className="font-semibold text-ink">
              {ported ? 'What the browser version reproduces' : 'Template code running here'}
            </h3>
            <p className="text-ink-2">{definition.runs.description}</p>
            <ul className="flex flex-wrap gap-1.5">
              {definition.runs.files.map((file) => (
                <li key={file}>
                  <Link
                    to={sourceHref(project, file)}
                    className="inline-block rounded-md bg-surface px-2 py-0.5 font-mono text-xs text-ink hover:text-violet"
                  >
                    {file}
                  </Link>
                </li>
              ))}
            </ul>
            <p className="text-ink-2">{definition.data.description}</p>
          </div>
          <div className="space-y-2">
            <h3 className="font-semibold text-ink">Only in the downloadable project</h3>
            <ul className="list-disc space-y-1 pl-5 text-ink-2 marker:text-ink-3">
              {definition.fullProjectAdds.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
            <h3 className="pt-2 font-semibold text-ink">Limits of this demo</h3>
            <ul className="list-disc space-y-1 pl-5 text-ink-2 marker:text-ink-3">
              {definition.limitations.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        </div>
      </details>
    </section>
  );
}
