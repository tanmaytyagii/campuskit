import { fileURLToPath } from 'node:url';

import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

import { contentSecurityPolicy } from './vite-plugins/content-security-policy.ts';
import { templateBundles } from './vite-plugins/template-bundles.ts';

const repoRoot = fileURLToPath(new URL('../..', import.meta.url));

export default defineConfig({
  // Set CAMPUSKIT_BASE=/repository-name/ when deploying to a sub-path (e.g. GitHub Pages).
  base: process.env.CAMPUSKIT_BASE ?? '/',
  plugins: [react(), tailwindcss(), templateBundles({ repoRoot }), contentSecurityPolicy()],
  server: { port: 5173 },
  preview: { port: 4173 },
  build: {
    target: 'es2022',
    chunkSizeWarningLimit: 700,
    // The licences of every bundled dependency, served with the site (see THIRD_PARTY_NOTICES.md).
    license: { fileName: 'licenses/third-party.md' },
  },
});
