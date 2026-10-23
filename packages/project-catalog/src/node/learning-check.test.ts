import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { buildTemplateBundle } from '@campuskit/template-engine/node';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { getProjectById } from '../index.ts';
import { learningGuideSchema, type LearningGuide } from '../learning.ts';
import { checkLearningGuide, checkSwatches, readLearningGuides } from './learning-check.ts';

const packageDir = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const repoRoot = resolve(packageDir, '..', '..');
const manifest = getProjectById('attendance-system');
if (!manifest) throw new Error('missing project');

let files: Map<string, { path: string; encoding: 'utf8' | 'base64'; content: string }>;
let guide: LearningGuide;

beforeAll(async () => {
  const { bundle } = await buildTemplateBundle(join(repoRoot, manifest.template.directory), {
    templateId: manifest.id,
    templateVersion: manifest.version,
  });
  files = new Map(bundle.files.map((file) => [file.path, file]));
  guide = learningGuideSchema.parse(
    JSON.parse(await readFile(join(packageDir, 'learning', 'attendance-system.json'), 'utf8')),
  );
});

describe('checkLearningGuide', () => {
  it('finds no problems in the real guide', () => {
    expect(checkLearningGuide(guide, manifest, files)).toEqual([]);
  });

  it('reports files, functions and labels the template does not contain', () => {
    const broken = structuredClone(guide);
    broken.walkthrough[0]!.file = 'src/missing.ts';
    broken.walkthrough[1]!.symbols[0]!.name = 'notARealFunction';
    broken.viva[0]!.symbols = [{ file: 'src/lib/attendance.ts', name: 'percentageOfAttendance' }];
    broken.preview.navigation[0] = 'Invented screen';
    const messages = checkLearningGuide(broken, manifest, files).map((problem) => problem.message);
    expect(messages).toEqual(
      expect.arrayContaining([
        '"src/missing.ts" is not a file in templates/attendance-system',
        '"notARealFunction" is not defined in src/config.ts',
        '"percentageOfAttendance" is not defined in src/lib/attendance.ts',
        'The app never shows the label "Invented screen"',
      ]),
    );
  });

  it('rejects troubleshooting advice for the wrong stack and unsafe commands', () => {
    const broken = structuredClone(guide);
    broken.troubleshooting.include = ['python-streamlit'];
    broken.troubleshooting.entries[0]!.fix[0]!.commands = [
      { command: 'rm -rf node_modules', platform: 'macos-linux' },
    ];
    const messages = checkLearningGuide(broken, manifest, files).map((problem) => problem.message);
    expect(messages.some((message) => message.includes("doesn't match a npm project"))).toBe(true);
    expect(messages).toContain(
      '"rm -rf node_modules" deletes files; recommend a safe alternative instead',
    );
  });
});

describe('checkSwatches', () => {
  it('accepts swatches the template uses and rejects invented colours', () => {
    expect(checkSwatches(manifest, files)).toEqual([]);
    const altered = structuredClone(manifest);
    const theme = altered.customization.options.find((option) => option.id === 'theme');
    if (theme?.type !== 'select' || !theme.choices[0]) throw new Error('missing theme option');
    theme.choices[0].swatch = '#123456';
    expect(checkSwatches(altered, files).map((problem) => problem.message)).toEqual([
      `The swatch #123456 for "${theme.choices[0].label}" is not a colour the template uses`,
    ]);
  });
});

describe('readLearningGuides', () => {
  let directory: string;
  beforeAll(async () => {
    directory = await mkdtemp(join(tmpdir(), 'campuskit-learning-'));
    await writeFile(join(directory, 'broken.json'), '{');
    await writeFile(
      join(directory, 'wrong-name.json'),
      await readFile(join(packageDir, 'learning', 'attendance-system.json'), 'utf8'),
    );
  });
  afterAll(async () => {
    await rm(directory, { recursive: true, force: true });
  });

  it('reports invalid and misnamed guides instead of using them', async () => {
    const { guides, problems } = await readLearningGuides(directory);
    expect(guides.size).toBe(0);
    expect(problems.map((problem) => problem.file).sort()).toEqual([
      'broken.json',
      'wrong-name.json',
    ]);
  });

  it('treats a missing folder as no guides', async () => {
    const { guides, problems, shared } = await readLearningGuides(join(directory, 'missing'));
    expect(guides.size).toBe(0);
    expect(problems).toEqual([]);
    expect(shared).toBeNull();
  });
});
