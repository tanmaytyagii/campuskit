/**
 * The second step of generation: a generated project's files as a ZIP archive. It is separate
 * from generate.ts so that pages which only plan or preview a project don't load the ZIP code.
 */
import { base64ToBytes } from './encoding.ts';
import { generateProject, type GenerateProjectOptions, type GeneratedProject } from './generate.ts';
import { createZipArchive, type ArchiveFile } from './zip.ts';

/** Packages a generated project as a ZIP with a single root folder. */
export async function packageProject(project: GeneratedProject, date?: Date): Promise<Uint8Array> {
  const archiveFiles: ArchiveFile[] = project.files.map((file) => ({
    path: file.path,
    data: file.encoding === 'utf8' ? file.content : base64ToBytes(file.content),
  }));
  return createZipArchive(project.rootFolder, archiveFiles, date ? { date } : {});
}

/** Convenience helper used by tests and scripts: validate, generate and zip. */
export async function generateProjectZip(
  options: GenerateProjectOptions & { date?: Date },
): Promise<{ project: GeneratedProject; zip: Uint8Array }> {
  const project = generateProject(options);
  const zip = await packageProject(project, options.date);
  return { project, zip };
}
