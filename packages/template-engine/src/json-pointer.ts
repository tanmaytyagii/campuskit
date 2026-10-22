/**
 * Minimal RFC 6901 JSON Pointer support for `json-set` edits.
 *
 * Pointers may only address values that already exist in the template file:
 * edits replace values, they never invent new structure.
 */

export class JsonPointerError extends Error {
  constructor(pointer: string, reason: string) {
    super(`JSON Pointer "${pointer}": ${reason}`);
    this.name = 'JsonPointerError';
  }
}

export function parsePointer(pointer: string): string[] {
  if (!pointer.startsWith('/')) throw new JsonPointerError(pointer, 'must start with "/"');
  return pointer
    .slice(1)
    .split('/')
    .map((token) => token.replace(/~1/g, '/').replace(/~0/g, '~'));
}

type Json = null | boolean | number | string | Json[] | { [key: string]: Json };

function isContainer(value: Json): value is Json[] | { [key: string]: Json } {
  return typeof value === 'object' && value !== null;
}

function step(container: Json, token: string, pointer: string): Json {
  if (!isContainer(container))
    throw new JsonPointerError(pointer, `cannot descend into a ${typeof container}`);
  if (Array.isArray(container)) {
    if (!/^(0|[1-9]\d*)$/.test(token))
      throw new JsonPointerError(pointer, `"${token}" is not an array index`);
    const item = container[Number(token)];
    if (item === undefined) throw new JsonPointerError(pointer, `index ${token} does not exist`);
    return item;
  }
  if (!Object.prototype.hasOwnProperty.call(container, token)) {
    throw new JsonPointerError(pointer, `key "${token}" does not exist`);
  }
  return container[token] as Json;
}

export function getAtPointer(document: unknown, pointer: string): unknown {
  let current = document as Json;
  for (const token of parsePointer(pointer)) current = step(current, token, pointer);
  return current;
}

/** Replaces the existing value at `pointer`, mutating `document`. */
export function setAtPointer(document: unknown, pointer: string, value: unknown): void {
  const tokens = parsePointer(pointer);
  const last = tokens.pop();
  if (last === undefined) throw new JsonPointerError(pointer, 'cannot replace the document root');

  let parent = document as Json;
  for (const token of tokens) parent = step(parent, token, pointer);
  // Validate the target exists (throws with a helpful message otherwise).
  step(parent, last, pointer);

  if (Array.isArray(parent)) parent[Number(last)] = value as Json;
  else if (isContainer(parent)) parent[last] = value as Json;
}

/** True when `source` is already in the format the engine writes back. */
export function isCanonicalJson(source: string): boolean {
  try {
    return formatJson(JSON.parse(source)) === source;
  } catch {
    return false;
  }
}

export function formatJson(value: unknown): string {
  return `${JSON.stringify(value, null, 2)}\n`;
}
