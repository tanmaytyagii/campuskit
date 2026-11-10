import { catalog } from '@campuskit/project-catalog';
import { describe, expect, it } from 'vitest';

import { loadLearningGuide } from '../../lib/learning.ts';
import { createProject, EMPTY_WORKSPACE, setNotes } from '../../lib/workspace.ts';
import {
  architectureRequest,
  codeRequest,
  docsRequest,
  errorRequest,
  MAX_PASTE,
  templateMaterial,
  vivaRequest,
  workspaceDescription,
} from './prompts.ts';

describe('assistant requests', () => {
  it('describe a template from its learning guide, and tell the model not to invent anything', async () => {
    const project = catalog.find((item) => item.id === 'student-management-system');
    if (!project) throw new Error('missing template');
    const loaded = await loadLearningGuide(project);
    if (!loaded) throw new Error('missing guide');
    const request = architectureRequest(templateMaterial(project, loaded.guide));
    expect(request.user).toContain('Project: Student Management System (Python');
    expect(request.user).toContain(loaded.guide.architecture.summary);
    for (const component of loaded.guide.architecture.components)
      expect(request.user).toContain(component.name);
    expect(request.system).toContain('Never invent features, results, test outcomes');
    expect(request.system).toContain('say so plainly instead of guessing');
  });

  it('send only the workspace fields the page says it sends', () => {
    let { state } = createProject(
      EMPTY_WORKSPACE,
      {
        title: 'Library Seat Finder',
        description: 'Find a free seat in the college library.',
        category: 'web',
        status: 'in-progress',
        tags: ['secret-tag'],
        stack: ['React', 'Flask'],
        templateId: null,
      },
      '2026-10-31T09:00:00.000Z',
      'p1',
    );
    state = setNotes(state, 'p1', 'Seats come from a sensor table.', '2026-10-31T10:00:00.000Z');
    const project = state.projects[0];
    if (!project) throw new Error('missing project');
    const text = workspaceDescription(project);
    expect(text).toContain('Project: Library Seat Finder');
    expect(text).toContain('Status: In progress');
    expect(text).toContain('Technology: React, Flask');
    expect(text).toContain('Seats come from a sensor table.');
    expect(text).not.toContain('secret-tag');
    expect(vivaRequest(text, 5).system).toContain('Write 5 viva questions');
  });

  it('cut pasted text to the limit and keep optional context out when empty', () => {
    const long = 'x'.repeat(MAX_PASTE + 500);
    expect(codeRequest(long, '').user.match(/x/g)).toHaveLength(MAX_PASTE);
    expect(codeRequest('print(1)', '  ').user.startsWith('Code:')).toBe(true);
    expect(errorRequest('Traceback', 'Flask app').user).toMatch(/^About the project: Flask app/);
    expect(docsRequest(long).user.length).toBeLessThan(MAX_PASTE + 50);
  });
});
