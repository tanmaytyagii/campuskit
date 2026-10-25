/**
 * Every demo's metadata is checked against the real template: the files and
 * functions it names exist, its learning links resolve, its tour and guided
 * steps point at real screens, and its claim about what runs is true (a
 * template-logic demo imports each file it lists; a browser port has each
 * file in its parity fixture).
 */
import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  catalog,
  findSymbolLine,
  getProjectById,
  learningGuideSchema,
} from '@campuskit/project-catalog';
import { describe, expect, it } from 'vitest';

import analyzerFixture from './demos/results/analyzer.fixture.json';
import { DEMO_LOADERS, DEMOS, getDemo, loadDemo } from './registry.ts';
import type { LearnRefs } from './types.ts';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../../../../..');
const demoFolders: Record<string, string> = {
  'attendance-system': 'attendance',
  'expense-tracker': 'expenses',
  'student-result-analyzer': 'results',
};

function readTemplateFile(directory: string, file: string): string {
  return readFileSync(join(repoRoot, directory, file), 'utf8');
}

describe('demo registry', () => {
  it('registers each demo once, for a real project, with an implementation', () => {
    const ids = DEMOS.map((demo) => demo.projectId);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) expect(getProjectById(id), id).toBeDefined();
    expect(Object.keys(DEMO_LOADERS).sort()).toEqual([...ids].sort());
    expect(getDemo('no-such-project')).toBeUndefined();
  });

  it('offers a demo for every project in the catalog', () => {
    expect(catalog.map((project) => project.id).sort()).toEqual(
      DEMOS.map((demo) => demo.projectId).sort(),
    );
  });

  for (const demo of DEMOS) {
    describe(demo.projectId, () => {
      const project = getProjectById(demo.projectId);
      if (!project) throw new Error(`unknown project ${demo.projectId}`);
      const directory = project.template.directory;
      const guide = learningGuideSchema.parse(
        JSON.parse(
          readFileSync(
            join(repoRoot, 'packages/project-catalog/learning', `${project.id}.json`),
            'utf8',
          ),
        ),
      );

      it('has unique ids, and its tour and guided steps open real screens', () => {
        const features = demo.features.map((feature) => feature.id);
        expect(new Set(features).size).toBe(features.length);
        for (const list of [demo.tour, demo.presentation]) {
          const ids = list.map((step) => step.id);
          expect(new Set(ids).size).toBe(ids.length);
          for (const step of list)
            expect(features, `${step.id} → ${step.feature}`).toContain(step.feature);
        }
        expect(demo.tour.length).toBeGreaterThanOrEqual(3);
        expect(demo.presentation.length).toBeGreaterThanOrEqual(5);
      });

      it('names only files and functions that exist in the template', () => {
        const refs = [
          ...demo.features.flatMap((feature) => feature.source),
          ...demo.runs.files.map((file) => ({ file, symbol: undefined })),
        ];
        for (const ref of refs) {
          const content = readTemplateFile(directory, ref.file);
          if (ref.symbol)
            expect(
              findSymbolLine(ref.file, content, ref.symbol),
              `${ref.symbol} in ${ref.file}`,
            ).not.toBeNull();
        }
      });

      it('links only to walkthrough entries, components and questions in the learning guide', () => {
        const all: LearnRefs[] = [
          ...demo.features.map((feature) => feature.learn),
          ...demo.presentation.flatMap((step) => (step.learn ? [step.learn] : [])),
        ];
        const walkthrough = new Set(guide.walkthrough.map((entry) => entry.id));
        const components = new Set(guide.architecture.components.map((component) => component.id));
        const questions = new Set(guide.viva.map((question) => question.id));
        for (const learn of all) {
          for (const id of learn.walkthrough ?? []) expect(walkthrough, id).toContain(id);
          for (const id of learn.architecture ?? []) expect(components, id).toContain(id);
          for (const id of learn.viva ?? []) expect(questions, id).toContain(id);
        }
      });

      it('runs what it says it runs', () => {
        if (demo.fidelity === 'template-logic') {
          const imports = readFileSync(
            join(
              repoRoot,
              'apps/web/src/features/demo/demos',
              demoFolders[demo.projectId] ?? '',
              'template.ts',
            ),
            'utf8',
          );
          for (const file of demo.runs.files)
            expect(imports, `template.ts imports ${file}`).toContain(
              `templates/${directory.replace(/^templates\//, '')}/${file}`,
            );
        } else {
          for (const file of demo.runs.files)
            expect(Object.keys(analyzerFixture.sources), file).toContain(file);
        }
      });

      it('starts from data its own check accepts, and checks only real steps', async () => {
        const implementation = await loadDemo(demo.projectId);
        const state = implementation.createState();
        // Stored state goes through JSON (sessionStorage), so it must survive the round trip.
        expect(implementation.readState(JSON.parse(JSON.stringify(state)))).not.toBeNull();
        expect(implementation.readState({ version: 99 })).toBeNull();
        expect(implementation.readState(null)).toBeNull();
        const steps = demo.presentation.map((step) => step.id);
        for (const id of implementation.checkIds) expect(steps, id).toContain(id);
        expect(implementation.describe(state)).not.toBe('');
      });
    });
  }
});
