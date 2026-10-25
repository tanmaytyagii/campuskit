/**
 * Every project with an interactive demo. Definitions are plain data and load
 * with the page; each implementation (screens, sample data and the template
 * code it runs) loads only when its demo is opened.
 */
import type { ProjectManifest } from '@campuskit/project-catalog';

import type { LoadedDemo } from './define.ts';
import { attendanceDemo } from './demos/attendance/definition.ts';
import { expenseDemo } from './demos/expenses/definition.ts';
import { resultsDemo } from './demos/results/definition.ts';
import type { DemoDefinition } from './types.ts';

export const DEMOS: readonly DemoDefinition[] = [attendanceDemo, expenseDemo, resultsDemo];

export const DEMO_LOADERS: Readonly<Record<string, () => Promise<LoadedDemo>>> = {
  'attendance-system': () =>
    import('./demos/attendance/AttendanceDemo.tsx').then(
      (module) => module.attendanceImplementation,
    ),
  'expense-tracker': () =>
    import('./demos/expenses/ExpenseDemo.tsx').then((module) => module.expenseImplementation),
  'student-result-analyzer': () =>
    import('./demos/results/ResultsDemo.tsx').then((module) => module.resultsImplementation),
};

export function getDemo(projectId: string): DemoDefinition | undefined {
  return DEMOS.find((demo) => demo.projectId === projectId);
}

export function hasDemo(project: ProjectManifest): boolean {
  return getDemo(project.id) !== undefined;
}

export function loadDemo(projectId: string): Promise<LoadedDemo> {
  const loader = DEMO_LOADERS[projectId];
  return loader ? loader() : Promise.reject(new Error(`No demo for ${projectId}`));
}
