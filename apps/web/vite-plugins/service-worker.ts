/**
 * Writes sw.js into the build from src/sw/service-worker.js, with this build's files: the app
 * shell to store when the worker installs (index.html, scripts, styles, woff2 fonts, the web app
 * manifest and icons), every hashed asset (to prune old ones), the template bundles (cached on
 * demand) and a version derived from all of them, so a new build replaces the old cache.
 * Chunks only the online AI assistant uses (the Anthropic SDK) are left out of the shell: they
 * are useless offline, so visitors who never use the assistant don't download them.
 */
import { createHash } from 'node:crypto';
import { readdir, readFile, writeFile } from 'node:fs/promises';
import { join, relative, sep } from 'node:path';

import type { Plugin, ResolvedConfig } from 'vite';

async function listFiles(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true, recursive: true });
  return entries
    .filter((entry) => entry.isFile())
    .map((entry) => relative(directory, join(entry.parentPath, entry.name)).split(sep).join('/'))
    .sort();
}

/** Which built files the shell needs, by path relative to the output folder. */
export function shellFiles(
  files: readonly string[],
  onlineOnly: ReadonlySet<string> = new Set(),
): string[] {
  return files.filter(
    (file) =>
      !onlineOnly.has(file) &&
      (file === 'index.html' ||
        file === 'manifest.webmanifest' ||
        file === 'favicon.svg' ||
        file.startsWith('icons/') ||
        (file.startsWith('assets/') && /\.(js|css|woff2)$/.test(file))),
  );
}

const PACKAGE_MODULE = /[\\/]node_modules[\\/]/;
const SDK_MODULE = /[\\/]node_modules[\\/]@anthropic-ai[\\/]sdk[\\/]/;

/**
 * Chunks that only the AI assistant loads: they hold the Anthropic SDK and the packages it uses,
 * and no CampusKit code. (Rolldown puts modules shared with the rest of the site in other chunks.)
 */
export function onlineOnlyChunks(
  chunks: readonly { fileName: string; moduleIds: readonly string[] }[],
): Set<string> {
  return new Set(
    chunks
      .filter(
        (chunk) =>
          chunk.moduleIds.some((id) => SDK_MODULE.test(id)) &&
          chunk.moduleIds.every((id) => PACKAGE_MODULE.test(id)),
      )
      .map((chunk) => chunk.fileName),
  );
}

export function serviceWorker({ source }: { source: string }): Plugin {
  let config: ResolvedConfig;
  return {
    name: 'campuskit-service-worker',
    apply: 'build',
    configResolved(resolved) {
      config = resolved;
    },
    async writeBundle(_options, bundle) {
      const outDir = config.build.outDir;
      const files = (await listFiles(outDir)).filter((file) => file !== 'sw.js');
      const chunks = Object.values(bundle).flatMap((item) => (item.type === 'chunk' ? [item] : []));
      const shell = shellFiles(files, onlineOnlyChunks(chunks));
      const assets = files.filter((file) => file.startsWith('assets/'));
      const templates = files.filter((file) => file.startsWith('template-bundles/'));
      const hash = createHash('sha256');
      hash.update(files.join('\n'));
      hash.update(await readFile(join(outDir, 'index.html')));
      const version = hash.digest('hex').slice(0, 16);
      const template = await readFile(source, 'utf8');
      const fill = (name: string, value: unknown) => (text: string) => {
        const placeholder = `const ${name} = ${name === 'VERSION' ? "'__VERSION__'" : `__${name}__`};`;
        if (!text.includes(placeholder))
          throw new Error(`service-worker.js has no "${placeholder}"`);
        return text.replace(placeholder, `const ${name} = ${JSON.stringify(value)};`);
      };
      const script = [
        fill('VERSION', version),
        fill('SHELL', shell),
        fill('ASSETS', assets),
        fill('TEMPLATES', templates),
      ]
        .reduce((text, step) => step(text), template)
        // The lint directive names the placeholders; the built file doesn't need it.
        .replace(/^\/\* global .*\*\/\n/m, '');
      if (/__[A-Z]+__/.test(script))
        throw new Error('service-worker.js has a placeholder the build did not fill');
      await writeFile(join(outDir, 'sw.js'), script);
    },
  };
}
