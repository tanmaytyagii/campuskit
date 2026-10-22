/**
 * Finds relative links in Markdown so documentation references can be
 * checked. Links inside code blocks and inline code are ignored.
 */

export interface MarkdownLink {
  href: string;
  line: number;
  image: boolean;
}

const FENCE = /^(\s*)(```|~~~)/;

/** Removes inline code spans while keeping line positions intact. */
function stripInlineCode(line: string): string {
  return line.replace(/`[^`]*`/g, (match) => ' '.repeat(match.length));
}

export function extractMarkdownLinks(markdown: string): MarkdownLink[] {
  const links: MarkdownLink[] = [];
  let inFence = false;
  markdown.split(/\r?\n/).forEach((rawLine, index) => {
    if (FENCE.test(rawLine)) {
      inFence = !inFence;
      return;
    }
    if (inFence) return;
    const line = stripInlineCode(rawLine);
    for (const match of line.matchAll(/(!?)\[[^\]]*\]\(\s*<?([^)\s>]+)>?(?:\s+"[^"]*")?\s*\)/g)) {
      links.push({ href: match[2] ?? '', line: index + 1, image: match[1] === '!' });
    }
  });
  return links;
}

export function isExternalHref(href: string): boolean {
  return /^[a-z][a-z0-9+.-]*:/i.test(href) || href.startsWith('//');
}

/**
 * Resolves `href` relative to the Markdown file at `fromPath` (both POSIX,
 * relative to the template root). Returns null for external links, pure
 * anchors and links that escape the root.
 */
export function resolveRelativeHref(fromPath: string, href: string): string | null {
  if (isExternalHref(href) || href.startsWith('#')) return null;
  const target = decodeURI(href.split('#')[0]?.split('?')[0] ?? '');
  if (!target) return null;
  const base = fromPath.includes('/')
    ? fromPath.slice(0, fromPath.lastIndexOf('/')).split('/')
    : [];
  const parts = target.startsWith('/') ? [] : [...base];
  for (const segment of target.split('/')) {
    if (segment === '' || segment === '.') continue;
    if (segment === '..') {
      if (parts.length === 0) return '..';
      parts.pop();
    } else {
      parts.push(segment);
    }
  }
  return parts.join('/');
}
