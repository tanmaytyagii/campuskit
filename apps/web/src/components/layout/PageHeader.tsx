import type { ReactNode } from 'react';

import { cn } from '../../lib/cn.ts';

interface PageHeaderProps {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  children?: ReactNode;
  className?: string;
}

export function PageHeader({ title, description, actions, children, className }: PageHeaderProps) {
  return (
    <div className={cn('container-page pt-10 pb-8 md:pt-14', className)}>
      {children}
      <div className="flex flex-wrap items-end justify-between gap-6">
        <div className="max-w-3xl space-y-3">
          <h1 className="display text-[1.9rem] text-ink min-[400px]:text-4xl md:text-5xl">
            {title}
          </h1>
          {description ? <p className="text-lg text-ink-2">{description}</p> : null}
        </div>
        {actions ? <div className="flex flex-wrap gap-3">{actions}</div> : null}
      </div>
    </div>
  );
}
