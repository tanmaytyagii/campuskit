import type { ProjectManifest } from '@campuskit/project-catalog';
import { useState } from 'react';

import { templateAssetUrl } from '../lib/assets.ts';
import { cn } from '../lib/cn.ts';

/** A local fallback drawn in SVG when a screenshot can't be loaded. */
function FallbackArt({ name }: { name: string }) {
  const initials = name
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => word[0] ?? '')
    .join('')
    .toUpperCase();
  return (
    <svg
      viewBox="0 0 320 200"
      role="img"
      aria-label={`Preview of ${name} is not available`}
      className="size-full"
    >
      <rect width="320" height="200" className="fill-raised" />
      <rect
        x="24"
        y="24"
        width="272"
        height="152"
        rx="12"
        fill="none"
        strokeWidth="2"
        strokeDasharray="6 6"
        className="stroke-line-strong"
      />
      <text
        x="160"
        y="112"
        textAnchor="middle"
        className="fill-ink-3"
        fontSize="40"
        fontWeight="800"
      >
        {initials}
      </text>
    </svg>
  );
}

interface PreviewImageProps {
  project: ProjectManifest;
  file?: string;
  alt?: string;
  className?: string;
  eager?: boolean;
}

export function PreviewImage({
  project,
  file = project.media.cover,
  alt,
  className,
  eager = false,
}: PreviewImageProps) {
  const url = templateAssetUrl(project.template.directory, file);
  const [failed, setFailed] = useState(false);
  const screenshot = project.media.screenshots.find((shot) => shot.file === file);

  return (
    <div className={cn('overflow-hidden bg-raised', className)}>
      {url && !failed ? (
        <img
          src={url}
          alt={alt ?? screenshot?.alt ?? `Screenshot of ${project.name}`}
          loading={eager ? 'eager' : 'lazy'}
          decoding="async"
          width={1280}
          height={800}
          onError={() => setFailed(true)}
          className="size-full object-cover object-top"
        />
      ) : (
        <FallbackArt name={project.name} />
      )}
    </div>
  );
}
