/**
 * Every project with an interactive demo. Definitions are plain data and load
 * with the page; each implementation (screens, sample data and the template
 * code it runs) loads only when its demo is opened.
 */
import type { ProjectManifest } from '@campuskit/project-catalog';

import type { LoadedDemo } from './define.ts';
import { attendanceDemo } from './demos/attendance/definition.ts';
import type { DemoDefinition } from './types.ts';

export const DEMOS: readonly DemoDefinition[] = [attendanceDemo];

export const DEMO_LOADERS: Readonly<Record<string, () => Promise<LoadedDemo>>> = {
  'attendance-system': () =>
    import('./demos/attendance/AttendanceDemo.tsx').then(
      (module) => module.attendanceImplementation,
    ),
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
