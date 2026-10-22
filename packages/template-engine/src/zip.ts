/**
 * ZIP creation and inspection with JSZip.
 *
 * Archives always contain a single root folder (the project slug) so that
 * "Extract here" produces one clean directory. Entry dates are fixed per
 * generation, so the same inputs produce byte-identical archives.
 */
import JSZip from 'jszip';

import { assertSafeArchiveEntry, assertSafeRelativePath, UnsafePathError } from './paths.ts';

export interface ArchiveFile {
  path: string;
  data: Uint8Array | string;
}

export const MAX_ARCHIVE_BYTES = 100 * 1024 * 1024;
const ROOT_FOLDER_PATTERN = /^[a-z0-9](?:[a-z0-9-]{0,62}[a-z0-9])?$/;

export function assertSafeRootFolder(name: string): void {
  if (!ROOT_FOLDER_PATTERN.test(name)) {
    throw new UnsafePathError(name, 'root folder names use lowercase letters, digits and hyphens');
  }
}

/** ZIP timestamps use DOS time, which cannot represent years before 1980. */
function clampZipDate(date: Date): Date {
  const minimum = new Date(1980, 0, 2);
  return date.getTime() < minimum.getTime() ? minimum : date;
}

export async function createZipArchive(
  rootFolder: string,
  files: readonly ArchiveFile[],
  options: { date?: Date } = {},
): Promise<Uint8Array> {
  assertSafeRootFolder(rootFolder);
  const date = clampZipDate(options.date ?? new Date());
  const zip = new JSZip();

  const folders = new Set<string>([rootFolder]);
  const seen = new Set<string>();
  for (const file of files) {
    assertSafeRelativePath(file.path);
    const key = file.path.toLowerCase();
    if (seen.has(key)) {
      throw new UnsafePathError(
        file.path,
        'two files would have the same name on case-insensitive systems',
      );
    }
    seen.add(key);
    const segments = file.path.split('/');
    for (let depth = 1; depth < segments.length; depth += 1) {
      folders.add(`${rootFolder}/${segments.slice(0, depth).join('/')}`);
    }
  }

  for (const folder of [...folders].sort()) zip.file(`${folder}/`, null, { dir: true, date });
  for (const file of [...files].sort((a, b) => a.path.localeCompare(b.path, 'en'))) {
    zip.file(`${rootFolder}/${file.path}`, file.data, {
      date,
      binary: typeof file.data !== 'string',
      createFolders: false,
    });
  }

  return zip.generateAsync({
    type: 'uint8array',
    compression: 'DEFLATE',
    compressionOptions: { level: 6 },
  });
}

export interface ArchiveEntry {
  path: string;
  data: Uint8Array;
}

/**
 * Reads every file entry from a ZIP, rejecting entries that would escape the
 * extraction folder ("zip slip") or that use absolute or Windows paths.
 */
export async function readZipArchive(data: Uint8Array): Promise<ArchiveEntry[]> {
  const zip = await JSZip.loadAsync(data);
  const entries: ArchiveEntry[] = [];
  let total = 0;
  for (const [name, entry] of Object.entries(zip.files)) {
    // JSZip rewrites dangerous names while loading and keeps the original in
    // `unsafeOriginalName`; reject such archives instead of trusting the rewrite.
    const original = (entry as { unsafeOriginalName?: string }).unsafeOriginalName;
    if (original !== undefined) assertSafeArchiveEntry(original);
    assertSafeArchiveEntry(name);
    if (entry.dir) continue;
    const bytes = await entry.async('uint8array');
    total += bytes.length;
    if (total > MAX_ARCHIVE_BYTES)
      throw new Error('Archive is larger than the 100 MB safety limit');
    entries.push({ path: name, data: bytes });
  }
  return entries.sort((a, b) => a.path.localeCompare(b.path, 'en'));
}
