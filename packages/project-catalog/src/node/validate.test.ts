import { cp, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { REGISTERED_MANIFESTS } from '../registry.ts';
import { validateCatalog } from './validate.ts';

const packageDir = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const repoRoot = resolve(packageDir, '..', '..');
const registeredFiles = REGISTERED_MANIFESTS.map((entry) => entry.file);

describe('validateCatalog on the real repository', () => {
  it('finds no problems', async () => {
    const report = await validateCatalog({
      repoRoot,
      manifestsDir: join(packageDir, 'manifests'),
      registeredFiles,
    });
    expect(report.issues).toEqual([]);
    expect(report.manifests).toHaveLength(3);
  });
});

describe('validateCatalog on a broken copy', () => {
  let workspace: string;
  let messages: string[];

  beforeAll(async () => {
    workspace = await mkdtemp(join(tmpdir(), 'campuskit-catalog-'));
    const manifestsDir = join(workspace, 'manifests');
    await mkdir(join(workspace, 'templates'), { recursive: true });
    await cp(join(packageDir, 'manifests'), manifestsDir, { recursive: true });
    await cp(
      join(repoRoot, 'templates', 'attendance-system'),
      join(workspace, 'templates', 'attendance-system'),
      {
        recursive: true,
        filter: (source) => !source.includes('node_modules') && !source.includes(`${'/'}dist`),
      },
    );

    // 1. A drifted template: the README no longer contains the project name twice.
    const readme = join(workspace, 'templates', 'attendance-system', 'README.md');
    await writeFile(
      readme,
      (await readFile(readme, 'utf8')).replace(
        'Student Attendance System is a web app',
        'This web app',
      ),
    );
    // 2. A broken documentation link.
    const architecture = join(
      workspace,
      'templates',
      'attendance-system',
      'docs',
      'ARCHITECTURE.md',
    );
    await writeFile(
      architecture,
      `${await readFile(architecture, 'utf8')}\nSee [the guide](GUIDE.md).\n`,
    );
    // 3. A missing screenshot.
    await rm(
      join(workspace, 'templates', 'attendance-system', 'docs', 'screenshots', 'students.png'),
    );
    // 4. An unregistered manifest with malformed JSON.
    await writeFile(join(manifestsDir, 'half-written.json'), '{ "id": ');
    // expense-tracker and student-result-analyzer templates are not copied, so their folders are missing.

    const report = await validateCatalog({ repoRoot: workspace, manifestsDir, registeredFiles });
    messages = report.issues.map((issue) => `${issue.manifest} ${issue.path}: ${issue.message}`);
  });

  afterAll(async () => {
    await rm(workspace, { recursive: true, force: true });
  });

  it('detects template drift through the customization dry run', () => {
    expect(messages.join('\n')).toMatch(
      /expected "Student Attendance System" 2 time\(s\) but found it 1 time\(s\)/,
    );
  });

  it('detects broken internal documentation links', () => {
    expect(messages.join('\n')).toMatch(
      /docs\/ARCHITECTURE\.md: Line \d+: broken link "GUIDE\.md"/,
    );
  });

  it('detects missing screenshots and README images', () => {
    expect(messages.join('\n')).toMatch(/Screenshot "docs\/screenshots\/students\.png" is missing/);
    expect(messages.join('\n')).toMatch(
      /README\.md: Line \d+: broken link "docs\/screenshots\/students\.png"/,
    );
  });

  it('detects missing template folders', () => {
    expect(messages.join('\n')).toMatch(
      /expense-tracker\.json template\.directory: Folder templates\/expense-tracker does not exist/,
    );
  });

  it('reports invalid JSON and unregistered manifest files', () => {
    expect(messages.join('\n')).toMatch(/half-written\.json \(file\): Invalid JSON/);
  });
});
