/**
 * A template's fingerprint: a SHA-256 hash of every file the generator copies
 * and of the manifest fields that change what a generated project installs,
 * runs or tests. Verification records store it, so editing any of these
 * makes the record out of date. Descriptions, features and other prose are
 * left out: rewording them doesn't change the code students receive.
 */
import { createHash } from 'node:crypto';

import type { BundleFile } from '@campuskit/template-engine';

import type { ProjectManifest } from '../schema.ts';

export const FINGERPRINT_FIELDS = [
  'version',
  'template',
  'customization',
  'setup',
  'testing',
  'prerequisites',
  'environment',
] as const;

export type FingerprintInput = Pick<ProjectManifest, (typeof FINGERPRINT_FIELDS)[number]>;

/** JSON with object keys sorted, so the hash doesn't depend on key order. */
function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`;
  if (value && typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>)
      .filter(([, item]) => item !== undefined)
      .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
    return `{${entries.map(([key, item]) => `${JSON.stringify(key)}:${canonicalJson(item)}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

export function templateFingerprint(
  manifest: FingerprintInput,
  files: readonly Pick<BundleFile, 'path' | 'encoding' | 'content'>[],
): string {
  const hash = createHash('sha256');
  hash.update('campuskit-template-fingerprint:1\n');
  hash.update(
    canonicalJson(Object.fromEntries(FINGERPRINT_FIELDS.map((key) => [key, manifest[key]]))),
  );
  for (const file of [...files].sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0))) {
    hash.update(`\n${file.path}\n${file.encoding}\n${file.content.length}\n`);
    hash.update(file.content);
  }
  return `sha256:${hash.digest('hex')}`;
}
