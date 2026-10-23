import { catalog, verificationRecordSchema } from '@campuskit/project-catalog';
import { templateFingerprint } from '@campuskit/project-catalog/node';
import verification from 'virtual:template-verification';
import { describe, expect, it } from 'vitest';

import { diskBundleLoader } from '../test/render.tsx';
import { getTemplateStatus } from './verification.ts';

describe('template verification on the site', () => {
  it('fingerprints exactly the files the generator serves, the same way the validator does', async () => {
    for (const manifest of catalog) {
      const bundle = await diskBundleLoader(manifest.id);
      expect(verification[manifest.id]?.fingerprint).toBe(
        templateFingerprint(manifest, bundle.files),
      );
    }
  });

  it('passes on only well-formed records for the right template', () => {
    for (const manifest of catalog) {
      const record = verification[manifest.id]?.record ?? null;
      if (record === null) continue;
      const parsed = verificationRecordSchema.parse(record);
      expect(parsed.templateId).toBe(manifest.id);
    }
  });

  it('gives every template a status with an explanation', () => {
    for (const manifest of catalog) {
      const status = getTemplateStatus(manifest);
      expect(status.summary.length).toBeGreaterThan(20);
      if (status.id === 'verified') expect(status.current.length).toBeGreaterThan(0);
    }
  });
});
