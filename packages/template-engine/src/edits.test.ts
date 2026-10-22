import { describe, expect, it } from 'vitest';

import { applyEdits, TemplateEditError, type WorkingFile } from './edits.ts';
import { resolveValues } from './options.ts';
import type { TemplateEdit } from './spec.ts';
import { sampleBundle, sampleSpec } from './test-fixtures.ts';

function workingFiles(): Map<string, WorkingFile> {
  return new Map(
    sampleBundle().files.map((file) => [
      file.path,
      { path: file.path, encoding: file.encoding, content: file.content },
    ]),
  );
}

function fileContent(files: Map<string, WorkingFile>, path: string): string {
  const file = files.get(path);
  if (!file) throw new Error(`missing ${path}`);
  return file.content;
}

describe('applyEdits', () => {
  it('writes typed values with json-set and keeps the JSON valid', () => {
    const files = workingFiles();
    const values = resolveValues(
      sampleSpec,
      { projectName: 'Quote "Tracker" \\ 2026', passMark: 33, demoData: false, theme: 'teal' },
      'demo-planner',
    );
    applyEdits(files, sampleSpec.edits, values);
    const config = JSON.parse(fileContent(files, 'src/config.json')) as Record<string, unknown>;
    expect(config).toEqual({
      appName: 'Quote "Tracker" \\ 2026',
      institution: '',
      theme: 'teal',
      passMark: 33,
      demoData: false,
    });
    expect(JSON.parse(fileContent(files, 'package.json'))).toMatchObject({
      name: 'quote-tracker-2026',
    });
  });

  it('escapes replace values for their file type', () => {
    const files = workingFiles();
    const values = resolveValues(
      sampleSpec,
      { projectName: 'R&D <Lab> *Planner*' },
      'demo-planner',
    );
    applyEdits(files, sampleSpec.edits, values);
    expect(fileContent(files, 'index.html')).toContain(
      '<title>R&amp;D &lt;Lab&gt; *Planner*</title>',
    );
    expect(fileContent(files, 'README.md')).toBe(
      '# R\\&D \\<Lab\\> \\*Planner\\*\n\nR\\&D \\<Lab\\> \\*Planner\\* is set up for your institution.\n',
    );
  });

  it('writes manifest fallbacks for empty values without escaping them', () => {
    const files = workingFiles();
    const edits = sampleSpec.edits.map((edit) =>
      edit.label === 'README institution'
        ? { ...edit, value: { option: 'institutionName', whenEmpty: '_Add your institution_' } }
        : edit,
    );
    applyEdits(files, edits, resolveValues(sampleSpec, { institutionName: '' }, 'demo-planner'));
    expect(fileContent(files, 'README.md')).toContain('is set up for _Add your institution_.');
    // A typed value is still escaped.
    const typed = workingFiles();
    applyEdits(
      typed,
      edits,
      resolveValues(sampleSpec, { institutionName: '_Lab_ School' }, 'demo-planner'),
    );
    expect(fileContent(typed, 'README.md')).toContain('is set up for \\_Lab\\_ School.');
  });

  it('maps select values to file-specific text', () => {
    const files = workingFiles();
    applyEdits(
      files,
      sampleSpec.edits,
      resolveValues(sampleSpec, { theme: 'teal' }, 'demo-planner'),
    );
    expect(fileContent(files, '.streamlit/config.toml')).toBe(
      '[theme]\nprimaryColor = "#0F766E"\n',
    );
  });

  it('never re-matches text inserted by another edit', () => {
    const files = workingFiles();
    // The project name contains the institution placeholder text.
    const values = resolveValues(
      sampleSpec,
      { projectName: 'Example School Planner', institutionName: 'Hill View College' },
      'demo-planner',
    );
    applyEdits(files, sampleSpec.edits, values);
    expect(fileContent(files, 'README.md')).toBe(
      '# Example School Planner\n\nExample School Planner is set up for Hill View College.\n',
    );
  });

  it('reports every change it made', () => {
    const files = workingFiles();
    const report = applyEdits(
      files,
      sampleSpec.edits,
      resolveValues(sampleSpec, {}, 'demo-planner'),
    );
    expect(report).toHaveLength(sampleSpec.edits.length);
    expect(report.find((entry) => entry.label === 'README title')?.occurrences).toBe(2);
  });

  it('fails loudly when the template drifted from its manifest', () => {
    const files = workingFiles();
    const readme = files.get('README.md');
    if (readme) readme.content = '# Renamed\n';
    expect(() =>
      applyEdits(files, sampleSpec.edits, resolveValues(sampleSpec, {}, 'demo-planner')),
    ).toThrow(/expected "Demo Planner" 2 time\(s\) but found it 0 time\(s\)/);
  });

  it('refuses to edit binary files or missing files', () => {
    const values = resolveValues(sampleSpec, {}, 'demo-planner');
    const binaryEdit: TemplateEdit = {
      kind: 'replace',
      label: 'logo',
      file: 'docs/logo.png',
      find: 'PNG',
      escape: 'none',
      expectedCount: 1,
      value: { option: 'theme' },
    };
    expect(() => applyEdits(workingFiles(), [binaryEdit], values)).toThrow(
      /binary files cannot be edited/,
    );
    expect(() =>
      applyEdits(workingFiles(), [{ ...binaryEdit, file: 'missing.txt' }], values),
    ).toThrow(TemplateEditError);
  });

  it('rejects type mismatches between the template JSON and the option', () => {
    const values = resolveValues(sampleSpec, {}, 'demo-planner');
    const edit: TemplateEdit = {
      kind: 'json-set',
      label: 'wrong type',
      file: 'src/config.json',
      pointer: '/appName',
      value: { option: 'passMark' },
    };
    expect(() => applyEdits(workingFiles(), [edit], values)).toThrow(/has a string at \/appName/);
  });

  it('rejects pointers to values that do not exist', () => {
    const values = resolveValues(sampleSpec, {}, 'demo-planner');
    const edit: TemplateEdit = {
      kind: 'json-set',
      label: 'missing key',
      file: 'src/config.json',
      pointer: '/doesNotExist',
      value: { option: 'projectName' },
    };
    expect(() => applyEdits(workingFiles(), [edit], values)).toThrow(
      /key "doesNotExist" does not exist/,
    );
  });
});
