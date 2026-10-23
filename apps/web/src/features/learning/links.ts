/** Links from learning content into the project's real files and documents. */
import type { DocReference, ProjectManifest } from '@campuskit/project-catalog';

/** The source browser at `file`, optionally scrolled to where `symbol` is defined. */
export function sourceHref(project: ProjectManifest, file: string, symbol?: string): string {
  const params = new URLSearchParams({ file });
  if (symbol) params.set('symbol', symbol);
  return `/projects/${project.slug}/source?${params.toString()}`;
}

/** The project's documentation page for a file, when the manifest lists it as a document. */
export function docForFile(project: ProjectManifest, file: string): DocReference | undefined {
  return project.docs.find((doc) => doc.file === file);
}

/** A document page when the file is a listed document, otherwise the source browser. */
export function fileHref(project: ProjectManifest, file: string): string {
  const doc = docForFile(project, file);
  return doc ? `/projects/${project.slug}/docs/${doc.kind}` : sourceHref(project, file);
}

export const STUDIO_SECTIONS = [
  { id: 'overview', label: 'Overview' },
  { id: 'architecture', label: 'Architecture' },
  { id: 'code', label: 'Code walkthrough' },
  { id: 'checklist', label: 'Checklist' },
  { id: 'troubleshooting', label: 'Troubleshooting' },
] as const;

export type StudioSectionId = (typeof STUDIO_SECTIONS)[number]['id'];

export function studioHref(
  project: ProjectManifest,
  section: StudioSectionId = 'overview',
): string {
  return section === 'overview'
    ? `/projects/${project.slug}/learn`
    : `/projects/${project.slug}/learn/${section}`;
}

export function vivaHref(project: ProjectManifest): string {
  return `/projects/${project.slug}/viva`;
}

export function reportHref(project: ProjectManifest): string {
  return `/learn/report?project=${project.id}`;
}
