import { describe, expect, it } from 'vitest';

import { templatesForChanges } from '../scripts/lib/changed-templates.ts';

const ids = ['attendance-system', 'expense-tracker', 'student-result-analyzer'];

describe('templatesForChanges', () => {
  it('selects the templates whose folder or manifest changed', () => {
    expect(
      templatesForChanges(
        [
          'templates/expense-tracker/src/App.tsx',
          'packages/project-catalog/manifests/attendance-system.json',
          'README.md',
        ],
        ids,
      ),
    ).toEqual({ kind: 'some', ids: ['attendance-system', 'expense-tracker'] });
  });

  it('selects nothing for documentation-only changes', () => {
    expect(templatesForChanges(['docs/deployment.md', 'apps/web/src/main.tsx'], ids)).toEqual({
      kind: 'some',
      ids: [],
    });
  });

  it('selects every template when the engine, catalog code or dependencies change', () => {
    for (const path of [
      'packages/template-engine/src/zip.ts',
      'packages/project-catalog/src/setup-guide.ts',
      'scripts/verify-generated-projects.ts',
      'pnpm-lock.yaml',
    ]) {
      expect(templatesForChanges([path], ids)).toEqual({ kind: 'all' });
    }
  });

  it('selects every template for a template folder the base branch does not know yet', () => {
    expect(templatesForChanges(['templates/quiz-app/package.json'], ids)).toEqual({ kind: 'all' });
  });
});
