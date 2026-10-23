/**
 * A labelled amount with a progress bar, for use inside a <dl>. The text
 * carries the value; the bar is decoration.
 */
export function Meter({ label, value, share }: { label: string; value: string; share: number }) {
  const width = Math.min(1, Math.max(0, share)) * 100;
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-x-3 gap-y-1.5 text-sm">
      <dt className="text-ink-2">{label}</dt>
      <dd className="font-semibold text-ink">{value}</dd>
      <dd aria-hidden="true" className="col-span-2 h-1.5 overflow-hidden rounded-full bg-raised">
        <div
          className="h-full rounded-full bg-violet transition-[width] duration-300 motion-reduce:transition-none"
          style={{ width: `${width}%` }}
        />
      </dd>
    </div>
  );
}
