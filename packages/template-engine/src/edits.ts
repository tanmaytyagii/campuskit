/**
 * Applies a template's declared edits to its files.
 *
 * Two kinds of edit exist:
 *  - `json-set` replaces one existing value inside a JSON file, keeping JSON
 *    escaping and value types correct by construction;
 *  - `replace` swaps an exact piece of text for an escaped value and checks
 *    that the text occurs exactly as often as the template author declared.
 *
 * All `replace` matches in a file are located in the *original* text before
 * anything is written, so a value inserted by one edit can never be matched
 * and rewritten by another.
 */
import { escapeFor } from './escape.ts';
import { formatJson, getAtPointer, setAtPointer } from './json-pointer.ts';
import type { OptionValue, ResolvedValues } from './options.ts';
import type { JsonSetEdit, ReplaceEdit, TemplateEdit, ValueRef } from './spec.ts';

export interface WorkingFile {
  path: string;
  encoding: 'utf8' | 'base64';
  /** UTF-8 text for text files, base64 for binary files. */
  content: string;
}

export interface AppliedEdit {
  label: string;
  file: string;
  kind: TemplateEdit['kind'];
  /** How many places in the file were changed. */
  occurrences: number;
  /** The value written, before escaping (for review screens and reports). */
  value: OptionValue;
}

export class TemplateEditError extends Error {
  readonly file: string;

  constructor(file: string, label: string, reason: string) {
    super(`Could not apply "${label}" to ${file}: ${reason}`);
    this.name = 'TemplateEditError';
    this.file = file;
  }
}

/**
 * The text a `replace` edit writes. Values typed by the student are escaped
 * for the file type; `map` and `whenEmpty` texts come from the manifest and are
 * written exactly as declared (they may deliberately contain Markdown).
 */
export function replacementText(edit: ReplaceEdit, values: ResolvedValues): string {
  const raw =
    edit.value.option === 'projectSlug' ? values.projectSlug : values.options[edit.value.option];
  if (edit.value.map) return resolveValueRef(edit.value, values) as string;
  if (typeof raw === 'string' && raw.length === 0 && edit.value.whenEmpty !== undefined)
    return edit.value.whenEmpty;
  return escapeFor(edit.escape, String(resolveValueRef(edit.value, values)));
}

export function resolveValueRef(ref: ValueRef, values: ResolvedValues): OptionValue {
  const raw: OptionValue | undefined =
    ref.option === 'projectSlug' ? values.projectSlug : values.options[ref.option];
  if (raw === undefined) throw new Error(`No value for option "${ref.option}"`);
  if (ref.map) {
    const mapped = ref.map[String(raw)];
    if (mapped === undefined)
      throw new Error(`No mapping for value "${String(raw)}" of "${ref.option}"`);
    return mapped;
  }
  if (typeof raw === 'string' && raw.length === 0 && ref.whenEmpty !== undefined)
    return ref.whenEmpty;
  return raw;
}

function countOccurrences(text: string, needle: string): number[] {
  const positions: number[] = [];
  let index = text.indexOf(needle);
  while (index !== -1) {
    positions.push(index);
    index = text.indexOf(needle, index + needle.length);
  }
  return positions;
}

function applyJsonEdits(
  file: WorkingFile,
  edits: JsonSetEdit[],
  values: ResolvedValues,
): AppliedEdit[] {
  let document: unknown;
  try {
    document = JSON.parse(file.content);
  } catch (error) {
    const first = edits[0];
    throw new TemplateEditError(
      file.path,
      first?.label ?? 'json-set',
      `the file is not valid JSON (${String(error)})`,
    );
  }

  const applied: AppliedEdit[] = [];
  for (const edit of edits) {
    const value = resolveValueRef(edit.value, values);
    let current: unknown;
    try {
      current = getAtPointer(document, edit.pointer);
    } catch (error) {
      throw new TemplateEditError(
        file.path,
        edit.label,
        error instanceof Error ? error.message : String(error),
      );
    }
    if (typeof current !== typeof value) {
      throw new TemplateEditError(
        file.path,
        edit.label,
        `the template has a ${typeof current} at ${edit.pointer} but the option provides a ${typeof value}`,
      );
    }
    setAtPointer(document, edit.pointer, value);
    applied.push({ label: edit.label, file: file.path, kind: edit.kind, occurrences: 1, value });
  }
  file.content = formatJson(document);
  return applied;
}

function applyReplaceEdits(
  file: WorkingFile,
  edits: ReplaceEdit[],
  values: ResolvedValues,
): AppliedEdit[] {
  const original = file.content;
  const splices: Array<{ start: number; end: number; text: string }> = [];
  const applied: AppliedEdit[] = [];

  for (const edit of edits) {
    const positions = countOccurrences(original, edit.find);
    if (positions.length !== edit.expectedCount) {
      throw new TemplateEditError(
        file.path,
        edit.label,
        `expected "${edit.find}" ${edit.expectedCount} time(s) but found it ${positions.length} time(s)`,
      );
    }
    const value = resolveValueRef(edit.value, values);
    const text = replacementText(edit, values);
    for (const start of positions) splices.push({ start, end: start + edit.find.length, text });
    applied.push({
      label: edit.label,
      file: file.path,
      kind: edit.kind,
      occurrences: positions.length,
      value,
    });
  }

  splices.sort((a, b) => a.start - b.start);
  for (let index = 1; index < splices.length; index += 1) {
    const previous = splices[index - 1];
    const current = splices[index];
    if (previous && current && current.start < previous.end) {
      throw new TemplateEditError(
        file.path,
        edits[0]?.label ?? 'replace',
        'two edits target overlapping text',
      );
    }
  }

  let output = '';
  let cursor = 0;
  for (const splice of splices) {
    output += original.slice(cursor, splice.start) + splice.text;
    cursor = splice.end;
  }
  output += original.slice(cursor);
  file.content = output;
  return applied;
}

/**
 * Applies `edits` to `files` in place and returns a report of what changed.
 * Throws `TemplateEditError` if a declared location no longer matches the
 * template, which means the template and its manifest have drifted apart.
 */
export function applyEdits(
  files: Map<string, WorkingFile>,
  edits: readonly TemplateEdit[],
  values: ResolvedValues,
): AppliedEdit[] {
  const byFile = new Map<string, TemplateEdit[]>();
  for (const edit of edits) {
    const list = byFile.get(edit.file) ?? [];
    list.push(edit);
    byFile.set(edit.file, list);
  }

  const report: AppliedEdit[] = [];
  for (const [path, fileEdits] of byFile) {
    const file = files.get(path);
    const firstLabel = fileEdits[0]?.label ?? 'edit';
    if (!file)
      throw new TemplateEditError(path, firstLabel, 'the file is not part of the template');
    if (file.encoding !== 'utf8')
      throw new TemplateEditError(path, firstLabel, 'binary files cannot be edited');

    const jsonEdits = fileEdits.filter((edit): edit is JsonSetEdit => edit.kind === 'json-set');
    const replaceEdits = fileEdits.filter((edit): edit is ReplaceEdit => edit.kind === 'replace');
    if (jsonEdits.length > 0 && replaceEdits.length > 0) {
      throw new TemplateEditError(path, firstLabel, 'a file cannot mix json-set and replace edits');
    }
    report.push(
      ...(jsonEdits.length > 0
        ? applyJsonEdits(file, jsonEdits, values)
        : applyReplaceEdits(file, replaceEdits, values)),
    );
  }
  return report;
}
