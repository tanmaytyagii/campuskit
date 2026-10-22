import type { ReactNode } from 'react';

import { cn } from '../../lib/cn.ts';

type Tone = 'neutral' | 'violet' | 'lime' | 'outline';

const TONES: Record<Tone, string> = {
  neutral: 'bg-raised text-ink-2',
  violet: 'bg-violet-soft text-violet',
  lime: 'bg-lime text-lime-ink',
  outline: 'border border-line text-ink-2',
};

export function Badge({
  tone = 'neutral',
  children,
  className,
}: {
  tone?: Tone;
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-semibold',
        TONES[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
