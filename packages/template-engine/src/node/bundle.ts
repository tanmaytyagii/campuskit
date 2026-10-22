/**
 * Builds a `TemplateBundle` from a template folder on disk.
 *
 * Used at build time (Vite plugin), by the catalog validator and by tests.
 * Symbolic links are never followed, excluded folders are never entered and
 * every path is checked with the same rules the generator enforces.
 */
import { lstat, readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';

import { bytesToBase64, looksLikeText } from '../encoding.ts';
import { assertSafeRelativePath, getExclusionReason, isExcludedDirectoryName } from '../paths.ts';
import type { BundleFile, TemplateBundle } from '../spec.ts';

export const MAX_FILE_BYTES = 5 * 1024 * 1024;
export const MAX_BUNDLE_BYTES = 25 * 1024 * 1024;

export interface BundleBuildResult {
  bundle: TemplateBundle;
  /** Files and folders that were skipped, with the reason. */
  skipped: Array<{ path: string; reason: string }>;
}

export async function buildTemplateBundle(
  directory: string,
  meta: { templateId: string; templateVersion: string },
): Promise<BundleBuildResult> {
  const files: BundleFile[] = [];
  const skipped: BundleBuildResult['skipped'] = [];
  let total = 0;

  async function walk(relativeDir: string): Promise<void> {
    const absoluteDir = relativeDir ? join(directory, relativeDir) : directory;
    const entries = await readdir(absoluteDir, { withFileTypes: true });
    entries.sort((a, b) => a.name.localeCompare(b.name, 'en'));

    for (const entry of entries) {
      const relativePath = relativeDir ? `${relativeDir}/${entry.name}` : entry.name;
      const absolutePath = join(directory, relativePath);
      const stats = await lstat(absolutePath);

      if (stats.isSymbolicLink()) {
        skipped.push({ path: relativePath, reason: 'symbolic links are never followed' });
        continue;
      }
      if (stats.isDirectory()) {
        if (isExcludedDirectoryName(entry.name)) {
          skipped.push({
            path: `${relativePath}/`,
            reason: getExclusionReason(`${relativePath}/x`) ?? 'excluded folder',
          });
          continue;
        }
        await walk(relativePath);
        continue;
      }
      if (!stats.isFile()) {
        skipped.push({ path: relativePath, reason: 'only regular files are bundled' });
        continue;
      }

      const reason = getExclusionReason(relativePath);
      if (reason) {
        skipped.push({ path: relativePath, reason });
        continue;
      }

      assertSafeRelativePath(relativePath);
      if (stats.size > MAX_FILE_BYTES) {
        throw new Error(
          `${relativePath} is larger than the ${MAX_FILE_BYTES / 1024 / 1024} MB per-file limit`,
        );
      }
      total += stats.size;
      if (total > MAX_BUNDLE_BYTES) {
        throw new Error(
          `Template "${meta.templateId}" is larger than the ${MAX_BUNDLE_BYTES / 1024 / 1024} MB limit`,
        );
      }

      const bytes = new Uint8Array(await readFile(absolutePath));
      const isText = looksLikeText(bytes);
      files.push({
        path: relativePath,
        encoding: isText ? 'utf8' : 'base64',
        content: isText ? new TextDecoder().decode(bytes) : bytesToBase64(bytes),
        size: bytes.length,
      });
    }
  }

  await walk('');
  files.sort((a, b) => a.path.localeCompare(b.path, 'en'));
  return {
    bundle: {
      schemaVersion: 1,
      templateId: meta.templateId,
      templateVersion: meta.templateVersion,
      files,
    },
    skipped,
  };
}
