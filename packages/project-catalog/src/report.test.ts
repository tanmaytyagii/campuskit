import { describe, expect, it } from 'vitest';

import {
  assembleReport,
  countPrompts,
  draftSection,
  emptyInfo,
  presentationAsSlides,
  SECTION_IDS,
} from './report.ts';
import { getProjectById } from './index.ts';

const analyzer = getProjectById('student-result-analyzer');
if (!analyzer) throw new Error('missing project');

describe('report drafts', () => {
  const info = { ...emptyInfo(analyzer), team: 'Asha K., Rahul M.', guide: 'Dr. Mehta' };

  it('uses the project’s real limitations and ideas', () => {
    const results = draftSection('results', analyzer, info);
    for (const limitation of analyzer.limitations) expect(results).toContain(limitation);
    const future = draftSection('future', analyzer, info);
    for (const idea of analyzer.ideasForExtension) expect(future).toContain(idea);
  });

  it('never fabricates results: test outcomes are prompts to fill in', () => {
    const tests = draftSection('testCases', analyzer, info);
    expect(tests).toContain('python -m pytest');
    expect(tests).toContain('[fill in after testing]');
    expect(tests).not.toMatch(/\| Pass \|/);
    expect(draftSection('results', analyzer, info)).toContain('Do not copy results from elsewhere');
  });

  it('includes the template’s viva questions when available', () => {
    const viva = draftSection(
      'viva',
      analyzer,
      info,
      '# Viva questions\n\n## 1. What does the project do?\n\nIt analyses marks.',
    );
    // Headings move one level down so they sit under the report's "Viva questions" section.
    expect(viva).toContain('### 1. What does the project do?');
    expect(viva).not.toContain('# Viva questions');
  });

  it('gives blank prompts for a student’s own project', () => {
    expect(
      draftSection('abstract', null, { ...emptyInfo(null), title: 'Smart Library' }),
    ).toContain('**Smart Library**');
    expect(countPrompts(draftSection('database', null, emptyInfo(null)))).toBeGreaterThan(0);
  });

  it('counts bracketed prompts but not Markdown links or checkboxes', () => {
    expect(countPrompts('Fill [your answer] here and [another one].')).toBe(2);
    expect(countPrompts('See [the guide](https://example.com) and - [x] done')).toBe(0);
  });

  it('assembles a clearly labelled draft with every section', () => {
    const sections = Object.fromEntries(
      SECTION_IDS.map((id) => [id, draftSection(id, analyzer, info)]),
    ) as Record<(typeof SECTION_IDS)[number], string>;
    const report = assembleReport(analyzer, info, sections, '21 Oct 2026');
    expect(report).toContain('> **Draft started with CampusKit on 21 Oct 2026.**');
    expect(report).toContain('**Team:** Asha K., Rahul M.');
    expect(report).toContain('`student-result-analyzer`');
    expect(report.match(/^## \d+\. /gm)).toHaveLength(SECTION_IDS.length);
  });

  it('drafts the implemented features and testing methodology from the manifest', () => {
    const features = draftSection('features', analyzer, info);
    for (const feature of analyzer.features) expect(features).toContain(feature);
    const testing = draftSection('testing', analyzer, info);
    for (const item of analyzer.testing.covers) expect(testing).toContain(item);
    expect(testing).toContain('python -m pytest');
    expect(countPrompts(testing)).toBeGreaterThan(0);
  });

  it('keeps CampusKit facts in a labelled appendix, apart from the student’s sections', () => {
    const sections = Object.fromEntries(
      SECTION_IDS.map((id) => [id, draftSection(id, analyzer, info)]),
    ) as Record<(typeof SECTION_IDS)[number], string>;
    const report = assembleReport(analyzer, info, sections, '23 Oct 2026', {
      verification: ['macOS 26.2 (arm64), 22 Oct 2026: python -m pytest (49 passed)'],
      demo: [
        { text: 'Start the app.', done: true },
        { text: 'Upload a file.', done: false },
      ],
    });
    const appendix = report.slice(report.indexOf('## Appendix A: Project facts from CampusKit'));
    expect(appendix).toContain('it was not written by the student');
    expect(appendix).toContain('python -m pytest (49 passed)');
    for (const limitation of analyzer.limitations) expect(appendix).toContain(limitation);
    expect(report).toContain('## Appendix B: Demonstration checklist');
    expect(report).toContain('- [x] Start the app.');
    expect(report).toContain('- [ ] Upload a file.');
  });

  it('says so when no verification is recorded, and leaves it out when unknown', () => {
    const sections = Object.fromEntries(
      SECTION_IDS.map((id) => [id, draftSection(id, analyzer, info)]),
    ) as Record<(typeof SECTION_IDS)[number], string>;
    expect(assembleReport(analyzer, info, sections, 'today', { verification: [] })).toContain(
      'no verification of the current template files has been recorded',
    );
    expect(assembleReport(analyzer, info, sections, 'today')).not.toContain(
      'Verified by CampusKit',
    );
  });

  it('turns the presentation outline into a plain slide list', () => {
    expect(
      presentationAsSlides('1. **Title:** My App; Asha\n2. **Problem statement:** [one slide]'),
    ).toBe('Slide 1: Title: My App; Asha\nSlide 2: Problem statement: [one slide]');
  });
});
