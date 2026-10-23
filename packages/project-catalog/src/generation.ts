/**
 * Everything the template engine needs from a manifest to generate a
 * project. The website, the catalog validator and `pnpm verify:generated`
 * all call `generationOptions`, so they produce byte-identical projects.
 */
import {
  escapeMarkdown,
  type GeneratedDocument,
  type GenerateProjectOptions,
  type ResolvedValues,
} from '@campuskit/template-engine';

import { assembleReport, draftSection, emptyInfo, SECTION_IDS, type SectionId } from './report.ts';
import type { ProjectManifest } from './schema.ts';
import { buildSetupGuide, REPORT_DRAFT_FILE } from './setup-guide.ts';

function optionText(values: ResolvedValues, id: string): string {
  const value = values.options[id];
  return typeof value === 'string' ? escapeMarkdown(value.trim()) : '';
}

/**
 * A report draft built from the manifest and the student's own choices.
 * Values the student typed are escaped so they render literally; everything
 * the student must write or measure is left as a [bracketed prompt].
 */
export function renderReportDraft(
  manifest: ProjectManifest,
  values: ResolvedValues,
  generatedOn: string,
): string {
  const info = {
    ...emptyInfo(manifest),
    title: optionText(values, 'projectName') || manifest.name,
    team: optionText(values, 'authorName'),
    institution: optionText(values, 'institutionName'),
  };
  const sections = Object.fromEntries(
    SECTION_IDS.map((id) => [id, draftSection(id, manifest, info)]),
  ) as Record<SectionId, string>;
  return assembleReport(manifest, info, sections, generatedOn);
}

export function projectDocuments(
  manifest: ProjectManifest,
  values: ResolvedValues,
  generatedOn: string,
): GeneratedDocument[] {
  return [{ path: REPORT_DRAFT_FILE, content: renderReportDraft(manifest, values, generatedOn) }];
}

export function generationOptions(
  manifest: ProjectManifest,
  generatedOn: string,
): Pick<GenerateProjectOptions, 'customization' | 'createGuide' | 'createDocuments'> {
  return {
    customization: manifest.customization,
    createGuide: (values) => buildSetupGuide(manifest, values, generatedOn),
    createDocuments: (values) => projectDocuments(manifest, values, generatedOn),
  };
}
