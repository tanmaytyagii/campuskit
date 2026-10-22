/**
 * A tiny router: the current view is stored in the URL hash (#/students), so
 * the browser's back and forward buttons work and every view has a link.
 */
import { useEffect, useState } from 'react';

export const VIEWS = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'mark', label: 'Mark attendance' },
  { id: 'students', label: 'Students' },
  { id: 'records', label: 'Records' },
  { id: 'settings', label: 'Settings' },
] as const;

export type ViewId = (typeof VIEWS)[number]['id'];

export function viewHref(view: ViewId): string {
  return `#/${view}`;
}

function readView(): ViewId {
  const id = window.location.hash.replace(/^#\/?/, '');
  return VIEWS.some((view) => view.id === id) ? (id as ViewId) : 'dashboard';
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
