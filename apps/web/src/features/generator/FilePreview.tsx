import { REPORT_DRAFT_FILE } from '@campuskit/project-catalog';
import { GETTING_STARTED_FILE, type GeneratedProject } from '@campuskit/template-engine';
import { useId, useState } from 'react';

import { controlClasses } from '../../components/ui/Field.tsx';
import { cn } from '../../lib/cn.ts';

/** Long files are cut here; the whole file is still in the ZIP. */
const MAX_PREVIEW_CHARACTERS = 30_000;

/**
 * Files worth checking before downloading: the ones the student's choices
 * change and the documents CampusKit writes for them.
 */
export function previewableFiles(project: GeneratedProject): string[] {
  const edited = new Set(project.edits.map((edit) => edit.file));
  const generated = [GETTING_STARTED_FILE, REPORT_DRAFT_FILE];
  const textFiles = new Set(
    project.files.filter((file) => file.encoding === 'utf8').map((file) => file.path),
  );
  return [
    ...generated.filter((path) => textFiles.has(path)),
    ...[...edited].filter((path) => textFiles.has(path) && !generated.includes(path)).sort(),
  ];
}

/**
 * Shows the exact text of a generated file, taken from the same files that go
 * into the ZIP. Nothing here is a mock-up.
 */
export function FilePreview({ project }: { project: GeneratedProject }) {
  const paths = previewableFiles(project);
  const [selected, setSelected] = useState(paths[0] ?? '');
  const selectId = useId();
  const file = project.files.find((item) => item.path === selected);
  if (paths.length === 0 || !file) return null;
  const truncated = file.content.length > MAX_PREVIEW_CHARACTERS;

  return (
    <div className="space-y-3 rounded-xl border border-line p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-1">
          <h3 className="text-sm font-bold text-ink">Preview the generated files</h3>
          <p className="text-xs text-ink-3">
            The exact contents that will be in your ZIP, generated from your choices.
          </p>
        </div>
        <div className="space-y-1.5 sm:w-72">
          <label htmlFor={selectId} className="text-xs font-semibold text-ink-3">
            File
          </label>
          <select
            id={selectId}
            value={selected}
            onChange={(event) => setSelected(event.target.value)}
            className={cn(controlClasses, 'h-10 font-mono text-sm')}
          >
            {paths.map((path) => (
              <option key={path} value={path}>
                {path}
              </option>
            ))}
          </select>
        </div>
      </div>
      {/* Focusable so keyboard users can scroll the preview. */}
      <pre
        tabIndex={0}
        aria-label={`Contents of ${file.path}`}
        className="max-h-96 overflow-auto rounded-lg bg-code-bg p-4 text-xs leading-relaxed whitespace-pre-wrap break-words text-code-ink"
      >
        {truncated ? file.content.slice(0, MAX_PREVIEW_CHARACTERS) : file.content}
      </pre>
      {truncated ? (
        <p className="text-xs text-ink-3">
          Only the beginning of this file is shown. The whole file is in the ZIP.
        </p>
      ) : null}
    </div>
  );
}
