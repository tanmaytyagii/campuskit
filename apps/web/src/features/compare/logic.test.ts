import { catalog, getProjectById, type ProjectManifest } from '@campuskit/project-catalog';
import { describe, expect, it } from 'vitest';

import { GOALS, parseCompared, suggestForGoal, tradeOffs } from './logic.ts';

function project(id: string): ProjectManifest {
  const found = getProjectById(id);
  if (!found) throw new Error(`missing ${id}`);
  return found;
}

const goal = (id: string) => {
  const found = GOALS.find((item) => item.id === id);
  if (!found) throw new Error(`missing goal ${id}`);
  return found;
};

const ids = (projects: ProjectManifest[]) => projects.map((item) => item.id);

describe('goal suggestions', () => {
  const verified = () => 'verified' as const;

  it('follows the written rules over manifest data', () => {
    expect(ids(suggestForGoal(goal('first-project'), catalog, verified).projects)).toEqual([
      'attendance-system',
    ]);
    expect(ids(suggestForGoal(goal('python'), catalog, verified).projects)).toEqual([
      'student-result-analyzer',
    ]);
    expect(ids(suggestForGoal(goal('frontend'), catalog, verified).projects)).toEqual([
      'attendance-system',
      'expense-tracker',
    ]);
  });

  it('uses a labelled fallback when nothing matches, and says so', () => {
    const ai = suggestForGoal(goal('ai-ml'), catalog, verified);
    expect(ai.note).toMatch(/no AI or machine learning project yet/);
    expect(ids(ai.projects)).toEqual(['student-result-analyzer']);
    const database = suggestForGoal(goal('database'), catalog, verified);
    expect(database.note).toMatch(/No project uses a database yet/);
    expect(ids(database.projects)).toEqual(['attendance-system', 'expense-tracker']);
  });

  it('only suggests verified templates for software engineering practice', () => {
    const result = suggestForGoal(goal('software-engineering'), catalog, (item) =>
      item.id === 'expense-tracker' ? 'awaiting-verification' : 'verified',
    );
    expect(ids(result.projects)).toEqual(['attendance-system', 'student-result-analyzer']);
  });
});

describe('comparison', () => {
  it('keeps two or three known, unique ids from the address', () => {
    expect(
      parseCompared('expense-tracker,nope,expense-tracker,attendance-system', catalog),
    ).toEqual(['expense-tracker', 'attendance-system']);
    expect(parseCompared(null, catalog)).toEqual([]);
  });

  it('explains differences in plain sentences built from the manifests', () => {
    const sentences = tradeOffs([project('attendance-system'), project('student-result-analyzer')]);
    expect(sentences).toContain(
      'Student Attendance System is beginner level; Student Result Analyzer is intermediate level.',
    );
    expect(sentences).toContain(
      'For a first project, Student Attendance System is the gentler start.',
    );
    expect(sentences).toContain(
      'Student Attendance System runs entirely in the browser, with no server; Student Result Analyzer runs a small server on your own computer.',
    );
    expect(sentences).toContain('Both run offline once installed.');
    expect(sentences).toContain('Both need no API keys, accounts or external services.');
  });

  it('states shared facts once for three projects', () => {
    const sentences = tradeOffs(catalog);
    expect(sentences).toContain('All of them run offline once installed.');
    expect(tradeOffs([project('expense-tracker')])).toEqual([]);
  });
});
