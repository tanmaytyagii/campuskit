import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    name: 'template-engine',
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
