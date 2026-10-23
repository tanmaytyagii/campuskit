/**
 * Renders Markdown safely: raw HTML is not rendered and react-markdown removes
 * dangerous URLs. Relative links are resolved by the caller so they become
 * in-app routes (or plain text when there is no page to link to).
 */
import { Check, Copy, ExternalLink } from 'lucide-react';
import { Children, isValidElement, type ReactNode } from 'react';
import Markdown, { type Components } from 'react-markdown';
import { Link } from 'react-router';
import remarkGfm from 'remark-gfm';

import { useCopyToClipboard } from '../hooks/useCopyToClipboard.ts';
import { cn } from '../lib/cn.ts';

export type LinkTarget =
  | { kind: 'internal'; to: string }
  | { kind: 'external'; href: string }
  | { kind: 'text'; note?: string };

interface MarkdownViewProps {
  markdown: string;
  resolveLink?: (href: string) => LinkTarget;
  resolveImage?: (src: string) => string | undefined;
  className?: string;
  /** Moves every heading down this many levels (1 turns # into <h2>). */
  headingOffset?: number;
}

function textOf(node: ReactNode): string {
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(textOf).join('');
  if (isValidElement<{ children?: ReactNode }>(node)) return textOf(node.props.children);
  return '';
}

export function slugifyHeading(node: ReactNode): string {
  return textOf(node)
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s-]/gu, '')
    .trim()
    .replace(/\s+/g, '-');
}

function defaultResolve(href: string): LinkTarget {
  if (/^(https?:|mailto:)/i.test(href)) return { kind: 'external', href };
  if (href.startsWith('#')) return { kind: 'internal', to: href };
  return { kind: 'text' };
}

type HeadingTag = 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6';

/** A code block with a copy button; the code stays selectable and focusable for scrolling. */
function CodeBlock({ children }: { children?: ReactNode }) {
  const { state, copy } = useCopyToClipboard();
  const text = textOf(children).replace(/\n$/, '');
  return (
    <div className="code-block">
      <pre tabIndex={0}>{children}</pre>
      <button
        type="button"
        onClick={() => void copy(text)}
        className="absolute top-2 right-2 inline-flex h-8 items-center gap-1.5 rounded-md bg-white/10 px-2.5 text-xs font-semibold text-code-ink transition-colors hover:bg-white/20"
        aria-label="Copy code"
      >
        {state === 'copied' ? (
          <Check aria-hidden="true" className="size-3.5 text-lime" />
        ) : (
          <Copy aria-hidden="true" className="size-3.5" />
        )}
        <span aria-live="polite">
          {state === 'copied' ? 'Copied' : state === 'failed' ? 'Copy failed' : 'Copy'}
        </span>
      </button>
    </div>
  );
}

/**
 * Renders a Markdown heading `offset` levels lower, so a document shown inside
 * a page with its own <h1> keeps a correct outline. Section headings get ids
 * so links such as `#getting-started` work.
 */
function heading(level: number, offset: number) {
  const Tag = `h${Math.min(6, level + offset)}` as HeadingTag;
  return function Heading({ children }: { children?: ReactNode }) {
    return <Tag id={level > 1 ? slugifyHeading(children) : undefined}>{children}</Tag>;
  };
}

export function MarkdownView({
  markdown,
  resolveLink = defaultResolve,
  resolveImage,
  className,
  headingOffset = 0,
}: MarkdownViewProps) {
  const components: Components = {
    h1: heading(1, headingOffset),
    h2: heading(2, headingOffset),
    h3: heading(3, headingOffset),
    h4: heading(4, headingOffset),
    // Code blocks scroll sideways on small screens, so they must be focusable.
    pre: ({ children }) => <CodeBlock>{children}</CodeBlock>,
    a: ({ href = '', children }) => {
      const target = href.startsWith('#')
        ? ({ kind: 'internal', to: href } as const)
        : resolveLink(href);
      if (target.kind === 'internal') {
        return target.to.startsWith('#') ? (
          <a href={target.to}>{children}</a>
        ) : (
          <Link to={target.to}>{children}</Link>
        );
      }
      if (target.kind === 'external') {
        return (
          <a href={target.href} target="_blank" rel="noopener noreferrer">
            {children}
            <ExternalLink aria-hidden="true" className="ml-0.5 inline size-3.5 align-[-0.1em]" />
            <span className="sr-only"> (opens in a new tab)</span>
          </a>
        );
      }
      return (
        <span className="font-semibold text-ink" title={target.note}>
          {Children.toArray(children)}
        </span>
      );
    },
    img: ({ src, alt }) => {
      const source =
        typeof src === 'string'
          ? resolveImage
            ? resolveImage(src)
            : /^https:/.test(src)
              ? src
              : undefined
          : undefined;
      if (!source) return <span className="text-sm text-ink-3">[Image: {alt}]</span>;
      return <img src={source} alt={alt ?? ''} loading="lazy" />;
    },
  };

  return (
    <div className={cn('prose-ck', className)}>
      <Markdown remarkPlugins={[remarkGfm]} components={components}>
        {markdown}
      </Markdown>
    </div>
  );
}
