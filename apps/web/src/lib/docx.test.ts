import JSZip from 'jszip';
import { describe, expect, it } from 'vitest';

import { documentBody, escapeXml, markdownToDocx } from './docx.ts';

const REPORT = `# Campus <Attendance> & Co

> **Draft started with CampusKit.** Review every section.

**Team:** Riya and Sam
**Guide:** Dr Rao

## 1. Abstract

An app with *emphasis*, ~~old text~~, \`code\` and a [link](https://example.edu/a?b=1&c=2).

## 2. Objectives

1. First
2. Second
   - Nested point

- [x] Done step
- [ ] Open step

| ID | What is tested |
| --- | --- |
| TC-01 | [feature] |

\`\`\`bash
python run.py
\`\`\`
`;

async function unpack(bytes: Uint8Array) {
  const zip = await JSZip.loadAsync(bytes);
  const files: Record<string, string> = {};
  for (const name of Object.keys(zip.files)) {
    const file = zip.file(name);
    if (file) files[name] = await file.async('string');
  }
  return files;
}

function parses(xml: string): boolean {
  const document = new DOMParser().parseFromString(xml, 'application/xml');
  return document.getElementsByTagName('parsererror').length === 0;
}

describe('report export as .docx', () => {
  it('writes a complete package whose every part is well-formed XML', async () => {
    const files = await unpack(
      await markdownToDocx(REPORT, { title: 'Campus <Attendance> & Co', date: '2026-10-30' }),
    );
    expect(Object.keys(files).sort()).toEqual([
      '[Content_Types].xml',
      '_rels/.rels',
      'docProps/app.xml',
      'docProps/core.xml',
      'word/_rels/document.xml.rels',
      'word/document.xml',
      'word/numbering.xml',
      'word/styles.xml',
    ]);
    for (const [name, xml] of Object.entries(files)) expect(parses(xml), name).toBe(true);
    expect(files['docProps/core.xml']).toContain(
      '<dc:title>Campus &lt;Attendance&gt; &amp; Co</dc:title>',
    );
    expect(files['word/_rels/document.xml.rels']).toContain(
      'Target="https://example.edu/a?b=1&amp;c=2" TargetMode="External"',
    );
  });

  it('keeps headings, emphasis, lists, task boxes, tables and code', () => {
    const { body, context } = documentBody(REPORT);
    expect(body).toContain('<w:pStyle w:val="Heading1"/>');
    // “<Attendance>” reads as inline HTML; it is kept as text, escaped.
    expect(body).toContain('<w:t xml:space="preserve">&lt;Attendance&gt;</w:t>');
    expect(body).toContain('<w:pStyle w:val="Quote"/>');
    expect(body).toMatch(/<w:rPr><w:i\/><\/w:rPr><w:t xml:space="preserve">emphasis/);
    expect(body).toMatch(/<w:strike\/>.*old text/);
    expect(body).toMatch(/<w:rStyle w:val="CodeChar"\/>.*code</);
    expect(body).toContain('<w:hyperlink r:id="rLink1">');
    expect(context.links).toEqual(['https://example.edu/a?b=1&c=2']);
    // The numbered list has its own instance; the nested bullet is one level down.
    expect(body).toContain('<w:ilvl w:val="0"/><w:numId w:val="2"/>');
    expect(body).toContain('<w:ilvl w:val="1"/><w:numId w:val="1"/>');
    expect(body).toContain('☑ ');
    expect(body).toContain('☐ ');
    expect(body).toContain('<w:tblHeader/>');
    expect(body).toMatch(/<w:b\/><\/w:rPr><w:t xml:space="preserve">What is tested/);
    expect(body).toContain('<w:pStyle w:val="CodeBlock"/>');
    // The hard line break after the team keeps the guide on its own line.
    expect(body).toMatch(/Riya and Sam<\/w:t><\/w:r><w:r><w:br\/><\/w:r>/);
  });

  it('starts each numbered list at 1', async () => {
    const files = await unpack(
      await markdownToDocx('1. A\n2. B\n\nText\n\n1. C\n', { title: 'Lists', date: '2026-10-30' }),
    );
    expect(files['word/document.xml']).toContain('<w:numId w:val="2"/>');
    expect(files['word/document.xml']).toContain('<w:numId w:val="3"/>');
    expect(files['word/numbering.xml']).toContain(
      '<w:num w:numId="3"><w:abstractNumId w:val="1"/><w:lvlOverride w:ilvl="0"><w:startOverride w:val="1"/>',
    );
  });

  it('drops characters XML can’t hold and never writes links to scripts', () => {
    expect(escapeXml('a\u0000b\u0007c "d"')).toBe('abc &quot;d&quot;');
    const { body, context } = documentBody('[click](javascript:alert(1))');
    expect(context.links).toEqual([]);
    expect(body).not.toContain('hyperlink');
    expect(body).toContain('click');
  });

  it('gives the same file for the same input and date', async () => {
    const first = await markdownToDocx(REPORT, { title: 'Same', date: '2026-10-30' });
    const second = await markdownToDocx(REPORT, { title: 'Same', date: '2026-10-30' });
    expect(Buffer.from(first).equals(Buffer.from(second))).toBe(true);
  });
});
