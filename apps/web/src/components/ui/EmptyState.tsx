import type { ReactNode } from 'react';

import { cn } from '../../lib/cn.ts';

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  children: ReactNode;
  actions?: ReactNode;
  className?: string;
}

export function EmptyState({ icon, title, children, actions, className }: EmptyStateProps) {
  return (
    <div
      className={cn(
        'rounded-[18px] border border-dashed border-line-strong bg-surface px-6 py-12 text-center',
        className,
      )}
    >
      {icon ? (
        <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-xl bg-raised text-violet">
          {icon}
        </div>
      ) : null}
      <h2 className="heading text-lg text-ink">{title}</h2>
      <div className="mx-auto mt-2 max-w-md text-sm text-ink-3">{children}</div>
      {actions ? <div className="mt-6 flex flex-wrap justify-center gap-3">{actions}</div> : null}
    </div>
  );
}
