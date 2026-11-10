import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import { onlineOnlyChunks, shellFiles } from '../apps/web/vite-plugins/service-worker.ts';

describe('service worker build', () => {
  it('stores the page, scripts, styles, modern fonts, the manifest and icons, nothing else', () => {
    expect(
      shellFiles([
        'index.html',
        'manifest.webmanifest',
        'favicon.svg',
        'icons/icon-192.png',
        'assets/index-abc.js',
        'assets/index-abc.css',
        'assets/archivo-latin.woff2',
        'assets/archivo-latin.woff',
        'assets/home-screenshot.png',
        'template-bundles/expense-tracker.123.json',
        'licenses/third-party.md',
      ]),
    ).toEqual([
      'index.html',
      'manifest.webmanifest',
      'favicon.svg',
      'icons/icon-192.png',
      'assets/index-abc.js',
      'assets/index-abc.css',
      'assets/archivo-latin.woff2',
    ]);
  });

  it('keeps the placeholders the build fills, and only handles this site’s GET requests', () => {
    const source = readFileSync(
      new URL('../apps/web/src/sw/service-worker.js', import.meta.url),
      'utf8',
    );
    for (const line of [
      "const VERSION = '__VERSION__';",
      'const SHELL = __SHELL__;',
      'const ASSETS = __ASSETS__;',
      'const TEMPLATES = __TEMPLATES__;',
    ])
      expect(source).toContain(line);
    expect(source).toContain("if (request.method !== 'GET') return;");
    expect(source).toContain('if (url.origin !== self.location.origin');
    // Responses are stored only when they are this site's own (type "basic") and successful.
    expect(source).toContain("response.ok && response.type === 'basic'");
    // Stored copies must match module-script requests, which carry an Origin header that a
    // server may vary on (vite preview does); found by the offline browser test.
    expect(source).toContain('const MATCH = { ignoreVary: true };');
  });

  it('leaves the AI assistant’s SDK chunk out of the shell, but never a chunk with CampusKit code', () => {
    const pnpm = '/repo/node_modules/.pnpm/@anthropic-ai+sdk@1.3.0/node_modules/@anthropic-ai/sdk/';
    const online = onlineOnlyChunks([
      {
        fileName: 'assets/sdk-1.js',
        moduleIds: [
          `${pnpm}client.mjs`,
          '/repo/node_modules/.pnpm/x/node_modules/@opentelemetry/api/a.mjs',
        ],
      },
      {
        fileName: 'assets/AssistantPage-1.js',
        moduleIds: ['/repo/apps/web/src/lib/ai.ts', `${pnpm}x.mjs`],
      },
      { fileName: 'assets/jszip-1.js', moduleIds: ['/repo/node_modules/jszip/dist/jszip.min.js'] },
    ]);
    expect([...online]).toEqual(['assets/sdk-1.js']);
    expect(shellFiles(['index.html', 'assets/sdk-1.js', 'assets/jszip-1.js'], online)).toEqual([
      'index.html',
      'assets/jszip-1.js',
    ]);
  });
});
