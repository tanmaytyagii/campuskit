import type { ProjectManifest } from '@campuskit/project-catalog';
import { Expand } from 'lucide-react';
import { useState } from 'react';

import { PreviewImage } from '../../components/PreviewImage.tsx';
import { Dialog } from '../../components/ui/Dialog.tsx';
import { cn } from '../../lib/cn.ts';

/** Real screenshots of the template, with thumbnails and a larger view. */
export function ScreenshotGallery({ project }: { project: ProjectManifest }) {
  const shots = project.media.screenshots;
  const [index, setIndex] = useState(0);
  const [zoomed, setZoomed] = useState(false);
  const current = shots[index] ?? shots[0];
  if (!current) return null;

  return (
    <figure className="space-y-3">
      <button
        type="button"
        onClick={() => setZoomed(true)}
        className="group relative block w-full overflow-hidden rounded-xl border border-line shadow-card"
        aria-label={`Enlarge screenshot: ${current.caption ?? current.alt}`}
      >
        <PreviewImage project={project} file={current.file} className="aspect-[16/10]" eager />
        <span className="absolute right-3 bottom-3 inline-flex items-center gap-1.5 rounded-md bg-[#0b1330]/80 px-2.5 py-1 text-xs font-semibold text-white opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
          <Expand aria-hidden="true" className="size-3.5" />
          Enlarge
        </span>
      </button>
      <figcaption className="text-sm text-ink-3">
        {current.caption ?? current.alt}{' '}
        <span className="text-ink-3">(screenshot of the template running with its demo data)</span>
      </figcaption>
      {shots.length > 1 ? (
        <div
          className="flex gap-3 overflow-x-auto pb-1"
          role="group"
          aria-label="Choose a screenshot"
        >
          {shots.map((shot, shotIndex) => (
            <button
              key={shot.file}
              type="button"
              onClick={() => setIndex(shotIndex)}
              aria-pressed={shotIndex === index}
              aria-label={shot.caption ?? shot.alt}
              className={cn(
                'w-32 shrink-0 overflow-hidden rounded-lg border-2 transition-colors',
                shotIndex === index
                  ? 'border-violet'
                  : 'border-transparent opacity-75 hover:opacity-100',
              )}
            >
              <PreviewImage project={project} file={shot.file} alt="" className="aspect-[16/10]" />
            </button>
          ))}
        </div>
      ) : null}
      <Dialog
        open={zoomed}
        onClose={() => setZoomed(false)}
        title={current.caption ?? project.name}
        variant="wide"
      >
        <PreviewImage
          project={project}
          file={current.file}
          className="rounded-lg border border-line"
          eager
        />
        <p className="mt-3 text-sm text-ink-3">{current.alt}</p>
      </Dialog>
    </figure>
  );
}
