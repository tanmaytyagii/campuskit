/**
 * Reading and writing verification records (verification/<template-id>.json).
 * Only `pnpm verify:generated --record` writes them; see ../verification.ts.
 */
import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

import {
  VERIFICATION_PLATFORMS,
  verificationRecordSchema,
  type VerificationEntry,
  type VerificationPlatform,
  type VerificationRecord,
} from '../verification.ts';

export interface RecordProblem {
  file: string;
  message: string;
}

export function platformFromNode(platform: NodeJS.Platform): VerificationPlatform | null {
  if (platform === 'darwin') return 'macos';
  if (platform === 'win32') return 'windows';
  if (platform === 'linux') return 'linux';
  return null;
}

/** Reads every record in `directory`. A missing folder simply means no records yet. */
export async function readVerificationRecords(directory: string): Promise<{
  records: Map<string, VerificationRecord>;
  problems: RecordProblem[];
}> {
  const records = new Map<string, VerificationRecord>();
  const problems: RecordProblem[] = [];
  let files: string[];
  try {
    files = (await readdir(directory)).filter((file) => file.endsWith('.json')).sort();
  } catch {
    return { records, problems };
  }
  for (const file of files) {
    let data: unknown;
    try {
      data = JSON.parse(await readFile(join(directory, file), 'utf8'));
    } catch (error) {
      problems.push({ file, message: `Invalid JSON: ${(error as Error).message}` });
      continue;
    }
    const parsed = verificationRecordSchema.safeParse(data);
    if (!parsed.success) {
      for (const issue of parsed.error.issues) {
        problems.push({ file, message: `${issue.path.join('.') || '(root)'}: ${issue.message}` });
      }
      continue;
    }
    if (`${parsed.data.templateId}.json` !== file) {
      problems.push({
        file,
        message: `The file should be named ${parsed.data.templateId}.json`,
      });
      continue;
    }
    records.set(parsed.data.templateId, parsed.data);
  }
  return { records, problems };
}

/**
 * Adds or replaces the entry for `entry.platform` in a template's record and
 * writes the file. Entries for other platforms are kept.
 */
export async function writeVerificationEntry(
  directory: string,
  templateId: string,
  entry: VerificationEntry,
): Promise<VerificationRecord> {
  const { records } = await readVerificationRecords(directory);
  const existing = records.get(templateId);
  const entries = [
    ...(existing?.entries ?? []).filter((item) => item.platform !== entry.platform),
    entry,
  ].sort(
    (a, b) =>
      VERIFICATION_PLATFORMS.indexOf(a.platform) - VERIFICATION_PLATFORMS.indexOf(b.platform),
  );
  const record = verificationRecordSchema.parse({ schemaVersion: 1, templateId, entries });
  await mkdir(directory, { recursive: true });
  await writeFile(join(directory, `${templateId}.json`), `${JSON.stringify(record, null, 2)}\n`);
  return record;
}
