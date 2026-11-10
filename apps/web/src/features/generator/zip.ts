/**
 * Packing a generated project into a ZIP. It is kept apart from logic.ts, which the home and
 * project pages load straight away, because the ZIP code is large and only needed when a student
 * downloads a project.
 */
import { packageProject, type GeneratedProject } from '@campuskit/template-engine';

export interface GeneratedZip {
  project: GeneratedProject;
  zip: Uint8Array;
  fileName: string;
}

export async function buildZip(
  project: GeneratedProject,
  now: Date = new Date(),
): Promise<GeneratedZip> {
  const zip = await packageProject(project, now);
  return { project, zip, fileName: `${project.rootFolder}.zip` };
}
