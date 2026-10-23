/**
 * Charts for the demos, drawn with HTML and CSS so they reflow on any screen.
 * Every chart has a table view with the same numbers, so nothing depends on
 * reading a bar or hovering. Mark colours are the chart tokens, checked with
 * the data-viz palette validator against both theme surfaces.
 */
import { useState, type ReactNode } from 'react';

import { cn } from '../../lib/cn.ts';

const TONES = { 'chart-1': 'bg-chart-1', 'chart-2': 'bg-chart-2' } as const;
export type SeriesTone = keyof typeof TONES;

/** Round axis ticks: 0 and evenly spaced steps of 1, 2, 2.5 or 5 × a power of ten. */
export function niceScale(
  value: number,
  options: { count?: number; integer?: boolean } = {},
): { max: number; ticks: number[] } {
  const { count = 4, integer = false } = options;
  if (!(value > 0)) return { max: 1, ticks: [0, 1] };
  const rough = value / count;
  const power = 10 ** Math.floor(Math.log10(rough));
  const steps = [1, 2, 2.5, 5, 10]
    .map((multiple) => multiple * power)
    .filter((step) => !integer || (Number.isInteger(step) && step >= 1));
  const step = steps.find((candidate) => candidate >= rough) ?? Math.max(1, 10 * power);
  const max = Math.ceil(value / step - 1e-9) * step;
  const ticks: number[] = [];
  for (let tick = 0; tick <= max + step / 2; tick += step) ticks.push(Math.round(tick * 1e6) / 1e6);
  return { max, ticks };
}

/**
 * A chart with a title and a switch to its table view. The chart itself is one
 * image to assistive technology, described by `summary`; the table carries the values.
 */
