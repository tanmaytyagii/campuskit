/**
 * The current view lives in the URL hash (#/transactions), so the back and
 * forward buttons work and every view has a link, without a router library.
 */
import { useEffect, useState } from 'react';

export const VIEWS = [
  { id: 'overview', label: 'Overview' },
  { id: 'transactions', label: 'Transactions' },
  { id: 'settings', label: 'Budget & data' },
] as const;

export type ViewId = (typeof VIEWS)[number]['id'];

export function viewHref(view: ViewId): string {
  return `#/${view}`;
}

function readView(): ViewId {
  const id = window.location.hash.replace(/^#\/?/, '');
  return VIEWS.some((view) => view.id === id) ? (id as ViewId) : 'overview';
}

export function useHashRoute(): ViewId {
  const [view, setView] = useState<ViewId>(readView);
  useEffect(() => {
    const onChange = () => setView(readView());
    window.addEventListener('hashchange', onChange);
    return () => window.removeEventListener('hashchange', onChange);
  }, []);
  return view;
}
