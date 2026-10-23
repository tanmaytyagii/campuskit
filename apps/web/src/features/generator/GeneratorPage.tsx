import {
  catalog,
  DIFFICULTY_LABELS,
  formatOptionValue,
  getProjectById,
  PROJECT_TYPE_LABELS,
  type ProjectManifest,
} from '@campuskit/project-catalog';
import { formatBytes } from '@campuskit/template-engine';
import { Download, PackageOpen, RotateCcw } from 'lucide-react';
import { useEffect, useMemo, useRef, useState, type RefObject } from 'react';
import { Link, useSearchParams } from 'react-router';

import { PageHeader } from '../../components/layout/PageHeader.tsx';
import { SetupSteps } from '../../components/SetupSteps.tsx';
import { StatusBadge } from '../../components/StatusBadge.tsx';
import { Badge } from '../../components/ui/Badge.tsx';
import { Button, ButtonLink } from '../../components/ui/Button.tsx';
import { Callout } from '../../components/ui/Callout.tsx';
import { Spinner } from '../../components/ui/Spinner.tsx';
import { useDocumentTitle } from '../../hooks/useDocumentTitle.ts';
import { useTemplateBundle } from '../../hooks/useTemplateBundle.ts';
import { cn } from '../../lib/cn.ts';
import { downloadFile } from '../../lib/download.ts';
import { getTemplateStatus } from '../../lib/verification.ts';
import { FilePreview } from './FilePreview.tsx';
import { KitPreview } from './KitPreview.tsx';
import {
  buildZip,
  initialFormValues,
  optionsForStep,
  planProject,
  previewValues,
  setupFacts,
  STEP_IDS,
  validateOptions,
  type FormValue,
  type FormValues,
  type GeneratedZip,
  type StepId,
} from './logic.ts';
import { OptionInput, optionInputId } from './OptionInput.tsx';
import { STEP_LABELS, Stepper } from './Stepper.tsx';

const GROUP_LABELS = {
  appearance: 'Appearance',
  data: 'Sample data',
  behaviour: 'Behaviour',
} as const;

/** Keeps text the student already typed (name, institution, author) when they switch templates. */
function carryOver(
  next: ProjectManifest,
  previous: ProjectManifest | undefined,
  values: FormValues,
): FormValues {
  const fresh = initialFormValues(next);
  if (!previous) return fresh;
  for (const option of next.customization.options) {
    const old = previous.customization.options.find((candidate) => candidate.id === option.id);
    const current = values[option.id];
    if (
      old?.type === 'text' &&
      option.type === 'text' &&
      typeof current === 'string' &&
      current !== old.default
    ) {
      fresh[option.id] = current;
    }
  }
  return fresh;
}

type Status = { kind: 'idle' } | { kind: 'working' } | { kind: 'error'; message: string };

