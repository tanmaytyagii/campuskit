import { fileURLToPath } from 'node:url';

import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

import { templateBundles } from './vite-plugins/template-bundles.ts';

const repoRoot = fileURLToPath(new URL('../..', import.meta.url));

export default defineConfig({
  plugins: [react(), templateBundles({ repoRoot })],
  test: {
    name: 'web',
    environment: 'jsdom',
    include: ['src/**/*.test.{ts,tsx}'],
    setupFiles: ['./src/test/setup.ts'],
    css: false,
    testTimeout: 20_000,
    // The app lists documents and screenshots with import.meta.glob. Cached transforms would
    // keep an old file list when a file is added or removed, so the module cache is off.
    fsModuleCache: false,
  },
});
