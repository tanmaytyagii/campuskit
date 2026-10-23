import JSZip from 'jszip';
import { describe, expect, it } from 'vitest';

import { utf8Decode } from './encoding.ts';
import {
  generateProject,
  generateProjectZip,
  GETTING_STARTED_FILE,
  packageProject,
} from './generate.ts';
import { OptionValidationError } from './options.ts';
import { UnsafePathError } from './paths.ts';
import { sampleBundle, sampleGuide, sampleSpec, textFile } from './test-fixtures.ts';
import { readZipArchive } from './zip.ts';

const fixedDate = new Date('2026-10-21T10:00:00Z');

function readText(entries: Array<{ path: string; data: Uint8Array }>, path: string): string {
  const entry = entries.find((candidate) => candidate.path === path);
  if (!entry) throw new Error(`${path} is not in the archive`);
  return utf8Decode(entry.data);
}

describe('generateProject', () => {
  it('produces customized files under a single root folder', async () => {
    const { project, zip } = await generateProjectZip({
      bundle: sampleBundle(),
      customization: sampleSpec,
      input: { projectName: 'Ünïcödé Planner — उपस्थिति', institutionName: 'St. Mary’s School' },
      createGuide: sampleGuide,
      date: fixedDate,
    });

    expect(project.rootFolder).toBe('unicode-planner');
    const entries = await readZipArchive(zip);
    expect(entries.every((entry) => entry.path.startsWith('unicode-planner/'))).toBe(true);
    expect(JSON.parse(readText(entries, 'unicode-planner/src/config.json'))).toMatchObject({
      appName: 'Ünïcödé Planner — उपस्थिति',
      institution: 'St. Mary’s School',
    });
    expect(readText(entries, 'unicode-planner/README.md')).toContain(
      '# Ünïcödé Planner — उपस्थिति',
    );
    expect(readText(entries, 'unicode-planner/index.html')).toContain(
      '<title>Ünïcödé Planner — उपस्थिति</title>',
    );
  });

  it('keeps hidden project files and binary files intact', async () => {
    const { zip } = await generateProjectZip({
      bundle: sampleBundle(),
      customization: sampleSpec,
      input: {},
      createGuide: sampleGuide,
      date: fixedDate,
    });
    const entries = await readZipArchive(zip);
    const paths = entries.map((entry) => entry.path);
    expect(paths).toContain('demo-planner/.gitignore');
    expect(paths).toContain('demo-planner/.env.example');
    expect(paths).toContain('demo-planner/.streamlit/config.toml');
    const logo = entries.find((entry) => entry.path === 'demo-planner/docs/logo.png');
    expect(Array.from(logo?.data ?? [])).toEqual([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  });

  it('excludes secrets, dependencies and caches even if a bundle contains them', async () => {
    const bundle = sampleBundle([
      textFile('.env', 'API_KEY=should-never-ship\n'),
      textFile('.env.local', 'TOKEN=should-never-ship\n'),
      textFile('.streamlit/secrets.toml', 'password = "nope"\n'),
      textFile('node_modules/react/index.js', 'module.exports = {}\n'),
      textFile('dist/index.html', '<html></html>\n'),
      textFile('src/__pycache__/app.cpython-313.pyc', 'cache'),
      textFile('.npmrc', '//registry.npmjs.org/:_authToken=secret\n'),
    ]);
    const { project, zip } = await generateProjectZip({
      bundle,
      customization: sampleSpec,
      input: {},
      createGuide: sampleGuide,
      date: fixedDate,
    });
    const paths = (await readZipArchive(zip)).map((entry) => entry.path);
    for (const forbidden of [
      '.env',
      '.env.local',
      'secrets.toml',
      'node_modules',
      'dist/',
      '__pycache__',
      '.npmrc',
    ]) {
      expect(paths.some((path) => path.includes(forbidden) && !path.endsWith('.env.example'))).toBe(
        false,
      );
    }
    expect(project.excluded.map((file) => file.path).sort()).toEqual(
      [
        '.env',
        '.env.local',
        '.npmrc',
        '.streamlit/secrets.toml',
        'dist/index.html',
        'node_modules/react/index.js',
        'src/__pycache__/app.cpython-313.pyc',
      ].sort(),
    );
    // Scan every byte of every entry (binary files included) for the secret values.
    const allText = (await readZipArchive(zip))
      .map((entry) => new TextDecoder().decode(entry.data))
      .join('\n');
    expect(allText).not.toContain('should-never-ship');
  });

  it('adds GETTING_STARTED.md with the exact setup steps for this project', async () => {
    const { zip } = await generateProjectZip({
      bundle: sampleBundle(),
      customization: sampleSpec,
      input: { projectName: 'My *Starred* App' },
      createGuide: sampleGuide,
      date: fixedDate,
    });
    const guide = readText(await readZipArchive(zip), `my-starred-app/${GETTING_STARTED_FILE}`);
    expect(guide).toContain('# Getting started with My \\*Starred\\* App');
    expect(guide).toContain('cd my-starred-app\nnpm install');
    expect(guide).toContain('npm run dev');
  });

  it('rejects bundles with path traversal entries', () => {
    const bundle = sampleBundle([textFile('ok.txt', 'x')]);
    bundle.files.push({ path: '../../outside.txt', encoding: 'utf8', content: 'evil', size: 4 });
    expect(() =>
      generateProject({ bundle, customization: sampleSpec, input: {}, createGuide: sampleGuide }),
    ).toThrow(/malformed/);
  });

  it('rejects invalid option values before touching any file', () => {
    expect(() =>
      generateProject({
        bundle: sampleBundle(),
        customization: sampleSpec,
        input: { projectName: '' },
        createGuide: sampleGuide,
      }),
    ).toThrow(OptionValidationError);
  });

  it('refuses templates that ship a file with the reserved GETTING_STARTED.md name', () => {
    expect(() =>
      generateProject({
        bundle: sampleBundle([textFile(GETTING_STARTED_FILE, 'mine')]),
        customization: sampleSpec,
        input: {},
        createGuide: sampleGuide,
      }),
    ).toThrow(/reserved/);
  });

  it('adds generated documents next to the template files', () => {
    const project = generateProject({
      bundle: sampleBundle(),
      customization: sampleSpec,
      input: { projectName: 'Report <Demo>' },
      createGuide: sampleGuide,
      createDocuments: (values) => [
        { path: 'docs/REPORT.md', content: `# ${String(values.options.projectName)}\n` },
      ],
    });
    expect(project.files.find((file) => file.path === 'docs/REPORT.md')?.content).toBe(
      '# Report <Demo>\n',
    );
  });

  it('refuses generated documents that would replace a template file or escape the folder', () => {
    const generate = (path: string) =>
      generateProject({
        bundle: sampleBundle(),
        customization: sampleSpec,
        input: {},
        createGuide: sampleGuide,
        createDocuments: () => [{ path, content: 'x' }],
      });
    expect(() => generate('README.md')).toThrow(/must not contain a file with that name/);
    expect(() => generate(GETTING_STARTED_FILE)).toThrow(/must not contain a file with that name/);
    expect(() => generate('../outside.md')).toThrow(UnsafePathError);
  });

  it('is deterministic for the same inputs and date', async () => {
    const options = {
      bundle: sampleBundle(),
      customization: sampleSpec,
      input: { projectName: 'Same Every Time' },
      createGuide: sampleGuide,
      date: fixedDate,
    };
    const first = await generateProjectZip(options);
    const second = await generateProjectZip(options);
    expect(Buffer.from(first.zip).equals(Buffer.from(second.zip))).toBe(true);
  });

  it('rejects case-insensitive duplicate names when packaging', async () => {
    const project = generateProject({
      bundle: sampleBundle([textFile('notes.md', 'a'), textFile('NOTES.md', 'b')]),
      customization: sampleSpec,
      input: {},
      createGuide: sampleGuide,
    });
    await expect(packageProject(project)).rejects.toThrow(UnsafePathError);
  });
});

describe('readZipArchive', () => {
  it('rejects archives with zip-slip entries', async () => {
    const zip = new JSZip();
    zip.file('project/README.md', 'fine');
    zip.file('../../escape.txt', 'evil');
    const data = await zip.generateAsync({ type: 'uint8array' });
    await expect(readZipArchive(data)).rejects.toThrow(UnsafePathError);
  });

  it('rejects absolute entries', async () => {
    const zip = new JSZip();
    zip.file('/etc/cron.d/evil', 'evil');
    const data = await zip.generateAsync({ type: 'uint8array' });
    await expect(readZipArchive(data)).rejects.toThrow(UnsafePathError);
  });
});
