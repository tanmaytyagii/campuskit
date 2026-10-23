import { generateProject, resolveValues } from '@campuskit/template-engine';
import { buildTemplateBundle } from '@campuskit/template-engine/node';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

import { generationOptions, renderReportDraft } from './generation.ts';
import { getProjectById } from './index.ts';
import { REPORT_DRAFT_FILE } from './setup-guide.ts';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const analyzer = getProjectById('student-result-analyzer');
if (!analyzer) throw new Error('missing project');

describe('report draft', () => {
  const values = resolveValues(
    analyzer.customization,
    { projectName: 'Marks *Lab* <v2>', institutionName: 'St. Mary’s', authorName: 'Asha | Rahul' },
    analyzer.id,
  );
  const draft = renderReportDraft(analyzer, values, '2026-10-22');

  it('uses the student’s choices, escaped so they render literally', () => {
    expect(draft).toContain('# Marks \\*Lab\\* \\<v2\\>');
    expect(draft).toContain('**Team:** Asha \\| Rahul');
    expect(draft).toContain('**Institution:** St. Mary’s');
  });

  it('contains only the manifest’s real facts and prompts for everything else', () => {
    for (const limitation of analyzer.limitations) expect(draft).toContain(limitation);
    for (const idea of analyzer.ideasForExtension) expect(draft).toContain(idea);
    expect(draft).toContain('[fill in after testing]');
    expect(draft).toContain('Draft started with CampusKit on 2026-10-22');
  });
});

describe('generationOptions', () => {
  it('adds GETTING_STARTED.md and the report draft to the real template', async () => {
    const { bundle } = await buildTemplateBundle(join(repoRoot, analyzer.template.directory), {
      templateId: analyzer.id,
      templateVersion: analyzer.version,
    });
    const project = generateProject({
      bundle,
      input: {},
      ...generationOptions(analyzer, '2026-10-22'),
    });
    const paths = project.files.map((file) => file.path);
    expect(paths).toContain('GETTING_STARTED.md');
    expect(paths).toContain(REPORT_DRAFT_FILE);

    const guide = project.files.find((file) => file.path === 'GETTING_STARTED.md')?.content ?? '';
    expect(guide).toContain('## Environment variables');
    expect(guide).toContain('None. The project needs no API keys');
    expect(guide).toContain('## Known limitations');
    for (const limitation of analyzer.limitations) expect(guide).toContain(limitation);
    expect(guide).toContain('[Viva questions');
    expect(guide).toContain(`(${REPORT_DRAFT_FILE})`);
  });
});
