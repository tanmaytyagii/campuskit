import { STATUS_LABELS, type AttendanceStatus } from '../types';

export function StatusBadge({ status }: { status: AttendanceStatus }) {
  return <span className={`badge badge-${status}`}>{STATUS_LABELS[status]}</span>;
}

/** A percentage with a small bar; colours the bar when below the threshold. */
export function PercentBar({ value, threshold }: { value: number | null; threshold: number }) {
  if (value === null) return <span className="muted">No marks yet</span>;
  const below = value < threshold;
  return (
    <span className="percent">
      <span className="percent-track" aria-hidden="true">
        <span
          className={`percent-fill${below ? ' percent-fill-low' : ''}`}
          style={{ width: `${Math.min(value, 100)}%` }}
        />
      </span>
      <span className={below ? 'percent-value percent-value-low' : 'percent-value'}>
        {value.toFixed(1)}%
      </span>
    </span>
  );
}
