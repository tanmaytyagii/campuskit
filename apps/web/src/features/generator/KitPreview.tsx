import type { ProjectManifest } from '@campuskit/project-catalog';
import type { ResolvedValues } from '@campuskit/template-engine';
import { FileCode, FolderOpen } from 'lucide-react';

import { cn } from '../../lib/cn.ts';
import { previewEdits } from './logic.ts';

interface KitPreviewProps {
  manifest: ProjectManifest;
  values: ResolvedValues;
  /** Only show edits that use the project name (hero) or every edit (generator). */
  scope?: 'name' | 'all';
  className?: string;
}

/**
 * Shows exactly where the template engine will write each value, using the
 * template's real edit list and the engine's real escaping.
 */
export function KitPreview({ manifest, values, scope = 'all', className }: KitPreviewProps) {
  const rows = previewEdits(manifest, values).filter((row) => scope === 'all' || row.usesName);
  const byFile = new Map<string, typeof rows>();
  for (const row of rows) byFile.set(row.file, [...(byFile.get(row.file) ?? []), row]);

  return (
    <div
      className={cn(
        'overflow-hidden rounded-2xl border border-line bg-surface shadow-lift',
        className,
      )}
    >
      <div className="flex items-center gap-2 border-b border-line bg-raised px-4 py-3">
        <FolderOpen aria-hidden="true" className="size-4 text-violet" />
        <span className="truncate font-mono text-sm font-medium text-ink">
          {values.projectSlug}/
        </span>
        <span className="ml-auto shrink-0 text-xs text-ink-3">from {manifest.id}</span>
      </div>
      <ul className="divide-y divide-line" aria-label="Files your choices change">
        {[...byFile.entries()].map(([file, fileRows]) => (
          <li key={file} className="px-4 py-3">
            <p className="flex items-center gap-2 font-mono text-[0.8rem] text-ink-3">
              <FileCode aria-hidden="true" className="size-3.5 shrink-0" />
              {file}
            </p>
            <ul className="mt-1.5 space-y-1">
              {fileRows.map((row) => (
                <li
                  key={`${row.label}-${row.snippet}`}
                  className="flex flex-wrap items-baseline gap-x-2"
                >
                  <span className="text-xs text-ink-3">{row.label}</span>
                  <code className="max-w-full break-all font-mono text-[0.8rem] text-ink">
                    {row.snippet}
                  </code>
                  {row.places > 1 ? (
                    <span className="text-xs text-ink-3">({row.places} places)</span>
                  ) : null}
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ul>
    </div>
  );
}
