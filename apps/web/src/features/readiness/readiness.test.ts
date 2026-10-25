import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  getProjectById,
  learningGuideSchema,
  SECTION_IDS,
  type TemplateStatus,
} from '@campuskit/project-catalog';
import { describe, expect, it } from 'vitest';

import type { StoredReport } from '../../lib/report-drafts.ts';
import { evaluateReadiness, scoreReadiness, type ReadinessInputs } from './readiness.ts';

const project = getProjectById('attendance-system');
if (!project) throw new Error('missing project');
const guide = learningGuideSchema.parse(
  JSON.parse(
    readFileSync(
      join(
        resolve(
          dirname(fileURLToPath(import.meta.url)),
          '../../../../../packages/project-catalog/learning',
        ),
        'attendance-system.json',
      ),
      'utf8',
    ),
  ),
);

const verified: TemplateStatus = {
  id: 'verified',
  label: 'Verified',
  summary:
    'Generated, installed, tested and built on macOS from exactly the files this site serves.',
  current: [],
  outdated: [],
};

function inputs(overrides: Partial<ReadinessInputs> = {}): ReadinessInputs {
  return {
    project: project as NonNullable<typeof project>,
    guide,
    templateStatus: verified,
    verificationLines: ['macOS 26.2 (arm64), 23 Oct 2026: npm test (34 passed); npm run build'],
    checklistDone: new Set(),
    viva: { total: 20, practised: 0, confident: 0, partly: 0, missed: 0 },
    rehearsal: null,
    demoChecklist: { done: 0, total: 8 },
    report: null,
    confirmed: new Set(),
    hasDemo: true,
    ...overrides,
  };
}

function statusOf(items: ReturnType<typeof evaluateReadiness>, id: string) {
  return items.find((item) => item.id === id)?.status;
}

const fullReport: StoredReport = {
  info: {} as StoredReport['info'],
  sections: Object.fromEntries(SECTION_IDS.map((id) => [id, `Finished text for ${id}.`])),
};

describe('readiness check', () => {
  it('starts with only what CampusKit verified itself', () => {
    const items = evaluateReadiness(inputs());
    expect(items.map((item) => [item.id, item.kind, item.status])).toEqual([
      ['template', 'verified', 'ready'],
      ['setup-docs', 'verified', 'ready'],
      ['prerequisites', 'confirm', 'todo'],
      ['run-locally', 'confirm', 'todo'],
      ['tests', 'confirm', 'todo'],
      ['architecture', 'progress', 'todo'],
      ['features', 'progress', 'todo'],
      ['limitations', 'progress', 'todo'],
      ['viva', 'progress', 'todo'],
      ['demo', 'verified', 'todo'],
      ['report', 'verified', 'todo'],
    ]);
    expect(scoreReadiness(items)).toEqual({ points: 2, total: 11, percent: 18 });
  });

  it('does not call the template ready unless its current files passed verification', () => {
    const items = evaluateReadiness(
      inputs({
        templateStatus: {
          ...verified,
          id: 'awaiting-verification',
          label: 'Awaiting verification',
        },
        verificationLines: [],
      }),
    );
    expect(statusOf(items, 'template')).toBe('todo');
    expect(items.find((item) => item.id === 'tests')?.evidence.join(' ')).toContain(
      'no passing test run',
    );
  });

  it('counts the learning checklist by area, from the student’s own ticks', () => {
    const items = evaluateReadiness(
      inputs({
        checklistDone: new Set(['architecture-layers', 'architecture-lib', 'functionality-flow']),
      }),
    );
    expect(statusOf(items, 'architecture')).toBe('ready');
    expect(statusOf(items, 'features')).toBe('partial');
    expect(items.find((item) => item.id === 'features')?.evidence[0]).toBe(
      '1 of 6 functionality, data and validation items ticked in the learning checklist.',
    );
  });

  it('needs every viva question practised and none to review again', () => {
    const practised = evaluateReadiness(
      inputs({ viva: { total: 20, practised: 20, confident: 18, partly: 1, missed: 1 } }),
    );
    expect(statusOf(practised, 'viva')).toBe('partial');
    const done = evaluateReadiness(
      inputs({ viva: { total: 20, practised: 20, confident: 18, partly: 2, missed: 0 } }),
    );
    expect(statusOf(done, 'viva')).toBe('ready');
  });

  it('uses the guided demo record and the demonstration checklist as evidence', () => {
    expect(
      statusOf(evaluateReadiness(inputs({ demoChecklist: { done: 3, total: 8 } })), 'demo'),
    ).toBe('partial');
    const rehearsed = evaluateReadiness(
      inputs({ rehearsal: { version: 1, completedOn: '2026-10-24', checkedSteps: 3 } }),
    );
    expect(statusOf(rehearsed, 'demo')).toBe('ready');
    expect(rehearsed.find((item) => item.id === 'demo')?.evidence[0]).toBe(
      'Guided demo finished on 24 Oct 2026, with all 3 checked actions done.',
    );
  });

  it('checks the saved report draft for unfinished prompts', () => {
    const withPrompts: StoredReport = {
      ...fullReport,
      sections: { ...fullReport.sections, abstract: 'This project [Explain why it matters].' },
    };
    expect(statusOf(evaluateReadiness(inputs({ report: withPrompts })), 'report')).toBe('partial');
    expect(statusOf(evaluateReadiness(inputs({ report: fullReport })), 'report')).toBe('ready');
    // A draft saved before newer sections existed isn't finished until they are filled in.
    const { viva: _viva, ...older } = fullReport.sections;
    const oldDraft = evaluateReadiness(inputs({ report: { ...fullReport, sections: older } }));
    expect(statusOf(oldDraft, 'report')).toBe('partial');
    expect(oldDraft.find((item) => item.id === 'report')?.evidence.join(' ')).toContain(
      '1 section added since your draft was saved',
    );
  });

  it('marks the computer-only items ready only when the student confirms them', () => {
    const items = evaluateReadiness(inputs({ confirmed: new Set(['tests']) }));
    expect(statusOf(items, 'tests')).toBe('ready');
    expect(statusOf(items, 'run-locally')).toBe('todo');
  });

  it('scores ready as 1 and in progress as a half', () => {
    const everything = evaluateReadiness(
      inputs({
        checklistDone: new Set(guide.checklist.map((item) => item.id)),
        viva: { total: 20, practised: 20, confident: 20, partly: 0, missed: 0 },
        rehearsal: { version: 1, completedOn: '2026-10-24', checkedSteps: 3 },
        report: fullReport,
        confirmed: new Set(['prerequisites', 'run-locally', 'tests']),
      }),
    );
    expect(scoreReadiness(everything)).toEqual({ points: 11, total: 11, percent: 100 });
    const half = evaluateReadiness(inputs({ demoChecklist: { done: 1, total: 8 } }));
    expect(scoreReadiness(half)).toEqual({ points: 2.5, total: 11, percent: 23 });
  });
});
