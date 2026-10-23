/**
 * Template statuses for the site. The fingerprints come from the files this
 * build publishes (see vite-plugins/template-bundles.ts), so a template shows
 * as verified only if those exact files passed `pnpm verify:generated`.
 */
import {
  catalog,
  entryPassed,
  templateStatus,
  verificationRecordSchema,
  type ProjectManifest,
  type TemplateStatus,
} from '@campuskit/project-catalog';
import verification from 'virtual:template-verification';

import { formatIsoDate } from './format.ts';

function computeStatus(manifest: ProjectManifest): TemplateStatus {
  const data = verification[manifest.id];
  const record = verificationRecordSchema.safeParse(data?.record);
  return templateStatus(
    manifest,
    record.success && record.data.templateId === manifest.id ? record.data : null,
    data?.fingerprint ?? null,
  );
}

const statuses = new Map(catalog.map((manifest) => [manifest.id, computeStatus(manifest)]));

export function getTemplateStatus(manifest: ProjectManifest): TemplateStatus {
  return statuses.get(manifest.id) ?? computeStatus(manifest);
}

/**
 * One line per platform where the current template files passed, for the
 * report's facts appendix, e.g. "macOS 26.2 (arm64), 22 Oct 2026: npm test
 * (34 passed); npm run build". Only the test, build and start steps are listed.
 */
export function verificationLines(manifest: ProjectManifest): string[] {
  return getTemplateStatus(manifest)
    .current.filter(entryPassed)
    .map((entry) => {
      const outcomes = [
        ...new Set(
          entry.runs.flatMap((run) =>
            run.steps.filter((step) => /\b(test|pytest|build|streamlit run)\b/.test(step)),
          ),
        ),
      ];
      return `${entry.environment.os}, ${formatIsoDate(entry.verifiedOn)}: ${outcomes.join('; ')}`;
    });
}
