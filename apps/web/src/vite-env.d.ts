/// <reference types="vite/client" />

declare module 'virtual:template-bundles' {
  /** Template id -> bundle path relative to the site's base URL. */
  const bundlePaths: Record<string, string>;
  export default bundlePaths;
}
