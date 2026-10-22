import { describe, expect, it } from 'vitest';

import { checkManifests, parseCatalog, CatalogError } from './catalog.ts';
import { catalog, getProjectBySlug } from './index.ts';
import { REGISTERED_MANIFESTS } from './registry.ts';
import { buildSetupGuide, setupSteps } from './setup-guide.ts';
import { resolveValues } from '@campuskit/template-engine';

function rawCopy(index = 0) {
  const entry = REGISTERED_MANIFESTS[index];
  if (!entry) throw new Error('no manifest');
  return { file: entry.file, data: structuredClone(entry.data) as Record<string, unknown> };
}

describe('catalog', () => {
  it('loads every registered project', () => {
    expect(catalog.map((project) => project.id)).toEqual([
      'attendance-system',
      'expense-tracker',
      'student-result-analyzer',
    ]);
    expect(getProjectBySlug('expense-tracker')?.name).toBe('Personal Expense Tracker');
    expect(getProjectBySlug('missing')).toBeUndefined();
  });

  it('gives every project features, limitations and setup steps', () => {
    for (const project of catalog) {
      expect(project.features.length).toBeGreaterThanOrEqual(3);
      expect(project.limitations.length).toBeGreaterThanOrEqual(1);
      expect(project.setup.steps.length).toBeGreaterThanOrEqual(2);
      expect(project.customization.options.some((option) => option.id === 'projectName')).toBe(
        true,
      );
    }
  });

  it('rejects duplicate ids and slugs', () => {
    const first = rawCopy(0);
    const duplicate = { file: 'attendance-system.json', data: structuredClone(first.data) };
    const { problems } = checkManifests([first, duplicate]);
    expect(problems.map((problem) => problem.message)).toEqual(
      expect.arrayContaining([
        expect.stringMatching(/Duplicate id "attendance-system"/),
        expect.stringMatching(/Duplicate slug "attendance-system"/),
      ]),
    );
  });

  it('reports malformed metadata with the field path', () => {
    const entry = rawCopy(1);
    entry.data.difficulty = 'impossible';
    entry.data.featured = 'yes';
    entry.data.unexpected = true;
    const { problems } = checkManifests([entry]);
    const paths = problems.map((problem) => problem.path);
    expect(paths).toEqual(expect.arrayContaining(['difficulty', 'featured']));
    expect(problems.some((problem) => /Unrecognized key/i.test(problem.message))).toBe(true);
  });

  it('rejects unsafe template paths and missing instructions', () => {
    const entry = rawCopy(2);
    (entry.data.template as Record<string, unknown>).directory = '../outside';
    (entry.data.setup as Record<string, unknown>).steps = [];
    const { problems } = checkManifests([entry]);
    expect(problems.map((problem) => problem.path)).toEqual(
      expect.arrayContaining(['template.directory', 'setup.steps']),
    );
  });

  it('rejects unsupported customization settings', () => {
    const entry = rawCopy(0);
    const customization = entry.data.customization as { edits: Array<Record<string, unknown>> };
    customization.edits.push({
      kind: 'json-set',
      label: 'Nonexistent option',
      file: 'src/app.config.json',
      pointer: '/appName',
      value: { option: 'darkMode' },
    });
    expect(() => parseCatalog([entry])).toThrow(CatalogError);
    const { problems } = checkManifests([entry]);
    expect(problems.some((problem) => problem.message.includes('unknown option "darkMode"'))).toBe(
      true,
    );
  });

  it('expects manifest files to be named after their id', () => {
    const entry = { ...rawCopy(0), file: 'renamed.json' };
    expect(checkManifests([entry]).problems[0]?.message).toBe(
      'The file should be named attendance-system.json',
    );
  });
});

describe('setup guide', () => {
  it('starts with the folder and repeats the manifest steps', () => {
    const project = getProjectBySlug('student-result-analyzer');
    if (!project) throw new Error('missing project');
    const steps = setupSteps(project);
    expect(steps[0]?.commands[0]?.command).toBe('cd student-result-analyzer');
    expect(steps.slice(1).map((step) => step.title)).toEqual(
      project.setup.steps.map((step) => step.title),
    );
    expect(steps.flatMap((step) => step.commands.map((command) => command.platform))).toEqual(
      expect.arrayContaining(['windows', 'macos-linux', 'all']),
    );
  });

  it('describes a generated copy with its folder name and choices', () => {
    const project = getProjectBySlug('expense-tracker');
    if (!project) throw new Error('missing project');
    const values = resolveValues(
      project.customization,
      { projectName: 'Hostel Budget Buddy', currency: 'usd', seedDemoData: false },
      project.id,
    );
    const guide = buildSetupGuide(project, values, '2026-10-21');
    expect(guide.folderName).toBe('hostel-budget-buddy');
    expect(guide.steps[0]?.commands[0]?.command).toBe('cd hostel-budget-buddy');
    expect(guide.choices).toEqual(
      expect.arrayContaining([
        { label: 'Currency', value: 'US dollar ($)' },
        { label: 'Include demo transactions', value: 'No' },
        { label: 'Your name', value: '' },
      ]),
    );
  });
});
