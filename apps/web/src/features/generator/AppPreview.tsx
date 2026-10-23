import type { LearningGuide } from '@campuskit/project-catalog';

import type { AppPreviewModel } from './logic.ts';

/**
 * A small drawing of the generated app's header, painted with the student's
 * settings. The colours are the template's real theme colours (the catalog
 * validator checks every swatch) and the navigation labels come from the
 * app's own source, but it is an illustration, not a screenshot, and says so.
 */
export function AppPreview({
  model,
  preview,
}: {
  model: AppPreviewModel;
  preview: LearningGuide['preview'] | null;
}) {
  const accent = model.accent ?? 'var(--color-violet)';
  const navigation = preview?.navigation ?? [];
  const summary = [
    `The app's title is “${model.name || 'empty'}”`,
    model.institution ? `with “${model.institution}” under it` : null,
    model.accentLabel ? `and the ${model.accentLabel} accent colour` : null,
  ]
    .filter(Boolean)
    .join(' ');

  const brand = (
    <div className="min-w-0">
      <p className="truncate text-sm font-semibold text-ink">{model.name || '(no name yet)'}</p>
      {model.institution ? (
        <p className="truncate text-xs text-ink-3">{model.institution}</p>
      ) : null}
    </div>
  );
  const tabs = (
    <ul className="flex flex-wrap gap-1 text-[0.7rem] font-semibold">
      {navigation.map((label, index) => (
        <li
          key={label}
          className="rounded px-1.5 py-0.5"
          style={
            index === 0 ? { background: accent, color: '#ffffff' } : { color: 'var(--color-ink-2)' }
          }
        >
          {label}
        </li>
      ))}
    </ul>
  );
  const body = (
    <div className="space-y-1.5 p-3">
      <div className="h-2 w-2/3 rounded bg-raised" />
      <div className="h-2 w-1/2 rounded bg-raised" />
      <div className="mt-2 h-6 w-24 rounded" style={{ background: accent }} />
    </div>
  );

  return (
    <figure className="space-y-2">
      <div
        aria-hidden="true"
        className="overflow-hidden rounded-xl border border-line bg-canvas shadow-card"
      >
        {preview?.layout === 'sidebar' ? (
          <div className="grid grid-cols-[32%_minmax(0,1fr)]">
            <div className="space-y-2 border-r border-line bg-raised p-3">
              <div className="h-2 w-3/4 rounded bg-line-strong" />
              <div className="flex items-center gap-1.5">
                <span className="size-2.5 rounded-full" style={{ background: accent }} />
                <span className="h-2 w-2/3 rounded bg-line-strong" />
              </div>
              <div className="h-2 w-1/2 rounded bg-line-strong" />
            </div>
            <div className="min-w-0 space-y-2 p-3">
              {brand}
              {tabs}
              {body}
            </div>
          </div>
        ) : (
          <>
            <div className="space-y-2 border-b border-line bg-surface p-3">
              <div className="flex items-center gap-2">
                <span className="size-6 shrink-0 rounded-md" style={{ background: accent }} />
                {brand}
              </div>
              {tabs}
            </div>
            {body}
          </>
        )}
        <p className="border-t border-line px-3 py-1.5 text-[0.7rem] text-ink-3">
          {model.author ? `Built by ${model.author}.` : 'No author name shown.'}
        </p>
      </div>
      <figcaption className="text-xs text-ink-3">
        <span className="sr-only">{summary}. </span>
        An illustration drawn from your settings with the template’s real colours and labels, not a
        screenshot.
        {model.dataNotes.length > 0 ? ` ${model.dataNotes.join('. ')}.` : ''}
      </figcaption>
    </figure>
  );
}
