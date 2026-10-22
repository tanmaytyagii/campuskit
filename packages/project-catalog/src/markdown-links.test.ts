import { describe, expect, it } from 'vitest';

import { extractMarkdownLinks, isExternalHref, resolveRelativeHref } from './markdown-links.ts';

describe('markdown links', () => {
  it('finds links and images but ignores code', () => {
    const markdown = [
      '# Title',
      'See [the docs](docs/ARCHITECTURE.md) and ![shot](docs/shot.png "Screenshot").',
      'Inline `[not a link](nope.md)` stays ignored.',
      '```md',
      '[also ignored](inside-code.md)',
      '```',
      'External: [site](https://example.com) and <https://example.org>.',
    ].join('\n');
    expect(extractMarkdownLinks(markdown)).toEqual([
      { href: 'docs/ARCHITECTURE.md', line: 2, image: false },
      { href: 'docs/shot.png', line: 2, image: true },
      { href: 'https://example.com', line: 7, image: false },
    ]);
  });

  it('resolves relative links from the linking file', () => {
    expect(resolveRelativeHref('docs/ARCHITECTURE.md', '../README.md')).toBe('README.md');
    expect(resolveRelativeHref('README.md', 'docs/ARCHITECTURE.md#layers')).toBe(
      'docs/ARCHITECTURE.md',
    );
    expect(resolveRelativeHref('README.md', './LICENSE')).toBe('LICENSE');
    expect(resolveRelativeHref('README.md', '../../etc/passwd')).toBe('..');
    expect(resolveRelativeHref('README.md', '#features')).toBeNull();
    expect(resolveRelativeHref('README.md', 'mailto:someone@example.com')).toBeNull();
  });

  it('recognises external links', () => {
    expect(isExternalHref('https://nodejs.org/')).toBe(true);
    expect(isExternalHref('//cdn.example.com/x.js')).toBe(true);
    expect(isExternalHref('docs/x.md')).toBe(false);
  });
});
