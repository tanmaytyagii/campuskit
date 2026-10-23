import type { ReactNode } from 'react';

import { cn } from '../../lib/cn.ts';

interface PageHeaderProps {
  title: ReactNode;
  /** A short label above the title, such as the area of the site. */
  eyebrow?: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  /** Shown above everything else, typically breadcrumbs. */
  children?: ReactNode;
  className?: string;
}

/** The top of an inner page: optional breadcrumbs, eyebrow, title, description and actions. */
export function PageHeader({
  title,
  eyebrow,
  description,
  actions,
  children,
  className,
}: PageHeaderProps) {
  return (
    <div className={cn('container-page pt-8 pb-8 md:pt-12 md:pb-10', className)}>
      {children}
      <div className="flex flex-wrap items-end justify-between gap-6">
        <div className="max-w-3xl space-y-3">
          {eyebrow ? <p className="type-eyebrow text-violet">{eyebrow}</p> : null}
          <h1 className="type-title text-ink">{title}</h1>
          {description ? <p className="type-lead max-w-[62ch]">{description}</p> : null}
        </div>
        {actions ? <div className="flex flex-wrap gap-3">{actions}</div> : null}
      </div>
    </div>
  );
}
