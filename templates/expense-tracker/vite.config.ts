/// <reference types="vitest/config" />
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// Vite builds and serves the app; the `test` section configures Vitest.
export default defineConfig({
  plugins: [react()],
  build: {
    // Recharts makes the bundle about 650 kB (190 kB gzipped), which is fine
    // for this app. Split the charts into a lazy-loaded chunk if it grows.
    chunkSizeWarningLimit: 800,
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    css: false,
  },
});
