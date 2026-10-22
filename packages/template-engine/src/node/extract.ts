/**
 * Safe ZIP extraction for verification scripts and tests.
 * Every entry is validated by `readZipArchive`, and the final absolute path is
 * checked again so nothing can be written outside `targetDirectory`.
 */
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve, sep } from 'node:path';

import { readZipArchive } from '../zip.ts';

export async function extractZipArchive(
  data: Uint8Array,
  targetDirectory: string,
): Promise<string[]> {
  const root = resolve(targetDirectory);
  const entries = await readZipArchive(data);
  const written: string[] = [];
  for (const entry of entries) {
    const destination = resolve(root, entry.path);
    if (!destination.startsWith(root + sep)) {
      throw new Error(`Refusing to write outside the extraction folder: ${entry.path}`);
    }
    await mkdir(dirname(destination), { recursive: true });
    await writeFile(destination, entry.data);
    written.push(entry.path);
  }
  return written;
}
