import { describe, expect, it } from 'vitest';

import {
  templateStatus,
  verificationRecordSchema,
  type VerificationEntry,
  type VerificationRecord,
} from './verification.ts';

const FINGERPRINT = `sha256:${'a'.repeat(64)}`;
const OTHER = `sha256:${'b'.repeat(64)}`;

function entry(overrides: Partial<VerificationEntry> = {}): VerificationEntry {
  return {
    platform: 'linux',
    verifiedOn: '2026-10-22',
    templateVersion: '1.0.0',
    fingerprint: FINGERPRINT,
    environment: { os: 'Ubuntu 24.04 (x64)', node: '24.12.0', npm: '11.6.2' },
    runs: [
      { variant: 'defaults', passed: true, steps: ['npm ci', 'npm test (34 passed)'] },
      { variant: 'customized', passed: true, steps: ['npm ci', 'npm test (34 passed)'] },
    ],
    ...overrides,
  };
}

function record(...entries: VerificationEntry[]): VerificationRecord {
  return { schemaVersion: 1, templateId: 'demo', entries };
}

const published = { version: '1.0.0' } as const;

describe('templateStatus', () => {
  it('is awaiting verification when nothing was recorded', () => {
    const status = templateStatus(published, null, FINGERPRINT);
    expect(status.id).toBe('awaiting-verification');
    expect(status.current).toEqual([]);
  });

  it('is verified only when a passing entry matches the current fingerprint and version', () => {
    const status = templateStatus(
      published,
      record(entry(), entry({ platform: 'macos' })),
      FINGERPRINT,
    );
    expect(status.id).toBe('verified');
    expect(status.summary).toContain('Linux and macOS');
  });

  it('falls back to awaiting verification when the template changed since', () => {
    const changedFiles = templateStatus(published, record(entry()), OTHER);
    expect(changedFiles.id).toBe('awaiting-verification');
    expect(changedFiles.outdated).toHaveLength(1);
    expect(changedFiles.summary).toContain('changed since it was last verified');

    const newVersion = templateStatus({ version: '1.1.0' }, record(entry()), FINGERPRINT);
    expect(newVersion.id).toBe('awaiting-verification');
  });

  it('needs attention when a current verification failed, even if another platform passed', () => {
    const failed = entry({
      platform: 'windows',
      runs: [
        { variant: 'defaults', passed: false, steps: [], failure: 'npm test exited with code 1' },
      ],
    });
    const status = templateStatus(published, record(entry(), failed), FINGERPRINT);
    expect(status.id).toBe('needs-attention');
    expect(status.summary).toContain('Windows');
  });

  it('never shows a draft as verified', () => {
    expect(templateStatus({ ...published, draft: true }, record(entry()), FINGERPRINT).id).toBe(
      'draft',
    );
  });

  it('never treats a missing fingerprint as a match', () => {
    expect(templateStatus(published, record(entry()), null).id).toBe('awaiting-verification');
  });
});

describe('verificationRecordSchema', () => {
  it('accepts a record written by the script', () => {
    expect(verificationRecordSchema.safeParse(record(entry())).success).toBe(true);
  });

  it('rejects two entries for the same platform and made-up fingerprints', () => {
    expect(verificationRecordSchema.safeParse(record(entry(), entry())).success).toBe(false);
    expect(
      verificationRecordSchema.safeParse(record(entry({ fingerprint: 'verified' }))).success,
    ).toBe(false);
  });
});
