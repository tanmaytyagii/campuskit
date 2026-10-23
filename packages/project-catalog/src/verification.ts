/**
 * Template verification records and the status every screen shows.
 *
 * A record is written only by `pnpm verify:generated --record`, after it has
 * generated a template's projects, extracted the ZIPs, installed the
 * dependencies and run the tests and build on a real computer. Each entry
 * stores a fingerprint of the template files and of the manifest fields that
 * change what students receive. When either changes, the entry no longer
 * matches and the template drops back to "awaiting verification" by itself,
 * so a badge can never outlive the code it describes.
 */
import type { ProjectManifest } from './schema.ts';
import { z } from './zod.ts';

export const VERIFICATION_PLATFORMS = ['linux', 'macos', 'windows'] as const;
export type VerificationPlatform = (typeof VERIFICATION_PLATFORMS)[number];

export const PLATFORM_LABELS: Record<VerificationPlatform, string> = {
  linux: 'Linux',
  macos: 'macOS',
  windows: 'Windows',
};

export const VARIANT_LABELS = {
  defaults: 'Default settings',
  customized: 'Every setting changed',
} as const;

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use the YYYY-MM-DD format');

export const verificationRunSchema = z.strictObject({
  variant: z.enum(['defaults', 'customized']),
  passed: z.boolean(),
  /** What was run, in order, e.g. "npm test (34 passed)". */
  steps: z.array(z.string().min(1).max(200)).max(20),
  /** The first failure, when `passed` is false. */
  failure: z.string().max(2000).optional(),
});

export const verificationEntrySchema = z.strictObject({
  platform: z.enum(VERIFICATION_PLATFORMS),
  verifiedOn: isoDate,
  templateVersion: z.string().regex(/^\d+\.\d+\.\d+$/),
  fingerprint: z.string().regex(/^sha256:[0-9a-f]{64}$/, 'Use the value the script writes'),
  environment: z.strictObject({
    os: z.string().min(1).max(80),
    node: z.string().min(1).max(40),
    npm: z.string().max(40).optional(),
    python: z.string().max(40).optional(),
  }),
  runs: z.array(verificationRunSchema).min(1).max(4),
});

export const verificationRecordSchema = z
  .strictObject({
    schemaVersion: z.literal(1),
    templateId: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
    entries: z.array(verificationEntrySchema).max(VERIFICATION_PLATFORMS.length),
  })
  .superRefine((record, ctx) => {
    const platforms = record.entries.map((entry) => entry.platform);
    if (new Set(platforms).size !== platforms.length) {
      ctx.addIssue({
        code: 'custom',
        path: ['entries'],
        message: 'Each platform may appear only once',
      });
    }
  });

export type VerificationRun = z.infer<typeof verificationRunSchema>;
export type VerificationEntry = z.infer<typeof verificationEntrySchema>;
export type VerificationRecord = z.infer<typeof verificationRecordSchema>;

export function entryPassed(entry: VerificationEntry): boolean {
  return entry.runs.every((run) => run.passed);
}

export const STATUS_IDS = [
  'draft',
  'awaiting-verification',
  'verified',
  'needs-attention',
] as const;
export type TemplateStatusId = (typeof STATUS_IDS)[number];

export const STATUS_LABELS: Record<TemplateStatusId, string> = {
  draft: 'Draft',
  'awaiting-verification': 'Awaiting verification',
  verified: 'Verified',
  'needs-attention': 'Needs attention',
};

export interface TemplateStatus {
  id: TemplateStatusId;
  label: string;
  /** One sentence explaining why the template has this status. */
  summary: string;
  /** Entries that match the current template files. */
  current: VerificationEntry[];
  /** Entries recorded before the template last changed. */
  outdated: VerificationEntry[];
}

function platformList(entries: readonly VerificationEntry[]): string {
  const names = entries.map((entry) => PLATFORM_LABELS[entry.platform]);
  return names.length <= 1
    ? (names[0] ?? '')
    : `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;
}

/**
 * Works out a template's status from its manifest, its verification record
 * (if any) and the fingerprint of the files the site actually publishes.
 */
export function templateStatus(
  manifest: Pick<ProjectManifest, 'draft' | 'version'>,
  record: VerificationRecord | null,
  fingerprint: string | null,
): TemplateStatus {
  const entries = record?.entries ?? [];
  const isCurrent = (entry: VerificationEntry) =>
    fingerprint !== null &&
    entry.fingerprint === fingerprint &&
    entry.templateVersion === manifest.version;
  const current = entries.filter(isCurrent);
  const outdated = entries.filter((entry) => !isCurrent(entry));
  const make = (id: TemplateStatusId, summary: string): TemplateStatus => ({
    id,
    label: STATUS_LABELS[id],
    summary,
    current,
    outdated,
  });

  if (manifest.draft) {
    return make(
      'draft',
      'This template is still being written or reviewed. It may be incomplete; check it carefully before relying on it.',
    );
  }
  const failed = current.filter((entry) => !entryPassed(entry));
  if (failed.length > 0) {
    return make(
      'needs-attention',
      `The last verification on ${platformList(failed)} failed. The maintainers need to fix the template before it is verified again.`,
    );
  }
  if (current.length > 0) {
    return make(
      'verified',
      `Generated, installed, tested and built on ${platformList(current)} from exactly the files this site serves.`,
    );
  }
  if (outdated.length > 0) {
    return make(
      'awaiting-verification',
      'The template has changed since it was last verified, so the earlier results no longer apply.',
    );
  }
  return make(
    'awaiting-verification',
    'The automated checks on this site pass, but nobody has recorded a full install, test and build of the generated project yet.',
  );
}
