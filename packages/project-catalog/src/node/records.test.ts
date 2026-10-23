import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { getProjectById } from '../index.ts';
import type { ProjectManifest } from '../schema.ts';
import type { VerificationEntry } from '../verification.ts';
import { templateFingerprint } from './fingerprint.ts';
import { platformFromNode, readVerificationRecords, writeVerificationEntry } from './records.ts';

const project = getProjectById('attendance-system');
if (!project) throw new Error('missing project');

const files = [
  { path: 'README.md', encoding: 'utf8' as const, content: '# Demo\n' },
  { path: 'src/app.ts', encoding: 'utf8' as const, content: 'export {};\n' },
];

describe('templateFingerprint', () => {
  const base = templateFingerprint(project, files);

  it('is stable and ignores file order', () => {
    expect(base).toMatch(/^sha256:[0-9a-f]{64}$/);
    expect(templateFingerprint(project, [...files].reverse())).toBe(base);
  });

  it('changes when a file, a setup command or the version changes', () => {
    expect(
      templateFingerprint(project, [files[0]!, { ...files[1]!, content: 'export {}; \n' }]),
    ).not.toBe(base);
    const setup = structuredClone(project.setup);
    setup.steps[0]!.commands[0]!.command = 'npm install --force';
    expect(templateFingerprint({ ...project, setup }, files)).not.toBe(base);
    expect(templateFingerprint({ ...project, version: '9.9.9' }, files)).not.toBe(base);
  });

  it('ignores prose that does not change the generated code', () => {
    const reworded: ProjectManifest = { ...project, tagline: 'Reworded tagline for the gallery.' };
    expect(templateFingerprint(reworded, files)).toBe(base);
  });
});

describe('verification records on disk', () => {
  let directory: string;
  beforeEach(async () => {
    directory = await mkdtemp(join(tmpdir(), 'campuskit-records-'));
  });
  afterEach(async () => {
    await rm(directory, { recursive: true, force: true });
  });

  const entry = (platform: VerificationEntry['platform'], passed: boolean): VerificationEntry => ({
    platform,
    verifiedOn: '2026-10-22',
    templateVersion: '1.0.0',
    fingerprint: `sha256:${'c'.repeat(64)}`,
    environment: { os: 'test', node: '24.12.0' },
    runs: [{ variant: 'defaults', passed, steps: ['npm ci'] }],
  });

  it('replaces the entry for the same platform and keeps the others', async () => {
    await writeVerificationEntry(directory, 'demo', entry('macos', false));
    await writeVerificationEntry(directory, 'demo', entry('linux', true));
    await writeVerificationEntry(directory, 'demo', entry('macos', true));
    const { records, problems } = await readVerificationRecords(directory);
    expect(problems).toEqual([]);
    const saved = records.get('demo');
    expect(saved?.entries.map((item) => [item.platform, item.runs[0]?.passed])).toEqual([
      ['linux', true],
      ['macos', true],
    ]);
    expect(await readFile(join(directory, 'demo.json'), 'utf8')).toMatch(/\n$/);
  });

  it('reports malformed and misnamed records instead of trusting them', async () => {
    await writeFile(join(directory, 'broken.json'), '{');
    await writeFile(
      join(directory, 'wrong-name.json'),
      JSON.stringify({ schemaVersion: 1, templateId: 'demo', entries: [] }),
    );
    await writeFile(
      join(directory, 'fake.json'),
      JSON.stringify({ schemaVersion: 1, templateId: 'fake', entries: [{ platform: 'linux' }] }),
    );
    const { records, problems } = await readVerificationRecords(directory);
    expect(records.size).toBe(0);
    expect([...new Set(problems.map((problem) => problem.file))].sort()).toEqual([
      'broken.json',
      'fake.json',
      'wrong-name.json',
    ]);
  });

  it('treats a missing folder as no records', async () => {
    const { records, problems } = await readVerificationRecords(join(directory, 'missing'));
    expect(records.size).toBe(0);
    expect(problems).toEqual([]);
  });

  it('maps Node platforms to the supported ones', () => {
    expect(platformFromNode('darwin')).toBe('macos');
    expect(platformFromNode('win32')).toBe('windows');
    expect(platformFromNode('linux')).toBe('linux');
    expect(platformFromNode('aix')).toBeNull();
  });
});
