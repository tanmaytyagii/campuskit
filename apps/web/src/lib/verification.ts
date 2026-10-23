/**
 * Template statuses for the site. The fingerprints come from the files this
 * build publishes (see vite-plugins/template-bundles.ts), so a template shows
 * as verified only if those exact files passed `pnpm verify:generated`.
 */
import {
  catalog,
  templateStatus,
  verificationRecordSchema,
  type ProjectManifest,
  type TemplateStatus,
} from '@campuskit/project-catalog';
import verification from 'virtual:template-verification';

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
