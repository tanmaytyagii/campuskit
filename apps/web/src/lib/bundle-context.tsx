/**
 * Lets tests replace the network bundle loader with one that reads the real
 * template folders from disk.
 */
import { createContext, useContext, type ReactNode } from 'react';

import { fetchTemplateBundle, type BundleLoader } from './bundles.ts';

const BundleLoaderContext = createContext<BundleLoader>(fetchTemplateBundle);

export function BundleLoaderProvider({
  loader,
  children,
}: {
  loader: BundleLoader;
  children: ReactNode;
}) {
  return <BundleLoaderContext.Provider value={loader}>{children}</BundleLoaderContext.Provider>;
}

export function useBundleLoader(): BundleLoader {
  return useContext(BundleLoaderContext);
}
