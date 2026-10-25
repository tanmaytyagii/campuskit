import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { catalog, learningGuideSchema } from '@campuskit/project-catalog';
import { describe, expect, it } from 'vitest';

import { getDemo } from '../demo/registry.ts';
import { buildSlides } from './slides.ts';

const learningDir = resolve(
  dirname(fileURLToPath(import.meta.url)),
  '../../../../../packages/project-catalog/learning',
);

describe('presentation slides', () => {
  for (const project of catalog) {
    const guide = learningGuideSchema.parse(
      JSON.parse(readFileSync(join(learningDir, `${project.id}.json`), 'utf8')),
    );
    const demo = getDemo(project.id);
    const slides = buildSlides(project, guide, demo);

    it(`${project.id}: follows the presentation order`, () => {
      const sections = [...new Set(slides.map((slide) => slide.section))];
      expect(sections).toEqual([
        'Introduction',
        'Problem',
        'Objectives',
        'Features',
        'Architecture',
        'Workflow',
        'Technology',
        'Demo',
        'Limitations',
        'Conclusion',
      ]);
      const ids = slides.map((slide) => slide.id);
      expect(new Set(ids).size).toBe(ids.length);
      for (const slide of slides) expect(slide.notes.length).toBeGreaterThan(0);
    });

    it(`${project.id}: uses only the project’s own data`, () => {
      const byId = new Map(slides.map((slide) => [slide.id, slide]));
      expect(byId.get('title')?.title).toBe(project.name);
      expect(byId.get('problem')?.body).toMatchObject({ paragraphs: [project.description] });
      expect(byId.get('features')?.body).toMatchObject({
        items: project.features.slice(0, 6),
      });
      expect(byId.get('limitations')?.body).toMatchObject({
        items: project.limitations.slice(0, 6),
      });
      expect(byId.get('architecture')?.body).toMatchObject({
        summary: guide.architecture.summary,
      });
      expect(byId.get('demo-plan')?.body).toEqual({ kind: 'demo-plan', steps: guide.demo });
      expect(byId.get('conclusion')?.body).toMatchObject({
        improvements: project.ideasForExtension.slice(0, 4),
      });
      // One slide per guided demo step, in order, after the demo plan.
      const demoSlides = slides.filter((slide) => slide.body.kind === 'demo');
      expect(demoSlides.map((slide) => slide.title)).toEqual(
        demo?.presentation.map((step) => step.title) ?? [],
      );
      expect(slides.filter((slide) => slide.source === 'guidance')).toEqual([]);
    });
  }

  it('still works without a learning guide or a demo', () => {
    const project = catalog[0];
    if (!project) throw new Error('empty catalog');
    const slides = buildSlides(project, null, undefined);
    expect(slides.map((slide) => slide.id)).toEqual([
      'title',
      'problem',
      'objectives',
      'features',
      'technology',
      'limitations',
      'conclusion',
    ]);
  });
});
