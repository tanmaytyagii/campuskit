import { describe, expect, it } from 'vitest';

import {
  escapeFor,
  escapeHtml,
  escapeJsonString,
  escapeMarkdown,
  escapeTomlString,
} from './escape.ts';

describe('escapers', () => {
  const tricky = `Riya & Sam's <Attendance> "App" *v2* [beta] #1 \\ path`;

  it('escapes HTML special characters', () => {
    expect(escapeHtml(tricky)).toBe(
      'Riya &amp; Sam&#39;s &lt;Attendance&gt; &quot;App&quot; *v2* [beta] #1 \\ path',
    );
    expect(escapeHtml('<script>alert(1)</script>')).not.toContain('<script>');
  });

  it('escapes Markdown syntax but leaves ordinary punctuation alone', () => {
    expect(escapeMarkdown('My App (2026), v1.0!')).toBe('My App (2026), v1.0!');
    expect(escapeMarkdown('*v2* [beta] #1 <b> a|b ~x~ `x` _y_ & \\')).toBe(
      '\\*v2\\* \\[beta\\] \\#1 \\<b\\> a\\|b \\~x\\~ \\`x\\` \\_y\\_ \\& \\\\',
    );
  });

  it('escapes TOML basic strings', () => {
    expect(escapeTomlString('a "quoted" \\ value')).toBe('a \\"quoted\\" \\\\ value');
    expect(escapeTomlString('tab\there')).toBe('tab\\u0009here');
  });

  it('escapes JSON string content', () => {
    expect(escapeJsonString('say "hi"\n')).toBe('say \\"hi\\"\\n');
  });

  it('passes Unicode through every escaper unchanged', () => {
    const unicode = 'उपस्थिति प्रबंधन · தமிழ் · Ünïcödé · 出席 · 🎓';
    for (const context of ['none', 'html', 'markdown', 'toml-string', 'json-string'] as const) {
      expect(escapeFor(context, unicode)).toBe(unicode);
    }
  });
});
