import {
  TROUBLESHOOTING_STAGE_LABELS,
  TROUBLESHOOTING_STAGES,
  type ProjectManifest,
  type TroubleshootingEntry,
  type TroubleshootingStep,
} from '@campuskit/project-catalog';
import { Eye, Info, ShieldCheck } from 'lucide-react';
import { useId, useState } from 'react';

import { Badge } from '../../components/ui/Badge.tsx';
import { Button } from '../../components/ui/Button.tsx';
import { CommandBlock } from '../../components/ui/CommandBlock.tsx';
import { controlClasses } from '../../components/ui/Field.tsx';
import { cn } from '../../lib/cn.ts';
import { formatIsoDate } from '../../lib/format.ts';

const PLATFORM_NAMES = { windows: 'Windows', macos: 'macOS', linux: 'Linux' } as const;
const COMMAND_LABELS = { windows: 'Windows', 'macos-linux': 'macOS / Linux' } as const;

function normalize(text: string): string {
  return text.normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

/** Every word of the search must appear somewhere in the entry. */
export function matchesTroubleshooting(entry: TroubleshootingEntry, query: string): boolean {
  const words = normalize(query).split(/\s+/).filter(Boolean);
  if (words.length === 0) return true;
  const haystack = normalize(
    [
      entry.title,
      entry.symptom,
      ...entry.causes,
      ...[...entry.diagnose, ...entry.fix].flatMap((step) => [
        step.text,
        ...step.commands.map((command) => command.command),
      ]),
    ].join(' '),
  );
  return words.every((word) => haystack.includes(word));
}

function Steps({ steps }: { steps: TroubleshootingStep[] }) {
  return (
    <ol className="list-decimal space-y-3 pl-5">
      {steps.map((step) => (
        <li key={step.text} className="space-y-2">
          <p>{step.text}</p>
          {step.commands.length > 0 ? (
            <div className="space-y-2">
              {(['all', 'windows', 'macos-linux'] as const).map((platform) => {
                const commands = step.commands.filter((command) => command.platform === platform);
                if (commands.length === 0) return null;
                return (
                  <CommandBlock
                    key={platform}
                    commands={commands.map((command) => command.command)}
                    {...(platform === 'all' ? {} : { label: COMMAND_LABELS[platform] })}
                  />
                );
              })}
            </div>
          ) : null}
        </li>
      ))}
    </ol>
  );
}

/**
 * Problems students meet with this project's stack, each with causes, safe
 * checks, a fix and how to confirm it worked. Entries seen while verifying
 * the template are marked; everything else is general advice.
 */
export function TroubleshootingSection({
  project,
  entries,
}: {
  project: ProjectManifest;
  entries: TroubleshootingEntry[];
}) {
  const [query, setQuery] = useState('');
  const searchId = useId();
  const visible = entries.filter((entry) => matchesTroubleshooting(entry, query));
  const observedCount = entries.filter((entry) => entry.observed).length;

  return (
    <div className="space-y-8">
      <div className="grid gap-4 lg:grid-cols-2">
        <p className="flex gap-3 rounded-xl bg-raised p-4 text-sm text-ink-2">
          <ShieldCheck aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-violet" />
          <span>
            CampusKit never runs these commands for you. Read each one before you run it in the
            project folder; none of them deletes your work or changes system settings.
          </span>
        </p>
        <p className="flex gap-3 rounded-xl bg-raised p-4 text-sm text-ink-2">
          <Info aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-violet" />
          <span>
            Most entries are general advice for {project.name}’s tools.{' '}
            {observedCount > 0
              ? `${observedCount === 1 ? 'One entry is' : `${observedCount} entries are`} marked “Seen during verification”: the problem actually happened while the template was being verified.`
              : 'None of these problems happened while the template was being verified.'}
          </span>
        </p>
      </div>

      <div className="max-w-xl space-y-1.5">
        <label htmlFor={searchId} className="text-sm font-semibold text-ink">
          Search by error message or symptom
        </label>
        <input
          id={searchId}
          type="search"
          value={query}
          maxLength={120}
          placeholder="e.g. ENOENT, port, ModuleNotFoundError"
          onChange={(event) => setQuery(event.target.value)}
          className={cn(controlClasses, 'h-11')}
        />
        <p className="text-sm text-ink-3" role="status">
          {visible.length === entries.length
            ? `${entries.length} problems`
            : `${visible.length} of ${entries.length} problems match`}
        </p>
      </div>

      {visible.length === 0 ? (
        <div className="rounded-xl border border-line bg-surface p-6 text-ink-2">
          <p className="font-semibold text-ink">Nothing matches “{query.trim()}”.</p>
          <p className="mt-1 text-sm">
            Try one distinctive word from the error, such as its code. If nothing fits, copy the
            first error line and search for it online.
          </p>
          <Button variant="secondary" size="sm" className="mt-3" onClick={() => setQuery('')}>
            Show all problems
          </Button>
        </div>
      ) : null}

      {TROUBLESHOOTING_STAGES.map((stage) => {
        const items = visible.filter((entry) => entry.stage === stage);
        if (items.length === 0) return null;
        return (
          <section key={stage} aria-labelledby={`stage-${stage}`} className="space-y-3">
            <h3 id={`stage-${stage}`} className="text-base font-bold text-ink">
              {TROUBLESHOOTING_STAGE_LABELS[stage]}
            </h3>
            <ul className="space-y-3">
              {items.map((entry) => (
                <li key={entry.id}>
                  <details className="group rounded-xl border border-line bg-surface">
                    <summary className="flex cursor-pointer flex-wrap items-center gap-2 px-4 py-3">
                      <span className="font-semibold text-ink">{entry.title}</span>
                      {entry.observed ? (
                        <Badge tone="warn">
                          <Eye aria-hidden="true" className="size-3.5" />
                          Seen during verification
                        </Badge>
                      ) : (
                        <Badge tone="outline">General advice</Badge>
                      )}
                      {entry.platforms.map((platform) => (
                        <Badge key={platform}>{PLATFORM_NAMES[platform]}</Badge>
                      ))}
                    </summary>
                    <div className="space-y-5 border-t border-line px-4 py-4 text-[0.95rem] text-ink-2">
                      {entry.observed ? (
                        <p className="rounded-lg bg-warn-soft px-3 py-2 text-sm text-ink">
                          Seen on {PLATFORM_NAMES[entry.observed.platform]} on{' '}
                          {formatIsoDate(entry.observed.on)}, during {entry.observed.during}.
                          Environment: {entry.observed.environment}.
                        </p>
                      ) : null}
                      <div>
                        <h4 className="text-sm font-bold text-ink">What you see</h4>
                        <p className="mt-1">{entry.symptom}</p>
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-ink">Likely causes</h4>
                        <ul className="mt-1 list-disc space-y-1 pl-5">
                          {entry.causes.map((cause) => (
                            <li key={cause}>{cause}</li>
                          ))}
                        </ul>
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-ink">Check</h4>
                        <div className="mt-1">
                          <Steps steps={entry.diagnose} />
                        </div>
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-ink">Fix</h4>
                        <div className="mt-1">
                          <Steps steps={entry.fix} />
                        </div>
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-ink">How to know it worked</h4>
                        <p className="mt-1">{entry.confirm}</p>
                      </div>
                    </div>
                  </details>
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
