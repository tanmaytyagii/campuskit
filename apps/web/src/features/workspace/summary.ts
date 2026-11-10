/** Plain-language descriptions of saved progress, shared by the cards and the restore preview. */
import type { ProjectBackup } from '../../lib/backup.ts';
import { formatIsoDate, pluralize } from '../../lib/format.ts';

/** What a project's saved progress contains, one line per part. */
export function describeProgress(project: ProjectBackup): string[] {
  const lines: string[] = [];
  if (project.checklist)
    lines.push(`${pluralize(project.checklist.length, 'checklist item')} ticked`);
  if (project.viva)
    lines.push(`${pluralize(Object.keys(project.viva).length, 'viva question')} rated`);
  if (project.rehearsal)
    lines.push(`Guided demo completed on ${formatIsoDate(project.rehearsal.completedOn)}`);
  if (project.report) {
    const title = project.report.info.title.trim();
    lines.push(title ? `Report draft “${title}”` : 'Report draft');
  }
  if (project.demo) lines.push(`${pluralize(project.demo.length, 'demonstration step')} ticked`);
  if (project.readiness)
    lines.push(`${pluralize(project.readiness.length, 'readiness item')} confirmed`);
  return lines;
}
