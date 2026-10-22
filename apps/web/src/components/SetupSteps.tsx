import type { CommandPlatform, SetupStep } from '@campuskit/template-engine';
import { useId, useState } from 'react';

import { cn } from '../lib/cn.ts';
import { CommandBlock } from './ui/CommandBlock.tsx';

type Platform = Exclude<CommandPlatform, 'all'>;

const PLATFORM_LABELS: Record<Platform, string> = {
  windows: 'Windows',
  'macos-linux': 'macOS / Linux',
};

function guessPlatform(): Platform {
  return typeof navigator !== 'undefined' && /windows/i.test(navigator.userAgent)
    ? 'windows'
    : 'macos-linux';
}

/** Numbered setup steps. A platform switch appears only when commands differ by operating system. */
export function SetupSteps({
  steps,
  headingLevel = 'h3',
}: {
  steps: SetupStep[];
  headingLevel?: 'h2' | 'h3';
}) {
  const [platform, setPlatform] = useState<Platform>(guessPlatform);
  const switchName = useId();
  const hasPlatformCommands = steps.some((step) =>
    step.commands.some((command) => command.platform !== 'all'),
  );
  const Heading = headingLevel;

  return (
    <div className="space-y-5">
      {hasPlatformCommands ? (
        <fieldset className="inline-flex rounded-lg border border-line bg-surface p-1">
          <legend className="sr-only">Show commands for</legend>
          {(Object.keys(PLATFORM_LABELS) as Platform[]).map((value) => (
            <label
              key={value}
              className={cn(
                'cursor-pointer rounded-md px-3 py-1.5 text-sm font-semibold',
                'has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-focus',
                platform === value ? 'bg-violet text-on-violet' : 'text-ink-2 hover:text-ink',
              )}
            >
              <input
                type="radio"
                name={switchName}
                value={value}
                checked={platform === value}
                onChange={() => setPlatform(value)}
                className="sr-only"
              />
              {PLATFORM_LABELS[value]}
            </label>
          ))}
        </fieldset>
      ) : null}
      <ol className="space-y-6">
        {steps.map((step, index) => {
          const commands = step.commands
            .filter((command) => command.platform === 'all' || command.platform === platform)
            .map((command) => command.command);
          return (
            <li key={step.title} className="grid grid-cols-[2.25rem_1fr] gap-x-4">
              <span
                aria-hidden="true"
                className="flex size-9 items-center justify-center rounded-full border-2 border-violet font-mono text-sm font-medium text-violet"
              >
                {index + 1}
              </span>
              <div className="min-w-0 space-y-2.5 pt-1">
                <Heading className="text-base font-semibold text-ink">
                  <span className="sr-only">Step {index + 1}: </span>
                  {step.title}
                </Heading>
                {commands.length > 0 ? <CommandBlock commands={commands} /> : null}
                {step.note ? <p className="text-sm text-ink-3">{step.note}</p> : null}
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