export function GeneratorPage() {
  useDocumentTitle('Generate a project');
  const [params, setParams] = useSearchParams();
  const requested = getProjectById(params.get('template') ?? '');
  const requestedName = params.get('name');

  const [templateId, setTemplateId] = useState<string | null>(requested?.id ?? null);
  const [step, setStep] = useState<StepId>(requested ? 'details' : 'template');
  const [values, setValues] = useState<FormValues>(() =>
    requested
      ? initialFormValues(
          requested,
          requestedName ? { projectName: requestedName.slice(0, 60) } : {},
        )
      : {},
  );
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [generated, setGenerated] = useState<GeneratedZip | null>(null);
  const [status, setStatus] = useState<Status>({ kind: 'idle' });

  const manifest = templateId ? getProjectById(templateId) : undefined;
  const bundle = useTemplateBundle(templateId);
  const heading = useRef<HTMLHeadingElement>(null);
  const previousStep = useRef(step);

  const steps: StepId[] =
    manifest && optionsForStep(manifest, 'options').length === 0
      ? STEP_IDS.filter((id) => id !== 'options')
      : [...STEP_IDS];

  useEffect(() => {
    if (previousStep.current === step) return;
    previousStep.current = step;
    heading.current?.focus();
  }, [step]);

  const preview = useMemo(
    () => (manifest ? previewValues(manifest, values) : null),
    [manifest, values],
  );

  const plan = useMemo(() => {
    if (step !== 'review' || !manifest || bundle.status !== 'ready') return null;
    try {
      return { ok: true as const, project: planProject(manifest, bundle.bundle, values) };
    } catch (error) {
      return {
        ok: false as const,
        message: error instanceof Error ? error.message : 'The project could not be prepared.',
      };
    }
  }, [step, manifest, bundle, values]);

  function chooseTemplate(id: string) {
    const next = getProjectById(id);
    if (!next) return;
    setValues((current) => carryOver(next, manifest, current));
    setTemplateId(id);
    setErrors({});
    setGenerated(null);
    setParams(
      (current) => {
        const updated = new URLSearchParams(current);
        updated.set('template', id);
        updated.delete('name');
        return updated;
      },
      { replace: true },
    );
  }

  function update(id: string, value: FormValue) {
    setValues((current) => ({ ...current, [id]: value }));
    if (errors[id])
      setErrors((current) =>
        Object.fromEntries(Object.entries(current).filter(([key]) => key !== id)),
      );
  }

  function validateStep(which: 'details' | 'options'): boolean {
    if (!manifest) return false;
    const options = optionsForStep(manifest, which);
    const found = validateOptions(options, values);
    setErrors(found);
    const firstInvalid = options.find((option) => found[option.id]);
    if (firstInvalid) {
      document.getElementById(optionInputId(firstInvalid.id))?.focus();
      return false;
    }
    return true;
  }

  function goNext() {
    const index = steps.indexOf(step);
    if (step === 'details' && !validateStep('details')) return;
    if (step === 'options' && !validateStep('options')) return;
    const next = steps[index + 1];
    if (next) setStep(next);
  }

  function goBack() {
    const previous = steps[steps.indexOf(step) - 1];
    if (previous) setStep(previous);
  }

  async function generate() {
    if (!plan?.ok) return;
    setStatus({ kind: 'working' });
    try {
      const result = await buildZip(plan.project);
      downloadFile(result.zip, result.fileName, 'application/zip');
      setGenerated(result);
      setStatus({ kind: 'idle' });
      setStep('done');
    } catch (error) {
      setStatus({
        kind: 'error',
        message: error instanceof Error ? error.message : 'The ZIP could not be created.',
      });
    }
  }

  function startOver() {
    setGenerated(null);
    setStatus({ kind: 'idle' });
    setStep(manifest ? 'details' : 'template');
  }

  const stepHeading = (title: string, description: string) => (
    <div className="mb-6 space-y-1">
      <h2 ref={heading} tabIndex={-1} className="heading text-2xl text-ink outline-none">
        {title}
      </h2>
      <p className="text-ink-3">{description}</p>
    </div>
  );

  const navigation = (nextLabel: string, disabled = false) => (
    <div className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-6">
      {step !== 'template' ? (
        <Button variant="secondary" onClick={goBack}>
          Back
        </Button>
      ) : (
        <span />
      )}
      <Button onClick={goNext} disabled={disabled}>
        {nextLabel}
      </Button>
    </div>
  );

  return (
    <>
      <PageHeader
        title="Generate a project"
        description="Pick a template, make it yours, and download a ZIP with the source code, setup instructions and docs. Everything happens in your browser."
      />
      <div className="container-page space-y-8">
        <Stepper
          steps={steps}
          current={step}
          reachable={(target) => target !== 'done' && (target === 'template' || Boolean(manifest))}
          onSelect={setStep}
        />

        <div
          className={cn(
            'grid gap-8',
            step !== 'template' && step !== 'done' && 'lg:grid-cols-[minmax(0,1fr)_380px]',
          )}
        >
          <section
            aria-label={STEP_LABELS[step]}
            className="min-w-0 rounded-[18px] border border-line bg-surface p-5 shadow-card sm:p-8"
          >
            {step === 'template' ? (
              <>
                {stepHeading(
                  'Choose a template',
                  'Every template is a complete, tested project you can run on your own computer.',
                )}
                <TemplateChooser selected={templateId} onSelect={chooseTemplate} />
                {manifest ? <TemplateSummary manifest={manifest} /> : null}
                {navigation(
                  manifest ? `Continue with ${manifest.name}` : 'Choose a template to continue',
                  !manifest,
                )}
              </>
            ) : null}

            {step === 'details' && manifest ? (
              <>
                {stepHeading(
                  'Name your project',
                  'These details appear in the app and its README. You can change them later in the code.',
                )}
                <div className="space-y-6">
                  {optionsForStep(manifest, 'details').map((option) => (
                    <OptionInput
                      key={option.id}
                      option={option}
                      value={values[option.id]}
                      error={errors[option.id]}
                      onChange={(value) => update(option.id, value)}
                    />
                  ))}
                </div>
                {navigation(
                  steps.includes('options') ? 'Continue to options' : 'Review your project',
                )}
              </>
            ) : null}

            {step === 'options' && manifest ? (
              <>
                {stepHeading(
                  'Choose options',
                  `Only settings that ${manifest.name} actually supports are shown here.`,
                )}
                <div className="space-y-8">
                  {(['appearance', 'data', 'behaviour'] as const).map((group) => {
                    const options = optionsForStep(manifest, 'options').filter(
                      (option) => option.group === group,
                    );
                    if (options.length === 0) return null;
                    return (
                      <div key={group} className="space-y-5">
                        <h3 className="text-base font-bold text-ink">{GROUP_LABELS[group]}</h3>
                        {options.map((option) => (
                          <OptionInput
                            key={option.id}
                            option={option}
                            value={values[option.id]}
                            error={errors[option.id]}
                            onChange={(value) => update(option.id, value)}
                          />
                        ))}
                      </div>
                    );
                  })}
                </div>
                {navigation('Review your project')}
              </>
            ) : null}

            {step === 'review' && manifest ? (
              <>
                {stepHeading(
                  'Review and generate',
                  'Check your choices. The ZIP is built in your browser and downloads straight away.',
                )}
                <ReviewPanel manifest={manifest} values={values} />
                <div className="mt-8 space-y-4">
                  {bundle.status === 'loading' || bundle.status === 'idle' ? (
                    <Spinner label="Preparing the template files…" />
                  ) : null}
                  {bundle.status === 'error' ? (
                    <Callout
                      tone="danger"
                      title="The template files couldn’t be loaded"
                      role="alert"
                    >
                      <p>{bundle.message}</p>
                      <Button
                        variant="secondary"
                        size="sm"
                        className="mt-3"
                        onClick={bundle.retry}
                        icon={<RotateCcw aria-hidden="true" className="size-4" />}
                      >
                        Try again
                      </Button>
                    </Callout>
                  ) : null}
                  {plan && !plan.ok ? (
                    <Callout tone="danger" title="This project can’t be generated yet" role="alert">
                      {plan.message}
                    </Callout>
                  ) : null}
                  {plan?.ok ? <FileChanges project={plan.project} /> : null}
                  {plan?.ok ? <FilePreview project={plan.project} /> : null}
                  {status.kind === 'error' ? (
                    <Callout tone="danger" title="The ZIP could not be created" role="alert">
                      {status.message}
                    </Callout>
                  ) : null}
                </div>
                <div className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-6">
                  <Button variant="secondary" onClick={goBack}>
                    Back
                  </Button>
                  <Button
                    size="lg"
                    onClick={() => void generate()}
                    disabled={!plan?.ok || status.kind === 'working'}
                    icon={<Download aria-hidden="true" className="size-5" />}
                  >
                    {status.kind === 'working' ? 'Generating…' : 'Generate ZIP'}
                  </Button>
                </div>
              </>
            ) : null}

            {step === 'done' && manifest && generated ? (
              <DonePanel
                manifest={manifest}
                generated={generated}
                headingRef={heading}
                onStartOver={startOver}
              />
            ) : null}
            {step === 'done' && !generated ? (
              <Callout tone="info" title="Nothing generated yet">
                <Button size="sm" className="mt-2" onClick={startOver}>
                  Start again
                </Button>
              </Callout>
            ) : null}
          </section>

          {manifest && preview && step !== 'template' && step !== 'done' ? (
            <aside
              aria-label="Live preview"
              className="space-y-3 lg:sticky lg:top-24 lg:self-start"
            >
              <h2 className="text-sm font-bold text-ink">What your choices change</h2>
              <p className="text-sm text-ink-3">
                The template engine writes these values into these files, and nowhere else.
              </p>
              <KitPreview manifest={manifest} values={preview} />
            </aside>
          ) : null}
        </div>
      </div>
    </>
  );
}

