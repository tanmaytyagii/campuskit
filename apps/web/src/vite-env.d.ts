/// <reference types="vite/client" />

declare module 'virtual:template-bundles' {
  /** Template id -> bundle path relative to the site's base URL. */
  const bundlePaths: Record<string, string>;
  export default bundlePaths;
}

declare module 'virtual:template-verification' {
  /** Template id -> fingerprint of the published files, and the raw verification record. */
  const verification: Record<string, { fingerprint: string | null; record: unknown }>;
  export default verification;
}
