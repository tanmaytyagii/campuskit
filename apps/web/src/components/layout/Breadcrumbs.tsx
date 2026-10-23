import { ChevronRight } from 'lucide-react';
import { Link } from 'react-router';

import { cn } from '../../lib/cn.ts';

export interface Crumb {
  label: string;
  to: string;
}

/** “Where am I?” links above a page title; the last item is the current page. */
export function Breadcrumbs({
  items,
  current,
  className,
}: {
  items: Crumb[];
  current: string;
  className?: string;
}) {
  return (
    <nav aria-label="Breadcrumb" className={cn('mb-5 text-sm text-ink-3', className)}>
      <ol className="flex flex-wrap items-center gap-1.5">
        {items.map((item) => (
          <li key={item.to} className="flex items-center gap-1.5">
            <Link to={item.to} className="rounded-sm hover:text-violet hover:underline">
              {item.label}
            </Link>
            <ChevronRight aria-hidden="true" className="size-3.5 text-ink-3/70" />
          </li>
        ))}
        <li aria-current="page" className="font-medium text-ink-2">
          {current}
        </li>
      </ol>
    </nav>
  );
}
