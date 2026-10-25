/**
 * The readiness check: what is ready for a project's submission and
 * presentation, worked out only from evidence CampusKit really has.
 *
 * - "verified" items are checked by CampusKit itself: the template's
 *   verification records, the published setup instructions, the guided demo's
 *   checks and the student's saved report draft.
 * - "progress" items come from the student's own ticks and ratings in the
 *   learning checklist and viva practice.
 * - "confirm" items are things CampusKit can't see (the student's computer):
 *   only the student can tick them.
 *
 * Opening a page never counts as doing something.
 */
import {
  countPrompts,
  SECTION_IDS,
  setupSteps,
  type LearningGuide,
  type ProjectManifest,
  type TemplateStatus,
} from '@campuskit/project-catalog';

import type { Rehearsal, VivaSummary } from '../../lib/progress.ts';
import type { StoredReport } from '../../lib/report-drafts.ts';
import { formatIsoDate } from '../../lib/format.ts';
import { demoHref, presentationHref, reportHref, studioHref, vivaHref } from '../learning/links.ts';

export type ReadinessKind = 'verified' | 'progress' | 'confirm';
export type ReadinessStatus = 'ready' | 'partial' | 'todo';
export type ReadinessStage = 'run' | 'understand' | 'present';

export const KIND_LABELS: Record<ReadinessKind, string> = {
  verified: 'Checked by CampusKit',
  progress: 'From your progress',
  confirm: 'You confirm',
};

export const STATUS_LABELS: Record<ReadinessStatus, string> = {
  ready: 'Ready',
  partial: 'In progress',
  todo: 'To do',
};

export const STAGE_LABELS: Record<ReadinessStage, string> = {
  run: 'Get it running',
  understand: 'Understand it',
  present: 'Present and submit it',
};

/** Items the student ticks themselves. */
export const CONFIRM_IDS = ['prerequisites', 'run-locally', 'tests'] as const;

export interface ReadinessItem {
  id: string;
  stage: ReadinessStage;
  kind: ReadinessKind;
  status: ReadinessStatus;
  title: string;
  /** What the item means, in one or two sentences. */
  summary: string;
  /** The facts the status is based on. */
  evidence: string[];
  actions: Array<{ label: string; to: string }>;
}

export interface ReadinessInputs {
  project: ProjectManifest;
  guide: LearningGuide | null;
  templateStatus: TemplateStatus;
  /** One line per platform where the current template files passed verification. */
  verificationLines: string[];
  /** Learning checklist items the student ticked. */
  checklistDone: ReadonlySet<string>;
  viva: VivaSummary | null;
  rehearsal: Rehearsal | null;
  /** The submission workspace's demonstration checklist. */
  demoChecklist: { done: number; total: number } | null;
  report: StoredReport | null;
  confirmed: ReadonlySet<string>;
  hasDemo: boolean;
}

function areaProgress(
  guide: LearningGuide | null,
  done: ReadonlySet<string>,
  areas: readonly string[],
): { done: number; total: number } {
  const items = guide?.checklist.filter((item) => areas.includes(item.area)) ?? [];
  return { done: items.filter((item) => done.has(item.id)).length, total: items.length };
}

function fromCount({ done, total }: { done: number; total: number }): ReadinessStatus {
  if (total > 0 && done >= total) return 'ready';
  return done > 0 ? 'partial' : 'todo';
}

function plural(count: number, one: string, many = `${one}s`): string {
  return `${count} ${count === 1 ? one : many}`;
}

