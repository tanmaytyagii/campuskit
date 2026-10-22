import type { ReactNode } from 'react';

interface EmptyStateProps {
  title: string;
  children: ReactNode;
  action?: ReactNode;
}

/** Shown instead of an empty table, with a hint about what to do next. */
export function EmptyState({ title, children, action }: EmptyStateProps) {
  return (
    <div className="empty-state">
      <svg className="empty-state-icon" viewBox="0 0 48 48" aria-hidden="true">
        <rect
          x="8"
          y="6"
          width="32"
          height="36"
          rx="5"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
        />
        <path
          d="M16 18h16M16 25h16M16 32h9"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
      </svg>
      <h3>{title}</h3>
      <p>{children}</p>
      {action ? <div className="empty-state-action">{action}</div> : null}
    </div>
  );
}
