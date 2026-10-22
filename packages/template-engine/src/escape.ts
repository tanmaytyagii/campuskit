/**
 * Context-aware escaping for values inserted by `replace` edits.
 *
 * A project name such as `Riya & Sam's <Attendance> "App"` must appear as
 * literal text wherever it is inserted. Each escaper turns the raw value into
 * the representation that renders as exactly that text in its file type.
 */

export const ESCAPE_CONTEXTS = ['none', 'html', 'markdown', 'toml-string', 'json-string'] as const;
export type EscapeContext = (typeof ESCAPE_CONTEXTS)[number];

const HTML_ENTITIES: Readonly<Record<string, string>> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};

/** Escapes text for HTML element content and quoted attribute values. */
export function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (char) => HTML_ENTITIES[char] ?? char);
}

/**
 * Escapes text so CommonMark/GitHub Markdown renders it literally.
 *
 * Only characters that can start inline syntax are escaped, so ordinary names
 * stay readable in a plain text editor ("My App (2026)" is left untouched).
 */
export function escapeMarkdown(value: string): string {
  return value.replace(/[\\`*_[\]<>|&#~]/g, (char) => `\\${char}`);
}

/** Escapes text for the inside of a TOML basic string ("..."). */
export function escapeTomlString(value: string): string {
  let out = '';
  for (const char of value) {
    const code = char.codePointAt(0) ?? 0;
    if (char === '\\') out += '\\\\';
    else if (char === '"') out += '\\"';
    else if (code < 0x20 || code === 0x7f) out += `\\u${code.toString(16).padStart(4, '0')}`;
    else out += char;
  }
  return out;
}

/** Escapes text for the inside of a JSON string literal (without the quotes). */
export function escapeJsonString(value: string): string {
  return JSON.stringify(value).slice(1, -1);
}

export function escapeFor(context: EscapeContext, value: string): string {
  switch (context) {
    case 'none':
      return value;
    case 'html':
      return escapeHtml(value);
    case 'markdown':
      return escapeMarkdown(value);
    case 'toml-string':
      return escapeTomlString(value);
    case 'json-string':
      return escapeJsonString(value);
  }
}
