import { useEffect } from 'react';
import { useLocation } from 'react-router';

import { recordVisit } from '../lib/recent.ts';
import { siteConfig } from '../site.config.ts';

/**
 * Sets the browser tab title, e.g. "Projects | CampusKit", and remembers the page among the
 * recently visited ones (unless `remember` is false, as for a page that wasn't found).
 */
export function useDocumentTitle(title: string | null, { remember = true } = {}): void {
  const { pathname, search } = useLocation();
  useEffect(() => {
    document.title = title
      ? `${title} | ${siteConfig.name}`
      : `${siteConfig.name}: ${siteConfig.tagline}`;
    if (remember) recordVisit(`${pathname}${search}`, title ?? 'Home', new Date().toISOString());
  }, [title, remember, pathname, search]);
}
