import {
  PLATFORM_LABELS,
  VARIANT_LABELS,
  VERIFICATION_PLATFORMS,
  entryPassed,
  type ProjectManifest,
  type VerificationEntry,
} from '@campuskit/project-catalog';
import { CircleCheck, CircleX } from 'lucide-react';

import { StatusBadge } from '../../components/StatusBadge.tsx';
import { CommandBlock } from '../../components/ui/CommandBlock.tsx';
import { formatIsoDate } from '../../lib/format.ts';
import { getTemplateStatus } from '../../lib/verification.ts';

/** What `pnpm validate` checks for every template; deployment stops if any of these fail. */
const AUTOMATIC_CHECKS = [
  'The manifest matches the CampusKit schema, and its id, slug and template folder agree.',
  'The README, license, architecture notes, viva questions and every screenshot it lists exist.',
  'Every link between the template’s Markdown files points to a real file.',
  'Every customization applies cleanly, with the default values and with a project name full of special characters and Unicode.',
  'The template folder contains no credential files such as .env or private keys.',
];

function EntryDetails({ entry }: { entry: VerificationEntry }) {
  const versions = [
    `Node.js ${entry.environment.node}`,
    entry.environment.npm ? `npm ${entry.environment.npm}` : null,
    entry.environment.python ? `Python ${entry.environment.python}` : null,
  ].filter(Boolean);
  return (
    <div className="rounded-xl border border-line bg-surface p-5">
      <h4 className="flex flex-wrap items-baseline gap-x-2 font-semibold text-ink">
        {PLATFORM_LABELS[entry.platform]}
        <span className="text-sm font-normal text-ink-3">
          {formatIsoDate(entry.verifiedOn)}, template version {entry.templateVersion}
        </span>
      </h4>
      <p className="mt-1 text-sm text-ink-3">
        {entry.environment.os}; {versions.join(', ')}
      </p>
      <ul className="mt-4 grid gap-4 md:grid-cols-2">
        {entry.runs.map((run) => (
          <li key={run.variant} className="rounded-lg bg-raised p-4 text-sm">
            <p className="flex items-center gap-2 font-semibold text-ink">
              {run.passed ? (
                <CircleCheck aria-hidden="true" className="size-4 text-lime-text" />
              ) : (
                <CircleX aria-hidden="true" className="size-4 text-danger" />
              )}
              {VARIANT_LABELS[run.variant]}: {run.passed ? 'passed' : 'failed'}
            </p>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-ink-2">
              {run.steps.map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ul>
            {run.failure ? (
              <pre className="mt-2 max-h-40 overflow-auto rounded-md bg-code-bg p-2 text-xs whitespace-pre-wrap text-code-ink">
                {run.failure}
              </pre>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function VerificationPanel({ project }: { project: ProjectManifest }) {
  const status = getTemplateStatus(project);
  const verifiedPlatforms = status.current.filter(entryPassed).map((entry) => entry.platform);
  const missingPlatforms = VERIFICATION_PLATFORMS.filter(
    (platform) => !verifiedPlatforms.includes(platform),
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start gap-3 rounded-xl border border-line bg-surface p-5">
        <StatusBadge project={project} />
        <p className="min-w-0 flex-1 text-ink-2">{status.summary}</p>
      </div>

      <div>
        <h3 className="text-sm font-bold text-ink">Checked before every release of this site</h3>
        <ul className="mt-2 list-disc space-y-1.5 pl-5 text-[0.95rem] text-ink-2">
          {AUTOMATIC_CHECKS.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </div>

      <div className="space-y-3">
        <h3 className="text-sm font-bold text-ink">Full verification of the generated project</h3>
        <p className="max-w-[70ch] text-[0.95rem] text-ink-2">
          A full verification generates the project twice (with the default settings and with every
          setting changed), extracts each ZIP, installs the dependencies, and runs the tests and the
          build or app, exactly as the setup steps describe.
        </p>
        {status.current.length > 0 ? (
          <div className="space-y-4">
            {status.current.map((entry) => (
              <EntryDetails key={entry.platform} entry={entry} />
            ))}
          </div>
        ) : (
          <p className="text-[0.95rem] text-ink-3">
            No full verification matches the current template files yet.
          </p>
        )}
        {missingPlatforms.length > 0 && missingPlatforms.length < VERIFICATION_PLATFORMS.length ? (
          <p className="text-sm text-ink-3">
            Not yet verified on{' '}
            {missingPlatforms.map((platform) => PLATFORM_LABELS[platform]).join(' or ')}. The setup
            steps are written for every platform, but only the systems above have been tested.
          </p>
        ) : null}
        {status.outdated.length > 0 ? (
          <details className="rounded-xl border border-line p-4 text-sm">
            <summary className="cursor-pointer font-semibold text-ink">
              Earlier results, from before the template last changed
            </summary>
            <div className="mt-4 space-y-4">
              {status.outdated.map((entry) => (
                <EntryDetails key={entry.platform} entry={entry} />
              ))}
            </div>
          </details>
        ) : null}
        <p className="text-sm text-ink-3">
          Maintainers record a verification on their own computer with the command below. The record
          stores a fingerprint of the template files, so any later change to the template marks it
          as awaiting verification again.
        </p>
        <CommandBlock commands={[`pnpm verify:generated ${project.id} --record`]} />
      </div>
    </div>
  );
}
