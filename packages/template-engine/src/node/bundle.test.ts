import { mkdir, mkdtemp, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { buildTemplateBundle } from './bundle.ts';
import { extractZipArchive } from './extract.ts';
import { createZipArchive } from '../zip.ts';

let directory: string;

beforeEach(async () => {
  directory = await mkdtemp(join(tmpdir(), 'campuskit-bundle-'));
});

afterEach(async () => {
  await rm(directory, { recursive: true, force: true });
});

async function put(relativePath: string, content: string | Uint8Array): Promise<void> {
  const absolute = join(directory, relativePath);
  await mkdir(join(absolute, '..'), { recursive: true });
  await writeFile(absolute, content);
}

describe('buildTemplateBundle', () => {
  it('bundles text and binary files and skips excluded content', async () => {
    await put('README.md', '# Hello\n');
    await put('.gitignore', 'node_modules/\n');
    await put('.env.example', 'X=1\n');
    await put('.env', 'SECRET=1\n');
    await put('src/App.tsx', 'export {};\n');
    await put('docs/shot.png', new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0, 1, 2]));
    await put('node_modules/pkg/index.js', 'x');
    await put('src/__pycache__/x.pyc', 'x');
    await symlink(join(directory, 'README.md'), join(directory, 'linked.md'));

    const { bundle, skipped } = await buildTemplateBundle(directory, {
      templateId: 'fixture',
      templateVersion: '1.0.0',
    });

    expect(bundle.files.map((file) => file.path)).toEqual([
      '.env.example',
      '.gitignore',
      'docs/shot.png',
      'README.md',
      'src/App.tsx',
    ]);
    expect(bundle.files.find((file) => file.path === 'docs/shot.png')?.encoding).toBe('base64');
    expect(bundle.files.find((file) => file.path === 'README.md')).toMatchObject({
      encoding: 'utf8',
      content: '# Hello\n',
    });
    const skippedPaths = skipped.map((item) => item.path);
    expect(skippedPaths).toEqual(
      expect.arrayContaining(['.env', 'node_modules/', 'src/__pycache__/', 'linked.md']),
    );
  });

  it('fails on file names the generator would reject', async () => {
    await put('bad name.txt', 'x');
    await expect(
      buildTemplateBundle(directory, { templateId: 'fixture', templateVersion: '1.0.0' }),
    ).rejects.toThrow(/ASCII letters/);
  });
});

describe('extractZipArchive', () => {
  it('writes files inside the target folder only', async () => {
    const zip = await createZipArchive('demo', [
      { path: 'README.md', data: '# Demo\n' },
      { path: 'src/index.ts', data: 'export {};\n' },
    ]);
    const written = await extractZipArchive(zip, join(directory, 'out'));
    expect(written).toEqual(['demo/README.md', 'demo/src/index.ts']);
  });
});
