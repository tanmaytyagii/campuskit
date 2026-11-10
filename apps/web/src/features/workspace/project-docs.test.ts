import { getProjectById } from '@campuskit/project-catalog';
import { describe, expect, it } from 'vitest';

import { loadLearningGuide } from '../../lib/learning.ts';
import { CRITERIA, RATINGS, recordRatings, type Ratings } from '../../lib/progress.ts';
import {
  addMilestone,
  addResource,
  createProject,
  EMPTY_WORKSPACE,
  toggleMilestone,
  type WorkspaceProject,
} from '../../lib/workspace.ts';
import { projectReadme, vivaSheet } from './project-docs.ts';

const NOW = '2026-10-31T09:00:00.000Z';
// The lowest rating, so the question's outcome is “review again”.
const MISSED = RATINGS[0];

function bare(): WorkspaceProject {
  const { state } = createProject(
    EMPTY_WORKSPACE,
    {
      title: 'Library Seat Finder',
      description: '',
      category: 'web',
      status: 'planning',
      tags: [],
      stack: [],
      templateId: null,
    },
    NOW,
    'p1',
  );
  const project = state.projects[0];
  if (!project) throw new Error('missing project');
  return project;
}

function detailed(templateId: string | null): WorkspaceProject {
  let { state } = createProject(
    EMPTY_WORKSPACE,
    {
      title: 'Library Seat Finder',
      description: 'Shows free seats in the college library.',
      category: 'web',
      status: 'in-progress',
      tags: [],
      stack: ['Flask', 'SQLite'],
      templateId,
    },
    NOW,
    'p1',
  );
  state = addMilestone(state, 'p1', { title: 'Seat map page', due: '2026-11-10' }, NOW);
  state = addMilestone(state, 'p1', { title: 'Write the report', due: null }, NOW);
  const first = state.projects[0]?.milestones[0];
  if (first) state = toggleMilestone(state, 'p1', first.id, NOW);
  state = addResource(state, 'p1', { title: 'Repository', url: 'https://example.com/repo' }, NOW);
  const project = state.projects[0];
  if (!project) throw new Error('missing project');
  return project;
}

describe('project README', () => {
  it('marks every part with no details as to write, and lists it as missing', () => {
    const { markdown, missing } = projectReadme(bare(), undefined, '2026-10-31');
    expect(missing).toEqual([
      'A description of what the project does',
      'The technology it uses',
      'Its features',
      'How to install and run it',
      'How to run its tests',
    ]);
    expect(markdown.match(/_To write:/g)).toHaveLength(5);
    expect(markdown).not.toContain('## Roadmap');
  });

  it('uses the project’s own details, and the template’s setup labelled as the template’s', () => {
    const template = getProjectById('student-management-system');
    const { markdown, missing } = projectReadme(
      detailed('student-management-system'),
      template,
      '2026-10-31',
    );
    expect(missing).toEqual([]);
    expect(markdown).toContain('Shows free seats in the college library.');
    expect(markdown).toContain('In progress. 1 of 2 milestones done.');
    expect(markdown).toContain('- [x] Seat map page (due 10 Nov 2026)');
    expect(markdown).toContain('- [ ] Write the report');
    expect(markdown).toContain('- [Repository](https://example.com/repo)');
    expect(markdown).toContain('Features of the Student Management System template');
    expect(markdown).toContain(template?.testing.commands[0]?.command ?? 'missing');
  });
});

describe('viva preparation sheet', () => {
  it('lists what to explain and what’s left, and the template’s questions with the student’s ratings', async () => {
    const template = getProjectById('student-management-system');
    if (!template) throw new Error('missing template');
    const loaded = await loadLearningGuide(template);
    if (!loaded) throw new Error('missing guide');
    const [first] = loaded.guide.viva;
    if (!first) throw new Error('no questions');
    const { markdown, missing } = vivaSheet(
      detailed(template.id),
      {
        manifest: template,
        guide: loaded.guide,
        progress: recordRatings(
          { version: 1, questions: {} },
          first.id,
          Object.fromEntries(CRITERIA.map((criterion) => [criterion, MISSED])) as Ratings,
          '2026-10-30',
        ),
      },
      '2026-10-31',
    );
    expect(missing).toEqual([]);
    expect(markdown).toContain('- Why you chose Flask, and what it does in your project.');
    expect(markdown).toContain('- Write the report');
    expect(markdown).toContain(`- ${first.question} (review again)`);
    expect(markdown).toContain('(not practised yet)');
    // Model answers stay in viva practice; the sheet never claims mastery.
    expect(markdown).not.toContain(first.answer);
    expect(markdown).not.toMatch(/mastered/i);
  });

  it('asks for a template link when there are no questions to include', () => {
    const { missing } = vivaSheet(bare(), undefined, '2026-10-31');
    expect(missing).toContain(
      'Practice questions: link the project to a template to include its questions',
    );
    expect(missing).toHaveLength(4);
  });
});
