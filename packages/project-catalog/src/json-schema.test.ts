import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { renderManifestJsonSchema } from './json-schema.ts';

describe('manifest.schema.json', () => {
  it('is up to date with the Zod schema (run `pnpm --filter @campuskit/project-catalog schema` to refresh)', async () => {
    const file = join(dirname(fileURLToPath(import.meta.url)), '..', 'manifest.schema.json');
    expect(await readFile(file, 'utf8')).toBe(renderManifestJsonSchema());
  });
});
