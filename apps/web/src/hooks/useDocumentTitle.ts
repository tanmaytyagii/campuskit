import { useEffect } from 'react';

import { siteConfig } from '../site.config.ts';

/** Sets the browser tab title, e.g. "Projects | CampusKit". */
export function useDocumentTitle(title: string | null): void {
  useEffect(() => {
    document.title = title
      ? `${title} | ${siteConfig.name}`
      : `${siteConfig.name}: ${siteConfig.tagline}`;
  }, [title]);
}
