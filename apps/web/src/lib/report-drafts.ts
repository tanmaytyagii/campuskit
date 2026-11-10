/**
 * Report drafts from the submission workspace, saved in this browser only
 * under campuskit:report:v1:<project id>. Shared by the workspace and the
 * readiness check, so both read a draft the same way.
 */
import {
  emptyInfo,
  SECTION_IDS,
  type ReportInfo,
  type SectionId,
} from '@campuskit/project-catalog';

import { readStored } from './storage.ts';

export const REPORT_STORAGE_PREFIX = 'campuskit:report:v1:';

export interface StoredReport {
  info: ReportInfo;
  sections: Partial<Record<SectionId, string>>;
}

const INFO_KEYS = Object.keys(emptyInfo(null)) as Array<keyof ReportInfo>;

/**
 * Accepts drafts saved before sections were added (they only lack the new
 * sections, which are then filled with fresh drafts) but never a value with a
 * section that isn't text.
 */
export function isStoredReport(value: unknown): value is StoredReport {
  if (typeof value !== 'object' || value === null) return false;
  const candidate = value as Partial<StoredReport>;
  if (typeof candidate.info !== 'object' || candidate.info === null) return false;
  if (typeof candidate.sections !== 'object' || candidate.sections === null) return false;
  // The report builder edits these as text, so a value that isn't text would break it.
  const info = candidate.info as unknown as Record<string, unknown>;
  if (!INFO_KEYS.every((key) => info[key] === undefined || typeof info[key] === 'string'))
    return false;
  const sections = candidate.sections as Record<string, unknown>;
  return SECTION_IDS.every((id) => sections[id] === undefined || typeof sections[id] === 'string');
}

export function readReportDraft(projectId: string): StoredReport | null {
  return readStored(`${REPORT_STORAGE_PREFIX}${projectId}`, isStoredReport);
}
