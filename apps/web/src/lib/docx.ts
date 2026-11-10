/**
 * A Word document (.docx) made from the report's Markdown, in the browser. The Markdown is parsed
 * with remark (as the preview is) and written as WordprocessingML: headings, paragraphs, bold,
 * italic and code, links, bulleted, numbered and task lists, block quotes, code blocks and tables.
 * Word, LibreOffice and Google Docs open the file, and the student keeps editing it there.
 */
import JSZip from 'jszip';
import type {
  BlockContent,
  DefinitionContent,
  List,
  ListItem,
  PhrasingContent,
  RootContent,
  Table,
} from 'mdast';
import remarkGfm from 'remark-gfm';
import remarkParse from 'remark-parse';
import { unified } from 'unified';

export const DOCX_MIME_TYPE =
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

/** Characters XML 1.0 doesn't allow (control characters other than tab and line breaks). */
// eslint-disable-next-line no-control-regex -- removing these characters is the point
const INVALID_XML = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\uFFFE\uFFFF]/g;

export function escapeXml(text: string): string {
  return text
    .replace(INVALID_XML, '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

interface RunStyle {
  bold?: boolean;
  italic?: boolean;
  strike?: boolean;
  code?: boolean;
  link?: boolean;
}

interface Context {
  /** External links, each with its relationship id. */
  links: string[];
  /** Numbering instances: one per numbered list, so each starts at 1. */
  numbered: number;
}

const W = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main';
const R = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships';
const BULLET_LIST = 1;
/** Numbered lists use ids from 2 up; each gets its own instance so it restarts at 1. */
const FIRST_NUMBERED = 2;

function runProperties(style: RunStyle): string {
  const parts = [
    style.code ? '<w:rStyle w:val="CodeChar"/>' : '',
    style.link ? '<w:rStyle w:val="Hyperlink"/>' : '',
    style.bold ? '<w:b/>' : '',
    style.italic ? '<w:i/>' : '',
    style.strike ? '<w:strike/>' : '',
  ].join('');
  return parts ? `<w:rPr>${parts}</w:rPr>` : '';
}

function textRun(text: string, style: RunStyle): string {
  // Tabs and line breaks inside text become their own elements, as Word expects.
  return text
    .split('\n')
    .map((line, index) => {
      const pieces = line
        .split('\t')
        .map((piece) => (piece ? `<w:t xml:space="preserve">${escapeXml(piece)}</w:t>` : ''))
        .join('<w:tab/>');
      return `${index > 0 ? '<w:br/>' : ''}${pieces}`;
    })
    .map((content) => `<w:r>${runProperties(style)}${content}</w:r>`)
    .join('');
}

function inline(nodes: readonly PhrasingContent[], style: RunStyle, context: Context): string {
  return nodes
    .map((node) => {
      switch (node.type) {
        case 'text':
          return textRun(node.value, style);
        case 'strong':
          return inline(node.children, { ...style, bold: true }, context);
        case 'emphasis':
          return inline(node.children, { ...style, italic: true }, context);
        case 'delete':
          return inline(node.children, { ...style, strike: true }, context);
        case 'inlineCode':
          return textRun(node.value, { ...style, code: true });
        case 'break':
          return '<w:r><w:br/></w:r>';
        case 'link': {
          const content = inline(node.children, { ...style, link: true }, context);
          if (!/^(https?:|mailto:)/i.test(node.url)) return content;
          context.links.push(node.url);
          return `<w:hyperlink r:id="rLink${context.links.length}">${content}</w:hyperlink>`;
        }
        case 'image':
          return textRun(`[${node.alt ?? 'image'}]`, style);
        case 'html':
          return textRun(node.value, style);
        // Reference-style links and footnotes: their text, without the reference.
        case 'linkReference':
          return inline(node.children, style, context);
        case 'imageReference':
          return textRun(`[${node.alt ?? 'image'}]`, style);
        case 'footnoteReference':
          return textRun(`[${node.identifier}]`, style);
      }
    })
    .join('');
}

function paragraph(content: string, properties = ''): string {
  return `<w:p>${properties ? `<w:pPr>${properties}</w:pPr>` : ''}${content}</w:p>`;
}

const styleProperty = (id: string) => `<w:pStyle w:val="${id}"/>`;

function list(node: List, depth: number, context: Context, quote: boolean): string {
  let numId = BULLET_LIST;
  if (node.ordered) {
    numId = FIRST_NUMBERED + context.numbered;
    context.numbered += 1;
  }
  return node.children.map((item) => listItem(item, numId, depth, context, quote)).join('');
}

function listItem(
  item: ListItem,
  numId: number,
  depth: number,
  context: Context,
  quote: boolean,
): string {
  const level = Math.min(depth, 8);
  // A task list item's box is written as a character, so it survives in every editor.
  const box = item.checked === true ? '☑ ' : item.checked === false ? '☐ ' : '';
  let first = true;
  return item.children
    .map((child) => {
      if (child.type === 'list') return list(child, depth + 1, context, quote);
      if (child.type === 'paragraph' && first) {
        first = false;
        return paragraph(
          `${box ? textRun(box, {}) : ''}${inline(child.children, {}, context)}`,
          `${styleProperty(quote ? 'Quote' : 'ListParagraph')}<w:numPr><w:ilvl w:val="${level}"/><w:numId w:val="${numId}"/></w:numPr>`,
        );
      }
      return block(child, context, { depth: depth + 1, quote, indent: true });
    })
    .join('');
}

function table(node: Table, context: Context): string {
  const columns = Math.max(...node.children.map((row) => row.children.length), 1);
  const rows = node.children
    .map((row, rowIndex) => {
      const cells = Array.from({ length: columns }, (_, index) => {
        const cell = row.children[index];
        const content = inline(cell?.children ?? [], { bold: rowIndex === 0 }, context);
        return `<w:tc><w:tcPr><w:tcW w:w="0" w:type="auto"/></w:tcPr>${paragraph(content, styleProperty('TableText'))}</w:tc>`;
      }).join('');
      const header = rowIndex === 0 ? '<w:trPr><w:tblHeader/></w:trPr>' : '';
      return `<w:tr>${header}${cells}</w:tr>`;
    })
    .join('');
  const grid = Array.from({ length: columns }, () => '<w:gridCol/>').join('');
  return `<w:tbl><w:tblPr><w:tblStyle w:val="ReportTable"/><w:tblW w:w="5000" w:type="pct"/></w:tblPr><w:tblGrid>${grid}</w:tblGrid>${rows}</w:tbl>${paragraph('')}`;
}

type Block = BlockContent | DefinitionContent;

/** The block-level nodes, as the document's top level holds them. */
function isBlock(node: RootContent): node is Block {
  return [
    'blockquote',
    'code',
    'heading',
    'html',
    'list',
    'paragraph',
    'table',
    'thematicBreak',
    'definition',
    'footnoteDefinition',
  ].includes(node.type);
}

function block(
  node: Block,
  context: Context,
  options: { depth: number; quote: boolean; indent: boolean },
): string {
  const quoted = options.quote ? styleProperty('Quote') : '';
  const indent = options.indent && !options.quote ? '<w:ind w:left="720"/>' : '';
  switch (node.type) {
    case 'heading':
      return paragraph(
        inline(node.children, {}, context),
        styleProperty(`Heading${Math.min(node.depth, 4)}`),
      );
    case 'paragraph':
      return paragraph(inline(node.children, {}, context), `${quoted}${indent}`);
    case 'list':
      return list(node, options.depth, context, options.quote);
    case 'blockquote':
      return node.children
        .map((child) => block(child, context, { ...options, quote: true }))
        .join('');
    case 'code':
      return paragraph(textRun(node.value, {}), styleProperty('CodeBlock'));
    case 'table':
      return table(node, context);
    case 'thematicBreak':
      return paragraph(
        '',
        '<w:pBdr><w:bottom w:val="single" w:sz="6" w:space="1" w:color="999999"/></w:pBdr>',
      );
    case 'html':
      return paragraph(textRun(node.value, {}), quoted);
    // A link definition only gives a reference its address; it isn't shown.
    case 'definition':
      return '';
    case 'footnoteDefinition':
      return node.children.map((child) => block(child, context, options)).join('');
  }
}

const STYLES = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="${W}">
<w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="Calibri" w:hAnsi="Calibri" w:eastAsia="Calibri" w:cs="Calibri"/><w:sz w:val="22"/><w:szCs w:val="22"/><w:lang w:val="en-GB"/></w:rPr></w:rPrDefault><w:pPrDefault><w:pPr><w:spacing w:after="120" w:line="276" w:lineRule="auto"/></w:pPr></w:pPrDefault></w:docDefaults>
<w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/><w:qFormat/></w:style>
<w:style w:type="paragraph" w:styleId="Heading1"><w:name w:val="heading 1"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:qFormat/><w:pPr><w:keepNext/><w:spacing w:before="360" w:after="160"/><w:outlineLvl w:val="0"/></w:pPr><w:rPr><w:b/><w:sz w:val="36"/><w:szCs w:val="36"/></w:rPr></w:style>
<w:style w:type="paragraph" w:styleId="Heading2"><w:name w:val="heading 2"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:qFormat/><w:pPr><w:keepNext/><w:spacing w:before="320" w:after="120"/><w:outlineLvl w:val="1"/></w:pPr><w:rPr><w:b/><w:sz w:val="30"/><w:szCs w:val="30"/></w:rPr></w:style>
<w:style w:type="paragraph" w:styleId="Heading3"><w:name w:val="heading 3"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:qFormat/><w:pPr><w:keepNext/><w:spacing w:before="240" w:after="100"/><w:outlineLvl w:val="2"/></w:pPr><w:rPr><w:b/><w:sz w:val="26"/><w:szCs w:val="26"/></w:rPr></w:style>
<w:style w:type="paragraph" w:styleId="Heading4"><w:name w:val="heading 4"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:qFormat/><w:pPr><w:keepNext/><w:spacing w:before="200" w:after="80"/><w:outlineLvl w:val="3"/></w:pPr><w:rPr><w:b/><w:i/><w:sz w:val="24"/><w:szCs w:val="24"/></w:rPr></w:style>
<w:style w:type="paragraph" w:styleId="ListParagraph"><w:name w:val="List Paragraph"/><w:basedOn w:val="Normal"/><w:qFormat/><w:pPr><w:spacing w:after="60"/><w:contextualSpacing/></w:pPr></w:style>
<w:style w:type="paragraph" w:styleId="Quote"><w:name w:val="Quote"/><w:basedOn w:val="Normal"/><w:qFormat/><w:pPr><w:ind w:left="720"/><w:pBdr><w:left w:val="single" w:sz="12" w:space="8" w:color="7C7C7C"/></w:pBdr></w:pPr><w:rPr><w:i/></w:rPr></w:style>
<w:style w:type="paragraph" w:styleId="CodeBlock"><w:name w:val="Code Block"/><w:basedOn w:val="Normal"/><w:pPr><w:shd w:val="clear" w:color="auto" w:fill="F2F2F2"/><w:spacing w:after="160" w:line="240" w:lineRule="auto"/></w:pPr><w:rPr><w:rFonts w:ascii="Consolas" w:hAnsi="Consolas" w:cs="Consolas"/><w:sz w:val="20"/></w:rPr></w:style>
<w:style w:type="paragraph" w:styleId="TableText"><w:name w:val="Table Text"/><w:basedOn w:val="Normal"/><w:pPr><w:spacing w:after="0"/></w:pPr></w:style>
<w:style w:type="character" w:styleId="CodeChar"><w:name w:val="Code"/><w:rPr><w:rFonts w:ascii="Consolas" w:hAnsi="Consolas" w:cs="Consolas"/><w:sz w:val="20"/></w:rPr></w:style>
<w:style w:type="character" w:styleId="Hyperlink"><w:name w:val="Hyperlink"/><w:rPr><w:color w:val="1F4E9E"/><w:u w:val="single"/></w:rPr></w:style>
<w:style w:type="table" w:styleId="ReportTable"><w:name w:val="Report Table"/><w:tblPr><w:tblBorders><w:top w:val="single" w:sz="4" w:color="999999"/><w:left w:val="single" w:sz="4" w:color="999999"/><w:bottom w:val="single" w:sz="4" w:color="999999"/><w:right w:val="single" w:sz="4" w:color="999999"/><w:insideH w:val="single" w:sz="4" w:color="999999"/><w:insideV w:val="single" w:sz="4" w:color="999999"/></w:tblBorders><w:tblCellMar><w:top w:w="60" w:type="dxa"/><w:left w:w="100" w:type="dxa"/><w:bottom w:w="60" w:type="dxa"/><w:right w:w="100" w:type="dxa"/></w:tblCellMar></w:tblPr></w:style>
</w:styles>`;

function numbering(numberedLists: number): string {
  const levels = (format: 'bullet' | 'decimal') =>
    Array.from({ length: 9 }, (_, level) => {
      const text = format === 'bullet' ? ['•', '◦', '▪'][level % 3] : `%${level + 1}.`;
      return `<w:lvl w:ilvl="${level}"><w:start w:val="1"/><w:numFmt w:val="${format}"/><w:lvlText w:val="${text}"/><w:lvlJc w:val="left"/><w:pPr><w:ind w:left="${720 * (level + 1)}" w:hanging="360"/></w:pPr></w:lvl>`;
    }).join('');
  const instances = Array.from(
    { length: numberedLists },
    (_, index) =>
      `<w:num w:numId="${FIRST_NUMBERED + index}"><w:abstractNumId w:val="1"/><w:lvlOverride w:ilvl="0"><w:startOverride w:val="1"/></w:lvlOverride></w:num>`,
  ).join('');
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:numbering xmlns:w="${W}"><w:abstractNum w:abstractNumId="0"><w:multiLevelType w:val="hybridMultilevel"/>${levels('bullet')}</w:abstractNum><w:abstractNum w:abstractNumId="1"><w:multiLevelType w:val="hybridMultilevel"/>${levels('decimal')}</w:abstractNum><w:num w:numId="${BULLET_LIST}"><w:abstractNumId w:val="0"/></w:num>${instances}</w:numbering>`;
}

/** The body of document.xml for the Markdown, and what it refers to. */
export function documentBody(markdown: string): { body: string; context: Context } {
  const tree = unified().use(remarkParse).use(remarkGfm).parse(markdown);
  const context: Context = { links: [], numbered: 0 };
  const body = tree.children
    .filter(isBlock)
    .map((node) => block(node, context, { depth: 0, quote: false, indent: false }))
    .join('');
  return { body, context };
}

/**
 * The .docx file for the Markdown. `date` (YYYY-MM-DD) is recorded as when the document was
 * made and used for the archive's timestamps, so the same input gives the same file.
 */
export async function markdownToDocx(
  markdown: string,
  { title, date }: { title: string; date: string },
): Promise<Uint8Array> {
  const { body, context } = documentBody(markdown);
  const page =
    '<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440" w:header="708" w:footer="708" w:gutter="0"/></w:sectPr>';
  const document = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="${W}" xmlns:r="${R}"><w:body>${body}${page}</w:body></w:document>`;
  const links = context.links
    .map(
      (url, index) =>
        `<Relationship Id="rLink${index + 1}" Type="${R}/hyperlink" Target="${escapeXml(url)}" TargetMode="External"/>`,
    )
    .join('');
  const timestamp = `${date}T00:00:00Z`;
  const files: Record<string, string> = {
    '[Content_Types].xml': `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/><Override PartName="/word/numbering.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.numbering+xml"/><Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/><Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/></Types>`,
    '_rels/.rels': `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="${R}/officeDocument" Target="word/document.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/><Relationship Id="rId3" Type="${R}/extended-properties" Target="docProps/app.xml"/></Relationships>`,
    'word/_rels/document.xml.rels': `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="${R}/styles" Target="styles.xml"/><Relationship Id="rId2" Type="${R}/numbering" Target="numbering.xml"/>${links}</Relationships>`,
    'word/document.xml': document,
    'word/styles.xml': STYLES,
    'word/numbering.xml': numbering(context.numbered),
    'docProps/core.xml': `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"><dc:title>${escapeXml(title)}</dc:title><dcterms:created xsi:type="dcterms:W3CDTF">${timestamp}</dcterms:created><dcterms:modified xsi:type="dcterms:W3CDTF">${timestamp}</dcterms:modified></cp:coreProperties>`,
    'docProps/app.xml': `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties"><Application>CampusKit</Application></Properties>`,
  };
  const zip = new JSZip();
  const [year, month, day] = date.split('-').map(Number) as [number, number, number];
  const zipDate = new Date(year, month - 1, day, 12);
  // [Content_Types].xml first, as some readers expect.
  for (const [path, content] of Object.entries(files))
    zip.file(path, content, { date: zipDate, compression: 'DEFLATE' });
  return zip.generateAsync({ type: 'uint8array', mimeType: DOCX_MIME_TYPE });
}