export function ChartCard({
  title,
  description,
  summary,
  table,
  children,
  className,
}: {
  title: string;
  description?: ReactNode;
  summary: string;
  table: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  const [showTable, setShowTable] = useState(false);
  return (
    <figure className={cn('min-w-0 rounded-xl border border-line bg-surface p-4', className)}>
      <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-1">
        <figcaption className="min-w-0">
          <h3 className="text-[0.9375rem] font-semibold text-ink">{title}</h3>
          {description ? <p className="type-meta mt-0.5">{description}</p> : null}
        </figcaption>
        <button
          type="button"
          aria-pressed={showTable}
          onClick={() => setShowTable((value) => !value)}
          className="rounded-md px-2 py-1 text-sm font-semibold text-violet transition-colors hover:bg-raised"
        >
          Table view
        </button>
      </div>
      <div className="mt-4">
        {showTable ? (
          table
        ) : (
          <div role="img" aria-label={summary}>
            {children}
          </div>
        )}
      </div>
    </figure>
  );
}

export interface BarDatum {
  id: string;
  label: string;
  value: number;
  /** The value as text, shown at the end of the bar. */
  display: string;
  /** Secondary text after the value, e.g. a share. */
  note?: string;
}

/** Horizontal bars, largest first if you sort them so. Values are labelled at the end. */
export function BarList({ data, max }: { data: readonly BarDatum[]; max?: number }) {
  const top = max ?? Math.max(0, ...data.map((item) => item.value));
  return (
    <ul className="space-y-3">
      {data.map((item) => {
        const share = top > 0 ? Math.min(1, Math.max(0, item.value) / top) : 0;
        return (
          <li
            key={item.id}
            className="group grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1.5 text-sm sm:grid-cols-[minmax(0,9.5rem)_minmax(0,1fr)_auto]"
          >
            <span className="truncate text-ink-2">{item.label}</span>
            <span className="order-last col-span-2 h-3 border-l border-line-strong sm:order-none sm:col-span-1">
              <span
                className="block h-full rounded-r-[4px] bg-chart-1 transition-[width,opacity] duration-300 group-hover:opacity-75 motion-reduce:transition-none"
                style={{ width: `${share * 100}%` }}
              />
            </span>
            <span className="text-right font-semibold whitespace-nowrap text-ink tabular-nums">
              {item.display}
              {item.note ? (
                <span className="ml-1.5 font-normal text-ink-3">{item.note}</span>
              ) : null}
            </span>
          </li>
        );
      })}
    </ul>
  );
}

export interface ColumnSeries {
  id: string;
  label: string;
  tone: SeriesTone;
  values: readonly number[];
}

/**
 * Vertical columns for one or two series over a few categories, with a
 * hairline grid, an optional reference line (a threshold) and a readout of
 * every series when the pointer is over a category.
 */
export function ColumnChart({
  categories,
  series,
  format,
  formatTick = format,
  max,
  integer = false,
  reference,
  capLabels = false,
  height = 208,
}: {
  categories: readonly string[];
  series: readonly ColumnSeries[];
  format: (value: number) => string;
  formatTick?: (value: number) => string;
  /** The top of the value axis; computed from the data when left out. */
  max?: number;
  integer?: boolean;
  reference?: { value: number; label: string };
  /** Value labels on top of the columns (for a single series with few categories). */
  capLabels?: boolean;
  height?: number;
}) {
  const [active, setActive] = useState<number | null>(null);
  const dataMax = Math.max(0, ...series.flatMap((item) => item.values), reference?.value ?? 0);
  const scale = max ? niceScale(max, { integer }) : niceScale(dataMax, { integer });
  const position = (value: number) => `${(Math.max(0, value) / scale.max) * 100}%`;
  const labelled = capLabels && series.length === 1;

  return (
    <div className="space-y-3">
      {series.length > 1 ? (
        <ul className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-ink-2">
          {series.map((item) => (
            <li key={item.id} className="inline-flex items-center gap-2">
              <span aria-hidden="true" className={cn('size-3 rounded-[3px]', TONES[item.tone])} />
              {item.label}
            </li>
          ))}
        </ul>
      ) : null}
      <div className="flex gap-2" style={{ height }}>
        {/* Value axis: the tick labels sit beside the gridlines they name. */}
        <div aria-hidden="true" className="relative w-11 shrink-0">
          <div className="absolute inset-x-0 top-5 bottom-0">
            {scale.ticks.map((tick) => (
              <span
                key={tick}
                className="absolute right-0 translate-y-1/2 text-[0.6875rem] text-ink-3 tabular-nums"
                style={{ bottom: position(tick) }}
              >
                {formatTick(tick)}
              </span>
            ))}
          </div>
        </div>
        <div className="relative min-w-0 flex-1">
          <div className="absolute inset-x-0 top-5 bottom-0">
            {scale.ticks.map((tick) => (
              <span
                key={tick}
                aria-hidden="true"
                className={cn(
                  'absolute inset-x-0 border-t',
                  tick === 0 ? 'border-line-strong' : 'border-line',
                )}
                style={{ bottom: position(tick) }}
              />
            ))}
            {reference ? (
              <span
                className="absolute inset-x-0 z-[1] border-t-2 border-dashed border-ink-2"
                style={{ bottom: position(reference.value) }}
              >
                <span className="absolute right-0 bottom-1 rounded bg-surface/90 px-1 text-[0.6875rem] font-semibold text-ink-2">
                  {reference.label}
                </span>
              </span>
            ) : null}
            <div className="absolute inset-0 flex items-end gap-1 sm:gap-2">
              {categories.map((category, index) => (
                <div
                  key={category}
                  className="relative flex h-full min-w-0 flex-1 items-end justify-center gap-0.5"
                  onPointerEnter={() => setActive(index)}
                  onPointerLeave={() => setActive((current) => (current === index ? null : current))}
                >
                  {series.map((item) => {
                    const value = item.values[index] ?? 0;
                    return (
                      <div
                        key={item.id}
                        className={cn(
                          'relative w-full max-w-6 rounded-t-[4px] transition-[height,opacity] duration-300 motion-reduce:transition-none',
                          TONES[item.tone],
                          active === index && 'opacity-75',
                        )}
                        style={{ height: position(value) }}
                      >
                        {labelled ? (
                          <span className="absolute bottom-full left-1/2 mb-1 -translate-x-1/2 text-[0.6875rem] font-semibold whitespace-nowrap text-ink tabular-nums">
                            {format(value)}
                          </span>
                        ) : null}
                      </div>
                    );
                  })}
                  {active === index ? (
                    <div
                      className={cn(
                        'pointer-events-none absolute -top-4 z-10 min-w-36 -translate-y-full rounded-lg border border-line bg-surface px-3 py-2 text-left shadow-lift',
                        index === 0
                          ? 'left-0'
                          : index === categories.length - 1
                            ? 'right-0'
                            : 'left-1/2 -translate-x-1/2',
                      )}
                    >
                      <p className="type-meta">{category}</p>
                      <ul className="mt-1 space-y-0.5">
                        {series.map((item) => (
                          <li key={item.id} className="flex items-center gap-2 text-sm">
                            <span
                              aria-hidden="true"
                              className={cn('h-0.5 w-3 rounded-full', TONES[item.tone])}
                            />
                            <span className="font-semibold text-ink tabular-nums">
                              {format(item.values[index] ?? 0)}
                            </span>
                            {series.length > 1 ? (
                              <span className="text-ink-3">{item.label}</span>
                            ) : null}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
      <div aria-hidden="true" className="ml-13 flex gap-1 sm:gap-2">
        {categories.map((category) => (
          <span
            key={category}
            className="min-w-0 flex-1 truncate text-center text-xs text-ink-3"
            title={category}
          >
            {category}
          </span>
        ))}
      </div>
    </div>
  );
}
