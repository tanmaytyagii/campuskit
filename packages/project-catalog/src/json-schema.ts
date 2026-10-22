/** Renders the manifest schema as JSON Schema (draft 2020-12) for editors. */
import { z } from './zod.ts';

import { manifestSchema } from './schema.ts';

export function renderManifestJsonSchema(): string {
  const schema = z.toJSONSchema(manifestSchema, { unrepresentable: 'any', io: 'input' });
  return `${JSON.stringify({ ...schema, title: 'CampusKit project manifest' }, null, 2)}\n`;
}