function TemplateChooser({
  selected,
  onSelect,
}: {
  selected: string | null;
  onSelect: (id: string) => void;
}) {
  return (
    <fieldset>
      <legend className="sr-only">Templates</legend>
      <div className="grid gap-3">
        {catalog.map((project) => {
          const checked = selected === project.id;
          return (
            <label
              key={project.id}
              className={cn(
                'flex cursor-pointer gap-4 rounded-xl border p-4 transition-colors',
                'has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-focus',
                checked ? 'border-violet bg-violet-soft' : 'border-line-strong hover:border-ink-3',
              )}
            >
              <input
                type="radio"
                name="template"
                value={project.id}
                checked={checked}
                onChange={() => onSelect(project.id)}
                className="mt-1 size-4 shrink-0 accent-violet"
              />
              <span className="min-w-0 space-y-1.5">
                <span className="block font-semibold text-ink">{project.name}</span>
                <span className="block text-sm text-ink-2">{project.tagline}</span>
                <span className="flex flex-wrap gap-1.5 pt-1">
                  <StatusBadge project={project} />
                  <Badge tone="violet">{DIFFICULTY_LABELS[project.difficulty]}</Badge>
                  <Badge>{PROJECT_TYPE_LABELS[project.projectType]}</Badge>
                  {[
                    ...project.languages.filter((language) => language !== 'CSS'),
                    ...project.frameworks,
                  ]
                    .slice(0, 4)
                    .map((tech) => (
                      <Badge key={tech} tone="outline">
                        {tech}
                      </Badge>
                    ))}
                </span>
              </span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

function TemplateSummary({ manifest }: { manifest: ProjectManifest }) {
  const status = getTemplateStatus(manifest);
  return (
    <div className="mt-6 space-y-4">
      {status.id === 'verified' ? null : (
        <Callout
          tone={status.id === 'awaiting-verification' ? 'info' : 'warn'}
          title={`${manifest.name}: ${status.label.toLowerCase()}`}
        >
          {status.summary}{' '}
          <Link to={`/projects/${manifest.slug}#verification`} className="link">
            What is checked
          </Link>
        </Callout>
      )}
      <div className="grid gap-6 rounded-xl bg-raised p-5 md:grid-cols-2">
        <div>
          <h3 className="text-sm font-bold text-ink">What you get</h3>
          <ul className="mt-2 list-disc space-y-1.5 pl-5 text-sm text-ink-2">
            {manifest.features.slice(0, 5).map((feature) => (
              <li key={feature}>{feature}</li>
            ))}
          </ul>
          <Link to={`/projects/${manifest.slug}`} className="link mt-3 inline-block text-sm">
            See every feature and limitation
          </Link>
        </div>
        <div className="space-y-5">
          <div>
            <h3 className="text-sm font-bold text-ink">You will need</h3>
            <ul className="mt-2 space-y-1.5 text-sm text-ink-2">
              {manifest.prerequisites.map((item) => (
                <li key={item.name}>
                  <span className="font-semibold text-ink">{item.name}</span>
                  {item.version ? ` ${item.version}` : ''}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className="text-sm font-bold text-ink">Setting it up</h3>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-ink-2">
              {setupFacts(manifest)
                .slice(1)
                .map((fact) => (
                  <li key={fact}>{fact}</li>
                ))}
            </ul>
          </div>
          <div>
            <h3 className="text-sm font-bold text-ink">You can customize</h3>
            <p className="mt-2 text-sm text-ink-2">
              {manifest.customization.options.map((option) => option.label).join(', ')}.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function ReviewPanel({ manifest, values }: { manifest: ProjectManifest; values: FormValues }) {
  const resolved = previewValues(manifest, values);
  return (
    <div className="space-y-6">
      <dl className="grid gap-x-6 gap-y-3 rounded-xl border border-line p-5 sm:grid-cols-2">
        <div>
          <dt className="text-xs font-semibold text-ink-3">Template</dt>
          <dd className="font-medium text-ink">
            {manifest.name} <span className="text-ink-3">v{manifest.version}</span>
          </dd>
        </div>
        <div>
          <dt className="text-xs font-semibold text-ink-3">Folder inside the ZIP</dt>
          <dd className="font-mono text-sm text-ink">{resolved.projectSlug}/</dd>
        </div>
        {manifest.customization.options.map((option) => {
          const shown = formatOptionValue(option, resolved.options[option.id] ?? option.default);
          return (
            <div key={option.id}>
              <dt className="text-xs font-semibold text-ink-3">{option.label}</dt>
              <dd className="break-words font-medium text-ink">
                {shown || <span className="font-normal text-ink-3">Left empty</span>}
              </dd>
            </div>
          );
        })}
      </dl>
    </div>
  );
}

function FileChanges({ project }: { project: ReturnType<typeof planProject> }) {
  const files = new Map<string, string[]>();
  for (const edit of project.edits)
    files.set(edit.file, [...(files.get(edit.file) ?? []), edit.label]);
  return (
    <div className="space-y-3 rounded-xl border border-line p-5">
      <p className="text-sm text-ink-2">
        <span className="font-semibold text-ink">{project.files.length} files</span> (
        {formatBytes(project.totalBytes)}) will be packed into{' '}
        <span className="font-mono">{project.rootFolder}.zip</span>, including GETTING_STARTED.md
        with your setup steps and a project report draft in docs/. Your choices change {files.size}{' '}
        files:
      </p>
      <ul className="grid gap-2 sm:grid-cols-2">
        {[...files.entries()].map(([file, labels]) => (
          <li key={file} className="rounded-lg bg-raised px-3 py-2">
            <p className="font-mono text-[0.8rem] text-ink">{file}</p>
            <p className="text-xs text-ink-3">{labels.join(', ')}</p>
          </li>
        ))}
      </ul>
      <p className="text-xs text-ink-3">
        Dependencies, build output, caches and secret files (such as .env) are never included.
        Install dependencies after extracting the ZIP.
      </p>
    </div>
  );
}

function DonePanel({
  manifest,
  generated,
  headingRef,
  onStartOver,
}: {
  manifest: ProjectManifest;
  generated: GeneratedZip;
  headingRef: RefObject<HTMLHeadingElement | null>;
  onStartOver: () => void;
}) {
  const { project, zip, fileName } = generated;
  return (
    <div className="space-y-8">
      <div className="rounded-xl border-2 border-lime bg-lime-soft p-5 sm:p-6">
        <div className="flex flex-wrap items-start gap-4">
          <span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-lime text-lime-ink">
            <PackageOpen aria-hidden="true" className="size-6" />
          </span>
          <div className="min-w-0 flex-1 space-y-1">
            <h2 ref={headingRef} tabIndex={-1} className="heading text-2xl text-ink outline-none">
              {fileName} is ready
            </h2>
            <p className="text-ink-2">
              {project.files.length} files, {formatBytes(zip.length)} compressed. Your download
              should have started; if it didn’t, use the button.
            </p>
          </div>
          <Button
            variant="secondary"
            onClick={() => downloadFile(zip, fileName, 'application/zip')}
            icon={<Download aria-hidden="true" className="size-4" />}
          >
            Download again
          </Button>
        </div>
      </div>

      <div>
        <h3 className="heading text-xl text-ink">Run your project</h3>
        <p className="mt-1 mb-5 text-ink-3">
          These are the exact steps for{' '}
          <span className="font-semibold text-ink-2">{project.guide.projectName}</span>. They are
          also inside the ZIP as GETTING_STARTED.md.
        </p>
        <div className="mb-6 space-y-2 rounded-xl bg-raised p-4 text-sm text-ink-2">
          <p className="font-semibold text-ink">Before you start, install:</p>
          <ul className="list-disc space-y-1 pl-5">
            {project.guide.prerequisites.map((item) => (
              <li key={item.name}>
                {item.url ? (
                  <a href={item.url} target="_blank" rel="noopener noreferrer" className="link">
                    {item.name}
                  </a>
                ) : (
                  <span className="font-semibold">{item.name}</span>
                )}
                {item.version ? ` ${item.version}` : ''}
                {item.note ? `: ${item.note}` : ''}
              </li>
            ))}
          </ul>
        </div>
        <SetupSteps steps={project.guide.steps} headingLevel="h3" />
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="rounded-xl border border-line p-5 text-sm">
          <h3 className="font-bold text-ink">Environment variables</h3>
          {project.guide.environment && project.guide.environment.length > 0 ? (
            <ul className="mt-2 space-y-2 text-ink-2">
              {project.guide.environment.map((variable) => (
                <li key={variable.name}>
                  <code className="font-mono text-ink">{variable.name}</code>
                  {variable.required ? ' (required)' : ' (optional)'}: {variable.description}
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-ink-2">
              None. This project needs no API keys, passwords or other secrets.
            </p>
          )}
        </div>
        <div className="rounded-xl border border-line p-5 text-sm">
          <h3 className="font-bold text-ink">Known limitations</h3>
          <ul className="mt-2 list-disc space-y-1.5 pl-5 text-ink-2">
            {manifest.limitations.map((limitation) => (
              <li key={limitation}>{limitation}</li>
            ))}
          </ul>
        </div>
      </div>

      <Callout tone="info" title="Your documentation">
        The ZIP includes the README, docs/ARCHITECTURE.md, docs/VIVA_QUESTIONS.md and{' '}
        <span className="font-mono">docs/PROJECT_REPORT_DRAFT.md</span>: a report outline built from
        this project’s real features and limitations, with [bracketed prompts] for everything you
        must write or measure yourself.
      </Callout>

      <div className="flex flex-wrap gap-3 border-t border-line pt-6">
        <ButtonLink to={`/learn?project=${manifest.id}`} variant="secondary">
          Draft your report and viva answers
        </ButtonLink>
        <ButtonLink to={`/projects/${manifest.slug}`} variant="secondary">
          Open the project page
        </ButtonLink>
        <Button variant="ghost" onClick={onStartOver}>
          Change settings and generate again
        </Button>
      </div>
    </div>
  );
}