export function evaluateReadiness(inputs: ReadinessInputs): ReadinessItem[] {
  const { project, guide, templateStatus, checklistDone, confirmed } = inputs;
  const slug = project.slug;
  const steps = setupSteps(project);
  const confirmStatus = (id: string): ReadinessStatus => (confirmed.has(id) ? 'ready' : 'todo');

  const architecture = areaProgress(guide, checklistDone, ['architecture']);
  const features = areaProgress(guide, checklistDone, ['functionality', 'data', 'validation']);
  const limitations = areaProgress(guide, checklistDone, ['limitations', 'improvements']);

  const viva = inputs.viva;
  const vivaStatus: ReadinessStatus = !viva
    ? 'todo'
    : viva.practised === viva.total && viva.total > 0 && viva.missed === 0
      ? 'ready'
      : viva.practised > 0
        ? 'partial'
        : 'todo';

  const report = inputs.report;
  const savedSections = report
    ? SECTION_IDS.filter((id) => typeof report.sections[id] === 'string')
    : [];
  const prompts = report
    ? savedSections.reduce((sum, id) => sum + countPrompts(report.sections[id] ?? ''), 0)
    : 0;
  const reportStatus: ReadinessStatus = !report
    ? 'todo'
    : prompts === 0 && savedSections.length === SECTION_IDS.length
      ? 'ready'
      : 'partial';

  const demoChecklist = inputs.demoChecklist;
  const demoStatus: ReadinessStatus = inputs.rehearsal
    ? 'ready'
    : demoChecklist && demoChecklist.done > 0
      ? 'partial'
      : 'todo';

  const templateReady = templateStatus.id === 'verified';
  const testLines = inputs.verificationLines;

  return [
    {
      id: 'template',
      stage: 'run',
      kind: 'verified',
      status: templateReady ? 'ready' : 'todo',
      title: 'The template passed CampusKit’s checks',
      summary:
        'CampusKit generated the project, checked its files and settings, installed it and ran its tests. This is about the template CampusKit publishes, not about your copy.',
      evidence: [`${templateStatus.label}: ${templateStatus.summary}`, ...testLines],
      actions: [{ label: 'See the verification', to: `/projects/${slug}#verification` }],
    },
    {
      id: 'setup-docs',
      stage: 'run',
      kind: 'verified',
      status: steps.length > 0 ? 'ready' : 'todo',
      title: 'Setup instructions and documentation are included',
      summary:
        'Every download contains GETTING_STARTED.md with the setup steps for that project, plus the template’s own documentation.',
      evidence: [
        `${plural(steps.length, 'setup step')}, written into GETTING_STARTED.md in every ZIP.`,
        `Documentation: ${project.docs.map((doc) => doc.file).join(', ')}.`,
      ],
      actions: [{ label: 'Read the setup steps', to: `/projects/${slug}#setup` }],
    },
    {
      id: 'prerequisites',
      stage: 'run',
      kind: 'confirm',
      status: confirmStatus('prerequisites'),
      title: 'Install the prerequisites',
      summary:
        'Install the tools the project needs on your own computer. CampusKit can’t check your computer.',
      evidence: project.prerequisites.map(
        (item) =>
          `${item.name}${item.version ? ` ${item.version}` : ''}${item.note ? `: ${item.note}` : ''}`,
      ),
      actions: [
        { label: 'Prerequisites', to: `/projects/${slug}#setup` },
        { label: 'Troubleshooting', to: studioHref(project, 'troubleshooting') },
      ],
    },
    {
      id: 'run-locally',
      stage: 'run',
      kind: 'confirm',
      status: confirmStatus('run-locally'),
      title: 'Run the project on your computer',
      summary:
        'Download your customized copy, follow GETTING_STARTED.md and open the app. Tick this once it runs for you.',
      evidence: [
        templateReady
          ? `CampusKit’s own copies installed and ran: ${templateStatus.summary}`
          : 'The template has no current verification, so expect to troubleshoot.',
        'CampusKit can’t see your computer, so only you can confirm your copy runs.',
      ],
      actions: [
        { label: 'Customize and download', to: `/generate?template=${project.id}` },
        { label: 'Troubleshooting', to: studioHref(project, 'troubleshooting') },
      ],
    },
    {
      id: 'tests',
      stage: 'run',
      kind: 'confirm',
      status: confirmStatus('tests'),
      title: 'Run the project’s tests',
      summary: `Run the automated tests (${project.testing.tools.join(', ')}) in your copy and read the result.`,
      evidence: [
        `Commands: ${project.testing.commands.map((command) => command.command).join(', ')}.`,
        testLines.length > 0
          ? 'In CampusKit’s verification the template’s tests passed (listed above). Your copy’s results are yours to check.'
          : 'CampusKit has no passing test run for the current template files.',
      ],
      actions: [{ label: 'How to run the tests', to: `/projects/${slug}#testing` }],
    },
    {
      id: 'architecture',
      stage: 'understand',
      kind: 'progress',
      status: fromCount(architecture),
      title: 'Understand the architecture',
      summary: 'Be able to draw the layers and say what each part of the code is responsible for.',
      evidence: [
        architecture.total > 0
          ? `${architecture.done} of ${architecture.total} architecture items ticked in the learning checklist.`
          : 'This project has no learning checklist.',
      ],
      actions: [
        { label: 'Architecture explorer', to: studioHref(project, 'architecture') },
        { label: 'Learning checklist', to: studioHref(project, 'checklist') },
      ],
    },
    {
      id: 'features',
      stage: 'understand',
      kind: 'progress',
      status: fromCount(features),
      title: 'Explain the main features',
      summary:
        'Be able to show each feature and explain the code that makes it work, including its validation.',
      evidence: [
        features.total > 0
          ? `${features.done} of ${features.total} functionality, data and validation items ticked in the learning checklist.`
          : 'This project has no learning checklist.',
      ],
      actions: [
        { label: 'Code walkthrough', to: studioHref(project, 'code') },
        ...(inputs.hasDemo ? [{ label: 'Interactive demo', to: demoHref(project) }] : []),
      ],
    },
    {
      id: 'limitations',
      stage: 'understand',
      kind: 'progress',
      status: fromCount(limitations),
      title: 'Know the limitations',
      summary: 'Be able to say what the project doesn’t do and how you would improve it.',
      evidence: [
        limitations.total > 0
          ? `${limitations.done} of ${limitations.total} limitation and improvement items ticked in the learning checklist.`
          : 'This project has no learning checklist.',
        `The project lists ${plural(project.limitations.length, 'known limitation')}.`,
      ],
      actions: [
        { label: 'Known limitations', to: `/projects/${slug}#overview` },
        { label: 'Learning checklist', to: studioHref(project, 'checklist') },
      ],
    },
    {
      id: 'viva',
      stage: 'present',
      kind: 'progress',
      status: vivaStatus,
      title: 'Practise the viva questions',
      summary:
        'Ready when you have practised every question and none is marked “Review again”. The ratings are your own.',
      evidence: viva
        ? [
            `${viva.practised} of ${viva.total} questions practised: ${viva.confident} confident, ${viva.partly} need a little more work, ${viva.missed} to review again.`,
          ]
        : ['This project has no viva questions.'],
      actions: [{ label: 'Viva practice', to: vivaHref(project) }],
    },
    {
      id: 'demo',
      stage: 'present',
      kind: 'verified',
      status: demoStatus,
      title: 'Rehearse the demonstration',
      summary: inputs.hasDemo
        ? 'Ready when you have finished the Demo Studio’s guided demo with every action it checks done.'
        : 'Rehearse with the demonstration checklist in the submission workspace.',
      evidence: [
        inputs.rehearsal
          ? `Guided demo finished on ${formatIsoDate(inputs.rehearsal.completedOn)}, with all ${plural(inputs.rehearsal.checkedSteps, 'checked action')} done.`
          : inputs.hasDemo
            ? 'The guided demo hasn’t been finished with every checked action done yet.'
            : 'There is no interactive demo for this project.',
        ...(demoChecklist
          ? [
              `Demonstration checklist: ${demoChecklist.done} of ${demoChecklist.total} steps ticked in the submission workspace.`,
            ]
          : []),
      ],
      actions: [
        ...(inputs.hasDemo ? [{ label: 'Guided demo', to: demoHref(project) }] : []),
        { label: 'Presentation mode', to: presentationHref(project) },
      ],
    },
    {
      id: 'report',
      stage: 'present',
      kind: 'verified',
      status: reportStatus,
      title: 'Finish the report draft',
      summary:
        'Ready when your saved draft has every section and no [bracketed prompts] left. CampusKit checks that the prompts are filled in, not what you wrote.',
      evidence: report
        ? [
            `${plural(prompts, 'prompt')} left in your saved draft.`,
            ...(savedSections.length < SECTION_IDS.length
              ? [
                  `${plural(SECTION_IDS.length - savedSections.length, 'section')} added since your draft was saved; open the workspace to fill them in.`,
                ]
              : []),
          ]
        : ['You haven’t saved a report draft for this project yet.'],
      actions: [{ label: 'Submission workspace', to: reportHref(project) }],
    },
  ];
}

export interface ReadinessScore {
  points: number;
  total: number;
  percent: number;
}

/** Ready counts 1, in progress ½, to do 0; every item counts once. */
export function scoreReadiness(items: readonly ReadinessItem[]): ReadinessScore {
  const points = items.reduce(
    (sum, item) => sum + (item.status === 'ready' ? 1 : item.status === 'partial' ? 0.5 : 0),
    0,
  );
  return {
    points,
    total: items.length,
    percent: items.length === 0 ? 0 : Math.round((points / items.length) * 100),
  };
}
