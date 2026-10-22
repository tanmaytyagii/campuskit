/**
 * Adds a Content Security Policy to the built index.html.
 *
 * CampusKit is a static site, often hosted where custom HTTP headers are not
 * available (GitHub Pages), so the policy is a <meta> tag. It only allows
 * scripts from the site itself plus the one inline script in index.html (by
 * its SHA-256 hash), and forbids plugins, framing tricks via <base>, and form
 * submissions elsewhere. The dev server is left alone because Vite's hot
 * reloading relies on inline scripts.
 */
import { createHash } from 'node:crypto';

import type { Plugin } from 'vite';

const INLINE_SCRIPT = /<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/g;

export function buildPolicy(inlineScripts: string[]): string {
  const hashes = inlineScripts.map(
    (body) => `'sha256-${createHash('sha256').update(body, 'utf8').digest('base64')}'`,
  );
  return [
    "default-src 'self'",
    `script-src 'self' ${hashes.join(' ')}`.trim(),
    // React sets a few inline style attributes (colour swatches).
    "style-src 'self' 'unsafe-inline'",
    // Source images in the file viewer are shown as data: URLs.
    "img-src 'self' data: blob:",
    "font-src 'self' data:",
    "connect-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join('; ');
}

export function contentSecurityPolicy(): Plugin {
  return {
    name: 'campuskit-content-security-policy',
    apply: 'build',
    transformIndexHtml: {
      order: 'post',
      handler(html) {
        const scripts = [...html.matchAll(INLINE_SCRIPT)].map((match) => match[1] ?? '');
        const meta = `<meta http-equiv="Content-Security-Policy" content="${buildPolicy(scripts)}" />`;
        if (!/<meta charset="UTF-8" \/>/.test(html))
          throw new Error('index.html must start its <head> with <meta charset="UTF-8" />');
        return html.replace(/<meta charset="UTF-8" \/>/, (charset) => `${charset}\n    ${meta}`);
      },
    },
  };
}
