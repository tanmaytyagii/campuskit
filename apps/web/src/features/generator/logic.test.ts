import { getProjectById } from '@campuskit/project-catalog';
import { readZipArchive, utf8Decode } from '@campuskit/template-engine';
import { describe, expect, it } from 'vitest';

import { diskBundleLoader } from '../../test/render.tsx';
import {
  buildZip,
  initialFormValues,
  optionsForStep,
  planProject,
  previewEdits,
  previewValues,
  toEngineInput,
  validateOptions,
} from './logic.ts';

function project(id: string) {
  const found = getProjectById(id);
  if (!found) throw new Error(`missing ${id}`);
  return found;
}

describe('generator logic', () => {
  it('splits options into the details and options steps', () => {
    const attendance = project('attendance-system');
    expect(optionsForStep(attendance, 'details').map((option) => option.id)).toEqual([
      'projectName',
      'institutionName',
      'authorName',
    ]);
    expect(optionsForStep(attendance, 'options').map((option) => option.id)).toEqual([
      'theme',
      'attendanceThreshold',
      'seedDemoData',
    ]);
  });

  it('only offers options a template supports', () => {
    expect(
      optionsForStep(project('expense-tracker'), 'details').map((option) => option.id),
    ).not.toContain('institutionName');
    expect(
      project('student-result-analyzer').customization.options.map((option) => option.id),
    ).not.toContain('seedDemoData');
  });

  it('converts form strings to engine values', () => {
    const attendance = project('attendance-system');
    const values = { ...initialFormValues(attendance), attendanceThreshold: '80' };
    expect(toEngineInput(attendance, values)).toMatchObject({
      attendanceThreshold: 80,
      seedDemoData: true,
      theme: 'indigo',
    });
    expect(
      toEngineInput(attendance, { ...values, attendanceThreshold: '' }).attendanceThreshold,
    ).toBeNaN();
  });

  it('validates each step and explains errors', () => {
    const attendance = project('attendance-system');
    const values = {
      ...initialFormValues(attendance),
      projectName: 'ab',
      attendanceThreshold: '120',
    };
    expect(validateOptions(optionsForStep(attendance, 'details'), values)).toEqual({
      projectName: 'Use at least 3 characters',
    });
    expect(validateOptions(optionsForStep(attendance, 'options'), values)).toEqual({
      attendanceThreshold: 'Use 100 or less',
    });
  });

  it('prefills the project name from the hero card', () => {
    expect(
      initialFormValues(project('expense-tracker'), { projectName: 'Hostel Budget' }).projectName,
    ).toBe('Hostel Budget');
  });

  it('previews escaped values exactly where they will be written', () => {
    const attendance = project('attendance-system');
    const values = previewValues(attendance, {
      ...initialFormValues(attendance),
      projectName: 'R&D <Lab>',
    });
    const rows = previewEdits(attendance, values);
    expect(rows.find((row) => row.file === 'index.html')?.snippet).toBe('R&amp;D &lt;Lab&gt;');
    expect(rows.find((row) => row.label === 'App name')?.snippet).toBe('"appName": "R&D <Lab>"');
    expect(rows.find((row) => row.label === 'npm package name')?.snippet).toBe(
      '"name": "r-and-d-lab"',
    );
    expect(rows.find((row) => row.label === 'README author')?.snippet).toBe('_Add your name_');
  });

  it('falls back to defaults in the preview while a value is invalid', () => {
    const attendance = project('attendance-system');
    expect(
      previewValues(attendance, { ...initialFormValues(attendance), projectName: '' }).projectSlug,
    ).toBe('student-attendance-system');
  });

  it('builds a ZIP whose contents carry every customization', async () => {
    const expenses = project('expense-tracker');
    const bundle = await diskBundleLoader('expense-tracker');
    const values = {
      ...initialFormValues(expenses),
      projectName: 'Hostel Budget — ₹ बचत',
      authorName: 'Kiran Rao',
      currency: 'usd',
      monthlyBudget: '300',
      theme: 'plum',
      seedDemoData: false,
    };
    const result = await buildZip(
      planProject(expenses, bundle, values, new Date('2026-10-21T10:00:00Z')),
    );
    expect(result.fileName).toBe('hostel-budget.zip');

    const entries = await readZipArchive(result.zip);
    const read = (path: string) =>
      utf8Decode(
        entries.find((entry) => entry.path === `hostel-budget/${path}`)?.data ?? new Uint8Array(),
      );
    expect(JSON.parse(read('src/app.config.json'))).toEqual({
      appName: 'Hostel Budget — ₹ बचत',
      authorName: 'Kiran Rao',
      currency: 'USD',
      monthlyBudget: 300,
      theme: 'plum',
      seedDemoData: false,
    });
    expect((JSON.parse(read('package.json')) as { name: string }).name).toBe('hostel-budget');
    const lockfile = JSON.parse(read('package-lock.json')) as {
      name: string;
      packages: Record<string, { name?: string }>;
    };
    expect(lockfile.name).toBe('hostel-budget');
    expect(lockfile.packages['']?.name).toBe('hostel-budget');
    expect(read('README.md')).toMatch(/\| Built by\s+\| Kiran Rao\s+\|/);
    expect(read('GETTING_STARTED.md')).toContain('```bash\ncd hostel-budget\n```');
    expect(read('GETTING_STARTED.md')).toContain('```bash\nnpm install\n```');
    const paths = entries.map((entry) => entry.path);
    expect(paths).toContain('hostel-budget/.gitignore');
    expect(paths.some((path) => path.includes('node_modules') || path.includes('/dist/'))).toBe(
      false,
    );
  });
});
