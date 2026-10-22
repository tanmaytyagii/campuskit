import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    name: 'project-catalog',
    environment: 'node',
    include: ['src/**/*.test.ts'],
    // Validating the real templates builds their bundles, which takes a moment.
    testTimeout: 30_000,
  },
});
