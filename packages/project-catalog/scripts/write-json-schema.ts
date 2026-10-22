/**
 * Writes manifest.schema.json from the Zod schema, so editors can offer
 * autocompletion and inline errors while you write a manifest.
 * Run with `pnpm --filter @campuskit/project-catalog schema`.
 */
import { writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { renderManifestJsonSchema } from '../src/json-schema.ts';

const target = join(dirname(fileURLToPath(import.meta.url)), '..', 'manifest.schema.json');
await writeFile(target, renderManifestJsonSchema());
console.log(`Wrote ${target}`);
