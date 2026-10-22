import { describe, expect, it } from 'vitest';

import { customizationSpecSchema, templateBundleSchema, type CustomizationSpec } from './spec.ts';
import { sampleBundle, sampleSpec } from './test-fixtures.ts';

function messages(spec: unknown): string[] {
  const result = customizationSpecSchema.safeParse(spec);
  return result.success ? [] : result.error.issues.map((issue) => issue.message);
}

function clone(): CustomizationSpec {
  return structuredClone(sampleSpec);
}

describe('customizationSpecSchema', () => {
  it('accepts the sample spec', () => {
    expect(messages(sampleSpec)).toEqual([]);
  });

  it('requires a projectName option', () => {
    const spec = clone();
    spec.options = spec.options.filter((option) => option.id !== 'projectName');
    expect(messages(spec).join('\n')).toMatch(/must declare a required text option "projectName"/);
  });

  it('rejects duplicate option ids', () => {
    const spec = clone();
    const first = spec.options[1];
    if (first) spec.options.push({ ...first });
    expect(messages(spec).join('\n')).toMatch(/Duplicate option id "institutionName"/);
  });

  it('rejects edits that reference unknown options', () => {
    const spec = clone();
    spec.edits.push({
      kind: 'json-set',
      label: 'mystery',
      file: 'src/config.json',
      pointer: '/mystery',
      value: { option: 'mystery' },
    });
    expect(messages(spec).join('\n')).toMatch(/unknown option "mystery"/);
  });

  it('requires a map entry for every select choice', () => {
    const spec = clone();
    const edit = spec.edits.find((candidate) => candidate.label === 'Streamlit colour');
    if (edit) edit.value.map = { violet: '#6D28D9' };
    expect(messages(spec).join('\n')).toMatch(/exactly one entry per choice/);
  });

  it('refuses to insert free text without escaping', () => {
    const spec = clone();
    const edit = spec.edits.find((candidate) => candidate.label === 'page title');
    if (edit && edit.kind === 'replace') edit.escape = 'none';
    expect(messages(spec).join('\n')).toMatch(/must be escaped/);
  });

  it('rejects defaults outside an option’s own limits', () => {
    const spec = clone();
    const passMark = spec.options.find((option) => option.id === 'passMark');
    if (passMark && passMark.type === 'number') passMark.default = 140;
    expect(messages(spec).join('\n')).toMatch(/default is outside min\/max/);
  });

  it('rejects unknown keys so manifest typos surface', () => {
    const spec = clone() as unknown as { options: Array<Record<string, unknown>> };
    const first = spec.options[0];
    if (first) first.requird = true;
    expect(messages(spec).join('\n')).toMatch(/Unrecognized key/i);
  });

  it('rejects edits with unsafe file paths', () => {
    const spec = clone();
    const first = spec.edits[0];
    if (first) first.file = '../outside.json';
    expect(messages(spec).join('\n')).toMatch(/safe relative path/);
  });
});

describe('templateBundleSchema', () => {
  it('accepts a well-formed bundle', () => {
    expect(templateBundleSchema.safeParse(sampleBundle()).success).toBe(true);
  });

  it('rejects bundles containing traversal paths', () => {
    const bundle = sampleBundle([
      { path: '../../etc/passwd', encoding: 'utf8', content: 'x', size: 1 },
    ]);
    expect(templateBundleSchema.safeParse(bundle).success).toBe(false);
  });
});
