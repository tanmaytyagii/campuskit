import { CircleCheck, Info, TriangleAlert } from 'lucide-react';
import type { ReactNode } from 'react';

import { cn } from '../../lib/cn.ts';

type Tone = 'info' | 'warn' | 'danger' | 'success';

const STYLES: Record<Tone, string> = {
  info: 'border-line bg-raised text-ink-2',
  warn: 'border-warn/40 bg-warn-soft text-ink-2',
  danger: 'border-danger/40 bg-danger-soft text-ink-2',
  success: 'border-lime-text/40 bg-lime-soft text-ink-2',
};

const ICONS: Record<Tone, ReactNode> = {
  info: <Info aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-violet" />,
  warn: <TriangleAlert aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-warn" />,
  danger: <TriangleAlert aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-danger" />,
  success: <CircleCheck aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-lime-text" />,
};

interface CalloutProps {
  tone?: Tone;
  title?: string;
  children: ReactNode;
  className?: string;
  /** Use "alert" for errors that appear in response to an action. */
  role?: 'alert' | 'status';
}

export function Callout({ tone = 'info', title, children, className, role }: CalloutProps) {
  return (
    <div
      role={role}
      className={cn(
        'flex gap-3 rounded-xl border px-4 py-3 text-sm leading-relaxed',
        STYLES[tone],
        className,
      )}
    >
      {ICONS[tone]}
      <div className="min-w-0 space-y-1">
        {title ? <p className="font-semibold text-ink">{title}</p> : null}
        <div>{children}</div>
      </div>
    </div>
  );
}
