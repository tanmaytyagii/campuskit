import {
  assembleReport,
  catalog,
  countPrompts,
  draftSection,
  emptyInfo,
  getProjectById,
  presentationAsSlides,
  SECTION_IDS,
  SECTION_TITLES,
  type ProjectManifest,
  type ReportInfo,
  type SectionId,
} from '@campuskit/project-catalog';
import { Check, Copy, Download, Eye, RotateCcw, Trash } from 'lucide-react';
import { useEffect, useId, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router';

import { MarkdownView } from '../../components/MarkdownView.tsx';
import { Badge } from '../../components/ui/Badge.tsx';
import { Button } from '../../components/ui/Button.tsx';
import { Callout } from '../../components/ui/Callout.tsx';
import { Dialog } from '../../components/ui/Dialog.tsx';
import { Checkbox, SelectField, TextField } from '../../components/ui/Field.tsx';
import { useCopyToClipboard } from '../../hooks/useCopyToClipboard.ts';
import { useLearningGuide } from '../../hooks/useLearningGuide.ts';
import { loadTemplateDoc } from '../../lib/assets.ts';
import { cn } from '../../lib/cn.ts';
import { downloadFile } from '../../lib/download.ts';
import { formatIsoDate, todayIso } from '../../lib/format.ts';
import { readTicked, readVivaProgress, summarizeViva, writeTicked } from '../../lib/progress.ts';
import { readStored, removeStored, writeStored } from '../../lib/storage.ts';
import { verificationLines } from '../../lib/verification.ts';
import { studioHref, vivaHref } from '../learning/links.ts';

const CUSTOM = 'custom';
const STORAGE_PREFIX = 'campuskit:report:v1:';

interface StoredReport {
  info: ReportInfo;
  sections: Partial<Record<SectionId, string>>;
}

/**
 * Accepts drafts saved before sections were added (they only lack the new
 * sections, which are then filled with fresh drafts) but never a value with a
 * section that isn't text.
 */
function isStoredReport(value: unknown): value is StoredReport {
  if (typeof value !== 'object' || value === null) return false;
  const candidate = value as Partial<StoredReport>;
  if (typeof candidate.info !== 'object' || candidate.info === null) return false;
  if (typeof candidate.sections !== 'object' || candidate.sections === null) return false;
  const sections = candidate.sections as Record<string, unknown>;
  return SECTION_IDS.every((id) => sections[id] === undefined || typeof sections[id] === 'string');
}

function draftAll(
  project: ProjectManifest | null,
  info: ReportInfo,
  viva?: string,
): Record<SectionId, string> {
  return Object.fromEntries(
    SECTION_IDS.map((id) => [id, draftSection(id, project, info, viva)]),
  ) as Record<SectionId, string>;
}

/** Loads the template's viva document so the viva section can include it. */
function useVivaDoc(project: ProjectManifest | null): {
  ready: boolean;
  markdown: string | undefined;
} {
  const doc = project?.docs.find((item) => item.kind === 'viva');
  const key = project && doc ? `${project.id}/${doc.file}` : null;
  const [loaded, setLoaded] = useState<{ key: string; markdown: string | undefined } | null>(null);

  useEffect(() => {
    if (!project || !doc || !key) return undefined;
    let cancelled = false;
    const loading = loadTemplateDoc(project.template.directory, doc.file);
    const settle = (markdown: string | undefined) => {
      if (!cancelled) setLoaded({ key, markdown });
    };
    if (!loading) queueMicrotask(() => settle(undefined));
    else loading.then(settle, () => settle(undefined));
    return () => {
      cancelled = true;
    };
  }, [project, doc, key]);

  if (!key) return { ready: true, markdown: undefined };
  return loaded?.key === key
    ? { ready: true, markdown: loaded.markdown }
    : { ready: false, markdown: undefined };
}

export function ReportBuilder() {
  const [params, setParams] = useSearchParams();
  const requested = params.get('project');
  const projectId =
    requested && getProjectById(requested)
      ? requested
      : requested === CUSTOM
        ? CUSTOM
        : (catalog[0]?.id ?? CUSTOM);
  const project = projectId === CUSTOM ? null : (getProjectById(projectId) ?? null);
  const viva = useVivaDoc(project);
  const guide = useLearningGuide(project ?? undefined);

  return viva.ready && guide.status !== 'loading' ? (
    <ReportEditor
      key={projectId}
      projectId={projectId}
      project={project}
      viva={viva.markdown}
      demoSteps={guide.status === 'ready' ? guide.loaded.guide.demo : null}
      questionIds={guide.status === 'ready' ? guide.loaded.guide.viva.map((item) => item.id) : null}
      onChangeProject={(id) => setParams({ project: id }, { replace: true, flushSync: true })}
    />
  ) : (
    <p className="text-sm text-ink-3" role="status">
      Preparing the draft…
    </p>
  );
}

function ReportEditor({
  projectId,
  project,
  viva,
  demoSteps,
  questionIds,
  onChangeProject,
}: {
  projectId: string;
  project: ProjectManifest | null;
  viva: string | undefined;
  /** Demonstration steps from the learning guide, when the project has one. */
  demoSteps: string[] | null;
  questionIds: string[] | null;
  onChangeProject: (id: string) => void;
}) {
  const storageKey = `${STORAGE_PREFIX}${projectId}`;
  const [saved] = useState(() => readStored(storageKey, isStoredReport));
  const [info, setInfo] = useState<ReportInfo>(() => ({
    ...emptyInfo(project),
    ...(saved?.info ?? {}),
  }));
  const [sections, setSections] = useState<Record<SectionId, string>>(() => ({
    ...draftAll(project, info, viva),
    ...(saved?.sections ?? {}),
  }));
  const demoIds = (demoSteps ?? []).map((_, index) => `step-${index + 1}`);
  const [demoDone, setDemoDone] = useState(() => readTicked('demo', projectId, demoIds));
  const [vivaSummary] = useState(() =>
    questionIds ? summarizeViva(readVivaProgress(projectId, questionIds), questionIds) : null,
  );
  const verification = useMemo(() => (project ? verificationLines(project) : []), [project]);
  const slides = useCopyToClipboard();
  const [previewOpen, setPreviewOpen] = useState(false);
  const [notice, setNotice] = useState<string | null>(
    saved ? 'Restored your saved draft from this browser.' : null,
  );
  const { state: copyState, copy } = useCopyToClipboard();
  const projectSelectId = useId();
  const today = todayIso();

  // Only a draft the student has changed is saved, so an untouched draft is never
  // "restored" on the next visit.
  const [edited, setEdited] = useState(saved !== null);

  useEffect(() => {
    if (edited) writeStored(storageKey, { info, sections });
  }, [edited, storageKey, info, sections]);

  const report = useMemo(
    () =>
      assembleReport(project, info, sections, formatIsoDate(today), {
        verification,
        ...(demoSteps
          ? {
              demo: demoSteps.map((text, index) => ({
                text,
                done: demoDone.has(`step-${index + 1}`),
              })),
            }
          : {}),
      }),
    [project, info, sections, today, verification, demoSteps, demoDone],
  );

  function toggleDemo(id: string, checked: boolean) {
    const next = new Set(demoDone);
    if (checked) next.add(id);
    else next.delete(id);
    setDemoDone(next);
    writeTicked('demo', projectId, next);
  }
  const remaining = SECTION_IDS.reduce((sum, id) => sum + countPrompts(sections[id]), 0);

  function updateInfo(field: keyof ReportInfo, value: string) {
    setEdited(true);
    setInfo((current) => ({ ...current, [field]: value }));
  }

  function resetSection(id: SectionId) {
    setEdited(true);
    setSections((current) => ({ ...current, [id]: draftSection(id, project, info, viva) }));
    setNotice(`Reset “${SECTION_TITLES[id]}” to the draft.`);
  }

  function clearSaved() {
    removeStored(storageKey);
    setEdited(false);
    const fresh = emptyInfo(project);
    setInfo(fresh);
    setSections(draftAll(project, fresh, viva));
    setNotice('Cleared your saved work for this project and started a fresh draft.');
  }

  const fileName = `${
    (info.title.trim() || project?.id || 'project')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '') || 'project'
  }-report-draft.md`;

  return (
    <div className="space-y-8">
      <Callout tone="warn" title="This is a draft for you to complete">
        The drafts use only facts from the project’s documentation. Every [bracketed prompt] is
        something you must write, measure or check yourself. Adapt the structure to your
        institution’s format and never submit text you don’t understand.
      </Callout>

      <section
        aria-labelledby="report-details"
        className="rounded-2xl border border-line bg-surface p-5 shadow-card sm:p-6"
      >
        <h3 id="report-details" className="type-h3 text-ink">
          Project details
        </h3>
        <div className="mt-5 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          <SelectField
            id={projectSelectId}
            label="Project"
            value={projectId}
            onChange={(event) => onChangeProject(event.target.value)}
            description="Choose a CampusKit project, or start from blank prompts."
          >
            {catalog.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
            <option value={CUSTOM}>My own project (blank prompts)</option>
          </SelectField>
          <TextField
            label="Report title"
            value={info.title}
            onChange={(event) => updateInfo('title', event.target.value)}
          />
          <TextField
            label="Team members"
            placeholder="e.g. Asha K., Rahul M."
            value={info.team}
            onChange={(event) => updateInfo('team', event.target.value)}
          />
          <TextField
            label="Guide or supervisor"
            value={info.guide}
            onChange={(event) => updateInfo('guide', event.target.value)}
          />
          <TextField
            label="Institution"
            value={info.institution}
            onChange={(event) => updateInfo('institution', event.target.value)}
          />
          <TextField
            label="Department"
            value={info.department}
            onChange={(event) => updateInfo('department', event.target.value)}
          />
          <TextField
            label="Academic year"
            placeholder="e.g. 2026–27"
            value={info.academicYear}
            onChange={(event) => updateInfo('academicYear', event.target.value)}
          />
        </div>
      </section>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_280px]">
        <div className="min-w-0 space-y-6">
          {SECTION_IDS.map((id, index) => {
            const prompts = countPrompts(sections[id]);
            const words = sections[id].trim() ? sections[id].trim().split(/\s+/).length : 0;
            const untouched = sections[id].trim() === draftSection(id, project, info, viva).trim();
            return (
              <section
                key={id}
                id={`section-${id}`}
                aria-labelledby={`section-${id}-title`}
                className="scroll-mt-24 rounded-xl border border-line bg-surface p-5"
              >
                <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
                  <h3
                    id={`section-${id}-title`}
                    className="flex flex-wrap items-center gap-2 text-lg font-bold text-ink"
                  >
                    {index + 1}. {SECTION_TITLES[id]}
                    {untouched ? (
                      <Badge tone="outline">CampusKit draft</Badge>
                    ) : (
                      <Badge tone="violet">Edited by you</Badge>
                    )}
                  </h3>
                  <span
                    className={cn(
                      'text-xs font-semibold',
                      prompts > 0 ? 'text-warn' : 'text-lime-text',
                    )}
                  >
                    {prompts > 0
                      ? `${prompts} ${prompts === 1 ? 'prompt' : 'prompts'} to complete`
                      : 'No prompts left'}
                  </span>
                </div>
                <label htmlFor={`text-${id}`} className="sr-only">
                  {SECTION_TITLES[id]} (Markdown)
                </label>
                <textarea
                  id={`text-${id}`}
                  value={sections[id]}
                  onChange={(event) => {
                    setEdited(true);
                    setSections((current) => ({ ...current, [id]: event.target.value }));
                  }}
                  rows={Math.min(22, Math.max(6, sections[id].split('\n').length + 1))}
                  className="w-full rounded-lg border border-line-strong bg-canvas px-3 py-2.5 font-mono text-[0.85rem] leading-6 text-ink hover:border-ink-3"
                />
                <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs text-ink-3">
                  <span>{words} words</span>
                  {id === 'presentation' ? (
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => void slides.copy(presentationAsSlides(sections[id]))}
                      icon={<Copy aria-hidden="true" className="size-3.5" />}
                    >
                      {slides.state === 'copied'
                        ? 'Copied the slide list'
                        : slides.state === 'failed'
                          ? 'Copy failed'
                          : 'Copy as a slide list'}
                    </Button>
                  ) : null}
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => resetSection(id)}
                    icon={<RotateCcw aria-hidden="true" className="size-3.5" />}
                  >
                    Reset to draft
                  </Button>
                </div>
              </section>
            );
          })}
          {project ? (
            <section
              aria-labelledby="facts-heading"
              className="rounded-xl border border-dashed border-line-strong bg-raised p-5"
            >
              <h3 id="facts-heading" className="text-lg font-bold text-ink">
                Appendix: facts from CampusKit
              </h3>
              <p className="mt-1 text-sm text-ink-3">
                Added to the end of your download, clearly labelled as generated by CampusKit and
                not written by you. These facts describe the template as published, not your
                changes.
              </p>
              <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-ink-2">
                <li>
                  {project.name} {project.version}:{' '}
                  {[...project.languages, ...project.frameworks].join(', ')}
                </li>
                <li>
                  Automated tests: {project.testing.tools.join(', ')} (
                  {project.testing.commands.map((command) => command.command).join(', ')})
                </li>
                {verification.length > 0 ? (
                  verification.map((line) => <li key={line}>Verified by CampusKit: {line}</li>)
                ) : (
                  <li>No verification of the current template files has been recorded.</li>
                )}
              </ul>
              <p className="mt-2 text-xs text-ink-3">
                These are CampusKit’s results for the unmodified template. Run the tests yourself
                and record your own results in the Test cases section.
              </p>
            </section>
          ) : null}

          {project && demoSteps ? (
            <section
              aria-labelledby="demo-heading"
              className="rounded-xl border border-line bg-surface p-5"
            >
              <h3 id="demo-heading" className="text-lg font-bold text-ink">
                Demonstration checklist
              </h3>
              <p className="mt-1 text-sm text-ink-3">
                Steps for a live demonstration of {project.name}. Tick them as you rehearse; they
                are saved in this browser and included at the end of your download.
              </p>
              <ol className="mt-3 space-y-3">
                {demoSteps.map((text, index) => (
                  <li key={text}>
                    <Checkbox
                      label={`${index + 1}. ${text}`}
                      checked={demoDone.has(`step-${index + 1}`)}
                      onChange={(event) => toggleDemo(`step-${index + 1}`, event.target.checked)}
                    />
                  </li>
                ))}
              </ol>
              <p className="mt-3 text-sm text-ink-2" aria-live="polite">
                {demoDone.size} of {demoSteps.length} steps rehearsed.
              </p>
            </section>
          ) : null}

          {project && vivaSummary ? (
            <section
              aria-labelledby="viva-prep-heading"
              className="rounded-xl border border-line bg-surface p-5"
            >
              <h3 id="viva-prep-heading" className="text-lg font-bold text-ink">
                Viva preparation
              </h3>
              <p className="mt-1 text-sm text-ink-2">
                You have practised {vivaSummary.practised} of {vivaSummary.total} questions and
                rated {vivaSummary.confident} as confident.
                {vivaSummary.missed + vivaSummary.partly > 0
                  ? ` ${vivaSummary.missed + vivaSummary.partly} still need work.`
                  : ''}
              </p>
              <div className="mt-3 flex flex-wrap gap-3 text-sm">
                <Link to={vivaHref(project)} className="link">
                  Practise viva questions
                </Link>
                <Link to={studioHref(project, 'checklist')} className="link">
                  Open the learning checklist
                </Link>
              </div>
            </section>
          ) : null}
        </div>

        <aside aria-label="Your report" className="space-y-4 lg:sticky lg:top-24 lg:self-start">
          <div className="rounded-xl border border-line bg-surface p-5">
            <h3 className="text-base font-bold text-ink">Your report</h3>
            <p className="mt-1 text-sm text-ink-3" aria-live="polite">
              {remaining > 0
                ? `${remaining} prompts left to complete.`
                : 'Every prompt has been completed. Review it once more before submitting.'}
            </p>
            <p className="mt-2 text-xs text-ink-3">Saved automatically in this browser only.</p>
            <div className="mt-4 grid gap-2">
              <Button
                onClick={() => setPreviewOpen(true)}
                icon={<Eye aria-hidden="true" className="size-4" />}
              >
                Preview report
              </Button>
              <Button
                variant="secondary"
                onClick={() => downloadFile(report, fileName, 'text/markdown')}
                icon={<Download aria-hidden="true" className="size-4" />}
              >
                Download Markdown (.md)
              </Button>
              <Button
                variant="secondary"
                onClick={() => void copy(report)}
                icon={
                  copyState === 'copied' ? (
                    <Check aria-hidden="true" className="size-4" />
                  ) : (
                    <Copy aria-hidden="true" className="size-4" />
                  )
                }
              >
                {copyState === 'copied'
                  ? 'Copied'
                  : copyState === 'failed'
                    ? 'Copy failed'
                    : 'Copy all'}
              </Button>
              <Button
                variant="danger"
                onClick={clearSaved}
                icon={<Trash aria-hidden="true" className="size-4" />}
              >
                Clear saved work
              </Button>
            </div>
            {notice ? (
              <p className="mt-3 text-xs text-ink-2" role="status">
                {notice}
              </p>
            ) : null}
          </div>
          <nav
            aria-label="Report sections"
            className="rounded-xl border border-line bg-surface p-4"
          >
            <ol className="space-y-1 text-sm">
              {SECTION_IDS.map((id, index) => (
                <li key={id}>
                  <a
                    href={`#section-${id}`}
                    className="flex justify-between gap-2 rounded-md px-2 py-1 text-ink-2 hover:bg-raised hover:text-ink"
                  >
                    <span>
                      {index + 1}. {SECTION_TITLES[id]}
                    </span>
                    {countPrompts(sections[id]) > 0 ? (
                      <span className="font-mono text-xs text-warn">
                        {countPrompts(sections[id])}
                      </span>
                    ) : null}
                  </a>
                </li>
              ))}
            </ol>
          </nav>
        </aside>
      </div>

      <Dialog
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
        title="Report preview"
        variant="wide"
      >
        <MarkdownView markdown={report} headingOffset={2} />
      </Dialog>
    </div>
  );
}
